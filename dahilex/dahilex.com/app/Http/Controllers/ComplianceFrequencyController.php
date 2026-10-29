<?php

namespace App\Http\Controllers;
use App\Models\ComplianceFrequency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ComplianceFrequencyController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-compliance-frequencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ComplianceFrequency::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-compliance-frequencies')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-compliance-frequencies')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        $allowedSortFields = ['name', 'days', 'created_at'];
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
        
        $frequencies = $query->paginate($perPage)->withQueryString();

        return Inertia::render('compliance/frequencies/index', [
            'frequencies' => $frequencies,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-compliance-frequencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'days' => 'nullable|integer|min:1',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $exists = ComplianceFrequency::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Compliance frequency with this name already exists.');
        }

        ComplianceFrequency::create($validated);

        return redirect()->back()->with('success', 'Compliance frequency created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-compliance-frequencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $frequency = ComplianceFrequency::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'days' => 'nullable|integer|min:1',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = ComplianceFrequency::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Compliance frequency with this name already exists.');
        }

        $frequency->update($validated);

        return redirect()->back()->with('success', 'Compliance frequency updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-compliance-frequencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $frequency = ComplianceFrequency::findOrFail($id);
        
        if ($frequency->complianceRequirements()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete frequency that has compliance requirements.');
        }

        $frequency->delete();

        return redirect()->back()->with('success', 'Compliance frequency deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-compliance-frequencies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $frequency = ComplianceFrequency::findOrFail($id);
        
        $newStatus = $frequency->status === 'active' ? 'inactive' : 'active';
        $frequency->update(['status' => $newStatus]);

        return redirect()->back()->with('success', 'Frequency status updated successfully.');
    }
}