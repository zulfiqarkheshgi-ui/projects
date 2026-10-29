<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentCategory;
use App\Models\DocumentVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{

    public function show($documentId, Request $request)
    {
        if (!Auth::user()->can('view-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $document = Document::with(['category', 'creator'])
            ->where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-documents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document) {
            return redirect()->route('document-management.versions.index')
                ->with('error', 'Document not found.');
        }

        $versions = DocumentVersion::with(['creator'])
            ->where('document_id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-versions')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-versions')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderBy('version_number', 'desc')
            ->get();

        $currentVersion = $versions->firstWhere('is_current', true);

        $categoryQuery = \App\Models\DocumentCategory::where(function ($q) {
            if (Auth::user()->can('manage-any-document-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-categories')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        $categories = (clone $categoryQuery)->active()->get(['id', 'name']);

        return Inertia::render('document-management/documents/show', [
            'document'       => $document,
            'versions'       => $versions,
            'currentVersion' => $currentVersion,
            'categories'     => $categories,
        ]);
    }

    public function gallery(Request $request)
    {
        if (!Auth::user()->can('manage-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = Document::with(['category', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-documents')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhereHas('category', function ($cq) use ($request) {
                        $cq->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('category_id') && $request->category_id !== '_empty_') {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['draft', 'review', 'final', 'archived'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('confidentiality') && $request->confidentiality !== '_empty_') {
            $allowedLevels = ['public', 'internal', 'confidential', 'restricted'];
            if (in_array($request->confidentiality, $allowedLevels)) {
                $query->where('confidentiality', $request->confidentiality);
            }
        }

        $allowedSortFields = ['name', 'created_at'];
        $sortField = in_array($request->input('sort_field'), $allowedSortFields)
            ? $request->input('sort_field') : 'created_at';
        $sortDirection = in_array($request->input('sort_direction'), ['asc', 'desc'])
            ? $request->input('sort_direction') : 'desc';

        $query->orderBy($sortField, $sortDirection);

        $documents = $query->paginate(24)->withQueryString();

        $categoryQuery = DocumentCategory::where(function ($q) {
            if (Auth::user()->can('manage-any-document-categories')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-categories')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allCategories = (clone $categoryQuery)->get(['id', 'name']);
        $categories    = (clone $categoryQuery)->active()->get(['id', 'name']);

        return Inertia::render('document-management/documents/gallery', [
            'documents'     => $documents,
            'categories'    => $categories,
            'allCategories' => $allCategories,
            'filters'       => $request->only(['search', 'category_id', 'status', 'confidentiality', 'sort_field', 'sort_direction', 'page']),
        ]);
    }



    public function version($versionId)
    {
        $version = DocumentVersion::with(['document.category', 'creator'])
            ->where('id', $versionId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-versions')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-versions')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->firstOrFail();

        return Inertia::render('document-management/documents/version', [
            'version' => $version,
        ]);
    }

    // public function index(Request $request)
    // {
    //     if (!Auth::user()->can('manage-documents')) {
    //         return redirect()->back()->with('error', __('Permission Denied.'));
    //     }

    //     $query = Document::with(['category', 'creator'])->where(function ($q) {
    //         if (Auth::user()->can('manage-any-documents')) {
    //             $q->whereIn('created_by', getCompanyAndUsersId());
    //         } elseif (Auth::user()->can('manage-own-documents')) {
    //             $q->where('created_by', Auth::id());
    //         } else {
    //             $q->whereRaw('1 = 0');
    //         }
    //     });

    //     if ($request->has('search') && !empty($request->search)) {
    //         $query->where(function ($q) use ($request) {
    //             $q->where('name', 'like', '%' . $request->search . '%')
    //                 ->orWhere('description', 'like', '%' . $request->search . '%')
    //                 ->orWhereHas('category', function ($categoryQuery) use ($request) {
    //                     $categoryQuery->where('name', 'like', '%' . $request->search . '%');
    //                 });
    //         });
    //     }

    //     if ($request->filled('category_id') && $request->category_id !== '_empty_') {
    //         $query->where('category_id', $request->category_id);
    //     }

    //     if ($request->filled('status') && $request->status !== '_empty_') {
    //         $allowedStatuses = ['draft', 'review', 'final', 'archived'];
    //         if (in_array($request->status, $allowedStatuses)) {
    //             $query->where('status', $request->status);
    //         }
    //     }

    //     if ($request->filled('confidentiality') && $request->confidentiality !== '_empty_') {
    //         $allowedLevels = ['public', 'internal', 'confidential', 'restricted'];
    //         if (in_array($request->confidentiality, $allowedLevels)) {
    //             $query->where('confidentiality', $request->confidentiality);
    //         }
    //     }

    //     $allowedSortFields = ['name', 'created_at'];
    //     $sortField = $request->input('sort_field', 'created_at');
    //     $sortDirection = $request->input('sort_direction', 'desc');

    //     if (!in_array($sortField, $allowedSortFields)) {
    //         $sortField = 'created_at';
    //     }

    //     $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

    //     $query->orderBy($sortField, $sortDirection);

    //     $perPage = $request->input('per_page', 10);
    //     if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
    //         $perPage = 10;
    //     }

    //     $documents = $query->paginate($perPage)->withQueryString();

    //     $categoryQuery = DocumentCategory::where(function ($q) {
    //         if (Auth::user()->can('manage-any-document-categories')) {
    //             $q->whereIn('created_by', getCompanyAndUsersId());
    //         } elseif (Auth::user()->can('manage-own-document-categories')) {
    //             $q->where('created_by', Auth::id());
    //         } else {
    //             $q->whereRaw('1 = 0');
    //         }
    //     });
    //     $allCategories = (clone $categoryQuery)->get(['id', 'name']);
    //     $categories = (clone $categoryQuery)->active()->get(['id', 'name']);

    //     return Inertia::render('document-management/documents/index', [
    //         'documents' => $documents,
    //         'categories' => $categories,
    //         'allCategories' => $allCategories,
    //         'filters' => $request->only(['search', 'category_id', 'status', 'confidentiality', 'sort_field', 'sort_direction', 'per_page', 'page']),
    //     ]);
    // }

    public function comments(Request $request, $documentId)
    {
        $document = Document::with(['category', 'creator'])
            ->where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-documents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document) {
            return redirect()->route('document-management.documents.index')
                ->with('error', 'Document not found.');
        }

        $latestVersion = \App\Models\DocumentVersion::where('document_id', $documentId)
            ->orderBy('version_number', 'desc')
            ->first();

        // Get document comments (read-only)
        $comments = \App\Models\DocumentComment::with(['creator'])
            ->where('document_id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-comments')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-comments')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Get document permissions (read-only)
        $permissions = \App\Models\DocumentPermission::with(['user', 'creator'])
            ->where('document_id', $documentId)
            ->active()
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('document-management/documents/comments', [
            'document' => $document,
            'latestVersion' => $latestVersion,
            'comments' => $comments,
            'permissions' => $permissions,
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:document_categories,id',
            'file' => 'required|string',
            'status' => 'nullable|in:draft,review,final,archived',
            'confidentiality' => 'nullable|in:public,internal,confidential,restricted',
            'tags' => 'nullable|array',
        ]);

        $categoryQuery = DocumentCategory::active()->where('id', $validated['category_id']);
        if (Auth::user()->can('manage-any-document-categories')) {
            $categoryQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-document-categories')) {
            $categoryQuery->where('created_by', Auth::id());
        }
        $category = $categoryQuery->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Invalid category selection.');
        }

        // Check if document with same name and category already exists for this company
        $exists = Document::where('name', $validated['name'])
            ->where('category_id', $validated['category_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'A document with this name and category already exists.');
        }

        $validated['file_path'] = $validated['file'];
        if (!empty($validated['file_path'])) {
            $validated['file_path'] = convertToRelativePath($validated['file_path']);
        }
        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'draft';
        $validated['confidentiality'] = $validated['confidentiality'] ?? 'internal';
        unset($validated['file']);

        DB::transaction(function () use ($validated) {
            $document = Document::create($validated);
            // Create new version
            DocumentVersion::create([
                'document_id' => $document->id,
                'version_number' => '1.0',
                'file_path' => $validated['file_path'],
                'changes_description' => $document->description,
                'is_current' => true,
                'created_by' => Auth::id(),
            ]);
        });

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    public function update(Request $request, $documentId)
    {
        if (!Auth::user()->can('edit-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $document = Document::where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-documents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document) {
            return redirect()->back()->with('error', 'Document not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:document_categories,id',
            'status' => 'nullable|in:draft,review,final,archived',
            'confidentiality' => 'nullable|in:public,internal,confidential,restricted',
            'tags' => 'nullable|array',
        ]);

        $categoryQuery = DocumentCategory::active()->where('id', $validated['category_id']);
        if (Auth::user()->can('manage-any-document-categories')) {
            $categoryQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-document-categories')) {
            $categoryQuery->where('created_by', Auth::id());
        }
        $category = $categoryQuery->first();

        if (!$category) {
            return redirect()->back()->with('error', 'Invalid category selection.');
        }

        // Check if document with same name and category already exists for this company (excluding current)
        $exists = Document::where('name', $validated['name'])
            ->where('category_id', $validated['category_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $documentId)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'A document with this name and category already exists.');
        }

        $document->update($validated);

        return redirect()->back()->with('success', 'Document updated successfully.');
    }

    public function destroy($documentId)
    {
        if (!Auth::user()->can('delete-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $document = Document::where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-documents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document) {
            return redirect()->back()->with('error', 'Document not found.');
        }

        $document->delete();

        return redirect()->back()->with('success', 'Document deleted successfully.');
    }

    public function toggleStatus(Request $request, $documentId)
    {
        if (!Auth::user()->can('toggle-status-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $document = Document::where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-documents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document) {
            return redirect()->back()->with('error', 'Document not found.');
        }

        $validated = $request->validate([
            'status' => 'required|in:draft,review,final,archived',
        ]);

        $document->update($validated);

        return redirect()->back()->with('success', 'Document status updated successfully.');
    }

    public function download($documentId)
    {
        if (!Auth::user()->can('download-documents')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $document = Document::where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-documents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

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

    public function apiDownload($documentId)
    {
        if (!Auth::user()->can('download-documents')) {
            return response()->json(['error' => 'Permission Denied'], 403);
        }

        $document = Document::where('id', $documentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-documents')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-documents')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document || !$document->file_path) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $originalPath = $document->file_path;

        if (!str_starts_with($originalPath, "http")) {
            if (check_file($originalPath)) {
                $originalPath = get_file($originalPath);
            } else {
                return response()->json(['error' => 'Document not found'], 404);
            }
        }

        $originalFilename = basename($originalPath);
        $response = Http::get($originalPath);

        return response()->streamDownload(function () use ($response) {
            echo $response->body();
        }, $originalFilename);
    }
}
