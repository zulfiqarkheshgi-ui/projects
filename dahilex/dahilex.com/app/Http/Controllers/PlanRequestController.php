<?php

namespace App\Http\Controllers;

use App\Models\PlanRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PlanRequestController extends BaseController
{
    public function index(Request $request)
    {
        $query = PlanRequest::with(['user', 'plan', 'approver', 'rejector']);

        // For Company
        if (Auth::user()->hasRole('company')) {
            $query->where('user_id', Auth::user()->id);
        }

        // Apply search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($userQuery) use ($search) {
                    $userQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                    ->orWhereHas('plan', function ($planQuery) use ($search) {
                        $planQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Apply filters
        if ($request->has('status') && $request->status && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        // Handle sorting with validation
        $allowedSortFields = ['created_at'];
        $sortBy = $request->input('sort_field', 'created_at');
        $sortOrder = $request->input('sort_direction', 'desc');

        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }

        $sortOrder = in_array($sortOrder, ['asc', 'desc']) ? $sortOrder : 'desc';

        $query->orderBy($sortBy, $sortOrder);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $planRequests = $query->paginate($perPage)->withQueryString();

        return Inertia::render('plans/plan-request', [
            'planRequests' => $planRequests,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page'])
        ]);
    }

    public function approve(PlanRequest $planRequest)
    {
        DB::transaction(function () use ($planRequest) {
            $planRequest->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);
            // Assign the approved plan to the user
            assignPlanToUser($planRequest->user, $planRequest->plan, $planRequest->duration ?? 'monthly');

            $data = [
                'user_id' => $planRequest->user_id,
                'plan_id' => $planRequest->plan_id,
                'billing_cycle' => $planRequest->duration,
                'payment_method' => 'manual',
                'payment_id' => null,
                'status' => 'approved',
                'processed_at' => now()
            ];
            createPlanOrder($data);
        });


        return redirect()->route('plan-requests.index')->with('success', __('Plan request approved successfully!'));
    }

    public function reject(PlanRequest $planRequest)
    {
        $planRequest->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejected_by' => Auth::id(),
        ]);

        return redirect()->route('plan-requests.index')->with('success', __('Plan request rejected successfully!'));
    }

    public function cancel(PlanRequest $planRequest)
    {
        // Only allow user to cancel their own pending requests
        if ($planRequest->user_id !== Auth::id() || $planRequest->status !== 'pending') {
            return back()->with('error', __('Cannot cancel this request.'));
        }

        $planRequest->delete();

        return back()->with('success', __('Plan request cancelled successfully.'));
    }
}
