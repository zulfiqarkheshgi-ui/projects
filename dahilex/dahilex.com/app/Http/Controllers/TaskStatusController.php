<?php

namespace App\Http\Controllers;
use App\Models\TaskStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TaskStatusController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-task-statuses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = TaskStatus::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-task-statuses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-task-statuses')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where('name', 'like', '%' . $request->search . '%');
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

        $taskStatuses = $query->paginate($perPage)->withQueryString();

        return Inertia::render('tasks/task-statuses/index', [
            'taskStatuses' => $taskStatuses,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-task-statuses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'required|string|size:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'is_completed' => 'nullable|boolean',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['is_completed'] = $validated['is_completed'] ?? false;

        // Check if task status with same name already exists for this company
        $exists = TaskStatus::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Task status with this name already exists.');
        }

        TaskStatus::create($validated);

        return redirect()->back()->with('success', 'Task status created successfully.');
    }

    public function update(Request $request, $taskStatusId)
    {
        if (!Auth::user()->can('edit-task-statuses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $taskStatus = TaskStatus::where('id', $taskStatusId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-statuses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-task-statuses')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$taskStatus) {
            return redirect()->back()->with('error', 'Task status not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'required|string|size:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'is_completed' => 'required|boolean',
            'status' => 'required|in:active,inactive',
        ]);

        // Check if task status with same name already exists for this company (excluding current)
        $exists = TaskStatus::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $taskStatusId)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Task status with this name already exists.');
        }

        $taskStatus->update($validated);

        return redirect()->back()->with('success', 'Task status updated successfully.');
    }

    public function destroy($taskStatusId)
    {
        if (!Auth::user()->can('delete-task-statuses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $taskStatus = TaskStatus::where('id', $taskStatusId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-statuses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-task-statuses')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$taskStatus) {
            return redirect()->back()->with('error', 'Task status not found.');
        }

        try {
            $taskStatus->delete();
            return redirect()->back()->with('success', 'Task status deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete task status.');
        }
    }

    public function toggleStatus($taskStatusId)
    {
        if (!Auth::user()->can('toggle-status-task-statuses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $taskStatus = TaskStatus::where('id', $taskStatusId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-statuses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-task-statuses')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$taskStatus) {
            return redirect()->back()->with('error', 'Task status not found.');
        }

        try {
            $taskStatus->status = $taskStatus->status === 'active' ? 'inactive' : 'active';
            $taskStatus->save();

            return redirect()->back()->with('success', 'Task status updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to update task status.');
        }
    }
}