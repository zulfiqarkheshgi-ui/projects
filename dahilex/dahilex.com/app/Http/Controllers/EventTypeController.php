<?php

namespace App\Http\Controllers;
use App\Models\EventType;
use App\Models\CaseTimeline;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class EventTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-event-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = EventType::with(['creator'])
            ->where(function($q) {
                if (Auth::user()->can('manage-any-event-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-event-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
            });

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

        $eventTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('advocate/event-types/index', [
            'eventTypes' => $eventTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-event-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $exists = EventType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Event type with this name already exists.');
        }

        EventType::create($validated);

        return redirect()->back()->with('success', 'Event type created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-event-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $eventType = EventType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$eventType) {
            return redirect()->back()->with('error', 'Event type not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = EventType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Event type with this name already exists.');
        }

        $eventType->update($validated);

        return redirect()->back()->with('success', 'Event type updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-event-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $eventType = EventType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$eventType) {
            return redirect()->back()->with('error', 'Event type not found.');
        }

        $existsCaseTimeLine = CaseTimeline::where('event_type_id', $id)->exists();
        if ($existsCaseTimeLine) {
            return redirect()->back()->with('error', 'Cannot delete event type that has associated case timelines.');
        }

        $eventType->delete();

        return redirect()->back()->with('success', 'Event type deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-event-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $eventType = EventType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$eventType) {
            return redirect()->back()->with('error', 'Event type not found.');
        }

        $eventType->status = $eventType->status === 'active' ? 'inactive' : 'active';
        $eventType->save();

        return redirect()->back()->with('success', 'Event type status updated successfully.');
    }
}
