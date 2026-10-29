<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TenantSubscription extends Model
{
    protected $fillable = [
        'user_id', 'plan_id', 'billing_cycle', 'status',
        'current_period_start', 'current_period_end', 'next_billing_date',
        'base_plan_price_snapshot', 'cancelled_at',
    ];

    protected $casts = [
        'current_period_start' => 'date',
        'current_period_end' => 'date',
        'next_billing_date' => 'date',
        'cancelled_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function addons(): HasMany
    {
        return $this->hasMany(SubscriptionAddon::class);
    }

    public function addonChanges(): HasMany
    {
        return $this->hasMany(SubscriptionAddonChange::class);
    }

    public function billingCycles(): HasMany
    {
        return $this->hasMany(SubscriptionBillingCycle::class);
    }

    /**
     * The effective limit for a feature right now: plan's included quota
     * plus whatever the tenant currently has *active* (already paid, not
     * yet-scheduled) in add-ons. Scheduled decreases never lower this
     * mid-cycle — only a renewal does.
     */
    public function effectiveLimit(string $featureKey, int $planIncludedQuota): int
    {
        $addon = $this->addons()
            ->whereHas('feature', fn ($q) => $q->where('key', $featureKey))
            ->first();

        return $planIncludedQuota + ($addon->active_quantity ?? 0);
    }
}
