import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { useBrand } from '@/contexts/BrandContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { type NavItem } from '@/types';
import { hasPermission } from '@/utils/authorization';
import { getImagePath } from '@/utils/helpers';
import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Bell,
    BookOpen,
    Briefcase,
    Building2,
    Calendar,
    CalendarDays,
    CheckSquare,
    ChevronRight,
    CreditCard,
    DollarSign,
    FileText,
    Gift,
    Image,
    LayoutGrid,
    LogOut,
    Mail,
    Palette,
    Settings,
    UserCheck,
    Users,
} from 'lucide-react';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function AppSidebar() {
    const { t, i18n } = useTranslation();
    const { auth, globalSettings } = usePage().props as any;
    const userRole = auth.user?.type || auth.user?.role;
    const permissions = auth?.permissions || [];

    const getSuperAdminNavItems = (): NavItem[] => [
        { title: t('Dashboard'), href: route('dashboard'), icon: LayoutGrid, group: t("Overview") },
        { title: t('Companies'), href: route('companies.index'), icon: Briefcase, group: t("Management") },
        { title: t('Media Library'), href: route('media-library'), icon: Image, group: t("Management") },
        {
            title: t('Plans'), icon: CreditCard, group: t("Management"),
            children: [
                { title: t('Plans'), href: route('plans.index') },
                { title: t('Plan Request'), href: route('plan-requests.index') },
                { title: t('Plan Orders'), href: route('plan-orders.index') },
            ],
        },
        { title: t('Coupons'), href: route('coupons.index'), icon: Settings, group: t("Management") },
        { title: t('Currency'), href: route('currencies.index'), icon: DollarSign, group: t("Management") },
        { title: t('Referral Program'), href: route('referral.index'), icon: Gift, group: t("Management") },
        {
            title: t('Landing Page'), icon: Palette, group: t("Management"),
            children: [
                { title: t('Landing Page'), href: route('landing-page') },
                { title: t('Custom Pages'), href: route('landing-page.custom-pages.index') },
                { title: t('Contact Inquiries'), href: route('contact-us.index') },
                { title: t('Newsletter'), href: route('newsletter.index') },
            ],
        },
        { title: t('Email Templates'), href: route('email-templates.index'), icon: Mail, group: t("System Control" )},
        { title: t('Settings'), href: route('settings'), icon: Settings, group: t("System Control" )},
    ];

    const getCompanyNavItems = (): NavItem[] => {
        const items: NavItem[] = [];

        // 1. Dashboard
        if (hasPermission(permissions, 'manage-dashboard')) {
            items.push({ title: t('Dashboard'), href: route('dashboard'), icon: LayoutGrid, group: t('Overview') });
        }

        // 2. Analytics & Reports
        if (hasPermission(permissions, 'manage-dashboard') && auth.user?.type === 'company') {
            items.push({ title: t('Analytics & Reports'), href: route('analytics.index'), icon: BarChart3, group: t('Overview') });
        }

        // 3. Calendar
        if (hasPermission(permissions, 'manage-calendar')) {
            items.push({ title: t('Calendar'), href: route('calendar.index'), icon: CalendarDays, group: t('Overview') });
        }

        // 4. Case Management
        const caseChildren = [];
        const caseSetupChildren = [];
        if (hasPermission(permissions, 'manage-cases')) {
            caseChildren.push({ title: t('Cases'), href: route('cases.index') });
        }
        if (hasPermission(permissions, 'manage-hearings')) {
            caseChildren.push({ title: t('Hearings'), href: route('hearings.index') });
        }
        if (hasPermission(permissions, 'manage-case-types')) {
            caseSetupChildren.push({ title: t('Case Types'), href: route('cases.case-types.index') });
        }
        if (hasPermission(permissions, 'manage-case-statuses')) {
            caseSetupChildren.push({ title: t('Case Status'), href: route('cases.case-statuses.index') });
        }
        if (hasPermission(permissions, 'manage-event-types')) {
            caseSetupChildren.push({ title: t('Event Types'), href: route('advocate.event-types.index') });
        }
        if (hasPermission(permissions, 'manage-hearing-types')) {
            caseSetupChildren.push({ title: t('Hearing Types'), href: route('hearing-types.index') });
        }
        if (caseSetupChildren.length > 0) {
            caseChildren.push({ title: t('Case Setup'), children: caseSetupChildren });
        }
        if (caseChildren.length > 0) {
            items.push({ title: t('Case Management'), icon: Briefcase, children: caseChildren, group: t('Case & Legal Operations') });
        }

        // 5. Legal Research
        const researchChildren = [];
        const researchSetupChildren = [];
        if (hasPermission(permissions, 'manage-research-projects')) {
            researchChildren.push({ title: t('Research Projects'), href: route('legal-research.projects.index') });
        }
        if (hasPermission(permissions, 'manage-knowledge-articles')) {
            researchChildren.push({ title: t('Knowledge Article'), href: route('legal-research.knowledge.index') });
        }
        if (hasPermission(permissions, 'manage-legal-precedents')) {
            researchChildren.push({ title: t('Legal Precedents'), href: route('legal-research.precedents.index') });
        }
        if (hasPermission(permissions, 'manage-research-types')) {
            researchSetupChildren.push({ title: t('Research Types'), href: route('legal-research.research-types.index') });
        }
        if (hasPermission(permissions, 'manage-practice-areas')) {
            researchSetupChildren.push({ title: t('Practice Areas'), href: route('advocate.practice-areas.index') });
        }
        if (hasPermission(permissions, 'manage-research-categories')) {
            researchSetupChildren.push({ title: t('Research Categories'), href: route('legal-research.categories.index') });
        }
        if (hasPermission(permissions, 'manage-research-sources')) {
            researchSetupChildren.push({ title: t('Research Sources'), href: route('legal-research.sources.index') });
        }
        if (researchSetupChildren.length > 0) {
            researchChildren.push({ title: t('Research Setup'), children: researchSetupChildren });
        }
        if (researchChildren.length > 0) {
            items.push({ title: t('Legal Research'), icon: BookOpen, children: researchChildren, group: t('Case & Legal Operations') });
        }

        // 6. Compliance & Regulatory
        const complianceChildren = [];
        const complianceSetupChildren = [];
        if (hasPermission(permissions, 'manage-compliance-requirements')) {
            complianceChildren.push({ title: t('Compliance Requirements'), href: route('compliance.requirements.index') });
        }
        if (hasPermission(permissions, 'manage-compliance-audits')) {
            complianceChildren.push({ title: t('Compliance Audits'), href: route('compliance.audits.index') });
        }
        if (hasPermission(permissions, 'manage-risk-assessments')) {
            complianceChildren.push({ title: t('Risk Assessments'), href: route('compliance.risk-assessments.index') });
        }
        if (hasPermission(permissions, 'manage-professional-licenses')) {
            complianceChildren.push({ title: t('Professional Licenses'), href: route('compliance.professional-licenses.index') });
        }
        if (hasPermission(permissions, 'manage-cle-tracking')) {
            complianceChildren.push({ title: t('CLE Tracking'), href: route('compliance.cle-tracking.index') });
        }
        if (hasPermission(permissions, 'manage-regulatory-bodies')) {
            complianceChildren.push({ title: t('Regulatory Bodies'), href: route('compliance.regulatory-bodies.index') });
        }
        if (hasPermission(permissions, 'manage-compliance-categories')) {
            complianceSetupChildren.push({ title: t('Compliance Categories'), href: route('compliance.categories.index') });
        }
        if (hasPermission(permissions, 'manage-compliance-frequencies')) {
            complianceSetupChildren.push({ title: t('Compliance Frequencies'), href: route('compliance.frequencies.index') });
        }
        if (hasPermission(permissions, 'manage-risk-categories')) {
            complianceSetupChildren.push({ title: t('Risk Categories'), href: route('compliance.risk-categories.index') });
        }
        if (hasPermission(permissions, 'manage-audit-types')) {
            complianceSetupChildren.push({ title: t('Compliance Audit Types'), href: route('compliance.audit-types.index') });
        }
        if (complianceSetupChildren.length > 0) {
            complianceChildren.push({ title: t('Compliance Setup'), children: complianceSetupChildren });
        }
        if (complianceChildren.length > 0) {
            items.push({ title: t('Compliance & Regulatory'), icon: CheckSquare, children: complianceChildren, group: t('Case & Legal Operations') });
        }

        // 7. Task & Workflow
        const taskChildren = [];
        const taskSetupChildren = [];
        if (hasPermission(permissions, 'manage-tasks')) {
            taskChildren.push({ title: t('Tasks'), href: route('tasks.index') });
        }
        // if (hasPermission(permissions, 'manage-task-comments')) {
        //     taskChildren.push({ title: t('Comments'), href: route('tasks.task-comments.index') });
        // }
        if (hasPermission(permissions, 'manage-task-types')) {
            taskSetupChildren.push({ title: t('Task Types'), href: route('tasks.task-types.index') });
        }
        if (hasPermission(permissions, 'manage-task-statuses')) {
            taskSetupChildren.push({ title: t('Task Status'), href: route('tasks.task-statuses.index') });
        }
        if (taskSetupChildren.length > 0) {
            taskChildren.push({ title: t('Task Setup'), children: taskSetupChildren });
        }
        if (taskChildren.length > 0) {
            items.push({ title: t('Task & Workflow'), icon: CheckSquare, children: taskChildren, group: t('Case & Legal Operations') });
        }

        // 8. Court Management
        const courtScheduleChildren = [];
        const courtSetupChildren = [];
        if (hasPermission(permissions, 'manage-courts')) {
            courtScheduleChildren.push({ title: t('Courts'), href: route('courts.index') });
        }
        if (hasPermission(permissions, 'manage-judges')) {
            courtScheduleChildren.push({ title: t('Judges'), href: route('judges.index') });
        }
        if (hasPermission(permissions, 'manage-court-types')) {
            courtSetupChildren.push({ title: t('Court Types'), href: route('advocate.court-types.index') });
        }
        if (courtSetupChildren.length > 0) {
            courtScheduleChildren.push({ title: t('Court Setup'), children: courtSetupChildren });
        }
        if (courtScheduleChildren.length > 0) {
            items.push({ title: t('Court Management'), icon: Calendar, children: courtScheduleChildren, group: t('Case & Legal Operations') });
        }

        // 9. Client Management
        const clientChildren = [];
        const clientSetupChildren = [];
        if (hasPermission(permissions, 'manage-clients')) {
            clientChildren.push({ title: t('Clients'), href: route('clients.index') });
        }
        if (hasPermission(permissions, 'manage-client-documents')) {
            clientChildren.push({ title: t('Documents'), href: route('clients.documents.index') });
        }
        if (hasPermission(permissions, 'manage-client-types')) {
            clientSetupChildren.push({ title: t('Client Types'), href: route('clients.client-types.index') });
        }
        if (hasPermission(permissions, 'manage-document-types')) {
            clientSetupChildren.push({ title: t('Document Types'), href: route('advocate.document-types.index') });
        }
        if (clientSetupChildren.length > 0) {
            clientChildren.push({ title: t('Client Setup'), children: clientSetupChildren });
        }
        if (clientChildren.length > 0) {
            items.push({ title: t('Client Management'), icon: UserCheck, children: clientChildren, group: t('Client & Communication') });
        }

        // 10. Communication
        if (hasPermission(permissions, 'manage-messages')) {
            items.push({ title: t('Communication'), href: route('communication.messages.index'), icon: Mail, group: t('Client & Communication') });
        }

        // 11. Billing & Invoicing
        const billingChildren = [];
        const billingSetupChildren = [];
        if (hasPermission(permissions, 'manage-time-entries')) {
            billingChildren.push({ title: t('Time Sheet'), href: route('billing.time-entries.index') });
        }
        if (hasPermission(permissions, 'manage-expenses')) {
            billingChildren.push({ title: t('Expenses'), href: route('billing.expenses.index') });
        }
        if (hasPermission(permissions, 'manage-invoices')) {
            billingChildren.push({ title: t('Invoices'), href: route('billing.invoices.index') });
        }
        if (hasPermission(permissions, 'manage-payments')) {
            billingChildren.push({ title: t('Payments'), href: route('billing.payments.index') });
        }
        if (hasPermission(permissions, 'manage-expense-categories')) {
            billingSetupChildren.push({ title: t('Expense Categories'), href: route('billing.expense-categories.index') });
        }
        if (billingSetupChildren.length > 0) {
            billingChildren.push({ title: t('Billing Setup'), children: billingSetupChildren });
        }
        if (billingChildren.length > 0) {
            items.push({ title: t('Billing & Invoicing'), icon: DollarSign, children: billingChildren, group: t('Billing') });
        }

        // 12. Document Management
        const documentChildren = [];
        const documentSetupChildren = [];
        if (hasPermission(permissions, 'manage-documents')) {
            documentChildren.push({ title: t('Documents'), href: route('document-management.documents.index') });
        }
        // if (hasPermission(permissions, 'manage-document-versions')) {
        //     documentChildren.push({ title: t('Versions'), href: route('document-management.versions.index') });
        // }
        // if (hasPermission(permissions, 'manage-document-comments')) {
        //     documentChildren.push({ title: t('Comments'), href: route('document-management.comments.index') });
        // }
        if (hasPermission(permissions, 'manage-document-categories')) {
            documentSetupChildren.push({ title: t('Categories'), href: route('document-management.categories.index') });
        }
        if (documentSetupChildren.length > 0) {
            documentChildren.push({ title: t('Document Setup'), children: documentSetupChildren });
        }
        if (documentChildren.length > 0) {
            items.push({ title: t('Document Management'), icon: FileText, children: documentChildren, group: t('Documents & Media') });
        }

        // 13. Media Library
        if (hasPermission(permissions, 'manage-media')) {
            items.push({ title: t('Media Library'), href: route('media-library'), icon: Image, group: t('Documents & Media') });
        }

        // 14. Advocate
        const advocateChildren = [];
        if (hasPermission(permissions, 'manage-company-profiles')) {
            advocateChildren.push({ title: t('Company Profile'), href: route('advocate.company-profiles.index') });
        }
        if (advocateChildren.length > 0) {
            items.push({ title: t('Advocate'), icon: Building2, children: advocateChildren, group: t('System Control') });
        }

        // 15. Team Members
        const staffChildren = [];
        if (hasPermission(permissions, 'manage-users')) {
            staffChildren.push({ title: t('Members'), href: route('users.index') });
        }
        if (hasPermission(permissions, 'manage-roles')) {
            staffChildren.push({ title: t('Roles'), href: route('roles.index') });
        }
        if (staffChildren.length > 0) {
            items.push({ title: t('Team Members'), icon: Users, children: staffChildren, group: t('System Control') });
        }

        // 16. Plans
        const planChildren = [];
        if (hasPermission(permissions, 'manage-plans')) {
            planChildren.push({ title: t('Plans'), href: route('plans.index') });
        }
        if (hasPermission(permissions, 'manage-plan-requests')) {
            planChildren.push({ title: t('Plan Requests'), href: route('plan-requests.index') });
        }
        if (hasPermission(permissions, 'manage-plan-orders')) {
            planChildren.push({ title: t('Plan Orders'), href: route('plan-orders.index') });
        }
        if (planChildren.length > 0) {
            items.push({ title: t('Plans'), icon: CreditCard, children: planChildren, group: t('System Control') });
        }

        // 17. Referral Program
        if (hasPermission(permissions, 'manage-referral')) {
            items.push({ title: t('Referral Program'), href: route('referral.index'), icon: Gift, group: t('System Control') });
        }

        // 18. Notification Templates
        if (userRole === 'company') {
            items.push({ title: t('Notification Templates'), href: route('notification-templates.index'), icon: Bell, group: t('System Control') });
        }

        // 19. Settings
        if (hasPermission(permissions, 'manage-settings')) {
            items.push({ title: t('Settings'), href: route('settings'), icon: Settings, group: t('System Control') });
        }

        return items;
    };

    const mainNavItems = userRole === 'superadmin' ? getSuperAdminNavItems() : getCompanyNavItems();
    const { position, effectivePosition } = useLayout();
    const { variant, collapsible, style } = useSidebarSettings();
    const { logoLight, logoDark, favicon, updateBrandSettings } = useBrand();
    const [sidebarStyle, setSidebarStyle] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (style === 'colored') {
            setSidebarStyle({ backgroundColor: 'var(--primary)', color: 'white' });
        } else if (style === 'gradient') {
            setSidebarStyle({
                background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary), transparent 20%))',
                color: 'white',
            });
        } else {
            setSidebarStyle({});
        }
    }, [style]);

    const filterNavItems = (items: NavItem[], query: string): NavItem[] => {
        if (!query.trim()) return items;
        const q = query.toLowerCase();
        return items.reduce<NavItem[]>((acc, item) => {
            if (item.children) {
                const matched = filterNavItems(item.children, query);
                if (item.title.toLowerCase().includes(q)) {
                    acc.push(item);
                } else if (matched.length > 0) {
                    acc.push({ ...item, children: matched, defaultOpen: true });
                }
            } else if (item.title.toLowerCase().includes(q)) {
                acc.push(item);
            }
            return acc;
        }, []);
    };

    const filteredNavItems = filterNavItems(mainNavItems, searchQuery);

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);


    const getFirstAvailableHref = () => {
        if (filteredNavItems.length === 0) return route('dashboard');
        const firstItem = filteredNavItems[0];
        if (firstItem.href) {
            return firstItem.href;
        } else if (firstItem.children && firstItem.children.length > 0) {
            return firstItem.children[0].href || route('dashboard');
        }
        return route('dashboard');
    };

    return (
        <Sidebar side={effectivePosition} collapsible={collapsible} variant={variant} className={style !== 'plain' ? 'sidebar-custom-style' : ''}>
            <SidebarHeader className={style !== 'plain' ? 'sidebar-styled' : ''} style={sidebarStyle}>
                <div className="flex justify-start items-center p-2">
    				<Link href={getFirstAvailableHref()} prefetch className="flex items-center justify-start">
                        {/* Logo for expanded sidebar */}
                        <div className="group-data-[collapsible=icon]:hidden flex items-center">
                            {(() => {
                                const isDark = document.documentElement.classList.contains('dark');
                                const currentLogo = isDark ? logoLight : logoDark;
                                const displayUrl = getImagePath(currentLogo) ?? currentLogo;

                                return displayUrl ? (
                                    <img
                                        key={`${currentLogo}-${Date.now()}`}
                                        src={displayUrl}
                                        alt="Logo"
                                        className="h-10 w-auto max-w-[180px] object-contain transition-all duration-200"
                                        onError={() => updateBrandSettings({ [isDark ? 'logoLight' : 'logoDark']: '' })}
                                    />
                                ) : (
                                    <div className="h-12 text-inherit font-semibold flex items-center text-lg tracking-tight">
                                        WorkDo
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Icon for collapsed sidebar */}
                        <div className="h-8 w-8 hidden group-data-[collapsible=icon]:block">
                            {(() => {
                                const displayFavicon = favicon ? getImagePath(favicon) : '';

                                return displayFavicon ? (
                                    <img
                                        key={`${favicon}-${Date.now()}`}
                                        src={displayFavicon}
                                        alt="Icon"
                                        className="h-8 w-8 transition-all duration-200"
                                        onError={() => updateBrandSettings({ favicon: '' })}
                                    />
                                ) : (
                                    <div className="h-8 w-8 bg-primary text-white rounded flex items-center justify-center font-bold shadow-sm">
                                        W
                                    </div>
                                );
                            })()}
                        </div>
                    </Link>
                </div>

                {/* Search Input */}
                <div className="group-data-[collapsible=icon]:hidden px-2 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Search menu...')}
                            className="w-full rounded-md border-1 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-1.5 pl-8 pr-7 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Business Switcher removed */}
            </SidebarHeader>
            <SidebarContent style={sidebarStyle} className={`h-full ${style !== 'plain' ? 'sidebar-styled' : ''}`}>
                <NavMain searchQuery={searchQuery} items={filteredNavItems} position={effectivePosition} />
            </SidebarContent>
            <SidebarFooter className={userRole === 'company' ? 'border-t' : ''}>
                {/* Plan Active UI — SaaS + Company only */}
                {userRole === 'company' && (() => {
                    const user = auth.user;
                    const plan = user?.plan;
                    const isActive = user?.plan_is_active === 1;
                    const isTrial = user?.is_trial == 1;

                    const expireDate = isTrial ? user?.trial_expire_date : (user?.plan_expire_date ||  globalSettings?.planExirationDate);

                    const daysLeft = expireDate
                        ? Math.ceil((new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                    const isExpired = daysLeft == null || daysLeft <= 0;

                    let subText = '';
                    if (isExpired) subText = t('Plan expired');
                    else if (!plan) subText = t('No Plan');
                    else if (isTrial) subText = daysLeft !== null ? t('Trial · {{n}} days left', { n: daysLeft }) : t('Trial');
                    else if (daysLeft !== null && daysLeft <= 7) subText = t('Expires in {{n}} days', { n: daysLeft });
                    else subText = plan.name;


                    return <div ref={userMenuRef} className="relative group-data-[collapsible=icon]:hidden">
                        {/* Popup panel — expands above */}
                        {userMenuOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                                {/* User info row */}
                                <Link
                                    href={route('profile')}
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                                >
                                    <div className="relative shrink-0">
                                        {auth.user?.avatar ? (
                                            <img src={auth.user.avatar} alt={auth.user.name} className="h-9 w-9 rounded-full object-cover" />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold line-clamp-1">
                                                {auth.user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate line-clamp-1">{auth.user?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate line-clamp-1">{auth.user?.email}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                                </Link>

                                {/* Actions */}
                                <div className="py-1">
                                    <Link
                                        href={route('referral.index')}
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <Gift className="h-4 w-4 text-gray-400" />
                                        {t('Referral Program')}
                                    </Link>
                                    <Link
                                        href={route('plans.index')}
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                        {t('Plans')}
                                    </Link>
                                    <Link
                                        href={route('settings')}
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <Settings className="h-4 w-4 text-gray-400" />
                                        {t('Settings')}
                                    </Link>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex cursor-pointer w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4 text-gray-400" />
                                        {t('Log out')}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Trigger card */}
                        <button
                            type="button"
                            onClick={() => setUserMenuOpen(v => !v)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 transition-colors cursor-pointer"
                        >
                            <div className="shrink-0">
                                {auth.user?.avatar ? (
                                    <img src={auth.user.avatar} alt={auth.user.name} className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                                        {auth.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-sidebar-foreground truncate line-clamp-1">{auth.user?.name}</p>
                                <p className={`text-xs truncate line-clamp-1 ${isExpired ? 'text-red-400' : daysLeft !== null && daysLeft <= 7 ? 'text-orange-500' : 'text-sidebar-foreground/60'}`}>{subText}</p>
                            </div>
                            <Link
                                href={route('plans.index')}
                                onClick={e => e.stopPropagation()}
                                className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white text-gray-900 hover:!text-gray-900 hover:bg-gray-100 border border-gray-300"
                            >
                                {t('Upgrade')}
                            </Link>
                        </button>
                    </div>
                })()}
            </SidebarFooter>
        </Sidebar>
    );
}
