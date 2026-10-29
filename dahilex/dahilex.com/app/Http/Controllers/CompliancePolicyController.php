<?php

namespace App\Http\Controllers;
use App\Models\CompliancePolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CompliancePolicyController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CompliancePolicy::query()
            ->where('created_by', createdBy());

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('policy_name', 'like', '%' . $request->search . '%')
                    ->orWhere('policy_content', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Handle sorting with validation


        $allowedSortFields = ['name', 'created_at', 'updated_at'];


        $sortField = $request->input('sort_field', 'created_at');


        $sortDirection = $request->input('sort_direction', 'desc');


        


        // Validate sort field


        if (!in_array($sortField, $allowedSortFields)) {


            $sortField = 'created_at';


        }


        


        // Validate sort direction


        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';


        


        $query->orderBy($sortField, $sortDirection);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }
        
        $policies = $query->paginate($perPage);

        return Inertia::render('CompliancePolicies/Index', [
            'compliancePolicies' => $policies,
            'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function create()
    {
        if (!Auth::user()->can('create-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        return Inertia::render('CompliancePolicies/Create');
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'policy_name' => 'required|string|max:255',
            'policy_content' => 'required|string',
            'effective_date' => 'required|date',
            'review_date' => 'nullable|date|after:effective_date',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        CompliancePolicy::create($validated);

        return redirect()->route('compliance.policies.index')->with('success', 'Compliance policy created successfully.');
    }

    public function show(CompliancePolicy $policy)
    {
        if (!Auth::user()->can('manage-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        if ($policy->created_by !== createdBy()) {
            abort(403);
        }

        return Inertia::render('CompliancePolicies/Show', [
            'compliancePolicy' => $policy
        ]);
    }

    public function edit(CompliancePolicy $policy)
    {
        if (!Auth::user()->can('edit-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        if ($policy->created_by !== createdBy()) {
            abort(403);
        }

        return Inertia::render('CompliancePolicies/Edit', [
            'compliancePolicy' => $policy
        ]);
    }

    public function update(Request $request, CompliancePolicy $policy)
    {
        if (!Auth::user()->can('edit-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        if ($policy->created_by !== createdBy()) {
            abort(403);
        }

        $validated = $request->validate([
            'policy_name' => 'required|string|max:255',
            'policy_content' => 'required|string',
            'effective_date' => 'required|date',
            'review_date' => 'nullable|date|after:effective_date',
            'status' => 'nullable|in:active,inactive',
        ]);

        $policy->update($validated);

        return redirect()->route('compliance.policies.index')->with('success', 'Compliance policy updated successfully.');
    }

    public function destroy(CompliancePolicy $policy)
    {
        if (!Auth::user()->can('delete-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        if ($policy->created_by !== createdBy()) {
            abort(403);
        }

        $policy->delete();

        return redirect()->back()->with('success', 'Compliance policy deleted successfully.');
    }

    public function toggleStatus(CompliancePolicy $policy)
    {
        if (!Auth::user()->can('toggle-status-compliance-policies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        if ($policy->created_by !== createdBy()) {
            abort(403);
        }

        $policy->update([
            'status' => $policy->status === 'active' ? 'inactive' : 'active'
        ]);

        return redirect()->back()->with('success', 'Policy status updated successfully.');
    }
}