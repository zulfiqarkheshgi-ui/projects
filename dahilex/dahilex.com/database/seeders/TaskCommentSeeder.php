<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TaskComment;
use App\Models\Task;
use App\Models\User;

class TaskCommentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();

        foreach ($companyUsers as $companyUser) {
            $tasks = Task::where('created_by', $companyUser->id)->get();

            foreach ($tasks as $task) {
                // Get case team members if task has a case
                $commenters = [];
                if ($task->case_id) {
                    $commenters = \App\Models\CaseTeamMember::where('case_id', $task->case_id)
                        ->where('status', 'active')
                        ->pluck('user_id')
                        ->toArray();
                }
                
                if (empty($commenters)) continue;
                
                // Create 1-3 comments per task
                for ($i = 1; $i <= rand(1, 3); $i++) {
                    TaskComment::create([
                        'task_id' => $task->id,
                        'comment_text' => $this->getTaskComment($i),
                        'created_by' => $commenters[array_rand($commenters)],
                        'created_at' => now()->subDays(rand(1, 15)),
                        'updated_at' => now()->subDays(rand(1, 15)),
                    ]);
                }
            }
        }
    }

    /**
     * Get sample task comments
     */
    private function getTaskComment($index): string
    {
        $comments = [
            'Task has been initiated. Starting with initial research phase.',
            'Client provided additional documents for review. Will incorporate into analysis.',
            'Found relevant precedent case that supports our position. Adding to research notes.',
            'Need to schedule follow-up meeting with client to clarify requirements.',
            'Draft completed and ready for internal review. Please provide feedback.',
            'Incorporated feedback from team review. Task is progressing well.',
            'Encountered some complexity in legal interpretation. May need additional time.',
            'Client approved the approach. Moving forward with implementation.',
            'Task completed successfully. All deliverables have been submitted.',
            'Quality check passed. Task ready for final approval.',
            'Minor revisions requested by client. Will address in next iteration.',
            'Excellent work on this task. Meets all quality standards.',
            'Task dependencies resolved. Can now proceed with next phase.',
            'Team collaboration was effective. Good communication throughout.',
            'Deadline extended by client request. Adjusting timeline accordingly.'
        ];

        return $comments[($index - 1) % count($comments)];
    }
}