<?php

namespace App\Http\Controllers;
use App\Models\LegalPrecedent;
use App\Models\ResearchCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LegalPrecedentController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-legal-precedents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = LegalPrecedent::with(['category', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-legal-precedents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-legal-precedents')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        $stats = [
            'total'      => (clone $query)->count(),
            'active'     => (clone $query)->where('status', 'active')->count(),
            'overruled'  => (clone $query)->where('status', 'overruled')->count(),
            'questioned' => (clone $query)->where('status', 'questioned')->count(),
            'avg_relevance' => round((clone $query)->avg('relevance_score') ?? 0, 1),
        ];

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('case_name', 'like', '%' . $request->search . '%')
                    ->orWhere('citation', 'like', '%' . $request->search . '%')
                    ->orWhere('summary', 'like', '%' . $request->search . '%')
                    ->orWhere('jurisdiction', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('category_id') && $request->category_id !== '_empty_') {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'overruled', 'questioned', 'archived'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('relevance_score') && $request->relevance_score !== '_empty_') {
            $query->where('relevance_score', '>=', $request->relevance_score);
        }

        $allowedSortFields = ['case_name', 'relevance_score', 'created_at'];
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

        $precedents = $query->paginate($perPage)->withQueryString();

        $categoryQuery = ResearchCategory::where(function ($q) {
            if (Auth::user()->can('manage-any-research-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-categories')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allCategories = (clone $categoryQuery)->get(['id', 'name']);
        $categories = (clone $categoryQuery)->active()->get(['id', 'name']);

        return Inertia::render('legal-research/precedents/index', [
            'precedents'    => $precedents,
            'categories'    => $categories,
            'allCategories' => $allCategories,
            'stats'         => $stats,
            'filters'       => $request->only(['search', 'category_id', 'jurisdiction', 'status', 'relevance_score', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-legal-precedents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'case_name' => 'required|string|max:255',
            'citation' => 'required|string|max:255',
            'jurisdiction' => 'required|string|max:255',
            'summary' => 'required|string',
            'category_id' => 'required|exists:research_categories,id',
            'relevance_score' => 'required|integer|min:1|max:10',
            'decision_date' => 'nullable|date',
            'court_level' => 'nullable|string|max:255',
            'key_points' => 'nullable|array',
            'status' => 'nullable|in:active,overruled,questioned,archived',
        ]);

        if ($validated['category_id']) {
            $category = ResearchCategory::active()->where('id', $validated['category_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$category) {
                return redirect()->back()->with('error', 'Invalid category selection.');
            }
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        LegalPrecedent::create($validated);

        return redirect()->back()->with('success', 'Legal precedent created successfully.');
    }

    public function update(Request $request, $precedentId)
    {
        if (!Auth::user()->can('edit-legal-precedents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $precedent = LegalPrecedent::where('id', $precedentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-legal-precedents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-legal-precedents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$precedent) {
            return redirect()->back()->with('error', 'Legal precedent not found.');
        }

        $validated = $request->validate([
            'case_name' => 'required|string|max:255',
            'citation' => 'required|string|max:255',
            'jurisdiction' => 'required|string|max:255',
            'summary' => 'required|string',
            'category_id' => 'nullable|exists:research_categories,id',
            'relevance_score' => 'required|integer|min:1|max:10',
            'decision_date' => 'nullable|date',
            'court_level' => 'nullable|string|max:255',
            'key_points' => 'nullable|array',
            'status' => 'nullable|in:active,overruled,questioned,archived',
        ]);

        if ($validated['category_id']) {
            $category = ResearchCategory::active()->where('id', $validated['category_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if (!$category) {
                return redirect()->back()->with('error', 'Invalid category selection.');
            }
        }

        $precedent->update($validated);

        return redirect()->back()->with('success', 'Legal precedent updated successfully.');
    }

    public function destroy($precedentId)
    {
        if (!Auth::user()->can('delete-legal-precedents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $precedent = LegalPrecedent::where('id', $precedentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-legal-precedents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-legal-precedents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$precedent) {
            return redirect()->back()->with('error', 'Legal precedent not found.');
        }

        $precedent->delete();

        return redirect()->back()->with('success', 'Legal precedent deleted successfully.');
    }

    public function toggleStatus($precedentId)
    {
        if (!Auth::user()->can('toggle-status-legal-precedents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $precedent = LegalPrecedent::where('id', $precedentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-legal-precedents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-legal-precedents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$precedent) {
            return redirect()->back()->with('error', 'Legal precedent not found.');
        }

        $precedent->status = $precedent->status === 'active' ? 'archived' : 'active';
        $precedent->save();

        return redirect()->back()->with('success', 'Legal precedent status updated successfully.');
    }
}
