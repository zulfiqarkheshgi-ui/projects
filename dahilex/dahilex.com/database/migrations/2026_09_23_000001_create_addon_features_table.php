<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalog of features that can be sold as metered add-ons on top of a base plan
 * (team members, cases, clients, storage, etc). This is the row a Super Admin
 * edits when they add a brand-new sellable add-on without touching code.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addon_features', function (Blueprint $table) {
            $table->id();

            // Stable machine key referenced from code, e.g. "team_members", "cases",
            // "clients", "storage_gb". Never renamed once shipped.
            $table->string('key', 100)->unique();

            // Human label shown in the Super Admin panel and on invoices.
            $table->string('name', 150);
            $table->string('unit_label', 50)->default('unit'); // "member", "case", "GB"...

            // Which column on `users` (or wherever quotas live) this feature's
            // effective limit maps to at runtime, e.g. "max_users".
            $table->string('base_limit_column', 100)->nullable();

            // Whether this feature can currently be purchased as an add-on at all.
            $table->boolean('is_active')->default(true);

            // Whether partial quantities are allowed to be scheduled down to zero
            // (cancel) vs. only ever decreased to the plan's included quota.
            $table->boolean('allow_cancel_to_zero')->default(true);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addon_features');
    }
};
