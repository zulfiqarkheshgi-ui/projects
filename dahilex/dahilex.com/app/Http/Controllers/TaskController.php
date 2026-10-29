<?php

namespace App\Http\Controllers;

use App\Events\NewTaskCreated;
use App\Models\Task;
use App\Models\TaskType;
use App\Models\TaskStatus;
use App\Models\User;
use App\Models\CaseModel;
use App\Models\Setting;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TaskController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-tasks')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = Task::with(['taskType', 'taskStatus', 'assignedUser', 'case', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-tasks')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-tasks')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('clients.user_id', Auth::id());
                    })
                    ->orWhere('assigned_to', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        $view = ($request->filled('view') && ($request->input('view') == 'list')) ? 'list' : 'kanban';
        // Handle search
        if ($request->has('search') && !empty($request->search) && $view !== 'kanban') {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('task_id', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('task_type_id') && $request->task_type_id !== '_empty_' && $view !== 'kanban') {
            $query->where('task_type_id', $request->task_type_id);
        }

        if ($request->filled('task_status_id') && $request->task_status_id !== '_empty_' && $view !== 'kanban') {
            $query->where('task_status_id', $request->task_status_id);
        }

        if ($request->filled('priority') && $request->priority !== '_empty_' && $view !== 'kanban') {
            $allowedPriorities = ['critical', 'high', 'medium', 'low'];
            if (in_array($request->priority, $allowedPriorities)) {
                $query->where('priority', $request->priority);
            }
        }

        if ($request->filled('assigned_to') && $request->assigned_to !== '_empty_' && $view !== 'kanban') {
            $query->where('assigned_to', $request->assigned_to);
        }

        $allowedSortFields = ['task_id', 'title', 'due_date', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy($sortField, $sortDirection);


        if ($view == 'kanban') {
            $tasks = collect(['data' => $query->get()]);
        } else {
            $perPage = $request->input('per_page', 10);
            if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
                $perPage = 10;
            }
            $tasks = $query->paginate($perPage)->withQueryString();
        }

        $taskTypeQuery = TaskType::where(function ($q) {
            if (Auth::user()->can('manage-any-task-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-task-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allTaskTypes = (clone $taskTypeQuery)->get(['id', 'name']);
        $taskTypes = (clone $taskTypeQuery)->active()->get(['id', 'name']);

        $taskStatusQuery = TaskStatus::active()->where(function ($q) {
            if (Auth::user()->can('manage-any-task-statuses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-task-statuses')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allTaskStatuses = (clone $taskStatusQuery)->get(['id', 'name', 'color']);
        $taskStatuses = (clone $taskStatusQuery)->active()->get(['id', 'name', 'color']);

        $userQuery = User::where(function ($q) {
            if (Auth::user()->can('manage-any-users')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-users')) {
                $q->where('created_by', Auth::id())
                    ->orWhere('id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('type', '!=', 'company')->whereDoesntHave('roles', function ($q) {
            $q->where('name', 'client');
        });
        $allUsers = (clone $userQuery)->get(['id', 'name']);
        $users = (clone $userQuery)->active()->get(['id', 'name']);

        $cases = CaseModel::active()->where(function ($q) {
            if (Auth::user()->can('manage-any-cases')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cases')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        })->get(['id', 'case_id', 'title']);

        $googleCalendarEnabled = Setting::where('user_id', createdBy())
            ->where('key', 'googleCalendarEnabled')
            ->value('value') == '1';

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'taskTypes' => $taskTypes,
            'allTaskTypes' => $allTaskTypes,
            'taskStatuses' => $taskStatuses,
            'allTaskStatuses' => $allTaskStatuses,
            'users' => $users,
            'allUsers' => $allUsers,
            'cases' => $cases,
            'googleCalendarEnabled' => $googleCalendarEnabled,
            'filters' => $request->only(['search', 'task_type_id', 'task_status_id', 'priority', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'page', 'view']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-tasks')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:critical,high,medium,low',
            'due_date' => 'required|date',
            'estimated_duration' => 'nullable|integer|min:1',
            'case_id' => 'required|exists:cases,id',
            'assigned_to' => 'required|exists:users,id',
            'task_type_id' => 'required|exists:task_types,id',
            'task_status_id' => 'required|exists:task_statuses,id',
            'notes' => 'nullable|string',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        // Check for duplicate tasks with same title for the same case
        if (!empty($validated['case_id'])) {
            $exists = Task::where('case_id', $validated['case_id'])
                ->where('title', $validated['title'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->exists();

            if ($exists) {
                return redirect()->back()->withErrors([
                    'title' => 'Already exists.'
                ])->withInput();
            }
        }

        $validated['created_by'] = Auth::id();

        // Validate that related records belong to the current user's company
        if (!empty($validated['case_id'])) {
            $case = CaseModel::where('id', $validated['case_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$case) {
                return redirect()->back()->with('error', 'Invalid case selected.');
            }
        }

        if (!empty($validated['assigned_to'])) {
            $user = User::where('id', $validated['assigned_to'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$user) {
                return redirect()->back()->with('error', 'Invalid user selected.');
            }
        }

        if (!empty($validated['task_type_id'])) {
            $taskType = TaskType::where('id', $validated['task_type_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$taskType) {
                return redirect()->back()->with('error', 'Invalid task type selected.');
            }

            // Use task type's default duration if no duration is provided
            if (empty($validated['estimated_duration']) && $taskType->default_duration) {
                $validated['estimated_duration'] = $taskType->default_duration;
            }
        }

        if (!empty($validated['task_status_id'])) {
            $taskStatus = TaskStatus::where('id', $validated['task_status_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$taskStatus) {
                return redirect()->back()->with('error', 'Invalid task status selected.');
            }
        }

        $task = Task::create($validated);

        // Handle Google Calendar sync
        if ($task && $request->sync_with_google_calendar) {
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($task, createdBy(), 'task');
            if ($eventId) {
                $task->update(['google_calendar_event_id' => $eventId]);
            }
        }

        // Trigger notifications
        if ($task && !IsDemo()) {
            event(new \App\Events\NewTaskCreated($task, $request->all()));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('SMS send failed: ') . $slackError;
        }

        if (!empty($errors)) {
            $message = __('Task created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Task created successfully.');
    }

    public function update(Request $request, $taskId)
    {
        if (!Auth::user()->can('edit-tasks')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $task = Task::where('id', $taskId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-tasks')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-tasks')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('clients.user_id', Auth::id());
                        })
                        ->orWhere('assigned_to', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$task) {
            return redirect()->back()->with('error', 'Task not found.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:critical,high,medium,low',
            'due_date' => 'nullable|date',
            'estimated_duration' => 'nullable|integer|min:1',
            'case_id' => 'nullable|exists:cases,id',
            'assigned_to' => 'nullable|exists:users,id',
            'task_type_id' => 'nullable|exists:task_types,id',
            'task_status_id' => 'nullable|exists:task_statuses,id',
            'notes' => 'nullable|string',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        // Validate that related records belong to the current user's company
        if (!empty($validated['case_id'])) {
            $case = CaseModel::where('id', $validated['case_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$case) {
                return redirect()->back()->with('error', 'Invalid case selected.');
            }
        }

        if (!empty($validated['assigned_to'])) {
            $user = User::where('id', $validated['assigned_to'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$user) {
                return redirect()->back()->with('error', 'Invalid user selected.');
            }
        }

        if (!empty($validated['task_type_id'])) {
            $taskType = TaskType::where('id', $validated['task_type_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$taskType) {
                return redirect()->back()->with('error', 'Invalid task type selected.');
            }
        }

        if (!empty($validated['task_status_id'])) {
            $taskStatus = TaskStatus::where('id', $validated['task_status_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$taskStatus) {
                return redirect()->back()->with('error', 'Invalid task status selected.');
            }
        }

        // Check for duplicate tasks with same title for the same case (excluding current)
        if (!empty($validated['case_id'])) {
            $exists = Task::where('case_id', $validated['case_id'])
                ->where('title', $validated['title'])
                ->where('id', '!=', $taskId)
                ->whereIn('created_by', getCompanyAndUsersId())
                ->exists();

            if ($exists) {
                return redirect()->back()->withErrors([
                    'title' => 'Already exists.'
                ])->withInput();
            }
        }

        $task->update($validated);

        // Handle Google Calendar sync
        if ($request->sync_with_google_calendar && !$task->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($task, createdBy(), 'task');
            if ($eventId) {
                $task->update(['google_calendar_event_id' => $eventId]);
            }
        } elseif ($request->sync_with_google_calendar && $task->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->updateEvent($task->google_calendar_event_id, $task, createdBy(), 'task');
        } elseif (!$request->sync_with_google_calendar && $task->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->deleteEvent($task->google_calendar_event_id, createdBy());
            $task->update(['google_calendar_event_id' => null]);
        }

        return redirect()->back()->with('success', 'Task updated successfully.');
    }

    public function show($taskId)
    {
        if (!Auth::user()->can('manage-tasks')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $task = Task::with(['taskType', 'taskStatus', 'assignedUser', 'case', 'creator'])
            ->where('id', $taskId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-tasks')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-tasks')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('clients.user_id', Auth::id());
                        })
                        ->orWhere('assigned_to', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();


        // Get task comments (read-only)
        $comments = \App\Models\TaskComment::with(['creator'])
            ->where('task_id', $taskId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-comments')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-task-comments')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('tasks/show', [
            'task' => $task,
            'comments' => $comments
        ]);
    }

    public function destroy($taskId)
    {
        if (!Auth::user()->can('delete-tasks')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $task = Task::where('id', $taskId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-tasks')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-tasks')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('clients.user_id', Auth::id());
                        })
                        ->orWhere('assigned_to', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$task) {
            return redirect()->back()->with('error', 'Task not found.');
        }

        try {
            // Delete Google Calendar event if exists
            if ($task->google_calendar_event_id) {
                $calendarService = new GoogleCalendarService();
                $calendarService->deleteEvent($task->google_calendar_event_id, createdBy());
            }

            $task->delete();
            return redirect()->back()->with('success', 'Task deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete task.');
        }
    }

    public function toggleStatus(Request $request, $taskId)
    {
        if (!Auth::user()->can('toggle-status-tasks')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $task = Task::with('case.client')->where('id', $taskId)->first();

        if (!$task) {
            return redirect()->back()->with('error', 'Task not found.');
        }

        if (Auth::user()->can('manage-any-tasks')) {
            if (!in_array($task->created_by, getCompanyAndUsersId())) {
                return redirect()->back()->with('error', 'Task not found.');
            }
        } elseif (Auth::user()->can('manage-own-tasks')) {
            $hasAccess = $task->created_by === Auth::id()
                || $task->assigned_to === Auth::id()
                || ($task->case && $task->case->client && $task->case->client->user_id === Auth::id());
            if (!$hasAccess) {
                return redirect()->back()->with('error', 'Task not found.');
            }
        }

        $task->task_status_id = $request->task_status_id;
        $task->save();

        return redirect()->back()->with('success', 'Task status updated successfully.');
    }

    public function getCaseUsers($caseId)
    {
        if (!Auth::user()->can('manage-tasks')) {
            return response()->json(['error' => __('Permission Denied.')], 403);
        }

        $case = CaseModel::where('id', $caseId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->with(['teamMembers' => fn($q) => $q->active()->with('user')])
            ->first();

        if (!$case) {
            return response()->json(['users' => []]);
        }

        $users = $case->teamMembers
            ->filter(
                fn($teamMember) => $teamMember->user
                    && $teamMember->user->type !== 'company'
                    && $teamMember->user->status === 'active'
            )
            ->map(function ($teamMember) {
                return [
                    'id'   => $teamMember->user->id,
                    'name' => $teamMember->user->name,
                ];
            })
            ->values();

        return response()->json($users);
    }
}
