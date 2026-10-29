import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { RefreshCw, Scale, Users, Calendar, Banknote, MessageSquare, Clock, TrendingUp, Gavel, Target, ArrowUpRight, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router, Link, usePage } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { capitalize, formatCurrency } from '@/utils/helpers';
import { hasPermission } from '@/utils/authorization';

interface CompanyDashboardData {
  stats: {
    totalCases: number;
    activeCases: number;
    totalClients: number;
    totalRevenue: number;
    monthlyGrowth: number;
    pendingTasks: number;
    upcomingHearings: number;
    unreadMessages: number;
  };
  recentActivity: Array<{
    id: number;
    type: 'case' | 'client' | 'hearing' | 'message' | 'task';
    title: string;
    description: string;
    time: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }>;
  casesByStatus: Array<{ name: string; value: number; color: string }>;
  revenueData: Array<{ month: string; revenue: number; cases: number }>;
  monthlyRevenue: Array<{ month: string; short: string; revenue: number }>;
  revenueYear: number;
  availableYears: number[];
  upcomingHearings: Array<{
    id: number;
    title: string;
    court: string;
    date: string;
    time: string;
    type: string;
  }>;
  tasksPriority: Array<{ priority: string; count: number; color: string }>;
  todayTimeEntries: Array<{
    id: number; entry_id: string; description: string; hours: number;
    billable_rate: number; is_billable: boolean; start_time: string; end_time: string;
    case_title: string; case_id_str: string; user_name: string; total_amount: number;
  }>;
  todayExpenses: Array<{
    id: number; description: string; amount: number; is_billable: boolean;
    status: string; case_title: string; case_id_str: string; category: string;
  }>;
  recentTasks: Array<{
    id: number; task_id: string; title: string; priority: string;
    due_date: string | null; status_name: string; status_color: string;
    assigned_to: string | null; case_title: string | null;
  }>;
  plan: {
    name: string;
    storage_limit: number;
  };
}

interface PageAction {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: () => void;
}

