import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Receipt, CircleDollarSign, Clock, FileText,
} from 'lucide-react';
import { hasPermission } from '@/utils/authorization'
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { Dialog } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/custom-toast';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { formatCurrency, getImagePath } from '@/utils/helpers';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ViewPopup from './view';

function isTruthy(v: any) { return v === 1 || v === '1' || v === true; }

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
    rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 ring-red-600/20' },
};

export default function ExpensesView() {
    const { t } = useTranslation();
    const {
        auth, caseSummaries, casesCount, caseExpenses, caseStatusAmounts, categories, allCategories, cases, stats,
        filters: pageFilters = {}
    } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.expense_category_id || '_empty_');
    const [selectedBillable, setSelectedBillable] = useState(pageFilters.is_billable || '_empty_');
    const [showFilters, setShowFilters] = useState(false);

    // These come from / are synced to URL params
    const activeCaseId = pageFilters.case_id || null;
    const activeTab = (pageFilters.expense_status || 'pending') as 'pending' | 'approved' | 'rejected';

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    const canCreate = hasPermission(permissions, 'create-expenses');
    const canEdit = hasPermission(permissions, 'edit-expenses');
    const canDelete = hasPermission(permissions, 'delete-expenses');
    const canApprove = hasPermission(permissions, 'approve-expenses');
    const canView = hasPermission(permissions, 'view-expenses');

    const hasActiveFilters = () => searchTerm !== '' || selectedCategory !== '_empty_' || selectedBillable !== '_empty_';
    const activeFilterCount = () => [searchTerm, selectedCategory !== '_empty_', selectedBillable !== '_empty_'].filter(Boolean).length;

    // Build base query params (filters + pagination)
    const qp = (extra: Record<string, any> = {}) => ({
        search: searchTerm || undefined,
        expense_category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
        is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
        ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        case_id: activeCaseId || undefined,
        expense_status: activeTab,
        page: pageFilters.page || 1,
        ...(pageFilters.expense_per_page && { expense_per_page: pageFilters.expense_per_page }),
        ...extra,
    });

    const nav = (extra: Record<string, any> = {}) =>
        router.get(route('billing.expenses.index'), qp(extra), { preserveState: true, preserveScroll: true });

    // Select a case from the left panel
    const selectCase = (caseId: string) =>
        nav({ case_id: caseId, expense_page: 1, page: pageFilters.page || 1 });

    // Switch status tab
    const switchTab = (status: string) =>
        nav({ expense_status: status, expense_page: 1 });

    // ── CRUD handlers ─────────────────────────────────────────────────────────
    const handleFormSubmit = (formData: any) => {
        if (!isTruthy(formData.is_billable)) formData.amount = formData.amount || 0;
        const isCreate = formMode === 'create';

        // Use FormData to support file upload (receipt_file)
        const fd = new FormData();
        const scalarFields = ['case_id', 'expense_category_id', 'description', 'is_billable', 'amount', 'expense_date', 'notes'];
        scalarFields.forEach(k => {
            if (formData[k] !== undefined && formData[k] !== null) fd.append(k, formData[k]);
        });
        if (formData.receipt_file instanceof File) fd.append('receipt_file', formData.receipt_file);
        if (!isCreate) fd.append('_method', 'PUT');

        router.post(
            isCreate ? route('billing.expenses.store') : route('billing.expenses.update', currentItem.id),
            fd,
            {
                onSuccess: (page) => {
                    setIsFormOpen(false);
                    const f = page.props.flash as any;
                    if (f?.success) toast.success(f.success);
                    else if (f?.error) toast.error(f.error);
                },
                onError: (errors) => toast.error(Object.values(errors).join(', ')),
            }
        );
    };

    const handleDelete = () => {
        router.delete(route('billing.expenses.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handleApprove = (item: any) =>
        router.put(route('billing.expenses.approve', item.id), {}, {
            onSuccess: (page) => { const f = page.props.flash as any; if (f?.success) toast.success(f.success); else if (f?.error) toast.error(f.error); },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });

    const handleReject = (item: any) =>
        router.put(route('billing.expenses.reject', item.id), {}, {
            onSuccess: (page) => { const f = page.props.flash as any; if (f?.success) toast.success(f.success); else if (f?.error) toast.error(f.error); },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        if (action === 'view') { setIsViewOpen(true); return; }
        if (action === 'edit') {
            setCurrentItem({
                ...item,
                case_id: item.case_id?.toString() || '',
                expense_category_id: item.expense_category_id?.toString() || '',
                is_billable: item.is_billable !== undefined ? item.is_billable.toString() : '1',
            });
            setFormMode('edit'); setIsFormOpen(true); return;
        }
        if (action === 'delete') { setIsDeleteOpen(true); return; }
        if (action === 'approve') { handleApprove(item); return; }
        if (action === 'reject') { handleReject(item); return; }
    };

    // ── Data ──────────────────────────────────────────────────────────────────
    const caseRows: any[] = caseSummaries?.data || [];
    const activeCase = caseRows.find((r: any) => r.id?.toString() === activeCaseId?.toString()) ?? null;
    const expenseData: any[] = caseExpenses?.data || [];
    const statusAmounts: Record<string, { total: number; billable: number; non_billable: number; count: number }> = caseStatusAmounts || {};

    // CrudTable columns
    const columns = [
        {
            key: 'creator', label: t('Submitted By'),
            render: (value: any, row: any) => {
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={row?.creator?.avatar}
                                alt={row?.creator?.name}
                            />
                            <AvatarFallback className="text-lg">
                                {getInitials(row?.creator?.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-sm font-medium">{row?.creator?.name}</div>
                            <div className="text-xs text-muted-foreground">{row?.creator?.email}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'category', label: t('Category'),
            render: (_: any, row: any) => row.category?.name
                ? <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">{row.category.name}</span>
                : <span className="text-gray-400">—</span>,
        },
        {
            key: 'expense_date', label: t('Date'), type: 'date' as const,
        },
        {
            key: 'is_billable', label: t('Billable'),
            render: (_: any, row: any) => {
                const billable = isTruthy(row.is_billable);
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${billable ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/20'}`}>
                        {billable ? t('Yes') : t('No')}
                    </span>
                );
            },
        },
        {
            key: 'amount', label: t('Amount'),
            render: (_: any, row: any) => <span className="font-mono">{formatCurrency(parseFloat(row.amount || 0))}</span>,
        },
    ];

    // CrudTable actions — conditionally show approve/reject based on current tab
    const tableActions: any[] = [
        ...(canApprove && activeTab === 'pending' ? [{
            label: t('Approve'), icon: 'CheckCircle', action: 'approve', className: 'text-emerald-500',
        }] : []),
        ...(canApprove && activeTab === 'pending' ? [{
            label: t('Reject'), icon: 'XCircle', action: 'reject', className: 'text-red-500',
        }] : []),
        ...(canView ? [{ label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500' }] : []),
        ...(canEdit ? [{ label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500' }] : []),
        ...(canDelete ? [{ label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500' }] : []),
    ];

    const pageActions: any[] = canCreate ? [{
        label: t('Add Expense'),
        icon: <Plus className="h-4 w-4 mr-1" />,
        variant: 'default',
        onClick: () => { setCurrentItem(null); setFormMode('create'); setIsFormOpen(true); },
    }] : [];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Billing & Invoicing'), href: route('billing.time-entries.index') },
        { title: t('Expenses') },
    ];

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) nav({ page: pageFilters.page });
        setPageInitialState(false);
    }, [selectedCategory, selectedBillable]);

    const handleResetFilters = () => {
        router.get(route('billing.expenses.index'),{page: pageFilters.page, case_id: activeCaseId});
    };

    return (
        <PageTemplate title={t('Expenses')} description={t('Track and approve employee expenses grouped by case.')} url="/billing/expenses" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>


            {/* ── Summary strip ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {([
                    { label: t('Total'), value: formatCurrency(stats?.total), icon: CircleDollarSign, iconCls: 'text-green-500 dark:text-green-400', blobCls: 'bg-green-50 dark:bg-green-900/30' },
                    { label: t('Pending'), value: formatCurrency(stats?.pending), icon: Clock, iconCls: 'text-yellow-500 dark:text-yellow-400', blobCls: 'bg-yellow-50 dark:bg-yellow-900/30' },
                    { label: t('Approved'), value: formatCurrency(stats?.approved), icon: FileText, iconCls: 'text-emerald-500 dark:text-emerald-400', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                    <Card key={label} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                        <CardContent className="relative p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                    <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">{value}</p>
                                </div>
                                <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5`}>
                                    <Icon className={`h-5 w-5 ${iconCls}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {/* ── Filters ── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={(e) => { e.preventDefault(); nav({ page: pageFilters.page }); }}
                    searchPlaceholder={t('Search expenses...')}
                    filters={[
                        { name: 'expense_category_id', label: t('Category'), type: 'select', searchable: true, value: selectedCategory, onChange: setSelectedCategory, options: [{ value: '_empty_', label: t('All Categories') }, ...(allCategories || []).map((c: any) => ({ value: c.id.toString(), label: c.name }))] },
                        { name: 'is_billable', label: t('Billable'), type: 'select', value: selectedBillable, onChange: setSelectedBillable, options: [{ value: '_empty_', label: t('All Bill Types') }, { value: '1', label: t('Billable') }, { value: '0', label: t('Non-billable') }] },
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* ── Two-column layout ── */}
            {caseRows.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        <Receipt className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('No expenses found')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hasActiveFilters() ? t('Try adjusting your filters.') : t('Add your first expense to get started.')}</p>
                    {!hasActiveFilters() && canCreate && (
                        <button onClick={() => { setCurrentItem(null); setFormMode('create'); setIsFormOpen(true); }} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary cursor-pointer">
                            <Plus className="h-4 w-4" />{t('Add Expense')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4 items-start">

                    {/* ── Left: Case list ── */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden lg:sticky lg:top-4">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('Cases')}</p>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[550px] overflow-auto">
                            {caseRows.map((row: any) => {
                                const isActive = row.id?.toString() === activeCaseId?.toString();
                                return (
                                    <button
                                        key={row.id}
                                        onClick={() => selectCase(row.id.toString())}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${isActive ? 'bg-primary/5 dark:bg-primary/10 border-r-2 border-r-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                    >
                                        <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                            <FileText className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate leading-tight ${isActive ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                                                {row.case_id ?? row.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 tabular-nums">{formatCurrency(row.total_amount)}</span>
                                                {row.pending_count > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                        <Clock className="h-2.5 w-2.5" />{row.pending_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                            {row.total_count}
                                        </span>
                                    </button>
                                );
                            })}
                            {(casesCount > caseSummaries?.data?.length) && <button
                                onClick={() => {
                                    let page = new URL(window.location.href).searchParams.get('page') ?? 1;
                                    const case_id = new URL(window.location.href).searchParams.get('case_id');
                                    page++;
                                    nav({ page, case_id});
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-center transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate leading-tight text-gray-900 dark:text-gray-100`}>
                                        Load More ...
                                    </p>
                                </div>
                            </button>}
                        </div>
                    </div>

                    {/* ── Right: Expenses for selected case ── */}
                    <div>
                        {!activeCaseId ? (
                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center py-24 text-center">
                                <Receipt className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-sm text-gray-400 dark:text-gray-500">{t('Select a case to view expenses')}</p>
                            </div>
                        ) : (
                            <>
                                {/* Panel header */}
                                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm mb-4 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                                    {activeCase
                                                        ? (activeCase.case_id ? `${activeCase.case_id} - ${activeCase.title}` : activeCase.title)
                                                        : '…'}
                                                </p>
                                                {activeCase && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {statusAmounts[activeTab] && (
                                                            <>
                                                                <span className="text-gray-600 dark:text-gray-300">{t('Total')} : <span className="font-mono">{formatCurrency(statusAmounts[activeTab].total ?? 0)}</span></span>
                                                                {' · '}<span className="text-emerald-600 dark:text-emerald-400">{t('Billable')} : <span className="font-mono">{formatCurrency(statusAmounts[activeTab].billable ?? 0)}</span></span>
                                                                {' · '}<span className="text-gray-500 dark:text-gray-400">{t('Non-Billable')} : <span className="font-mono">{formatCurrency(statusAmounts[activeTab].non_billable ?? 0)}</span></span>
                                                            </>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Status tabs with counts */}
                                        <Tabs value={activeTab} onValueChange={switchTab}>
                                            <TabsList className="h-9 flex-wrap">
                                                {(['pending', 'approved', 'rejected'] as const).map((s) => {
                                                    const countMap = { pending: activeCase?.pending_count ?? 0, approved: activeCase?.approved_count ?? 0, rejected: activeCase?.rejected_count ?? 0 };
                                                    const badgeCls = { pending: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400', approved: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', rejected: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' };
                                                    return (
                                                        <TabsTrigger key={s} value={s} className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-black capitalize">
                                                            {t(STATUS_CONFIG[s].label)}
                                                            <span className={`inline-flex items-center justify-center min-w-[16px] h-4 rounded-full px-1 text-[10px] font-bold ${badgeCls[s]}`}>
                                                                {countMap[s]}
                                                            </span>
                                                        </TabsTrigger>
                                                    );
                                                })}
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                </div>

                                {/* CrudTable */}
                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                                    <CrudTable
                                        columns={columns}
                                        actions={tableActions}
                                        data={expenseData}
                                        from={caseExpenses?.from || 1}
                                        onAction={handleAction}
                                        permissions={permissions}
                                        entityPermissions={{
                                            view: 'view-expenses',
                                            create: 'create-expenses',
                                            edit: 'edit-expenses',
                                            delete: 'delete-expenses',
                                        }}
                                    />
                                    {caseExpenses?.total > 0 && (
                                        <Pagination
                                            from={caseExpenses?.from || 0}
                                            to={caseExpenses?.to || 0}
                                            total={caseExpenses?.total || 0}
                                            links={caseExpenses?.links}
                                            entityName={t('expenses')}
                                            hidePerPage
                                            onPageChange={(url) => {
                                                const expensePage = new URL(url).searchParams.get('expense_page');
                                                nav({ expense_page: expensePage });
                                            }}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modals ── */}
            <CrudFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'case_id', label: t('Case'), type: 'select', searchable: true, required: true, options: (cases || []).map((c: any) => ({ value: c.id.toString(), label: c.case_id ? `${c.case_id} - ${c.title}` : c.title })), emptyNote: { link: route('cases.index'), linkText: t('Cases') } },
                        { name: 'expense_category_id', label: t('Category'), type: 'select', searchable: true, required: true, options: (categories || []).filter((c: any) => c.id && c.name).map((c: any) => ({ value: c.id.toString(), label: c.name })), emptyNote: { link: route('billing.expense-categories.index'), linkText: t('Expense Categories') } },
                        { name: 'description', label: t('Description'), type: 'textarea', required: true, placeholder: 'eg. Court filing fees for motion' },
                        { name: 'is_billable', label: t('Billable'), type: 'select', options: [{ value: '1', label: t('Yes') }, { value: '0', label: t('No') }], defaultValue: '1' },
                        { name: 'receipt_file', label: t('Receipt'), type: 'file', required: true,
                            fileValidation: {
                                accept: '.jpg,.jpeg,.png,.pdf',
                                mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
                                extensions: ['.jpg', '.jpeg', '.png', '.pdf'],
                                maxSize: 5 * 1024 * 1024, // 5MB
                            },
                        },
                        { name: 'amount', label: t('Amount'), type: 'number', step: '0.01', required: true, min: '0', placeholder: 'eg. 250', conditional: (_: string, fd: any) => isTruthy(fd.is_billable) },
                        { name: 'expense_date', label: t('Expense Date'), type: 'date', required: true },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Receipt attached' },
                    ],
                    modalSize: 'lg',
                }}
                initialData={currentItem ?? { is_billable: '1' }}
                title={formMode === 'create' ? t('Add New Expense') : t('Edit Expense')}
                mode={formMode}
            />

            <CrudDeleteModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                itemName={currentItem?.description || ''}
                entityName="expense"
            />

            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
