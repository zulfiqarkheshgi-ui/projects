<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionAddonChange extends Model
{
    protected $fillable = [
        'tenant_subscription_id', 'addon_feature_id', 'change_type',
        'from_quantity', 'to_quantity', 'charge_amount', 'was_prorated',
        'requested_at', 'effective_at', 'applied_at', 'status', 'requested_by',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'effective_at' => 'datetime',
        'applied_at' => 'datetime',
        'was_prorated' => 'boolean',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(TenantSubscription::class, 'tenant_subscription_id');
    }

    public function feature(): BelongsTo
    {
        return $this->belongsTo(AddonFeature::class, 'addon_feature_id');
    }
}
