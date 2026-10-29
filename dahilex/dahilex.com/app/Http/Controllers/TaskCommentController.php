<?php

namespace App\Http\Controllers;
use App\Models\TaskComment;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TaskCommentController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-task-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = TaskComment::with(['task', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-task-comments')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-task-comments')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('task.case.client', function ($cq) { 
                        $cq->where('clients.user_id', Auth::id()); 
                    })
                    ->orWhereHas('task', function ($taskQuery) {
                        $taskQuery->where('assigned_to', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('comment_text', 'like', '%' . $request->search . '%')
                  ->orWhereHas('task', function ($taskQuery) use ($request) {
                      $taskQuery->where('title', 'like', '%' . $request->search . '%');
                  });
            });
        }

        if ($request->filled('task_id') && $request->task_id !== '_empty_') {
            $query->where('task_id', $request->task_id);
        }

        if ($request->filled('is_internal') && $request->is_internal !== '_empty_') {
            $query->where('is_internal', $request->is_internal === 'true');
        }

        $allowedSortFields = ['created_at'];
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

        $comments = $query->paginate($perPage)->withQueryString();

        $tasks = Task::where(function($q) {
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
        })->get(['id', 'task_id', 'title']);

        return Inertia::render('tasks/task-comments/index', [
            'comments' => $comments,
            'tasks' => $tasks,
            'filters' => $request->only(['search', 'task_id', 'is_internal', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-task-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'comment_text' => 'required|string',
            'is_internal' => 'nullable|boolean',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_internal'] = $validated['is_internal'] ?? false;

        // Validate that task belongs to the current user's company
        $task = Task::where('id', $validated['task_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$task) {
            return redirect()->back()->with('error', 'Invalid task selected.');
        }

        TaskComment::create($validated);

        return redirect()->back()->with('success', 'Comment created successfully.');
    }

    public function update(Request $request, $commentId)
    {
        if (!Auth::user()->can('edit-task-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $comment = TaskComment::where('id', $commentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-comments')) {
                    $q->whereIn('created_by', getCompanyAndUsersId())
                        ->orWhereHas('task', function ($taskQuery) {
                            $taskQuery->whereIn('created_by', getCompanyAndUsersId());
                        });
                } elseif (Auth::user()->can('manage-own-task-comments')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('task', function ($taskQuery) {
                            $taskQuery->where('created_by', Auth::id())
                                ->orWhere('assigned_to', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$comment) {
            return redirect()->back()->with('error', 'Comment not found.');
        }

        $validated = $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'comment_text' => 'required|string',
            'is_internal' => 'required|boolean',
        ]);

        // Validate that task belongs to the current user's company
        $task = Task::where('id', $validated['task_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$task) {
            return redirect()->back()->with('error', 'Invalid task selected.');
        }

        $comment->update($validated);

        return redirect()->back()->with('success', 'Comment updated successfully.');
    }

    public function destroy($commentId)
    {
        if (!Auth::user()->can('delete-task-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $comment = TaskComment::where('id', $commentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-task-comments')) {
                    $q->whereIn('created_by', getCompanyAndUsersId())
                        ->orWhereHas('task', function ($taskQuery) {
                            $taskQuery->whereIn('created_by', getCompanyAndUsersId());
                        });
                } elseif (Auth::user()->can('manage-own-task-comments')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('task', function ($taskQuery) {
                            $taskQuery->where('created_by', Auth::id())
                                ->orWhere('assigned_to', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$comment) {
            return redirect()->back()->with('error', 'Comment not found.');
        }

        try {
            $comment->delete();
            return redirect()->back()->with('success', 'Comment deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete comment.');
        }
    }
}