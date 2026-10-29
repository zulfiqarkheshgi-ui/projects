<?php

namespace App\Http\Controllers;

use App\Models\PracticeArea;
use App\Models\ResearchCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PracticeAreaController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-practice-areas')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = PracticeArea::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-practice-areas')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-practice-areas')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('area_id', 'like', '%' . $request->search . '%')
                    ->orWhere('certifications', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('expertise_level') && $request->expertise_level !== '_empty_') {
            $allowedLevels = ['beginner', 'intermediate', 'expert'];
            if (in_array($request->expertise_level, $allowedLevels)) {
                $query->where('expertise_level', $request->expertise_level);
            }
        }

        if ($request->filled('is_primary') && $request->is_primary !== '_empty_') {
            $query->where('is_primary', $request->is_primary === 'true');
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'inactive'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['area_id', 'name', 'created_at'];
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

        $practiceAreas = $query->paginate($perPage)->withQueryString();

        return Inertia::render('advocate/practice-areas/index', [
            'practiceAreas' => $practiceAreas,
            'filters' => $request->only(['search', 'expertise_level', 'is_primary', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-practice-areas')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'expertise_level' => 'required|in:beginner,intermediate,expert',
            'is_primary' => 'nullable|in:true,false,1,0',
            'certifications' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        // Convert string boolean to actual boolean
        if (isset($validated['is_primary'])) {
            $validated['is_primary'] = filter_var($validated['is_primary'], FILTER_VALIDATE_BOOLEAN);
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['is_primary'] = $validated['is_primary'] ?? false;

        // Check if practice area with same name already exists for this company
        $exists = PracticeArea::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Practice area with this name already exists.');
        }

        PracticeArea::create($validated);

        return redirect()->back()->with('success', 'Practice area created successfully.');
    }

    public function update(Request $request, $areaId)
    {
        if (!Auth::user()->can('edit-practice-areas')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $area = PracticeArea::where('id', $areaId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-practice-areas')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-practice-areas')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if ($area) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'expertise_level' => 'required|in:beginner,intermediate,expert',
                    'is_primary' => 'nullable|in:true,false,1,0',
                    'certifications' => 'nullable|string',
                    'status' => 'nullable|in:active,inactive',
                ]);

                // Convert string boolean to actual boolean
                if (isset($validated['is_primary'])) {
                    $validated['is_primary'] = filter_var($validated['is_primary'], FILTER_VALIDATE_BOOLEAN);
                }

                // Check if practice area with same name already exists for this company (excluding current)
                $exists = PracticeArea::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $areaId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', 'Practice area with this name already exists.');
                }

                $area->update($validated);

                return redirect()->back()->with('success', 'Practice area updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update practice area');
            }
        } else {
            return redirect()->back()->with('error', 'Practice area not found.');
        }
    }

    public function destroy($areaId)
    {
        if (!Auth::user()->can('delete-practice-areas')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $area = PracticeArea::where('id', $areaId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-practice-areas')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-practice-areas')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if ($area) {
            $existsResearchCategories = ResearchCategory::where('practice_area_id', $areaId)->exists();
            if ($existsResearchCategories) {
                return redirect()->back()->with('error', 'Cannot delete practice area that has associated research categories.');
            }

            try {
                $area->delete();
                return redirect()->back()->with('success', 'Practice area deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete practice area');
            }
        } else {
            return redirect()->back()->with('error', 'Practice area not found.');
        }
    }

    public function toggleStatus($areaId)
    {
        if (!Auth::user()->can('toggle-status-practice-areas')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $area = PracticeArea::where('id', $areaId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-practice-areas')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-practice-areas')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if ($area) {
            try {
                $area->status = $area->status === 'active' ? 'inactive' : 'active';
                $area->save();

                return redirect()->back()->with('success', 'Practice area status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update practice area status');
            }
        } else {
            return redirect()->back()->with('error', 'Practice area not found.');
        }
    }
}
