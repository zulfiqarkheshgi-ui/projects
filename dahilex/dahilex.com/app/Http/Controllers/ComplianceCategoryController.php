<?php

namespace App\Http\Controllers;
use App\Models\ComplianceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ComplianceCategoryController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-compliance-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ComplianceCategory::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-compliance-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-compliance-categories')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        $allowedSortFields = ['name', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy($sortField, $sortDirection);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $categories = $query->paginate($perPage)->withQueryString();

        return Inertia::render('compliance/categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-compliance-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|size:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $exists = ComplianceCategory::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Compliance category with this name already exists.');
        }

        ComplianceCategory::create($validated);

        return redirect()->back()->with('success', 'Compliance category created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-compliance-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = ComplianceCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|size:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = ComplianceCategory::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Compliance category with this name already exists.');
        }

        $category->update($validated);

        return redirect()->back()->with('success', 'Compliance category updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-compliance-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = ComplianceCategory::findOrFail($id);

        if ($category->complianceRequirements()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete category that has compliance requirements.');
        }

        $category->delete();

        return redirect()->back()->with('success', 'Compliance category deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-compliance-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = ComplianceCategory::findOrFail($id);

        $newStatus = $category->status === 'active' ? 'inactive' : 'active';
        $category->update(['status' => $newStatus]);

        return redirect()->back()->with('success', 'Category status updated successfully.');
    }
}
