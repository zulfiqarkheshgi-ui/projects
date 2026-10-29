<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionAddon extends Model
{
    protected $fillable = [
        'tenant_subscription_id', 'addon_feature_id',
        'active_quantity', 'pending_quantity',
        'step_quantity_snapshot', 'unit_price_snapshot',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(TenantSubscription::class, 'tenant_subscription_id');
    }

    public function feature(): BelongsTo
    {
        return $this->belongsTo(AddonFeature::class, 'addon_feature_id');
    }

    public function hasScheduledChange(): bool
    {
        return $this->active_quantity !== $this->pending_quantity;
    }
}
