<?php

namespace App\Http\Controllers;
use App\Models\CaseType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CaseTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-case-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CaseType::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-case-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-types')) {
                $q->where('created_by', Auth::id());
            }else {
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

        $caseTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('cases/case-types/index', [
            'caseTypes' => $caseTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-case-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'status' => 'nullable|in:active,inactive',
        ]);
        $validated['created_by'] = auth()->id();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['color'] = $validated['color'] ?? '#3B82F6';

        $exists = CaseType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Case type with this name already exists.');
        }

        CaseType::create($validated);

        return redirect()->back()->with('success', 'Case type created successfully.');
    }

    public function update(Request $request, $caseTypeId)
    {
        if (!Auth::user()->can('edit-case-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $caseType = CaseType::where('id', $caseTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$caseType) {
            return redirect()->back()->with('error', 'Case type not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['color'] = $validated['color'] ?? '#3B82F6';

        $exists = CaseType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $caseTypeId)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Case type with this name already exists.');
        }

        $caseType->update($validated);

        return redirect()->back()->with('success', 'Case type updated successfully.');
    }

    public function destroy($caseTypeId)
    {
        if (!Auth::user()->can('delete-case-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $caseType = CaseType::where('id', $caseTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$caseType) {
            return redirect()->back()->with('error', 'Case type not found.');
        }

        if ($caseType->cases()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete case type that has associated cases.');
        }

        $caseType->delete();

        return redirect()->back()->with('success', 'Case type deleted successfully.');
    }

    public function toggleStatus($caseTypeId)
    {
        if (!Auth::user()->can('toggle-status-case-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $caseType = CaseType::where('id', $caseTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$caseType) {
            return redirect()->back()->with('error', 'Case type not found.');
        }

        $caseType->status = $caseType->status === 'active' ? 'inactive' : 'active';
        $caseType->save();

        return redirect()->back()->with('success', 'Case type status updated successfully.');
    }
}