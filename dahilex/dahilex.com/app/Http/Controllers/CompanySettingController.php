<?php

namespace App\Http\Controllers;
use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CompanySettingController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-company-settings')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = CompanySetting::query()
            ->with(['creator'])
            ->where('created_by', createdBy());

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('setting_key', 'like', '%' . $request->search . '%')
                    ->orWhere('setting_value', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Handle category filter
        if ($request->has('category') && !empty($request->category) && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        // Handle type filter
        if ($request->has('setting_type') && !empty($request->setting_type) && $request->setting_type !== 'all') {
            $query->where('setting_type', $request->setting_type);
        }

        // Handle sorting with validation
        $allowedSortFields = ['setting_key', 'setting_value', 'category', 'created_at', 'updated_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');
        
        // Validate sort field
        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }
        
        // Validate sort direction
        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';
        
        if ($request->has('sort_field')) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('category', 'asc')->orderBy('setting_key', 'asc');
        }

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }
        
        $companySettings = $query->paginate($perPage);

        return Inertia::render('advocate/company-settings/index', [
            'companySettings' => $companySettings,
            'filters' => $request->all(['search', 'category', 'setting_type', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function update(Request $request, $settingId)
    {
        if (!Auth::user()->can('edit-company-settings')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $setting = CompanySetting::where('id', $settingId)
            ->where('created_by', createdBy())
            ->first();

        if ($setting) {
            try {
                $validated = $request->validate([
                    'setting_value' => 'required|string',
                    'description' => 'nullable|string',
                ]);

                $setting->update($validated);

                return redirect()->back()->with('success', 'Company setting updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update company setting');
            }
        } else {
            return redirect()->back()->with('error', 'Company setting not found.');
        }
    }
}