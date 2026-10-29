<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\DocumentPermission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $lindaDavis = User::where('email', 'linda.davis_' . $companyUser->id . '@example.com')->first();
            $documents = Document::where('created_by', $companyUser->id)
                ->orWhere('created_by', $lindaDavis ? $lindaDavis->id : null)
                ->get();
            $users = User::where('created_by', $companyUser->id)->get();

            if ($documents->count() > 0 && $users->count() > 0) {
                // Linda Davis specific permissions - grant her access to company documents
                if ($lindaDavis) {
                    $companyDocs = Document::where('created_by', $companyUser->id)->take(2)->get();
                    foreach ($companyDocs as $doc) {
                        DocumentPermission::firstOrCreate(['document_id' => $doc->id, 'user_id' => $lindaDavis->id, 'permission_type' => 'edit', 'created_by' => $companyUser->id], [
                            'expires_at' => null,
                            'created_by' => $companyUser->id
                        ]);
                    }

                    // Grant team members access to Linda's documents
                    $lindaDocs = Document::where('created_by', $lindaDavis->id)->get();
                    $teamMembers = User::where('created_by', $companyUser->id)->where('type', 'team_member')->where('id', '!=', $lindaDavis->id)->take(1)->get();
                    foreach ($lindaDocs as $doc) {
                        foreach ($teamMembers as $member) {
                            DocumentPermission::firstOrCreate(['document_id' => $doc->id, 'user_id' => $member->id, 'permission_type' => 'view', 'created_by' => $lindaDavis->id], [
                                'expires_at' => null,
                                'created_by' => $lindaDavis->id
                            ]);
                        }
                    }
                }

                // Create 2-3 document permissions per company
                $permissionCount = rand(4, 6);
                $permissionTypes = ['view', 'edit', 'download', 'comment'];

                for ($i = 1; $i <= $permissionCount; $i++) {
                    $document = $documents->random();
                    $user = $users->random();
                    $permissionType = $permissionTypes[rand(0, count($permissionTypes) - 1)];

                    DocumentPermission::firstOrCreate([
                        'document_id' => $document->id,
                        'user_id' => $user->id,
                        'permission_type' => $permissionType
                    ], [
                        'created_by' => $companyUser->id,
                        'document_id' => $document->id,
                        'user_id' => $user->id,
                        'permission_type' => $permissionType,
                        'expires_at' => rand(1, 10) > 7 ? now()->addMonths(rand(3, 12)) : null, // 30% chance of expiration
                        'created_by' => $companyUser->id
                    ]);
                }
            }
        }
    }
}
