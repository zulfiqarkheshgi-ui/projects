<?php

namespace Database\Seeders;

use App\Models\Hearing;
use App\Models\CaseModel;
use App\Models\Court;
use App\Models\Judge;
use App\Models\HearingType;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HearingSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $cases = CaseModel::where('created_by', $companyUser->id)->get();
            $hearingTypes = HearingType::where('created_by', $companyUser->id)->get();

            if ($cases->count() > 0) {
                $hearingTitles = [
                    'Initial Hearing',
                    'Evidence Presentation',
                    'Final Arguments',
                    'Motion Hearing',
                    'Settlement Conference',
                    'Status Conference',
                    'Pre-Trial Hearing',
                    'Sentencing Hearing'
                ];
                
                $statuses = ['scheduled', 'in_progress', 'completed', 'postponed', 'cancelled'];
                
                foreach ($cases as $case) {
                    // Skip if case has no court assigned
                    if (!$case->court_id) continue;
                    
                    // Get judges for this specific court
                    $courtJudges = Judge::where('court_id', $case->court_id)
                        ->where('created_by', $companyUser->id)
                        ->where('status', 'active')
                        ->get();
                    
                    // Create 1-2 hearings per case
                    $hearingCount = rand(1, 2);
                    
                    for ($i = 1; $i <= $hearingCount; $i++) {
                        $hearingDate = now()->addDays(rand(1, 60));
                        $hearingTime = sprintf('%02d:%02d', rand(9, 16), [0, 15, 30, 45][rand(0, 3)]);
                        
                        $hearingData = [
                            'case_id' => $case->id,
                            'court_id' => $case->court_id,
                            'judge_id' => $courtJudges->count() > 0 ? $courtJudges->random()->id : null,
                            'hearing_type_id' => $hearingTypes->count() > 0 ? $hearingTypes->random()->id : null,
                            'title' => $hearingTitles[array_rand($hearingTitles)],
                            'description' => 'Hearing for case ' . $case->case_id . '. Important legal proceeding requiring attendance.',
                            'hearing_date' => $hearingDate->format('Y-m-d'),
                            'hearing_time' => $hearingTime,
                            'duration_minutes' => [30, 60, 90, 120, 180][rand(0, 4)],
                            'status' => $statuses[rand(0, count($statuses) - 1)],
                            'notes' => 'Hearing scheduled for case proceedings. All parties required to attend.',
                            'outcome' => null,
                            'attendees' => ['attorney', 'client', 'opposing_counsel'],
                            'created_by' => $companyUser->id
                        ];
                        
                        Hearing::create($hearingData);
                    }
                }
            }
        }
    }
}
