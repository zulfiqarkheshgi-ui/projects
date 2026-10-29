<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\CaseModel;
use App\Models\CaseTeamMember;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class TimeEntrySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $caseTeamMembersIds = CaseTeamMember::whereIn('user_id', getCompanyAndUsersId($companyUser->id))->pluck('user_id')->toArray();
            $caseTeamMembers = User::whereIn('id', $caseTeamMembersIds)->get();
            foreach ($caseTeamMembers as $caseTeamMember) {
                $startDate = Carbon::now()->subMonths(2)->startOfMonth()->toDateString();
                $endDate = Carbon::now()->addMonths(3)->endOfMonth()->toDateString();

                $period = collect(CarbonPeriod::create($startDate, $endDate))
                    ->shuffle()
                    ->slice(20)
                    ->sort()
                    ->values();

                foreach ($period as $date) {
                    $descriptions = [
                        'Legal research on case precedents',
                        'Client consultation and case review',
                        'Document preparation and filing',
                        'Court appearance and hearing',
                        'Contract review and analysis',
                        'Discovery and evidence gathering',
                        'Settlement negotiations',
                        'Administrative tasks and filing'
                    ];

                    $entryDate = $date;

                    $startHour = rand(9, 16);
                    $duration = rand(1, 8) * 0.5;
                    $endTime = $startHour + $duration;

                    $case = CaseModel::with(['client', 'caseType', 'caseStatus', 'court', 'creator'])
                        ->whereIn('created_by', getCompanyAndUsersId($companyUser->id))
                        ->whereHas('teamMembers', function ($teamQuery) use ($caseTeamMember) {
                            $teamQuery->where('user_id', $caseTeamMember->id);
                        })->inRandomOrder()->first();

                    $entryData = [
                        'case_id' => $case->id,
                        'client_id' => $case->client_id,
                        'invoice_id' => null,
                        'user_id' => $caseTeamMember->id,
                        'description' => $descriptions[array_rand($descriptions)],
                        'hours' => $duration,
                        'billable_rate' => rand(150, 300),
                        'is_billable' => fake()->boolean(),
                        'entry_date' => $entryDate,
                        'start_time' => sprintf('%02d:00', $startHour),
                        'end_time' => sprintf('%02d:%02d', floor($endTime), ($endTime - floor($endTime)) * 60),
                        'status' =>  fake()->randomElement(['submitted', 'approved']),
                        'notes' => 'Professional legal services for case.',
                        'created_by' => $companyUser->id,
                    ];

                    TimeEntry::create($entryData);
                }
            }
        }
    }
}
