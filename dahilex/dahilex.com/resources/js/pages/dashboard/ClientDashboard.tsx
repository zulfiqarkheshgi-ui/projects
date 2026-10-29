import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, FileText, Scale, Gavel, MessageSquare, User, Clock, AlertCircle, ArrowUpRight, Calendar, Target, DollarSign, Eye, Download, CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, getImagePath } from '@/utils/helpers';
import { hasPermission } from '@/utils/authorization';

interface Case {
    id: number;
    case_id: string;
    title: string;
    case_status?: { name: string; is_closed: boolean };
    case_type?: { name: string };
}

interface Hearing {
    id: number;
    title: string;
    hearing_date: string;
    hearing_time: string;
    case?: { title: string };
    court?: { name: string };
}

interface TimeEntry {
    id: number;
    description: string;
    hours: number;
    is_billable: boolean;
    start_time: string;
    end_time: string;
    case_title: string;
    user_name: string;
    total_amount: number;
    entry_date: string;
}

interface Expense {
    id: number;
    description: string;
    amount: number;
    is_billable: boolean;
    status: string;
    case_title: string;
    category: string;
    expense_date: string;
}

interface Stats {
    total_cases: number;
    active_cases: number;
    upcoming_hearings: number;
    total_messages: number;
    unread_messages: number;
    total_tasks: number;
}

interface Client {
    id: number;
    name: string;
    email: string;
    phone?: string;
    client_id: string;
}

interface Props {
    client: Client;
    myCases: Case[];
    upcomingHearings: Hearing[];
    recentTimeEntries?: TimeEntry[];
    recentExpenses?: Expense[];
    stats: Stats;
    userType: string;
    dashboardData: { stats: Stats };
}

