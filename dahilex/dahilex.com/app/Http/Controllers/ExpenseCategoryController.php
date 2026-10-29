<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use App\Models\Expense;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-expense-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = ExpenseCategory::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-expense-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-expense-categories')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'inactive'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['name', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $expenseCategories = $query->paginate($perPage)->withQueryString();

        return Inertia::render('billing/expense-categories/index', [
            'expenseCategories' => $expenseCategories,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-expense-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $exists = ExpenseCategory::whereRaw('LOWER(name) = ?', [strtolower($value)])
                        ->whereIn('created_by', getCompanyAndUsersId())
                        ->exists();
                    
                    if ($exists) {
                        $fail('An expense category with this name already exists.');
                    }
                }
            ],
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        ExpenseCategory::create($validated);

        return redirect()->back()->with('success', 'Expense category created successfully.');
    }

    public function update(Request $request, $expenseCategoryId)
    {
        if (!Auth::user()->can('edit-expense-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = ExpenseCategory::where('id', $expenseCategoryId);

        if (Auth::user()->can('manage-any-expense-categories')) {
            $query->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-expense-categories')) {
            $query->where('created_by', Auth::id());
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $expenseCategory = $query->first();

        if (!$expenseCategory) {
            return redirect()->back()->with('error', 'Expense category not found.');
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($expenseCategoryId) {
                    $exists = ExpenseCategory::whereRaw('LOWER(name) = ?', [strtolower($value)])
                        ->whereIn('created_by', getCompanyAndUsersId())
                        ->where('id', '!=', $expenseCategoryId)
                        ->exists();
                    
                    if ($exists) {
                        $fail('An expense category with this name already exists.');
                    }
                }
            ],
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $expenseCategory->update($validated);

        return redirect()->back()->with('success', 'Expense category updated successfully.');
    }

    public function destroy($expenseCategoryId)
    {
        if (!Auth::user()->can('delete-expense-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = ExpenseCategory::where('id', $expenseCategoryId);

        if (Auth::user()->can('manage-any-expense-categories')) {
            $query->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-expense-categories')) {
            $query->where('created_by', Auth::id());
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $expenseCategory = $query->first();

        if (!$expenseCategory) {
            return redirect()->back()->with('error', 'Expense category not found.');
        }

        $existsExpenses = Expense::where('expense_category_id', $expenseCategoryId)->exists();
        if ($existsExpenses) {
            return redirect()->back()->with('error', 'Cannot delete expense category that has associated expenses.');
        }

        $expenseCategory->delete();

        return redirect()->back()->with('success', 'Expense category deleted successfully.');
    }

    public function toggleStatus($expenseCategoryId)
    {
        if (!Auth::user()->can('toggle-status-expense-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = ExpenseCategory::where('id', $expenseCategoryId);

        if (Auth::user()->can('manage-any-expense-categories')) {
            $query->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-expense-categories')) {
            $query->where('created_by', Auth::id());
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $expenseCategory = $query->first();

        if (!$expenseCategory) {
            return redirect()->back()->with('error', 'Expense category not found.');
        }

        $expenseCategory->status = $expenseCategory->status === 'active' ? 'inactive' : 'active';
        $expenseCategory->save();

        return redirect()->back()->with('success', 'Expense category status updated successfully.');
    }
}