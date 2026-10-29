<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One active subscription per tenant (a `users` row with type = 'company').
 * Replaces the loose `plan_id` / `plan_expire_date` pair on `users` with a
 * proper billing-period record. `users.plan_id` / `plan_expire_date` can stay
 * as a denormalized cache for fast middleware checks, kept in sync by the
 * AddOnBillingService — see the architecture doc.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_subscriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // the tenant/company owner
            $table->foreignId('plan_id')->constrained('plans');

            $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly');
            $table->enum('status', ['trialing', 'active', 'past_due', 'cancelled'])->default('active');

            // Current billing period. `next_billing_date` is the date the
            // scheduler treats as "renewal day" — where scheduled add-on
            // decreases/cancellations actually take effect.
            $table->date('current_period_start');
            $table->date('current_period_end');
            $table->date('next_billing_date');

            // Snapshot of what the base plan cost at subscribe time, so a
            // later change to `plans.price` doesn't retroactively reprice
            // an existing subscriber without an explicit migration.
            $table->decimal('base_plan_price_snapshot', 10, 2);

            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'next_billing_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_subscriptions');
    }
};
