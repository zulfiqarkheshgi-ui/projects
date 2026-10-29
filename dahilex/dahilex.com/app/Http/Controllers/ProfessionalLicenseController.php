<?php

namespace App\Http\Controllers;

use App\Events\NewLicenseCreated;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProfessionalLicenseController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-professional-licenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        ProfessionalLicense::whereIn('user_id', getCompanyAndUsersId())
            ->where('status', '!=', 'expired')
            ->whereDate('expiry_date', '<', today())
            ->update(['status' => 'expired']);

        $query = ProfessionalLicense::with(['user', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-professional-licenses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-professional-licenses')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        $stats = (clone $query)
            ->select('status')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $stats['total'] = (clone $query)->count();

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('license_type', 'like', '%' . $request->search . '%')
                    ->orWhere('license_number', 'like', '%' . $request->search . '%')
                    ->orWhere('issuing_authority', 'like', '%' . $request->search . '%')
                    ->orWhereHas('user', function ($userQuery) use ($request) {
                        $userQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->has('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Handle sorting with validation
        $sortDirection = $request->input('sort_direction', 'desc');

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy('created_at', $sortDirection);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 9);

        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 90) {
            $perPage = 9;
        }

        $licenses = $query->paginate($perPage)->withQueryString();

        $userQuery = User::where(function ($q) {
            if (Auth::user()->can('manage-any-users')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-users')) {
                $q->where('created_by', Auth::id())->orWhere('id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'client');
            });
        $allUsers = (clone $userQuery)->get(['id', 'name']);
        $users = (clone $userQuery)->active()->get(['id', 'name']);

        return Inertia::render('compliance/professional-licenses/licenses', [
            'licenses' => $licenses,
            'stats' => $stats,
            'users' => $users,
            'allUsers' => $allUsers,
            'filters' => $request->only(['search', 'user_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-professional-licenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'license_type' => 'required|string|max:255',
            'license_number' => 'required|string|max:255|unique:professional_licenses',
            'issuing_authority' => 'required|string|max:255',
            'jurisdiction' => 'required|string|max:255',
            'issue_date' => 'required|date',
            'expiry_date' => 'required|date|after:issue_date',
            'status' => 'nullable|in:active,suspended,revoked',
            'notes' => 'nullable|string',
        ]);

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

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $license = ProfessionalLicense::create($validated);

        // Trigger notifications
        if ($license && !IsDemo()) {
            event(new \App\Events\NewLicenseCreated($license, $request->all()));
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
            $message = __('Professional license created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Professional license created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-professional-licenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $license = ProfessionalLicense::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-professional-licenses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-professional-licenses')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$license) {
            return redirect()->back()->with('error', 'Professional license not found.');
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'license_type' => 'required|string|max:255',
            'license_number' => 'required|string|max:255|unique:professional_licenses,license_number,' . $id,
            'issuing_authority' => 'required|string|max:255',
            'jurisdiction' => 'required|string|max:255',
            'issue_date' => 'required|date',
            'expiry_date' => 'required|date|after:issue_date',
            'status' => 'nullable|in:active,suspended,revoked',
            'notes' => 'nullable|string',
        ]);

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

        if ($validated['status'] === 'expired' && $validated['expiry_date'] < today()) {
            $validated['status'] = 'active';
        }

        $license->update($validated);

        return redirect()->back()->with('success', 'Professional license updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-professional-licenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $license = ProfessionalLicense::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-professional-licenses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-professional-licenses')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$license) {
            return redirect()->back()->with('error', 'Professional license not found.');
        }
        $license->delete();

        return redirect()->back()->with('success', 'Professional license deleted successfully.');
    }

    public function toggleStatus(Request $request, $id)
    {
        if (!Auth::user()->can('toggle-status-professional-licenses')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $license = ProfessionalLicense::where('id', $id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-professional-licenses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-professional-licenses')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$license) {
            return redirect()->back()->with('error', 'Professional license not found.');
        }

        $validated = $request->validate([
            'status' => 'required|in:active,suspended,revoked'
        ]);

        $license->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'License status updated successfully.');
    }
}
