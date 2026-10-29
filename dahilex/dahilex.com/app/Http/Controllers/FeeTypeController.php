<?php

namespace App\Http\Controllers;
use App\Models\FeeType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FeeTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-fee-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = FeeType::with(['creator'])
            ->where('created_by', createdBy());

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
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
        
        $feeTypes = $query->paginate($perPage);

        return Inertia::render('billing/fee-types/index', [
            'feeTypes' => $feeTypes,
            'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-fee-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if fee type with same name already exists for this company
        $exists = FeeType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Fee type with this name already exists.');
        }

        FeeType::create($validated);

        return redirect()->back()->with('success', 'Fee type created successfully.');
    }

    public function update(Request $request, $feeTypeId)
    {
        if (!Auth::user()->can('edit-fee-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $feeType = FeeType::where('id', $feeTypeId)
            ->where('created_by', createdBy())
            ->first();

        if ($feeType) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'status' => 'nullable|in:active,inactive',
                ]);

                // Check if fee type with same name already exists for this company (excluding current)
                $exists = FeeType::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $feeTypeId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', 'Fee type with this name already exists.');
                }

                $feeType->update($validated);

                return redirect()->back()->with('success', 'Fee type updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update fee type');
            }
        } else {
            return redirect()->back()->with('error', 'Fee type not found.');
        }
    }

    public function destroy($feeTypeId)
    {
        if (!Auth::user()->can('delete-fee-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $feeType = FeeType::where('id', $feeTypeId)
            ->where('created_by', createdBy())
            ->first();

        if ($feeType) {
            try {
                $feeType->delete();
                return redirect()->back()->with('success', 'Fee type deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete fee type');
            }
        } else {
            return redirect()->back()->with('error', 'Fee type not found.');
        }
    }

    public function toggleStatus($feeTypeId)
    {
        if (!Auth::user()->can('toggle-status-fee-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $feeType = FeeType::where('id', $feeTypeId)
            ->where('created_by', createdBy())
            ->first();

        if ($feeType) {
            try {
                $feeType->status = $feeType->status === 'active' ? 'inactive' : 'active';
                $feeType->save();

                return redirect()->back()->with('success', 'Fee type status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update fee type status');
            }
        } else {
            return redirect()->back()->with('error', 'Fee type not found.');
        }
    }
}