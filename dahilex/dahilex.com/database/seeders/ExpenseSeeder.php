<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExpenseSeeder extends Seeder
{
    public function run(): void
    {
        $companies = User::where('type', 'company')->get();

        $demoImages = [
            'a-advocate-saas-pic.png',
            'b-advocate-saas-pic.png',
            'c-advocate-saas-pic.png',
            'd-advocate-saas-pic.png',
            'e-advocate-saas-pic.png',
            'f-advocate-saas-pic.png',
            'g-advocate-saas-pic.png',
            'h-advocate-saas-pic.png',
            'i-advocate-saas-pic.png',
            'j-advocate-saas-pic.png',
            'k-advocate-saas-pic.png',
            'client-advocate-saas-pic.png'
        ];

        foreach ($companies as $company) {
            $categories = ExpenseCategory::whereIn('created_by', getCompanyAndUsersId($company->id))->get();
            $cases = \App\Models\CaseModel::with('teamMembers')->whereIn('created_by', getCompanyAndUsersId($company->id))->get();

            if ($categories->isEmpty() || $cases->isEmpty()) continue;

            // Create 1-2 expenses per case
            foreach ($cases as $case) {
                $expenseCount = rand(10, 15);
                $descriptions = [
                    'Court filing fee for case documents',
                    'Travel expenses for client meeting',
                    'Expert witness consultation fee',
                    'Document copying and printing costs',
                    'Legal research database access',
                    'Office supplies for case preparation',
                    'Postage and courier services',
                    'Conference call and communication costs'
                ];

                for ($i = 1; $i <= $expenseCount; $i++) {
                    $expenseDate = now()->subDays(rand(1, 60));

                    $expenseData = [
                        'created_by' => $case->teamMembers?->random()?->user?->id,
                        'case_id' => $case->id,
                        'expense_category_id' => $categories->random()->id,
                        'invoice_id' => null,
                        'description' => $descriptions[array_rand($descriptions)],
                        'amount' => rand(50, 500),
                        'expense_date' => $expenseDate,
                        'is_billable' =>  fake()->boolean(),
                        'status' => fake()->randomElement(['pending', 'approved', 'rejected']),
                        'receipt_file' => $demoImages[array_rand($demoImages)],
                        'notes' => 'Case-related expense for professional services.',
                    ];

                    Expense::create($expenseData);
                }
            }
        }
    }
}
