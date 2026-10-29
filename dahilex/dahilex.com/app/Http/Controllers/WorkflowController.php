<?php

namespace App\Http\Controllers;
use App\Models\Workflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WorkflowController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-workflows')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = Workflow::with(['creator'])
            ->where('created_by', createdBy());

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('is_active') && $request->is_active !== 'all') {
            $query->where('is_active', $request->is_active === 'true');
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
        
        $workflows = $query->paginate($perPage);

        return Inertia::render('tasks/workflows/index', [
            'workflows' => $workflows,
            'filters' => $request->all(['search', 'is_active', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-workflows')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger_event' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        Workflow::create($validated);

        return redirect()->back()->with('success', 'Workflow created successfully.');
    }

    public function update(Request $request, $workflowId)
    {
        if (!Auth::user()->can('edit-workflows')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $workflow = Workflow::where('id', $workflowId)
            ->where('created_by', createdBy())
            ->first();

        if (!$workflow) {
            return redirect()->back()->with('error', 'Workflow not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger_event' => 'nullable|string|max:255',
            'is_active' => 'required|boolean',
        ]);

        $workflow->update($validated);

        return redirect()->back()->with('success', 'Workflow updated successfully.');
    }

    public function destroy($workflowId)
    {
        if (!Auth::user()->can('delete-workflows')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $workflow = Workflow::where('id', $workflowId)
            ->where('created_by', createdBy())
            ->first();

        if (!$workflow) {
            return redirect()->back()->with('error', 'Workflow not found.');
        }

        try {
            $workflow->delete();
            return redirect()->back()->with('success', 'Workflow deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete workflow.');
        }
    }

    public function toggleStatus($workflowId)
    {
        if (!Auth::user()->can('toggle-status-workflows')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $workflow = Workflow::where('id', $workflowId)
            ->where('created_by', createdBy())
            ->first();

        if (!$workflow) {
            return redirect()->back()->with('error', 'Workflow not found.');
        }

        try {
            $workflow->is_active = !$workflow->is_active;
            $workflow->save();

            return redirect()->back()->with('success', 'Workflow status updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to update workflow status.');
        }
    }
}