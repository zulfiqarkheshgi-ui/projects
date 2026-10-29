<?php

namespace App\Http\Controllers;
use App\Models\Document;
use App\Models\DocumentVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class DocumentVersionController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-document-versions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = DocumentVersion::with(['document', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-document-versions')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-versions')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->filled('document_id') && $request->document_id !== '_empty_') {
            $query->where('document_id', $request->document_id);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('version_number', 'like', '%' . $request->search . '%')
                    ->orWhere('changes_description', 'like', '%' . $request->search . '%')
                    ->orWhereHas('document', function ($docQuery) use ($request) {
                        $docQuery->where('name', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereHas('creator', function ($creatorQuery) use ($request) {
                        $creatorQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        $allowedSortFields = ['version_number', 'created_at', 'changes_description'];
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

        $versions = $query->paginate($perPage)->withQueryString();

        $documents = Document::where(function($q) {
            if (Auth::user()->can('manage-any-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-documents')) {
                $q->where('created_by', Auth::id());
            }
        })->get(['id', 'name']);

        return Inertia::render('document-management/versions/index', [
            'versions' => $versions,
            'documents' => $documents,
            'filters' => $request->only(['search', 'document_id', 'per_page', 'sort_field', 'sort_direction', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-document-versions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'document_id' => 'required|exists:documents,id',
            'file' => 'required|string',
            'changes_description' => 'nullable|string',
        ]);

        $documentQuery = Document::where('id', $validated['document_id']);
        if (Auth::user()->can('manage-any-documents')) {
            $documentQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-documents')) {
            $documentQuery->where('created_by', Auth::id());
        }
        $document = $documentQuery->first();

        if (!$document) {
            return redirect()->back()->with('error', 'Document not found.');
        }

        // Convert file path to relative path
        $validated['file_path'] = $validated['file'];
        if (!empty($validated['file_path'])) {
            $validated['file_path'] = convertToRelativePath($validated['file_path']);
        }
        unset($validated['file']);

        DB::transaction(function () use ($validated, $document, $request) {
            // Mark current version as not current
            DocumentVersion::where('document_id', $document->id)
                ->update(['is_current' => false]);

            // Get next version number
            $lastVersion = DocumentVersion::where('document_id', $document->id)
                ->orderBy('version_number', 'desc')
                ->first();

            $versionParts = explode('.', $lastVersion ? $lastVersion->version_number : '1.-1');
            if($versionParts[1] == '9'){
                $versionParts[1] = '-1';
                (int)$versionParts[0]++;
            }
            $newVersion = $versionParts[0] . '.' . ((int)$versionParts[1] + 1);

            // Create new version
            DocumentVersion::create([
                'document_id' => $document->id,
                'version_number' => $newVersion,
                'file_path' => $validated['file_path'],
                'changes_description' => $validated['changes_description'] ?? null,
                'is_current' => true,
                'created_by' => Auth::id(),
            ]);

            // Update document with new version info
            $document->update([
                'file_path' => $validated['file_path'],
            ]);
        });

        return redirect()->back()->with('success', 'New version created successfully.');
    }

    public function destroy($versionId)
    {
        if (!Auth::user()->can('delete-document-versions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $version = DocumentVersion::where('id', $versionId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-versions')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-versions')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$version) {
            return redirect()->back()->with('error', 'Version not found.');
        }

        if ($version->is_current) {
            return redirect()->back()->with('error', 'Cannot delete current version.');
        }

        $version->delete();

        return redirect()->back()->with('success', 'Version deleted successfully.');
    }

    public function download($versionId)
    {
        if (!Auth::user()->can('download-document-versions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $document = DocumentVersion::where('id', $versionId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-versions')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-versions')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$document || !$document->file_path) {
            return redirect()->back()->with('error', 'Version not found.');
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

    public function restore($versionId)
    {
        if (!Auth::user()->can('restore-document-versions')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $version = DocumentVersion::where('id', $versionId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-document-versions')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-document-versions')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$version) {
            return redirect()->back()->with('error', 'Version not found.');
        }

        DB::transaction(function () use ($version) {
            // Mark all versions as not current
            DocumentVersion::where('document_id', $version->document_id)
                ->update(['is_current' => false]);

            // Mark this version as current
            $version->update(['is_current' => true]);

            // Update document with this version's info
            $version->document->update([
                'file_path' => $version->getRawOriginal('file_path'),
            ]);
        });

        return redirect()->back()->with('success', 'Version restored successfully.');
    }
}
