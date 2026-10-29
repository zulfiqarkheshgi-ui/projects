<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('document_types') && Schema::hasColumn('document_types', 'description')) {
            Schema::table('document_types', function (Blueprint $table) {
                $table->text('description')->nullable()->change();
            });
        }

        if (Schema::hasTable('event_types') && Schema::hasColumn('event_types', 'description')) {
            Schema::table('event_types', function (Blueprint $table) {
                $table->text('description')->nullable()->change();
            });
        }

        if (Schema::hasTable('court_types') && Schema::hasColumn('court_types', 'description')) {
            Schema::table('court_types', function (Blueprint $table) {
                $table->text('description')->nullable()->change();
            });
        }

        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'description')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->text('description')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('document_types') && Schema::hasColumn('document_types', 'description')) {
            Schema::table('document_types', function (Blueprint $table) {
                $table->string('description')->nullable()->change();
            });
        }

        if (Schema::hasTable('event_types') && Schema::hasColumn('event_types', 'description')) {
            Schema::table('event_types', function (Blueprint $table) {
                $table->string('description')->nullable()->change();
            });
        }

        if (Schema::hasTable('court_types') && Schema::hasColumn('court_types', 'description')) {
            Schema::table('court_types', function (Blueprint $table) {
                $table->string('description')->nullable()->change();
            });
        }

        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'description')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->string('description')->change();
            });
        }
    }
};
