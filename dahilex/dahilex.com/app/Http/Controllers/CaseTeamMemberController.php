<?php

namespace App\Http\Controllers;
use App\Models\CaseTeamMember;
use App\Models\CaseModel;
use App\Models\User;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CaseTeamMemberController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-case-team-members')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CaseTeamMember::query()
            ->with(['case', 'user', 'creator'])
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

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('user', function ($userQuery) use ($request) {
                        $userQuery->where('name', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereHas('case', function ($caseQuery) use ($request) {
                        $caseQuery->where('title', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->has('case_id') && !empty($request->case_id) && $request->case_id !== 'all') {
            $query->where('case_id', $request->case_id);
        }

        if ($request->has('role') && !empty($request->role) && $request->role !== 'all') {
            $query->whereHas('user.roles', function($q) use ($request) {
                $q->where('name', $request->role);
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
        
        $teamMembers = $query->paginate($perPage);
        
        $cases = CaseModel::where(function($q) {
            if (Auth::user()->can('manage-any-cases')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cases')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('status', 'active')->get(['id', 'title', 'case_id']);
        
        $users = User::where(function($q) {
            $q->whereIn('created_by', getCompanyAndUsersId())
                ->orWhere('id', Auth::id());
        })->where('status', 'active')->get(['id', 'name']);
        
        $roles = \Spatie\Permission\Models\Role::all(['name', 'label']);
        return Inertia::render('cases/case-team-members/index', [
            'teamMembers' => $teamMembers,
            'cases' => $cases,
            'users' => $users,
            'roles' => $roles,
            'filters' => $request->all(['search', 'case_id', 'role', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-case-team-members')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'user_id' => 'required|exists:users,id',
            'assigned_date' => 'required|date',
            'status' => 'nullable|in:active,inactive',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $case = CaseModel::where('id', $validated['case_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();
        if (!$case) {
            return redirect()->back()->with('error', 'Invalid case selected.');
        }

        $user = User::where('id', $validated['user_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();
        if (!$user) {
            return redirect()->back()->with('error', 'Invalid user selected.');
        }

        $exists = CaseTeamMember::where('case_id', $validated['case_id'])
            ->where('user_id', $validated['user_id'])
            ->exists();
        if ($exists) {
            return redirect()->back()->withErrors([
                'user_id' => 'Already assigned.'
            ])->withInput();
        }

        $teamMember = CaseTeamMember::create($validated);

        // Handle Google Calendar sync
        if ($teamMember && $request->sync_with_google_calendar) {
            $teamMember->load('user');
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($teamMember, createdBy(), 'team_member');
            if ($eventId) {
                $teamMember->update(['google_calendar_event_id' => $eventId]);
            }
        }

        return redirect()->back()->with('success', 'Team member assigned successfully.');
    }

    public function update(Request $request, $teamMemberId)
    {
        if (!Auth::user()->can('edit-case-team-members')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $teamMember = CaseTeamMember::whereHas('case', function ($q) {
            if (Auth::user()->can('manage-any-case-team-members')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-team-members')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('id', $teamMemberId)->first();

        if (!$teamMember) {
            return redirect()->back()->with('error', 'Team member assignment not found.');
        }

        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'user_id' => 'required|exists:users,id',
            'assigned_date' => 'required|date',
            'status' => 'nullable|in:active,inactive',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        $case = CaseModel::where('id', $validated['case_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();
        if (!$case) {
            return redirect()->back()->with('error', 'Invalid case selected.');
        }

        $user = User::where('id', $validated['user_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();
        if (!$user) {
            return redirect()->back()->with('error', 'Invalid user selected.');
        }

        $exists = CaseTeamMember::where('case_id', $validated['case_id'])
            ->where('user_id', $validated['user_id'])
            ->where('id', '!=', $teamMemberId)
            ->exists();
        if ($exists) {
            return redirect()->back()->withErrors([
                'user_id' => 'Already assigned.'
            ])->withInput();
        }

        $teamMember->update($validated);

        // Handle Google Calendar sync
        if ($request->sync_with_google_calendar && !$teamMember->google_calendar_event_id) {
            $teamMember->load('user');
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($teamMember, createdBy(), 'team_member');
            if ($eventId) {
                $teamMember->update(['google_calendar_event_id' => $eventId]);
            }
        } elseif ($request->sync_with_google_calendar && $teamMember->google_calendar_event_id) {
            $teamMember->load('user');
            $calendarService = new GoogleCalendarService();
            $calendarService->updateEvent($teamMember->google_calendar_event_id, $teamMember, createdBy(), 'team_member');
        } elseif (!$request->sync_with_google_calendar && $teamMember->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->deleteEvent($teamMember->google_calendar_event_id, createdBy());
            $teamMember->update(['google_calendar_event_id' => null]);
        }

        return redirect()->back()->with('success', 'Team member assignment updated successfully.');
    }

    public function destroy($teamMemberId)
    {
        if (!Auth::user()->can('delete-case-team-members')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $teamMember = CaseTeamMember::whereHas('case', function ($q) {
            if (Auth::user()->can('manage-any-case-team-members')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-team-members')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('id', $teamMemberId)->first();

        if (!$teamMember) {
            return redirect()->back()->with('error', 'Team member assignment not found.');
        }

        // Delete Google Calendar event if exists
        if ($teamMember->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->deleteEvent($teamMember->google_calendar_event_id, createdBy());
        }

        $teamMember->delete();

        return redirect()->back()->with('success', 'Team member assignment removed successfully.');
    }

    public function toggleStatus($teamMemberId)
    {
        if (!Auth::user()->can('toggle-status-case-team-members')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $teamMember = CaseTeamMember::whereHas('case', function ($q) {
            if (Auth::user()->can('manage-any-case-team-members')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-team-members')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('id', $teamMemberId)->first();

        if (!$teamMember) {
            return redirect()->back()->with('error', 'Team member assignment not found.');
        }

        $teamMember->status = $teamMember->status === 'active' ? 'inactive' : 'active';
        $teamMember->save();

        return redirect()->back()->with('success', 'Team member status updated successfully.');
    }
}