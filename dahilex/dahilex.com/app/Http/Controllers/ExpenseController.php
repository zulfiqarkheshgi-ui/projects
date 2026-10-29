<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ExpenseController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-expenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        // ── Base access scope ─────────────────────────────────────────────────
        $baseQuery = Expense::where(function ($q) {
            if (Auth::user()->can('manage-any-expenses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-expenses')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', fn($cq) => $cq->where('user_id', Auth::id()))
                    ->orWhereHas('case.teamMembers', fn($tq) => $tq->where('user_id', Auth::id()));
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // ── Stats (always from full unfiltered dataset) ────────────────────────
        $stats = [
            'total'    => (clone $baseQuery)->sum('amount'),
            'approved' => (clone $baseQuery)->where('status', 'approved')->sum('amount'),
            'pending'  => (clone $baseQuery)->where('status', 'pending')->sum('amount'),
        ];

        // ── Apply search / filters ─────────────────────────────────────────────
        $filteredQuery = clone $baseQuery;

        if ($request->filled('search')) {
            $s = $request->search;
            $filteredQuery->where(function ($q) use ($s) {
                $q->where('description', 'like', "%$s%")
                    ->orWhereHas('category', fn($cq) => $cq->where('name', 'like', "%$s%"))
                    ->orWhereHas('case', fn($cq) => $cq->where('case_id', 'like', "%$s%")
                        ->orWhere('title', 'like', "%$s%")
                        ->orWhereRaw("CONCAT(case_id, ' - ', title) LIKE ?", ["%$s%"]))
                    ->orWhere('expense_date', 'like', "%$s%")
                    ->orWhereRaw("DATE_FORMAT(expense_date, '%Y-%m-%d') LIKE ?", ["%$s%"])
                    ->orWhereRaw("DATE_FORMAT(expense_date, '%d/%m/%Y') LIKE ?", ["%$s%"]);
            });
        }
        if ($request->filled('expense_category_id') && $request->expense_category_id !== '_empty_') {
            $filteredQuery->where('expense_category_id', $request->expense_category_id);
        }
        if ($request->filled('is_billable') && $request->is_billable !== '_empty_') {
            $filteredQuery->where('is_billable', $request->is_billable);
        }

        // ── Left panel: paginated case summaries (aggregates only, no rows) ────
        $perPage = (int) $request->input('per_page', 15);
        $page = request()->input('page', 1);

        $caseIdsPaginator = (clone $filteredQuery)
            ->select('case_id')
            ->groupBy('case_id')
            ->orderBy('case_id')
            ->limit($page * $perPage)
            ->get();

        $casesCount = (clone $filteredQuery)->distinct()->pluck('case_id')->filter()->values()
            ->count();

        $caseIds = collect($caseIdsPaginator)->pluck('case_id')->filter()->values()->toArray();

        $caseSummaries = [];
        if (!empty($caseIds)) {
            $aggregates = (clone $baseQuery)
                ->selectRaw('case_id,
                    SUM(amount) as total_amount,
                    SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected_count,
                    COUNT(*) as total_count')
                ->whereIn('case_id', $caseIds)
                ->groupBy('case_id')
                ->get()->keyBy('case_id');

            $caseModels = \App\Models\CaseModel::whereIn('id', $caseIds)
                ->select('id', 'case_id', 'title')
                ->get()->keyBy('id');

            foreach ($caseIds as $cid) {
                $agg  = $aggregates->get($cid);
                $case = $caseModels->get($cid);
                $caseSummaries[] = [
                    'id'             => $cid,
                    'case_id'        => $case?->case_id,
                    'title'          => $case?->title ?? 'General',
                    'total_amount'   => (float) ($agg?->total_amount ?? 0),
                    'pending_count'  => (int)   ($agg?->pending_count ?? 0),
                    'approved_count' => (int)   ($agg?->approved_count ?? 0),
                    'rejected_count' => (int)   ($agg?->rejected_count ?? 0),
                    'total_count'    => (int)   ($agg?->total_count ?? 0),
                ];
            }
        }

        $casesPagination         = $caseIdsPaginator->toArray();
        $casesPagination['data'] = $caseSummaries;

        // ── Right panel: expenses for selected case + status (paginated) ───────
        $selectedCaseId = $request->input('case_id') ?? ($caseIds[0] ?? null);
        $selectedStatus     = $request->input('expense_status', 'pending');
        $expensePerPage     = (int) $request->input('expense_per_page', 10);
        if ($expensePerPage < 1 || $expensePerPage > 100) $expensePerPage = 10;

        $caseExpenses  = null;
        $caseStatusAmounts = [];
        if ($selectedCaseId && !in_array((int) $selectedCaseId, array_map('intval', $caseIds))) {
            $selectedCaseId = $caseIds[0] ?? null;
        }
        if ($selectedCaseId) {

            // Per-status amount breakdown for the selected case
            $statusAggs = (clone $baseQuery)
                ->selectRaw('status,
                    SUM(amount) as total,
                    SUM(CASE WHEN is_billable = 1 THEN amount ELSE 0 END) as billable,
                    SUM(CASE WHEN is_billable = 0 THEN amount ELSE 0 END) as non_billable,
                    COUNT(*) as count')
                ->where('case_id', $selectedCaseId)
                ->groupBy('status')
                ->get();
            foreach ($statusAggs as $sa) {
                $caseStatusAmounts[$sa->status] = [
                    'total'        => (float) $sa->total,
                    'billable'     => (float) $sa->billable,
                    'non_billable' => (float) $sa->non_billable,
                    'count'        => (int)   $sa->count,
                ];
            }

            $caseExpenses = (clone $filteredQuery)
                ->with(['category', 'creator', 'invoice'])
                ->where('case_id', $selectedCaseId)
                ->where('status', $selectedStatus)
                ->orderBy('expense_date', 'desc')
                ->paginate($expensePerPage, ['*'], 'expense_page')
                ->withQueryString();
        }

        // ── Supporting data ────────────────────────────────────────────────────
        $categoryQuery = ExpenseCategory::where(function ($q) {
            if (Auth::user()->can('manage-any-expense-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-expense-categories')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allCategories = (clone $categoryQuery)->select('id', 'name')->get();
        $categories    = (clone $categoryQuery)->active()->select('id', 'name')->get();

        $cases = \App\Models\CaseModel::active()->where(function ($q) {
            if (Auth::user()->can('manage-any-cases')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cases')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('client', fn($cq) => $cq->where('user_id', Auth::id()))
                    ->orWhereHas('teamMembers', fn($tq) => $tq->where('user_id', Auth::id()));
            }
        })->select('id', 'case_id', 'title')->get();

        return Inertia::render('billing/expenses/expenses', [
            'caseSummaries'    => $casesPagination,
            'casesCount'  => $casesCount,
            'caseExpenses'     => $caseExpenses,
            'caseStatusAmounts' => $caseStatusAmounts,
            'categories'    => $categories,
            'allCategories' => $allCategories,
            'cases'         => $cases,
            'stats'         => $stats,
            'filters'       => array_merge(
                $request->only(['search', 'expense_category_id', 'is_billable', 'per_page', 'page', 'expense_status', 'expense_per_page', 'expense_page']),
                ['case_id' => $selectedCaseId]
            ),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-expenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $request->validate([
            'case_id' => 'required|exists:cases,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'is_billable' => 'boolean',
            'receipt_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Check for duplicate expense
        $duplicateExists = Expense::where('created_by', Auth::id())
            ->where('case_id', $request->case_id)
            ->where('expense_category_id', $request->expense_category_id)
            ->where('description', $request->description)
            ->where('amount', $request->amount)
            ->where('expense_date', $request->expense_date)
            ->exists();

        if ($duplicateExists) {
            return redirect()->back()->with('error', 'A similar expense entry already exists with the same details.');
        }

        if ($request->case_id) {
            $caseExists = \App\Models\CaseModel::where('id', $request->case_id)
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-cases')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-cases')) {
                        $q->where('created_by', Auth::id())
                            ->orWhereHas('client', function ($clientQuery) {
                                $clientQuery->where('user_id', Auth::id());
                            })
                            ->orWhereHas('teamMembers', function ($teamQuery) {
                                $teamQuery->where('user_id', Auth::id());
                            });
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })->exists();

            if (!$caseExists) {
                return redirect()->back()->with('error', 'Invalid case selected.');
            }
        }

        $categoryExists = ExpenseCategory::active()->where('id', $request->expense_category_id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-expense-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-expense-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->exists();

        if (!$categoryExists) {
            return redirect()->back()->with('error', 'Invalid category selected.');
        }

        $receiptPath = null;
        if ($request->hasFile('receipt_file') && !IsDemo()) {
            $file = $request->file('receipt_file');
            $fileNameToStore = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $upload = upload_file($request, 'receipt_file', $fileNameToStore, 'expenses');
            if ($upload['status'] == true) {
                $receiptPath = $upload['url'];
            }
        }

        Expense::create([
            'created_by' => Auth::id(),
            'case_id' => $request->case_id,
            'expense_category_id' => $request->expense_category_id,
            'description' => $request->description,
            'amount' => $request->amount,
            'expense_date' => $request->expense_date,
            'is_billable' => $request->boolean('is_billable', true),
            'status'     => 'pending',
            'receipt_file' => $receiptPath,
            'notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Expense created successfully.');
    }

    public function update(Request $request, Expense $expense)
    {
        if (!Auth::user()->can('edit-expenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if (!$this->hasExpenseAccess($expense)) {
            return redirect()->back()->with('error', 'Expense not found.');
        }

        $request->validate([
            'case_id' => 'required|exists:cases,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'is_billable' => 'required|in:true,false,1,0',
            'receipt_file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($request->case_id) {
            $caseExists = \App\Models\CaseModel::where('id', $request->case_id)
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-cases')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-cases')) {
                        $q->where('created_by', Auth::id())
                            ->orWhereHas('client', function ($clientQuery) {
                                $clientQuery->where('user_id', Auth::id());
                            })
                            ->orWhereHas('teamMembers', function ($teamQuery) {
                                $teamQuery->where('user_id', Auth::id());
                            });
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })->exists();

            if (!$caseExists) {
                return redirect()->back()->with('error', 'Invalid case selected.');
            }
        }

        $categoryExists = ExpenseCategory::active()->where('id', $request->expense_category_id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-expense-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-expense-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->exists();

        if (!$categoryExists) {
            return redirect()->back()->with('error', 'Invalid category selected.');
        }

        $updateData = [
            'case_id'             => $request->case_id,
            'expense_category_id' => $request->expense_category_id,
            'description'         => $request->description,
            'amount'              => $request->amount,
            'expense_date'        => $request->expense_date,
            'is_billable'         => filter_var($request->is_billable, FILTER_VALIDATE_BOOLEAN),
            'notes'               => $request->notes,
        ];

        if ($request->hasFile('receipt_file') && !IsDemo()) {
            $receiptRelativePath = 'storage/media/' . $expense->getRawOriginal('receipt_file');
            $file            = $request->file('receipt_file');
            $fileNameToStore = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '_' . time() . '.' . $file->getClientOriginalExtension();
            $upload          = upload_file($request, 'receipt_file', $fileNameToStore, 'expenses');
            if ($upload['status'] == true) {
                // Delete old file if exists
                if ($expense->receipt_file) {
                    check_file($receiptRelativePath) ? delete_file($receiptRelativePath) : '';
                }
                $updateData['receipt_file'] = $upload['url'];
            }
        }

        $expense->update($updateData);

        return redirect()->back()->with('success', 'Expense updated successfully.');
    }

    public function destroy(Expense $expense)
    {
        if (!Auth::user()->can('delete-expenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if (!$this->hasExpenseAccess($expense)) {
            return redirect()->back()->with('error', 'Expense not found.');
        }

        if (!IsDemo()) {
            $receiptRelativePath = 'storage/media/' . $expense->getRawOriginal('receipt_file');
            // Delete receipt file
            if ($expense->receipt_file) {
                check_file($receiptRelativePath) ? delete_file($receiptRelativePath) : '';
            }
        }

        $expense->delete();
        return redirect()->back()->with('success', 'Expense deleted successfully.');
    }

    public function approve(Expense $expense)
    {
        if (!Auth::user()->can('approve-expenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if (!$this->hasExpenseAccess($expense)) {
            return redirect()->back()->with('error', 'Expense not found.');
        }

        $expense->update(['status' => 'approved']);
        return redirect()->back()->with('success', 'Expense approved successfully.');
    }

    public function reject(Expense $expense)
    {
        if (!Auth::user()->can('approve-expenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if (!$this->hasExpenseAccess($expense)) {
            return redirect()->back()->with('error', 'Expense not found.');
        }

        $expense->update(['status' => 'rejected']);
        return redirect()->back()->with('success', 'Expense rejected successfully.');
    }

    private function hasExpenseAccess(Expense $expense): bool
    {
        if (Auth::user()->can('manage-any-expenses')) {
            return in_array($expense->created_by, getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-expenses')) {
            return $expense->created_by === Auth::id()
                || ($expense->case && $expense->case->client && $expense->case->client->user_id === Auth::id())
                || ($expense->case && $expense->case->teamMembers()->where('case_team_members.user_id', Auth::id())->exists());
        }
        return false;
    }
}
