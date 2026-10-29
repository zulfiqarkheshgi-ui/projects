<?php

namespace Database\Seeders;

use App\Models\LegalPrecedent;
use App\Models\ResearchCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LegalPrecedentSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();
        
        foreach ($companyUsers as $companyUser) {
            $lindaDavis = User::where('email', 'linda.davis_' . $companyUser->id . '@example.com')->first();
            $categories = ResearchCategory::where('created_by', $companyUser->id)->get();
            
            // Linda Davis specific precedents
            if ($lindaDavis) {
                $lindaPrecedents = [
                    ['case_name' => 'Smith v. Johnson', 'citation' => '245 F.3d 789 (2020)', 'jurisdiction' => 'United States', 'summary' => 'Contract interpretation case establishing modern standards for ambiguous contract terms and parol evidence rule application.', 'relevance_score' => 9, 'decision_date' => '2020-03-15', 'court_level' => 'Court of Appeals', 'key_points' => ['Contract interpretation', 'Ambiguity', 'Parol evidence', 'Intent'], 'status' => 'active'],
                    ['case_name' => 'Anderson v. Metropolitan Corp', 'citation' => '567 F.Supp.2d 123 (2019)', 'jurisdiction' => 'United States', 'summary' => 'Employment discrimination case clarifying burden of proof standards and establishing framework for hostile work environment claims.', 'relevance_score' => 8, 'decision_date' => '2019-11-22', 'court_level' => 'District Court', 'key_points' => ['Employment discrimination', 'Hostile environment', 'Burden of proof', 'Title VII'], 'status' => 'active'],
                    ['case_name' => 'Williams v. State Insurance', 'citation' => '890 F.3d 456 (2021)', 'jurisdiction' => 'United States', 'summary' => 'Insurance coverage dispute establishing standards for policy interpretation and bad faith claims in commercial insurance context.', 'relevance_score' => 8, 'decision_date' => '2021-07-08', 'court_level' => 'Court of Appeals', 'key_points' => ['Insurance coverage', 'Bad faith', 'Policy interpretation', 'Commercial insurance'], 'status' => 'active'],
                ];
                
                foreach ($lindaPrecedents as $precedentData) {
                    LegalPrecedent::firstOrCreate(['case_name' => $precedentData['case_name'], 'created_by' => $lindaDavis->id], [
                        'citation' => $precedentData['citation'],
                        'jurisdiction' => $precedentData['jurisdiction'],
                        'summary' => $precedentData['summary'],
                        'category_id' => $categories->count() > 0 ? $categories->random()->id : null,
                        'relevance_score' => $precedentData['relevance_score'],
                        'decision_date' => $precedentData['decision_date'],
                        'court_level' => $precedentData['court_level'],
                        'key_points' => $precedentData['key_points'],
                        'status' => $precedentData['status'],
                        'created_by' => $lindaDavis->id,
                    ]);
                }
            }
            
            // Create 2-3 legal precedents per company
            $precedentCount = rand(8, 10);
            $availablePrecedents = [
                [
                    'case_name' => 'Carlill v. Carbolic Smoke Ball Co.',
                    'citation' => '[1893] 1 QB 256',
                    'jurisdiction' => 'England',
                    'summary' => 'Landmark case establishing principles of unilateral contracts and consideration in contract law.',
                    'relevance_score' => 9,
                    'decision_date' => '1893-01-01',
                    'court_level' => 'Court of Appeal',
                    'key_points' => ['Unilateral contract', 'Consideration', 'Offer and acceptance', 'Advertisement as offer'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Donoghue v. Stevenson',
                    'citation' => '[1932] AC 562',
                    'jurisdiction' => 'Scotland',
                    'summary' => 'Established the modern law of negligence and the neighbor principle in tort law.',
                    'relevance_score' => 10,
                    'decision_date' => '1932-05-26',
                    'court_level' => 'House of Lords',
                    'key_points' => ['Duty of care', 'Negligence', 'Neighbor principle', 'Product liability'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Miranda v. Arizona',
                    'citation' => '384 U.S. 436 (1966)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Established Miranda rights requiring police to inform suspects of their constitutional rights.',
                    'relevance_score' => 9,
                    'decision_date' => '1966-06-13',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Miranda rights', 'Fifth Amendment', 'Self-incrimination', 'Police procedure'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Brown v. Board of Education',
                    'citation' => '347 U.S. 483 (1954)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Declared racial segregation in public schools unconstitutional, overturning Plessy v. Ferguson.',
                    'relevance_score' => 10,
                    'decision_date' => '1954-05-17',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Equal protection', 'Desegregation', 'Constitutional law', 'Civil rights'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Roe v. Wade',
                    'citation' => '410 U.S. 113 (1973)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Established constitutional right to abortion under the Due Process Clause of the Fourteenth Amendment.',
                    'relevance_score' => 9,
                    'decision_date' => '1973-01-22',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Due process', 'Privacy rights', 'Constitutional law', 'Reproductive rights'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Marbury v. Madison',
                    'citation' => '5 U.S. 137 (1803)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Established the principle of judicial review, allowing courts to declare laws unconstitutional.',
                    'relevance_score' => 10,
                    'decision_date' => '1803-02-24',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Judicial review', 'Constitutional law', 'Separation of powers', 'Checks and balances'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Gideon v. Wainwright',
                    'citation' => '372 U.S. 335 (1963)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Established the right to legal counsel for defendants in criminal cases under the Sixth Amendment.',
                    'relevance_score' => 9,
                    'decision_date' => '1963-03-18',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Right to counsel', 'Sixth Amendment', 'Criminal procedure', 'Due process'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Mapp v. Ohio',
                    'citation' => '367 U.S. 643 (1961)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Applied the exclusionary rule to state courts, prohibiting use of illegally obtained evidence.',
                    'relevance_score' => 8,
                    'decision_date' => '1961-06-19',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Exclusionary rule', 'Fourth Amendment', 'Search and seizure', 'Evidence'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Plessy v. Ferguson',
                    'citation' => '163 U.S. 537 (1896)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Established "separate but equal" doctrine, later overturned by Brown v. Board of Education.',
                    'relevance_score' => 8,
                    'decision_date' => '1896-05-18',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Separate but equal', 'Segregation', 'Equal protection', 'Civil rights'],
                    'status' => 'active',
                ],
                [
                    'case_name' => 'Terry v. Ohio',
                    'citation' => '392 U.S. 1 (1968)',
                    'jurisdiction' => 'United States',
                    'summary' => 'Established "stop and frisk" procedures allowing police to briefly detain and search suspects.',
                    'relevance_score' => 8,
                    'decision_date' => '1968-06-10',
                    'court_level' => 'Supreme Court',
                    'key_points' => ['Stop and frisk', 'Fourth Amendment', 'Reasonable suspicion', 'Police powers'],
                    'status' => 'active',
                ],
            ];
            
            // Randomly select legal precedents for this company
            $selectedPrecedents = collect($availablePrecedents)->random($precedentCount);
            
            foreach ($selectedPrecedents as $precedentData) {
                LegalPrecedent::firstOrCreate([
                    'case_name' => $precedentData['case_name'],
                    'created_by' => $companyUser->id
                ], [
                    'citation' => $precedentData['citation'],
                    'jurisdiction' => $precedentData['jurisdiction'],
                    'summary' => $precedentData['summary'],
                    'category_id' => $categories->count() > 0 ? $categories->random()->id : null,
                    'relevance_score' => $precedentData['relevance_score'],
                    'decision_date' => $precedentData['decision_date'],
                    'court_level' => $precedentData['court_level'],
                    'key_points' => $precedentData['key_points'],
                    'status' => $precedentData['status'],
                    'created_by' => $companyUser->id,
                ]);
            }
        }
    }
}