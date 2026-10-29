<?php

namespace App\Http\Controllers;

use App\Events\NewClientCreated;
use App\Models\Client;
use App\Models\ClientType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-clients')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = Client::with(['clientType','user', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-clients')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-clients')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%')
                    ->orWhere('phone', 'like', '%' . $request->search . '%')
                    ->orWhere('client_id', 'like', '%' . $request->search . '%')
                    ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('client_type_id') && $request->client_type_id !== '_empty_') {
            $query->where('client_type_id', $request->client_type_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'inactive'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['client_id', 'name', 'created_at'];
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

        $clients = $query->paginate($perPage)->withQueryString();

        $clientTypeQuery = ClientType::where(function ($q) {
            if (Auth::user()->can('manage-any-client-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allClientTypes = (clone $clientTypeQuery)->get(['id', 'name']);
        $clientTypes = (clone $clientTypeQuery)->active()->get(['id', 'name']);

        // Get plan limits for clients (same pattern as UserController)
        $authUser = auth()->user();
        $companyUser = User::find(getCompanyId($authUser->id));
        $currentClients = Client::whereIn('created_by', getCompanyAndUsersId())->count();
        $planLimits = [
            'current_clients' => $currentClients,
            'max_clients' => $companyUser?->plan?->max_clients,
            'can_create' => $currentClients < $companyUser?->plan?->max_clients
        ];

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'clientTypes' => $clientTypes,
            'allClientTypes' => $allClientTypes,
            'planLimits' => $planLimits,
            'filters' => $request->only(['search', 'client_type_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-clients')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        // Check client limit (same pattern as UserController)
        $authUser = auth()->user();
        $companyUser = User::find(getCompanyId($authUser->id));
        $currentClients = Client::whereIn('created_by', getCompanyAndUsersId())->count();
        $maxClients = $companyUser->plan->max_clients;

        if ($currentClients >= $maxClients) {
            return redirect()->back()->with('error', __('Client limit exceeded. Your company plan allows maximum :max clients. Please contact your administrator.', ['max' => $maxClients]));
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'nullable|string|min:6',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'client_type_id' => 'required|exists:client_types,id',
            'status' => 'nullable|in:active,inactive',
            'company_name' => 'nullable|string|max:255',
            'tax_id' => 'nullable|string|max:50',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'date_of_birth' => 'nullable|date',
            'notes' => 'nullable|string',
            'referral_source' => 'nullable|string|max:255',
        ]);

        // Check if email already exists in Client or User table
        if (!empty($validated['email'])) {
            $emailExistsInClient = Client::where('email', $validated['email'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->exists();

            $emailExistsInUser = User::where('email', $validated['email'])
                ->exists();

            if ($emailExistsInClient || $emailExistsInUser) {
                return redirect()->back()->with('error', 'Email already exists.');
            }
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if client type belongs to the current user's company
        $clientType = ClientType::active()->where('id', $validated['client_type_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$clientType) {
            return redirect()->back()->withInput()->with('error', 'Invalid client type selected.');
        }

        try {
            // Create user account first
            $password = !empty($validated['password']) ? $validated['password'] : 'password';

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => \Illuminate\Support\Facades\Hash::make($password),
                'type' => 'client',
                'status' => 'active',
                'created_by' => auth()->id()
            ]);

            // Assign client role
            $clientRole = Role::where('name', 'client')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();
            if ($clientRole) {
                $user->assignRole($clientRole);
            }

            // Create client with user_id
            $validated['user_id'] = $user->id;
            $client = Client::create($validated);
        } catch (\Exception $e) {
            return redirect()->back()->withInput()->with('error', 'Failed to create client: ' . $e->getMessage());
        }

        // Trigger notifications
        if ($client && !IsDemo()) {
            event(new \App\Events\NewClientCreated($client, $request->all()));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');
        $twilioError = session()->pull('twilio_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('Slack send failed: ') . $slackError;
        }
        if ($twilioError) {
            $errors[] = __('SMS send failed: ') . $twilioError;
        }

        if (!empty($errors)) {
            $message = __('Client created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Client created successfully.');
    }

    public function update(Request $request, $clientId)
    {
        if (!Auth::user()->can('edit-clients')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $client = Client::where('id', $clientId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$client) {
            return redirect()->back()->with('error', 'Client not found.');
        }

        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'nullable|email|max:255',
                'phone' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'client_type_id' => 'required|exists:client_types,id',
                'status' => 'nullable|in:active,inactive',
                'company_name' => 'nullable|string|max:255',
                'tax_id' => 'nullable|string|max:50',
                'tax_rate' => 'nullable|numeric|min:0|max:100',
                'date_of_birth' => 'nullable|date',
                'notes' => 'nullable|string',
                'referral_source' => 'nullable|string|max:255',
            ]);

            // Check if client type belongs to the current user's company
            $clientType = ClientType::active()->where('id', $validated['client_type_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if (!$clientType) {
                return redirect()->back()->with('error', 'Invalid client type selected.');
            }

            // Check if email already exists in Client or User table (excluding current)
            if (!empty($validated['email'])) {
                $emailExistsInClient = Client::where('email', $validated['email'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $clientId)
                    ->exists();

                $emailExistsInUser = User::where('email', $validated['email'])
                    ->where('email', '!=', $client->email)
                    ->exists();

                if ($emailExistsInClient || $emailExistsInUser) {
                    return redirect()->back()->withInput()->with('error', 'Email already exists.');
                }
            }

            $client->update($validated);

            // Update associated user if exists
            if ($client->user_id) {
                $client->user->update([
                    'name' => $validated['name'],
                    'email' => $validated['email'] ?? $client->user->email,
                    'status' => $validated['status'] ?? $client->user->status,
                ]);
            }

            return redirect()->back()->with('success', 'Client updated successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->withInput()->with('error', 'Failed to update client: ' . $e->getMessage());
        }
    }

    public function show($clientId)
    {
        if (!Auth::user()->can('view-clients')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $client = Client::with(['clientType', 'creator', 'billingInfo'])
            ->where('id', $clientId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-clients')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-clients')) {
                    $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$client) {
            return redirect()->back()->with('error', 'Client not found.');
        }

        // Load currency name if billing info exists
        if ($client && $client->billingInfo && $client->billingInfo->currency) {
            $currency = \App\Models\ClientBillingCurrency::find($client->billingInfo->currency);
            $client->billingInfo->currency_name = $currency ? $currency->name : null;
            $client->billingInfo->currency_code = $currency ? $currency->code : null;
            $client->billingInfo->currency_symbol = $currency ? $currency->symbol : null;
        }

        $documents = \App\Models\ClientDocument::with('documentType')->where('client_id', $clientId)
            ->where(function ($q) {
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
            })->orderBy('created_at', 'desc')->get();

        return Inertia::render('clients/show', [
            'client' => $client,
            'documents' => $documents,
        ]);
    }

    public function destroy($clientId)
    {
        if (!Auth::user()->can('delete-clients')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $client = Client::where('id', $clientId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($client) {
            try {
                if ($client->user_id) {
                    User::where('id', $client->user_id)->delete();
                }
                $client->delete();
                return redirect()->back()->with('success', 'Client deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete client');
            }
        } else {
            return redirect()->back()->with('error', 'Client not found.');
        }
    }

    public function toggleStatus($clientId)
    {
        if (!Auth::user()->can('toggle-status-clients')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $client = Client::where('id', $clientId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($client) {
            try {
                $client->status = $client->status === 'active' ? 'inactive' : 'active';
                $client->save();

                // Update associated user status
                if ($client->user_id) {
                    $client->user->update(['status' => $client->status]);
                }

                return redirect()->back()->with('success', 'Client status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update client status');
            }
        } else {
            return redirect()->back()->with('error', 'Client not found.');
        }
    }

    public function resetPassword(Request $request, $clientId)
    {
        if (!Auth::user()->can('reset-client-password')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $request->validate([
            'password' => 'required|min:6|confirmed',
        ]);

        $client = Client::where('id', $clientId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$client) {
            return redirect()->back()->with('error', 'Client not found.');
        }

        if (empty($client->email)) {
            return redirect()->back()->with('error', 'Client does not have an email address.');
        }

        // Find the user account associated with this client
        $user = User::where('email', $client->email)
            ->where('type', 'client')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$user) {
            return redirect()->back()->with('error', 'No user account found for this client.');
        }

        try {
            $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
            $user->save();

            return redirect()->back()->with('success', 'Client password reset successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to reset client password');
        }
    }
}
