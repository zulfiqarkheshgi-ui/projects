<?php

namespace App\Http\Controllers;

use App\Models\DocumentType;
use App\Models\CaseDocument;
use App\Models\ClientDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DocumentTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-document-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = DocumentType::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-document-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-types')) {
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

        $documentTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('advocate/document-types/index', [
            'documentTypes' => $documentTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-document-types')) {
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

        $exists = DocumentType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Document type with this name already exists.');
        }

        DocumentType::create($validated);

        return redirect()->back()->with('success', 'Document type created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-document-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $documentType = DocumentType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$documentType) {
            return redirect()->back()->with('error', 'Document type not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = DocumentType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Document type with this name already exists.');
        }

        $documentType->update($validated);

        return redirect()->back()->with('success', 'Document type updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-document-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $documentType = DocumentType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$documentType) {
            return redirect()->back()->with('error', 'Document type not found.');
        }

        $existsCaseDocuments = CaseDocument::where('document_type_id', $id)->exists();
        if ($existsCaseDocuments) {
            return redirect()->back()->with('error', 'Cannot delete document type that has associated case documents.');
        }

        $existsClientDocuments = ClientDocument::where('document_type_id', $id)->exists();
        if ($existsClientDocuments) {
            return redirect()->back()->with('error', 'Cannot delete document type that has associated client documents.');
        }
        $documentType->delete();

        return redirect()->back()->with('success', 'Document type deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-document-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $documentType = DocumentType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$documentType) {
            return redirect()->back()->with('error', 'Document type not found.');
        }

        $documentType->status = $documentType->status === 'active' ? 'inactive' : 'active';
        $documentType->save();

        return redirect()->back()->with('success', 'Document type status updated successfully.');
    }
}
