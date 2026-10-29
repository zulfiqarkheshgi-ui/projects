<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;

class TeamMemberRoleSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        if ($companyUsers->isEmpty()) {
            throw new \Exception('No company users found');
        }

        $permissions = [
            'create-case-documents',
            'create-case-notes',
            'create-case-timelines',
            'create-cases',
            'create-clients',
            'create-document-comments',
            'create-document-versions',
            'create-documents',
            'create-expenses',
            'create-hearings',
            'create-knowledge-articles',
            'create-legal-precedents',
            'create-media',
            'create-research-notes',
            'create-research-projects',
            'create-task-comments',
            'create-time-entries',
            'delete-case-documents',
            'delete-case-notes',
            'delete-case-timelines',
            'delete-document-comments',
            'delete-documents',
            'delete-expenses',
            'delete-hearings',
            'delete-knowledge-articles',
            'delete-legal-precedents',
            'delete-media',
            'delete-messages',
            'delete-research-notes',
            'delete-research-projects',
            'delete-task-comments',
            'delete-time-entries',
            'download-case-documents',
            'download-document-versions',
            'download-documents',
            'download-media',
            'edit-case-documents',
            'edit-case-notes',
            'edit-case-timelines',
            'edit-clients',
            'edit-document-comments',
            'edit-documents',
            'edit-expenses',
            'edit-hearings',
            'edit-cases',
            'edit-knowledge-articles',
            'edit-legal-precedents',
            'edit-research-notes',
            'edit-research-projects',
            'edit-task-comments',
            'edit-time-entries',
            'manage-any-event-types',
            'manage-any-expense-categories',
            'manage-any-client-types',
            'manage-any-case-types',
            'manage-any-case-statuses',
            'manage-any-task-types',
            'manage-any-task-statuses',
            'manage-any-courts',
            'manage-any-judges',
            'manage-any-hearing-types',
            'manage-any-document-types',
            'manage-any-research-types',
            'manage-any-research-categories',
            'manage-any-document-categories',
            'manage-calendar',
            'manage-case-documents',
            'manage-case-notes',
            'manage-case-timelines',
            'manage-cases',
            'manage-clients',
            'manage-dashboard',
            'manage-document-comments',
            'manage-document-versions',
            'manage-documents',
            'manage-expenses',
            'manage-hearings',
            'manage-knowledge-articles',
            'manage-legal-precedents',
            'manage-media',
            'manage-messages',
            'manage-own-calendar',
            'manage-own-cases',
            'manage-own-clients',
            'manage-own-document-comments',
            'manage-own-document-versions',
            'manage-own-documents',
            'manage-own-expenses',
            'manage-own-hearings',
            'manage-own-knowledge-articles',
            'manage-own-legal-precedents',
            'manage-own-media',
            // 'manage-own-messages',
            'manage-own-research-notes',
            'manage-own-research-projects',
            'manage-own-task-comments',
            'manage-own-tasks',
            'manage-own-time-entries',
            'manage-own-case-timelines',
            'manage-own-case-team-members',
            'manage-own-case-documents',
            'manage-own-case-notes',
            'manage-own-users',
            'manage-research-notes',
            'manage-research-projects',
            'manage-task-comments',
            'manage-tasks',
            'manage-time-entries',
            'send-messages',
            'toggle-status-tasks',
            'toggle-status-cases',
            'view-case-documents',
            'view-case-notes',
            'view-case-timelines',
            'view-cases',
            'view-clients',
            'view-document-comments',
            'view-document-versions',
            'view-documents',
            'view-expenses',
            'view-hearings',
            'view-knowledge-articles',
            'view-legal-precedents',
            'view-media',
            'view-messages',
            'view-research-notes',
            'view-research-projects',
            'view-task-comments',
            'view-tasks',
            'view-time-entries'
        ];

        foreach ($companyUsers as $companyUser) {
            $teamRole = Role::firstOrCreate([
                'name' => 'team_member',
                'guard_name' => 'web',
                'created_by' => $companyUser->id
            ], [
                'label' => 'Team Member',
                'description' => 'Team member with limited access to company modules'
            ]);

            $existingPermissions = Permission::whereIn('name', $permissions)->get();
            $teamRole->syncPermissions($existingPermissions);

            $isDemo = config('app.is_demo', true);

            if ($isDemo) {
                // Demo mode - create multiple team members
                $teamMembers = [
                    ['name' => 'Alex Johnson', 'email' => 'alex.johnson', 'status' => 'active'],
                    ['name' => 'Maria Garcia', 'email' => 'maria.garcia', 'status' => 'active'],
                    ['name' => 'James Wilson', 'email' => 'james.wilson', 'status' => 'active'],
                    ['name' => 'Linda Davis', 'email' => 'linda.davis', 'status' => 'active'],
                    ['name' => 'Robert Brown', 'email' => 'robert.brown', 'status' => 'inactive']
                ];
            } else {
                // Main/Production mode - create minimal team members
                $teamMembers = [
                    ['name' => 'Team Member', 'email' => 'team.member', 'status' => 'active']
                ];
            }

            $teamMembers=User::where('created_by',$companyUser->id)->count();
            if($teamMembers > 0){
                continue;
            }

            foreach ($teamMembers as $memberInfo) {
                $email = $memberInfo['email'] . '_' . $companyUser->id . '@example.com';

                $teamMember = User::updateOrCreate([
                    'email' => $email
                ], [
                    'name' => $memberInfo['name'],
                    'password' => Hash::make('password'),
                    'type' => 'team_member',
                    'lang' => $companyUser->lang ?? 'en',
                    'status' => $memberInfo['status'],
                    'created_by' => $companyUser->id
                ]);

                $teamMember->assignRole($teamRole);
            }
        }
    }
}
