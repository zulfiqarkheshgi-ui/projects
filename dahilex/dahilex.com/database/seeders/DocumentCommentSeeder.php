<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\DocumentComment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentCommentSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $lindaDavis = User::where('email', 'linda_davis_' . $companyUser->id . '@example.com')->first();
            $documents = Document::where('created_by', $companyUser->id)
                ->orWhere('created_by', $lindaDavis ? $lindaDavis->id : null)
                ->get();

            $teamMembers = User::where('created_by', $companyUser->id)
                ->whereNotIn('type', ['client'])
                ->get();

            // Linda Davis specific comments
            if ($lindaDavis && $documents->count() > 0) {
                $lindaDocs = Document::where('created_by', $lindaDavis->id)->get();
                $lindaComments = [
                    'Reviewed and approved for case filing',
                    'Evidence documentation is comprehensive',
                    'Ready for client review and approval',
                ];

                foreach ($lindaDocs->take(3) as $index => $doc) {
                    DocumentComment::create([
                        'document_id' => $doc->id,
                        'comment_text' => $lindaComments[$index],
                        'is_resolved' => $index < 2,
                        'created_by' => $lindaDavis->id,
                    ]);
                }
            }

            if ($documents->count() > 0 && $teamMembers->count() > 0) {
                $commentTexts = [
                    'Please review the terms in section 3',
                    'This looks good, approved for final version',
                    'Need to update the client information',
                    'Consider revising the payment terms',
                    'Legal review completed successfully',
                    'Minor formatting issues need correction',
                    'Content approved for client distribution',
                    'Requires additional legal clauses'
                ];

                // Create 1-2 comments per document
                foreach ($documents as $document) {
                    $commentCount = rand(1, 2);

                    for ($i = 1; $i <= $commentCount; $i++) {
                        DocumentComment::create([
                            'document_id' => $document->id,
                            'comment_text' => $commentTexts[array_rand($commentTexts)],
                            'is_resolved' => rand(1, 10) > 6,
                            'created_by' => $teamMembers->random()->id,
                        ]);
                    }
                }
            }
        }
    }
}
