<?php

namespace App\Http\Controllers\LandingPage;

use App\Http\Controllers\Controller;
use App\Models\LandingPageCustomPage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomPageController extends Controller
{
    public function index(Request $request)
    {
        $query = LandingPageCustomPage::query();

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSortFields = ['title', 'created_at', 'sort_order'];
        $sortField = $request->get('sort_field', 'sort_order');
        $sortDirection = $request->get('sort_direction', 'asc');

        $sortField = in_array($sortField, $allowedSortFields) ? $sortField : 'sort_order';
        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'asc';

        $query->orderBy($sortField, $sortDirection);

        // Pagination with validation
        $perPage = $request->get('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $pages = $query->paginate($perPage)->withQueryString();

        return Inertia::render('landing-page/custom-pages/index', [
            'pages' => $pages,
            'filters' => $request->only(['search', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function create()
    {
        return Inertia::render('landing-page/custom-pages/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer'
        ]);

        $slug = \Illuminate\Support\Str::slug($validated['title']);

        if (LandingPageCustomPage::where('slug', $slug)->exists()) {
            return back()->with('error', __('A page with this title already exists. Please use a different title.'));
        }

        LandingPageCustomPage::create($validated);

        return back()->with('success', __('Custom page created successfully!'));
    }

    public function edit(LandingPageCustomPage $customPage)
    {
        return Inertia::render('landing-page/custom-pages/edit', [
            'page' => $customPage
        ]);
    }

    public function update(Request $request, LandingPageCustomPage $customPage)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer'
        ]);

        $slug = \Illuminate\Support\Str::slug($validated['title']);

        if (LandingPageCustomPage::where('slug', $slug)->where('id', '!=', $customPage->id)->exists()) {
            return back()->with('error', __('A page with this title already exists. Please use a different title.'));
        }

        $customPage->update($validated);

        return back()->with('success', __('Custom page updated successfully!'));
    }

    public function destroy(LandingPageCustomPage $customPage)
    {
        $customPage->delete();
        return back()->with('success', __('Custom page deleted successfully!'));
    }

    public function show($slug)
    {
        $page = LandingPageCustomPage::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $landingSettings = \App\Models\LandingPageSetting::getSettings();



        return Inertia::render('landing-page/custom-page', [
            'page' => $page,
            'customPages' => LandingPageCustomPage::active()->ordered()->get(),
            'settings' => $landingSettings
        ]);
    }
}
