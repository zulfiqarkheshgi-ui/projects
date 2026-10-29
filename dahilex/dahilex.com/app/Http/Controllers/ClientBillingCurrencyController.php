<?php

namespace App\Http\Controllers;
use App\Models\ClientBillingCurrency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ClientBillingCurrencyController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-client-billing-currencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ClientBillingCurrency::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-client-billing-currencies')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-billing-currencies')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->has('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('code', 'like', "%{$searchTerm}%")
                  ->orWhere('symbol', 'like', "%{$searchTerm}%");
            });
        }

        // Handle sorting with validation
        $allowedSortFields = ['name', 'code', 'symbol', 'created_at', 'updated_at'];
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
        
        $currencies = $query->paginate($perPage)->withQueryString();

        return Inertia::render('client-billing-currencies/index', [
            'currencies' => $currencies,
            'filters' => $request->all(['search', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-client-billing-currencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:client_billing_currencies',
            'symbol' => 'required|string|max:10',
            'description' => 'nullable|string',
            'is_default' => 'boolean',
        ]);

        if ($request->input('is_default')) {
            ClientBillingCurrency::whereIn('created_by', getCompanyAndUsersId())
                ->update(['is_default' => false]);
        }

        $validated['created_by'] = Auth::user()->id;

             $exists = ClientBillingCurrency::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Currency with this name already exists.');
        }

        ClientBillingCurrency::create($validated);

        return redirect()->back()->with('success', 'Currency created successfully.');
    }

    public function update(Request $request, ClientBillingCurrency $clientBillingCurrency)
    {
        if (!Auth::user()->can('edit-client-billing-currencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:client_billing_currencies,code,' . $clientBillingCurrency->id,
            'symbol' => 'required|string|max:10',
            'description' => 'nullable|string',
            'is_default' => 'boolean',
        ]);

        if ($request->input('is_default')) {
            ClientBillingCurrency::whereIn('created_by', getCompanyAndUsersId())
                ->where('id', '!=', $clientBillingCurrency->id)
                ->update(['is_default' => false]);
        }
            $exists = ClientBillingCurrency::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $clientBillingCurrency->id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Currency with this name already exists.');
        }

        $clientBillingCurrency->update($validated);

        return redirect()->back()->with('success', 'Currency updated successfully.');
    }

    public function destroy(ClientBillingCurrency $clientBillingCurrency)
    {
        if (!Auth::user()->can('delete-client-billing-currencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        if ($clientBillingCurrency->is_default) {
            return redirect()->back()->with('error', 'Cannot delete the default currency.');
        }

        $clientBillingCurrency->delete();

        return redirect()->back()->with('success', 'Currency deleted successfully.');
    }

    public function getAllCurrencies()
    {
        $currencies = ClientBillingCurrency::where('created_by', createdBy())
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'symbol', 'is_default']);
        
        return response()->json($currencies);
    }
}