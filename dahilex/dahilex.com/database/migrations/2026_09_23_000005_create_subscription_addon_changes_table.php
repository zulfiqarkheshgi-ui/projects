<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Append-only log / queue of every add-on change a tenant has requested.
 *
 * - "increase" rows are applied immediately (both `applied_at` and
 *   `effective_at` are set at creation time) and billed on the spot.
 * - "decrease" and "cancel" rows are created with `effective_at` = the
 *   subscription's next_billing_date and `applied_at` = null. The nightly
 *   renewal job finds every unapplied row whose effective_at has arrived,
 *   applies it, and stamps applied_at. Until then the tenant keeps the
 *   higher `active_quantity` in `subscription_addons`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_addon_changes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tenant_subscription_id')->constrained('tenant_subscriptions')->cascadeOnDelete();
            $table->foreignId('addon_feature_id')->constrained('addon_features');

            $table->enum('change_type', ['increase', 'decrease', 'cancel']);

            $table->unsignedInteger('from_quantity');
            $table->unsignedInteger('to_quantity');

            // Cost impact of this change. Positive for increases (charged
            // immediately, possibly prorated — see service). Always 0 for
            // decrease/cancel rows, since no refund is issued for the
            // remainder of a paid cycle.
            $table->decimal('charge_amount', 10, 2)->default(0);
            $table->boolean('was_prorated')->default(false);

            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('effective_at'); // when it takes effect
            $table->timestamp('applied_at')->nullable(); // when the scheduler actually applied it

            $table->enum('status', ['pending', 'applied', 'superseded', 'cancelled'])->default('pending');

            $table->unsignedBigInteger('requested_by')->nullable();
            $table->timestamps();

            $table->index(['status', 'effective_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_addon_changes');
    }
};
