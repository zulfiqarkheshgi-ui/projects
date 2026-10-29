<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per renewal (or initial subscribe). This is the frozen bill for
 * that cycle: base plan price + a line-item breakdown of every add-on
 * charged, so a tenant's invoice history is stable even as pricing rules
 * and quantities change going forward. Optionally links to `invoices` if/when
 * an actual invoice document is generated from it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_billing_cycles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tenant_subscription_id')->constrained('tenant_subscriptions')->cascadeOnDelete();
            $table->unsignedBigInteger('invoice_id')->nullable(); // FK to existing `invoices` table, if generated

            $table->date('period_start');
            $table->date('period_end');

            $table->decimal('base_plan_amount', 10, 2);

            // Snapshot array: [{ feature_key, name, quantity, step_quantity,
            // unit_price, line_total }, ...]
            $table->json('addon_breakdown');

            $table->decimal('addon_total', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);

            $table->enum('status', ['scheduled', 'invoiced', 'paid', 'failed'])->default('scheduled');

            $table->timestamps();

            $table->index(
                ['tenant_subscription_id', 'period_start'],
                'sub_billing_cycles_tenant_period_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_billing_cycles');
    }
};
