import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { formatCurrencyForPlansAndReferrals, isUserRegistrationEnabled } from '@/utils/helpers';

// Simple encryption function for plan ID
const encryptPlanId = (planId: number): string => {
    const key = 'advocate2025';
    const str = planId.toString();
    let encrypted = '';
    for (let i = 0; i < str.length; i++) {
        encrypted += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted);
};

interface Plan {
    id: number;
    name: string;
    description: string;
    price: number;
    yearly_price?: number;
    duration: string;
    features?: string[];
    is_popular?: boolean;
    is_plan_enable: string;
    trial_days?: number;
    stats?: {
        users: number;
        cases: number;
        clients: number;
        storage: string;
    };
}

interface PlansSectionProps {
    brandColor?: string;
    plans: Plan[];
    settings?: any;
    sectionData?: {
        title?: string;
        subtitle?: string;
        faq_text?: string;
    };
    trial_days?: number;
}

function PlansSection({ plans, settings, sectionData, brandColor = '#3b82f6' }: PlansSectionProps) {
    const { t, i18n } = useTranslation();
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const { ref, isVisible } = useScrollAnimation();
    const { props } = usePage();
    const themeMode = (props as any).globalSettings?.themeMode || 'light';
    const isDark = themeMode === 'dark';

    // Force re-render when language changes
    React.useEffect(() => {
        const handleLanguageChange = () => {
            forceUpdate();
        };
        i18n.on('languageChanged', handleLanguageChange);
        return () => i18n.off('languageChanged', handleLanguageChange);
    }, [i18n]);


    // Filter enabled plans
    const enabledPlans = plans.filter((plan) => plan.is_plan_enable === 'on');

    // Default plans if none provided
    const defaultPlans = [
        {
            id: 1,
            name: 'Starter',
            description: 'Perfect for individuals getting started with digital networking',
            price: 0,
            yearly_price: 0,
            duration: 'month',
            features: ['1 Digital Business Card', 'Basic QR Code', 'Contact Form', 'Basic Analytics', 'Email Support'],
            is_popular: false,
            is_plan_enable: 'on',
        },
        {
            id: 2,
            name: 'Professional',
            description: 'Ideal for professionals and small businesses',
            price: 19,
            yearly_price: 190,
            duration: 'month',
            features: [
                '5 Digital Business Cards',
                'Custom QR Codes',
                'NFC Support',
                'Advanced Analytics',
                'Custom Branding',
                'Priority Support',
                'Lead Capture',
            ],
            is_popular: true,
            is_plan_enable: 'on',
        },
        {
            id: 3,
            name: 'Enterprise',
            description: 'For teams and large organizations',
            price: 49,
            yearly_price: 490,
            duration: 'month',
            features: [
                'Unlimited Digital Cards',
                'Team Management',
                'Custom Domain',
                'White Label Solution',
                'API Access',
                'Dedicated Support',
                'Advanced Integrations',
                'Custom Features',
            ],
            is_popular: false,
            is_plan_enable: 'on',
        },
    ];

    const displayPlans = enabledPlans.length > 0 ? enabledPlans : defaultPlans;

    const getPrice = (plan: Plan) => {
        if (billingCycle === 'yearly' && plan.yearly_price) {
            return plan.yearly_price;
        }
        return plan.price;
    };


    return (
        <section id="pricing" className={`py-12 sm:py-16 lg:py-20 ${isDark ? 'bg-gray-900' : 'bg-white'}`} ref={ref}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                    className={`text-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    <h2 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>{sectionData?.title || t('Choose Your Plan')}</h2>
                    <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-3xl mx-auto mb-8 leading-relaxed font-medium`}>
                        {sectionData?.subtitle ||
                            'Start with our free plan and upgrade as you grow. All plans include our core features with no setup fees or hidden costs.'}
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm ${billingCycle === 'monthly' ? (isDark ? 'text-white' : 'text-gray-900') + ' font-semibold' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                            {t('Monthly')}
                        </span>
                        <button
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer"
                            style={{ backgroundColor: billingCycle === 'yearly' ? brandColor : (isDark ? '#374151' : '#e5e7eb'), direction: 'ltr' }}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                        <span className={`text-sm ${billingCycle === 'yearly' ? (isDark ? 'text-white' : 'text-gray-900') + ' font-semibold' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                            {t('Yearly')}
                        </span>
                    </div>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {displayPlans.map((plan) => (
                        <div key={plan.id} className={`group relative h-full flex flex-col ${plan.is_popular ? 'z-10 scale-[1.02]' : ''}`}>
                            {/* Card with decorative elements */}
                            <div
                                className="absolute inset-0 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 group-hover:shadow-xl overflow-hidden bg-white dark:bg-gray-800"
                                style={{
                                    ...(plan.is_popular && { borderColor: `${brandColor}30` })
                                }}
                            >
                                {/* Decorative background elements */}
                                <div
                                    className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-70"
                                    style={{ background: `linear-gradient(to bottom right, ${brandColor}10, transparent)` }}
                                ></div>
                                <div
                                    className="absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-12 -mb-12 opacity-50"
                                    style={{ background: `linear-gradient(to top right, ${brandColor}10, transparent)` }}
                                ></div>
                            </div>

                            {/* Recommended indicator */}
                            {plan.is_popular && (
                                <div className="absolute -top-4 left-0 right-0 flex justify-center z-20">
                                    <div
                                        className="text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-sm font-medium"
                                        style={{ backgroundColor: brandColor }}
                                    >
                                        <Check className="h-4 w-4" />
                                        {t('Recommended')}
                                    </div>
                                </div>
                            )}

                            {/* Content container */}
                            <div className="relative z-10 flex flex-col h-full p-6 pt-8">
                                {/* Plan header */}
                                <div className="mb-6">
                                    <h3
                                        className="text-2xl font-bold mb-2 dark:text-white"
                                        style={{ color: plan.is_popular ? brandColor : 'inherit' }}
                                    >
                                        {plan.name}
                                    </h3>
                                    <div className="flex items-baseline gap-1.5 mb-3 font-mono">
                                        <span
                                            className="text-3xl dark:text-white"
                                            style={{ color: plan.is_popular ? brandColor : 'inherit' }}
                                        >
                                            {getPrice(plan) === 0 ? formatCurrencyForPlansAndReferrals(0) : formatCurrencyForPlansAndReferrals(getPrice(plan))}
                                        </span>
                                        <span className="text-muted-foreground dark:text-gray-400 text-sm">
                                            /{billingCycle === 'yearly' ? t('year') : t('month')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">
                                        {plan.description}
                                    </p>
                                    {plan.trial_days > 0 && (
                                        <div className="flex items-center gap-1.5 text-sm" style={{ color: brandColor }}>
                                            <Check className="h-3.5 w-3.5" />
                                            {plan.trial_days} {t('days free trial')}
                                        </div>
                                    )}
                                    {billingCycle === 'yearly' && getPrice(plan) > 0 && (
                                        <div className="flex items-center gap-1.5 text-sm" style={{ color: brandColor }}>
                                            <Check className="h-3.5 w-3.5" />
                                            {t('Save')} {formatCurrencyForPlansAndReferrals(Math.round((plan.price * 12 - getPrice(plan)) * 100) / 100)} {t('annually')}
                                        </div>
                                    )}
                                </div>

                                {/* Divider with icon */}
                                <div className="relative flex items-center my-4">
                                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                    <div
                                        className="mx-3 p-1.5 rounded-full"
                                        style={{ backgroundColor: `${brandColor}10`, color: brandColor }}
                                    >
                                        <Check className="h-4 w-4" />
                                    </div>
                                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                </div>

                                {/* Usage limits */}
                                <div className="mb-4">
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-gray-400 mb-3">
                                        {t('Usage Limits')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                            <div className="text-lg font-bold" style={{ color: brandColor }}>{plan.stats?.users || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground dark:text-gray-400">{t('Team Members')}</div>
                                        </div>
                                        <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                            <div className="text-lg font-bold" style={{ color: brandColor }}>{plan.stats?.cases || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground dark:text-gray-400">{t('Cases')}</div>
                                        </div>
                                        <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                            <div className="text-lg font-bold" style={{ color: brandColor }}>{plan.stats?.clients || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground dark:text-gray-400">{t('Clients')}</div>
                                        </div>
                                        <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                            <div className="text-lg font-bold" style={{ color: brandColor }}>{plan.stats?.storage || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground dark:text-gray-400">{t('Storage')}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Features */}
                                {plan.features?.length > 0 && (
                                    <div className="mb-6 flex-1">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-gray-400 mb-3">
                                            {t('Features')}
                                        </h4>
                                        <ul className="space-y-2.5">
                                            {plan.features.map((feature, index) => (
                                                <li key={index} className="flex items-center gap-3">
                                                    <div
                                                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                                                        style={{ backgroundColor: `${brandColor}10`, color: brandColor }}
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="text-sm font-medium dark:text-gray-200">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {isUserRegistrationEnabled() ? (
                                        <Link
                                            href={route('register', { plan: encryptPlanId(plan.id) })}
                                            className="block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors hover:opacity-90"
                                            style={{
                                                backgroundColor: plan.is_popular ? brandColor : (isDark ? '#374151' : '#f3f4f6'),
                                                color: plan.is_popular ? 'white' : (isDark ? '#f9fafb' : '#111827')
                                            }}
                                        >
                                            {plan.price === 0 ? t('Start Free') : t('Get Started')}
                                            <ArrowRight className="w-4 h-4 inline-block ml-2" />
                                        </Link>
                                    ) : (
                                        <Link
                                            href={route('login')}
                                            className="block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors hover:opacity-90"
                                            style={{
                                                backgroundColor: plan.is_popular ? brandColor : (isDark ? '#374151' : '#f3f4f6'),
                                                color: plan.is_popular ? 'white' : (isDark ? '#f9fafb' : '#111827')
                                            }}
                                        >
                                            {t('Login')}
                                            <ArrowRight className="w-4 h-4 inline-block ml-2" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FAQ Link */}
                {sectionData?.faq_text && (
                    <div className="text-center mt-8 sm:mt-12">
                        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                            {sectionData.faq_text}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

export default PlansSection;
