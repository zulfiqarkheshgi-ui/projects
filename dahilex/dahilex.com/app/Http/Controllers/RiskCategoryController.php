<?php

namespace App\Http\Controllers;
use App\Models\RiskCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RiskCategoryController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-risk-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = RiskCategory::where(function($q) {
            if (Auth::user()->can('manage-any-risk-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-risk-categories')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
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

        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $categories = $query->paginate($perPage)->withQueryString();

        return Inertia::render('compliance/risk-categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-risk-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|size:7',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $exists = RiskCategory::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Risk category with this name already exists.');
        }

        RiskCategory::create($validated);

        return redirect()->back()->with('success', 'Risk category created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-risk-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $category = RiskCategory::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Risk category not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|size:7',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = RiskCategory::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Risk category with this name already exists.');
        }

        $category->update($validated);

        return redirect()->back()->with('success', 'Risk category updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-risk-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $category = RiskCategory::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Risk category not found.');
        }

        if ($category->riskAssessments()->exists()) {
            return redirect()->back()->with('error', __('Cannot delete risk category that has risks associated with it.'));
        }

        $category->delete();

        return redirect()->back()->with('success', __('Risk category deleted successfully.'));
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-risk-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $category = RiskCategory::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Risk category not found.');
        }

        $category->update(['status' => $category->status === 'active' ? 'inactive' : 'active']);

        return redirect()->back()->with('success', 'Risk category status updated successfully.');
    }
}
