<?php

namespace Database\Seeders;

use App\Models\CaseTimeline;
use App\Models\CaseModel;
use App\Models\User;
use App\Models\CaseTeamMember;
use App\Models\EventType;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CaseTimelineSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $lindaDavis = User::where('email', 'linda_davis_' . $companyUser->id . '@example.com')->first();
            $cases = CaseModel::where('created_by', getCompanyId($companyUser->id))->get();

            foreach ($cases as $case) {
                $isLindaCase = $lindaDavis &&
                    CaseTeamMember::where('case_id', $case->id)->where('user_id', $lindaDavis->id)->exists();

                $timelines = $isLindaCase ? [
                    ['event_type' => 'milestone', 'title' => 'Case Initiated', 'description' => 'Case officially opened and assigned to team', 'event_date' => now()->subDays(45), 'is_completed' => true],
                    ['event_type' => 'hearing', 'title' => 'Preliminary Hearing', 'description' => 'Initial court appearance for case overview', 'event_date' => now()->subDays(30), 'is_completed' => true],
                    ['event_type' => 'deadline', 'title' => 'Discovery Phase', 'description' => 'Exchange of evidence with opposing party', 'event_date' => now()->subDays(15), 'is_completed' => true],
                    ['event_type' => 'hearing', 'title' => 'Trial Hearing', 'description' => 'Main trial proceedings scheduled', 'event_date' => now()->addDays(15), 'is_completed' => false],
                    ['event_type' => 'milestone', 'title' => 'Verdict Expected', 'description' => 'Court decision anticipated', 'event_date' => now()->addDays(30), 'is_completed' => false],
                    ['event_type' => 'deadline', 'title' => 'Evidence Submission', 'description' => 'All physical and digital evidence submitted to court registry', 'event_date' => now()->subDays(60), 'is_completed' => true],
                    ['event_type' => 'milestone', 'title' => 'Client Consultation', 'description' => 'In-depth strategy meeting with client regarding case approach', 'event_date' => now()->subDays(55), 'is_completed' => true],
                    ['event_type' => 'hearing', 'title' => 'Motion Hearing', 'description' => 'Hearing on pre-trial motions filed by both parties', 'event_date' => now()->subDays(40), 'is_completed' => true],
                    ['event_type' => 'deadline', 'title' => 'Expert Witness Filing', 'description' => 'Expert witness statements and qualifications submitted', 'event_date' => now()->subDays(25), 'is_completed' => true],
                    ['event_type' => 'milestone', 'title' => 'Settlement Negotiation', 'description' => 'Out-of-court settlement discussions initiated with opposing counsel', 'event_date' => now()->subDays(20), 'is_completed' => true],
                    ['event_type' => 'hearing', 'title' => 'Deposition Hearing', 'description' => 'Depositions taken from key witnesses under oath', 'event_date' => now()->subDays(10), 'is_completed' => true],
                    ['event_type' => 'deadline', 'title' => 'Brief Submission', 'description' => 'Legal briefs and written arguments submitted to presiding judge', 'event_date' => now()->addDays(5), 'is_completed' => false],
                    ['event_type' => 'milestone', 'title' => 'Pre-Trial Conference', 'description' => 'Final conference with judge to streamline trial issues', 'event_date' => now()->addDays(10), 'is_completed' => false],
                    ['event_type' => 'hearing', 'title' => 'Closing Arguments', 'description' => 'Final oral arguments presented before the court', 'event_date' => now()->addDays(45), 'is_completed' => false],
                    ['event_type' => 'milestone', 'title' => 'Judgment Enforcement', 'description' => 'Enforcement of court judgment and post-trial actions', 'event_date' => now()->addDays(60), 'is_completed' => false],
                ] : [
                    ['event_type' => 'milestone', 'title' => 'Case Filed', 'description' => 'Initial case filing completed', 'event_date' => now()->subDays(30), 'is_completed' => true],
                    ['event_type' => 'hearing', 'title' => 'First Hearing', 'description' => 'Initial court hearing scheduled', 'event_date' => now()->subDays(15), 'is_completed' => true],
                    ['event_type' => 'deadline', 'title' => 'Document Submission', 'description' => 'Submit required documents to court', 'event_date' => now()->addDays(7), 'is_completed' => false],
                    ['event_type' => 'hearing', 'title' => 'Final Hearing', 'description' => 'Final court hearing scheduled', 'event_date' => now()->addDays(30), 'is_completed' => false],
                ];

                foreach ($timelines as $timelineData) {
                    CaseTimeline::create([
                        ...$timelineData,
                        'event_type_id' => EventType::whereIn('created_by',getCompanyAndUsersId($companyUser->id))->where('name', ucfirst($timelineData['event_type']))->first()?->id,
                        'case_id' => $case->id,
                        'created_by' => $isLindaCase && $lindaDavis ? $lindaDavis->id : $companyUser->id,
                    ]);
                }
            }
        }

        // Extra records for company@example.com — last 2 month to next 3 months
        $mainCompany = User::where('email', 'company@example.com')->first();
        if ($mainCompany) {
            $cases = CaseModel::whereIn('created_by', getCompanyAndUsersId($mainCompany->id))->get();

            $extraTimelines = [
                ['event_type' => 'milestone', 'title' => 'Case Strategy Review',      'description' => 'Internal review of overall case strategy with lead counsel', 'is_completed' => true],
                ['event_type' => 'hearing',   'title' => 'Preliminary Hearing',        'description' => 'Initial court appearance to establish procedural schedule', 'is_completed' => true],
                ['event_type' => 'deadline',  'title' => 'Discovery Request Filed',    'description' => 'Formal discovery requests submitted to opposing counsel', 'is_completed' => true],
                ['event_type' => 'milestone', 'title' => 'Client Briefing',            'description' => 'Comprehensive briefing session with client on case developments', 'is_completed' => true],
                ['event_type' => 'hearing',   'title' => 'Motion to Dismiss Hearing',  'description' => 'Court hearing on motion to dismiss filed by opposing party', 'is_completed' => true],
                ['event_type' => 'deadline',  'title' => 'Evidence Disclosure',        'description' => 'Mandatory disclosure of all evidence to opposing counsel', 'is_completed' => true],
                ['event_type' => 'milestone', 'title' => 'Witness List Submitted',     'description' => 'Final list of witnesses submitted to the court registry',  'is_completed' => true],
                ['event_type' => 'hearing',   'title' => 'Deposition Session',         'description' => 'Sworn depositions taken from primary witnesses',  'is_completed' => true],
                ['event_type' => 'deadline',  'title' => 'Brief Submission',           'description' => 'Legal briefs and written arguments submitted to presiding judge',  'is_completed' => true],
                ['event_type' => 'milestone', 'title' => 'Pre-Trial Conference',       'description' => 'Final pre-trial conference to streamline outstanding trial issues',  'is_completed' => false],
                ['event_type' => 'hearing',   'title' => 'Evidentiary Hearing',        'description' => 'Hearing to determine admissibility of key evidence',  'is_completed' => false],
                ['event_type' => 'deadline',  'title' => 'Expert Witness Reports Due', 'description' => 'All expert witness reports must be filed with the court', 'is_completed' => false],
                ['event_type' => 'milestone', 'title' => 'Settlement Conference',      'description' => 'Mediation session to explore out-of-court settlement options', 'is_completed' => false],
                ['event_type' => 'hearing',   'title' => 'Status Conference',          'description' => 'Scheduled court status conference to review case readiness', 'is_completed' => false],
                ['event_type' => 'deadline',  'title' => 'Trial Exhibit List Due',     'description' => 'Complete list of trial exhibits to be submitted to the court', 'is_completed' => false],
                ['event_type' => 'milestone', 'title' => 'Jury Selection',             'description' => 'Voir dire process for selection of impartial jury members', 'is_completed' => false],
                ['event_type' => 'hearing',   'title' => 'Trial — Day 1',              'description' => 'Opening statements and presentation of plaintiff evidence', 'is_completed' => false],
                ['event_type' => 'hearing',   'title' => 'Trial — Day 2',              'description' => 'Continuation of trial with defense evidence presentation', 'is_completed' => false],
                ['event_type' => 'milestone', 'title' => 'Closing Arguments',          'description' => 'Final oral arguments presented by both parties before the court', 'is_completed' => false],
                ['event_type' => 'milestone', 'title' => 'Verdict Expected',           'description' => 'Court expected to deliver final judgment on the case', 'is_completed' => false],
            ];

            foreach ($cases as $case) {
                $startDate = Carbon::now()->subMonths(2)->startOfMonth()->toDateString();
                $endDate = Carbon::now()->addMonths(3)->endOfMonth()->toDateString();

                $period = collect(CarbonPeriod::create($startDate, $endDate))
                    ->shuffle()
                    ->sort()
                    ->values();

                foreach ($period as $index => $value) {
                    $extraTimelineData = collect($extraTimelines)
                                    ->shuffle()
                                    ->take(rand(1,2));
                    foreach($extraTimelineData as $timelineData){
                        CaseTimeline::create([
                            ...$timelineData,
                            'event_date' => $value,
                            'event_type_id' => EventType::whereIn('created_by', getCompanyAndUsersId($mainCompany->id))
                                ->where('name', ucfirst($timelineData['event_type']))
                                ->first()?->id,
                            'case_id'    => $case->id,
                            'created_by' => $mainCompany->id,
                        ]);
                    }
                }
            }
        }
    }
}
