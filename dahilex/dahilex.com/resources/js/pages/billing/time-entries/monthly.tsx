import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { Plus, Clock, CheckCircle, Pencil, Trash2, Eye, Edit, ChevronLeft, ChevronRight, CircleDashed, Hourglass, Send, BadgeCheck, GitPullRequestDraft, FilePenLine, Blend, Minus, Timer } from 'lucide-react';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/custom-toast';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import ViewPopup from './view';
import { useInitials } from '@/hooks/use-initials';
import { capitalize } from '@/utils/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ── Status colour map ────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
    submitted: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    approved: 'bg-green-50 text-green-700 ring-green-600/20',
    billed: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    mixed: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
};
const statusMap: Record<string, { icon: string | React.ReactNode; className: string; }> = {
    approved: { icon: <span className='text-green'>✓</span>, className: 'text-green-600 dark:text-green-400 font-bold text-base' },
    submitted: { icon: <Timer className='h-4 w-4 text-blue-500 dark:text-blue-400 text-xs' />, className: 'text-blue-500 dark:text-blue-400 text-base' },
    draft: { icon: <span className='text-green text-xs'>⏳</span>, className: 'text-gray-500 dark:text-gray-400 text-base' },
    mixed: { icon: <Blend className='h-4 w-4 text-yellow-500 dark:text-yellow-400 text-xs' />, className: 'text-yellow-500 dark:text-yellow-400 font-bold text-base' },
    empty: { icon: <CircleDashed className='h-4 w-4 text-gray-500 dark:text-gray-400 text-xs' />, className: 'text-gray-500 dark:text-gray-400 font-bold text-base' },
    future: { icon: <Minus className='h-4 w-4 text-gray-500 dark:text-gray-400 text-xs' />, className: 'text-gray-500 dark:text-gray-400 font-bold text-base' },
};

