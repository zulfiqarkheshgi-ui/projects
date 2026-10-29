<?php

namespace Database\Seeders;

use App\Models\Referral;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ReferralSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::where('type', 'company')->take(5)->get();
        $plans = Plan::take(3)->get();

        if ($users->isEmpty() || $plans->isEmpty()) {
            $this->command->warn('No users or plans found. Please seed users and plans first.');
            return;
        }

        $company = User::where('email', 'company@example.com')->first();

        $referrals = [
            [
                'user_id' => $users->first()->id,
                'company_id' => $users->skip(1)->first()->id,
                'commission_percentage' => 10.00,
                'amount' => 19.99,
                'plan_id' => $plans->first()->id
            ],
            [
                'user_id' => $users->skip(1)->first()->id,
                'company_id' => $users->skip(2)->first()->id,
                'commission_percentage' => 15.00,
                'amount' => 49.99,
                'plan_id' => $plans->skip(1)->first()->id
            ],
            [
                'user_id' => $users->skip(2)->first()->id,
                'company_id' => $users->skip(3)->first()->id,
                'commission_percentage' => 12.50,
                'amount' => 99.99,
                'plan_id' => $plans->last()->id
            ],
            [
                'user_id' => $users->skip(3)->first()->id,
                'company_id' => $users->last()->id,
                'commission_percentage' => 8.00,
                'amount' => 19.99,
                'plan_id' => $plans->first()->id
            ]
        ];

        if ($company) {
            $defaultPlan = $plans->first();
            
            $referredUsers = [
                ['name' => 'John Doe', 'email' => 'john.doe@example.com', 'amount' => 29.99],
                ['name' => 'Jane Smith', 'email' => 'jane.smith@example.com', 'amount' => 49.99],
                ['name' => 'Bob Johnson', 'email' => 'bob.johnson@example.com', 'amount' => 99.99],
                ['name' => 'Alice Brown', 'email' => 'alice.brown@example.com', 'amount' => 39.99],
            ];

            foreach ($referredUsers as $userData) {
                $referredUser = User::firstOrCreate(
                    ['email' => $userData['email']],
                    [
                        'name' => $userData['name'],
                        'email_verified_at' => now(),
                        'password' => Hash::make('password'),
                        'type' => 'company',
                        'lang' => 'en',
                        'plan_id' => $defaultPlan->id,
                        'used_referral_code' => $company->referral_code,
                        'created_by' => $company->id,
                    ]
                );

                Referral::firstOrCreate(
                    [
                        'user_id' => $referredUser->id,
                        'company_id' => $company->id,
                        'plan_id' => $defaultPlan->id,
                    ],
                    [
                        'commission_percentage' => 10.00,
                        'amount' => $userData['amount'],
                    ]
                );
            }
        }

        foreach ($referrals as $referralData) {
            Referral::create($referralData);
        }

        $this->command->info('Referrals seeded successfully!');
    }
}