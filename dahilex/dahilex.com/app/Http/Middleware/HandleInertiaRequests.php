<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;
use App\Models\Currency;
use App\Models\PlanOrder;
use App\Models\User;
use App\Models\Setting;
use App\Services\StorageConfigService;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        // Skip database queries during installation
        if ($request->is('install/*') || $request->is('update/*') || !file_exists(storage_path('installed'))) {
            // Get available languages even during installation
            $languagesFile = resource_path('lang/language.json');
            $availableLanguages = [];
            if (file_exists($languagesFile)) {
                $availableLanguages = json_decode(file_get_contents($languagesFile), true) ?? [];
            }

            $globalSettings = [
                'currencySymbol' => '$',
                'currencyNname' => 'US Dollar',
                'base_url' => config('app.url'),
                'image_url' => getImageUrlPrefix(),
                'is_demo' => config('app.is_demo', false),
                'availableLanguages' => $availableLanguages,
            ];
            $storageSettings = [
                'allowed_file_types' => 'jpg,png,webp,gif',
                'max_file_size_mb' => 2
            ];
        } else {
            // Get system settings
            $settings = settings();
            // Get currency symbol
            $currencyCode = $settings['defaultCurrency'] ?? 'USD';
            $currency = Currency::where('code', $currencyCode)->first();
            $currencySettings = [];
            if ($currency) {
                $currencySettings = [
                    'currencySymbol' => $currency->symbol,
                    'currencyNname' => $currency->name
                ];
            } else {
                $currencySettings = [
                    'currencySymbol' =>  '$',
                    'currencyNname' => 'US Dollar'
                ];
            }

            // Get storage settings from superadmin
            $storageSettings = [];
            try {
                $superAdmin = User::where('type', 'superadmin')->first();
                if ($superAdmin) {
                    $storageSettingsData = Setting::where('user_id', $superAdmin->id)
                        ->whereIn('key', ['storage_file_types', 'storage_max_upload_size'])
                        ->pluck('value', 'key')
                        ->toArray();

                    $maxSizeKB = (int)($storageSettingsData['storage_max_upload_size'] ?? 2048);
                    $storageSettings = [
                        'allowed_file_types' => $storageSettingsData['storage_file_types'] ?? 'jpg,png,webp,gif',
                        'max_file_size_mb' => round($maxSizeKB / 1024, 2)
                    ];
                } else {
                    $storageSettings = [
                        'allowed_file_types' => 'jpg,png,webp,gif',
                        'max_file_size_mb' => 2
                    ];
                }
            } catch (\Exception $e) {
                // Fallback to default settings if service fails
                $storageSettings = [
                    'allowed_file_types' => 'jpg,png,webp,gif',
                    'max_file_size_mb' => 2
                ];
            }

            // Get super admin currency settings for plans and referrals
            $superAdminCurrencySettings = [];
            try {
                $superAdmin = User::where('type', 'superadmin')->first();
                if ($superAdmin) {
                    $superAdminSettings = Setting::where('user_id', $superAdmin->id)
                        ->whereIn('key', ['decimalFormat', 'defaultCurrency', 'thousandsSeparator', 'currencySymbolSpace', 'currencySymbolPosition'])
                        ->pluck('value', 'key')
                        ->toArray();

                    $superAdminCurrencyCode = $superAdminSettings['defaultCurrency'] ?? 'USD';
                    $superAdminCurrency = Currency::where('code', $superAdminCurrencyCode)->first();

                    $superAdminCurrencySettings = [
                        'superAdminCurrencySymbol' => $superAdminCurrency ? $superAdminCurrency->symbol : '$',
                        'superAdminDecimalFormat' => $superAdminSettings['decimalFormat'] ?? '2',
                        'superAdminThousandsSeparator' => $superAdminSettings['thousandsSeparator'] ?? ',',
                        'superAdminCurrencySymbolSpace' => ($superAdminSettings['currencySymbolSpace'] ?? false) === '1',
                        'superAdminCurrencySymbolPosition' => $superAdminSettings['currencySymbolPosition'] ?? 'before',
                    ];
                }
            } catch (\Exception $e) {
                // Fallback to default super admin currency settings
                $superAdminCurrencySettings = [
                    'superAdminCurrencySymbol' => '$',
                    'superAdminDecimalFormat' => '2',
                    'superAdminThousandsSeparator' => ',',
                    'superAdminCurrencySymbolSpace' => false,
                    'superAdminCurrencySymbolPosition' => 'before',
                ];
            }

            // Get available languages
            $languagesFile = resource_path('lang/language.json');
            $availableLanguages = [];
            if (file_exists($languagesFile)) {
                $availableLanguages = json_decode(file_get_contents($languagesFile), true) ?? [];
            }

            // Get superadmin enableLogging setting for cookie consent
            $superAdminEnableLogging = false;
            try {
                $superAdmin = User::where('type', 'superadmin')->first();
                if ($superAdmin) {
                    $enableLoggingSetting = Setting::where('user_id', $superAdmin->id)
                        ->where('key', 'enableLogging')
                        ->first();
                    $superAdminEnableLogging = $enableLoggingSetting ? $enableLoggingSetting->value : false;
                }
            } catch (\Exception $e) {
                $superAdminEnableLogging = false;
            }

            $superAdminRegistrationEnabled = false;
            try {
                $superAdmin = User::where('type', 'superadmin')->first();
                if ($superAdmin) {
                    $registrationEnabledSetting = Setting::where('user_id', $superAdmin->id)
                        ->where('key', 'registrationEnabled')
                        ->first();
                    $superAdminRegistrationEnabled = $registrationEnabledSetting ? (($registrationEnabledSetting->value == "1") ? true: false) : true;
                }
            } catch (\Exception $e) {
                $superAdminRegistrationEnabled = false;
            }

            // Merge currency settings with other settings
            $globalSettings = array_merge($settings, $currencySettings, $superAdminCurrencySettings);
            $globalSettings['base_url'] = config('app.url');
            $globalSettings['image_url'] = getImageUrlPrefix();
            $globalSettings['is_demo'] = config('app.is_demo', false);
            $globalSettings['availableLanguages'] = $availableLanguages;
            $globalSettings['enableLogging'] = $superAdminEnableLogging;
            $globalSettings['registrationEnabled'] = $superAdminRegistrationEnabled;
            $globalSettings['themeMode'] = getSetting('themeMode', $settings['themeMode'] ?? 'light', auth()?->id());
            $globalSettings['layoutDirection'] = getSetting('layoutDirection', $settings['layoutDirection'] ?? 'left', auth()?->id());

            //     // Add cookie consent setting
            //     $cookieSetting = Setting::where('key', 'strictlyNecessaryCookies')->first();
            //     $globalSettings['strictlyNecessaryCookies'] = $cookieSetting ? (int)$cookieSetting->value : 0;
            //
            // Get layout direction from Super Admin settings for public pages
            // if (config('app.is_demo')) {
            //     $globalSettings['layoutDirection'] = $request->cookie('layoutDirection', 'left');
            // } else {
            //     // Get user's layout direction from settings table
            //     if ($request->user()) {
            //         $userLayoutDirection = Setting::where('user_id', $request->user()->id)
            //             ->where('key', 'layoutDirection')
            //             ->value('value');
            //         $globalSettings['layoutDirection'] = $userLayoutDirection ?? 'left';
            //     } else {
            //         $globalSettings['layoutDirection'] = 'left';
            //     }
            // }

            if (auth()->user() && auth()->user()->hasRole('company')) {
                $lastPlanOrder = PlanOrder::where('user_id', auth()->id())->orderByDesc('processed_at')->first();
                if($lastPlanOrder){
                    $globalSettings['planExirationDate'] = $lastPlanOrder->billing_cycle == 'monthly' ? ($lastPlanOrder?->processed_at?->addMonth() ?? null) : ($lastPlanOrder?->processed_at?->addYear()?? null);
                }
            }
        }

        return [
            ...parent::share($request),
            'name'  => config('app.name'),
            'base_url'  => config('app.url'),
            'image_url'  => getImageUrlPrefix(),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'csrf_token' => csrf_token(),
            'auth'  => [
                'user' => function() use ($request) {
                    $user = $request?->user();
                    if (!$user) return null;
                    $user->load('plan','roles');
                    $companyUser = \App\Models\User::with('plan')->find(getCompanyId($user->id));
                    $user->company = $companyUser;
                    return $user;
                },
                'roles'       => fn() => $request->user()?->roles->pluck('name'),
                'permissions' => fn() => $request->user()?->getAllPermissions()->pluck('name'),
            ],
            'userLanguage' => config('app.is_demo')
                ? $request->cookie('app_language', $request->user()?->lang ?? $globalSettings['defaultLanguage'] ?? 'en')
                : ($request->user()?->lang ?? $globalSettings['defaultLanguage'] ?? 'en'),
            'isImpersonating' => session('impersonated_by') ? true : false,
            'ziggy' => fn(): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            'globalSettings' => $globalSettings,
            'storageSettings' => $storageSettings,
            'is_demo' => config('app.is_demo', false)
        ];
    }
}
