<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\User;
use Spatie\Permission\Models\Permission;

class ClientRoleSeeder extends Seeder
{
    public function run(): void
    {
        $companyUser = auth()->check() && auth()->user()->type === 'company'
            ? auth()->user()
            : User::where('type', 'company')->first();

        if (!$companyUser) {
            throw new \Exception('No company user found');
        }

        $clientRole = Role::firstOrCreate([
            'name' => 'client',
            'guard_name' => 'web'
        ], [
            'label' => 'Client',
            'description' => 'Client with limited access to their own data',
            'created_by' => $companyUser->id
        ]);

        $permissions = [
            'create-documents',
            'delete-case-types',
            'delete-client-documents',
            'delete-expense-categories',
            'delete-messages',
            'delete-risk-assessments',
            'edit-case-tasks',
            'edit-documents',
            'edit-expense-categories',
            'edit-expenses',
            'manage-any-documents',
            'manage-case-documents',
            'manage-case-tasks',
            'manage-cases',
            'manage-client-documents',
            'manage-clients',
            'manage-dashboard',
            'manage-hearings',
            'manage-messages',
            'manage-own-audit-types',
            'manage-own-case-documents',
            'manage-own-case-tasks',
            'manage-own-cases',
            'manage-own-client-documents',
            'manage-own-clients',
            'manage-own-expense-categories',
            'manage-own-expenses',
            'manage-own-hearings',
            'manage-own-research-citations',
            'manage-own-research-notes',
            'manage-own-research-projects',
            'manage-own-task-comments',
            'manage-own-tasks',
            'manage-research-citations',
            'manage-research-notes',
            'manage-research-projects',
            'manage-task-comments',
            'manage-tasks',
            'reset-client-password',
            'send-messages',
            'toggle-status-practice-areas',
            'view-case-documents',
            'view-case-types',
            'view-cases',
            'view-client-documents',
            'view-clients',
            'view-hearings',
            'view-messages',
            'view-research-citations',
            'view-research-notes',
            'view-research-projects',
            'view-task-comments',
            'view-tasks'
        ];

        $existingPermissions = Permission::whereIn('name', $permissions)->get();
        $clientRole->syncPermissions($existingPermissions);
    }
}
