<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\ClientType;
use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $isDemo = config('app.is_demo', true);

        // Get company users
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            // Create client role for this company
            $clientRole = Role::firstOrCreate([
                'name' => 'client',
                'guard_name' => 'web',
                'created_by' => $companyUser->id
            ], [
                'label' => 'Client',
                'description' => 'Client with limited access to their cases and documents'
            ]);

             $permissions = [
            'create-document-comments',
            'manage-any-documents',
            'manage-any-document-versions',
            'manage-any-document-comments',
            'manage-any-case-types',
            'manage-any-case-statuses',
            'manage-any-courts',
            'manage-any-document-types',
            'manage-any-expense-categories',
            'manage-any-task-types',
            'manage-any-research-types',
            'manage-any-document-categories',
            'manage-any-research-sources',
            'manage-any-event-types',
            'manage-any-task-statuses',
            'manage-case-timelines',
            'manage-case-documents',
            'manage-case-tasks',
            'manage-cases',
            'manage-client-documents',
            'manage-dashboard',
            'manage-hearings',
            'manage-time-entries',
            'manage-expenses',
            'manage-invoices',
            'manage-payments',
            'manage-documents',
            'manage-document-versions',
            'manage-document-comments',
            'manage-messages',
            'manage-calendar',
            'manage-own-audit-types',
            'manage-own-client-documents',
            'manage-own-cases',
            'manage-own-clients',
            'manage-own-expenses',
            'manage-own-hearings',
            'manage-own-time-entries',
            'manage-own-invoices',
            'manage-own-payments',
            'manage-own-documents',
            'manage-own-document-versions',
            'manage-own-document-comments',
            'manage-own-research-citations',
            'manage-own-research-notes',
            'manage-own-research-projects',
            'manage-own-task-comments',
            'manage-own-tasks',
            'manage-own-case-timelines',
            'manage-own-case-team-members',
            'manage-own-case-documents',
            'manage-own-case-tasks',
            'manage-own-users',
            'manage-research-citations',
            'manage-research-notes',
            'manage-research-projects',
            'manage-own-calendar',
            'manage-task-comments',
            'manage-tasks',
            'send-messages',
            'view-case-documents',
            'view-cases',
            'view-case-timelines',
            'view-case-notes',
            'view-client-documents',
            'view-hearings',
            'view-time-entries',
            'view-expenses',
            'view-invoices',
            'view-payments',
            'view-documents',
            'view-document-versions',
            'view-document-comments',
            'view-messages',
            'view-research-citations',
            'view-research-notes',
            'view-research-projects',
            'view-task-comments',
            'view-tasks',
            'download-document-versions',
            'download-client-documents',
            'download-case-documents',
            'download-documents'
        ];
            $existingPermissions = \Spatie\Permission\Models\Permission::whereIn('name', $permissions)
                ->where('guard_name', 'web')
                ->get();
            $clientRole->syncPermissions($existingPermissions);

            // Get client types for this company
            $clientTypes = ClientType::where('created_by', $companyUser->id)->get();

            // Create default client types if none exist
            if ($clientTypes->count() === 0) {
                $defaultTypes = [];
                if ($isDemo) {
                    $defaultTypes = [
                        ['name' => 'Individual', 'description' => 'Individual clients']
                    ];
                } else {
                    $defaultTypes = [
                        ['name' => 'Individual', 'description' => 'Individual clients'],
                        ['name' => 'Corporate', 'description' => 'Corporate clients']
                    ];
                }

                foreach ($defaultTypes as $typeData) {
                    ClientType::create([
                        'name' => $typeData['name'],
                        'description' => $typeData['description'],
                        'status' => 'active',
                        'created_by' => $companyUser->id
                    ]);
                }

                $clientTypes = ClientType::where('created_by', $companyUser->id)->get();
            }

            if ($clientTypes->count() > 0) {
                // Create 3-5 clients for each company
                $clientCount = $isDemo ? rand(3, 5) : 1;
                $clientNames = [
                    'John Smith',
                    'Sarah Johnson',
                    'Michael Brown',
                    'Emily Davis',
                    'David Wilson',
                    'Lisa Anderson',
                    'Robert Taylor',
                    'Jennifer Martinez',
                    'William Garcia',
                    'Mary Rodriguez'
                ];

                $totalClients=Client::where('created_by',$companyUser->id)->count();

                if($totalClients > 0){
                    continue;
                }

                for ($i = 1; $i <= $clientCount; $i++) {
                    $clientType = $clientTypes->random();
                    $isCorporate = $clientType->name === 'Corporate';
                    $clientName = $clientNames[($companyUser->id + $i - 1) % count($clientNames)];

                    $email = strtolower(str_replace(' ', '_', $clientName)) . '_' . $companyUser->id . '@example.com';

                    $clientData = [
                        'name' => $clientName,
                        'email' => $email,
                        'phone' => '+1-555-' . str_pad($companyUser->id . $i, 4, '0', STR_PAD_LEFT),
                        'address' => ($i * 100) . ' Main St, New York, NY 1000' . $i,
                        'client_type_id' => $clientType->id,
                        'status' => ($clientName === 'Lisa Anderson' || $clientName === 'Michael Brown') ? 'active' : (rand(1, 10) > 8 ? 'inactive' : 'active'),
                        'company_name' => $isCorporate ? $clientNames[($companyUser->id + $i - 1) % count($clientNames)] . ' Corp' : null,
                        'tax_id' => $isCorporate ? 'TAX' . str_pad($companyUser->id . $i, 6, '0', STR_PAD_LEFT) : null,
                        'tax_rate' => rand(0, 15) / 100, // 0% to 15% tax rate
                        'date_of_birth' => !$isCorporate ? '198' . rand(0, 9) . '-' . str_pad(rand(1, 12), 2, '0', STR_PAD_LEFT) . '-' . str_pad(rand(1, 28), 2, '0', STR_PAD_LEFT) : null,
                        'referral_source' => ['Website', 'Referral', 'Advertisement', 'Social Media', 'Word of Mouth', 'Legal Directory'][rand(0, 5)],
                        'notes' => 'Client #' . $i . ' for ' . $companyUser->name . '. ' . ($isCorporate ? 'Corporate client with business needs.' : 'Individual client seeking legal assistance.'),
                    ];

                    // Create client record
                    $client = Client::firstOrCreate([
                        'email' => $clientData['email'],
                        'created_by' => $companyUser->id
                    ], [
                        ...$clientData,
                        'created_by' => $companyUser->id,
                    ]);

                    // Create client user account
                    $clientUser = User::updateOrCreate([
                        'email' => $clientData['email']
                    ], [
                        'name' => $clientData['name'],
                        'password' => Hash::make('password'),
                        'type' => 'client',
                        'lang' => $companyUser->lang ?? 'en',
                        'status' => 'active',
                        'referral_code' => 0,
                        'created_by' => $companyUser->id
                    ]);

                    $clientUser->roles()->sync([$clientRole->id]);
                }
            }
        }
    }
}
