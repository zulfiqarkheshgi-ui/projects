<?php

namespace App\Http\Controllers;
use App\Models\ResearchCategory;
use App\Models\PracticeArea;
use App\Models\KnowledgeArticle;
use App\Models\LegalPrecedent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ResearchCategoryController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-research-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ResearchCategory::with(['practiceArea', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-research-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-categories')) {
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

        if ($request->filled('practice_area_id') && $request->practice_area_id !== '_empty_') {
            $query->where('practice_area_id', $request->practice_area_id);
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

        $categories = $query->paginate($perPage)->withQueryString();

        $practiceAreaQuery = PracticeArea::where(function($q) {
            if (Auth::user()->can('manage-any-practice-areas')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-practice-areas')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allPracticeAreas = (clone $practiceAreaQuery)->get(['id', 'name']);
        $practiceAreas = (clone $practiceAreaQuery)->active()->get(['id', 'name']);

        return Inertia::render('legal-research/categories/index', [
            'categories' => $categories,
            'practiceAreas' => $practiceAreas,
            'allPracticeAreas' => $allPracticeAreas,
            'filters' => $request->only(['search', 'practice_area_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-research-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'practice_area_id' => 'required|exists:practice_areas,id',
            'status' => 'nullable|in:active,inactive',
        ]);

        $practiceArea = PracticeArea::active()->where('id', $validated['practice_area_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();
        if (!$practiceArea) {
            return redirect()->back()->withErrors([
                'practice_area_id' => 'Invalid practice area selection.'
            ])->withInput();
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['color'] = $validated['color'] ?? '#3b82f6';

        $exists = ResearchCategory::where('name', $validated['name'])
            ->where('practice_area_id', $validated['practice_area_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'name' => 'Research category with this name already exists in the selected practice area.'
            ])->withInput();
        }

        ResearchCategory::create($validated);

        return redirect()->back()->with('success', 'Research category created successfully.');
    }

    public function update(Request $request, $categoryId)
    {
        if (!Auth::user()->can('edit-research-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = ResearchCategory::where('id', $categoryId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Research category not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'practice_area_id' => 'required|exists:practice_areas,id',
            'status' => 'nullable|in:active,inactive',
        ]);

        $practiceArea = PracticeArea::active()->where('id', $validated['practice_area_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();
        if (!$practiceArea) {
            return redirect()->back()->withErrors([
                'practice_area_id' => 'Invalid practice area selection.'
            ])->withInput();
        }

        $exists = ResearchCategory::where('name', $validated['name'])
            ->where('practice_area_id', $validated['practice_area_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $categoryId)
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'name' => 'Research category with this name already exists in the selected practice area.'
            ])->withInput();
        }

        $category->update($validated);

        return redirect()->back()->with('success', 'Research category updated successfully.');
    }

    public function destroy($categoryId)
    {
        if (!Auth::user()->can('delete-research-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = ResearchCategory::where('id', $categoryId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Research category not found.');
        }

        $existsKnowledgeArticles = KnowledgeArticle::where('category_id', $categoryId)->exists();
        if ($existsKnowledgeArticles) {
            return redirect()->back()->with('error', 'Cannot delete research category that has associated knowledge articles.');
        }

        $existsLegalPrecedents = LegalPrecedent::where('category_id', $categoryId)->exists();
        if ($existsLegalPrecedents) {
            return redirect()->back()->with('error', 'Cannot delete research category that has associated legal precedents.');
        }

        $category->delete();

        return redirect()->back()->with('success', 'Research category deleted successfully.');
    }

    public function toggleStatus($categoryId)
    {
        if (!Auth::user()->can('toggle-status-research-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = ResearchCategory::where('id', $categoryId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Research category not found.');
        }

        $category->status = $category->status === 'active' ? 'inactive' : 'active';
        $category->save();

        return redirect()->back()->with('success', 'Research category status updated successfully.');
    }
}
