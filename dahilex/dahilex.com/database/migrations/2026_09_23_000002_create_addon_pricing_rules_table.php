<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The actual "block rate" a Super Admin configures per feature:
 * e.g. $1.00 per 1 extra Team Member, $1.00 per 10 extra Cases.
 *
 * Rules are versioned (never edited in place, only superseded) so that
 * subscriptions already billed under an old rate are unaffected when the
 * Super Admin changes pricing tomorrow. `effective_from` + `is_current`
 * let the resolver find "the rate in force right now" per feature/plan/cycle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addon_pricing_rules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('addon_feature_id')->constrained('addon_features')->cascadeOnDelete();

            // Null = applies to every plan. A plan_id row overrides the global
            // (null) rule for that specific plan when both exist.
            $table->unsignedBigInteger('plan_id')->nullable();
            $table->foreign('plan_id')->references('id')->on('plans')->cascadeOnDelete();

            $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly');

            // Step quantity = block size, e.g. 1 (team member) or 10 (cases).
            $table->unsignedInteger('step_quantity');

            // Price charged per full step of `step_quantity` units.
            $table->decimal('unit_price', 10, 2);

            // Extra units are always rounded UP to the nearest whole step
            // when calculating cost (e.g. 3 extra cases with step=10 still
            // costs one full $1.00 block). This flag exists so an admin can
            // flip to proportional pricing for a feature later without a
            // schema change.
            $table->boolean('round_up_partial_steps')->default(true);

            $table->timestamp('effective_from')->useCurrent();
            $table->boolean('is_current')->default(true);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['addon_feature_id', 'plan_id', 'billing_cycle', 'is_current'], 'addon_rate_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addon_pricing_rules');
    }
};
