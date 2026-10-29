import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import {
    Plus, Clock, CheckCircle, Trash2, Eye, Edit,
    ChevronLeft, ChevronRight,
    Users, FileText, Timer, Blend, CircleDashed, Minus,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/custom-toast';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { capitalize } from '@/utils/helpers';
import ViewPopup from './view';

// ─── Types from controller ────────────────────────────────────────────────────
interface DayEntry {
    id: number;
    entry_id: string;
    hours: number;
    status: 'submitted' | 'approved';
    is_billable: boolean;
    description: string;
    notes: string | null;
    entry_date: string;
    start_time: string | null;
    end_time: string | null;
    billable_rate: number | null;
    user: { id: number; name: string } | null;
    case: { id: number; case_id: string; title: string } | null;
}

interface DayCell {
    day: number;
    date: string;
    day_name: string;
    is_today: boolean;
    is_future: boolean;
    total_hours: number | null;
    entry_count: number;
    status: 'submitted' | 'approved' | 'mixed' | 'empty' | 'future';
    entry_ids: number[];
    entry_id: number | null;
    entries: DayEntry[];
}

interface UserRow {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role: string | null;
    days: DayCell[];
    total_hours_week: number;
}

interface DayHeader {
    day: number;
    day_name: string;
    date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shiftWeek(dateStr: string, direction: 'prev' | 'next'): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    return d.toISOString().split('T')[0];
}


function calcHoursFromTimes(s: string, e: string): number | null {
    if (!s || !e) return null;
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 1440;
    const h = parseFloat((diff / 60).toFixed(2));
    return h > 0 ? h : null;
}

// ─── Status visual config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
    submitted: { icon: <Timer className="h-4 w-4 text-blue-500" />, badge: 'bg-blue-50 text-blue-700 ring-blue-600/20', bar: 'bg-blue-400' },
    approved: { icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, badge: 'bg-green-50 text-green-700 ring-green-600/20', bar: 'bg-emerald-400' },
    mixed: { icon: <Blend className="h-4 w-4 text-amber-500" />, badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', bar: 'bg-amber-400' },
    empty: { icon: <CircleDashed className="h-6 w-4 text-slate" />, badge: 'bg-slate-50 text-slate-700 ring-slate-600/20', bar: 'bg-slate-300' },
    future: { icon: <Minus className="h-4 w-4 text-slate" />, badge: 'bg-slate-50 text-slate-700 ring-slate-600/20', bar: 'bg-slate-300' },
} as const;

// ─── Day cell component ───────────────────────────────────────────────────────
function WeekDayCell({
    cell,
    header,
    onClick,
}: {
    cell: DayCell;
    header: DayHeader;
    onClick: () => void;
}) {
    const cfg = STATUS_CONFIG[cell.status] ?? STATUS_CONFIG.empty;
    const hasData = cell.entry_count > 0;
    const isToday = cell.is_today;

    const tooltipText = hasData
        ? cell.entries.map(e => `${e.case?.title || 'General'}: ${e.hours}h (${capitalize(e.status)})`).join('\n')
        : cell.status === 'future' ? 'Future' : 'Time Sheet Not Added';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={hasData ? onClick : undefined}
                        // disabled={!hasData}
                        className={[
                            'w-full flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all duration-150 min-h-[64px] ring-1 ring-primary/30',
                            hasData
                                ? 'cursor-pointer hover:bg-primary/5 active:scale-95'
                                : 'cursor-default',
                            header.is_weekend && !hasData ? 'opacity-40' : '',
                            isToday ? 'ring-1 ring-primary/30 bg-primary/3' : '',
                        ].join(' ')}
                    >
                        {/* Status icon */}
                        <span className={!hasData ? 'opacity-40' : ''}>{cfg.icon}</span>

                        {/* Hours */}
                        {hasData && (
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 leading-none tabular-nums">
                                {cell.total_hours}h
                            </span>
                        )}

                        {/* Multi-entry count */}
                        {cell.entry_count > 1 && (
                            <span className="text-[9px] text-gray-400 leading-none">
                                {cell.entry_count} entries
                            </span>
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] whitespace-pre-line text-xs">
                    {tooltipText}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: string; sub?: string; color: string;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 min-w-[130px]">
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mb-0.5">{label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.empty;
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset gap-2 ${cfg.badge}`}>
            {cfg.icon}
            {capitalize(status)}
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklyTimesheet() {
    const { t } = useTranslation();
    const {
        auth,
        userRows,
        dayHeaders,
        weekStart,
        monthLabel,
        currentMonthNum,
        currentYearNum,
        cases,
        allUsers,
        filters: pageFilters = {},
    } = usePage().props as any;

    const [selectedUser, setSelectedUser] = useState(pageFilters.user_id || 'all');

    const permissions = auth?.permissions || [];

    // ── modal state ───────────────────────────────────────────────────────────
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDayOpen, setIsDayOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewEntry, setViewEntry] = useState<any>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [dayData, setDayData] = useState<{ cell: DayCell; user: UserRow } | null>(null);

    // ── query params helper ───────────────────────────────────────────────────
    const qp = () => ({ page: pageFilters.page, user_id: selectedUser !== 'all' ? selectedUser : undefined });

    // ── navigation ────────────────────────────────────────────────────────────
    const handleUserChange = (val: string) => {
        setSelectedUser(val);
        router.get(route('billing.time-entries.index'), { week_start: weekStart, page: 1, user_id: val !== 'all' ? val : undefined }, { preserveState: true, preserveScroll: true });
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        let year = currentYearNum;
        let month = currentMonthNum - 1 + (direction === 'next' ? 1 : -1);
        if (month > 11) { month = 0; year++; }
        if (month < 0) { month = 11; year--; }
        const firstDay = new Date(year, month, 1);
        const dow = firstDay.getDay();
        const toMonday = dow === 0 ? -6 : 1 - dow;
        let monday = new Date(year, month, 1 + toMonday);
        if (monday.getMonth() !== month) monday = new Date(year, month, 1 + toMonday + 7);
        const y = monday.getFullYear();
        const m = String(monday.getMonth() + 1).padStart(2, '0');
        const d = String(monday.getDate()).padStart(2, '0');
        router.get(route('billing.time-entries.index'), { ...qp(), week_start: `${y}-${m}-${d}`}, { preserveState: true, preserveScroll: true });
    };

    const navigateWeek = (dir: 'prev' | 'next') =>
        router.get(route('billing.time-entries.index'), { ...qp(), week_start: shiftWeek(weekStart, dir)}, { preserveState: true, preserveScroll: true });

    // ── actions ───────────────────────────────────────────────────────────────
    const openCreate = () => { setActiveItem(null); setFormMode('create'); setIsFormOpen(true); };

    const openEdit = (entry: DayEntry, user: UserRow, date: string) => {
        setActiveItem({ ...entry, case_id: entry.case?.id?.toString(), user_id: user.id.toString(), is_billable: entry.is_billable ? '1' : '0', entry_date: date });
        setFormMode('edit'); setIsDayOpen(false); setIsFormOpen(true);
    };

    const openView = (entry: DayEntry) => { setViewEntry(entry); setIsDayOpen(false); setIsViewOpen(true); };

    const openDelete = (entry: DayEntry) => { setActiveItem(entry); setIsDayOpen(false); setIsDeleteOpen(true); };

    const openDayPanel = (cell: DayCell, user: UserRow) => {
        if (cell.entry_count === 0) return;
        setDayData({ cell, user }); setIsDayOpen(true);
    };

    const handleApprove = (entry: DayEntry) => {
        router.put(route('billing.time-entries.approve', entry.id), {}, {
            onSuccess: (p) => { const f = (p.props as any).flash; if (f?.success) toast.success(f.success); if (f?.error) toast.error(f.error); },
            onError: (e) => toast.error(Object.values(e).join(', ')),
        });
        setIsDayOpen(false);
    };

    const handleSubmit = (formData: any) => {
        if (formData.start_time && formData.end_time) {
            const h = calcHoursFromTimes(formData.start_time, formData.end_time);
            if (h) formData.hours = h;
        }
        const isCreate = formMode === 'create';
        router[isCreate ? 'post' : 'put'](
            isCreate ? route('billing.time-entries.store') : route('billing.time-entries.update', activeItem.id),
            formData,
            {
                onSuccess: (p) => { setIsFormOpen(false); const f = (p.props as any).flash; if (f?.success) toast.success(t(f.success)); else if (f?.error) toast.error(t(f.error)); },
                onError: (e) => toast.error(Object.values(e).join(', ')),
            }
        );
    };

    const handleDelete = () => {
        router.delete(route('billing.time-entries.destroy', activeItem.id), {
            onSuccess: (p) => { setIsDeleteOpen(false); const f = (p.props as any).flash; if (f?.success) toast.success(t(f.success)); else if (f?.error) toast.error(t(f.error)); },
            onError: (e) => toast.error(Object.values(e).join(', ')),
        });
    };

    // ── derived ───────────────────────────────────────────────────────────────
    const rows: UserRow[] = userRows?.data || [];
    const totalWeekHours = rows.reduce((s, u) => s + (u.total_hours_week || 0), 0);
    const totalMembers = userRows?.total;
    const totalWeekEntries = rows.reduce((s, u) => s + u.days.reduce((ds, d) => ds + d.entry_count, 0), 0);

    // ── form fields config ────────────────────────────────────────────────────
    const formFields = [
        {
            name: 'case_user', type: 'dependent-dropdown' as const,
            dependentConfig: [
                {
                    name: 'case_id', label: t('Case'), required: true, searchable: true,
                    options: (cases || []).map((c: any) => ({ value: c.id.toString(), label: c.case_id ? `${c.case_id} - ${c.title}` : 'General' })),
                    emptyNote: { link: route('cases.index'), linkText: t('Cases') },
                },
                {
                    name: 'user_id', label: t('Team Member'), required: true, searchable: true,
                    apiEndpoint: '/api/time-entries/case-users/{case_id}', showCurrentValue: true,
                    emptyNote: (fd?: any) => fd?.case_id ? { link: route('cases.show', fd.case_id), linkText: t('Case Team Members') } : null,
                },
            ],
        },
        { name: 'description', label: t('Description'), type: 'textarea' as const, required: true, placeholder: 'eg. Legal research and document review' },
        { name: 'entry_date', label: t('Entry Date'), type: 'date' as const, required: true },
        { name: 'start_time', label: t('Start Time'), type: 'time' as const, required: true },
        { name: 'end_time', label: t('End Time'), type: 'time' as const, required: true },
        { name: 'is_billable', label: t('Billable'), type: 'select' as const, options: [{ value: '1', label: t('Yes') }, { value: '0', label: t('No') }], defaultValue: '1' },
        { name: 'billable_rate', label: t('Hourly Rate'), type: 'currency' as const, required: true, step: '0.01', min: '0', placeholder: 'eg. 150', conditional: (_: string, fd: any) => fd.is_billable === '1' || fd.is_billable === 1 || fd.is_billable === true },
        { name: 'notes', label: t('Notes'), type: 'textarea' as const, placeholder: 'eg. Overtime work on urgent filing' },
    ];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Billing & Invoicing'), href: route('billing.time-entries.index') },
        { title: t('Time Sheet') },
    ];

    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-time-entries')) {
        pageActions.push({ label: t('Add Time Sheet'), icon: <Plus className="h-4 w-4 mr-2" />, variant: 'default', onClick: openCreate });
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <PageTemplate title={t('Time Sheet')} url="/billing/time-entries" description={t('Track weekly time entries per team member across cases.')} actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            {/* ── Month switcher + Member filter ───────────────────────── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center">
                        {monthLabel}
                    </h2>
                    <button
                        onClick={() => navigateMonth('next')}
                        className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('Team Member')}</label>
                    <Select value={selectedUser} onValueChange={handleUserChange}>
                        <SelectTrigger className="w-full sm:w-[180px] text-sm">
                            <SelectValue placeholder={t('All Members')} />
                        </SelectTrigger>
                        <SelectContent searchable={true}>
                            <SelectItem value="all">{t('All Members')}</SelectItem>
                            {(allUsers || []).map((u: any) => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* ── stats + legend ───────────────────────── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex flex-wrap justify-between">
                        <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400'>
                            {([
                                { status: 'submitted', label: t('Submitted') },
                                { status: 'approved', label: t('Approved') },
                                { status: 'mixed', label: t('Both Status') },
                                { status: 'empty', label: t('Time Sheet Not Added') },
                                { status: 'future', label: t('Future') },
                            ] as const).map(({ status, label }) => (
                                <span key={status} className="flex items-center gap-1.5">{STATUS_CONFIG[status].icon}{label}</span>
                            ))}
                        </div>
                        <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400'>
                            <StatCard icon={Clock} label={t('Week Hours')} value={`${totalWeekHours.toFixed(1)}h`} color="bg-primary" />
                            <StatCard icon={FileText} label={t('Week Entries')} value={String(totalWeekEntries)} color="bg-blue-500" />
                            <StatCard icon={Users} label={t('Members')} value={String(totalMembers)} color="bg-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Weekly timesheet table ────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">


                {/* ── Mobile card view (< md) ─────────────────────────────── */}
                <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Users className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm text-gray-400 dark:text-gray-500">{t('No team members found for this week.')}</p>
                        </div>
                    ) : rows.map((userRow) => (
                        <div key={userRow.id} className="p-4 space-y-3">
                            {/* User header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={userRow.avatar ?? undefined} alt={userRow.name} />
                                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                            {userRow.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{userRow.name}</p>
                                        {userRow.email && <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mt-0.5">{userRow.email}</p>}
                                    </div>
                                </div>
                                <span className={`text-sm font-bold tabular-nums ${userRow.total_hours_week > 0 ? 'text-primary' : 'text-gray-300 dark:text-gray-600'}`}>
                                    {userRow.total_hours_week > 0 ? `${userRow.total_hours_week}h` : '—'}
                                </span>
                            </div>

                            {/* Day grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {(dayHeaders as DayHeader[]).map((h) => {
                                    const cell = userRow.days.find((d) => d.date === h.date);
                                    const isToday = h.date === new Date().toISOString().split('T')[0];
                                    return (
                                        <div key={h.date} className="flex flex-col items-center gap-0.5">
                                            {/* Day label */}
                                            <span className={`text-[9px] font-semibold uppercase ${isToday ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
                                                }`}>{h.day_name.slice(0, 1)}</span>
                                            <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300'
                                                }`}>{h.day}</span>
                                            {/* Cell */}
                                            {cell ? (
                                                <WeekDayCell
                                                    cell={cell}
                                                    header={h}
                                                    onClick={() => openDayPanel(cell, userRow)}
                                                />
                                            ) : (
                                                <div className="w-full min-h-[40px]" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Desktop table view (md+) ─────────────────────────────── */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-gray-200 dark:border-gray-800">
                                {/* Member header with prev button */}
                                <TableHead className="sticky left-0 z-20 bg-white dark:bg-gray-900 text-left px-4 py-3.5 border-r border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                                            {t('Team Member')}
                                        </span>
                                    </div>
                                </TableHead>

                                {/* Day headers */}
                                {(dayHeaders as DayHeader[]).map((h, idx) => {
                                    const isToday = h.date === new Date().toISOString().split('T')[0];
                                    return (
                                        <TableHead
                                            key={h.date}
                                            className="text-center min-w-[100px] px-2 py-3 border-x border-gray-200 dark:border-gray-800"
                                        >
                                            {idx == 0 ? (
                                                <div className='relative flex items-center justify-center'>
                                                    <button onClick={() => navigateWeek('prev')} className="absolute left-0 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                                        <ChevronLeft className="h-6 w-6 text-gray-500" />
                                                    </button>
                                                    <div className=''>
                                                        <div className="text-[10px] font-semibold tracking-widest mb-1.5 text-gray-400 dark:text-gray-500">
                                                            {h.day_name}
                                                        </div>
                                                        <div className={`text-sm font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : ''}`}>
                                                            {h.day}
                                                        </div>
                                                    </div>
                                                </div>) : idx === (dayHeaders.length - 1) ?
                                                <div className='relative flex items-center justify-center'>
                                                    <div className=''>
                                                        <div className="text-[10px] font-semibold tracking-widest mb-1.5 text-gray-400 dark:text-gray-500">
                                                            {h.day_name}
                                                        </div>
                                                        <div className={`text-sm font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : ''}`}>
                                                            {h.day}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => navigateWeek('next')} className="absolute right-0 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                                        <ChevronRight className="h-6 w-6 text-gray-500" />
                                                    </button>
                                                </div>

                                                :
                                                (
                                                    <>
                                                        <div className="text-[10px] font-semibold tracking-widest mb-1.5 text-gray-400 dark:text-gray-500">
                                                            {h.day_name}
                                                        </div>
                                                        <div className={`text-sm font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : ''}`}>
                                                            {h.day}
                                                        </div>
                                                    </>
                                                )}
                                        </TableHead>
                                    );
                                })}

                                {/* Total header with next button */}
                                <TableHead className="sticky right-0 z-20 bg-white dark:bg-gray-900 text-center px-4 py-3.5 min-w-[80px] w-[80px] border-l border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                                            {t('Week')}
                                        </span>
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={(dayHeaders?.length || 7) + 2} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <Users className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                                            </div>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">{t('No team members found for this week.')}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((userRow) => (
                                    <TableRow
                                        key={userRow.id}
                                        className="group hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors border border-gray-200 dark:border-gray-800"
                                    >
                                        {/* Member info — sticky left */}
                                        <TableCell className="sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-gray-50/60 dark:group-hover:bg-gray-800/30 px-4 py-3 border-r border-gray-200 dark:border-gray-800 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm">
                                                    <AvatarImage src={userRow.avatar ?? undefined} alt={userRow.name} />
                                                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                                        {userRow.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                                        {userRow.name}
                                                    </p>
                                                    {userRow.email && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
                                                            {userRow.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Day cells */}
                                        {userRow.days.map((cell) => {
                                            const hdr = (dayHeaders as DayHeader[]).find(h => h.date === cell.date)!;
                                            return (
                                                <TableCell
                                                    key={cell.date}
                                                    className={'px-1 py-1 text-center border-x border-gray-200 dark:border-gray-800'}
                                                >
                                                    <WeekDayCell
                                                        cell={cell}
                                                        header={hdr ?? { day: cell.day, day_name: cell.day_name, date: cell.date }}
                                                        onClick={() => openDayPanel(cell, userRow)}
                                                    />
                                                </TableCell>
                                            );
                                        })}

                                        {/* Week total — sticky right */}
                                        <TableCell className="sticky right-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-gray-50/60 dark:group-hover:bg-gray-800/30 px-4 py-3 text-center border-l border-gray-200 dark:border-gray-800 min-w-[80px] w-[80px] transition-colors">
                                            <p className={`text-sm font-bold tabular-nums ${userRow.total_hours_week > 0 ? 'text-primary' : 'text-gray-200 dark:text-gray-700'}`}>
                                                {userRow.total_hours_week > 0 ? `${userRow.total_hours_week}h` : '—'}
                                            </p>

                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>{/* end desktop table */}

                {/* Pagination */}
                <div className="border-t border-gray-100 dark:border-gray-800">
                    <Pagination
                        from={userRows?.from || 0}
                        to={userRows?.to || 0}
                        total={userRows?.total || 0}
                        links={userRows?.links}
                        entityName={t('team members')}
                        onPageChange={(url) => {
                            const page = new URL(url).searchParams.get('page');
                            router.get(route('billing.time-entries.index'), { ...qp(), page, week_start: weekStart }, { preserveState: true, preserveScroll: true });
                        }}
                        currentPerPage={pageFilters.per_page?.toString() || '10'}
                        onPerPageChange={(value) => {
                            router.get(route('billing.time-entries.index'), {
                                page: 1,
                                per_page: parseInt(value),
                                week_start: weekStart,
                                user_id: selectedUser
                            }, { preserveState: true, preserveScroll: true });
                        }}
                    />
                </div>
            </div>

            {/* ── Day entries slide panel (Dialog) ─────────────────────────── */}
            <Dialog open={isDayOpen} onOpenChange={setIsDayOpen}>
                <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
                    {dayData && (
                        <>
                            {/* Panel header */}
                            <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarImage src={dayData.user.avatar ?? undefined} />
                                        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                                            {dayData.user.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <DialogTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                            {dayData.user.name}
                                        </DialogTitle>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {window.appSettings?.formatDate?.(dayData.cell.date) ?? dayData.cell.date}
                                            {' · '}
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                {dayData.cell.entries.reduce((s, e) => s + (parseFloat(String(e.hours)) || 0), 0).toFixed(2)}h total
                                            </span>
                                            {' · '}
                                            {dayData.cell.entry_count} {t('entries')}
                                        </p>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Entry list */}
                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                                {dayData.cell.entries.map((entry, i) => (
                                    <div
                                        key={entry.id || i}
                                        className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
                                    >
                                        {/* Colored top bar by status */}
                                        <div className={`h-1 w-full ${STATUS_CONFIG[entry.status]?.bar ?? 'bg-gray-200'}`} />

                                        <div className="p-4">
                                            {/* Hours row */}
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                                                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                                            {parseFloat(String(entry.hours)).toFixed(2)}h
                                                        </span>
                                                        {entry.start_time && entry.end_time && (
                                                            <span className="text-xs text-gray-400 ml-2">
                                                                {window.appSettings?.formatTime?.(`2000-01-01T${entry.start_time}`) || entry.start_time}
                                                                {' – '}
                                                                {window.appSettings?.formatTime?.(`2000-01-01T${entry.end_time}`) || entry.end_time}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${entry.is_billable ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                                                        {entry.is_billable ? t('Billable') : t('Non Billable')}
                                                    </span>
                                                    <StatusBadge status={entry.status} />
                                                </div>
                                            </div>

                                            {/* Case */}
                                            {entry.case && (
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <FileText className="h-3 w-3 text-gray-400 shrink-0" />
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {entry.case.case_id ? `${entry.case.case_id} – ` : ''}{entry.case.title}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Description */}
                                            {entry.description && (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 mb-3">
                                                    {entry.description}
                                                </p>
                                            )}

                                            {/* Action buttons */}
                                            <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-200 dark:border-gray-800">
                                                {hasPermission(permissions, 'view-time-entries') && (
                                                    <TooltipProvider><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => openView(entry)}>
                                                                <Eye size={13} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('View')}</TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'edit-time-entries') && (
                                                    <TooltipProvider><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => openEdit(entry, dayData.user, dayData.cell.date)}>
                                                                <Edit size={13} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('Edit')}</TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'approve-time-entries') && entry.status === 'submitted' && (
                                                    <TooltipProvider><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => handleApprove(entry)}>
                                                                <CheckCircle size={13} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('Approve')}</TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'delete-time-entries') && (
                                                    <TooltipProvider><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => openDelete(entry)}>
                                                                <Trash2 size={13} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('Delete')}</TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Add / Edit modal ─────────────────────────────────────────── */}
            <CrudFormModal
                isOpen={isFormOpen}
                onClose={() => { if (activeItem) setIsDayOpen(true); setIsFormOpen(false); }}
                onSubmit={handleSubmit}
                formConfig={{ fields: formFields, modalSize: 'xl' }}
                initialData={activeItem ?? { is_billable: '1' }}
                title={formMode === 'create' ? t('Add New Time Sheet') : t('Edit Time Sheet')}
                mode={formMode}
            />

            {/* ── Delete modal ──────────────────────────────────────────────── */}
            <CrudDeleteModal
                isOpen={isDeleteOpen}
                onClose={() => { setIsDeleteOpen(false); if (dayData) setIsDayOpen(true); }}
                onConfirm={handleDelete}
                itemName={activeItem?.entry_id || ''}
                entityName="time sheet"
            />

            {/* ── View modal ────────────────────────────────────────────────── */}
            <Dialog open={isViewOpen} onOpenChange={() => { setIsViewOpen(false); if (dayData) setIsDayOpen(true); }}>
                {viewEntry && <ViewPopup record={viewEntry} />}
            </Dialog>
        </PageTemplate>
    );
}