// ── Cell renderer ────────────────────────────────────────────────────────────
function renderCell(day: any) {

    // if ((day.is_future && !day.total_hours) || !day.total_hours) {
    //     return (
    //         <div className="flex items-center justify-center h-8">
    //             {statusMap[day.status].icon}
    //         </div>
    //     );
    // }


    const cfg = statusMap[day.status] ?? { icon: '-', className: 'text-gray-400 text-base' };

    const tooltip = (
        <>
            {(day.is_future && !day.total_hours) || !day.total_hours ?
                (day.status == 'empty' ? 'Time Sheet Not Added' : 'Future') :
                day.entries?.map((e: any, index: number) => (
                    <div key={index}>
                        {e.case?.title || '?'}: {e.hours}h ({capitalize(e.status)})
                    </div>
                ))
            }
        </>
    );

    return (
        <div
            className="flex flex-col items-center justify-center gap-0.5 h-8"
        >
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col text-center items-center">
                            <span className={`leading-none ${cfg.className}`}>{cfg.icon}</span>
                            <span className="text-gray-400 dark:text-gray-500 text-[10px] leading-none mt-0.5">
                                {day.total_hours ? day.total_hours + 'h' : 'ㅤ'}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-[10px] leading-none mt-0.5">
                                {day.entry_count > 1 ? 'x' + day.entry_count : 'ㅤ'}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

export default function monthlyView() {
    const { t } = useTranslation();
    const {
        auth,
        userRows,
        dayHeaders,
        cases,
        allCases,
        allUsers,
        monthOptions,
        yearOptions,
        currentMonth,
        currentYear,
        filters: pageFilters = {},
    } = usePage().props as any;

    const permissions = auth?.permissions || [];

    const [selectedCase, setSelectedCase] = useState(pageFilters.case_id || 'all');
    const [selectedUser, setSelectedUser] = useState(pageFilters.user_id || 'all');
    const [selectedMonth, setSelectedMonth] = useState(pageFilters.month || currentMonth?.toString());
    const [selectedYear, setSelectedYear] = useState(pageFilters.year || currentYear?.toString());
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [selectedBillable, setSelectedBillable] = useState(pageFilters.is_billable || '_empty_');
    const [showFilters, setShowFilters] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewItem, setViewItem] = useState<any>(null);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [prefillDate, setPrefillDate] = useState<string | null>(null);
    const [prefillUserId, setPrefillUserId] = useState<string | null>(null);
    const [dayModalData, setDayModalData] = useState<{ day: any; userRow: any } | null>(null);


    const getInitials = useInitials();

    const navigateMonth = (direction: 'prev' | 'next') => {
        let m = parseInt(selectedMonth);
        let y = parseInt(selectedYear);
        if (direction === 'prev') {
            m -= 1;
            if (m < 1) { m = 12; y -= 1; }
        } else {
            m += 1;
            if (m > 12) { m = 1; y += 1; }
        }
        const newMonth = m.toString();
        const newYear = y.toString();
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
        router.get(route('billing.time-entries.index'), {
            page: 1,
            case_id: selectedCase !== 'all' ? selectedCase : undefined,
            user_id: selectedUser !== 'all' ? selectedUser : undefined,
            search: searchTerm || undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
            month: newMonth,
            year: newYear,
            per_page: pageFilters.per_page,
        }, { preserveState: true, preserveScroll: true });
    };

    const hasActiveFilters = () =>
        searchTerm !== '' || selectedCase !== 'all' || selectedUser !== 'all' ||
        selectedStatus !== '_empty_' || selectedBillable !== '_empty_';

    const activeFilterCount = () =>
        (searchTerm ? 1 : 0) + (selectedCase !== 'all' ? 1 : 0) + (selectedUser !== 'all' ? 1 : 0) +
        (selectedStatus !== '_empty_' ? 1 : 0) + (selectedBillable !== '_empty_' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('billing.time-entries.index'), {
            page: 1,
            search: searchTerm || undefined,
            case_id: selectedCase !== 'all' ? selectedCase : undefined,
            user_id: selectedUser !== 'all' ? selectedUser : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
            month: selectedMonth,
            year: selectedYear,
            per_page: pageFilters.per_page,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedCase('all');
        setSelectedUser('all');
        setSelectedStatus('_empty_');
        setSelectedBillable('_empty_');
        router.get(route('billing.time-entries.index'), {
            month: currentMonth,
            year: currentYear,
        }, { preserveState: true, preserveScroll: true });
    };

    const openViewModal = (entry: any, userRow: any) => {
        setViewItem({
            ...entry,
            entry_date: entry.entry_date,
            case: entry.case ?? null,
        });
        setIsDayModalOpen(false);
        setIsViewModalOpen(true);
    };

    const openEditForm = (entry: any, userRow: any, date: string) => {
        setCurrentItem({
            ...entry,
            case_id: entry.case?.id?.toString(),
            user_id: userRow.id.toString(),
            is_billable: entry.is_billable ? '1' : '0',
            entry_date: date,
        });
        setFormMode('edit');
        setPrefillDate(null);
        setPrefillUserId(null);
        setIsDayModalOpen(false);
        setIsFormModalOpen(true);
    };

    const openDeleteConfirm = (entry: any) => {
        setCurrentItem(entry);
        setIsDayModalOpen(false);
        setIsDeleteModalOpen(true);
    };

    const handleCellClick = (day: any, userRow: any) => {
        if (day.entry_count === 0 || (day.is_future && !day.total_hours)) {
            return;
        } else {
            setDayModalData({ day, userRow });
            setIsDayModalOpen(true);
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setPrefillDate(null);
        setPrefillUserId(null);
        setIsFormModalOpen(true);
    };

    const calculateHours = (startTime: string, endTime: string): number | null => {
        if (!startTime || !endTime) return null;
        try {
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            let diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff < 0) diff += 24 * 60;
            const h = parseFloat((diff / 60).toFixed(2));
            return h > 0 ? h : null;
        } catch { return null; }
    };

    const handleFormSubmit = (formData: any) => {
        if (formData.start_time && formData.end_time) {
            const h = calculateHours(formData.start_time, formData.end_time);
            if (h) formData.hours = h;
        }

        if (formMode === 'create') {
            router.post(route('billing.time-entries.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => toast.error(Object.values(errors).join(', ')),
            });
        } else {
            router.put(route('billing.time-entries.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => toast.error(Object.values(errors).join(', ')),
            });
        }
    };

    const handleApprove = (timeEntry: any) => {
        router.put(route('billing.time-entries.approve', timeEntry.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
                if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to approve time sheet: ${Object.values(errors).join(', ')}`);
            }
        });
        setIsDayModalOpen(false);
        setDayModalData(null);
    };

    const handleDeleteConfirm = () => {
        router.delete(route('billing.time-entries.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const monthName = monthOptions?.find((m: any) => m.value === currentMonth?.toString())?.label || '';

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Billing & Invoicing'), href: route('billing.time-entries.index') },
        { title: t('Time Sheet') },
    ];

    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-time-entries')) {
        pageActions.push({
            label: t('Add Time Sheet'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew,
        });
    }

    return (
        <PageTemplate
            title={t('Time Sheet')}
            url="/billing/time-entries"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'case_id',
                            label: t('Case'),
                            type: 'select',
                            searchable: true,
                            value: selectedCase,
                            onChange: setSelectedCase,
                            options: [
                                { value: 'all', label: t('All Cases') },
                                ...(allCases || []).map((c: any) => ({
                                    value: c.id.toString(),
                                    label: c.case_id ? `${c.case_id} - ${c.title}` : c.title,
                                })),
                            ],
                        },
                        {
                            name: 'user_id',
                            label: t('Team Member'),
                            type: 'select',
                            searchable: true,
                            value: selectedUser,
                            onChange: setSelectedUser,
                            options: [
                                { value: 'all', label: t('All Members') },
                                ...(allUsers || []).map((u: any) => ({
                                    value: u.id.toString(),
                                    label: u.name,
                                })),
                            ],
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                                { value: '_empty_', label: t('All Status') },
                                { value: 'draft', label: t('Draft') },
                                { value: 'submitted', label: t('Submitted') },
                                { value: 'approved', label: t('Approved') },
                            ],
                        },
                        {
                            name: 'is_billable',
                            label: t('Billable'),
                            type: 'select',
                            value: selectedBillable,
                            onChange: setSelectedBillable,
                            options: [
                                { value: '_empty_', label: t('All') },
                                { value: '1', label: t('Billable') },
                                { value: '0', label: t('Non-billable') },
                            ],
                        },
                        {
                            name: 'month',
                            label: t('Month'),
                            type: 'select',
                            value: selectedMonth,
                            onChange: setSelectedMonth,
                            options: (monthOptions || []).map((m: any) => ({ value: m.value, label: m.label })),
                        },
                        {
                            name: 'year',
                            label: t('Year'),
                            type: 'select',
                            value: selectedYear,
                            onChange: setSelectedYear,
                            options: (yearOptions || []).map((y: any) => ({ value: y.value, label: y.label })),
                        },
                    ]}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    onApplyFilters={applyFilters}
                    currentPerPage={pageFilters.per_page?.toString() || '10'}
                    onPerPageChange={(value) => {
                        router.get(route('billing.time-entries.index'), {
                            page: 1,
                            per_page: parseInt(value),
                            search: searchTerm || undefined,
                            case_id: selectedCase !== 'all' ? selectedCase : undefined,
                            user_id: selectedUser !== 'all' ? selectedUser : undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
                            month: selectedMonth,
                            year: selectedYear,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 px-4 py-3 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                        {statusMap['draft'].icon} {t('Draft')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        {statusMap['submitted'].icon} {t('Submitted')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        {statusMap['approved'].icon} {t('Approved')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        {statusMap['mixed'].icon} {t('Mixed')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        {statusMap['empty'].icon} {t('Time Sheet Not Added')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        {statusMap['future'].icon}  {t('Future')}
                    </span>
                </div>
            </div>

            {/* Monthly Grid Table */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {/* Month title row */}
                            <TableRow className="bg-gray-50 dark:bg-gray-800">
                                <TableHead className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 min-w-[200px] w-[200px] border-r border-gray-200 dark:border-gray-700" />
                                <TableHead
                                    colSpan={(dayHeaders || []).length}
                                    className="text-center py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => navigateMonth('prev')}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span>{monthName} {currentYear}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => navigateMonth('next')}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableHead>
                                <TableHead className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 min-w-[72px] w-[72px] border-l border-gray-200 dark:border-gray-700" />
                            </TableRow>

                            {/* Day-number row */}
                            <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <TableHead className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 text-left px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[200px] w-[200px] border-r border-gray-200 dark:border-gray-700">
                                    {t('Team Member')}
                                </TableHead>
                                {(dayHeaders || []).map((header: any) => (
                                    <TableHead
                                        key={header.day}
                                        className={`text-center px-1 py-2 font-medium min-w-[38px] w-[38px] text-gray-600 dark:text-gray-400`}
                                    >
                                        <div className="text-sm font-semibold">{header.day}</div>
                                        <div className="text-xs text-gray-400">{header.day_name}</div>
                                    </TableHead>
                                ))}
                                <TableHead className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 text-center px-2 py-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[72px] w-[72px] border-l border-gray-200 dark:border-gray-700">
                                    {t('Total')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {(userRows?.data || []).length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={(dayHeaders?.length || 0) + 3}
                                        className="text-center py-16 text-gray-400 dark:text-gray-500"
                                    >
                                        {t('No team members found.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                (userRows?.data || []).map((userRow: any, idx: number) => (
                                    <TableRow
                                        key={userRow.id}
                                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''
                                            }`}
                                    >
                                        {/* User info — sticky left */}
                                        <TableCell className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-3 py-2 border-r border-b border-gray-100 dark:border-gray-700 min-w-[200px] w-[200px]">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm overflow-hidden shrink-0">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage
                                                            src={userRow?.avatar}
                                                            alt={userRow?.name}
                                                        />
                                                        <AvatarFallback className="text-lg">
                                                            {userRow?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{userRow.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{capitalize(userRow.role)}</div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Day cells */}
                                        {(userRow.days || []).map((day: any, dIdx: number) => (
                                            <TableCell
                                                key={dIdx}
                                                className="text-center px-1 py-1 dark:bg-gray-900 cursor-pointer border border-gray-100 dark:border-gray-700"
                                                onClick={() => handleCellClick(day, userRow)}
                                            >
                                                {renderCell(day)}
                                            </TableCell>
                                        ))}

                                        {/* Total — sticky right */}
                                        <TableCell className="sticky right-0 z-10 bg-white dark:bg-gray-900 text-center px-2 py-2 border-l border-b border-gray-100 dark:border-gray-700 min-w-[72px] w-[72px]">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {userRow.total_hours_month}h
                                            </span>
                                            {userRow.billed_hours > 0 && (
                                                <div className="text-[10px] text-purple-500 leading-none mt-0.5">
                                                    {userRow.billed_hours}h {t('billed')}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="bg-white dark:bg-gray-900">
                    <Pagination
                        from={userRows?.from || 0}
                        to={userRows?.to || 0}
                        total={userRows?.total || 0}
                        links={userRows?.links}
                        entityName={t('team members')}
                        onPageChange={(url) => {
                            const page = new URL(url).searchParams.get('page');
                            router.get(route('billing.time-entries.index'), {
                                page,
                                per_page: pageFilters.per_page,
                                search: searchTerm || undefined,
                                case_id: selectedCase !== 'all' ? selectedCase : undefined,
                                user_id: selectedUser !== 'all' ? selectedUser : undefined,
                                status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                                is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
                                month: selectedMonth,
                                year: selectedYear,
                            }, { preserveState: true, preserveScroll: true });
                        }}
                    />
                </div>
            </div>

            {/* Add / Edit Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    if (currentItem) {
                        setIsDayModalOpen(true);
                    }
                    setIsFormModalOpen(false)
                }}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'case_user',
                            type: 'dependent-dropdown',
                            dependentConfig: [
                                {
                                    name: 'case_id',
                                    label: t('Case'),
                                    required: true,
                                    searchable: true,
                                    options: (cases || []).map((caseItem: any) => ({
                                        value: caseItem.id.toString(),
                                        label: caseItem.case_id ? `${caseItem.case_id} - ${caseItem.title}` : 'General'
                                    })),
                                    emptyNote: { link: route('cases.index'), linkText: t('Cases') }
                                },
                                {
                                    name: 'user_id',
                                    label: t('Team Member'),
                                    required: true,
                                    searchable: true,
                                    apiEndpoint: '/api/time-entries/case-users/{case_id}',
                                    showCurrentValue: true,
                                    emptyNote: (formData?: any) => formData?.case_id
                                        ? { link: route('cases.show', formData.case_id), linkText: t('Case Team Members') }
                                        : null
                                }
                            ]
                        },
                        { name: 'description', label: t('Description'), type: 'textarea', required: true, placeholder: 'eg. Legal research and document review' },
                        { name: 'entry_date', label: t('Entry Date'), type: 'date', required: true },
                        { name: 'start_time', label: t('Start Time'), type: 'time', required: true },
                        { name: 'end_time', label: t('End Time'), type: 'time', required: true },
                        {
                            name: 'is_billable',
                            label: t('Billable'),
                            type: 'select',
                            options: [
                                { value: '1', label: t('Yes') },
                                { value: '0', label: t('No') }
                            ],
                            defaultValue: '1'
                        },
                        { name: 'billable_rate', label: t('Hourly Rate'), type: 'currency', required: true, step: '0.01', min: '0', placeholder: 'eg. 150', conditional: (mode: string, formData: any) => formData.is_billable === '1' || formData.is_billable === 1 || formData.is_billable === true },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'draft', label: t('Draft') },
                                { value: 'submitted', label: t('Submitted') },
                                { value: 'approved', label: t('Approved') }
                            ],
                            defaultValue: 'draft'
                        },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Overtime work on urgent filing' }
                    ],
                    modalSize: 'xl',
                    onFieldChange: (fieldName: string, value: string, formData: any) => {
                        if (fieldName === 'start_time' || fieldName === 'end_time') {
                            calculateHours(formData.start_time || '', formData.end_time || '');
                        }
                    }
                }}
                initialData={
                    currentItem
                        ? currentItem
                        : {
                            entry_date: prefillDate || '',
                            user_id: prefillUserId || '',
                            is_billable: '1',
                            status: 'draft',
                        }
                }
                title={formMode === 'create' ? t('Add New Time Sheet') : t('Edit Time Sheet')}
                mode={formMode}
            />

            {/* Day entries modal (multi-entry cells) */}
            <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    {dayModalData && (() => {
                        const { day, userRow } = dayModalData;
                        const totalHours = day.entries.reduce((s: number, e: any) => s + (parseFloat(e.hours) || 0), 0);
                        const dateLabel = window.appSettings.formatDate(day.date);
                        return (
                            <>
                                <DialogHeader className="border-b pb-3">
                                    <DialogTitle className="text-base">
                                        {userRow.name} — {dateLabel}
                                    </DialogTitle>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <span>{day.entry_count} {t('entries')}</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {totalHours.toFixed(2)}h {t('total')}
                                        </span>
                                    </div>
                                </DialogHeader>

                                <div className="space-y-3 py-2">
                                    {day.entries.map((entry: any, idx: number) => (
                                        <div
                                            key={entry.id || idx}
                                            className="rounded-lg border border-primary/50 p-3"
                                        >
                                            {/* Hours + status */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-400" />
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                        {parseFloat(entry.hours).toFixed(2)}h
                                                    </span>
                                                    {entry.start_time && entry.end_time && (
                                                        <span className="text-xs text-gray-400">
                                                            {entry?.start_time ? (window.appSettings?.formatTime(`2000-01-01T${entry.start_time}`) || entry.start_time) : ''} -
                                                            {entry?.end_time ? (window.appSettings?.formatTime(`2000-01-01T${entry.end_time}`) || entry.end_time) : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className='flex gap-3'>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${entry.is_billable
                                                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                        : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                                                        }`}>
                                                        {entry.is_billable ? t('Billable') : t('Non Billable')}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[entry.status] ?? statusColors.draft
                                                        }`}>
                                                        {capitalize(entry.status)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Member */}
                                            {entry.user && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    {t('Case')}: <span className="font-medium text-gray-700 dark:text-gray-300">{entry?.case?.title || '-'}</span>
                                                </div>
                                            )}

                                            {/* Description */}
                                            {entry.description && (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{entry.description}</p>
                                            )}
                                            <div className="border-t border-primary/50 my-2"></div>
                                            <div className='flex flex-1 w-full gap-3 justify-end'>
                                                {hasPermission(permissions, 'view-time-entries') && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openViewModal(entry, userRow);
                                                                    }}
                                                                    size="icon" className={'h-8 w-8 text-blue-500'}>
                                                                    <Eye size={16} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{t('View')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'edit-time-entries') && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEditForm(entry, userRow, day.date);
                                                                    }}
                                                                    size="icon" className={'h-8 w-8 text-amber-500'}>
                                                                    <Edit size={16} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{t('Edit')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                {(hasPermission(permissions, 'approve-time-entries') && entry.status === 'submitted') && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost"
                                                                    onClick={(e) => {
                                                                        handleApprove(entry);
                                                                    }}
                                                                    size="icon" className={'h-8 w-8 text-green-500'}>
                                                                    <CheckCircle size={16} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{t('Approve')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'delete-time-entries') && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openDeleteConfirm(entry);
                                                                    }}
                                                                    size="icon" className={'h-8 w-8 text-red-500'}>
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{t('Delete')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setIsDayModalOpen(!isDayModalOpen);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.entry_id || ''}
                entityName="time sheet"
            />
            {/* View Modal */}
            <Dialog open={isViewModalOpen}
                onOpenChange={() => {
                    setIsViewModalOpen(!isViewModalOpen);
                    setIsDayModalOpen(!isDayModalOpen);
                }}>
                {viewItem && <ViewPopup record={viewItem} />}
            </Dialog>
        </PageTemplate>
    );
}
