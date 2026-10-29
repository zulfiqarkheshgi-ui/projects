<?php

namespace App\Http\Controllers;
use App\Models\DocumentCategory;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DocumentCategoryController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-document-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = DocumentCategory::where(function ($q) {
            if (Auth::user()->can('manage-any-document-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-categories')) {
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

        $categories = $query->paginate($perPage)->withQueryString();

        return Inertia::render('document-management/categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-document-categories')) {
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

        $exists = DocumentCategory::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Document category with this name already exists.');
        }

        DocumentCategory::create($validated);

        return redirect()->back()->with('success', 'Document category created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-document-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = DocumentCategory::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Document category not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = DocumentCategory::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Document category with this name already exists.');
        }

        $category->update($validated);

        return redirect()->back()->with('success', 'Document category updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-document-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = DocumentCategory::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Document category not found.');
        }

        $existsDocuments = Document::where('category_id', $id)->exists();
        if ($existsDocuments) {
            return redirect()->back()->with('error', 'Cannot delete document category that has associated documents.');
        }

        $category->delete();

        return redirect()->back()->with('success', 'Document category deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-document-categories')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $category = DocumentCategory::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Document category not found.');
        }

        $category->status = $category->status === 'active' ? 'inactive' : 'active';
        $category->save();

        return redirect()->back()->with('success', 'Document category status updated successfully.');
    }
}