<?php

namespace App\Http\Controllers;

use App\Models\AddonFeature;
use App\Models\TenantSubscription;
use App\Services\AddonChargeService;
use App\Services\AddOnBillingService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AddonController extends Controller
{
    public function __construct(
        protected AddOnBillingService $billing,
        protected AddonChargeService $charge
    ) {}

    /**
     * Current subscription + per-feature usage/allowance/pending-change
     * summary for the logged-in tenant. Used to render the add-ons screen.
     */
    public function index(Request $request)
    {
        $subscription = $this->currentSubscription($request);

        $features = AddonFeature::where('is_active', true)->get()->map(function ($feature) use ($subscription) {
            $addon = $subscription->addons()->where('addon_feature_id', $feature->id)->first();
            $rule = $feature->currentRateFor((int) $subscription->plan_id, $subscription->billing_cycle);

            $planIncluded = $feature->base_limit_column
                ? (int) ($subscription->plan->{$feature->base_limit_column} ?? 0)
                : 0;

            return [
                'key' => $feature->key,
                'name' => $feature->name,
                'unit_label' => $feature->unit_label,
                'plan_included' => $planIncluded,
                'active_quantity' => $addon->active_quantity ?? 0,
                'pending_quantity' => $addon->pending_quantity ?? 0,
                'has_scheduled_change' => $addon ? $addon->hasScheduledChange() : false,
                'effective_from_next_billing' => $addon && $addon->hasScheduledChange()
                    ? $subscription->next_billing_date->toDateString()
                    : null,
                'step_quantity' => $rule->step_quantity ?? null,
                'unit_price' => $rule->unit_price ?? null,
            ];
        });

        return response()->json([
            'subscription' => [
                'plan' => $subscription->plan->name,
                'billing_cycle' => $subscription->billing_cycle,
                'current_period_end' => $subscription->current_period_end->toDateString(),
                'next_billing_date' => $subscription->next_billing_date->toDateString(),
            ],
            'features' => $features,
        ]);
    }

    /**
     * Request a new total quantity for one feature.
     *
     * - New quantity below current: scheduled for next_billing_date, no
     *   charge, no card required.
     * - New quantity above current: requires card details in the same
     *   request; charges immediately and only then applies the increase.
     */
    public function update(Request $request, string $featureKey)
    {
        $subscription = $this->currentSubscription($request);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:0',
            // Card fields are optional at this stage — they're only required
            // once we know below that this specific change is a chargeable
            // increase. Validated properly (as required) further down.
            'card_number' => 'sometimes|string',
            'expiry_month' => 'sometimes|string|size:2',
            'expiry_year' => 'sometimes|string|size:2',
            'cvv' => 'sometimes|string|min:3|max:4',
            'cardholder_name' => 'sometimes|string|min:2|max:50',
        ]);

        $newQuantity = (int) $validated['quantity'];

        try {
            $preview = $this->billing->previewIncreaseCost($subscription, $featureKey, $newQuantity);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        // Not an increase (decrease/cancel/no-op): no card needed, schedule it.
        if ($preview['change_type'] !== 'increase') {
            $change = $this->billing->requestQuantityChange($subscription, $featureKey, $newQuantity, auth()->id());

            return response()->json([
                'success' => true,
                'change_type' => $change->change_type,
                'effective_at' => $change->effective_at->toDateString(),
                'charged' => false,
            ]);
        }

        // Free increase (e.g. moving within an already-paid block): apply directly, no card needed.
        if ($preview['charge_amount'] <= 0) {
            $change = $this->billing->requestQuantityChange($subscription, $featureKey, $newQuantity, auth()->id());

            return response()->json(['success' => true, 'change_type' => $change->change_type, 'charged' => false, 'charge_amount' => 0]);
        }

        // It's a real, chargeable increase: card details are mandatory now.
        $cardData = $request->validate([
            'card_number' => 'required|string',
            'expiry_month' => 'required|string|size:2',
            'expiry_year' => 'required|string|size:2',
            'cvv' => 'required|string|min:3|max:4',
            'cardholder_name' => 'required|string|min:2|max:50',
        ]);

        $result = $this->charge->charge(
            $cardData,
            $preview['charge_amount'],
            "Add-on increase: {$featureKey} to {$newQuantity}",
            ['subscription_id' => $subscription->id, 'feature' => $featureKey]
        );

        if (! $result['success']) {
            return response()->json(['error' => $result['error']], 402);
        }

        // Charge succeeded — now, and only now, actually apply the increase.
        $change = $this->billing->requestQuantityChange($subscription, $featureKey, $newQuantity, auth()->id());

        return response()->json([
            'success' => true,
            'change_type' => $change->change_type,
            'charged' => true,
            'charge_amount' => $preview['charge_amount'],
            'transaction_id' => $result['transaction_id'],
        ]);
    }

    protected function currentSubscription(Request $request): TenantSubscription
    {
        return TenantSubscription::where('user_id', auth()->id())
            ->where('status', '!=', 'cancelled')
            ->latest('id')
            ->firstOrFail();
    }
}
