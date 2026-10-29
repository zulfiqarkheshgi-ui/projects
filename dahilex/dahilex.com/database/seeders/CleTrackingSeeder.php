<?php

namespace Database\Seeders;

use App\Models\CleTracking;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CleTrackingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companyUsers = User::where('type', 'company')->get();
        
        foreach ($companyUsers as $companyUser) {
            $teamMembers = User::where('created_by', $companyUser->id)
                ->whereNotIn('type', ['company', 'client'])
                ->get();
            
            if ($teamMembers->isEmpty()) continue;
            
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
                
            $courseNames = [
                'Legal Ethics and Professional Responsibility',
                'Advanced Civil Litigation',
                'Technology in Legal Practice',
                'Contract Law Updates',
                'Criminal Defense Strategies',
                'Family Law Practice',
                'Real Estate Law Fundamentals',
                'Employment Law Compliance'
            ];
            
            $providers = [
                'State Bar Association',
                'Legal Education Institute',
                'Digital Law Academy',
                'Professional Legal Training',
                'Continuing Education Center',
                'Law Practice Institute'
            ];
            
            $descriptions = [
                'Mandatory ethics training for legal professionals',
                'Advanced techniques in civil litigation practice',
                'Using technology tools in modern legal practice',
                'Latest updates in contract law and practice',
                'Strategic approaches to criminal defense',
                'Comprehensive family law practice training',
                'Fundamentals of real estate legal practice',
                'Employment law compliance and best practices'
            ];
            
            $statuses = ['completed', 'in_progress', 'expired'];
            
            // Create 2-3 CLE records per team member
            foreach ($teamMembers as $teamMember) {
                $cleCount = rand(2, 3);
                
                for ($i = 1; $i <= $cleCount; $i++) {
                    $completionDate = now()->subMonths(rand(1, 12));
                    $expiryDate = $completionDate->copy()->addYears(rand(1, 3));
                    $creditsEarned = rand(10, 50) / 10;
                    $creditsRequired = $creditsEarned - rand(0, 5) / 10;
                    
                    CleTracking::create([
                        'user_id' => $teamMember->id,
                        'course_name' => $courseNames[array_rand($courseNames)],
                        'provider' => $providers[array_rand($providers)],
                        'credits_earned' => $creditsEarned,
                        'credits_required' => max($creditsRequired, 1.0),
                        'completion_date' => $completionDate,
                        'expiry_date' => $expiryDate,
                        'certificate_number' => 'CLE-' . $teamMember->id . str_pad($i, 3, '0', STR_PAD_LEFT) . rand(100, 999),
                        'certificate_file' => $demoImages[array_rand($demoImages)],
                        'status' => $statuses[array_rand($statuses)],
                        'description' => $descriptions[array_rand($descriptions)],
                        'created_by' => $companyUser->id,
                    ]);
                }
            }
        }
    }
}