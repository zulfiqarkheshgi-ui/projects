<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientDocument;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ClientDocumentController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-client-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ClientDocument::with(['client', 'client.user', 'creator', 'documentType'])->where(function ($q) {
            if (Auth::user()->can('manage-any-client-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-documents')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('client', function ($clientQuery) {
                        $clientQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('document_name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhereHas('client', function ($clientQuery) use ($request) {
                        $clientQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('client_id') && $request->client_id !== '_empty_') {
            $query->where('client_id', $request->client_id);
        }

        if ($request->filled('document_type_id') && $request->document_type_id !== '_empty_') {
            $query->where('document_type_id', $request->document_type_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'archived'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['document_name', 'created_at'];
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

        $documents = $query->paginate($perPage)->withQueryString();

        $clientQuery = Client::where(function ($q) {
            if (Auth::user()->can('manage-any-clients')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-clients')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allClients = (clone $clientQuery)->get(['id', 'name']);
        $clients = (clone $clientQuery)->active()->get(['id', 'name']);

        $documentTypeQuery = DocumentType::where(function ($q) {
            if (Auth::user()->can('manage-any-document-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allDocumentTypes = (clone $documentTypeQuery)->get(['id', 'name', 'color']);
        $documentTypes = (clone $documentTypeQuery)->active()->get(['id', 'name', 'color']);

        return Inertia::render('clients/documents/index', [
            'documents' => $documents,
            'clients' => $clients,
            'allClients' => $allClients,
            'documentTypes' => $documentTypes,
            'allDocumentTypes' => $allDocumentTypes,
            'filters' => $request->only(['search', 'client_id', 'document_type_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-client-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'document_name' => 'required|string|max:255',
            'file' => 'required|string',
            'document_type_id' => 'required|exists:document_types,id',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,archived',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['file_path'] = $validated['file'];

        if (!empty($validated['file_path'])) {
            $validated['file_path'] = convertToRelativePath($validated['file_path']);
        }
        unset($validated['file']);

        // Check if client belongs to the current user's company
        $client = Client::active()->where('id', $validated['client_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$client) {
            return redirect()->back()->with('error', 'Invalid client selected.');
        }

        // Check if document type belongs to the current user's company
        $documentType = DocumentType::active()->where('id', $validated['document_type_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$documentType) {
            return redirect()->back()->with('error', 'Invalid document type selected.');
        }

        ClientDocument::create($validated);

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    public function update(Request $request, $documentId)
    {
        if (!Auth::user()->can('edit-client-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $document = ClientDocument::whereHas('client', function ($q) {
            if (Auth::user()->can('manage-any-client-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-documents')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('id', $documentId)
            ->first();

        if ($document) {
            try {
                $validated = $request->validate([
                    'client_id' => 'required|exists:clients,id',
                    'document_name' => 'required|string|max:255',
                    'file' => 'nullable|string',
                    'document_type_id' => 'required|exists:document_types,id',
                    'description' => 'nullable|string',
                    'status' => 'nullable|in:active,archived',
                ]);

                // Check if client belongs to the current user's company
                $client = Client::active()->where('id', $validated['client_id'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->first();

                if (!$client) {
                    return redirect()->back()->with('error', 'Invalid client selected.');
                }

                // Check if document type belongs to the current user's company
                $documentType = DocumentType::active()->where('id', $validated['document_type_id'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->first();

                if (!$documentType) {
                    return redirect()->back()->with('error', 'Invalid document type selected.');
                }

                $validated['file_path'] = $validated['file'];

                if (!empty($validated['file_path'])) {
                    $validated['file_path'] = convertToRelativePath($validated['file_path']);
                }
                unset($validated['file']);

                $document->update($validated);

                return redirect()->back()->with('success', 'Document updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update document');
            }
        } else {
            return redirect()->back()->with('error', 'Document not found.');
        }
    }

    public function destroy($documentId)
    {
        if (!Auth::user()->can('delete-client-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $document = ClientDocument::whereHas('client', function ($q) {
            if (Auth::user()->can('manage-any-client-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-documents')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('id', $documentId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', 'Document not found.');
        }

        $document->delete();
        return redirect()->back()->with('success', 'Document deleted successfully');
    }

    public function download($documentId)
    {
        $document = ClientDocument::whereHas('client', function ($q) {
            if (Auth::user()->can('manage-any-client-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-documents')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('id', $documentId)
            ->first();

        if (!$document || !$document->file_path) {
            return redirect()->back()->with('error', 'Document not found.');
        }

        $originalPath = $document->file_path;

        if (!str_starts_with($originalPath, "http")) {
            if (check_file($originalPath)) {
                $originalPath = get_file($originalPath);
            } else {
                return redirect()->back()->with(['error' => 'Document not found.']);
            }
        }

        $originalFilename = basename($originalPath);
        $response = Http::get($originalPath);

        return response()->streamDownload(function () use ($response) {
            echo $response->body();
        }, $originalFilename);
    }
}
