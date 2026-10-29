<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\LoginHistory;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-users')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $authUser = Auth::user();
        $authUserRole = $authUser->roles->first()?->name;

        $userQuery = User::with(['roles', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-users')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-users')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        # Admin
        if ($authUserRole === 'super admin') {
            $userQuery->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'super admin');
            });
        }

        // Exclude client users
        $userQuery->whereDoesntHave('roles', function ($q) {
            $q->where('name', 'client');
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $userQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Handle role filter
        if ($request->has('role') && $request->role !== 'all') {
            $userQuery->whereHas('roles', function ($q) use ($request) {
                $q->where('roles.id', $request->role);
            });
        }

        // Handle sorting with validation
        $allowedSortFields = ['name', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        // Validate sort field
        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        // Validate sort direction
        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $userQuery->orderBy($sortField, $sortDirection);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }
        $users = $userQuery->paginate($perPage)->withQueryString();

        $roles = Role::where('name','!=','client')->where(function ($q) {
            if (Auth::user()->can('manage-any-roles')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-roles')) {
                $q->where('created_by', Auth::id())
                    ->orWhereIn('created_by', User::where('created_by', Auth::id())->pluck('id'));
            } else {
                $q->whereRaw('1 = 0');
            }
        })->get();
        // if (Auth::user()->can('manage-any-roles')) {

        //     $roles = Role::whereIn('created_by', getCompanyAndUsersId())->get();
        // } elseif (Auth::user()->can('manage-own-roles')) {
        //     $roles = Role::where('created_by', Auth::id())->get();
        // } else {
        //     $roles = Role::whereRaw('1 = 0');

        // }

        // Get plan limits for company users and staff users
        $companyUser = User::find(getCompanyId($authUser->id));
        $currentUserCount = User::whereIn('created_by', getCompanyAndUsersId())
            ->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'client');
            })->count();
        $planLimits = [
            'current_users' => $currentUserCount,
            'max_users' => $companyUser?->plan?->max_users,
            'can_create' => $currentUserCount < $companyUser?->plan?->max_users
        ];

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'planLimits' => $planLimits,
            'filters' => $request->only(['search', 'role', 'sort_field', 'sort_direction', 'per_page', 'view', 'page'])
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request)
    {
        if (!Auth::user()->can('create-users')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        // Set user language same as creator (company)
        $authUser = Auth::user();
        $companySettings = settings();
        $userLang = isset($companySettings['defaultLanguage']) ? $companySettings['defaultLanguage'] : $authUser->lang;
        // Check plan limits for company users
        $companyUser = User::find(getCompanyId($authUser->id));

        $currentUserCount = User::whereIn('created_by', getCompanyAndUsersId())
            ->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'client');
            })->count();
        $maxUsers = $companyUser->plan->max_users;

        if ($currentUserCount >= $maxUsers) {
            return redirect()->back()->with('error', __('User limit exceeded. Your plan allows maximum :max users. Please upgrade your plan.', ['max' => $maxUsers]));
        }

        // Set created_by to actual creator's ID
        $created_by = auth()->id();

        $user = User::create([
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'created_by' => $created_by,
            'lang'       => $userLang ?? 'en',
        ]);

        if ($user && $request->roles) {
            $role = Role::where('id', $request->roles)
                ->whereIn('created_by', getCompanyAndUsersId())->first();

            if (!$role) {
                $user->delete();
                return redirect()->back()->with('error', __('Invalid role selected. Please try again!'));
            }

            $user->roles()->sync([$role->id]);
            $user->type = $role->name;
            $user->save();

            // Trigger team member created event if user is not a client
            if ($role->name !== 'client') {
                // Trigger notifications
                if ($user && !IsDemo()) {
                    event(new \App\Events\TeamMemberCreated($user, $request->all()));
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
                    $message = __('User created successfully, but ') . implode(', ', $errors);
                    return redirect()->route('users.index')->with('warning', $message);
                }
            }

            return redirect()->route('users.index')->with('success', __('User created with roles'));
        }
        return redirect()->back()->with('error', __('Unable to create User. Please try again!'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user)
    {
        if (!Auth::user()->can('edit-users')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if ($user) {
            $user->name  = $request->name;
            $user->email = $request->email;

            // find and syncing role
            if ($request->roles) {
                $role = Role::where('id', $request->roles)
                    ->where('name', '!=', 'client')->where(function ($q) {
                        if (Auth::user()->can('manage-any-roles')) {
                            $q->whereIn('created_by', getCompanyAndUsersId());
                        } elseif (Auth::user()->can('manage-own-roles')) {
                            $q->where('created_by', Auth::id())
                                ->orWhereIn('created_by', User::where('created_by', Auth::id())->pluck('id'));
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    })->first();

                $user->roles()->sync([$role->id]);
                $user->type = $role->name;
            }

            $user->save();
            return redirect()->route('users.index')->with('success', __('User updated with roles'));
        }
        return redirect()->back()->with('error', __('Unable to update User. Please try again!'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        if (!Auth::user()->can('delete-users')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        if ($user) {
            $user->delete();
            return redirect()->route('users.index')->with('success', __('User deleted with roles'));
        }
        return redirect()->back()->with('error', __('Unable to delete User. Please try again!'));
    }

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, User $user)
    {
        if (!Auth::user()->can('reset-password-users')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $request->validate([
            'password' => 'required|min:8|confirmed',
        ]);

        $user->password = Hash::make($request->password);
        $user->save();

        return redirect()->route('users.index')->with('success', __('Password reset successfully'));
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        // Load user with related data
        $user->load(['roles', 'creator']);

        // Get client data if user is a client
        $client = null;
        if ($user->type === 'client') {
            $client = \App\Models\Client::where('email', $user->email)->first();
        }

        // Get cases related to this user
        $cases = collect();
        if ($client) {
            $cases = \App\Models\CaseModel::where('client_id', $client->id)
                ->with(['caseStatus', 'caseType'])
                ->get();
        } elseif ($user->hasRole('team_member')) {
            $cases = \App\Models\CaseModel::whereHas('teamMembers', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })->with(['caseStatus', 'caseType'])->get();
        }

        return response()->json([
            'user' => array_merge($user->toArray(), [
                'client' => $client,
                'cases' => $cases
            ])
        ]);
    }
    public function loginhistory(Request $request, User $user = null)
    {
        if (Auth::user()->can('view-users-log-history')) {
            $query = LoginHistory::with('user:id,name,email,avatar,type')->where(function ($q) {
                if (Auth::user()->type == 'superadmin') {
                    $q->where('created_by', Auth::id())->orWhereHas('user', function ($u) {
                        $u->where('created_by', Auth::id());
                    });
                } else if (Auth::user()->can('manage-any-users')) {
                    $q->where('created_by', Auth::id())->orWhereHas('user', function ($u) {
                        $u->where('created_by', getCompanyAndUsersId());
                    });
                } elseif (Auth::user()->can('manage-own-users')) {
                    $q->where('created_by', getCompanyId(Auth::id()))->orWhereHas('user', function ($u) {
                        $u->where('created_by', Auth::id());
                    });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            // Search functionality
            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })->orWhere('ip', 'like', "%{$search}%");
            }

            // Sorting
            $sortField = $request->input('sort_field', 'id');
            $sortDirection = $request->input('sort_direction', 'desc');
            $allowedSorts = ['id', 'ip', 'date'];
            $allowedDirection = ['asc', 'desc'];
            if (!in_array($sortDirection, $allowedDirection)) {
                $sortDirection = 'desc';
            }
            if (in_array($sortField, $allowedSorts)) {
                $query->orderBy($sortField, $sortDirection);
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $loginHistory = $query->paginate((int)$perPage)->withQueryString();

            return Inertia::render('user-logs/index', [
                'loginHistory' => $loginHistory,
                'filters' => $request->only(['search', 'sort_field', 'sort_direction', 'per_page'])
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Toggle user status
     */
    public function toggleStatus(User $user)
    {
        if (!Auth::user()->can('toggle-status-users')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $user->status = $user->status === 'active' ? 'inactive' : 'active';
        $user->save();

        return redirect()->route('users.index')->with('success', __('User status updated successfully'));
    }

    /**
     * Delete login history record
     */
    public function destroyLoginHistory(LoginHistory $loginHistory)
    {
        // if (!Auth::user()->can('delete-users-log-history')) {
        //     return redirect()->back()->with('error', __('Permission Denied.'));
        // }

        $loginHistory->delete();
        return redirect()->back()->with('success', __('Login history deleted successfully.'));
    }

    // switchBusiness method removed
}
