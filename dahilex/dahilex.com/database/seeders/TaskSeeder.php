<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\TaskType;
use App\Models\TaskStatus;
use App\Models\User;
use App\Models\CaseModel;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();
        
        foreach ($companyUsers as $companyUser) {
            $taskTypes = TaskType::where('created_by', $companyUser->id)->get();
            $taskStatuses = TaskStatus::where('created_by', $companyUser->id)->get();
            $cases = CaseModel::where('created_by', $companyUser->id)
                ->whereNotNull('client_id')
                ->get();
            
            if ($taskTypes->count() > 0 && $taskStatuses->count() > 0 && $cases->count() > 0) {
                $taskTitles = [
                    'Research case precedents for client matter',
                    'Draft motion for summary judgment',
                    'Client consultation meeting',
                    'Review contract amendments',
                    'File discovery motions',
                    'Prepare court filing documents',
                    'Conduct legal analysis',
                    'Schedule deposition hearing'
                ];
                
                $descriptions = [
                    'Conduct comprehensive legal research on similar cases and precedents',
                    'Prepare and draft motion based on research findings',
                    'Schedule and conduct client meeting to discuss case strategy',
                    'Review and analyze proposed amendments from opposing counsel',
                    'Prepare and file discovery motions with the court',
                    'Prepare necessary court filing documents and submissions',
                    'Conduct detailed legal analysis for case preparation',
                    'Schedule and coordinate deposition hearing with all parties'
                ];
                
                $priorities = ['low', 'medium', 'high', 'critical'];
                $statuses = ['not_started', 'in_progress', 'completed', 'on_hold'];
                
                // Create 2-3 tasks per case
                foreach ($cases as $case) {
                    // Get assigned team members for this case
                    $caseTeamMembers = \App\Models\CaseTeamMember::where('case_id', $case->id)
                        ->where('status', 'active')
                        ->pluck('user_id')
                        ->toArray();
                    
                    if (empty($caseTeamMembers)) continue;
                    
                    $taskCount = rand(2, 3);
                    
                    for ($i = 1; $i <= $taskCount; $i++) {
                        $dueDate = rand(1, 10) > 5 ? now()->addDays(rand(1, 30)) : now()->subDays(rand(1, 15));
                        $taskType = $taskTypes->random();
                        $taskStatus = $taskStatuses->random();
                        
                        $taskData = [
                            'task_id' => null,
                            'title' => $taskTitles[array_rand($taskTitles)],
                            'description' => $descriptions[array_rand($descriptions)] . ' for case ' . $case->case_id . '.',
                            'priority' => $priorities[rand(0, count($priorities) - 1)],
                            'status' => $statuses[rand(0, count($statuses) - 1)],
                            'due_date' => $dueDate,
                            'estimated_duration' => $taskType->default_duration ?? rand(60, 300),
                            'case_id' => $case->id,
                            'assigned_to' => $caseTeamMembers[array_rand($caseTeamMembers)],
                            'task_type_id' => $taskType->id,
                            'task_status_id' => $taskStatus->id,
                            'notes' => 'Task for case ' . $case->case_id . '. Important legal work requiring attention.',
                            'created_by' => $companyUser->id,
                        ];
                        
                        Task::create($taskData);
                    }
                }
            }
        }
    }
}