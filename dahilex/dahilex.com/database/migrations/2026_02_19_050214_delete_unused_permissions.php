<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('permissions')->whereIn('name', [
            'start-timer',
            'stop-timer',
            'edit-media',
            'assign-tasks',
            'view-calendar',
            'manage-own-messages',
            'manage-any-messages',
            'view-task-statuses'
        ])->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('permissions')->insert([
            ['name' => 'start-timer', 'module' => 'time_entries', 'label' => 'Start Timer', 'description' => 'Can start time tracking timer', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'stop-timer', 'module' => 'time_entries', 'label' => 'Stop Timer', 'description' => 'Can stop time tracking timer', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'edit-media', 'module' => 'media', 'label' => 'Edit media', 'description' => 'Edit media', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'assign-tasks', 'module' => 'tasks', 'label' => 'Assign Tasks', 'description' => 'Can assign tasks to users', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'manage-any-messages', 'module' => 'messages', 'label' => 'Manage All Messages', 'description' => 'Manage Any Messages', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'manage-own-messages', 'module' => 'messages', 'label' => 'Manage Own Messages', 'description' => 'Manage Limited Messages that is created by own', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'view-calendar', 'module' => 'calendar', 'label' => 'View Calendar', 'description' => 'View Calendar', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'view-task-statuses', 'module' => 'task_statuses', 'label' => 'View Task Statuses', 'description' => 'View Task Statuses','guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()]
        ]);
    }
};
