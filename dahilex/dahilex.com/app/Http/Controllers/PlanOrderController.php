<?php

namespace App\Http\Controllers;

use App\Models\PlanOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PlanOrderController extends BaseController
{
    public function index(Request $request)
    {
        $query = PlanOrder::with(['user', 'plan', 'coupon', 'processedBy']);

        // For Company
        if (Auth::user()->hasRole('company')) {
            $query->where('user_id', Auth::user()->id);
        }

        // Apply search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%");
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

        // Apply date filters
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('ordered_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('ordered_at', '<=', $request->date_to);
        }

        // Handle sorting with validation
        $allowedSortFields = ['ordered_at', 'final_price'];
        $sortBy = $request->input('sort_field', 'ordered_at');
        $sortOrder = $request->input('sort_direction', 'desc');

        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'ordered_at';
        }

        $sortOrder = in_array($sortOrder, ['asc', 'desc']) ? $sortOrder : 'desc';

        $query->orderBy($sortBy, $sortOrder);

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $planOrders = $query->paginate($perPage)->withQueryString();

        // Ensure correct price data is loaded
        $planOrders->getCollection()->transform(function ($order) {
            $order->makeHidden(['plan.price', 'plan.yearly_price']);
            return $order;
        });

        return Inertia::render('plans/plan-orders', [
            'planOrders' => $planOrders,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'date_from', 'date_to', 'page'])
        ]);
    }

    public function approve(PlanOrder $planOrder)
    {
        try {
            $planOrder->approve(Auth::id());

            return redirect()->route('plan-orders.index')
                ->with('success', __('Plan order approved successfully!'));
        } catch (\Exception $e) {
            return redirect()->route('plan-orders.index')
                ->with('error', __('Failed to approve plan order: ') . $e->getMessage());
        }
    }

    public function reject(Request $request, PlanOrder $planOrder)
    {
        try {
            $request->validate([
                'notes' => 'nullable|string|max:500'
            ]);

            $planOrder->reject(Auth::id(), $request->notes);

            return redirect()->route('plan-orders.index')
                ->with('success', __('Plan order rejected successfully!'));
        } catch (\Exception $e) {
            return redirect()->route('plan-orders.index')
                ->with('error', __('Failed to reject plan order: ') . $e->getMessage());
        }
    }
}
