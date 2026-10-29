<?php

namespace App\Http\Controllers;
use App\Models\ResearchType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ResearchTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-research-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ResearchType::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-research-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
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

        $researchTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('legal-research/research-types/index', [
            'researchTypes' => $researchTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-research-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if research type with same name already exists for this company
        $exists = ResearchType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Research type with this name already exists.');
        }

        ResearchType::create($validated);

        return redirect()->back()->with('success', 'Research type created successfully.');
    }

    public function update(Request $request, $researchTypeId)
    {
        if (!Auth::user()->can('edit-research-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $researchType = ResearchType::where('id', $researchTypeId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if ($researchType) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'status' => 'nullable|in:active,inactive',
                ]);

                // Check if research type with same name already exists for this company (excluding current)
                $exists = ResearchType::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $researchTypeId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', 'Research type with this name already exists.');
                }

                $researchType->update($validated);

                return redirect()->back()->with('success', 'Research type updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update research type');
            }
        } else {
            return redirect()->back()->with('error', 'Research type not found.');
        }
    }

    public function destroy($researchTypeId)
    {
        if (!Auth::user()->can('delete-research-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $researchType = ResearchType::where('id', $researchTypeId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if ($researchType) {
            try {
                // Check if research type has research projects
                $projectCount = $researchType->researchProjects()->count();
                if ($projectCount > 0) {
                    return response()->json(['message' => 'Cannot delete research type with assigned research projects'], 400);
                }
                
                $researchType->delete();
                return redirect()->back()->with('success', 'Research type deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete research type');
            }
        } else {
            return redirect()->back()->with('error', 'Research type not found.');
        }
    }

    public function toggleStatus($researchTypeId)
    {
        if (!Auth::user()->can('toggle-status-research-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $researchType = ResearchType::where('id', $researchTypeId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if ($researchType) {
            try {
                $researchType->status = $researchType->status === 'active' ? 'inactive' : 'active';
                $researchType->save();

                return redirect()->back()->with('success', 'Research type status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update research type status');
            }
        } else {
            return redirect()->back()->with('error', 'Research type not found.');
        }
    }
}