<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Plan;
use App\Models\Setting;

class UserObserver
{
    /**
     * Handle the User "creating" event.
     */
    public function creating(User $user): void
    {
        // If user is company type and has no plan_id, assign default plan
        if ($user->type === 'company' && is_null($user->plan_id)) {
            $defaultPlan = Plan::getDefaultPlan();
            if ($defaultPlan) {
                $user->plan_id = $defaultPlan->id;
                $user->plan_is_active = 1;
                $user->plan_expire_date = now()->addMonth();
            }
        }
    }

    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {

            // Skip for superadmin
            if($user->type === 'superadmin') {
                return;
            }

            if ($user->type == 'company') {
                if ($user->plan_id) {
                    $data = [
                        'user_id' => $user->id,
                        'plan_id' => $user->plan_id,
                        'payment_method' => 'manual',
                        'coupon_code' => null,
                        'payment_id' => null,
                        'status' => 'approved',
                        'processed_at' => now(),
                    ];
                    createPlanOrder($data);
                }
            }

        // Set language for new users based on company owner
            $authUser = auth()->user();
            $companySettings = settings();
            $userLang = isset($companySettings['defaultLanguage']) ? $companySettings['defaultLanguage'] : ($authUser?->lang ?? 'en');
            $user->lang = $userLang ?? 'en';

            // Set layout direction based on language
            $rtlLanguages = ['ar', 'he'];
            $isRtl = in_array($userLang, $rtlLanguages);
            $layoutDirection = $isRtl ? 'right' : 'left';
            Setting::updateOrCreate(
                [
                    'key' => 'layoutDirection',
                    'user_id' => $user->id
                ],
                [
                    'value' => $layoutDirection
                ]
            );
            if ($user->type === 'company' && !$user->referral_code) {
                do {
                    $code = rand(100000, 999999);
                } while (User::where('referral_code', $code)->exists());
                $user->referral_code = $code;
            }
            $user->save();
    }
}
