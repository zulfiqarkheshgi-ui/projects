<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\DocumentCategory;
use App\Models\DocumentVersion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $lindaDavis = User::where('email', 'linda_davis_' . $companyUser->id . '@example.com')->first();
            $categories = DocumentCategory::where('created_by', $companyUser->id)->get();

            if ($categories->count() > 0) {
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

                // Linda Davis specific documents
                if ($lindaDavis) {
                    $lindaDocs = [
                        ['name' => 'Case Strategy Memorandum', 'description' => 'Comprehensive case strategy and litigation plan', 'status' => 'final', 'confidentiality' => 'confidential', 'tags' => ['strategy', 'litigation', 'memo']],
                        ['name' => 'Evidence Summary Report', 'description' => 'Detailed summary of all case evidence and exhibits', 'status' => 'final', 'confidentiality' => 'internal', 'tags' => ['evidence', 'summary', 'exhibits']],
                        ['name' => 'Witness Interview Notes', 'description' => 'Compiled notes from witness interviews and depositions', 'status' => 'review', 'confidentiality' => 'confidential', 'tags' => ['witness', 'interview', 'deposition']],
                        ['name' => 'Legal Research Brief', 'description' => 'Research brief on applicable case law and statutes', 'status' => 'final', 'confidentiality' => 'internal', 'tags' => ['research', 'brief', 'case-law']],
                    ];

                    foreach ($lindaDocs as $docData) {
                        $document= Document::firstOrCreate(['name' => $docData['name'], 'created_by' => $lindaDavis->id], [
                            'description' => $docData['description'],
                            'category_id' => $categories->random()->id,
                            'file_path' => $demoImages[array_rand($demoImages)],
                            'status' => $docData['status'],
                            'confidentiality' => $docData['confidentiality'],
                            'tags' => $docData['tags'],
                            'created_by' => $lindaDavis->id,
                        ]);

                        if ($document->wasRecentlyCreated) {
                            DocumentVersion::create([
                                'document_id' => $document->id,
                                'version_number' => '1.0',
                                'file_path' => $demoImages[array_rand($demoImages)],
                                'changes_description' => $document->description,
                                'is_current' => false,
                                'created_by' => $document->created_by,
                            ]);
                        }
                    }
                }

                // Create 2-3 documents per company
                $documentCount = rand(20, 25);
                $documentNames = [
                    'Client Agreement Template',
                    'Legal Brief - Case Study',
                    'Evidence Documentation',
                    'Contract Review Document',
                    'Court Filing Motion',
                    'Research Memorandum',
                    'Settlement Agreement',
                    'Discovery Response',
                    'Non-Disclosure Agreement',
                    'Power of Attorney',
                    'Affidavit of Service',
                    'Demand Letter',
                    'Deposition Transcript',
                    'Subpoena Notice',
                    'Motion to Dismiss',
                    'Interrogatories Response',
                    'Expert Witness Report',
                    'Trial Preparation Checklist',
                    'Cease and Desist Letter',
                    'Retainer Agreement',
                    'Complaint Filing',
                    'Summary Judgment Brief',
                    'Mediation Statement',
                    'Appeal Notice',
                    'Injunction Application',
                    'Due Diligence Report',
                    'Intellectual Property Assignment',
                    'Confidentiality Agreement',
                ];

                $descriptions = [
                    'Standard client service agreement template',
                    'Legal brief for ongoing case',
                    'Compiled evidence for case documentation',
                    'Contract review and analysis document',
                    'Court filing motion and supporting documents',
                    'Legal research memorandum',
                    'Settlement agreement documentation',
                    'Discovery response and exhibits',
                    'Non-disclosure agreement protecting confidential information',
                    'Power of attorney document authorizing legal representation',
                    'Affidavit confirming service of legal process',
                    'Formal demand letter outlining client claims',
                    'Full transcript of deposition proceedings',
                    'Official notice of subpoena for records or testimony',
                    'Motion requesting court dismissal of claims',
                    'Detailed responses to opposing party interrogatories',
                    'Technical expert witness analysis and opinion report',
                    'Comprehensive checklist for trial preparation tasks',
                    'Cease and desist letter for unauthorized activities',
                    'Signed retainer agreement outlining scope of legal services',
                    'Initial complaint filed with the court',
                    'Brief supporting motion for summary judgment',
                    'Position statement prepared for mediation proceedings',
                    'Formal notice of intent to appeal court ruling',
                    'Application for emergency injunctive relief',
                    'Due diligence report for corporate transaction review',
                    'Assignment of intellectual property rights agreement',
                    'Confidentiality agreement for sensitive case materials',
                ];

                $statuses = ['draft', 'review', 'final', 'archived'];
                $confidentialities = ['public', 'internal', 'confidential', 'restricted'];

                for ($i = 1; $i <= $documentCount; $i++) {
                    $documentData = [
                        'name' => $documentNames[($companyUser->id + $i - 1) % count($documentNames)],
                        'description' => $descriptions[($companyUser->id + $i - 1) % count($descriptions)] . ' for ' . $companyUser->name . '.',
                        'category_id' => $categories->random()->id,
                        'file_path' => $demoImages[array_rand($demoImages)],
                        'status' => $statuses[rand(0, count($statuses) - 1)],
                        'confidentiality' => $confidentialities[rand(0, count($confidentialities) - 1)],
                        'tags' => ['document', 'legal', 'case ' . $i],
                        'created_by' => $companyUser->id,
                    ];

                    $document = Document::firstOrCreate([
                        'name' => $documentData['name'],
                        'created_by' => $companyUser->id
                    ], $documentData);

                    if ($document->wasRecentlyCreated) {
                        DocumentVersion::create([
                            'document_id' => $document->id,
                            'version_number' => '1.0',
                            'file_path' => $demoImages[array_rand($demoImages)],
                            'changes_description' => $document->description,
                            'is_current' => false,
                            'created_by' => $document->created_by,
                        ]);
                    }

                    // Create document permissions for client users
                    // $clientUsers = User::where('created_by', $companyUser->id)
                    //     ->where('type', 'client')
                    //     ->take(2) // Limit to 2 clients for performance
                    //     ->get();

                    // foreach ($clientUsers as $clientUser) {
                    //     \App\Models\DocumentPermission::firstOrCreate([
                    //         'document_id' => $document->id,
                    //         'user_id' => $clientUser->id
                    //     ], [
                    //         'permission_type' => 'view',
                    //         'expires_at' => null,
                    //         'created_by' => $companyUser->id
                    //     ]);
                    // }
                }
            }
        }
    }
}
