<?php

namespace App\Http\Controllers;

use App\Models\HearingType;
use App\Models\Hearing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class HearingTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-hearing-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = HearingType::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-hearing-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-hearing-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('type_id', 'like', '%' . $request->search . '%')
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

        $hearingTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('hearing-types/index', [
            'hearingTypes' => $hearingTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-hearing-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_estimate' => 'nullable|integer|min:1',
            'status' => 'nullable|in:active,inactive',
            'requirements' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if hearing type with same name already exists for this company
        $exists = HearingType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Hearing type with this name already exists.');
        }

        HearingType::create($validated);

        return redirect()->back()->with('success', 'Hearing type created successfully.');
    }

    public function update(Request $request, $hearingTypeId)
    {
        if (!Auth::user()->can('edit-hearing-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $hearingType = HearingType::where('id', $hearingTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($hearingType) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'duration_estimate' => 'nullable|integer|min:1',
                    'status' => 'nullable|in:active,inactive',
                    'requirements' => 'nullable|array',
                    'notes' => 'nullable|string',
                ]);

                // Check if hearing type with same name already exists for this company (excluding current)
                $exists = HearingType::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $hearingTypeId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', 'Hearing type with this name already exists.');
                }

                $hearingType->update($validated);

                return redirect()->back()->with('success', 'Hearing type updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update hearing type');
            }
        } else {
            return redirect()->back()->with('error', 'Hearing type not found.');
        }
    }

    public function show($hearingTypeId)
    {
        if (!Auth::user()->can('manage-hearing-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $hearingType = HearingType::with(['creator'])
            ->where('id', $hearingTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$hearingType) {
            return redirect()->route('hearing-types.index')->with('error', 'Hearing type not found.');
        }

        return Inertia::render('hearing-types/show', [
            'hearingType' => $hearingType,
        ]);
    }

    public function destroy($hearingTypeId)
    {
        if (!Auth::user()->can('delete-hearing-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $hearingType = HearingType::where('id', $hearingTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($hearingType) {

            $existsHearings = Hearing::where('hearing_type_id', $hearingTypeId)->exists();

            if ($existsHearings) {
                return redirect()->back()->with('error', 'Cannot delete hearing type that has associated hearing.');
            }

            try {
                $hearingType->delete();
                return redirect()->back()->with('success', 'Hearing type deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete hearing type');
            }
        } else {
            return redirect()->back()->with('error', 'Hearing type not found.');
        }
    }

    public function toggleStatus($hearingTypeId)
    {
        if (!Auth::user()->can('toggle-status-hearing-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $hearingType = HearingType::where('id', $hearingTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($hearingType) {
            try {
                $hearingType->status = $hearingType->status === 'active' ? 'inactive' : 'active';
                $hearingType->save();

                return redirect()->back()->with('success', 'Hearing type status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update hearing type status');
            }
        } else {
            return redirect()->back()->with('error', 'Hearing type not found.');
        }
    }
}
