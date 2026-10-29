<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionBillingCycle extends Model
{
    protected $fillable = [
        'tenant_subscription_id', 'invoice_id', 'period_start', 'period_end',
        'base_plan_amount', 'addon_breakdown', 'addon_total', 'total_amount', 'status',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'addon_breakdown' => 'array',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(TenantSubscription::class, 'tenant_subscription_id');
    }
}
