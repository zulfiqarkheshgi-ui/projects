<?php

namespace App\Http\Controllers;

use App\Models\CaseDocument;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CaseDocumentController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-case-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CaseDocument::query()
            ->with(['creator', 'case', 'documentType'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-case-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->whereIn('created_by', getCompanyAndUsersId());
                        });
                } elseif (Auth::user()->can('manage-own-case-documents')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->where('created_by', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        // Filter by case_id if provided
        if ($request->has('case_id') && !empty($request->case_id)) {
            $query->where('case_id', $request->case_id);
        }

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('document_name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('document_id', 'like', '%' . $request->search . '%');
            });
        }

        // Handle document type filter
        if ($request->has('document_type') && !empty($request->document_type) && $request->document_type !== 'all') {
            $query->where('document_type_id', $request->document_type);
        }

        // Handle confidentiality filter
        if ($request->has('confidentiality') && !empty($request->confidentiality) && $request->confidentiality !== 'all') {
            $query->where('confidentiality', $request->confidentiality);
        }

        // Handle status filter
        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Handle sorting
        // Handle sorting with validation

        $allowedSortFields = ['name', 'created_at', 'updated_at'];

        $sortField = $request->input('sort_field', 'created_at');

        $sortDirection = $request->input('sort_direction', 'desc');



        // Validate sort field

        if (!in_array($sortField, $allowedSortFields)) {

            $sortField = 'created_at';
        }



        // Validate sort direction

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';



        $query->orderBy($sortField, $sortDirection);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $caseDocuments = $query->paginate($perPage);
        $documentTypes = DocumentType::where(function ($q) {
            if (Auth::user()->can('manage-any-document-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('status', 'active')->get(['id', 'name', 'color']);

        return Inertia::render('advocate/case-documents/index', [
            'caseDocuments' => $caseDocuments,
            'documentTypes' => $documentTypes,
            'filters' => $request->all(['search', 'document_type', 'confidentiality', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-case-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'document_name' => 'required|string|max:255',
            'file' => 'required|string',
            'document_type_id' => 'required|exists:document_types,id',
            'description' => 'nullable|string',
            'confidentiality' => 'required|in:public,confidential,privileged',
            'document_date' => 'nullable|date',
            'case_id' => 'nullable|exists:cases,id',
            'status' => 'nullable|in:active,archived',
        ]);

        // Check for duplicate documents with same name and type for the same case
        $exists = CaseDocument::where('case_id', $validated['case_id'])
            ->where('document_name', $validated['document_name'])
            ->where('document_type_id', $validated['document_type_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'document_name' => 'A document with this name and type already exists for this case.'
            ])->withInput();
        }

        if (!empty($validated['file'])) {
            $validated['file'] = convertToRelativePath($validated['file']);
        }
        // Extract filename from URL
        // $fileUrl = $request->file;
        // $fileName = basename(parse_url($fileUrl, PHP_URL_PATH)) ?: 'document_' . time();

        CaseDocument::create(array_filter([
            'document_name' => $validated['document_name'],
            'document_type_id' => $validated['document_type_id'],
            'description' => $validated['description'] ?? null,
            'confidentiality' => $validated['confidentiality'],
            'document_date' => $validated['document_date'] ?? null,
            'case_id' => $validated['case_id'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'file_path' => $validated['file'],
            'created_by' => Auth::id(),
        ], fn($value) => $value !== null));

        return redirect()->back()->with('success', 'Case document created successfully.');
    }

    public function update(Request $request, $documentId)
    {
        if (!Auth::user()->can('edit-case-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $document = CaseDocument::where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-case-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->whereIn('created_by', getCompanyAndUsersId());
                        });
                } elseif (Auth::user()->can('manage-own-case-documents')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->where('created_by', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if ($document) {
            try {
                $validated = $request->validate([
                    'document_name' => 'required|string|max:255',
                    'file' => 'nullable|string',
                    'document_type_id' => 'required|exists:document_types,id',
                    'description' => 'nullable|string',
                    'confidentiality' => 'required|in:public,confidential,privileged',
                    'document_date' => 'nullable|date',
                    'case_id' => 'nullable|exists:cases,id',
                    'status' => 'nullable|in:active,archived',
                ]);

                // Check for duplicate documents with same name and type for the same case (excluding current)
                if (isset($validated['case_id'])) {
                    $exists = CaseDocument::where('case_id', $validated['case_id'])
                        ->where('document_name', $validated['document_name'])
                        ->where('document_type_id', $validated['document_type_id'])
                        ->where('id', '!=', $documentId)
                        ->whereIn('created_by', getCompanyAndUsersId())
                        ->exists();

                    if ($exists) {
                        return redirect()->back()->withErrors([
                            'document_name' => 'A document with this name and type already exists for this case.'
                        ])->withInput();
                    }
                }

                // Handle file replacement from media library
                if (!empty($validated['file'])) {
                    $validated['file_path'] = convertToRelativePath($validated['file']);
                    unset($validated['file']);
                }

                $document->update($validated);

                return redirect()->back()->with('success', 'Case document updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update case document');
            }
        } else {
            return redirect()->back()->with('error', 'Case document not found.');
        }
    }

    public function destroy($documentId)
    {
        if (!Auth::user()->can('delete-case-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $document = CaseDocument::where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-case-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->whereIn('created_by', getCompanyAndUsersId());
                        });
                } elseif (Auth::user()->can('manage-own-case-documents')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case', function ($caseQuery) {
                            $caseQuery->where('created_by', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document) {
            return redirect()->back()->with('error', 'Case document not found.');
        }

        $document->delete();
        return redirect()->back()->with('success', 'Case document deleted successfully');
    }

    public function download($documentId)
    {
        if (!Auth::user()->can('download-case-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $document = CaseDocument::whereHas('case', function ($q) {
            if (Auth::user()->can('manage-any-case-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-case-documents')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('id', $documentId)
            ->first();

        if (!$document || !$document->file_path) {
            return redirect()->back()->with(['error' => 'Document not found.']);
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
