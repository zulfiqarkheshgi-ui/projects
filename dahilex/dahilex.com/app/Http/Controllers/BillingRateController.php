<?php

namespace App\Http\Controllers;

use App\Models\BillingRate;
use App\Models\User;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BillingRateController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-billing-rates')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = BillingRate::with(['user', 'client', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-billing-rates')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-billing-rates')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('notes', 'like', '%' . $request->search . '%')
                    ->orWhereHas('user', function ($userQuery) use ($request) {
                        $userQuery->where('name', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereHas('client', function ($clientQuery) use ($request) {
                        $clientQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        // Handle user filter
        if ($request->has('user_id') && !empty($request->user_id) && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }

        // Handle client filter
        if ($request->has('client_id') && $request->client_id !== 'all') {
            if ($request->client_id === 'null') {
                $query->whereNull('client_id');
            } else {
                $query->where('client_id', $request->client_id);
            }
        }

        // Handle rate type filter
        if ($request->has('rate_type') && !empty($request->rate_type) && $request->rate_type !== 'all') {
            $query->where('rate_type', $request->rate_type);
        }

        // Handle status filter
        if ($request->has('status') && $request->status !== 'all') {
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
        
        $billingRates = $query->paginate($perPage);

        // Get users for filter dropdown
        $users = User::where(function($q) {
            if (Auth::user()->can('manage-any-users')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-users')) {
                $q->where('created_by', Auth::id())->orWhere('id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->whereDoesntHave('roles', function ($q) {
            $q->where('name', 'client');
        })->get(['id', 'name']);

        // Get clients for filter dropdown with their case team members
        $clients = Client::with(['cases.teamMembers.user:id,name'])
            ->where(function($q) {
                if (Auth::user()->can('manage-any-clients')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-clients')) {
                    $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->get(['id', 'name']);

        return Inertia::render('billing/billing-rates/index', [
            'billingRates' => $billingRates,
            'users' => $users,
            'clients' => $clients,
            'filters' => $request->all(['search', 'user_id', 'client_id', 'rate_type', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-billing-rates')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        
        $user = Auth::user();
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'client_id' => 'nullable|integer',
            'rate_type' => 'required|in:hourly,fixed,contingency',
            'hourly_rate' => 'nullable|numeric|min:0',
            'fixed_amount' => 'nullable|numeric|min:0',
            'contingency_percentage' => 'nullable|numeric|min:0|max:100',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after:effective_date',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        // Handle empty client_id (convert to null for default rate)
        if (empty($validated['client_id'])) {
            $validated['client_id'] = null;
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Verify user belongs to the current user's company
        $targetUser = User::where('id', $validated['user_id'])
            ->where(function($q) use ($user) {
                if ($user->hasRole(['superadmin'])) {
                    // Superadmin can assign to any user
                } elseif ($user->hasRole(['company'])) {
                    $q->where('created_by', $user->id);
                } elseif ($user->hasRole(['team_member']) || $user->type === 'team_member') {
                    $q->where('created_by', createdBy());
                } else {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                }
            })->first();

        if (!$targetUser) {
            return redirect()->back()->with('error', 'Invalid user selected.');
        }

        // Verify client belongs to the current user's company if provided
        if (!empty($validated['client_id'])) {
            $client = Client::where('id', $validated['client_id'])
                ->where(function($q) use ($user) {
                    if ($user->hasRole(['superadmin'])) {
                        // Superadmin can assign to any client
                    } elseif ($user->hasRole(['company'])) {
                        $q->where('created_by', $user->id);
                    } elseif ($user->hasRole(['team_member']) || $user->type === 'team_member') {
                        $q->where('created_by', createdBy());
                    } else {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    }
                })->first();

            if (!$client) {
                return redirect()->back()->with('error', 'Invalid client selected.');
            }
        }

        BillingRate::create($validated);

        return redirect()->back()->with('success', 'Billing rate created successfully.');
    }

    public function update(Request $request, $billingRateId)
    {
        if (!Auth::user()->can('edit-billing-rates')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $user = Auth::user();

        $billingRate = BillingRate::where(function ($q) use ($user) {
            if ($user->can('manage-any-billing-rates')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif ($user->can('manage-own-billing-rates')) {
                $q->where('created_by', $user->id);
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('id', $billingRateId)->first();

        if (!$billingRate) {
            return redirect()->back()->with('error', 'Billing rate not found.');
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'client_id' => 'nullable|integer',
            'rate_type' => 'required|in:hourly,fixed,contingency',
            'hourly_rate' => 'nullable|numeric|min:0',
            'fixed_amount' => 'nullable|numeric|min:0',
            'contingency_percentage' => 'nullable|numeric|min:0|max:100',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after:effective_date',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        // Handle empty client_id (convert to null for default rate)
        if (empty($validated['client_id'])) {
            $validated['client_id'] = null;
        }

        // Verify user belongs to the current user's company
        $targetUser = User::where('id', $validated['user_id'])
            ->where(function($q) use ($user) {
                if ($user->hasRole(['superadmin'])) {
                    // Superadmin can assign to any user
                } elseif ($user->hasRole(['company'])) {
                    $q->where('created_by', $user->id);
                } elseif ($user->hasRole(['team_member']) || $user->type === 'team_member') {
                    $q->where('created_by', createdBy());
                } else {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                }
            })->first();

        if (!$targetUser) {
            return redirect()->back()->with('error', 'Invalid user selected.');
        }

        // Verify client belongs to the current user's company if provided
        if (!empty($validated['client_id'])) {
            $client = Client::where('id', $validated['client_id'])
                ->where(function($q) use ($user) {
                    if ($user->hasRole(['superadmin'])) {
                        // Superadmin can assign to any client
                    } elseif ($user->hasRole(['company'])) {
                        $q->where('created_by', $user->id);
                    } elseif ($user->hasRole(['team_member']) || $user->type === 'team_member') {
                        $q->where('created_by', createdBy());
                    } else {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    }
                })->first();

            if (!$client) {
                return redirect()->back()->with('error', 'Invalid client selected.');
            }
        }

        $billingRate->update($validated);

        return redirect()->back()->with('success', 'Billing rate updated successfully.');
    }

    public function destroy($billingRateId)
    {
        if (!Auth::user()->can('delete-billing-rates')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $billingRate = BillingRate::where(function ($q) {
            if (Auth::user()->can('manage-any-billing-rates')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-billing-rates')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('id', $billingRateId)->first();

        if (!$billingRate) {
            return redirect()->back()->with('error', 'Billing rate not found.');
        }

        $billingRate->delete();

        return redirect()->back()->with('success', 'Billing rate deleted successfully.');
    }

    public function toggleStatus($billingRateId)
    {
        if (!Auth::user()->can('toggle-status-billing-rates')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $billingRate = BillingRate::where(function ($q) {
            if (Auth::user()->can('manage-any-billing-rates')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-billing-rates')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('id', $billingRateId)->first();

        if (!$billingRate) {
            return redirect()->back()->with('error', 'Billing rate not found.');
        }

        $billingRate->status = $billingRate->status === 'active' ? 'inactive' : 'active';
        $billingRate->save();

        return redirect()->back()->with('success', 'Billing rate status updated successfully.');
    }
}
