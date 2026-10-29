<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ClientTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-client-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ClientType::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-client-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-client-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'inactive'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['name', 'created_at'];
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

        $clientTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('clients/client-types/index', [
            'clientTypes' => $clientTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-client-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if client type with same name already exists for this company
        $exists = ClientType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Client type with this name already exists.');
        }

        ClientType::create($validated);

        return redirect()->back()->with('success', 'Client type created successfully.');
    }

    public function update(Request $request, $clientTypeId)
    {
        if (!Auth::user()->can('edit-client-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $clientType = ClientType::where('id', $clientTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($clientType) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'status' => 'nullable|in:active,inactive',
                ]);

                // Check if client type with same name already exists for this company (excluding current)
                $exists = ClientType::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $clientTypeId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', 'Client type with this name already exists.');
                }

                $clientType->update($validated);

                return redirect()->back()->with('success', 'Client type updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update client type');
            }
        } else {
            return redirect()->back()->with('error', 'Client type not found.');
        }
    }

    public function destroy($clientTypeId)
    {
        if (!Auth::user()->can('delete-client-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $clientType = ClientType::where('id', $clientTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($clientType) {
            try {
                // Check if client type has clients
                    $clientCount = Client::where('client_type_id', $clientTypeId)->count();
                    if ($clientCount > 0) {
                        return response()->json(['message' => 'Cannot delete client type with assigned clients'], 400);
                    }
                $clientType->delete();
                return redirect()->back()->with('success', 'Client type deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete client type');
            }
        } else {
            return redirect()->back()->with('error', 'Client type not found.');
        }
    }

    public function toggleStatus($clientTypeId)
    {
        if (!Auth::user()->can('toggle-status-client-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $clientType = ClientType::where('id', $clientTypeId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($clientType) {
            try {
                $clientType->status = $clientType->status === 'active' ? 'inactive' : 'active';
                $clientType->save();

                return redirect()->back()->with('success', 'Client type status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update client type status');
            }
        } else {
            return redirect()->back()->with('error', 'Client type not found.');
        }
    }
}
