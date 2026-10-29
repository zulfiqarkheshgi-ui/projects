<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\TenantSubscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-time (but safely re-runnable) backfill: creates a tenant_subscriptions
 * row for every existing company-type user, based on their latest approved
 * plan_orders row, falling back to users.plan_id / plan_expire_date.
 *
 * Usage:
 *   php artisan billing:backfill-subscriptions --dry-run   (preview only)
 *   php artisan billing:backfill-subscriptions              (apply)
 */
class BackfillTenantSubscriptions extends Command
{
    protected $signature = 'billing:backfill-subscriptions {--dry-run}';
    protected $description = 'Create tenant_subscriptions rows for existing company users from users.plan_id / plan_orders history';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $users = User::query()
            ->where('type', 'company')
            ->whereNotNull('plan_id')
            ->get();

        $this->info("Found {$users->count()} company user(s) with a plan assigned.");
        $created = 0;
        $skipped = 0;

        foreach ($users as $user) {
            $plan = Plan::find($user->plan_id);

            if (! $plan) {
                $this->warn("User #{$user->id}: plan_id {$user->plan_id} not found, skipping.");
                $skipped++;
                continue;
            }

            // Latest approved order tells us the billing cycle actually paid for.
            $latestOrder = DB::table('plan_orders')
                ->where('user_id', $user->id)
                ->where('plan_id', $user->plan_id)
                ->where('status', 'approved')
                ->orderByDesc('ordered_at')
                ->first();

            $billingCycle = $latestOrder->billing_cycle ?? 'monthly';
            $billingCycle = in_array($billingCycle, ['monthly', 'yearly']) ? $billingCycle : 'monthly';

            $periodEnd = $user->plan_expire_date
                ? Carbon::parse($user->plan_expire_date)
                : now()->addMonth();

            $periodStart = $billingCycle === 'yearly'
                ? $periodEnd->copy()->subYear()->addDay()
                : $periodEnd->copy()->subMonth()->addDay();

            $basePrice = $billingCycle === 'yearly' ? $plan->yearly_price : $plan->price;

            $status = $periodEnd->isFuture() ? 'active' : 'past_due';

            $this->line(sprintf(
                'User #%d -> plan "%s" (%s), period %s to %s, status=%s',
                $user->id,
                $plan->name,
                $billingCycle,
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
                $status
            ));

            if ($dryRun) {
                continue;
            }

            TenantSubscription::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'plan_id' => $plan->id,
                    'billing_cycle' => $billingCycle,
                    'status' => $status,
                    'current_period_start' => $periodStart,
                    'current_period_end' => $periodEnd,
                    'next_billing_date' => $periodEnd->copy()->addDay(),
                    'base_plan_price_snapshot' => $basePrice,
                ]
            );

            $created++;
        }

        $dryRun
            ? $this->info("Dry run complete. {$users->count()} would be processed, {$skipped} skipped (no matching plan).")
            : $this->info("Done. {$created} subscription(s) created/updated, {$skipped} skipped.");

        return self::SUCCESS;
    }
}