export default function ClientDashboard({ client, myCases, upcomingHearings, recentTimeEntries = [], recentExpenses = [], stats }: Props) {
    const { t } = useTranslation();

    const { auth } = usePage().props as any;
    const permissions: string[] = auth?.permissions || [];
    const can = (p: string) => hasPermission(permissions, p);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return t('Good Morning');
        if (h < 17) return t('Good Afternoon');
        return t('Good Evening');
    };

    return (
        <PageTemplate
            title={t('Client Dashboard')}
            url="/dashboard"
            description={t("Welcome to your client portal.")}
        >
            <Head title="Client Dashboard" />

            <div className="space-y-6">
                <style>{`
                  @keyframes waterWave {
                    0%   { transform: translateX(0); }
                    50%  { transform: translateX(-25%); }
                    100% { transform: translateX(0); }
                  }
                  .animate-water-wave-1 { animation: waterWave 4s ease-in-out infinite; will-change: transform; }
                  .animate-water-wave-2 { animation: waterWave 6s ease-in-out infinite reverse; will-change: transform; }
                  .animate-water-wave-3 { animation: waterWave 8s ease-in-out infinite; will-change: transform; }
                  @keyframes handWave {
                    0%   { transform: rotate(0deg); }
                    10%  { transform: rotate(18deg); }
                    20%  { transform: rotate(-8deg); }
                    30%  { transform: rotate(18deg); }
                    40%  { transform: rotate(-4deg); }
                    50%  { transform: rotate(12deg); }
                    60%  { transform: rotate(0deg); }
                    100% { transform: rotate(0deg); }
                  }
                  .animate-hand-wave { animation: handWave 2.2s ease-in-out infinite; transform-origin: 70% 70%; display: inline-block; }
                `}</style>

                {/* ── Greeting Banner ── */}
                <div className="group relative overflow-hidden rounded-2xl bg-slate-800 dark:bg-slate-900 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <span className="pointer-events-none absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
                    <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-500/5 blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '0.8s' }} />
                    <span className="pointer-events-none absolute top-4 left-1/3 w-1.5 h-1.5 rounded-full bg-blue-400/80 shadow-[0_0_6px_2px_rgba(96,165,250,0.6)] animate-ping" style={{ animationDuration: '3s' }} />
                    <span className="pointer-events-none absolute bottom-4 left-1/4 w-1 h-1 rounded-full bg-emerald-400/70 shadow-[0_0_4px_2px_rgba(52,211,153,0.5)] animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                    <span className="pointer-events-none absolute top-3 right-1/4 w-1.5 h-1.5 rounded-full bg-violet-400/70 shadow-[0_0_6px_2px_rgba(167,139,250,0.5)] animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />

                    <div className="pointer-events-none absolute bottom-0 left-0 w-full overflow-hidden" style={{ height: '40px' }}>
                        <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-1">
                            <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(96,165,250,0.12)" d="M0,20 C150,38 350,0 600,20 C850,38 1050,0 1200,20 C1350,38 1550,0 1800,20 C2050,38 2250,0 2400,20 L2400,40 L0,40 Z" /></svg>
                        </div>
                        <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-2">
                            <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(52,211,153,0.09)" d="M0,26 C200,10 400,38 600,22 C800,8 1000,36 1200,24 C1400,10 1600,38 1800,22 C2000,8 2200,36 2400,24 L2400,40 L0,40 Z" /></svg>
                        </div>
                        <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-3">
                            <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(167,139,250,0.07)" d="M0,30 C300,14 500,38 700,28 C900,16 1100,38 1200,28 C1400,14 1600,38 1900,28 C2100,16 2300,38 2400,28 L2400,40 L0,40 Z" /></svg>
                        </div>
                    </div>

                    <div className="group-hover:translate-x-2 transition-transform duration-300 min-w-0 z-10">
                        <p className="text-slate-400 text-sm mb-0.5">{greeting()},</p>
                        <div className="flex items-center gap-2">
                            <h2 className="text-white text-xl sm:text-2xl font-bold truncate group-hover:text-primary transition-colors duration-300">
                                {client.name}
                            </h2>
                            <span className="animate-hand-wave text-2xl sm:text-3xl select-none">👋</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1 hidden sm:block group-hover:text-slate-300 transition-colors duration-300">
                            {t("Here's an overview of your legal matters.")}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
                            </div>
                            <span className="text-primary font-semibold text-sm">
                                {t('Client ID')}: {client.client_id}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0 z-10">
                        {can('view-cases') && (
                            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300 hidden sm:block">
                                <p className="text-white text-lg font-bold leading-tight">{stats.active_cases}</p>
                                <p className="text-slate-400 text-[11px]">{t('Active Cases')}</p>
                            </div>
                        )}
                        {can('view-hearings') && (
                            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300 hidden sm:block">
                                <p className="text-white text-lg font-bold leading-tight">{stats.upcoming_hearings}</p>
                                <p className="text-slate-400 text-[11px]">{t('Hearings')}</p>
                            </div>
                        )}
                        <div className="w-px h-10 bg-white/10 hidden sm:block mx-1" />
                        {[
                            { perm: 'view-cases', icon: Scale, label: t('Cases'), href: route('cases.index'), color: 'text-blue-300 hover:text-blue-200', bg: 'hover:bg-blue-400/10' },
                            { perm: 'view-hearings', icon: Gavel, label: t('Hearings'), href: route('hearings.index'), color: 'text-purple-300 hover:text-purple-200', bg: 'hover:bg-purple-400/10' },
                            { perm: 'view-client-documents', icon: FileText, label: t('Documents'), href: route('clients.documents.index'), color: 'text-emerald-300 hover:text-emerald-200', bg: 'hover:bg-emerald-400/10' },
                            { perm: 'view-messages', icon: MessageSquare, label: t('Messages'), href: route('communication.messages.index'), color: 'text-amber-300 hover:text-amber-200', bg: 'hover:bg-amber-400/10', badge: stats.unread_messages },
                        ].filter(({ perm }) => !perm || can(perm)).map(({ icon: Icon, label, href, color, bg, badge }) => (
                            <Link key={label} href={href} className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${bg} group/qa`}>
                                <Icon className={`h-5 w-5 transition-all duration-200 ${color} group-hover/qa:-translate-y-0.5`} />
                                <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">{label}</span>
                                {badge && badge > 0 ? (
                                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                                        {badge}
                                    </span>
                                ) : null}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── KPI Row ── */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* My Cases */}
                    {can('view-cases') && (
                        <Link href={route('cases.index')} className="group">
                            <Card className="h-full border border-blue-200 dark:border-blue-900/50 shadow-sm bg-blue-50 dark:bg-blue-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-blue-300/40 dark:bg-blue-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-blue-200/30 dark:bg-blue-600/10 animate-pulse" style={{ animationDuration: '8s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-2.5">
                                            <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-blue-200 group-hover:text-blue-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                    <p className="text-blue-700 dark:text-blue-400 text-xs mb-1">{t('My Cases')}</p>
                                    <p className="text-blue-900 dark:text-blue-100 text-2xl font-bold tracking-tight">{stats.total_cases.toLocaleString()}</p>
                                    <p className="text-blue-600 dark:text-blue-500 text-[11px] mt-1.5">{stats.active_cases} {t('active')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Upcoming Hearings */}
                    {can('view-hearings') && (
                        <Link href={route('hearings.index')} className="group">
                            <Card className="h-full border border-purple-200 dark:border-purple-900/50 shadow-sm bg-purple-50 dark:bg-purple-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-purple-300/40 dark:bg-purple-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-purple-200/30 dark:bg-purple-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="rounded-xl bg-purple-100 dark:bg-purple-900/50 p-2.5">
                                            <Gavel className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-purple-200 group-hover:text-purple-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                    <p className="text-purple-700 dark:text-purple-400 text-xs mb-1">{t('Upcoming Hearings')}</p>
                                    <p className="text-purple-900 dark:text-purple-100 text-2xl font-bold tracking-tight">{stats.upcoming_hearings.toLocaleString()}</p>
                                    <p className="text-purple-600 dark:text-purple-500 text-[11px] mt-1.5">{t('scheduled')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Tasks */}
                    {can('view-tasks') && (
                        <Link href={route('tasks.index')} className="group">
                            <Card className="h-full border border-emerald-300 dark:border-emerald-800 shadow-sm bg-emerald-50 dark:bg-emerald-950/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-emerald-300/40 dark:bg-emerald-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-emerald-200/30 dark:bg-emerald-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/60 p-2.5">
                                            <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-600 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                    <p className="text-emerald-700 dark:text-emerald-400 text-xs mb-1">{t('Tasks')}</p>
                                    <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono">{stats.total_tasks.toLocaleString()}</p>
                                    <p className="text-emerald-600 dark:text-emerald-500 text-[11px] mt-1.5">{t('total tasks')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Messages */}
                    {can('view-messages') && (
                        <Link href={route('communication.messages.index')} className="group">
                            <Card className={`h-full border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${stats.unread_messages > 0
                                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                                }`}>
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-amber-300/40 dark:bg-amber-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-amber-200/30 dark:bg-amber-600/10 animate-pulse" style={{ animationDuration: '9s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`rounded-xl p-2.5 ${stats.unread_messages > 0 ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-muted'}`}>
                                            <MessageSquare className={`h-5 w-5 ${stats.unread_messages > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                                        </div>
                                        {stats.unread_messages > 0 ? (
                                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 animate-bounce">
                                                {t('New')}
                                            </span>
                                        ) : (
                                            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                        )}
                                    </div>
                                    <p className="text-amber-700 dark:text-amber-400 text-xs mb-1">{t('Messages')}</p>
                                    <p className={`text-2xl font-bold tracking-tight ${stats.unread_messages > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {stats.total_messages.toLocaleString()}
                                    </p>
                                    <p className="text-amber-500 dark:text-amber-500 text-[11px] mt-1.5">{stats.unread_messages} {t('unread')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </div>

                {/* ── Main Dashboard Content ── */}
                {(can('view-cases') || can('view-hearings')) && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* My Cases */}
                        {can('view-cases') && (
                            <Card className="border border-blue-100 dark:border-blue-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
                                <CardHeader className="pb-3 pt-5 px-5 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-semibold">{t('My Cases')}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">{stats.active_cases} {t('active cases')}</p>
                                        </div>
                                        <Link href={route('cases.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                            {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 h-[320px] overflow-y-auto">
                                    {myCases.length > 0 ? (
                                        <div>
                                            {myCases.map((case_) => (
                                                <div key={case_.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150 group/row">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 group-hover/row:scale-105 transition-transform duration-150 ${case_.case_status?.is_closed ? 'bg-gray-100 dark:bg-gray-800' : 'bg-primary/20'
                                                        }`}>
                                                        <Scale className={`h-4 w-4 ${case_.case_status?.is_closed ? 'text-gray-500' : 'text-primary'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate leading-tight">{case_.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {t('Case ID')}: {case_.case_id} • {case_.case_type?.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${case_.case_status?.is_closed
                                                            ? 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/50 dark:text-gray-400'
                                                            : 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400'
                                                            }`}>
                                                            {case_.case_status?.name || 'Active'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                                            <div className="rounded-full bg-muted p-4 animate-pulse">
                                                <Scale className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{t('No cases found')}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Upcoming Hearings */}
                        {can('view-hearings') && (
                            <Card className="border border-violet-100 dark:border-violet-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
                                <CardHeader className="pb-3 pt-5 px-5 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-semibold">{t('Upcoming Hearings')}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">{stats.upcoming_hearings} {t('scheduled hearings')}</p>
                                        </div>
                                        <Link href={route('hearings.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                            {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 h-[320px] overflow-y-auto">
                                    {upcomingHearings.length > 0 ? (
                                        <div>
                                            {upcomingHearings.map((hearing) => (
                                                <div key={hearing.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150 group/row">
                                                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover/row:scale-105 transition-transform duration-150">
                                                        <Calendar className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate leading-tight">{hearing.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{hearing.court?.name}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {(window as any).appSettings?.formatDate ? (window as any).appSettings.formatDate(hearing.hearing_date) : new Date(hearing.hearing_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                                            <div className="rounded-full bg-muted p-4 animate-pulse">
                                                <Calendar className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{t('No upcoming hearings')}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* ── Additional Data Row ── */}
                {(can('view-expenses') || can('view-time-entries')) && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Recent Expenses */}
                        {can('view-expenses') && (<Card className="border border-rose-100 dark:border-rose-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
                            <CardHeader className="pb-3 pt-5 px-5 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-semibold">{t('Recent Expenses')}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('Expenses tied to cases')}</p>
                                    </div>
                                    <Link href={route('billing.expenses.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                        {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 h-[345px] overflow-y-auto">
                                {recentExpenses.length > 0 ? (
                                    <div>
                                        {recentExpenses.map((expense) => (
                                            <div key={expense.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150 group/row">
                                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover/row:scale-105 transition-transform duration-150">
                                                    <DollarSign className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate leading-tight">{expense.description || t('No description')}</p>
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                        {expense.category || t('Uncategorized')}{expense.case_title ? ` • ${expense.case_title}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-xs font-bold font-mono">{formatCurrency(expense.amount)}</span>
                                                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset capitalize ${expense.status === 'approved' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400' :
                                                        expense.status === 'rejected' ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400' :
                                                            'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400'
                                                        }`}>{t(expense.status)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                                        <div className="rounded-full bg-muted p-4 animate-pulse">
                                            <DollarSign className="h-6 w-6 text-muted-foreground/50" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">{t('No expenses found')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        )}

                        {/* Recent Timesheets */}
                        {can('view-time-entries') && (
                            <Card className="border border-indigo-100 dark:border-indigo-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
                                <CardHeader className="pb-3 pt-5 px-5 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-semibold">{t('Recent Timesheets')}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">{t('Time tracked on cases')}</p>
                                        </div>
                                        <Link href={route('billing.time-entries.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                            {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 h-[345px] overflow-y-auto">
                                    {recentTimeEntries.length > 0 ? (
                                        <div>
                                            {recentTimeEntries.map((entry) => (
                                                <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150 group/row">
                                                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover/row:scale-105 transition-transform duration-150">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate leading-tight">{entry.description || t('No description')}</p>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {entry.case_title || t('No case')}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-sm font-bold">{entry.hours.toFixed(2)} {t('hrs')}</span>
                                                        <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {(window as any).appSettings?.formatDate ? (window as any).appSettings.formatDate(entry.entry_date) : new Date(entry.entry_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                                            <div className="rounded-full bg-muted p-4 animate-pulse">
                                                <Clock className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{t('No time entries found')}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </PageTemplate>
    );
}
