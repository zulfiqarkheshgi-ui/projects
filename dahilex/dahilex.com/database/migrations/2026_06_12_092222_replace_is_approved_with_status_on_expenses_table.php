<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('is_billable');
        });

        // Migrate data: is_approved=true → 'approved', false → 'pending'
        DB::statement("UPDATE expenses SET status = CASE WHEN is_approved = 1 THEN 'approved' ELSE 'pending' END");

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('is_approved');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->boolean('is_approved')->default(false)->after('is_billable');
        });

        DB::statement("UPDATE expenses SET is_approved = CASE WHEN status = 'approved' THEN 1 ELSE 0 END");

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
