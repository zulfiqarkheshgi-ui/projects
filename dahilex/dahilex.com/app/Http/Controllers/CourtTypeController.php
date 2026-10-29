<?php

namespace App\Http\Controllers;
use App\Models\CourtType;
use App\Models\Court;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CourtTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-court-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CourtType::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-court-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-court-types')) {
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

        $courtTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('advocate/court-types/index', [
            'courtTypes' => $courtTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-court-types')) {
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

        $exists = CourtType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Court type with this name already exists.');
        }

        CourtType::create($validated);

        return redirect()->back()->with('success', 'Court type created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-court-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $courtType = CourtType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$courtType) {
            return redirect()->back()->with('error', 'Court type not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = CourtType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Court type with this name already exists.');
        }

        $courtType->update($validated);

        return redirect()->back()->with('success', 'Court type updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-court-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $courtType = CourtType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$courtType) {
            return redirect()->back()->with('error', 'Court type not found.');
        }

        $existsCourts = Court::where('court_type_id', $id)->exists();

        if ($existsCourts) {
            return redirect()->back()->with('error', 'Cannot delete court type that has associated courts.');
        }

        $courtType->delete();

        return redirect()->back()->with('success', 'Court type deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-court-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $courtType = CourtType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$courtType) {
            return redirect()->back()->with('error', 'Court type not found.');
        }

        $courtType->status = $courtType->status === 'active' ? 'inactive' : 'active';
        $courtType->save();

        return redirect()->back()->with('success', 'Court type status updated successfully.');
    }
}