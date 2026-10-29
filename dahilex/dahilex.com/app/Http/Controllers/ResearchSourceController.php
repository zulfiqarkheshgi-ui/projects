<?php

namespace App\Http\Controllers;
use App\Models\ResearchSource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ResearchSourceController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-research-sources')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ResearchSource::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-research-sources')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-research-sources')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('source_name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('url', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('source_type') && $request->source_type !== '_empty_') {
            $allowedTypes = ['database', 'case_law', 'statutory', 'regulatory', 'secondary', 'custom'];
            if (in_array($request->source_type, $allowedTypes)) {
                $query->where('source_type', $request->source_type);
            }
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'inactive'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['source_name', 'created_at'];
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

        $sources = $query->paginate($perPage)->withQueryString();

        return Inertia::render('legal-research/sources/index', [
            'sources' => $sources,
            'filters' => $request->only(['search', 'source_type', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-research-sources')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'source_name' => 'required|string|max:255',
            'source_type' => 'required|in:database,case_law,statutory,regulatory,secondary,custom',
            'description' => 'nullable|string',
            'url' => 'nullable|url',
            'access_info' => 'nullable|string',
            'credentials' => 'nullable|array',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $exists = ResearchSource::where('source_name', $validated['source_name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Research source with this name already exists.');
        }

        ResearchSource::create($validated);

        return redirect()->back()->with('success', 'Research source created successfully.');
    }

    public function update(Request $request, $sourceId)
    {
        if (!Auth::user()->can('edit-research-sources')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $source = ResearchSource::where('id', $sourceId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-sources')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-sources')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$source) {
            return redirect()->back()->with('error', 'Research source not found.');
        }

        $validated = $request->validate([
            'source_name' => 'required|string|max:255',
            'source_type' => 'required|in:database,case_law,statutory,regulatory,secondary,custom',
            'description' => 'nullable|string',
            'url' => 'nullable|url',
            'access_info' => 'nullable|string',
            'credentials' => 'nullable|array',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = ResearchSource::where('source_name', $validated['source_name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $sourceId)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Research source with this name already exists.');
        }

        $source->update($validated);

        return redirect()->back()->with('success', 'Research source updated successfully.');
    }

    public function destroy($sourceId)
    {
        if (!Auth::user()->can('delete-research-sources')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $source = ResearchSource::where('id', $sourceId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-sources')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-sources')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$source) {
            return redirect()->back()->with('error', 'Research source not found.');
        }

        $source->delete();

        return redirect()->back()->with('success', 'Research source deleted successfully.');
    }

    public function toggleStatus($sourceId)
    {
        if (!Auth::user()->can('toggle-status-research-sources')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $source = ResearchSource::where('id', $sourceId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-research-sources')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-research-sources')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$source) {
            return redirect()->back()->with('error', 'Research source not found.');
        }

        $source->status = $source->status === 'active' ? 'inactive' : 'active';
        $source->save();

        return redirect()->back()->with('success', 'Research source status updated successfully.');
    }
}