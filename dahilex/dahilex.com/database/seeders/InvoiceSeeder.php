<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Client;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InvoiceSeeder extends Seeder
{
    public function run(): void
    {
        $companies = User::where('type', 'company')->get();

        foreach ($companies as $company) {
            $clients = Client::whereIn('created_by', getCompanyAndUsersId($company->id))->get();

            // Create 3 invoices per client
            foreach ($clients as $client) {
                $cases = \App\Models\CaseModel::whereIn('created_by', getCompanyAndUsersId($company->id))
                    ->where('client_id', $client->id)
                    ->get();

                if ($cases->isEmpty()) continue;

                for ($invoiceNum = 1; $invoiceNum <= 4; $invoiceNum++) {
                    $case = $cases->random();
                    $this->createTimeEntriesAndExpenses($company, $case);
                    $this->createInvoiceForClient($company, $client, $case);
                }
            }
        }
    }

    private function createTimeEntriesAndExpenses($company, $case)
    {
        // Get eligible users (team members only, not company or client type)
        $userIds = $case->teamMembers()->where('status', 'active')->pluck('user_id');

        if ($userIds->isEmpty()) return;

        // Create time entries
        for ($i = 0; $i < rand(2, 5); $i++) {
            $startHour = rand(9, 16);
            $duration = rand(1, 8) * 0.5;
            $endTime = $startHour + $duration;
            $startDate = Carbon::now()->subMonth()->startOfMonth()->toDateString();
            $endDate = Carbon::now()->addMonths(3)->endOfMonth()->toDateString();
            $period = CarbonPeriod::create($startDate, $endDate);
            \App\Models\TimeEntry::create([
                'case_id' => $case->id,
                'user_id' => $userIds->random(),
                'created_by' => $company->id,
                'description' => 'Legal consultation and case review',
                'hours' => $duration,
                'start_time' => sprintf('%02d:00', $startHour),
                'end_time' => sprintf('%02d:%02d', floor($endTime), ($endTime - floor($endTime)) * 60),
                'billable_rate' => rand(100, 300),
                'is_billable' => true,
                'status' => 'approved',
                'entry_date' => fake()->randomElement($period),
            ]);
        }

        // Create expenses
        $expenseCategory = \App\Models\ExpenseCategory::where('created_by', $company->id)->first();
        if ($expenseCategory) {

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

            for ($i = 0; $i < rand(1, 3); $i++) {
                \App\Models\Expense::create([
                    'case_id' => $case->id,
                    'created_by' => $company->id,
                    'expense_category_id' => $expenseCategory->id,
                    'description' => 'Court filing fees and documentation',
                    'amount' => rand(50, 500),
                    'is_billable' => true,
                    'status' => 'approved',
                    'receipt_file' => $demoImages[array_rand($demoImages)],
                    'expense_date' => now()->subDays(rand(1, 30)),
                ]);
            }
        }
    }

    private function createInvoiceForClient($company, $client, $case)
    {
        $timeEntries = \App\Models\TimeEntry::where('case_id', $case->id)
            ->where('created_by', $company->id)
            ->whereNull('invoice_id')
            ->where('is_billable', true)
            ->where('status', 'approved')
            ->get();

        $expenses = \App\Models\Expense::where('case_id', $case->id)
            ->where('created_by', $company->id)
            ->whereNull('invoice_id')
            ->where('is_billable', true)
            ->where('status', 'approved')
            ->get();

        $lineItems = [];

        foreach ($timeEntries as $entry) {
            $lineItems[] = [
                'id' => $entry->id,
                'type' => 'time',
                'case_info' => $entry->case ? $entry->case->case_id . ' - ' . $entry->case->title : 'General',
                'description' => $entry->description,
                'quantity' => $entry->hours,
                'rate' => $entry->billable_rate,
                'amount' => $entry->hours * $entry->billable_rate,
                'entry_date' => $entry->entry_date,
                'status' => $entry->status,
                'invoice_id' => $entry->invoice_id
            ];
        }

        foreach ($expenses as $expense) {
            $lineItems[] = [
                'id' => $expense->id,
                'type' => 'expense',
                'description' => $expense->description,
                'quantity' => 1,
                'rate' => $expense->amount,
                'amount' => $expense->amount,
                'expense_date' => $expense->expense_date
            ];
        }

        if (empty($lineItems)) return;

        $subtotal = collect($lineItems)->sum('amount');
        $taxRate = $client->tax_rate ?? 10;
        $taxAmount = $subtotal * ($taxRate / 100);
        $totalAmount = $subtotal + $taxAmount;

        $invoiceDate = now()->subDays(rand(1, 30));
        $statuses = ['draft', 'sent', 'paid', 'overdue'];

        $invoice = Invoice::create([
            'created_by' => $company->id,
            'client_id' => $client->id,
            'case_id' => $case->id,
            'subtotal' => round($subtotal, 2),
            'tax_amount' => round($taxAmount, 2),
            'total_amount' => round($totalAmount, 2),
            'status' => $statuses[array_rand($statuses)],
            'invoice_date' => $invoiceDate,
            'due_date' => $invoiceDate->copy()->addDays(30),
            'notes' => 'Legal services for ' . $client->name,
            'line_items' => $lineItems,
        ]);

        // Link time entries and expenses to invoice
        $timeEntries->each(fn($entry) => $entry->update(['invoice_id' => $invoice->id]));
        $expenses->each(fn($expense) => $expense->update(['invoice_id' => $invoice->id]));

        // Create payment for paid invoices
        if ($invoice->status === 'paid') {
            $payment_method = collect(['credit_card', 'bank', 'check'])->random();
            \App\Models\Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $invoice->total_amount,
                'payment_date' => $invoice->invoice_date->addDays(rand(1, 15)),
                'payment_method' => $payment_method,
                'receipt_path' => $payment_method == 'bank' ? 'bank-receipts/invoice.png' : null,
                'notes' => 'Payment for invoice #' . $invoice->invoice_number,
                'created_by' => $company->id,
            ]);
        }
    }
}
