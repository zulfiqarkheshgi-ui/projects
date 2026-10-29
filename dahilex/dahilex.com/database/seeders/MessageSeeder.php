<?php

namespace Database\Seeders;

use App\Models\Message;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MessageSeeder extends Seeder
{
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();
        
        foreach ($companyUsers as $companyUser) {
            $lindaDavis = User::where('email', 'linda.davis_' . $companyUser->id . '@example.com')->first();
            $allUsers = User::where('created_by', $companyUser->id)
                ->whereNotIn('type', ['company', 'client'])
                ->get();
            $allUsers->push($companyUser);
            
            if ($allUsers->count() < 2) {
                continue;
            }
            
            // Linda Davis specific messages
            if ($lindaDavis) {
                // Get cases where Linda is assigned
                $lindaCases = \App\Models\CaseModel::whereHas('teamMembers', function($q) use ($lindaDavis) {
                    $q->where('user_id', $lindaDavis->id);
                })->get();
                
                if ($lindaCases->isNotEmpty()) {
                    // Get clients from Linda's cases
                    $caseClientIds = $lindaCases->pluck('client_id')->unique();
                    $clients = \App\Models\Client::whereIn('id', $caseClientIds)->get();
                    
                    // Recipients: company user and clients from her cases
                    $recipients = collect([$companyUser]);
                    if ($clients->isNotEmpty()) {
                        $clientUsers = User::whereIn('email', $clients->pluck('email'))->get();
                        $recipients = $recipients->merge($clientUsers);
                    }
                    
                    if ($recipients->count() > 0) {
                        $lindaMessages = [
                            ['subject' => 'Case Strategy Discussion', 'content' => 'I have reviewed the case files and prepared a comprehensive strategy document. Please review and provide your feedback on the proposed approach.', 'priority' => 'high'],
                            ['subject' => 'Evidence Review Complete', 'content' => 'Completed the evidence review for all active cases. Found strong supporting documentation. Summary report attached for your review.', 'priority' => 'normal'],
                            ['subject' => 'Trial Preparation Update', 'content' => 'Trial preparation is on track. All witness statements collected and exhibits organized. Ready for final review meeting.', 'priority' => 'high'],
                        ];
                        
                        foreach ($lindaMessages as $msgData) {
                            $recipient = $recipients->random();
                            
                            $conversation = Conversation::firstOrCreate([
                                'company_id' => $companyUser->id,
                                'type' => 'direct',
                                'participants' => [$lindaDavis->id, $recipient->id],
                                'created_by' => $companyUser->id
                            ], [
                                'title' => null,
                                'last_message_at' => now(),
                            ]);
                            
                            Message::firstOrCreate([
                                'subject' => $msgData['subject'],
                                'sender_id' => $lindaDavis->id,
                                'recipient_id' => $recipient->id,
                                'created_by' => $companyUser->id
                            ], [
                                'message_id' => null,
                                'company_id' => $companyUser->id,
                                'sender_id' => $lindaDavis->id,
                                'recipient_id' => $recipient->id,
                                'conversation_id' => $conversation->id,
                                'subject' => $msgData['subject'],
                                'content' => $msgData['content'],
                                'message_type' => 'direct',
                                'priority' => $msgData['priority'],
                                'is_read' => true,
                                'read_at' => now()->subHours(rand(1, 24)),
                                'attachments' => null,
                                'case_id' => null,
                                'status' => 'active',
                                'created_by' => $companyUser->id,
                            ]);
                        }
                    }
                }
            }
            
            // Create 2-3 direct messages per company
            $messageCount = rand(8, 10);
            $priorities = ['low', 'normal', 'high', 'urgent'];
            $statuses = ['active', 'inactive'];
            
            $subjects = [
                'Case Update Required',
                'Client Meeting Scheduled',
                'Document Review Request',
                'Deadline Reminder',
                'Legal Research Update',
                'Court Filing Notification'
            ];
            
            $contents = [
                'Please review the attached case documents and provide your feedback.',
                'Client meeting has been scheduled for next week. Please confirm your availability.',
                'Document review is required for the upcoming case. Please prioritize this task.',
                'Reminder: Important deadline approaching. Please ensure all tasks are completed.',
                'Legal research has been updated with new findings. Please review.',
                'Court filing has been submitted successfully. Confirmation received.'
            ];
            
            for ($i = 1; $i <= $messageCount; $i++) {
                $sender = $allUsers->random();
                $recipient = $allUsers->where('id', '!=', $sender->id)->random();
                
                // Create direct conversation
                $conversation = null;
                try {
                    $conversation = Conversation::firstOrCreate([
                        'company_id' => $companyUser->id,
                        'type' => 'direct',
                        'participants' => [$sender->id, $recipient->id],
                        'created_by' => $companyUser->id
                    ], [
                        'title' => null,
                        'last_message_at' => now(),
                    ]);
                } catch (\Exception $e) {
                    continue;
                }
                
                $messageData = [
                    'message_id' => null, // Auto-generated
                    'company_id' => $companyUser->id,
                    'sender_id' => $sender->id,
                    'recipient_id' => $recipient->id,
                    'conversation_id' => $conversation->id,
                    'subject' => $subjects[($companyUser->id + $i - 1) % count($subjects)],
                    'content' => $contents[($companyUser->id + $i - 1) % count($contents)] . ' Message #' . $i . ' for ' . $companyUser->name . '.',
                    'message_type' => 'direct',
                    'priority' => $priorities[rand(0, count($priorities) - 1)],
                    'is_read' => rand(1, 10) > 3, // 70% chance read
                    'read_at' => rand(1, 10) > 3 ? now()->subMinutes(rand(1, 1440)) : null,
                    'attachments' => null,
                    'case_id' => null,
                    'status' => $statuses[rand(0, count($statuses) - 1)],
                    'created_by' => $companyUser->id,
                ];
                
                Message::firstOrCreate([
                    'subject' => $messageData['subject'],
                    'sender_id' => $messageData['sender_id'],
                    'recipient_id' => $messageData['recipient_id'],
                    'created_by' => $companyUser->id
                ], $messageData);
            }
        }
    }
}