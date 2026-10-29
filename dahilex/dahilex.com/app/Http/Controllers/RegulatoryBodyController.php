<?php

namespace App\Http\Controllers;
use App\Events\NewRegulatoryBodyCreated;
use App\Models\RegulatoryBody;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RegulatoryBodyController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-regulatory-bodies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = RegulatoryBody::with(['creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-regulatory-bodies')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-regulatory-bodies')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('jurisdiction', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        if ($request->filled('jurisdiction') && $request->jurisdiction !== '_empty_') {
            $query->where('jurisdiction', $request->jurisdiction);
        }

        $allowedSortFields = ['name', 'jurisdiction', 'created_at'];
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

        $bodies = $query->paginate($perPage)->withQueryString();

        return Inertia::render('compliance/regulatory-bodies/index', [
            'bodies' => $bodies,
            'filters' => $request->only(['search', 'status', 'jurisdiction', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-regulatory-bodies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'jurisdiction' => 'required|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'website' => 'nullable|url|max:255',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $regulatoryBody = RegulatoryBody::create($validated);

        // Trigger notifications
        if ($regulatoryBody && !IsDemo()) {
            event(new \App\Events\NewRegulatoryBodyCreated($regulatoryBody, $request->all()));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('SMS send failed: ') . $slackError;
        }

        if (!empty($errors)) {
            $message = __('Regulatory body created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Regulatory body created successfully.');
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('edit-regulatory-bodies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $body = RegulatoryBody::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'jurisdiction' => 'required|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'website' => 'nullable|url|max:255',
            'status' => 'nullable|in:active,inactive',
        ]);

        $body->update($validated);

        return redirect()->back()->with('success', 'Regulatory body updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-regulatory-bodies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $body = RegulatoryBody::findOrFail($id);

        if ($body->complianceRequirements()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete regulatory body that has compliance requirements.');
        }

        $body->delete();

        return redirect()->back()->with('success', 'Regulatory body deleted successfully.');
    }

    public function toggleStatus($id)
    {
        if (!Auth::user()->can('toggle-status-regulatory-bodies')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $body = RegulatoryBody::findOrFail($id);

        $newStatus = $body->status === 'active' ? 'inactive' : 'active';
        $body->update(['status' => $newStatus]);

        return redirect()->back()->with('success', 'Regulatory body status updated successfully.');
    }
}
