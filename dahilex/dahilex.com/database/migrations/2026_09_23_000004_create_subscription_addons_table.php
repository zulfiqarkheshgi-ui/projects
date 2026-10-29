<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The tenant's CURRENT, in-force add-on allocation per feature. There is at
 * most one row per (subscription, feature). `active_quantity` is what the
 * app should enforce as the extra allowance *right now*, for the rest of
 * the current billing cycle, regardless of any decrease the tenant has
 * already scheduled. `pending_quantity` mirrors the latest requested value
 * and is what will become `active_quantity` at the next renewal — it is a
 * convenience read-cache of the queue in `subscription_addon_changes`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_addons', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tenant_subscription_id')->constrained('tenant_subscriptions')->cascadeOnDelete();
            $table->foreignId('addon_feature_id')->constrained('addon_features');

            // Extra units the tenant is entitled to use for the rest of the
            // active cycle (already paid for).
            $table->unsignedInteger('active_quantity')->default(0);

            // What active_quantity will become at the next renewal, once any
            // scheduled change is applied. Kept equal to active_quantity when
            // there is no pending change.
            $table->unsignedInteger('pending_quantity')->default(0);

            // Rate actually being charged this cycle, snapshotted from
            // addon_pricing_rules at the time it was applied — so historical
            // cost is stable even if the admin edits pricing mid-cycle.
            $table->unsignedInteger('step_quantity_snapshot')->default(1);
            $table->decimal('unit_price_snapshot', 10, 2)->default(0);

            $table->timestamps();

            $table->unique(
                ['tenant_subscription_id', 'addon_feature_id'],
                'subscription_addons_tenant_feature_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_addons');
    }
};
