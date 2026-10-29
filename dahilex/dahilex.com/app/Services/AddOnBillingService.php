<?php

namespace App\Services;

use App\Models\AddonFeature;
use App\Models\SubscriptionAddon;
use App\Models\SubscriptionAddonChange;
use App\Models\SubscriptionBillingCycle;
use App\Models\TenantSubscription;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AddOnBillingService
{
    /**
     * Request a new total quantity for one add-on feature on a subscription.
     *
     * - If $newQuantity > current active_quantity: applied and charged
     *   immediately (an "increase" change row is written with applied_at
     *   set now, and active_quantity/pending_quantity both jump right away).
     * - If $newQuantity < current active_quantity (a decrease, including
     *   cancelling to the plan's included quota / zero add-on): NOT applied
     *   now. active_quantity is left untouched (tenant keeps using what
     *   they already paid for through the end of the cycle); only
     *   pending_quantity moves, and a "decrease"/"cancel" change row is
     *   queued with effective_at = the subscription's next_billing_date.
     * - If $newQuantity === current active_quantity: no-op (clears any
     *   previously pending change back in line with the active one).
     */
    public function requestQuantityChange(
        TenantSubscription $subscription,
        string $featureKey,
        int $newQuantity,
        ?int $requestedBy = null
    ): SubscriptionAddonChange {
        if ($newQuantity < 0) {
            throw new InvalidArgumentException('Quantity cannot be negative.');
        }

        return DB::transaction(function () use ($subscription, $featureKey, $newQuantity, $requestedBy) {
            $feature = AddonFeature::where('key', $featureKey)->where('is_active', true)->firstOrFail();

            /** @var SubscriptionAddon $addon */
            $addon = SubscriptionAddon::firstOrCreate(
                [
                    'tenant_subscription_id' => $subscription->id,
                    'addon_feature_id' => $feature->id,
                ],
                [
                    'active_quantity' => 0,
                    'pending_quantity' => 0,
                    'step_quantity_snapshot' => 1,
                    'unit_price_snapshot' => 0,
                ]
            );

            $current = $addon->active_quantity;

            if ($newQuantity === $current) {
                $addon->update(['pending_quantity' => $current]);

                return SubscriptionAddonChange::create([
                    'tenant_subscription_id' => $subscription->id,
                    'addon_feature_id' => $feature->id,
                    'change_type' => 'increase', // neutral no-op record
                    'from_quantity' => $current,
                    'to_quantity' => $newQuantity,
                    'charge_amount' => 0,
                    'effective_at' => now(),
                    'applied_at' => now(),
                    'status' => 'applied',
                    'requested_by' => $requestedBy,
                ]);
            }

            $rule = $feature->currentRateFor((int) $subscription->plan_id, $subscription->billing_cycle);

            if (! $rule) {
                throw new InvalidArgumentException("No active pricing rule for feature [{$featureKey}] on this plan/cycle.");
            }

            if ($newQuantity > $current) {
                return $this->applyIncrease($subscription, $addon, $rule, $current, $newQuantity, $requestedBy);
            }

            return $this->scheduleDecrease($subscription, $addon, $current, $newQuantity, $requestedBy);
        });
    }

    /**
     * Read-only: what would this quantity change cost, without persisting
     * anything. Used by controllers that need to charge a card BEFORE
     * committing the increase (increases must never be applied for free
     * just because a later charge attempt fails).
     *
     * @return array{change_type:string, charge_amount:float, current_quantity:int}
     */
    public function previewIncreaseCost(TenantSubscription $subscription, string $featureKey, int $newQuantity): array
    {
        $feature = AddonFeature::where('key', $featureKey)->where('is_active', true)->firstOrFail();

        $addon = SubscriptionAddon::where('tenant_subscription_id', $subscription->id)
            ->where('addon_feature_id', $feature->id)
            ->first();

        $current = $addon->active_quantity ?? 0;

        if ($newQuantity <= $current) {
            return ['change_type' => $newQuantity === $current ? 'none' : 'decrease', 'charge_amount' => 0.0, 'current_quantity' => $current];
        }

        $rule = $feature->currentRateFor((int) $subscription->plan_id, $subscription->billing_cycle);

        if (! $rule) {
            throw new InvalidArgumentException("No active pricing rule for feature [{$featureKey}] on this plan/cycle.");
        }

        $costForNew = $rule->costFor($newQuantity);
        $costAlreadyPaid = $rule->costFor($current);
        $chargeNow = max(0, round($costForNew - $costAlreadyPaid, 2));

        if (config('billing.prorate_addon_increases', true)) {
            $daysTotal = $subscription->current_period_start->diffInDays($subscription->current_period_end) ?: 1;
            $daysRemaining = max(0, now()->diffInDays($subscription->current_period_end, false));
            $factor = min(1, max(0, $daysRemaining / $daysTotal));
            $chargeNow = round($chargeNow * $factor, 2);
        }

        return ['change_type' => 'increase', 'charge_amount' => $chargeNow, 'current_quantity' => $current];
    }

    protected function applyIncrease(
        TenantSubscription $subscription,
        SubscriptionAddon $addon,
        $rule,
        int $current,
        int $newQuantity,
        ?int $requestedBy
    ): SubscriptionAddonChange {
        // Charge for the full new block-rounded cost minus what was already
        // charged for the current quantity, so upgrading twice in one cycle
        // never double-bills the same block.
        $costForNew = $rule->costFor($newQuantity);
        $costAlreadyPaid = $rule->costFor($current);
        $chargeNow = max(0, round($costForNew - $costAlreadyPaid, 2));

        // Simple day-based proration of the incremental charge against the
        // remaining days in the current cycle. Set
        // config('billing.prorate_addon_increases') to false to bill the
        // full block instead.
        $prorated = false;
        if (config('billing.prorate_addon_increases', true)) {
            $daysTotal = $subscription->current_period_start->diffInDays($subscription->current_period_end) ?: 1;
            $daysRemaining = max(0, now()->diffInDays($subscription->current_period_end, false));
            $factor = min(1, max(0, $daysRemaining / $daysTotal));
            $chargeNow = round($chargeNow * $factor, 2);
            $prorated = true;
        }

        $addon->update([
            'active_quantity' => $newQuantity,
            'pending_quantity' => $newQuantity,
            'step_quantity_snapshot' => $rule->step_quantity,
            'unit_price_snapshot' => $rule->unit_price,
        ]);

        // Sync the fast-path cache column on `users` if the feature maps to one.
        $this->syncUserQuotaCache($subscription);

        return SubscriptionAddonChange::create([
            'tenant_subscription_id' => $subscription->id,
            'addon_feature_id' => $addon->addon_feature_id,
            'change_type' => 'increase',
            'from_quantity' => $current,
            'to_quantity' => $newQuantity,
            'charge_amount' => $chargeNow,
            'was_prorated' => $prorated,
            'effective_at' => now(),
            'applied_at' => now(),
            'status' => 'applied',
            'requested_by' => $requestedBy,
        ]);

        // Note: actually charging the payment method ($chargeNow) is the
        // CALLER's responsibility, done BEFORE calling requestQuantityChange
        // (see previewIncreaseCost() above and AddonController::update()).
        // This service intentionally stays gateway-agnostic.
    }

    protected function scheduleDecrease(
        TenantSubscription $subscription,
        SubscriptionAddon $addon,
        int $current,
        int $newQuantity,
        ?int $requestedBy
    ): SubscriptionAddonChange {
        // Supersede any earlier still-pending change for this feature so
        // there is only ever one queued outcome per feature.
        SubscriptionAddonChange::where('tenant_subscription_id', $subscription->id)
            ->where('addon_feature_id', $addon->addon_feature_id)
            ->where('status', 'pending')
            ->update(['status' => 'superseded']);

        $addon->update(['pending_quantity' => $newQuantity]);
        // active_quantity is intentionally left alone: full current
        // allocation remains usable through the end of the paid cycle.

        return SubscriptionAddonChange::create([
            'tenant_subscription_id' => $subscription->id,
            'addon_feature_id' => $addon->addon_feature_id,
            'change_type' => $newQuantity === 0 ? 'cancel' : 'decrease',
            'from_quantity' => $current,
            'to_quantity' => $newQuantity,
            'charge_amount' => 0,
            'effective_at' => $subscription->next_billing_date->copy()->startOfDay(),
            'applied_at' => null,
            'status' => 'pending',
            'requested_by' => $requestedBy,
        ]);
    }

    /**
     * Renewal entry point, called by the scheduled command for every
     * subscription whose next_billing_date is today. Applies any queued
     * decrease/cancel changes, recomputes the cycle's charges, writes a
     * SubscriptionBillingCycle snapshot, and advances the period.
     */
    public function renew(TenantSubscription $subscription): SubscriptionBillingCycle
    {
        return DB::transaction(function () use ($subscription) {
            $this->applyPendingChanges($subscription);

            $breakdown = [];
            $addonTotal = 0.0;

            foreach ($subscription->addons()->with('feature')->get() as $addon) {
                if ($addon->active_quantity <= 0) {
                    continue;
                }

                $rule = $addon->feature->currentRateFor((int) $subscription->plan_id, $subscription->billing_cycle);
                $lineTotal = $rule
                    ? $rule->costFor($addon->active_quantity)
                    : round($addon->active_quantity / max(1, $addon->step_quantity_snapshot) * $addon->unit_price_snapshot, 2);

                $addonTotal += $lineTotal;

                $breakdown[] = [
                    'feature_key' => $addon->feature->key,
                    'name' => $addon->feature->name,
                    'quantity' => $addon->active_quantity,
                    'step_quantity' => $rule->step_quantity ?? $addon->step_quantity_snapshot,
                    'unit_price' => $rule->unit_price ?? $addon->unit_price_snapshot,
                    'line_total' => $lineTotal,
                ];

                // Keep the snapshot fresh for the next cycle's calculations.
                if ($rule) {
                    $addon->update([
                        'step_quantity_snapshot' => $rule->step_quantity,
                        'unit_price_snapshot' => $rule->unit_price,
                    ]);
                }
            }

            $base = $subscription->billing_cycle === 'yearly'
                ? $subscription->plan->yearly_price
                : $subscription->plan->price;

            $cycle = SubscriptionBillingCycle::create([
                'tenant_subscription_id' => $subscription->id,
                'period_start' => $subscription->current_period_start,
                'period_end' => $subscription->current_period_end,
                'base_plan_amount' => $base,
                'addon_breakdown' => $breakdown,
                'addon_total' => round($addonTotal, 2),
                'total_amount' => round($base + $addonTotal, 2),
                'status' => 'scheduled',
            ]);

            $this->advancePeriod($subscription);
            $this->syncUserQuotaCache($subscription);

            return $cycle;
        });
    }

    /**
     * Apply every pending decrease/cancel change whose effective_at has
     * arrived: this is the moment active_quantity finally drops to match
     * what the tenant already asked for.
     */
    protected function applyPendingChanges(TenantSubscription $subscription): void
    {
        $due = SubscriptionAddonChange::where('tenant_subscription_id', $subscription->id)
            ->where('status', 'pending')
            ->where('effective_at', '<=', now())
            ->get();

        foreach ($due as $change) {
            SubscriptionAddon::where('tenant_subscription_id', $subscription->id)
                ->where('addon_feature_id', $change->addon_feature_id)
                ->update(['active_quantity' => $change->to_quantity]);

            $change->update(['status' => 'applied', 'applied_at' => now()]);
        }
    }

    protected function advancePeriod(TenantSubscription $subscription): void
    {
        $start = $subscription->current_period_end->copy()->addDay();
        $end = $subscription->billing_cycle === 'yearly'
            ? $start->copy()->addYear()->subDay()
            : $start->copy()->addMonth()->subDay();

        $subscription->update([
            'current_period_start' => $start,
            'current_period_end' => $end,
            'next_billing_date' => $end->copy()->addDay(),
        ]);
    }

    /**
     * Keep the legacy fast-path columns on `users` (plan_id, plan_expire_date,
     * and any max_* limits middleware reads directly) roughly in sync so
     * existing quota-check code that hasn't migrated to
     * TenantSubscription::effectiveLimit() keeps working during rollout.
     */
    protected function syncUserQuotaCache(TenantSubscription $subscription): void
    {
        $subscription->tenant()->update([
            'plan_id' => $subscription->plan_id,
            'plan_expire_date' => $subscription->current_period_end,
        ]);
    }
}
