<?php

namespace App\Http\Controllers;
use App\Models\ComplianceAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ComplianceAuditController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-compliance-audits')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = ComplianceAudit::with(['creator', 'auditType'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-audits')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-audits')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        $auditTypeQuery = \App\Models\AuditType::where(function ($q) {
            if (Auth::user()->can('manage-any-audit-types')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-audit-types')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->orderBy('name');
        $allAuditTypes = (clone $auditTypeQuery)->get(['id', 'name']);
        $auditTypes = (clone $auditTypeQuery)->active()->get(['id', 'name']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('audit_title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('auditor_name', 'like', '%' . $request->search . '%')
                    ->orWhere('auditor_organization', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('audit_type_id') && $request->audit_type_id !== '_empty_') {
            $query->where('audit_type_id', $request->audit_type_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        if ($request->filled('risk_level') && $request->risk_level !== '_empty_') {
            $query->where('risk_level', $request->risk_level);
        }

        $allowedSortFields = ['audit_title', 'audit_date', 'created_at'];
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

        $audits = $query->paginate($perPage)->withQueryString();

        return Inertia::render('compliance/audits/index', [
            'audits' => $audits,
            'auditTypes' => $auditTypes,
            'allAuditTypes' => $allAuditTypes,
            'filters' => $request->only(['search', 'audit_type_id', 'status', 'risk_level', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-compliance-audits')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'audit_title' => 'required|string|max:255',
            'audit_type_id' => 'required|exists:audit_types,id',
            'description' => 'required|string',
            'audit_date' => 'required|date',
            'completion_date' => 'nullable|date|after_or_equal:audit_date',
            'status' => 'nullable|in:planned,in_progress,completed,cancelled',
            'scope' => 'nullable|string',
            'findings' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'risk_level' => 'nullable|in:low,medium,high,critical',
            'auditor_name' => 'nullable|string|max:255',
            'auditor_organization' => 'nullable|string|max:255',
            'corrective_actions' => 'nullable|string',
            'follow_up_date' => 'nullable|date|after:audit_date',
        ]);

        $auditType = \App\Models\AuditType::active()->where('id', $validated['audit_type_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-audit-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-audit-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();
        if (!$auditType) {
            return redirect()->back()->with('error', 'Invalid audit type selected.');
        }

        $exists = ComplianceAudit::where('audit_title', $validated['audit_title'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();
        if ($exists) {
            return redirect()->back()->with('error', 'Compliance audit with this title already exists.');
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'planned';
        $validated['risk_level'] = $validated['risk_level'] ?? 'medium';

        ComplianceAudit::create($validated);

        return redirect()->back()->with('success', 'Compliance audit created successfully.');
    }

    public function update(Request $request, $auditId)
    {
        if (!Auth::user()->can('edit-compliance-audits')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $audit = ComplianceAudit::where('id', $auditId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-audits')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-audits')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();

        if (!$audit) {
            return redirect()->back()->with('error', 'Compliance audit not found.');
        }

        $validated = $request->validate([
            'audit_title' => 'required|string|max:255',
            'audit_type_id' => 'required|exists:audit_types,id',
            'description' => 'required|string',
            'audit_date' => 'required|date',
            'completion_date' => 'nullable|date|after_or_equal:audit_date',
            'status' => 'nullable|in:planned,in_progress,completed,cancelled',
            'scope' => 'nullable|string',
            'findings' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'risk_level' => 'nullable|in:low,medium,high,critical',
            'auditor_name' => 'nullable|string|max:255',
            'auditor_organization' => 'nullable|string|max:255',
            'corrective_actions' => 'nullable|string',
            'follow_up_date' => 'nullable|date|after:audit_date',
        ]);

        $auditType = \App\Models\AuditType::active()->where('id', $validated['audit_type_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-audit-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-audit-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();
        if (!$auditType) {
            return redirect()->back()->with('error', 'Invalid audit type selected.');
        }

        $exists = ComplianceAudit::where('audit_title', $validated['audit_title'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('id', '!=', $auditId)
            ->exists();
        if ($exists) {
            return redirect()->back()->with('error', 'Compliance audit with this title already exists.');
        }

        $audit->update($validated);

        return redirect()->back()->with('success', 'Compliance audit updated successfully');
    }

    public function destroy($auditId)
    {
        if (!Auth::user()->can('delete-compliance-audits')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $audit = ComplianceAudit::where('id', $auditId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-compliance-audits')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-compliance-audits')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();

        if (!$audit) {
            return redirect()->back()->with('error', 'Compliance audit not found.');
        }

        $audit->delete();
        return redirect()->back()->with('success', 'Compliance audit deleted successfully');
    }
}