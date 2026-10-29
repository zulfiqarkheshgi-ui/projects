<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Plan;
use App\Models\LandingPageSetting;
use App\Models\LandingPageCustomPage;
use App\Models\Business;
use App\Models\contact;
use App\Models\NewsletterSubscription;
use App\Models\User;
use App\Models\Setting;

class LandingPageController extends Controller
{
    public function show(Request $request)
    {
        $host = $request->getHost();
        $hostParts = explode('.', $host);

        // Check if landing page is enabled in settings
        if (!isLandingPageEnabled()) {
            return redirect()->route('login');
        }

        $landingSettings = LandingPageSetting::getSettings();

        $plans = Plan::where('is_plan_enable', 'on')->get()->take(3)->map(function ($plan) {
            $features = [];
            if ($plan->enable_custdomain === 'on') $features[] = 'Custom Domain';
            if ($plan->enable_custsubdomain === 'on') $features[] = 'Subdomain';
            if ($plan->pwa_business === 'on') $features[] = 'PWA';
            if ($plan->enable_chatgpt === 'on') $features[] = 'AI Integration';

            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => $plan->price,
                'yearly_price' => $plan->yearly_price,
                'duration' => $plan->duration,
                'description' => $plan->description,
                'features' => $features,
                'stats' => [
                    'users' => $plan->max_users,
                    'cases' => $plan->max_cases,
                    'clients' => $plan->max_clients,
                    'storage' => $plan->storage_limit . ' GB',
                ],
                'trial_days' => $plan->trial_day,
                'is_plan_enable' => $plan->is_plan_enable,
                'is_popular' => false // Will be set based on subscriber count
            ];
        });

        // Mark most subscribed plan as popular
        $planSubscriberCounts = Plan::withCount('users')->get()->pluck('users_count', 'id');
        if ($planSubscriberCounts->isNotEmpty()) {
            $mostSubscribedPlanId = $planSubscriberCounts->keys()->sortByDesc(function ($planId) use ($planSubscriberCounts) {
                return $planSubscriberCounts[$planId];
            })->first();

            $plans = $plans->map(function ($plan) use ($mostSubscribedPlanId) {
                if ($plan['id'] == $mostSubscribedPlanId && $plan['price'] != '0') {
                    $plan['is_popular'] = true;
                }
                return $plan;
            });
        }

        // Get FAQs from settings configuration
        $sections = $landingSettings->config_sections['sections'] ?? [];

        $faqSection = collect($sections)->firstWhere('key', 'faq');
        $faqs = collect($faqSection['faqs'] ?? [])
            ->map(function ($faq, $index) {
                return [
                    'id' => $index + 1,
                    'question' => $faq['question'] ?? '',
                    'answer' => $faq['answer'] ?? ''
                ];
            });

        return Inertia::render('landing-page/index', [
            'plans' => $plans,
            'testimonials' => [],
            'faqs' => $faqs,
            'customPages' => LandingPageCustomPage::active()->ordered()->get() ?? [],
            'settings' => $landingSettings,
            'sectionData' => [
                'faq' => [
                    'title' => $faqSection['title'] ?? 'Frequently Asked Questions',
                    'subtitle' => $faqSection['subtitle'] ?? "Got questions? We've got answers.",
                    'cta_text' => $faqSection['cta_text'] ?? 'Still have questions?',
                    'button_text' => $faqSection['button_text'] ?? 'Contact Support',
                    'default_faqs' => $faqs->toArray()
                ]
            ]
        ]);
    }

    public function submitContact(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string'
        ]);

        $contact = new contact();
        $contact->name = $request->name;
        $contact->email = $request->email;
        $contact->subject = $request->subject;
        $contact->message = $request->message;
        $contact->save();

        return back()->with('success', __('Thank you for your message. We will get back to you soon!'));
    }

    public function subscribe(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255'
        ]);

        try {
            $newsletter = NewsletterSubscription::firstOrCreate([
                'email' => $request->email,
            ]);

            if ($newsletter->wasRecentlyCreated) {
                return back()->with('success', __('Thank you for subscribing to our newsletter!'));
            } else {
                return back()->with('error', __('This email is already subscribed to our newsletter.'));
            }
        } catch (\Exception $e) {
            return back()->with('error', __('Something went wrong. Please try again later.'));
        }
    }

    public function settings()
    {
        $landingSettings = LandingPageSetting::getSettings();

        return Inertia::render('landing-page/settings', [
            'settings' => $landingSettings
        ]);
    }

    public function updateSettings(Request $request)
    {
        // Normalise theme colours first (e.g. "060e1e" -> "#060e1e") so a missing "#"
        // doesn't produce an invalid colour on the public site.
        $config = $request->input('config_sections');
        if (is_array($config) && isset($config['theme']) && is_array($config['theme'])) {
            foreach (['primary_color', 'secondary_color', 'accent_color'] as $colorKey) {
                $value = $config['theme'][$colorKey] ?? null;
                if (is_string($value) && preg_match('/^#?[0-9A-Fa-f]{6}$/', trim($value))) {
                    $config['theme'][$colorKey] = '#' . ltrim(trim($value), '#');
                }
            }
            $request->merge(['config_sections' => $config]);
        }

        $colorRule = ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'];

        $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'contact_phone' => 'nullable|string|max:255',
            'contact_address' => 'nullable|string|max:255',
            'config_sections' => 'required|array',
            'config_sections.theme.primary_color' => $colorRule,
            'config_sections.theme.secondary_color' => $colorRule,
            'config_sections.theme.accent_color' => $colorRule,
        ], [
            'config_sections.theme.*.regex' => __('Theme colors must be a valid hex color such as #3b82f6.'),
        ]);

        // Make sure the row exists, then work on the raw stored value.
        LandingPageSetting::getSettings();
        $landingSettings = LandingPageSetting::first();

        // Merge instead of replace: the form only posts some keys, so anything it
        // doesn't send (custom_css, custom_js, ...) must not be wiped on save.
        $existing = $landingSettings->config_sections ?? [];
        $merged = array_replace($existing, $request->input('config_sections', []));

        $landingSettings->update([
            'company_name' => $request->input('company_name'),
            'contact_email' => $request->input('contact_email'),
            'contact_phone' => $request->input('contact_phone'),
            'contact_address' => $request->input('contact_address'),
            'config_sections' => $merged,
        ]);

        // Keep the app-wide Brand/Appearance settings (used by the dashboard
        // sidebar and every auth page via useBrand()) in sync with whatever
        // the Landing Page theme was just saved as, so the public site and
        // the rest of the app never drift apart again.
        $superAdminId = User::where('type', 'superadmin')->value('id');
        $theme = $merged['theme'] ?? [];

        if ($superAdminId) {
            $syncMap = [
                'themeColor' => 'custom',
                'customColor' => $theme['primary_color'] ?? null,
                'logoDark' => $theme['logo_dark'] ?? null,
                'logoLight' => $theme['logo_light'] ?? null,
                'favicon' => $theme['favicon'] ?? null,
            ];

            foreach ($syncMap as $key => $value) {
                if ($value === null) {
                    continue;
                }

                Setting::updateOrCreate(
                    ['user_id' => $superAdminId, 'key' => $key],
                    ['value' => $value]
                );
            }
        }

        return back()->with('success', __('Landing page settings updated successfully!'));
    }
}