<?php

namespace Database\Seeders;

use App\Models\AddonFeature;
use App\Models\AddonPricingRule;
use Illuminate\Database\Seeder;

/**
 * One-time seed of the sellable add-on catalog and its starting block rates.
 * Safe to re-run: uses updateOrCreate on the feature key, and only inserts a
 * new pricing rule if the current one differs (won't spam versions).
 *
 * ADJUST THE PLACEHOLDER RATES for `clients` and `storage_gb` before running
 * against production — only `team_members` and `cases` rates were given in
 * the spec.
 */
class AddonFeatureSeeder extends Seeder
{
    public function run(): void
    {
        $features = [
            [
                'key' => 'team_members',
                'name' => 'Team Member',
                'unit_label' => 'member',
                'base_limit_column' => 'max_users',
                'step_quantity' => 1,
                'unit_price' => 1.00,
            ],
            [
                'key' => 'cases',
                'name' => 'Case',
                'unit_label' => 'case',
                'base_limit_column' => 'max_cases',
                'step_quantity' => 10,
                'unit_price' => 1.00,
            ],
            [
                'key' => 'clients',
                'name' => 'Client',
                'unit_label' => 'client',
                'base_limit_column' => 'max_clients',
                'step_quantity' => 10,   // placeholder — confirm with Super Admin
                'unit_price' => 1.00,    // placeholder — confirm with Super Admin
            ],
            [
                'key' => 'storage_gb',
                'name' => 'Storage',
                'unit_label' => 'GB',
                'base_limit_column' => 'storage_limit',
                'step_quantity' => 5,    // placeholder — confirm with Super Admin
                'unit_price' => 1.00,    // placeholder — confirm with Super Admin
            ],
        ];

        foreach ($features as $row) {
            $feature = AddonFeature::updateOrCreate(
                ['key' => $row['key']],
                [
                    'name' => $row['name'],
                    'unit_label' => $row['unit_label'],
                    'base_limit_column' => $row['base_limit_column'],
                    'is_active' => true,
                    'allow_cancel_to_zero' => true,
                ]
            );

            foreach (['monthly', 'yearly'] as $cycle) {
                $existing = $feature->pricingRules()
                    ->whereNull('plan_id')
                    ->where('billing_cycle', $cycle)
                    ->where('is_current', true)
                    ->first();

                $unitPrice = $cycle === 'yearly'
                    ? round($row['unit_price'] * 10, 2) // 2 months free, same convention as plans.yearly_price
                    : $row['unit_price'];

                if ($existing
                    && (float) $existing->unit_price === (float) $unitPrice
                    && (int) $existing->step_quantity === (int) $row['step_quantity']
                ) {
                    continue; // rate unchanged, don't create a duplicate version
                }

                $existing?->update(['is_current' => false]);

                AddonPricingRule::create([
                    'addon_feature_id' => $feature->id,
                    'plan_id' => null, // global default, applies to every plan
                    'billing_cycle' => $cycle,
                    'step_quantity' => $row['step_quantity'],
                    'unit_price' => $unitPrice,
                    'round_up_partial_steps' => true,
                    'effective_from' => now(),
                    'is_current' => true,
                ]);
            }
        }
    }
}
