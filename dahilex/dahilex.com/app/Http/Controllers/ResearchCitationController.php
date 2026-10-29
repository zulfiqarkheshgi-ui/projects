<?php

namespace App\Http\Controllers;
use App\Models\ResearchCitation;
use App\Models\ResearchProject;
use App\Models\ResearchSource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ResearchCitationController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-research-citations')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ResearchCitation::query()
            ->with(['researchProject.case.client', 'source', 'creator'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-citations')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-citations')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('researchProject.case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('researchProject.case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('citation_text', 'like', '%' . $request->search . '%')
                    ->orWhere('notes', 'like', '%' . $request->search . '%')
                    ->orWhere('page_number', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('research_project_id') && $request->research_project_id !== 'all') {
            $query->where('research_project_id', $request->research_project_id);
        }

        if ($request->has('citation_type') && $request->citation_type !== 'all') {
            $query->where('citation_type', $request->citation_type);
        }

        if ($request->has('source_id') && $request->source_id !== 'all') {
            $query->where('source_id', $request->source_id);
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

        $citations = $query->paginate($request->per_page && $request->per_page > 0 ? $request->per_page : 10);

        $projects = ResearchProject::where(function($q) {
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
        })->where('status', 'active')->get(['id', 'title']);

        $sources = ResearchSource::where(function($q) {
            if (Auth::user()->can('manage-any-research-sources')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-sources')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('status', 'active')->get(['id', 'source_name']);

        return Inertia::render('legal-research/citations/index', [
            'citations' => $citations,
            'projects' => $projects,
            'sources' => $sources,
            'filters' => $request->all(['search', 'research_project_id', 'citation_type', 'source_id', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-research-citations')) {
            return redirect()->back()->withErrors(['error' => __('Permission Denied.')]);
        }
        
        if ($request->has('source_id') && (empty($request->source_id) || $request->source_id === 'null')) {
            $request->merge(['source_id' => null]);
        }
        
        $validated = $request->validate([
            'research_project_id' => 'required|exists:research_projects,id',
            'citation_text' => 'required|string',
            'source_id' => 'nullable|exists:research_sources,id',
            'page_number' => 'nullable|string|max:255',
            'citation_type' => 'required|in:case,statute,article,book,website,other',
            'notes' => 'nullable|string',
        ]);

        $projectQuery = ResearchProject::where('id', $validated['research_project_id'])->where('status', 'active');
        if (Auth::user()->can('manage-any-research-projects')) {
            $projectQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-research-projects')) {
            $projectQuery->where(function ($q) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            });
        }
        $project = $projectQuery->first();

        if (!$project) {
            return redirect()->back()->withErrors(['error' => 'Invalid research project selection.']);
        }

        if (!empty($validated['source_id'])) {
            $sourceQuery = ResearchSource::where('id', $validated['source_id'])->where('status', 'active');
            if (Auth::user()->can('manage-any-research-sources')) {
                $sourceQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-sources')) {
                $sourceQuery->where('created_by', Auth::id());
            }
            $source = $sourceQuery->first();
            if (!$source) {
                return redirect()->back()->withErrors(['error' => 'Invalid source selection.']);
            }
        }

        $exists = ResearchCitation::where('citation_text', $validated['citation_text'])
            ->where('research_project_id', $validated['research_project_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-citations')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-citations')) {
                    $q->where('created_by', Auth::id());
                }
            })
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['error' => 'Research citation with this text already exists in this project.']);
        }

        $validated['created_by'] = Auth::id();

        ResearchCitation::create($validated);

        return redirect()->back()->with('success', 'Research citation created successfully.');
    }

    public function update(Request $request, $citationId)
    {
        if (!Auth::user()->can('edit-research-citations')) {
            return redirect()->back()->withErrors(['error' => __('Permission Denied.')]);
        }
        $citation = ResearchCitation::where('id', $citationId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-citations')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-citations')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('researchProject.case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('researchProject.case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$citation) {
            return redirect()->back()->withErrors(['error' => 'Research citation not found.']);
        }
        
        if ($request->has('source_id') && (empty($request->source_id) || $request->source_id === 'null')) {
            $request->merge(['source_id' => null]);
        }

        $validated = $request->validate([
            'research_project_id' => 'required|exists:research_projects,id',
            'citation_text' => 'required|string',
            'source_id' => 'nullable|exists:research_sources,id',
            'page_number' => 'nullable|string|max:255',
            'citation_type' => 'required|in:case,statute,article,book,website,other',
            'notes' => 'nullable|string',
        ]);

        $projectQuery = ResearchProject::where('id', $validated['research_project_id'])->where('status', 'active');
        if (Auth::user()->can('manage-any-research-projects')) {
            $projectQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-research-projects')) {
            $projectQuery->where(function ($q) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            });
        }
        $project = $projectQuery->first();

        if (!$project) {
            return redirect()->back()->withErrors(['error' => 'Invalid research project selection.']);
        }

        if (!empty($validated['source_id'])) {
            $sourceQuery = ResearchSource::where('id', $validated['source_id'])->where('status', 'active');
            if (Auth::user()->can('manage-any-research-sources')) {
                $sourceQuery->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-sources')) {
                $sourceQuery->where('created_by', Auth::id());
            }
            $source = $sourceQuery->first();
            if (!$source) {
                return redirect()->back()->withErrors(['error' => 'Invalid source selection.']);
            }
        }

        $exists = ResearchCitation::where('citation_text', $validated['citation_text'])
            ->where('research_project_id', $validated['research_project_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-citations')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-citations')) {
                    $q->where('created_by', Auth::id());
                }
            })
            ->where('id', '!=', $citationId)
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['error' => 'Research citation with this text already exists in this project.']);
        }

        $citation->update($validated);

        return redirect()->back()->with('success', 'Research citation updated successfully.');
    }

    public function destroy($citationId)
    {
        if (!Auth::user()->can('delete-research-citations')) {
            return redirect()->back()->withErrors(['error' => __('Permission Denied.')]);
        }
        $citation = ResearchCitation::where('id', $citationId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-citations')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-citations')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('researchProject.case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('researchProject.case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$citation) {
            return redirect()->back()->withErrors(['error' => 'Research citation not found.']);
        }

        $citation->delete();

        return redirect()->back()->with('success', 'Research citation deleted successfully.');
    }
}
