<?php

namespace App\Http\Controllers;
use App\Models\Document;
use App\Models\DocumentPermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DocumentPermissionController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-document-permissions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = DocumentPermission::with(['document', 'user', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-document-permissions')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-permissions')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('document_id') && !empty($request->document_id)) {
            $query->where('document_id', $request->document_id);
        }

        if ($request->has('user_id') && !empty($request->user_id)) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('permission_type') && $request->permission_type !== 'all') {
            $query->where('permission_type', $request->permission_type);
        }

        if ($request->has('search') && !empty($request->search)) {
            $query->whereHas('document', function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            })->orWhereHas('user', function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            });
        }

        $query->orderBy('created_at', 'desc');
        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }
        
        $permissions = $query->paginate($perPage);

        $documents = Document::where('created_by', createdBy())->get(['id', 'name']);
        $users = User::where('created_by', createdBy())->get(['id', 'name']);

        return Inertia::render('document-management/permissions/index', [
            'permissions' => $permissions,
            'documents' => $documents,
            'users' => $users,
            'filters' => $request->all(['search', 'document_id', 'user_id', 'permission_type', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-document-permissions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'document_id' => 'required|exists:documents,id',
            'user_id' => 'required|exists:users,id',
            'permission_type' => 'required|in:view,edit,download,comment',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $document = Document::where('id', $validated['document_id'])
            ->where('created_by', createdBy())
            ->first();

        $user = User::where('id', $validated['user_id'])
            ->where(function($query) {
                $query->where('created_by', createdBy())
                      ->orWhere('id', createdBy());
            })
            ->first();

        if (!$document || !$user) {
            return redirect()->back()->with('error', 'Invalid document or user selection.');
        }

        $validated['created_by'] = Auth::id();

        $existing = DocumentPermission::where([
            'document_id' => $validated['document_id'],
            'user_id' => $validated['user_id'],
            'permission_type' => $validated['permission_type']
        ])->first();

        if ($existing) {
            $existing->update($validated);
            return redirect()->back()->with('success', 'Permission updated successfully.');
        } else {
            DocumentPermission::create($validated);
            return redirect()->back()->with('success', 'Permission granted successfully.');
        }
    }

    public function update(Request $request, $permissionId)
    {
        if (!Auth::user()->can('edit-document-permissions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $permission = DocumentPermission::where('id', $permissionId)
            ->first();

        if (!$permission) {
            return redirect()->back()->with('error', 'Permission not found.');
        }

        $validated = $request->validate([
            'expires_at' => 'nullable|date|after:now',
        ]);

        $permission->update($validated);

        return redirect()->back()->with('success', 'Permission updated successfully.');
    }

    public function destroy($permissionId)
    {
        if (!Auth::user()->can('delete-document-permissions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $permission = DocumentPermission::where('id', $permissionId)
            ->first();

        if (!$permission) {
            return redirect()->back()->with('error', 'Permission not found.');
        }

        $permission->delete();

        return redirect()->back()->with('success', 'Permission revoked successfully.');
    }
}