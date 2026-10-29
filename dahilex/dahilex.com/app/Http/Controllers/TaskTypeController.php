<?php

namespace App\Http\Controllers;
use App\Models\TaskType;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TaskTypeController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-task-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = TaskType::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-task-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-task-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
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

        $taskTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('tasks/task-types/index', [
            'taskTypes' => $taskTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-task-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|size:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'default_duration' => 'nullable|integer|min:1',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if task type with same name already exists for this company
        $exists = TaskType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Task type with this name already exists.');
        }

        TaskType::create($validated);

        return redirect()->back()->with('success', 'Task type created successfully.');
    }

    public function update(Request $request, $taskTypeId)
    {
        if (!Auth::user()->can('edit-task-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $taskType = TaskType::where('id', $taskTypeId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-task-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$taskType) {
            return redirect()->back()->with('error', 'Task type not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|size:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'default_duration' => 'nullable|integer|min:1',
            'status' => 'required|in:active,inactive',
        ]);

        // Check if task type with same name already exists for this company (excluding current)
        $exists = TaskType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $taskTypeId)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Task type with this name already exists.');
        }

        $taskType->update($validated);

        return redirect()->back()->with('success', 'Task type updated successfully.');
    }

    public function destroy($taskTypeId)
    {
        if (!Auth::user()->can('delete-task-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $taskType = TaskType::where('id', $taskTypeId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-task-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$taskType) {
            return redirect()->back()->with('error', 'Task type not found.');
        }

        $existsTasks = Task::where('task_type_id', $taskTypeId)->exists();
        if ($existsTasks) {
            return redirect()->back()->with('error', 'Cannot delete task type that has associated tasks.');
        }

        try {
            $taskType->delete();
            return redirect()->back()->with('success', 'Task type deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete task type.');
        }
    }

    public function toggleStatus($taskTypeId)
    {
        if (!Auth::user()->can('toggle-status-task-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $taskType = TaskType::where('id', $taskTypeId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-task-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$taskType) {
            return redirect()->back()->with('error', 'Task type not found.');
        }

        try {
            $taskType->status = $taskType->status === 'active' ? 'inactive' : 'active';
            $taskType->save();

            return redirect()->back()->with('success', 'Task type status updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to update task type status.');
        }
    }
}