<?php

namespace App\Http\Controllers;
use App\Models\Document;
use App\Models\DocumentComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DocumentCommentController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-document-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = DocumentComment::with(['document', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-document-comments')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-document-comments')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle document filter
        if ($request->filled('document_id') && $request->document_id !== '_empty_') {
            $query->where('document_id', $request->document_id);
        }

        // Handle search functionality
        if ($request->has('search') && !empty($request->search)) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('comment_text', 'like', '%' . $searchTerm . '%')
                    ->orWhereHas('document', function ($docQuery) use ($searchTerm) {
                        $docQuery->where('name', 'like', '%' . $searchTerm . '%');
                    })
                    ->orWhereHas('creator', function ($userQuery) use ($searchTerm) {
                        $userQuery->where('name', 'like', '%' . $searchTerm . '%');
                    });
            });
        }

        // Handle status filter
        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('is_resolved', $request->status === 'resolved');
        }

        // Handle sorting with validation
        $allowedSortFields = ['comment_text', 'is_resolved', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy($sortField, $sortDirection);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $comments = $query->paginate($perPage)->withQueryString();

        $documents = Document::where(function($q) {
            if (Auth::user()->can('manage-any-documents')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-documents')) {
                $q->where('created_by', Auth::id());
            }
        })->get(['id', 'name']);

        return Inertia::render('document-management/comments/index', [
            'comments' => $comments,
            'documents' => $documents,
            'filters' => $request->only(['search', 'document_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-document-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'document_id' => 'required|exists:documents,id',
            'comment_text' => 'required|string',
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

        $validated['created_by'] = Auth::id();

        DocumentComment::create($validated);

        return redirect()->back()->with('success', 'Comment added successfully.');
    }

    public function update(Request $request, $commentId)
    {
        if (!Auth::user()->can('edit-document-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $commentQuery = DocumentComment::where('id', $commentId);
        if (Auth::user()->can('manage-any-document-comments')) {
            $commentQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-document-comments')) {
            $commentQuery->where('created_by', Auth::id());
        }
        $comment = $commentQuery->first();

        if (!$comment) {
            return redirect()->back()->with('error', 'Comment not found.');
        }

        $validated = $request->validate([
            'comment_text' => 'required|string',
        ]);

        $comment->update($validated);

        return redirect()->back()->with('success', 'Comment updated successfully.');
    }

    public function destroy($commentId)
    {
        if (!Auth::user()->can('delete-document-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $commentQuery = DocumentComment::where('id', $commentId);
        if (Auth::user()->can('manage-any-document-comments')) {
            $commentQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-document-comments')) {
            $commentQuery->where('created_by', Auth::id());
        }
        $comment = $commentQuery->first();

        if (!$comment) {
            return redirect()->back()->with('error', 'Comment not found.');
        }

        $comment->delete();

        return redirect()->back()->with('success', 'Comment deleted successfully.');
    }

    public function toggleResolve($commentId)
    {
        if (!Auth::user()->can('resolve-document-comments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $commentQuery = DocumentComment::where('id', $commentId);
        if (Auth::user()->can('manage-any-document-comments')) {
            $commentQuery->whereIn('created_by', getCompanyAndUsersId());
        } elseif (Auth::user()->can('manage-own-document-comments')) {
            $commentQuery->where('created_by', Auth::id());
        }
        $comment = $commentQuery->first();

        if (!$comment) {
            return redirect()->back()->with('error', 'Comment not found.');
        }

        $comment->is_resolved = !$comment->is_resolved;
        $comment->save();

        return redirect()->back()->with('success', 'Comment status updated successfully.');
    }
}
