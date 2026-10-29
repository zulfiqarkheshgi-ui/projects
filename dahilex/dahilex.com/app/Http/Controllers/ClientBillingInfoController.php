<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientBillingInfo;
use App\Models\ClientBillingCurrency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ClientBillingInfoController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-client-billing')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ClientBillingInfo::with(['client', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-client-billing')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-billing')) {
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
                $q->where('billing_contact_name', 'like', '%' . $request->search . '%')
                    ->orWhere('billing_contact_email', 'like', '%' . $request->search . '%')
                    ->orWhereHas('client', function ($clientQuery) use ($request) {
                        $clientQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        // Handle client filter
        if ($request->has('client_id') && !empty($request->client_id) && $request->client_id !== 'all') {
            $query->where('client_id', $request->client_id);
        }

        // Handle payment terms filter
        if ($request->has('payment_terms') && !empty($request->payment_terms) && $request->payment_terms !== 'all') {
            $query->where('payment_terms', $request->payment_terms);
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
        
        $billingInfo = $query->paginate($perPage);

        // Get clients for filter dropdown
        $clients = Client::where(function ($q) {
            if (Auth::user()->can('manage-any-clients')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-clients')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('status', 'active')->get(['id', 'name']);

        $currencies = ClientBillingCurrency::where(function ($q) {
            if (Auth::user()->can('manage-any-client-billing-currencies')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-billing-currencies')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->where('status', true)->orderBy('name')->get(['id', 'name', 'code', 'symbol', 'is_default']);

        return Inertia::render('clients/billing/index', [
            'billingInfo' => $billingInfo,
            'clients' => $clients,
            'currencies' => $currencies,
            'filters' => $request->all(['search', 'client_id', 'payment_terms', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-client-billing')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id|unique:client_billing_infos,client_id',
            'billing_address' => 'nullable|string',
            'billing_contact_name' => 'nullable|string|max:255',
            'billing_contact_email' => 'nullable|email|max:255',
            'billing_contact_phone' => 'nullable|string|max:20',
            'payment_terms' => 'required|in:net_15,net_30,net_45,net_60,due_on_receipt,custom',
            'custom_payment_terms' => 'nullable|string|max:255',
            'currency' => 'nullable',
            'billing_notes' => 'nullable|string',
            'status' => 'nullable|in:active,suspended,closed',
        ]);

        // Validate currency separately
        if (!empty($validated['currency'])) {
            $currencyExists = ClientBillingCurrency::where('id', $validated['currency'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->where('status', true)
                ->exists();

            if (!$currencyExists) {
                return redirect()->back()->withInput()->with('error', 'Invalid currency selected.');
            }
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if client belongs to the current user's company
        $client = Client::where('id', $validated['client_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$client) {
            return redirect()->back()->with('error', 'Invalid client selected.');
        }

        ClientBillingInfo::create($validated);

        return redirect()->back()->with('success', 'Billing information created successfully.');
    }

    public function update(Request $request, $billingId)
    {
        if (!Auth::user()->can('edit-client-billing')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $billing = ClientBillingInfo::whereHas('client', function ($q) {
            if (Auth::user()->can('manage-any-client-billing')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-billing')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('id', $billingId)
            ->first();

        if ($billing) {
            try {
                $validated = $request->validate([
                    'client_id' => 'required|exists:clients,id|unique:client_billing_infos,client_id,' . $billingId,
                    'billing_address' => 'nullable|string',
                    'billing_contact_name' => 'nullable|string|max:255',
                    'billing_contact_email' => 'nullable|email|max:255',
                    'billing_contact_phone' => 'nullable|string|max:20',
                    'payment_terms' => 'required|in:net_15,net_30,net_45,net_60,due_on_receipt,custom',
                    'custom_payment_terms' => 'nullable|string|max:255',
                    'currency' => 'nullable',
                    'billing_notes' => 'nullable|string',
                    'status' => 'nullable|in:active,suspended,closed',
                ]);

                // Validate currency separately
                if (!empty($validated['currency'])) {
                    $currencyExists = ClientBillingCurrency::where('id', $validated['currency'])
                        ->whereIn('created_by', getCompanyAndUsersId())
                        ->where('status', true)
                        ->exists();

                    if (!$currencyExists) {
                        return redirect()->back()->withInput()->with('error', 'Invalid currency selected.');
                    }
                }

                // Check if client belongs to the current user's company
                $client = Client::where('id', $validated['client_id'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->first();

                if (!$client) {
                    return redirect()->back()->with('error', 'Invalid client selected.');
                }

                $billing->update($validated);

                return redirect()->back()->with('success', 'Billing information updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update billing information');
            }
        } else {
            return redirect()->back()->with('error', 'Billing information not found.');
        }
    }

    public function destroy($billingId)
    {
        if (!Auth::user()->can('delete-client-billing')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $billing = ClientBillingInfo::whereHas('client', function ($q) {
            if (Auth::user()->can('manage-any-client-billing')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-billing')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('id', $billingId)
            ->first();

        if ($billing) {
            try {
                $billing->delete();
                return redirect()->back()->with('success', 'Billing information deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete billing information');
            }
        } else {
            return redirect()->back()->with('error', 'Billing information not found.');
        }
    }
}
