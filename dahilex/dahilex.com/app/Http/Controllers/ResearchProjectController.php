<?php

namespace App\Http\Controllers;
use App\Models\ResearchProject;
use App\Models\ResearchType;
use App\Models\CaseModel;
use App\Models\ResearchSource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ResearchProjectController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-research-projects')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ResearchProject::with(['case', 'creator', 'researchType'])->where(function ($q) {
            if (Auth::user()->can('manage-any-research-projects')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-projects')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('research_id', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhereHas('case', function ($caseQuery) use ($request) {
                        $caseQuery->where('case_id', 'like', '%' . $request->search . '%')
                                  ->orWhere('title', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereHas('researchType', function ($typeQuery) use ($request) {
                        $typeQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('research_type_id') && $request->research_type_id !== '_empty_') {
            $query->where('research_type_id', $request->research_type_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'completed', 'on_hold', 'cancelled'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('priority') && $request->priority !== '_empty_') {
            $allowedPriorities = ['low', 'medium', 'high', 'urgent'];
            if (in_array($request->priority, $allowedPriorities)) {
                $query->where('priority', $request->priority);
            }
        }

        if ($request->filled('case_id') && $request->case_id !== '_empty_') {
            $query->where('case_id', $request->case_id);
        }

        $allowedSortFields = ['title', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy($sortField, $sortDirection);

        $isGrid = $request->filled('view') && $request->filled('view') == 'grid';

        if($isGrid){
            $perPage = $request->input('per_page', 9);
            if (!is_numeric($perPage) || $perPage < 1 || $perPage > 90) {
                $perPage = 9;
            }
        }else{
            $perPage = $request->input('per_page', 10);
            if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
                $perPage = 10;
            }
        }

        $projects = $query->paginate($perPage)->withQueryString();

        $caseQuery = CaseModel::where(function($q) {
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
        $allCases = (clone $caseQuery)->get(['id', 'case_id', 'title']);
        $cases = (clone $caseQuery)->active()->get(['id', 'case_id', 'title']);

        $researchTypeQuery = ResearchType::where(function($q) {
            if (Auth::user()->can('manage-any-research-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allResearchTypes = (clone $researchTypeQuery)->get(['id', 'name']);
        $researchTypes = (clone $researchTypeQuery)->active()->get(['id', 'name']);

        return Inertia::render('legal-research/projects/index', [
            'projects' => $projects,
            'cases' => $cases,
            'allCases' => $allCases,
            'researchTypes' => $researchTypes,
            'allResearchTypes' => $allResearchTypes,
            'filters' => $request->only(['search', 'research_type_id', 'status', 'priority', 'case_id', 'sort_field', 'sort_direction', 'per_page', 'page', 'view']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-research-projects')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'research_type_id' => 'required|exists:research_types,id',
            'case_id' => 'required|exists:cases,id',
            'priority' => 'required|in:low,medium,high,urgent',
            'due_date' => 'nullable|date|after:today',
            'status' => 'nullable|in:active,completed,on_hold,cancelled',
        ]);

        if ($validated['case_id']) {
            $case = CaseModel::active()->where('id', $validated['case_id'])
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
            if (!$case) {
                return redirect()->back()->with('error', 'Invalid case selection.');
            }
        }

        $researchType = ResearchType::active()->where('id', $validated['research_type_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();
        if (!$researchType) {
            return redirect()->back()->with('error', 'Invalid research type selection.');
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        ResearchProject::create($validated);

        return redirect()->back()->with('success', 'Research project created successfully.');
    }

    public function update(Request $request, $projectId)
    {
        if (!Auth::user()->can('edit-research-projects')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $project = ResearchProject::where('id', $projectId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-projects')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-projects')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$project) {
            return redirect()->back()->with('error', 'Research project not found.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'research_type_id' => 'required|exists:research_types,id',
            'case_id' => 'nullable|exists:cases,id',
            'priority' => 'required|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:active,completed,on_hold,cancelled',
        ]);

        if ($validated['case_id']) {
            $case = CaseModel::active()->where('id', $validated['case_id'])
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
            if (!$case) {
                return redirect()->back()->with('error', 'Invalid case selection.');
            }
        }

        $researchType = ResearchType::active()->where('id', $validated['research_type_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();
        if (!$researchType) {
            return redirect()->back()->with('error', 'Invalid research type selection.');
        }

        $project->update($validated);

        return redirect()->back()->with('success', 'Research project updated successfully.');
    }

    public function destroy($projectId)
    {
        if (!Auth::user()->can('delete-research-projects')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $project = ResearchProject::where('id', $projectId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-projects')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-projects')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$project) {
            return redirect()->back()->with('error', 'Research project not found.');
        }

        $project->delete();

        return redirect()->back()->with('success', 'Research project deleted successfully.');
    }

    public function toggleStatus(Request $request, $projectId)
    {
        if (!Auth::user()->can('toggle-status-research-projects')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $project = ResearchProject::where('id', $projectId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-projects')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-projects')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$project) {
            return redirect()->back()->with('error', 'Research project not found.');
        }

        $validated = $request->validate([
            'status' => 'required|in:active,completed,on_hold,cancelled',
        ]);

        $project->update($validated);

        return redirect()->back()->with('success', 'Research project status updated successfully.');
    }

    public function show($projectId, Request $request)
    {
        if (!Auth::user()->can('manage-research-projects')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $project = ResearchProject::with(['case', 'creator', 'researchType'])
            ->where('id', $projectId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-projects')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-projects')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$project) {
            return redirect()->back()->with('error', 'Research project not found.');
        }

        $notesQuery = $project->notes()
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-notes')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-notes')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('researchProject.case.client', function ($clientQuery) {
                            $clientQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($request->filled('notes_search')) {
            $notesQuery->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->notes_search . '%')
                    ->orWhere('note_content', 'like', '%' . $request->notes_search . '%')
                    ->orWhere('source_reference', 'like', '%' . $request->notes_search . '%');
            });
        }

        $allowedNotesSortFields = ['title', 'created_at'];
        $notesSortField = $request->input('notes_sort_field', 'created_at');
        $notesSortDirection = $request->input('notes_sort_direction', 'desc');
        $notesSortField = in_array($notesSortField, $allowedNotesSortFields) ? $notesSortField : 'created_at';
        $notesSortDirection = in_array($notesSortDirection, ['asc', 'desc']) ? $notesSortDirection : 'desc';
        $notesQuery->orderBy($notesSortField, $notesSortDirection);

        $notesPerPage = $request->input('notes_per_page', 10);
        if (!is_numeric($notesPerPage) || $notesPerPage < 1 || $notesPerPage > 100) {
            $notesPerPage = 10;
        }
        $notes = $notesQuery->paginate($notesPerPage, ['*'], 'notes_page')->withQueryString();

        $citationsQuery = $project->citations()
            ->with('source')
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-citations')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-citations')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('researchProject.case.client', function ($clientQuery) {
                            $clientQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($request->filled('citations_search')) {
            $citationsQuery->where(function ($q) use ($request) {
                $q->where('citation_text', 'like', '%' . $request->citations_search . '%')
                    ->orWhere('notes', 'like', '%' . $request->citations_search . '%');
            });
        }

        if ($request->filled('citations_type') && $request->citations_type !== '_empty_') {
            $allowedTypes = ['case', 'statute', 'article', 'book', 'website', 'other'];
            if (in_array($request->citations_type, $allowedTypes)) {
                $citationsQuery->where('citation_type', $request->citations_type);
            }
        }

        if ($request->filled('citations_source_id') && $request->citations_source_id !== '_empty_') {
            $citationsQuery->where('source_id', $request->citations_source_id);
        }

        $allowedCitationsSortFields = ['citation_text', 'created_at'];
        $citationsSortField = $request->input('citations_sort_field', 'created_at');
        $citationsSortDirection = $request->input('citations_sort_direction', 'desc');
        $citationsSortField = in_array($citationsSortField, $allowedCitationsSortFields) ? $citationsSortField : 'created_at';
        $citationsSortDirection = in_array($citationsSortDirection, ['asc', 'desc']) ? $citationsSortDirection : 'desc';
        $citationsQuery->orderBy($citationsSortField, $citationsSortDirection);

        $citationsPerPage = $request->input('citations_per_page', 10);
        if (!is_numeric($citationsPerPage) || $citationsPerPage < 1 || $citationsPerPage > 100) {
            $citationsPerPage = 10;
        }
        $citations = $citationsQuery->paginate($citationsPerPage, ['*'], 'citations_page')->withQueryString();

        $sourceQuery = ResearchSource::where(function($q) {
            if (Auth::user()->can('manage-any-research-sources')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-sources')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allSources = (clone $sourceQuery)->get(['id', 'source_name']);
        $sources = (clone $sourceQuery)->active()->get(['id', 'source_name']);

        return Inertia::render('legal-research/projects/view', [
            'project' => $project,
            'notes' => $notes,
            'citations' => $citations,
            'sources' => $sources,
            'allSources' => $allSources,
            'filters' => $request->only([
                'notes_search', 'notes_sort_field', 'notes_sort_direction', 'notes_per_page', 'notes_page',
                'citations_search', 'citations_type', 'citations_source_id', 'citations_sort_field', 'citations_sort_direction', 'citations_per_page', 'citations_page',
            ]),
        ]);
    }
}
