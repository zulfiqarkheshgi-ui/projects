<?php

namespace App\Http\Controllers;

use App\Models\Hearing;
use App\Models\CaseModel;
use App\Models\Court;
use App\Models\Judge;
use App\Models\HearingType;
use App\Models\Setting;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class HearingController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-hearings')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = Hearing::with(['case', 'court', 'judge', 'hearingType', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-hearings')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-hearings')) {
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

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('hearing_id', 'like', '%' . $request->search . '%')
                    ->orWhereHas('case', function ($caseQuery) use ($request) {
                        $caseQuery->where('case_id', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['scheduled', 'in_progress', 'completed', 'postponed', 'cancelled'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('court_id') && $request->court_id !== '_empty_') {
            $query->where('court_id', $request->court_id);
        }

        $allowedSortFields = ['hearing_id', 'title', 'hearing_date', 'created_at'];
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

        $hearings = $query->paginate($perPage)->withQueryString();

        $cases = CaseModel::active()->where(function ($q) {
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
        })->get(['id', 'case_id', 'title']);

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

        $judges = Judge::active()->where(function ($q) {
            if (Auth::user()->can('manage-any-judges')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-judges')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->get(['id', 'name']);

        $hearingTypes = HearingType::active()->where(function ($q) {
            if (Auth::user()->can('manage-any-hearing-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-hearing-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->get(['id', 'name', 'duration_estimate']);

        $googleCalendarEnabled = Setting::where('user_id', createdBy())
            ->where('key', 'googleCalendarEnabled')
            ->value('value') == '1';

        return Inertia::render('hearings/index', [
            'hearings' => $hearings,
            'cases' => $cases,
            'courts' => $courts,
            'allCourts' => $allCourts,
            'judges' => $judges,
            'hearingTypes' => $hearingTypes,
            'googleCalendarEnabled' => $googleCalendarEnabled,
            'filters' => $request->only(['search', 'status', 'court_id', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-hearings')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'court_id' => 'required|exists:courts,id',
            'judge_id' => 'required|exists:judges,id',
            'hearing_type_id' => 'required|exists:hearing_types,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'hearing_date' => 'required|date|after_or_equal:today',
            'hearing_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15|max:480',
            'status' => 'nullable|in:scheduled,in_progress,completed,postponed,cancelled',
            'notes' => 'nullable|string',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'scheduled';

        // Set duration from hearing type if not provided
        if (empty($validated['duration_minutes'])) {
            $hearingType = HearingType::find($validated['hearing_type_id']);
            $validated['duration_minutes'] = $hearingType && $hearingType->duration_estimate
                ? $hearingType->duration_estimate
                : 60;
        }

        $hearing = Hearing::create($validated);

        // Handle Google Calendar sync
        if ($hearing && $request->sync_with_google_calendar) {
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($hearing, createdBy(), 'hearing');

            if ($eventId) {
                $hearing->update(['google_calendar_event_id' => $eventId]);
            }
        }

        // Load relationships for email
        $hearing->load(['hearingType', 'court', 'case.client']);

        // Create default notifications
        $this->createDefaultNotifications($hearing);

        // Trigger notifications
        if ($hearing && !IsDemo()) {
            event(new \App\Events\NewHearingCreated($hearing, $request->all()));
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
            $message = __('Hearing scheduled successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Hearing scheduled successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-hearings')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $hearing = Hearing::with(['case', 'court', 'judge', 'hearingType'])
            ->where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$hearing) {
            return redirect()->back()->with('error', 'Hearing not found.');
        }

        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'court_id' => 'required|exists:courts,id',
            'judge_id' => 'required|exists:judges,id',
            'hearing_type_id' => 'required|exists:hearing_types,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'hearing_date' => 'required|date|after_or_equal:today',
            'hearing_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15|max:480',
            'status' => 'nullable|in:scheduled,in_progress,completed,postponed,cancelled',
            'notes' => 'nullable|string',
            'outcome' => 'nullable|string',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        // Set duration from hearing type if not provided
        if (empty($validated['duration_minutes'])) {
            $hearingType = HearingType::find($validated['hearing_type_id']);
            $validated['duration_minutes'] = $hearingType && $hearingType->duration_estimate
                ? $hearingType->duration_estimate
                : 60;
        }

        $hearing->update($validated);
        $hearing->load(['case', 'court', 'judge', 'hearingType']);

        // Handle Google Calendar sync
        if ($request->sync_with_google_calendar && !$hearing->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($hearing, createdBy(), 'hearing');
            if ($eventId) {
                $hearing->update(['google_calendar_event_id' => $eventId]);
            }
        } elseif ($request->sync_with_google_calendar && $hearing->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->updateEvent($hearing->google_calendar_event_id, $hearing, createdBy(), 'hearing');
        } elseif (!$request->sync_with_google_calendar && $hearing->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->deleteEvent($hearing->google_calendar_event_id, createdBy());
            $hearing->update(['google_calendar_event_id' => null]);
        }

        // Update notifications if date/time changed
        if (isset($validated['hearing_date']) || isset($validated['hearing_time'])) {
            $this->updateNotifications($hearing);
        }

        return redirect()->back()->with('success', 'Hearing updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-hearings')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $hearing = Hearing::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$hearing) {
            return redirect()->back()->with('error', 'Hearing not found.');
        }

        // Delete Google Calendar event if exists
        if ($hearing->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->deleteEvent($hearing->google_calendar_event_id, createdBy());
        }

        $hearing->delete();

        return redirect()->back()->with('success', 'Hearing deleted successfully.');
    }

    private function createDefaultNotifications($hearing)
    {
        $reminderTimes = [1440, 60, 15]; // 24 hours, 1 hour, 15 minutes
        $date = date('Y-m-d', strtotime($hearing->hearing_date));
        $time = date('H:i', strtotime($hearing->hearing_time));
        $hearingDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $time);

        foreach ($reminderTimes as $minutes) {
            \App\Models\HearingNotification::create([
                'hearing_id' => $hearing->id,
                'user_id' => createdBy(),
                'type' => 'system',
                'minutes_before' => $minutes,
                'scheduled_at' => $hearingDateTime->copy()->subMinutes($minutes),
                'status' => 'pending'
            ]);
        }
    }

    public function getCourtJudges($courtId)
    {
        $judges = Judge::where(function ($q) {
            if (Auth::user()->can('manage-any-judges')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-judges')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('court_id', $courtId)
            ->where('status', 'active')
            ->get(['id', 'name'])
            ->map(function ($judge) {
                return [
                    'value' => $judge->id,
                    'label' => $judge->name
                ];
            });

        return response()->json($judges);
    }

    private function updateNotifications($hearing)
    {
        // Delete existing pending notifications
        \App\Models\HearingNotification::where('hearing_id', $hearing->id)
            ->where('status', 'pending')
            ->delete();

        // Create new notifications
        $this->createDefaultNotifications($hearing);
    }
}
