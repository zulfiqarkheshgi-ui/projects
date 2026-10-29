<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('compliance_requirements', function (Blueprint $table) {
            $table->foreignId('regulatory_body_id')->nullable()->after('regulatory_body')->constrained('regulatory_bodies')->nullOnDelete();
        });

        // Migrate existing string values to FK by matching name and created_by
        DB::table('compliance_requirements')
            ->whereNotNull('regulatory_body')
            ->get(['id', 'regulatory_body', 'created_by'])
            ->each(function ($row) {
                $body = DB::table('regulatory_bodies')
                    ->where('name', $row->regulatory_body)
                    ->where('created_by', $row->created_by)
                    ->first(['id']);

                if ($body) {
                    DB::table('compliance_requirements')
                        ->where('id', $row->id)
                        ->update(['regulatory_body_id' => $body->id]);
                }
            });

        Schema::table('compliance_requirements', function (Blueprint $table) {
            $table->dropColumn('regulatory_body');
        });
    }

    public function down(): void
    {
        Schema::table('compliance_requirements', function (Blueprint $table) {
            $table->string('regulatory_body')->nullable()->after('regulatory_body_id');
        });

        // Restore string values from FK
        DB::table('compliance_requirements')
            ->whereNotNull('regulatory_body_id')
            ->get(['id', 'regulatory_body_id', 'created_by'])
            ->each(function ($row) {
                $body = DB::table('regulatory_bodies')
                    ->where('id', $row->regulatory_body_id)
                    ->where('created_by', $row->created_by)
                    ->first(['name']);

                if ($body) {
                    DB::table('compliance_requirements')
                        ->where('id', $row->id)
                        ->update(['regulatory_body' => $body->name]);
                }
            });

        Schema::table('compliance_requirements', function (Blueprint $table) {
            $table->dropForeign(['regulatory_body_id']);
            $table->dropColumn('regulatory_body_id');
        });
    }
};
