<?php

namespace App\Http\Controllers;

use App\Events\NewCleRecordCreated;
use App\Models\CleTracking;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CleTrackingController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-cle-tracking')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CleTracking::with(['user', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-cle-tracking')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cle-tracking')) {
                $q->where('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        $stats = [
            'total'       => (clone $query)->count(),
            'completed'   => (clone $query)->where('status', 'completed')->count(),
            'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
            'expired'     => (clone $query)->where('status', 'expired')->count(),
            'total_credits' => (clone $query)->sum('credits_earned'),
        ];

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('course_name', 'like', '%' . $request->search . '%')
                    ->orWhere('provider', 'like', '%' . $request->search . '%')
                    ->orWhere('certificate_number', 'like', '%' . $request->search . '%')
                    ->orWhereHas('user', function ($userQuery) use ($request) {
                        $userQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('user_id') && $request->user_id !== '_empty_') {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        // Handle sorting with validation
        $allowedSortFields = ['course_name', 'provider', 'completion_date', 'created_at'];
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

        $cleRecords = $query->paginate($perPage)->withQueryString();

        $userQuery = User::where(function ($q) {
            if (Auth::user()->can('manage-any-users')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-users')) {
                $q->where('created_by', Auth::id())->orWhere('id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->whereDoesntHave('roles', function ($q) {
            $q->where('name', 'client');
        });
        $allUsers = (clone $userQuery)->get(['id', 'name']);
        $users = (clone $userQuery)->active()->get(['id', 'name']);

        return Inertia::render('compliance/professional-licenses/cle-tracking/index', [
            'cleRecords' => $cleRecords,
            'users'      => $users,
            'allUsers'   => $allUsers,
            'stats'      => $stats,
            'filters'    => $request->only(['search', 'user_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'course_name' => 'required|string|max:255',
            'provider' => 'required|string|max:255',
            'credits_earned' => 'required|numeric|min:0|max:999.99',
            'credits_required' => 'nullable|numeric|min:0|max:999.99',
            'completion_date' => 'required|date',
            'expiry_date' => 'nullable|date|after:completion_date',
            'certificate_number' => 'nullable|string|max:255',
            'certificate_file' => 'nullable|string',
            'status' => 'nullable|in:completed,in_progress,expired',
            'description' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'completed';

        if (!empty($validated['certificate_file'])) {
            $validated['certificate_file'] = convertToRelativePath($validated['certificate_file']);
        }
        // Check if user belongs to the current company or is the current user
        $user = User::active()->where('id', $validated['user_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-users')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-users')) {
                    $q->where('created_by', Auth::id())->orWhere('id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();

        if (!$user) {
            return redirect()->back()->with('error', 'Invalid user selected.');
        }

        $cleRecord = CleTracking::create($validated);

        // Trigger notifications
        if ($cleRecord && !IsDemo()) {
            event(new \App\Events\NewCleRecordCreated($cleRecord, $request->all()));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('SMS send failed: ') . $slackError;
        }

        if (!empty($errors)) {
            $message = __('CLE record created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'CLE record created successfully.');
    }
    public function update(Request $request, $id)
    {
        $cleRecord = CleTracking::where(function ($q) {
            if (Auth::user()->can('manage-any-cle-tracking')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cle-tracking')) {
                $q->where('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }})->findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'course_name' => 'required|string|max:255',
            'provider' => 'required|string|max:255',
            'credits_earned' => 'required|numeric|min:0|max:999.99',
            'credits_required' => 'nullable|numeric|min:0|max:999.99',
            'completion_date' => 'required|date',
            'expiry_date' => 'nullable|date|after:completion_date',
            'certificate_number' => 'nullable|string|max:255',
            'certificate_file' => 'nullable|string',
            'status' => 'nullable|in:completed,in_progress,expired',
            'description' => 'nullable|string',
        ]);

        // Check if user belongs to the current company or is the current user
        $user = User::active()->where('id', $validated['user_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-users')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-users')) {
                    $q->where('created_by', Auth::id())->orWhere('id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();

        if (!$user) {
            return redirect()->back()->with('error', 'Invalid user selected.');
        }

        if (!empty($validated['certificate_file'])) {
            $validated['certificate_file'] = convertToRelativePath($validated['certificate_file']);
        }

        $cleRecord->update($validated);

        return redirect()->back()->with('success', 'CLE record updated successfully.');
    }

    public function destroy($id)
    {
        $cleRecord = CleTracking::where(function ($q) {
            if (Auth::user()->can('manage-any-cle-tracking')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cle-tracking')) {
                $q->where('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }})->findOrFail($id);

        // Delete certificate file
        if ($cleRecord->certificate_file && Storage::disk('public')->exists(str_replace('/storage/', '', $cleRecord->certificate_file))) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $cleRecord->certificate_file));
        }

        $cleRecord->delete();

        return redirect()->back()->with('success', 'CLE record deleted successfully.');
    }

    public function download($id)
    {
        $cleRecord = CleTracking::where(function ($q) {
            if (Auth::user()->can('manage-any-cle-tracking')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cle-tracking')) {
                $q->where('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }})->findOrFail($id);

        if (!$cleRecord->certificate_file) {
            return redirect()->back()->with('error', 'Certificate file not found.');
        }

        $originalPath = $cleRecord->certificate_file;
        $originalFilename = basename($originalPath);

        // Handle full URLs (like DemoMedia files)
        if (str_starts_with($originalPath, 'http')) {
            $parsedUrl = parse_url($originalPath);
            if (isset($parsedUrl['path'])) {
                $publicPath = public_path(ltrim($parsedUrl['path'], '/'));
                if (file_exists($publicPath)) {
                    return response()->download($publicPath, $originalFilename);
                }
            }
        }

        // Handle /storage/ paths (Laravel storage)
        if (str_starts_with($originalPath, '/storage/')) {
            $storagePath = str_replace('/storage/', '', $originalPath);
            if (Storage::disk('public')->exists($storagePath)) {
                return response()->download(storage_path('app/public/' . $storagePath), $originalFilename);
            }
        }

        // Try as direct storage path
        if (Storage::disk('public')->exists($originalPath)) {
            return response()->download(storage_path('app/public/' . $originalPath), $originalFilename);
        }

        return redirect()->back()->with('error', 'Certificate file not found.');
    }
}
