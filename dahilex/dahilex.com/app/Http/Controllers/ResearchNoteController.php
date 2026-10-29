<?php

namespace App\Http\Controllers;
use App\Models\ResearchNote;
use App\Models\ResearchProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ResearchNoteController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-research-notes')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ResearchNote::query()
            ->with(['researchProject.case.client', 'creator'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-notes')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-notes')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('researchProject.case.client', function ($cq) {
                            $cq->where('user_id', Auth::id())->orWhere('user_id', Auth::id());
                        })
                        ->orWhereHas('researchProject.case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id())->orWhere('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('note_content', 'like', '%' . $request->search . '%')
                    ->orWhere('source_reference', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('research_project_id') && $request->research_project_id !== 'all') {
            $query->where('research_project_id', $request->research_project_id);
        }

        if ($request->has('is_private') && $request->is_private !== 'all') {
            $query->where('is_private', $request->is_private === '1');
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

        $notes = $query->paginate($request->per_page && $request->per_page > 0 ? $request->per_page : 10);

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

        return Inertia::render('legal-research/notes/index', [
            'notes' => $notes,
            'projects' => $projects,
            'filters' => $request->all(['search', 'research_project_id', 'is_private', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-research-notes')) {
            return redirect()->back()->withErrors(['error' => __('Permission Denied.')]);
        }
        $validated = $request->validate([
            'research_project_id' => 'required|exists:research_projects,id',
            'title' => 'required|string|max:255',
            'note_content' => 'required|string',
            'source_reference' => 'nullable|string',
            'tags' => 'nullable|array',
            'is_private' => 'nullable|boolean',
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

        $exists = ResearchNote::where('title', $validated['title'])
            ->where('research_project_id', $validated['research_project_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-notes')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-notes')) {
                    $q->where('created_by', Auth::id());
                }
            })
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['error' => 'Research note with this title already exists in this project.']);
        }

        $validated['created_by'] = Auth::id();
        $validated['is_private'] = $validated['is_private'] ?? false;

        ResearchNote::create($validated);

        return redirect()->back()->with('success', 'Research note created successfully.');
    }

    public function update(Request $request, $noteId)
    {
        if (!Auth::user()->can('edit-research-notes')) {
            return redirect()->back()->withErrors(['error' => __('Permission Denied.')]);
        }
        $note = ResearchNote::where('id', $noteId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-notes')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-notes')) {
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

        if (!$note) {
            return redirect()->back()->withErrors(['error' => 'Research note not found.']);
        }

        $validated = $request->validate([
            'research_project_id' => 'required|exists:research_projects,id',
            'title' => 'required|string|max:255',
            'note_content' => 'required|string',
            'source_reference' => 'nullable|string',
            'tags' => 'nullable|array',
            'is_private' => 'nullable|boolean',
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

        $exists = ResearchNote::where('title', $validated['title'])
            ->where('research_project_id', $validated['research_project_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-notes')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-notes')) {
                    $q->where('created_by', Auth::id());
                }
            })
            ->where('id', '!=', $noteId)
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['error' => 'Research note with this title already exists in this project.']);
        }

        $note->update($validated);

        return redirect()->back()->with('success', 'Research note updated successfully.');
    }

    public function destroy($noteId)
    {
        if (!Auth::user()->can('delete-research-notes')) {
            return redirect()->back()->withErrors(['error' => __('Permission Denied.')]);
        }
        $note = ResearchNote::where('id', $noteId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-notes')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-notes')) {
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

        if (!$note) {
            return redirect()->back()->withErrors(['error' => 'Research note not found.']);
        }

        $note->delete();

        return redirect()->back()->with('success', 'Research note deleted successfully.');
    }
}