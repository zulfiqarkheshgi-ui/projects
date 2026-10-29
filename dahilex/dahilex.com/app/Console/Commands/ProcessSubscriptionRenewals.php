<?php

namespace App\Console\Commands;

use App\Models\TenantSubscription;
use App\Services\AddOnBillingService;
use Illuminate\Console\Command;

/**
 * Runs daily (see app/Console/Kernel.php: ->dailyAt('00:15')).
 * Finds every active subscription whose next_billing_date is today or
 * earlier (covers missed runs) and renews it: applies any scheduled
 * add-on decreases/cancellations, computes the new cycle's charges, and
 * advances the billing period.
 */
class ProcessSubscriptionRenewals extends Command
{
    protected $signature = 'billing:process-renewals';
    protected $description = 'Apply scheduled add-on changes and renew subscriptions due today';

    public function handle(AddOnBillingService $billing): int
    {
        $due = TenantSubscription::where('status', 'active')
            ->whereDate('next_billing_date', '<=', now()->toDateString())
            ->get();

        $this->info("Found {$due->count()} subscription(s) due for renewal.");

        foreach ($due as $subscription) {
            try {
                $cycle = $billing->renew($subscription);
                $this->line("Renewed subscription #{$subscription->id} — total \${$cycle->total_amount}");

                // Hand off to the payment gateway / invoicing pipeline here,
                // e.g. dispatch(new ChargeSubscriptionCycle($cycle)); and let
                // that job flip $cycle->status to 'invoiced' / 'paid' / 'failed'.
            } catch (\Throwable $e) {
                $this->error("Failed to renew subscription #{$subscription->id}: {$e->getMessage()}");
                report($e);
            }
        }

        return self::SUCCESS;
    }
}