export default function Dashboard({ dashboardData }: { dashboardData: CompanyDashboardData }) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const permissions: string[] = auth?.permissions || [];
  const can = (p: string) => hasPermission(permissions, p);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [selectedRevenueYear, setSelectedRevenueYear] = useState<number>(() => dashboardData?.revenueYear ?? new Date().getFullYear());

  useEffect(() => {
    setMounted(true);
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
    if (raw) setPrimaryColor(raw);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.reload({ only: ['dashboardData'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleRevenueYearChange = (year: number) => {
    setSelectedRevenueYear(year);
    router.reload({ data: { revenueYear: year }, only: ['dashboardData'], preserveState: true });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('Good Morning');
    if (h < 17) return t('Good Afternoon');
    return t('Good Evening');
  };

  const pageActions: PageAction[] = [
    {
      label: t('Refresh'),
      icon: <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />,
      variant: 'outline',
      onClick: handleRefresh,
    },
  ];

  const stats = dashboardData?.stats || {
    totalCases: 156,
    activeCases: 89,
    totalClients: 234,
    totalRevenue: 125000,
    monthlyGrowth: 12.5,
    pendingTasks: 23,
    upcomingHearings: 8,
    unreadMessages: 15
  };

  const recentActivity = dashboardData?.recentActivity || [];
  const casesByStatus = dashboardData?.casesByStatus || [
    { name: 'Active', value: 45, color: '#10b77f' },
    { name: 'Pending', value: 25, color: '#f59e0b' },
    { name: 'Closed', value: 30, color: '#6b7280' }
  ];
  const revenueData = dashboardData?.revenueData || [];
  const monthlyRevenue = dashboardData?.monthlyRevenue || [];
  const availableYears = dashboardData?.availableYears || [new Date().getFullYear()];
  const upcomingHearings = dashboardData?.upcomingHearings || [];
  const tasksPriority = dashboardData?.tasksPriority || [
    { priority: 'High', count: 8, color: '#ef4444' },
    { priority: 'Medium', count: 12, color: '#f59e0b' },
    { priority: 'Low', count: 3, color: '#10b77f' }
  ];
  const todayTimeEntries = dashboardData?.todayTimeEntries || [];
  const todayExpenses = dashboardData?.todayExpenses || [];
  const recentTasks = dashboardData?.recentTasks || [];

  return (
    <PageTemplate
      title={t('Dashboard')}
      url="/dashboard"
      actions={pageActions}
      description={t("Welcome to your company dashboard.")}
    >
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
          <div className="group-hover:translate-x-2 transition-transform duration-300 min-w-0">
            <p className="text-slate-400 text-sm mb-0.5">{greeting()},</p>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl sm:text-2xl font-bold truncate group-hover:text-primary transition-colors duration-300">
                {auth?.user?.name ?? t('User')}
              </h2>
              <span className="animate-hand-wave text-2xl sm:text-3xl select-none">👋</span>
            </div>
            <p className="text-slate-400 text-xs mt-1 hidden sm:block group-hover:text-slate-300 transition-colors duration-300">
              {t("Here's what's happening across your firm today.")}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
              </div>
              <span className="text-primary font-semibold text-sm">
                {stats.activeCases} {t('active cases')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300">
              <p className="text-white text-lg font-bold leading-tight">{stats.totalCases}</p>
              <p className="text-slate-400 text-[11px]">{t('Total Cases')}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300">
              <p className="text-emerald-400 text-lg font-bold leading-tight">{stats.monthlyGrowth}%</p>
              <p className="text-slate-400 text-[11px]">{t('Growth')}</p>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block" />
            {[
              { icon: Scale, label: t('Cases'), href: route('cases.index'), color: 'text-blue-300 hover:text-blue-200', bg: 'hover:bg-blue-400/10', perm: 'view-cases' },
              { icon: Users, label: t('Clients'), href: route('clients.index'), color: 'text-green-300 hover:text-green-200', bg: 'hover:bg-green-400/10', perm: 'view-clients' },
              { icon: Gavel, label: t('Hearings'), href: route('hearings.index'), color: 'text-violet-300 hover:text-violet-200', bg: 'hover:bg-violet-400/10', perm: 'view-hearings' },
              { icon: MessageSquare, label: t('Messages'), href: route('communication.messages.index'), color: 'text-indigo-300 hover:text-indigo-200', bg: 'hover:bg-indigo-400/10', badge: stats.unreadMessages, perm: 'view-messages' },
              { icon: Settings, label: t('Settings'), href: route('settings'), color: 'text-slate-300 hover:text-slate-200', bg: 'hover:bg-white/10', perm: 'manage-settings' },
            ].filter(({ perm }) => !perm || can(perm)).map(({ icon: Icon, label, href, color, bg, badge }) => (
              <Link key={label} href={href} className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${bg} group/qa`}>
                <Icon className={`h-5 w-5 transition-all duration-200 ${color} group-hover/qa:-translate-y-0.5`} />
                <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">{label}</span>
                {badge > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {/* Active Cases */}
          {can('view-cases') && <Link href={route('cases.index')} className="group">
            <Card className="h-full border border-blue-200 dark:border-blue-900/50 shadow-sm bg-blue-50 dark:bg-blue-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-blue-300/40 dark:bg-blue-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-blue-200/30 dark:bg-blue-600/10 animate-pulse" style={{ animationDuration: '8s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-blue-400/30 dark:bg-blue-400/10 animate-ping" style={{ animationDuration: '6s', animationDelay: '1.5s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-2.5">
                    <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-blue-200 group-hover:text-blue-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-blue-700 dark:text-blue-400 text-xs mb-1">{t('Active Cases')}</p>
                <p className="text-blue-900 dark:text-blue-100 text-2xl font-bold tracking-tight">{stats.activeCases.toLocaleString()}</p>
                <p className="text-blue-600 dark:text-blue-500 text-[11px] mt-1.5">{stats.totalCases} {t('total cases')}</p>
              </CardContent>
            </Card>
          </Link>}

          {/* Active Clients */}
          {can('view-clients') && <Link href={route('clients.index')} className="group">
            <Card className="h-full border border-green-200 dark:border-green-900/50 shadow-sm bg-green-50 dark:bg-green-950/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-green-300/40 dark:bg-green-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-green-200/30 dark:bg-green-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-green-400/30 dark:bg-green-400/10 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-green-100 dark:bg-green-900/50 p-2.5">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-green-200 group-hover:text-green-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-green-700 dark:text-green-400 text-xs mb-1">{t('Active Clients')}</p>
                <p className="text-green-900 dark:text-green-100 text-2xl font-bold tracking-tight">{(stats.activeClients || stats.totalClients).toLocaleString()}</p>
                <p className={`text-[11px] mt-1.5 ${stats.monthlyGrowth >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}>
                  <TrendingUp className="inline h-3 w-3 mr-0.5" />{stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth}% {t('this month')}
                </p>
              </CardContent>
            </Card>
          </Link>}

          {/* Total Revenue */}
          {can('manage-payments') && <Link href={route('billing.payments.index')} className="group">
            <Card className="h-full border border-emerald-300 dark:border-emerald-800 shadow-sm bg-emerald-50 dark:bg-emerald-950/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-emerald-300/40 dark:bg-emerald-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-emerald-200/30 dark:bg-emerald-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-emerald-400/30 dark:bg-emerald-400/10 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/60 p-2.5">
                    <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-600 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 text-xs mb-1">{t('Total Revenue')}</p>
                <p className="text-emerald-900 dark:text-emerald-100 text-2xl font-bold tracking-tight font-mono">{formatCurrency(stats.totalRevenue ?? 0)}</p>
                <p className="text-emerald-600 dark:text-emerald-500 text-[11px] mt-1.5">{t('from payments')}</p>
              </CardContent>
            </Card>
          </Link>}

          {/* Pending Tasks */}
          {can('view-tasks') && <Link href={route('tasks.index')} className="group">
            <Card className={`h-full border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${stats.pendingTasks > 0
              ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
              }`}>
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-amber-300/40 dark:bg-amber-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-amber-200/30 dark:bg-amber-600/10 animate-pulse" style={{ animationDuration: '9s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-amber-400/30 dark:bg-amber-400/10 animate-ping" style={{ animationDuration: '6s', animationDelay: '3s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-xl p-2.5 ${stats.pendingTasks > 0 ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-muted'}`}>
                    <Clock className={`h-5 w-5 ${stats.pendingTasks > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                  </div>
                  {stats.pendingTasks > 0 && (
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 animate-bounce">
                      {t('Due')}
                    </span>
                  )}
                </div>
                <p className="text-amber-700 dark:text-amber-400 text-xs mb-1">{t('Pending Tasks')}</p>
                <p className={`text-2xl font-bold tracking-tight ${stats.pendingTasks > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {stats.pendingTasks.toLocaleString()}
                </p>
                <p className="text-amber-500 dark:text-amber-500 text-[11px] mt-1.5">{stats.upcomingHearings} {t('hearings due')}</p>
              </CardContent>
            </Card>
          </Link>}

        </div>


        {/* ── Today's Timesheets + Today's Expenses ── */}
        {(can('view-time-entries') || can('view-expenses')) && <div className="grid gap-4 lg:grid-cols-2">

          {/* Today's Timesheets */}
          {can('view-time-entries') && <Card className="border border-indigo-100 dark:border-indigo-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t("Today's Timesheets")}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {todayTimeEntries.length > 0
                      ? `${todayTimeEntries.reduce((s, e) => s + e.hours, 0).toFixed(2)} ${t('hrs logged today')}`
                      : t('Time entries logged today')}
                  </p>
                </div>
                <Link href={route('billing.time-entries.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-90 overflow-y-auto">
              {todayTimeEntries.length > 0 ? (
                <div>
                  {todayTimeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{entry.description || t('No description')}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {entry.case_title || t('No case')} {entry.user_name ? `• ${entry.user_name}` : ''}
                          {entry.start_time && entry.end_time ? ` • ${entry.start_time} - ${entry.end_time}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold">{entry.hours.toFixed(2)} {t('hrs')}</span>
                        {entry.is_billable ? (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(entry.total_amount)}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800">{t('Non-billable')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Clock className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No time entries today')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

          {/* Today's Expenses */}
          {can('view-expenses') && <Card className="border border-rose-100 dark:border-rose-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t("Today's Expenses")}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {todayExpenses.length > 0
                      ? <span className="font-mono">{formatCurrency(todayExpenses.reduce((s, e) => s + e.amount, 0))} {t('total today')}</span>
                      : t('Expenses recorded today')}
                  </p>
                </div>
                <Link href={route('billing.expenses.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-90 overflow-y-auto">
              {todayExpenses.length > 0 ? (
                <div>
                  {todayExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
                        <Banknote className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{expense.description || t('No description')}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {expense.category || t('Uncategorized')}{expense.case_title ? ` • ${expense.case_title}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold font-mono">{formatCurrency(expense.amount)}</span>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset capitalize ${expense.status === 'approved' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                          expense.status === 'rejected' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                            'bg-amber-50 text-amber-700 ring-amber-600/20'
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
                  <p className="text-sm text-muted-foreground">{t('No expenses today')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

        </div>}


        {/* ── Monthly Revenue Chart ── */}
        {can('manage-payments') && <div>
          <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Monthly Revenue')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Payments received per month')} — {selectedRevenueYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium font-mono bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-500/30">
                    {formatCurrency(monthlyRevenue.reduce((s, m) => s + m.revenue, 0))}
                  </span>
                  <Select value={String(selectedRevenueYear)} onValueChange={(v) => handleRevenueYearChange(Number(v))}>
                    <SelectTrigger className="h-7 w-24 text-xs focus:ring-0 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((yr) => (
                        <SelectItem key={yr} value={String(yr)} className="text-xs">{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-5">
              {monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={primaryColor} strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="short" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: primaryColor, strokeOpacity: 0.3 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} width={72} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${primaryColor}30`, background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
                      formatter={(value: number) => [formatCurrency(value), t('Revenue')]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.month ?? label}
                    />
                    <Area type="monotone" dataKey="revenue" stroke={primaryColor} strokeWidth={2} fill="url(#revenueGrad)" dot={{ r: 3, fill: primaryColor, strokeWidth: 0 }} activeDot={{ r: 5, fill: primaryColor, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Banknote className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No revenue data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>}

        <div className="grid gap-4 lg:grid-cols-5">
          {/* Upcoming Hearings */}
          {can('view-hearings') && <Card className="lg:col-span-3 border border-violet-100 dark:border-violet-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Upcoming Hearings')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Scheduled court hearings')}</p>
                </div>
                <Link href={route('hearings.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto  h-[375px]">
              {upcomingHearings.length > 0 ? (
                <div>
                  {upcomingHearings.map((hearing, i) => (
                    <div key={hearing.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150 group/row">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover/row:scale-105 transition-transform duration-150">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{hearing.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{hearing.court?.name || hearing.court}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-900/20 dark:text-violet-400">
                          {hearing.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{window.appSettings.formatDate(hearing.date)} {hearing.time}</span>
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
          </Card>}

          {/* Plan Status */}
          {auth?.user?.type == 'company' && <Card className="lg:col-span-2 border border-blue-100 dark:border-blue-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Plan Status')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Usage overview')}</p>
                </div>
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400">
                  {dashboardData?.plan?.name || 'Free Plan'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4 ">
              {(() => {
                const plan = dashboardData?.plan || {};
                const s = dashboardData?.stats || {};
                const maxUsers = plan.max_users || 5;
                const storageLimit = plan.storage_limit || 5;
                const totalStorageUsed = dashboardData?.storage?.total_used || 0;
                const currentUsers = s.currentUsers || 0;

                const radialData = [
                  { name: t('Clients'), value: plan.max_clients ? Math.min(Math.round(((s.totalClients || 0) / plan.max_clients) * 100), 100) : 50, fill: '#8b5cf6' },
                  { name: t('Cases'), value: plan.max_cases ? Math.min(Math.round(((s.totalCases || 0) / plan.max_cases) * 100), 100) : 50, fill: '#3b82f6' },
                  { name: t('Storage'), value: Math.min(Math.round((totalStorageUsed / storageLimit) * 100), 100), fill: '#10b981' },
                  { name: t('Team'), value: Math.min(Math.round((currentUsers / maxUsers) * 100), 100), fill: '#f59e0b' },
                ];

                return (
                  <>
                    {/* Radial chart */}
                    <div className="flex flex-col items-center gap-4">
                      <div style={{ width: 160, height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={72} barSize={10} data={radialData} startAngle={90} endAngle={-270}>
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#F5F5F5' }} />
                            <RechartsTooltip
                              contentStyle={{ fontSize: 11, borderRadius: 8 }}
                              formatter={(value: number, name: string) => [`${value}%`, name]}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full space-y-2.5">
                        {[
                          { label: t('Team'), used: currentUsers, max: maxUsers, pct: radialData[3].value, color: '#f59e0b' },
                          { label: t('Storage'), used: `${totalStorageUsed}GB`, max: `${storageLimit}GB`, pct: radialData[2].value, color: '#10b981' },
                          { label: t('Cases'), used: s.totalCases || 0, max: plan.max_cases || '∞', pct: radialData[1].value, color: '#3b82f6' },
                          { label: t('Clients'), used: s.totalClients || 0, max: plan.max_clients || '∞', pct: radialData[0].value, color: '#8b5cf6' },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-xs font-medium">{item.label}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">{item.used} / {item.max}</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-muted dark:bg-slate-700 overflow-hidden">
                              <div className="h-1 rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${item.pct}%` : '0%', backgroundColor: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Plan details footer */}
                    <div className="mt-4 pt-3 border-t flex items-center justify-between">
                      <div className="space-y-0.5">
                        {plan.is_trial && plan.trial_expire_date && (
                          <div className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">
                            {t('Trial expires')}: {window.appSettings?.formatDate(plan.trial_expire_date) ?? new Date(plan.trial_expire_date).toLocaleDateString()}
                          </div>
                        )}
                        {plan.plan_expire_date && !plan.is_trial && (
                          <p className="text-[11px] text-muted-foreground">{t('Expires')}: {window.appSettings?.formatDate(plan.plan_expire_date) ?? new Date(plan.plan_expire_date).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold font-mono">{formatCurrency(plan.price || 0, true)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        {plan.yearly_price > 0 && (
                          <p className="text-[11px] text-muted-foreground font-mono">{formatCurrency(plan.yearly_price, true)}/yr</p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>}
        </div>

        {/* ── Bottom Row: Recent Tasks + Priority Chart ── */}
        {can('view-tasks') && <div className="grid gap-4 lg:grid-cols-5">

          {/* Recent Tasks */}
          <Card className="lg:col-span-3 border border-violet-100 dark:border-violet-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Recent Tasks')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {recentTasks.length > 0
                      ? `${recentTasks.length} ${t('tasks listed')}`
                      : t('Latest task activity')}
                  </p>
                </div>
                <Link href={route('tasks.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <span className="text-base leading-none">&rsaquo;</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-90 overflow-y-auto">
              {recentTasks.length > 0 ? (
                <div>
                  {recentTasks.map((task) => {
                    const priorityMeta: Record<string, { cls: string }> = {
                      high: { cls: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400', },
                      medium: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400', },
                      low: { cls: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400', },
                      critical: { cls: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400', },
                    };
                    const pm = priorityMeta[task.priority?.toLowerCase()] ?? { cls: 'bg-muted text-muted-foreground ring-border' };
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                    return (
                      <div key={task.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate leading-tight">{task.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {task.case_title || t('No case')}{task.assigned_to ? ` • ${task.assigned_to}` : ''}
                            {task.due_date ? ` • ${window.appSettings?.formatDate(task.due_date) ?? new Date(task.due_date).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${pm.cls}`}>
                            {capitalize(task?.priority)}
                          </span>
                          <span
                            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset"
                            style={{ backgroundColor: task.status_color + '18', color: task.status_color, borderColor: task.status_color + '40' }}
                          >
                            {task.status_name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Target className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No tasks found')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks by Priority Chart */}
          <Card className="lg:col-span-2 border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Tasks by Priority')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Task breakdown')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {tasksPriority.length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tasksPriority}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="count"
                          isAnimationActive={mounted}
                        >
                          {tasksPriority.map((task, i) => (
                            <Cell key={i} fill={task.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(value: number, _: any, entry: any) => [value, entry.payload.priority + ' Priority']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-3">
                    {tasksPriority.map((task, index) => {
                      const total = tasksPriority.reduce((s, t) => s + t.count, 0);
                      const pct = total > 0 ? Math.round((task.count / total) * 100) : 0;
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                              <span className="text-xs font-medium">{task.priority} {t('Priority')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{task.count}</span>
                              <span className="text-[11px] text-muted-foreground w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: task.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Target className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No task data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>}

      </div>

      {/* Share Modal removed */}
    </PageTemplate>
  );
}
