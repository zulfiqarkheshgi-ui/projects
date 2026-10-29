<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AddonFeature extends Model
{
    protected $fillable = [
        'key', 'name', 'unit_label', 'base_limit_column',
        'is_active', 'allow_cancel_to_zero', 'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'allow_cancel_to_zero' => 'boolean',
    ];

    public function pricingRules(): HasMany
    {
        return $this->hasMany(AddonPricingRule::class);
    }

    /**
     * Resolve the current price/step for this feature, preferring a
     * plan-specific override over the global (plan_id = null) rule.
     */
    public function currentRateFor(int $planId, string $billingCycle): ?AddonPricingRule
    {
        return $this->pricingRules()
            ->where('billing_cycle', $billingCycle)
            ->where('is_current', true)
            ->where(function ($q) use ($planId) {
                $q->where('plan_id', $planId)->orWhereNull('plan_id');
            })
            // plan-specific (non-null) rules win over the global default
            ->orderByRaw('plan_id IS NULL')
            ->first();
    }
}
