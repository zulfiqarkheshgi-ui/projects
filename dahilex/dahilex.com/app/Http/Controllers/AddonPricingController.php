<?php

namespace App\Http\Controllers;

use App\Models\AddonFeature;
use App\Models\AddonPricingRule;
use Illuminate\Http\Request;

class AddonPricingController extends Controller
{
    /**
     * List every sellable feature with its current global (and any
     * plan-specific override) rates, for the Super Admin pricing screen.
     */
    public function index()
    {
        $features = AddonFeature::with(['pricingRules' => function ($q) {
            $q->where('is_current', true)->orderBy('plan_id');
        }])->get();

        return response()->json(['features' => $features]);
    }

    /**
     * Publish a new rate for a feature. Does NOT edit any existing row —
     * it marks the current matching rule (same feature/plan/cycle) as
     * no-longer-current and inserts a fresh one, so subscriptions already
     * billed under the old rate are unaffected until their own renewal.
     */
    public function store(Request $request, AddonFeature $feature)
    {
        $validated = $request->validate([
            'plan_id' => 'nullable|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'step_quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
            'round_up_partial_steps' => 'sometimes|boolean',
        ]);

        AddonPricingRule::where('addon_feature_id', $feature->id)
            ->where('billing_cycle', $validated['billing_cycle'])
            ->where('plan_id', $validated['plan_id'] ?? null)
            ->where('is_current', true)
            ->update(['is_current' => false]);

        $rule = AddonPricingRule::create([
            'addon_feature_id' => $feature->id,
            'plan_id' => $validated['plan_id'] ?? null,
            'billing_cycle' => $validated['billing_cycle'],
            'step_quantity' => $validated['step_quantity'],
            'unit_price' => $validated['unit_price'],
            'round_up_partial_steps' => $validated['round_up_partial_steps'] ?? true,
            'effective_from' => now(),
            'is_current' => true,
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'rule' => $rule]);
    }

    /**
     * Toggle whether a feature can be purchased as an add-on at all.
     */
    public function toggleFeature(AddonFeature $feature)
    {
        $feature->update(['is_active' => ! $feature->is_active]);

        return response()->json(['success' => true, 'is_active' => $feature->is_active]);
    }
}
