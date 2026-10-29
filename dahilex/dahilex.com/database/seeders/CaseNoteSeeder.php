<?php

namespace Database\Seeders;

use App\Models\CaseNote;
use App\Models\User;
use App\Models\CaseTeamMember;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CaseNoteSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();
        
        foreach ($companyUsers as $companyUser) {
            $cases = \App\Models\CaseModel::where('created_by', $companyUser->id)->get();
            if ($cases->isEmpty()) continue;
            
            $lindaDavis = User::where('email', 'linda.davis_' . $companyUser->id . '@example.com')->first();
            $teamMembers = User::where('created_by', $companyUser->id)->where('type', 'team_member')->get();
            $allUsers = collect([$companyUser])->merge($teamMembers);
            
            foreach ($cases as $case) {
                $isLindaCase = $lindaDavis && CaseTeamMember::where('case_id', $case->id)->where('user_id', $lindaDavis->id)->exists();
                
                $noteTemplates = $isLindaCase ? [
                    ['title' => 'Initial Case Assessment', 'content' => 'Reviewed case file thoroughly. Client has strong evidence supporting their position. Key documents include signed contracts, email correspondence, and witness statements. Recommended proceeding with litigation.', 'note_type' => 'general', 'priority' => 'high', 'is_private' => false, 'tags' => ['assessment', 'case-review'], 'days_ago' => 40],
                    ['title' => 'Evidence Documentation', 'content' => 'Compiled comprehensive evidence package including: 15 email exchanges, 3 signed contracts, bank statements, and 4 witness affidavits. All documents properly organized and indexed for court submission.', 'note_type' => 'general', 'priority' => 'high', 'is_private' => false, 'tags' => ['evidence', 'documentation'], 'days_ago' => 30],
                    ['title' => 'Discovery Exchange', 'content' => 'Completed discovery exchange with opposing party. Received their document production - 200+ pages to review. Their evidence appears weaker than anticipated. Identified several inconsistencies in their timeline.', 'note_type' => 'general', 'priority' => 'medium', 'is_private' => true, 'tags' => ['discovery', 'evidence-review'], 'days_ago' => 20],
                    ['title' => 'Pre-Trial Conference Summary', 'content' => 'Pre-trial conference held with judge. Discussed case management and trial schedule. Judge suggested mediation before trial. Both parties agreed to attempt settlement negotiation next week.', 'note_type' => 'general', 'priority' => 'high', 'is_private' => false, 'tags' => ['pre-trial', 'conference'], 'days_ago' => 10],
                    ['title' => 'Trial Preparation Checklist', 'content' => 'Final trial preparation underway. Checklist: witness list finalized, exhibits organized, opening statement drafted, cross-examination questions prepared, trial binders assembled. Team meeting scheduled for final review.', 'note_type' => 'general', 'priority' => 'high', 'is_private' => false, 'tags' => ['trial', 'preparation'], 'days_ago' => 2],
                ] : [
                    ['title' => 'Initial Client Meeting Notes', 'content' => 'Met with client to discuss case details. Client provided background information about the incident. Key points: timeline of events, witness information, and client\'s main concerns.', 'note_type' => 'general', 'priority' => 'high', 'is_private' => false, 'tags' => ['client-meeting', 'initial-consultation'], 'days_ago' => 25],
                    ['title' => 'Legal Research Notes', 'content' => 'Researched similar cases and relevant statutes. Found precedents that support our position. Need to analyze further for strategy development.', 'note_type' => 'general', 'priority' => 'medium', 'is_private' => false, 'tags' => ['research', 'precedents'], 'days_ago' => 18],
                    ['title' => 'Strategy Discussion', 'content' => 'Internal team discussion about case strategy. Decided on approach and assigned tasks to team members for next steps.', 'note_type' => 'general', 'priority' => 'high', 'is_private' => true, 'tags' => ['strategy', 'internal'], 'days_ago' => 12],
                    ['title' => 'Case Progress Update', 'content' => 'Weekly case review completed. All deadlines are on track. Discovery phase proceeding smoothly. No major issues identified.', 'note_type' => 'general', 'priority' => 'medium', 'is_private' => false, 'tags' => ['weekly-review', 'update'], 'days_ago' => 5],
                ];
                
                foreach ($noteTemplates as $noteData) {
                    $creator = $isLindaCase && $lindaDavis ? $lindaDavis : $allUsers->random();
                    $daysAgo = $noteData['days_ago'];
                    unset($noteData['days_ago']);
                    
                    CaseNote::create([
                        ...$noteData,
                        'case_ids' => [(string)$case->id],
                        'note_date' => now()->subDays($daysAgo),
                        'status' => 'active',
                        'created_by' => $creator->id,
                    ]);
                }
            }
        }
    }
}