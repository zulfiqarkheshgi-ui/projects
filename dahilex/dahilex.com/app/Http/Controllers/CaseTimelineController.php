<?php

namespace App\Http\Controllers;
use App\Models\CaseTimeline;
use App\Models\CaseModel;
use App\Models\Setting;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CaseTimelineController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-case-timelines')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CaseTimeline::with(['case', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-case-timelines')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-timelines')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('event_type', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('case_id') && !empty($request->case_id) && $request->case_id !== 'all') {
            $query->where('case_id', $request->case_id);
        }

        if ($request->has('event_type') && !empty($request->event_type) && $request->event_type !== 'all') {
            $query->where('event_type', $request->event_type);
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

        $timelines = $query->paginate($perPage);
        $cases = CaseModel::where('status', 'active')->get(['id', 'title', 'case_id']);
        $eventTypes = \App\Models\EventType->where('status', 'active')->get(['id', 'name']);

        $googleCalendarEnabled = Setting::where('user_id', createdBy())
            ->where('key', 'googleCalendarEnabled')
            ->value('value') == '1';

        return Inertia::render('cases/case-timelines/index', [
            'timelines' => $timelines,
            'cases' => $cases,
            'eventTypes' => $eventTypes,
            'googleCalendarEnabled' => $googleCalendarEnabled,
            'filters' => $request->all(['search', 'case_id', 'event_type', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-case-timelines')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'event_type_id' => 'required|exists:event_types,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_date' => 'required|date',
            'is_completed' => 'nullable|boolean',
            'status' => 'nullable|in:active,inactive',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['event_type'] = '';
        $validated['is_completed'] = $validated['is_completed'] ?? false;

        $case = CaseModel::where('id', $validated['case_id'])->first();
        if (!$case) {
            return redirect()->back()->with('error', 'Invalid case selected.');
        }

        // Check for duplicate timeline events with same title and event_date for the same case
        $exists = CaseTimeline::where('case_id', $validated['case_id'])
            ->where('title', $validated['title'])
            ->where('event_date', $validated['event_date'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'title' => 'Already exists.'
            ])->withInput();
        }

        $timeline = CaseTimeline::create($validated);

        // Handle Google Calendar sync
        if ($timeline && $request->sync_with_google_calendar) {
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($timeline, createdBy(), 'timeline');
            if ($eventId) {
                $timeline->update(['google_calendar_event_id' => $eventId]);
            }
        }

        return redirect()->back()->with('success', 'Timeline event created successfully.');
    }

    public function update(Request $request, $timelineId)
    {
        if (!Auth::user()->can('edit-case-timelines')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $timeline = CaseTimeline::where('id', $timelineId)->first();

        if (!$timeline) {
            return redirect()->back()->with('error', 'Timeline event not found.');
        }

        $validated = $request->validate([
            'case_id' => 'required|exists:cases,id',
            'event_type_id' => 'required|exists:event_types,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_date' => 'required|date',
            'is_completed' => 'nullable|boolean',
            'status' => 'nullable|in:active,inactive',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        $validated['is_completed'] = $validated['is_completed'] ?? false;
        $validated['event_type'] = '';

        $case = CaseModel::where('id', $validated['case_id'])->first();
        if (!$case) {
            return redirect()->back()->with('error', 'Invalid case selected.');
        }

        // Check for duplicate timeline events with same title and event_date for the same case (excluding current)
        $exists = CaseTimeline::where('case_id', $validated['case_id'])
            ->where('title', $validated['title'])
            ->where('event_date', $validated['event_date'])
            ->where('id', '!=', $timelineId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'title' => 'Already exists.'
            ])->withInput();
        }

        $timeline->update($validated);

        // Handle Google Calendar sync
        $calendarService = new GoogleCalendarService();

        if ($timeline->google_calendar_event_id) {
            // If timeline already has Google Calendar event, update it automatically
            $calendarService->updateEvent($timeline->google_calendar_event_id, $timeline, createdBy(), 'timeline');
        } elseif ($request->sync_with_google_calendar) {
            // Create new Google Calendar event if sync is requested
            $eventId = $calendarService->createEvent($timeline, createdBy(), 'timeline');
            if ($eventId) {
                $timeline->update(['google_calendar_event_id' => $eventId]);
            }
        }

        return redirect()->back()->with('success', 'Timeline event updated successfully.');
    }

    public function destroy($timelineId)
    {
        if (!Auth::user()->can('delete-case-timelines')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $timeline = CaseTimeline::where('id', $timelineId)->first();

        if (!$timeline) {
            return redirect()->back()->with('error', 'Timeline event not found.');
        }

        // Delete Google Calendar event if exists
        if ($timeline->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->deleteEvent($timeline->google_calendar_event_id, createdBy());
        }

        $timeline->delete();

        return redirect()->back()->with('success', 'Timeline event deleted successfully.');
    }

    public function toggleStatus($timelineId)
    {
        if (!Auth::user()->can('toggle-status-case-timelines')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $timeline = CaseTimeline::where('id', $timelineId)->first();

        if (!$timeline) {
            return redirect()->back()->with('error', 'Timeline event not found.');
        }

        $timeline->status = $timeline->status === 'active' ? 'inactive' : 'active';
        $timeline->save();

        return redirect()->back()->with('success', 'Timeline event status updated successfully.');
    }
}
