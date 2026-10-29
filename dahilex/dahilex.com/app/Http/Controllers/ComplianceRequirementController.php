<?php

namespace App\Http\Controllers;
use App\Models\ComplianceRequirement;
use App\Models\ComplianceCategory;
use App\Models\ComplianceFrequency;
use App\Models\RegulatoryBody;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ComplianceRequirementController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-compliance-requirements')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ComplianceRequirement::with(['category', 'frequency', 'creator', 'regulatory_body'])->where(function ($q) {
            if (Auth::user()->can('manage-any-compliance-requirements')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-compliance-requirements')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        (clone $query)->whereBeforeToday('deadline')
                    ->where('status', '!=', 'compliant')
                    ->update([
                        'status'=>'overdue'
                    ]);

        $stats = [
            'total'         => (clone $query)->count(),
            'compliant'     => (clone $query)->where('status', 'compliant')->count(),
            'non_compliant' => (clone $query)->where('status', 'non_compliant')->count(),
            'overdue'       => (clone $query)->where('status', 'overdue')->count(),
        ];

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('category_id') && $request->category_id !== '_empty_') {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority') && $request->priority !== '_empty_') {
            $query->where('priority', $request->priority);
        }

        $allowedSortFields = ['title', 'deadline', 'created_at'];
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

        $requirements = $query->paginate($perPage)->withQueryString();

        $categoryQuery = ComplianceCategory::where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
        $allCategories = (clone $categoryQuery)->get(['id', 'name', 'color']);
        $categories = (clone $categoryQuery)->active()->get(['id', 'name', 'color']);

        $frequencies = ComplianceFrequency::active()
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-frequencies')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-frequencies')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->get(['id', 'name', 'days']);

        $regulatoryBodies = RegulatoryBody::active()
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-regulatory-bodies')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-regulatory-bodies')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->get(['id', 'name']);

        return Inertia::render('compliance/requirements/index', [
            'requirements'    => $requirements,
            'categories'      => $categories,
            'allCategories'   => $allCategories,
            'frequencies'     => $frequencies,
            'regulatoryBodies'=> $regulatoryBodies,
            'stats'           => $stats,
            'filters'         => $request->only(['search', 'category_id', 'status', 'priority', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-compliance-requirements')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'regulatory_body_id' => 'required|exists:regulatory_bodies,id',
            'category_id' => 'required|exists:compliance_categories,id',
            'frequency_id' => 'required|exists:compliance_frequencies,id',
            'jurisdiction' => 'nullable|string|max:255',
            'scope' => 'nullable|string',
            'effective_date' => 'nullable|date',
            'deadline' => 'nullable|date',
            'responsible_party' => 'nullable|string|max:255',
            'evidence_requirements' => 'nullable|string',
            'penalty_implications' => 'nullable|string',
            'monitoring_procedures' => 'nullable|string',
            'status' => 'nullable|in:pending,in_progress,compliant,non_compliant,overdue',
            'priority' => 'nullable|in:low,medium,high,critical',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'pending';
        $validated['priority'] = $validated['priority'] ?? 'medium';

        ComplianceRequirement::create($validated);

        return redirect()->back()->with('success', 'Compliance requirement created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-compliance-requirements')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $requirement = ComplianceRequirement::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-requirements')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-requirements')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$requirement) {
            return redirect()->back()->with('error', 'Compliance requirement not found.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'regulatory_body_id' => 'required|exists:regulatory_bodies,id',
            'category_id' => 'required|exists:compliance_categories,id',
            'frequency_id' => 'required|exists:compliance_frequencies,id',
            'jurisdiction' => 'nullable|string|max:255',
            'scope' => 'nullable|string',
            'effective_date' => 'nullable|date',
            'deadline' => 'nullable|date',
            'responsible_party' => 'nullable|string|max:255',
            'evidence_requirements' => 'nullable|string',
            'penalty_implications' => 'nullable|string',
            'monitoring_procedures' => 'nullable|string',
            'status' => 'nullable|in:pending,in_progress,compliant,non_compliant,overdue',
            'priority' => 'nullable|in:low,medium,high,critical',
        ]);

        $requirement->update($validated);

        return redirect()->back()->with('success', 'Compliance requirement updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-compliance-requirements')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $requirement = ComplianceRequirement::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-requirements')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-requirements')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$requirement) {
            return redirect()->back()->with('error', 'Compliance requirement not found.');
        }
        $requirement->delete();

        return redirect()->back()->with('success', 'Compliance requirement deleted successfully.');
    }

    public function toggleStatus(Request $request, $id)
    {
        if (!Auth::user()->can('toggle-status-compliance-requirements')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $requirement = ComplianceRequirement::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-requirements')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-requirements')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$requirement) {
            return redirect()->back()->with('error', 'Compliance requirement not found.');
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,compliant,non_compliant,overdue'
        ]);

        $requirement->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'Compliance requirement status updated successfully.');
    }
}
