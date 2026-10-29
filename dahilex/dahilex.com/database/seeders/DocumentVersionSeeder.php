<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentVersionSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $lindaDavis = User::where('email', 'linda_davis_' . $companyUser->id . '@example.com')->first();
            $documents = Document::where('created_by', $companyUser->id)
                ->orWhere('created_by', $lindaDavis ? $lindaDavis->id : null)
                ->get();

            if ($documents->count() > 0) {
                $demoImages = [
                    '/storage/media/a-advocate-saas-pic.png',
                    '/storage/media/b-advocate-saas-pic.png',
                    '/storage/media/c-advocate-saas-pic.png',
                    '/storage/media/d-advocate-saas-pic.png',
                    '/storage/media/e-advocate-saas-pic.png',
                    '/storage/media/f-advocate-saas-pic.png',
                    '/storage/media/g-advocate-saas-pic.png',
                    '/storage/media/h-advocate-saas-pic.png',
                    '/storage/media/i-advocate-saas-pic.png',
                    '/storage/media/j-advocate-saas-pic.png',
                    '/storage/media/k-advocate-saas-pic.png',
                    '/storage/media/client-advocate-saas-pic.png'
                ];

                $changeDescriptions = [
                    'Updated legal terms and conditions',
                    'Revised client information section',
                    'Final review and corrections',
                    'Added new clauses and provisions',
                    'Formatting and style improvements'
                ];

                // Create versions for Linda's documents with more detail
                if ($lindaDavis) {
                    $lindaDocs = Document::where('created_by', $lindaDavis->id)->get();
                    foreach ($lindaDocs as $document) {
                        $lindaChanges = [
                            'Initial draft created',
                            'Final version approved for distribution'
                        ];

                        foreach ($lindaChanges as $index => $change) {
                            DocumentVersion::create([
                                'document_id' => $document->id,
                                'version_number' => '1.' . $index + 1,
                                'file_path' => $demoImages[array_rand($demoImages)],
                                'changes_description' => $change,
                                'is_current' => $index === count($lindaChanges) - 1,
                                'created_by' => $lindaDavis->id,
                            ]);
                        }
                    }
                }

                // Create 2-3 versions per document
                foreach ($documents->where('created_by', $companyUser->id) as $document) {
                    $versionCount = rand(2, 3);

                    for ($i = 1; $i <= $versionCount; $i++) {
                        $versionNumber = '1.' . ($i);

                        DocumentVersion::create([
                            'document_id' => $document->id,
                            'version_number' => $versionNumber,
                            'file_path' => $demoImages[array_rand($demoImages)],
                            'changes_description' => $changeDescriptions[($i - 1) % count($changeDescriptions)],
                            'is_current' => $i === $versionCount,
                            'created_by' => $companyUser->id,
                        ]);
                    }
                }
            }
        }
    }
}
