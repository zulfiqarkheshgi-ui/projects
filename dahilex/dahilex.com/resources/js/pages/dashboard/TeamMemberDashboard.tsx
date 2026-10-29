import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Gavel, Clock, Target, ArrowUpRight, Calendar,
    Timer, BarChart3, MessageSquare, Banknote,
    Scale,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { capitalize, formatCurrency } from '@/utils/helpers';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';

interface Expense {
    id: number;
    description: string;
    amount: number;
    status: string;
    expense_date: string | null;
    case_title: string | null;
    category: string | null;
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
    entry_date: string;
    case?: { title: string };
}

interface Stats {
    total_expenses: number;
    total_expenses_amount: number;
    expenses_this_month: number;
    tasks_by_priority: { critical: number; high: number; medium: number; low: number };
    total_tasks: number;
    total_hours_this_month: number;
    expenses_by_status: { pending: number; approved: number; rejected: number };
    timesheets_by_status: { submitted: number; approved: number };
}

interface Props {
    myExpenses: Expense[];
    upcomingHearings: Hearing[];
    recentTimeEntries: TimeEntry[];
    stats: Stats;
}

export default function TeamMemberDashboard({ myExpenses, upcomingHearings, recentTimeEntries, stats }: Props) {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;
    const permissions: string[] = auth?.permissions || [];
    const can = (p: string) => hasPermission(permissions, p);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return t('Good Morning');
        if (h < 17) return t('Good Afternoon');
        return t('Good Evening');
    };

    return (
        <PageTemplate title={t('Dashboard')} url="/dashboard" description={t('Welcome to your dashboard.')}>
            <Head title="Team Member Dashboard" />

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
                    {/* Orbs */}
                    <span className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <span className="pointer-events-none absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
                    <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-500/5 blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '0.8s' }} />
                    <span className="pointer-events-none absolute top-4 left-1/3 w-1.5 h-1.5 rounded-full bg-blue-400/80 shadow-[0_0_6px_2px_rgba(96,165,250,0.6)] animate-ping" style={{ animationDuration: '3s' }} />
                    <span className="pointer-events-none absolute bottom-4 left-1/4 w-1 h-1 rounded-full bg-emerald-400/70 shadow-[0_0_4px_2px_rgba(52,211,153,0.5)] animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                    <span className="pointer-events-none absolute top-3 right-1/4 w-1.5 h-1.5 rounded-full bg-violet-400/70 shadow-[0_0_6px_2px_rgba(167,139,250,0.5)] animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
                    {/* Water waves */}
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

                    {/* Left: greeting */}
                    <div className="group-hover:translate-x-2 transition-transform duration-300 min-w-0 z-10">
                        <p className="text-slate-400 text-sm mb-0.5">{greeting()},</p>
                        <div className="flex items-center gap-2">
                            <h2 className="text-white text-xl sm:text-2xl font-bold truncate group-hover:text-primary transition-colors duration-300">
                                {auth?.user?.name ?? t('User')}
                            </h2>
                            <span className="animate-hand-wave text-2xl sm:text-3xl select-none">👋</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1 hidden sm:block group-hover:text-slate-300 transition-colors duration-300">
                            {t("Here's what's on your plate today.")}
                        </p>

                    </div>

                    {/* Right: stats + quick links */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0 z-10">
                        {[
                            { perm: 'view-tasks',        icon: Target,       label: t('Tasks'),      href: route('tasks.index'),                  color: 'text-amber-300 hover:text-amber-200',  bg: 'hover:bg-amber-400/10' },
                            { perm: 'view-cases',        icon: Scale,        label: t('Cases'),      href: route('cases.index'),                  color: 'text-blue-300 hover:text-blue-200',    bg: 'hover:bg-blue-400/10' },
                            { perm: 'view-hearings',     icon: Gavel,        label: t('Hearings'),   href: route('hearings.index'),               color: 'text-violet-300 hover:text-violet-200',bg: 'hover:bg-violet-400/10' },
                            { perm: 'view-time-entries', icon: Timer,        label: t('Timesheets'), href: route('billing.time-entries.index'),   color: 'text-indigo-300 hover:text-indigo-200',bg: 'hover:bg-indigo-400/10' },
                            { perm: 'view-messages',     icon: MessageSquare,label: t('Messages'),   href: route('communication.messages.index'), color: 'text-green-300 hover:text-green-200',  bg: 'hover:bg-green-400/10' },
                        ].filter(({ perm }) => !perm || can(perm)).map(({ icon: Icon, label, href, color, bg }) => (
                            <Link key={label} href={href} className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${bg} group/qa`}>
                                <Icon className={`h-5 w-5 transition-all duration-200 ${color} group-hover/qa:-translate-y-0.5`} />
                                <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
                {/* ── KPI Row ── */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    {/* My Tasks */}
                    {can('view-tasks') && (
                        <Link href={route('tasks.index')} className="group">
                            <Card className="h-full border border-amber-200 dark:border-amber-800 shadow-sm bg-amber-50 dark:bg-amber-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-amber-300/40 dark:bg-amber-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-amber-200/30 dark:bg-amber-600/10 animate-pulse" style={{ animationDuration: '8s' }} />
                                    <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-amber-400/30 dark:bg-amber-400/10 animate-ping" style={{ animationDuration: '6s', animationDelay: '1.5s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2.5">
                                            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-amber-200 group-hover:text-amber-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                    <p className="text-amber-700 dark:text-amber-400 text-xs mb-1">{t('My Tasks')}</p>
                                    <p className="text-amber-900 dark:text-amber-100 text-2xl font-bold tracking-tight">{stats.total_tasks.toLocaleString()}</p>
                                    <p className="text-amber-600 dark:text-amber-500 text-[11px] mt-1.5">{t('total assigned')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* My Expenses */}
                    {can('view-expenses') && (
                        <Link href={route('billing.expenses.index')} className="group">
                            <Card className="h-full border border-rose-200 dark:border-rose-900/50 shadow-sm bg-rose-50 dark:bg-rose-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-rose-300/40 dark:bg-rose-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-rose-200/30 dark:bg-rose-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                                    <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-rose-400/30 dark:bg-rose-400/10 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="rounded-xl bg-rose-100 dark:bg-rose-900/50 p-2.5">
                                            <Banknote className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-rose-200 group-hover:text-rose-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                    <p className="text-rose-700 dark:text-rose-400 text-xs mb-1">{t('My Expenses')}</p>
                                    <p className="text-rose-900 dark:text-rose-100 text-2xl tracking-tight font-bold font-mono">{formatCurrency(stats.total_expenses_amount)}</p>
                                    <p className="text-rose-600 dark:text-rose-500 text-[11px] mt-1.5">{stats.total_expenses} {t('records')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Upcoming Hearings */}
                    {can('view-hearings') && (
                        <Link href={route('hearings.index')} className="group">
                            <Card className="h-full border border-violet-200 dark:border-violet-900/50 shadow-sm bg-violet-50 dark:bg-violet-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-violet-300/40 dark:bg-violet-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-violet-200/30 dark:bg-violet-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                                    <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-violet-400/30 dark:bg-violet-400/10 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="rounded-xl bg-violet-100 dark:bg-violet-900/50 p-2.5">
                                            <Gavel className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-violet-200 group-hover:text-violet-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                    <p className="text-violet-700 dark:text-violet-400 text-xs mb-1">{t('Upcoming Hearings')}</p>
                                    <p className="text-violet-900 dark:text-violet-100 text-2xl font-bold tracking-tight">{upcomingHearings.length.toLocaleString()}</p>
                                    <p className="text-violet-600 dark:text-violet-500 text-[11px] mt-1.5">{t('scheduled')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Hours This Month */}
                    {can('view-time-entries') && (
                        <Link href={route('billing.time-entries.index')} className="group">
                            <Card className="h-full border border-emerald-300 dark:border-emerald-800 shadow-sm bg-emerald-50 dark:bg-emerald-950/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                <CardContent className="relative overflow-hidden p-5">
                                    <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-emerald-300/40 dark:bg-emerald-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                                    <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-emerald-200/30 dark:bg-emerald-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                                    <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-emerald-400/30 dark:bg-emerald-400/10 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/60 p-2.5">
                                            <Timer className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-600 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                                    </div>
                                    <p className="text-emerald-700 dark:text-emerald-400 text-xs mb-1">{t('Hours This Month')}</p>
                                    <p className="text-emerald-900 dark:text-emerald-100 text-2xl font-bold tracking-tight font-mono">{Number(stats.total_hours_this_month).toFixed(1)}</p>
                                    <p className="text-emerald-600 dark:text-emerald-500 text-[11px] mt-1.5">{t('hrs logged')}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                </div>

                {/* ── Row 1: My Expenses + Recent Time Entries ── */}
                {(can('view-expenses') || can('view-time-entries')) && (
                    <div className="grid gap-4 lg:grid-cols-2">
{/* Recent Time Entries */}
                        {can('view-time-entries') && (
                            <Card className="border border-indigo-100 dark:border-indigo-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
                                <CardHeader className="pb-3 pt-5 px-5 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-semibold">{t('Recent Time Sheet')}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {Number(stats.total_hours_this_month).toFixed(1)} {t('hrs this month')}
                                            </p>
                                        </div>
                                        <Link href={route('billing.time-entries.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                            {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 h-85 overflow-y-auto">
                                    {recentTimeEntries.length > 0 ? (
                                        <div>
                                            {recentTimeEntries.map((entry) => (
                                                <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                                                        <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate leading-tight">{entry.description || t('No description')}</p>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {entry.case?.title || t('No case')}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-xs font-bold font-mono">{Number(entry.hours).toFixed(2)} {t('hrs')}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {(window as any).appSettings?.formatDate?.(entry.entry_date) ?? new Date(entry.entry_date).toLocaleDateString()}
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
                                            <p className="text-sm text-muted-foreground">{t('No time entries')}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        {/* My Expenses */}
                        {can('view-expenses') && (
                            <Card className="border border-rose-100 dark:border-rose-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
                                <CardHeader className="pb-3 pt-5 px-5 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-semibold">{t('Recent Expenses')}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {myExpenses.length > 0
                                                    ? <span className="font-mono">{formatCurrency(stats.expenses_this_month)} {t('this month')}</span>
                                                    : t('Recent expense records')}
                                            </p>
                                        </div>
                                        <Link href={route('billing.expenses.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                            {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 h-85 overflow-y-auto">
                                    {myExpenses.length > 0 ? (
                                        <div>
                                            {myExpenses.slice(0,5).map((expense) => (
                                                <div key={expense.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Banknote className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate leading-tight">{expense.description || t('No description')}</p>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {expense.category || t('Uncategorized')}{expense.case_title ? ` • ${expense.case_title}` : ''}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-xs font-bold font-mono">{formatCurrency(expense.amount)}</span>
                                                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset capitalize ${
                                                            expense.status === 'approved' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400' :
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
                                                <Banknote className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{t('No expenses found')}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                    </div>
                )}
                {/* ── Row 1: Task Priority + Upcoming Hearings ── */}
                {(can('view-tasks') || can('view-hearings')) && (
                <div className="grid gap-4 lg:grid-cols-5">

                    {/* Task Priority Breakdown — col-span-2 */}
                    {can('view-tasks') && (
                    <Card className="lg:col-span-2 border border-border shadow-sm dark:bg-slate-900">
                        <CardHeader className="pb-3 pt-5 px-5 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">{t('Task Priority Breakdown')}</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('Your assigned tasks by priority')}</p>
                                </div>
                                <Link href={route('tasks.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                    {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pt-4 pb-5">
                            {stats.total_tasks > 0 ? (() => {
                                const PRIORITY_COLORS: Record<string, string> = { critical: '#8b5cf6', high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
                                const pieData = (['critical', 'high', 'medium', 'low'] as const)
                                    .map((level) => ({ level, count: stats.tasks_by_priority[level] ?? 0, color: PRIORITY_COLORS[level] }))
                                    .filter((d) => d.count > 0);
                                return (
                                    <div className="flex flex-col items-center gap-4">
                                        <div style={{ width: '100%', height: 200 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={pieData} dataKey="count" nameKey="level" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} isAnimationActive={mounted}>
                                                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number, _: any, entry: any) => [value, capitalize(entry.payload.level) + ' ' + t('Priority')]} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-full grid grid-cols-4 gap-2">
                                            {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
                                                const count = stats.tasks_by_priority[level] ?? 0;
                                                const pct = stats.total_tasks > 0 ? Math.round((count / stats.total_tasks) * 100) : 0;
                                                const bgCls: Record<string, string> = { critical: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', low: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' };
                                                const textCls: Record<string, string> = { critical: 'text-purple-700 dark:text-purple-400', high: 'text-red-700 dark:text-red-400', medium: 'text-amber-700 dark:text-amber-400', low: 'text-green-700 dark:text-green-400' };
                                                return (
                                                    <div key={level} className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${bgCls[level]}`}>
                                                        <span className={`text-lg font-bold font-mono ${textCls[level]}`}>{count}</span>
                                                        <span className={`text-[10px] font-medium ${textCls[level]}`}>{capitalize(level)}</span>
                                                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="flex flex-col items-center justify-center h-48 gap-3">
                                    <div className="rounded-full bg-muted p-4 animate-pulse"><Target className="h-6 w-6 text-muted-foreground/50" /></div>
                                    <p className="text-sm text-muted-foreground">{t('No task data available')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    )}

                    {/* Upcoming Hearings — col-span-3 */}
                    {can('view-hearings') && (
                    <Card className="lg:col-span-3 border border-violet-100 dark:border-violet-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="pb-3 pt-5 px-5 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">{t('Upcoming Hearings')}</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">{upcomingHearings.length} {t('scheduled hearings')}</p>
                                </div>
                                <Link href={route('hearings.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                                    {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 h-85 overflow-y-auto">
                            {upcomingHearings.length > 0 ? (
                                <div>
                                    {upcomingHearings.map((hearing) => (
                                        <div key={hearing.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                                            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                                                <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate leading-tight">{hearing.title}</p>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">{hearing.court?.name}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-[11px] text-muted-foreground">{(window as any).appSettings?.formatDate?.(hearing.hearing_date) ?? new Date(hearing.hearing_date).toLocaleDateString()}</span>
                                                {hearing.hearing_time && (
                                                    <span className="text-[11px] text-muted-foreground">{hearing.hearing_time}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <div className="rounded-full bg-muted p-4 animate-pulse"><Gavel className="h-6 w-6 text-muted-foreground/50" /></div>
                                    <p className="text-sm text-muted-foreground">{t('No upcoming hearings')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    )}

                </div>
                )}

                {/* ── Row 2: Timesheets by Status + Expenses by Status ── */}
                {(can('view-time-entries') || can('view-expenses')) && (
                <div className="grid gap-4 lg:grid-cols-2">

                    {/* Timesheets by Status */}
                    {can('view-time-entries') && (() => {
                        const TS_META = [
                            { key: 'submitted', label: t('Submitted'), color: '#6366f1' },
                            { key: 'approved',  label: t('Approved'),  color: '#10b981' },
                        ] as const;
                        const tsData = TS_META.map(m => ({ ...m, value: stats.timesheets_by_status?.[m.key] ?? 0 })).filter(d => d.value > 0);
                        const totalTs = tsData.reduce((s, d) => s + d.value, 0);
                        return (
                        <Card className="border border-border shadow-sm dark:bg-slate-900">
                            <CardHeader className="pb-3 pt-5 px-5 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-semibold">{t('Timesheets by Status')}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('Hours breakdown by status')}</p>
                                    </div>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pt-4 pb-5">
                                {tsData.length > 0 ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <PieChart width={200} height={200} style={{ margin: '0 auto' }}>
                                            <Pie data={tsData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2} isAnimationActive={mounted}>
                                                {tsData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number, n: string) => [`${Number(v).toFixed(1)}h`, n]} />
                                        </PieChart>
                                        <div className="w-full space-y-1.5">
                                            {tsData.map((d) => (
                                                <div key={d.key} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                                        <span className="text-[11px] text-muted-foreground">{d.label}</span>
                                                    </div>
                                                    <span className="text-[11px] font-mono font-medium">{Number(d.value).toFixed(1)}h <span className="text-muted-foreground">({totalTs > 0 ? Math.round((d.value / totalTs) * 100) : 0}%)</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                                        <Clock className="h-6 w-6 text-muted-foreground/40" />
                                        <p className="text-xs text-muted-foreground">{t('No timesheet data')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        );
                    })()}

                    {/* Expenses by Status */}
                    {can('view-expenses') && (() => {
                        const EXP_META = [
                            { key: 'pending',  label: t('Pending'),  color: '#f59e0b' },
                            { key: 'approved', label: t('Approved'), color: '#10b981' },
                            { key: 'rejected', label: t('Rejected'), color: '#ef4444' },
                        ] as const;
                        const expData = EXP_META.map(m => ({ ...m, value: stats.expenses_by_status?.[m.key] ?? 0 })).filter(d => d.value > 0);
                        const totalExp = expData.reduce((s, d) => s + d.value, 0);
                        return (
                        <Card className="border border-border shadow-sm dark:bg-slate-900">
                            <CardHeader className="pb-3 pt-5 px-5 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-semibold">{t('Expenses by Status')}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('Expense count by status')}</p>
                                    </div>
                                    <Banknote className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pt-4 pb-5">
                                {expData.length > 0 ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <PieChart width={200} height={200} style={{ margin: '0 auto' }}>
                                            <Pie data={expData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2} isAnimationActive={mounted}>
                                                {expData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number, n: string) => [v, n]} />
                                        </PieChart>
                                        <div className="w-full space-y-1.5">
                                            {expData.map((d) => (
                                                <div key={d.key} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                                        <span className="text-[11px] text-muted-foreground">{d.label}</span>
                                                    </div>
                                                    <span className="text-[11px] font-mono font-medium">{d.value} <span className="text-muted-foreground">({totalExp > 0 ? Math.round((d.value / totalExp) * 100) : 0}%)</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                                        <Banknote className="h-6 w-6 text-muted-foreground/40" />
                                        <p className="text-xs text-muted-foreground">{t('No expense data')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        );
                    })()}

                </div>
                )}

            </div>
        </PageTemplate>
    );
}
