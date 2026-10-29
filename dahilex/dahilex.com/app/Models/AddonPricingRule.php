<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AddonPricingRule extends Model
{
    protected $fillable = [
        'addon_feature_id', 'plan_id', 'billing_cycle', 'step_quantity',
        'unit_price', 'round_up_partial_steps', 'effective_from',
        'is_current', 'created_by',
    ];

    protected $casts = [
        'round_up_partial_steps' => 'boolean',
        'is_current' => 'boolean',
        'effective_from' => 'datetime',
        'unit_price' => 'decimal:2',
    ];

    public function feature()
    {
        return $this->belongsTo(AddonFeature::class, 'addon_feature_id');
    }

    /**
     * Cost of `extraUnits` at this rule's block price, rounding up to the
     * nearest whole step (e.g. step=10, unit_price=1.00, extraUnits=3 -> $1.00).
     */
    public function costFor(int $extraUnits): float
    {
        if ($extraUnits <= 0) {
            return 0.0;
        }

        $blocks = $this->round_up_partial_steps
            ? (int) ceil($extraUnits / $this->step_quantity)
            : $extraUnits / $this->step_quantity;

        return round($blocks * (float) $this->unit_price, 2);
    }
}
