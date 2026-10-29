<?php

namespace App\Http\Controllers;

use App\Events\NewCaseCreated;
use App\Models\CaseModel;
use App\Models\CaseType;
use App\Models\CaseStatus;
use App\Models\Client;
use App\Models\Court;
use App\Models\CaseTimeline;
use App\Models\CaseTeamMember;
use App\Models\CaseDocument;
use App\Models\DocumentType;
use App\Models\ResearchProject;
use App\Models\Task;
use App\Models\TaskType;
use App\Models\TaskStatus;
use App\Models\User;
use App\Models\Setting;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CaseController extends BaseController
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-cases')) {
            $query = CaseModel::with(['client','client.user', 'caseType', 'caseStatus', 'court', 'creator'])->where(function ($q) {
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
            });

            $stats = [
                'total'      => (clone $query)->count(),
                'low'     => (clone $query)->where('priority', 'low')->count(),
                'medium'  => (clone $query)->where('priority', 'medium')->count(),
                'high' => (clone $query)->where('priority', 'high')->count(),
            ];

            if ($request->has('search') && !empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('title', 'like', '%' . $request->search . '%')
                        ->orWhere('case_id', 'like', '%' . $request->search . '%')
                        ->orWhere('description', 'like', '%' . $request->search . '%')
                        ->orWhereHas('client', function ($clientQuery) use ($request) {
                            $clientQuery->where('name', 'like', '%' . $request->search . '%');
                        });
                });
            }

            if ($request->filled('case_type_id') && $request->case_type_id !== '_empty_') {
                $query->where('case_type_id', $request->case_type_id);
            }

            if ($request->filled('case_status_id') && $request->case_status_id !== '_empty_') {
                $query->where('case_status_id', $request->case_status_id);
            }

            if ($request->filled('priority') && $request->priority !== '_empty_') {
                $allowedPriorities = ['low', 'medium', 'high'];
                if (in_array($request->priority, $allowedPriorities)) {
                    $query->where('priority', $request->priority);
                }
            }

            if ($request->filled('status') && $request->status !== '_empty_') {
                $allowedStatuses = ['active', 'inactive'];
                if (in_array($request->status, $allowedStatuses)) {
                    $query->where('status', $request->status);
                }
            }

            if ($request->filled('court_id') && $request->court_id !== '_empty_') {
                $query->where('court_id', $request->court_id);
            }

            $allowedSortFields = ['title', 'case_id', 'filing_date', 'created_at'];
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

            $cases = $query->paginate($perPage)->withQueryString();

            $caseTypeQuery = CaseType::where(function ($q) {
                if (Auth::user()->can('manage-any-case-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-case-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
            $allCaseTypes = (clone $caseTypeQuery)->get(['id', 'name']);
            $caseTypes = (clone $caseTypeQuery)->active()->get(['id', 'name']);

            $caseStatusQuery = CaseStatus::where(function ($q) {
                if (Auth::user()->can('manage-any-case-statuses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-case-statuses')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
            $allCaseStatuses = (clone $caseStatusQuery)->get(['id', 'name', 'is_default']);
            $caseStatuses = (clone $caseStatusQuery)->active()->get(['id', 'name', 'is_default']);

            $clients = Client::active()->where(function ($q) {
                if (Auth::user()->can('manage-any-clients')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-clients')) {
                    $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->get(['id', 'name']);

            $courtQuery = Court::where(function ($q) {
                if (Auth::user()->can('manage-any-courts')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-courts')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
            $allCourts = (clone $courtQuery)->get(['id', 'name']);
            $courts = (clone $courtQuery)->active()->get(['id', 'name']);

            $googleCalendarEnabled = Setting::where('user_id', createdBy())
                ->where('key', 'googleCalendarEnabled')
                ->value('value') == '1';

            // Get plan limits for cases
            $authUser = auth()->user();
            $companyUser = User::find(getCompanyId($authUser->id));
            $currentCases = CaseModel::whereIn('created_by', getCompanyAndUsersId())->count();
            $planLimits = [
                'current_cases' => $currentCases,
                'max_cases' => $companyUser?->plan?->max_cases,
                'can_create' => $currentCases < $companyUser?->plan?->max_cases && Auth::user()->can('create-cases')
            ];

            return Inertia::render('cases/index', [
                'stats' => $stats,
                'cases' => $cases,
                'caseTypes' => $caseTypes,
                'allCaseTypes' => $allCaseTypes,
                'caseStatuses' => $caseStatuses,
                'allCaseStatuses' => $allCaseStatuses,
                'clients' => $clients,
                'courts' => $courts,
                'allCourts' => $allCourts,
                'googleCalendarEnabled' => $googleCalendarEnabled,
                'planLimits' => $planLimits,
                'filters' => $request->only(['search', 'case_type_id', 'case_status_id', 'priority', 'status', 'court_id', 'sort_field', 'sort_direction', 'per_page', 'page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function show(Request $request, $caseId)
    {
        $case = CaseModel::with([
            'client',
            'caseType',
            'caseStatus',
            'court.judges' => function ($query) {
                $query->where('status', 'active');
            },
            'court.courtType'
        ])
            ->where('id', $caseId)
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
            })->first();

        // Timeline query with filters
        // Week filter for Gantt calendar (defaults to current Monday)
        $defaultWeekStart = now()->startOfWeek(\Carbon\Carbon::MONDAY)->toDateString();
        $timelineWeekStart = $request->input('timeline_week_start', $defaultWeekStart);
        $weekStart = \Carbon\Carbon::parse($timelineWeekStart)->startOfWeek(\Carbon\Carbon::MONDAY)->startOfDay();
        $weekEnd   = $weekStart->copy()->addDays(6)->endOfDay();

        $timelineQuery = CaseTimeline::with('event_type', 'case.client', 'case.teamMembers')->where('case_id', $caseId)->where(function ($q) {
            if (Auth::user()->can('manage-any-case-timelines')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-timelines')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($clientQuery) {
                        $clientQuery->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        $timelineQuery->whereBetween('event_date', [$weekStart, $weekEnd]);

        if ($request->has('timeline_search') && !empty($request->timeline_search)) {
            $timelineQuery->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->timeline_search . '%')
                    ->orWhere('description', 'like', '%' . $request->timeline_search . '%');
            });
        }

        if ($request->filled('timeline_event_type') && $request->timeline_event_type !== '_empty_') {
            $timelineQuery->where('event_type_id', $request->timeline_event_type);
        }

        if ($request->filled('timeline_status') && $request->timeline_status !== '_empty_') {
            $timelineQuery->where('status', $request->timeline_status);
        }

        if ($request->filled('timeline_completed') && $request->timeline_completed !== '_empty_') {
            $timelineQuery->where('is_completed', $request->timeline_completed === '1');
        }

        // Timeline sorting with validation
        $allowedTimelineSortFields = ['title', 'event_date'];
        $timelineSortField = $request->input('timeline_sort_field', 'event_date');
        $timelineSortDirection = $request->input('timeline_sort_direction', 'desc');

        if (!in_array($timelineSortField, $allowedTimelineSortFields)) {
            $timelineSortField = 'event_date';
        }
        $timelineSortDirection = in_array($timelineSortDirection, ['asc', 'desc']) ? $timelineSortDirection : 'desc';

        $timelineQuery->orderBy($timelineSortField, $timelineSortDirection);

        // Timeline pagination with validation
        $timelinePerPage = $request->input('timeline_per_page', 10);
        if (!is_numeric($timelinePerPage) || $timelinePerPage < 1 || $timelinePerPage > 100) {
            $timelinePerPage = 10;
        }

        $timelines = $timelineQuery->get();

        // Team members query with filters
        $teamQuery = CaseTeamMember::with('user')
            ->where('case_id', $caseId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-case-team-members')) {
                    $q->whereIn('created_by', getCompanyAndUsersId())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->whereIn('created_by', getCompanyAndUsersId());
                        });
                } elseif (Auth::user()->can('manage-own-case-team-members')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->where('created_by', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($request->has('team_search') && !empty($request->team_search)) {
            $teamQuery->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->team_search . '%');
            });
        }

        if ($request->filled('team_role') && $request->team_role !== '_empty_') {
            $teamQuery->whereHas('user', function ($q) use ($request) {
                $q->where('type', $request->team_role);
            });
        }

        if ($request->filled('team_status') && $request->team_status !== '_empty_') {
            $teamQuery->where('status', $request->team_status);
        }

        // Team sorting with validation
        $allowedTeamSortFields = ['assigned_date'];
        $teamSortField = $request->input('team_sort_field', 'assigned_date');
        $teamSortDirection = $request->input('team_sort_direction', 'desc');

        if (!in_array($teamSortField, $allowedTeamSortFields)) {
            $teamSortField = 'assigned_date';
        }
        $teamSortDirection = in_array($teamSortDirection, ['asc', 'desc']) ? $teamSortDirection : 'desc';

        $teamQuery->orderBy($teamSortField, $teamSortDirection);

        // Team pagination with validation
        $teamPerPage = $request->input('team_per_page', 10);
        if (!is_numeric($teamPerPage) || $teamPerPage < 1 || $teamPerPage > 100) {
            $teamPerPage = 10;
        }

        $teamMembers = $teamQuery->paginate($teamPerPage, ['*'], 'team_page')->withQueryString();

        // Case documents query with filters
        $documentsQuery = CaseDocument::with('documentType', 'case.client', 'case.teamMembers')->where('case_id', $caseId)->where(function ($q) {
            if (Auth::user()->can('manage-any-case-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-documents')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($clientQuery) {
                        $clientQuery->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('doc_search') && !empty($request->doc_search)) {
            $documentsQuery->where(function ($q) use ($request) {
                $q->where('document_name', 'like', '%' . $request->doc_search . '%')
                    ->orWhere('description', 'like', '%' . $request->doc_search . '%');
            });
        }

        if ($request->filled('doc_type') && $request->doc_type !== '_empty_') {
            $documentsQuery->where('document_type_id', $request->doc_type);
        }

        if ($request->filled('doc_confidentiality') && $request->doc_confidentiality !== '_empty_') {
            $documentsQuery->where('confidentiality', $request->doc_confidentiality);
        }

        if ($request->filled('doc_status') && $request->doc_status !== '_empty_') {
            $documentsQuery->where('status', $request->doc_status);
        }

        // Documents sorting with validation
        $allowedDocSortFields = ['document_name', 'created_at'];
        $docSortField = $request->input('doc_sort_field', 'created_at');
        $docSortDirection = $request->input('doc_sort_direction', 'desc');

        if (!in_array($docSortField, $allowedDocSortFields)) {
            $docSortField = 'created_at';
        }
        $docSortDirection = in_array($docSortDirection, ['asc', 'desc']) ? $docSortDirection : 'desc';

        $documentsQuery->orderBy($docSortField, $docSortDirection);

        // Documents pagination with validation
        $docPerPage = $request->input('doc_per_page', 10);
        if (!is_numeric($docPerPage) || $docPerPage < 1 || $docPerPage > 100) {
            $docPerPage = 10;
        }

        $caseDocuments = $documentsQuery->paginate($docPerPage, ['*'], 'doc_page')->withQueryString();

        $userQuery = User::where('type', '!=', 'client')->where(function ($q) {
            if (Auth::user()->can('manage-any-users')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-users')) {
                $q->where('created_by', Auth::id())
                    ->orWhere('id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allUsers = (clone $userQuery)->get(['id', 'name', 'email']);
        $users = (clone $userQuery)->active()->get(['id', 'name', 'email']);

        $documentTypeQuery = DocumentType::where(function ($q) {
            if (Auth::user()->can('manage-any-document-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allDocumentTypes = (clone $documentTypeQuery)->get(['id', 'name', 'color']);
        $documentTypes = (clone $documentTypeQuery)->active()->get(['id', 'name', 'color']);

        $roleQuery = \Spatie\Permission\Models\Role::where('name', '!=', 'superadmin')
            ->where('name', '!=', 'client')
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-roles')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-roles')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
        $allRoles = (clone $roleQuery)->get(['id', 'name', 'label']);

        // Get case notes for this case
        $caseNotesQuery = \App\Models\CaseNote::with('creator')
            ->whereJsonContains('case_ids', (string)$caseId)
            ->where(function ($q) use ($caseId) {
                if (Auth::user()->can('manage-any-case-notes')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-case-notes')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereExists(function ($sub) use ($caseId) {
                            $sub->from('cases')
                                ->join('clients', 'clients.id', '=', 'cases.client_id')
                                ->where('cases.id', $caseId)
                                ->where('clients.user_id', Auth::id());
                        })
                        ->orWhereExists(function ($sub) use ($caseId) {
                            $sub->from('case_team_members')
                                ->where('case_team_members.case_id', $caseId)
                                ->where('case_team_members.user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($request->filled('note_search')) {
            $caseNotesQuery->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->note_search . '%')
                    ->orWhere('content', 'like', '%' . $request->note_search . '%');
            });
        }

        if ($request->filled('note_type') && $request->note_type !== '_empty_') {
            $caseNotesQuery->where('note_type', $request->note_type);
        }

        if ($request->filled('note_priority') && $request->note_priority !== '_empty_') {
            $caseNotesQuery->where('priority', $request->note_priority);
        }

        $allowedNoteSortFields = ['title', 'created_at'];
        $noteSortField = $request->input('note_sort_field', 'created_at');
        $noteSortDirection = $request->input('note_sort_direction', 'desc');
        $noteSortField = in_array($noteSortField, $allowedNoteSortFields) ? $noteSortField : 'created_at';
        $noteSortDirection = in_array($noteSortDirection, ['asc', 'desc']) ? $noteSortDirection : 'desc';
        $caseNotesQuery->orderBy($noteSortField, $noteSortDirection);

        $notePerPage = $request->input('note_per_page', 10);
        if (!is_numeric($notePerPage) || $notePerPage < 1 || $notePerPage > 100) {
            $notePerPage = 10;
        }
        $caseNotes = $caseNotesQuery->paginate($notePerPage, ['*'], 'notes_page')->withQueryString();

        // Get research projects for this case with their notes and citations
        $allowedResearchSortFields = ['title', 'research_id'];
        $researchSortField = $request->input('research_sort_field', 'created_at');
        $researchSortDirection = $request->input('research_sort_direction', 'desc');
        $researchSortField = in_array($researchSortField, $allowedResearchSortFields) ? $researchSortField : 'created_at';
        $researchSortDirection = in_array($researchSortDirection, ['asc', 'desc']) ? $researchSortDirection : 'desc';

        $researchProjects = ResearchProject::with([
            'researchType',
            'notes' => function ($query) {
                $query->where(function ($q) {
                    if (Auth::user()->can('manage-any-research-notes')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-research-notes')) {
                        $q->where('created_by', Auth::id())
                            ->orWhereHas('researchProject.case.client', function ($clientQuery) {
                                $clientQuery->where('user_id', Auth::id());
                            })
                            ->orWhereHas('researchProject.case.teamMembers', function ($teamQuery) {
                                $teamQuery->where('user_id', Auth::id());
                            });
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });
            },
            'citations' => function ($query) {
                $query->where(function ($q) {
                    if (Auth::user()->can('manage-any-research-citations')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-research-citations')) {
                        $q->where('created_by', Auth::id())
                            ->orWhereHas('researchProject.case.client', function ($clientQuery) {
                                $clientQuery->where('user_id', Auth::id());
                            })
                            ->orWhereHas('researchProject.case.teamMembers', function ($teamQuery) {
                                $teamQuery->where('user_id', Auth::id());
                            });
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                });
            },
            'citations.source'
        ])
            ->where('case_id', $caseId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-projects')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-projects')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($clientQuery) {
                            $clientQuery->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderBy($researchSortField, $researchSortDirection)
            ->paginate(10, ['*'], 'research_page')->withQueryString();

        // Tasks query with filters
        $tasksQuery = Task::with(['taskType', 'taskStatus', 'assignedUser'])
            ->where('case_id', $caseId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-case-tasks')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-case-tasks')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($clientQuery) {
                            $clientQuery->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($request->has('task_search') && !empty($request->task_search)) {
            $tasksQuery->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->task_search . '%')
                    ->orWhere('description', 'like', '%' . $request->task_search . '%')
                    ->orWhere('task_id', 'like', '%' . $request->task_search . '%');
            });
        }

        if ($request->has('task_type_id') && $request->task_type_id !== '_empty_') {
            $tasksQuery->where('task_type_id', $request->task_type_id);
        }

        if ($request->has('task_status') && $request->task_status !== '_empty_') {
            $tasksQuery->where('task_status_id', $request->task_status);
        }

        if ($request->has('task_priority') && $request->task_priority !== '_empty_') {
            $tasksQuery->where('priority', $request->task_priority);
        }

        if ($request->has('task_assigned_to') && $request->task_assigned_to !== '_empty_') {
            $tasksQuery->where('assigned_to', $request->task_assigned_to);
        }

        // Tasks sorting with validation
        $allowedTaskSortFields = ['task_id', 'title', 'due_date'];
        $taskSortField = $request->input('task_sort_field', 'due_date');
        $taskSortDirection = $request->input('task_sort_direction', 'asc');

        if (!in_array($taskSortField, $allowedTaskSortFields)) {
            $taskSortField = 'due_date';
        }
        $taskSortDirection = in_array($taskSortDirection, ['asc', 'desc']) ? $taskSortDirection : 'asc';

        $tasksQuery->orderBy($taskSortField, $taskSortDirection);

        // Tasks pagination with validation
        $taskPerPage = $request->input('task_per_page', 10);
        if (!is_numeric($taskPerPage) || $taskPerPage < 1 || $taskPerPage > 100) {
            $taskPerPage = 10;
        }

        $tasks = $tasksQuery->paginate($taskPerPage, ['*'], 'task_page')->withQueryString();

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

        $taskStatusQuery = TaskStatus::where(function ($q) {
            if (Auth::user()->can('manage-any-task-statuses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-task-statuses')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allTaskStatuses = (clone $taskStatusQuery)->get(['id', 'name']);
        $taskStatuses = (clone $taskStatusQuery)->active()->get(['id', 'name']);

        $eventTypeQuery = \App\Models\EventType::where(function ($q) {
            if (Auth::user()->can('manage-any-event-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-event-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allEventTypes = (clone $eventTypeQuery)->get(['id', 'name']);
        $eventTypes = (clone $eventTypeQuery)->active()->get(['id', 'name']);

        $googleCalendarEnabled = Setting::where('user_id', createdBy())
            ->where('key', 'googleCalendarEnabled')
            ->value('value') == '1';

        return Inertia::render('cases/show', [
            'case' => $case,
            'timelines' => $timelines,
            'timelineWeekStart'    => $weekStart->toDateString(),
            'timelineMonthLabel'   => $weekStart->copy()->addDays(3)->format('F Y'),
            'timelineMonthNum'     => (int) $weekStart->copy()->addDays(3)->format('n'),
            'timelineYearNum'      => (int) $weekStart->copy()->addDays(3)->format('Y'),
            'teamMembers' => $teamMembers,
            'caseDocuments' => $caseDocuments,
            'caseNotes' => $caseNotes,
            'researchProjects' => $researchProjects,
            'tasks' => $tasks,
            'users' => $users,
            'allUsers' => $allUsers,
            'documentTypes' => $documentTypes,
            'allDocumentTypes' => $allDocumentTypes,
            'allRoles' => $allRoles,
            'taskTypes' => $taskTypes,
            'allTaskTypes' => $allTaskTypes,
            'taskStatuses' => $taskStatuses,
            'allTaskStatuses' => $allTaskStatuses,
            'eventTypes' => $eventTypes,
            'allEventTypes' => $allEventTypes,
            'googleCalendarEnabled' => $googleCalendarEnabled,
            'filters' => $request->only([
                'timeline_week_start',
                'timeline_search',
                'timeline_event_type',
                'timeline_status',
                'timeline_completed',
                'timeline_sort_field',
                'timeline_sort_direction',
                'timeline_per_page',
                'timeline_page',
                'team_search',
                'team_role',
                'team_status',
                'team_sort_field',
                'team_sort_direction',
                'team_per_page',
                'team_page',
                'doc_search',
                'doc_type',
                'doc_confidentiality',
                'doc_status',
                'doc_sort_field',
                'doc_sort_direction',
                'doc_per_page',
                'doc_page',
                'note_search',
                'note_type',
                'note_priority',
                'note_sort_field',
                'note_sort_direction',
                'note_per_page',
                'notes_page',
                'research_sort_field',
                'research_sort_direction',
                'research_page',
                'task_search',
                'task_type_id',
                'task_status',
                'task_priority',
                'task_assigned_to',
                'task_sort_field',
                'task_sort_direction',
                'task_per_page',
                'task_page'
            ]),
        ]);
    }

    public function create()
    {
        if (Auth::user()->can('create-cases')) {
            $clients = Client::active()
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-clients')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-clients')) {
                        $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })->get(['id', 'name']);

            $caseTypes = CaseType::active()
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-case-types')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-case-types')) {
                        $q->where('created_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })->get(['id', 'name']);

            $caseStatuses = CaseStatus::active()
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-case-statuses')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-case-statuses')) {
                        $q->where('created_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })->get(['id', 'name']);

            $courts = Court::active()
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-courts')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-courts')) {
                        $q->where('created_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })->get(['id', 'name']);

            return Inertia::render('cases/create', [
                'clients' => $clients,
                'caseTypes' => $caseTypes,
                'caseStatuses' => $caseStatuses,
                'courts' => $courts,
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function store(Request $request)
    {
        if (Auth::user()->can('create-cases')) {
            // Check case limit
            $authUser = auth()->user();
            $companyUser = User::find(getCompanyId($authUser->id));
            $currentCases = CaseModel::whereIn('created_by', getCompanyAndUsersId())->count();
            $maxCases = $companyUser->plan->max_cases;

            if ($currentCases >= $maxCases) {
                return redirect()->back()->with('error', __('Case limit exceeded. Your company plan allows maximum :max cases. Please contact your administrator.', ['max' => $maxCases]));
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'client_id' => 'required|exists:clients,id',
                'case_type_id' => 'required|exists:case_types,id',
                'case_status_id' => 'required|exists:case_statuses,id',
                'court_id' => 'required|exists:courts,id',
                'priority' => 'required|in:low,medium,high',
                'filing_date' => 'nullable|date',
                'expected_completion_date' => 'nullable|date',
                'estimated_value' => 'nullable|numeric|min:0',
                'opposing_party' => 'nullable|string',
                'court_details' => 'nullable|string',
                'status' => 'nullable|in:active,inactive',
                'sync_with_google_calendar' => 'nullable|boolean',
            ]);

            $validated['created_by'] = auth()->id();
            $validated['status'] = $validated['status'] ?? 'active';

            // Set default case status if not provided
            if (empty($validated['case_status_id'])) {
                $defaultStatus = CaseStatus::where('is_default', true)
                    ->where('status', 'active')
                    ->where(function ($q) {
                        if (Auth::user()->can('manage-any-case-statuses')) {
                            $q->whereIn('created_by', getCompanyAndUsersId());
                        } elseif (Auth::user()->can('manage-own-case-statuses')) {
                            $q->where('created_by', Auth::id());
                        }
                    })
                    ->first();

                if ($defaultStatus) {
                    $validated['case_status_id'] = $defaultStatus->id;
                } else {
                    return redirect()->back()->with('error', 'No case status selected and no default status found. Please create a default case status first.');
                }
            }

            // Verify FK permissions and accessibility
            $clientQuery = Client::active()->where('id', $validated['client_id']);
            if (Auth::user()->can('manage-any-clients')) {
                $clientQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-clients')) {
                $clientQuery->where('created_by', Auth::id());
            }
            $client = $clientQuery->first();

            $caseTypeQuery = CaseType::active()->where('id', $validated['case_type_id']);
            if (Auth::user()->can('manage-any-case-types')) {
                $caseTypeQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-types')) {
                $caseTypeQuery->where('created_by', Auth::id());
            }
            $caseType = $caseTypeQuery->first();

            $caseStatusQuery = CaseStatus::active()->where('id', $validated['case_status_id']);
            if (Auth::user()->can('manage-any-case-statuses')) {
                $caseStatusQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-statuses')) {
                $caseStatusQuery->where('created_by', Auth::id());
            }
            $caseStatus = $caseStatusQuery->first();

            $courtQuery = Court::active()->where('id', $validated['court_id']);
            if (Auth::user()->can('manage-any-courts')) {
                $courtQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-courts')) {
                $courtQuery->where('created_by', Auth::id());
            }
            $court = $courtQuery->first();

            if (!$client || !$caseType || !$caseStatus || !$court) {
                return redirect()->back()->with('error', 'Invalid selection. Please try again.');
            }

            $case = CaseModel::create($validated);

            // Handle Google Calendar sync
            if ($case && $request->sync_with_google_calendar) {
                $calendarService = new GoogleCalendarService();
                $eventId = $calendarService->createEvent($case, createdBy(), 'case');
                if ($eventId) {
                    $case->update(['google_calendar_event_id' => $eventId]);
                }
            }

            // Trigger notifications
            if ($case && !IsDemo()) {
                event(new \App\Events\NewCaseCreated($case, $request->all()));
            }

            // Check for errors and combine them
            $emailError = session()->pull('email_error');
            $slackError = session()->pull('slack_error');
            $twilioError = session()->pull('twilio_error');

            $errors = [];
            if ($emailError) {
                $errors[] = __('Email send failed: ') . $emailError;
            }
            if ($slackError) {
                $errors[] = __('Slack send failed: ') . $slackError;
            }
            if ($twilioError) {
                $errors[] = __('SMS send failed: ') . $twilioError;
            }

            if (!empty($errors)) {
                $message = __('Case created successfully, but ') . implode(', ', $errors);
                return redirect()->back()->with('warning', $message);
            }

            return redirect()->back()->with('success', 'Case created successfully.');
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function update(Request $request, $caseId)
    {
        if (Auth::user()->can('edit-cases')) {
            $case = CaseModel::where('id', $caseId)->whereIn('created_by', getCompanyAndUsersId())->first();

            if (!$case) {
                return redirect()->back()->with('error', __('Case not found or access denied.'));
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'client_id' => 'required|exists:clients,id',
                'case_type_id' => 'required|exists:case_types,id',
                'case_status_id' => 'required|exists:case_statuses,id',
                'court_id' => 'required|exists:courts,id',
                'priority' => 'required|in:low,medium,high',
                'filing_date' => 'nullable|date',
                'expected_completion_date' => 'nullable|date',
                'estimated_value' => 'nullable|numeric|min:0',
                'opposing_party' => 'nullable|string',
                'court_details' => 'nullable|string',
                'status' => 'nullable|in:active,inactive',
            ]);

            // Verify FK permissions and accessibility
            $clientQuery = Client::active()->where('id', $validated['client_id']);
            if (Auth::user()->can('manage-any-clients')) {
                $clientQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-clients')) {
                $clientQuery->where('created_by', Auth::id());
            }
            $client = $clientQuery->first();

            $caseTypeQuery = CaseType::active()->where('id', $validated['case_type_id']);
            if (Auth::user()->can('manage-any-case-types')) {
                $caseTypeQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-types')) {
                $caseTypeQuery->where('created_by', Auth::id());
            }
            $caseType = $caseTypeQuery->first();

            $caseStatusQuery = CaseStatus::active()->where('id', $validated['case_status_id']);
            if (Auth::user()->can('manage-any-case-statuses')) {
                $caseStatusQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-statuses')) {
                $caseStatusQuery->where('created_by', Auth::id());
            }
            $caseStatus = $caseStatusQuery->first();

            $courtQuery = Court::active()->where('id', $validated['court_id']);
            if (Auth::user()->can('manage-any-courts')) {
                $courtQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-courts')) {
                $courtQuery->where('created_by', Auth::id());
            }
            $court = $courtQuery->first();

            if (!$client || !$caseType || !$caseStatus || !$court) {
                return redirect()->back()->with('error', 'Invalid selection. Please try again.');
            }

            $case->update($validated);

            return redirect()->back()->with('success', 'Case updated successfully.');
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function destroy($caseId)
    {
        if (Auth::user()->can('delete-cases')) {
            $case = CaseModel::where('id', $caseId)->whereIn('created_by', getCompanyAndUsersId())->first();

            if (!$case) {
                return redirect()->back()->with('error', __('Case not found or access denied.'));
            }

            $case->delete();

            return redirect()->back()->with('success', 'Case deleted successfully.');
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    public function toggleStatus($caseId)
    {
        if (Auth::user()->can('toggle-status-cases')) {
            $case = CaseModel::where('id', $caseId)->whereIn('created_by', getCompanyAndUsersId())->first();

            if (!$case) {
                return redirect()->back()->with('error', __('Case not found or access denied.'));
            }

            $case->status = $case->status === 'active' ? 'inactive' : 'active';
            $case->save();

            return redirect()->back()->with('success', 'Case status updated successfully.');
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }
}
