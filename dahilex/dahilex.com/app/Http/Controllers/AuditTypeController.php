<?php

namespace App\Http\Controllers;

use App\Models\AuditType;
use App\Models\ComplianceAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuditTypeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-audit-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = AuditType::with(['creator'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-audit-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-audit-types')) {
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

        $auditTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('compliance/audit-types/index', [
            'auditTypes' => $auditTypes,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-audit-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $exists = AuditType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Audit type with this name already exists.');
        }

        AuditType::create($validated);

        return redirect()->back()->with('success', 'Audit type created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-audit-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $auditType = AuditType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$auditType) {
            return redirect()->back()->with('error', 'Audit type not found.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'status' => 'nullable|in:active,inactive',
        ]);

        $exists = AuditType::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Audit type with this name already exists.');
        }

        $auditType->update($validated);

        return redirect()->back()->with('success', 'Audit type updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-audit-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $auditType = AuditType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$auditType) {
            return redirect()->back()->with('error', 'Audit type not found.');
        }

        $existsComplianceAudits = ComplianceAudit::where('audit_type_id', $id)->exists();
        if ($existsComplianceAudits) {
            return redirect()->back()->with('error', 'Cannot delete audit type that has associated compliance audits.');
        }

        $auditType->delete();

        return redirect()->back()->with('success', 'Audit type deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-audit-types')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $auditType = AuditType::where('id', $id)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$auditType) {
            return redirect()->back()->with('error', 'Audit type not found.');
        }

        $auditType->update(['status' => $auditType->status === 'active' ? 'inactive' : 'active']);

        return redirect()->back()->with('success', 'Audit type status updated successfully.');
    }
}
