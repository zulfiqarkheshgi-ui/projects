import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import {
    Plus, Award, Edit, Trash2, Eye, MapPin, Hash,
    Building2, AlertTriangle, CheckCircle2,
    ShieldOff, ShieldAlert, MoreHorizontal, RefreshCw,
} from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog } from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';
import ViewPopup from './view';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    active: { label: 'Active', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    expired: { label: 'Expired', icon: AlertTriangle, cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
    suspended: { label: 'Suspended', icon: ShieldAlert, cls: 'bg-purple-50 text-purple-700 ring-purple-600/20' },
    revoked: { label: 'Revoked', icon: ShieldOff, cls: 'bg-red-50 text-red-700 ring-red-600/20' },
} as const;

function getExpiryMeta(expiryDate: string) {
    if (!expiryDate) return { label: '—', urgent: false, expired: false };
    const exp = new Date(expiryDate);
    const now = new Date();
    const days = Math.ceil((exp.getTime() - now.getTime()) / 86_400_000);
    const fmt = window.appSettings?.formatDate?.(expiryDate) ?? exp.toLocaleDateString();
    if (days < 0) return { label: `${fmt}`, urgent: false, expired: true, days };
    if (days <= 30) return { label: `${fmt} (${days}d)`, urgent: true, expired: false, days };
    return { label: fmt, urgent: false, expired: false, days };
}

function getLicenseProgress(issueDate: string, expiryDate: string) {
    if (!issueDate || !expiryDate) return { percentage: 0, color: 'bg-gray-300' };
    const start = new Date(issueDate).getTime();
    const end = new Date(expiryDate).getTime();
    const now = Date.now();
    const total = end - start;
    if (total <= 0) return { percentage: 100, color: 'bg-gray-400' };
    let pct = Math.max(0, Math.min(100, ((now - start) / total) * 100));
    let color = 'bg-emerald-500';
    if (pct >= 90) color = 'bg-red-500';
    else if (pct >= 75) color = 'bg-orange-500';
    else if (pct >= 50) color = 'bg-yellow-500';
    return { percentage: pct, color };
}

function getLicenseDurationLabel(issueDate: string, expiryDate: string) {
    if (!issueDate || !expiryDate) return 'Permanent';
    const diffDays = Math.ceil(Math.abs(new Date(expiryDate).getTime() - new Date(issueDate).getTime()) / 86_400_000);
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0 && months > 0) return `${years}y ${months}m`;
    if (years > 0) return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    if (months > 0) return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    return `${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}`;
}

function fmtDate(d: string) {
    return window.appSettings?.formatDate?.(d) ?? new Date(d).toLocaleDateString();
}

export default function ProfessionalLicenses() {
    const { t } = useTranslation();
    const {
        auth, stats, licenses, users, allUsers, filters: pageFilters = {},
    } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedUser, setSelectedUser] = useState(pageFilters.user_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    // ── query params ──────────────────────────────────────────────────────────
    const qp = () => ({
        search: searchTerm || undefined,
        user_id: selectedUser !== '_empty_' ? selectedUser : undefined,
        status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
        sort_field: pageFilters.sort_field || undefined,
        sort_direction: pageFilters.sort_direction || undefined,
        ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    });

    const nav = (extra = {}) =>
        router.get(route('compliance.professional-licenses.index'), { ...qp(), ...extra }, { preserveState: true, preserveScroll: true });

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleFormSubmit = (formData: any) => {
        const isCreate = formMode === 'create';
        router[isCreate ? 'post' : 'put'](
            isCreate ? route('compliance.professional-licenses.store') : route('compliance.professional-licenses.update', currentItem.id),
            formData,
            {
                onSuccess: (page) => {
                    setIsFormOpen(false);
                    const f = page.props.flash as any;
                    if (f?.success) toast.success(t(f.success));
                    else if (f?.error) toast.error(t(f.error));
                },
                onError: (errors) => toast.error(Object.values(errors).join(', ')),
            }
        );
    };

    const handleDelete = () => {
        router.delete(route('compliance.professional-licenses.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(t(f.success));
                else if (f?.error) toast.error(t(f.error));
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('compliance.professional-licenses.toggle-status', currentItem.id), formData, {
            onSuccess: (page) => {
                setIsStatusOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(t(f.success));
                else if (f?.error) toast.error(t(f.error));
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    // ── page setup ────────────────────────────────────────────────────────────
    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-professional-licenses')) {
        pageActions.push({
            label: t('Add License'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => { setCurrentItem(null); setFormMode('create'); setIsFormOpen(true); },
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Compliance') },
        { title: t('Professional Licenses') },
    ];

    const data: any[] = licenses?.data || [];

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) nav({ page: 1 });
        setPageInitialState(false);
    }, [selectedUser, selectedStatus]);

    const handleResetFilters = () => {
        router.get(route('compliance.professional-licenses.index'));
    };



    return (
        <PageTemplate title={t('Professional Licenses')} url="/compliance/professional-licenses" description={t("Manage and monitor staff professional licenses and expiry dates.")} actions={pageActions} breadcrumbs={breadcrumbs} noPadding>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                {([
                    { label: t('Total'), value: stats?.total ?? 0, icon: Award, iconCls: 'text-gray-600 dark:text-gray-400', blobCls: 'bg-gray-100 dark:bg-gray-700/40' },
                    { label: t('Active'), value: stats?.active ?? 0, icon: CheckCircle2, iconCls: 'text-emerald-600 dark:text-emerald-400', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                    { label: t('Expired'), value: stats?.expired ?? 0, icon: AlertTriangle, iconCls: 'text-yellow-600 dark:text-yellow-400', blobCls: 'bg-yellow-50 dark:bg-yellow-900/30' },
                    { label: t('Suspended'), value: stats?.suspended ?? 0, icon: ShieldAlert, iconCls: 'text-purple-600 dark:text-purple-400', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                    { label: t('Revoked'), value: stats?.revoked ?? 0, icon: ShieldOff, iconCls: 'text-red-600 dark:text-red-400', blobCls: 'bg-red-50 dark:bg-red-900/30' },
                ] as const).map(({ label, value, iconCls, blobCls, icon: Icon }) => (
                    <Card key={label} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                        <CardContent className="relative p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value || 0}</p>
                                </div>
                                <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5`}>
                                    <Icon className={`h-5 w-5 ${iconCls}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={(e) => { e.preventDefault(); nav({ page: 1 }); }}
                    filters={[
                        {
                            name: 'user_id', label: t('Member'), type: 'select', searchable: true,
                            value: selectedUser, onChange: setSelectedUser,
                            options: [
                                { value: '_empty_', label: t('All Members') },
                                ...(allUsers || []).map((u: any) => ({ value: u.id.toString(), label: u.name })),
                            ],
                        },
                        {
                            name: 'status', label: t('Status'), type: 'select',
                            value: selectedStatus, onChange: setSelectedStatus,
                            options: [
                                { value: '_empty_', label: t('All Statuses') },
                                { value: 'active', label: t('Active') },
                                { value: 'expired', label: t('Expired') },
                                { value: 'suspended', label: t('Suspended') },
                                { value: 'revoked', label: t('Revoked') },
                            ],
                        },
                    ]}
                    hasActiveFilters={() => searchTerm !== '' || selectedUser !== '_empty_' || selectedStatus !== '_empty_'}
                    activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedUser !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0)}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* ── License grid ── */}
            {data.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <Award className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('No licenses found')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('Add a professional license to get started.')}</p>
                        {hasPermission(permissions, 'create-professional-licenses') && (
                            <button
                                onClick={() => { setCurrentItem(null); setFormMode('create'); setIsFormOpen(true); }}
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />{t('Add License')}
                            </button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.map((license: any) => {
                        const sc = STATUS_CONFIG[license.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
                        const StatusIcon = sc.icon;
                        const expiry = getExpiryMeta(license.expiry_date);
                        const progress = getLicenseProgress(license.issue_date, license.expiry_date);
                        const duration = getLicenseDurationLabel(license.issue_date, license.expiry_date);

                        return (
                            <Card key={license.id} className="group flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 border border-t-3 border-t-primary">
                                <CardContent className="flex flex-col flex-1 p-0">

                                    {/* ── Card header ── */}
                                    <div className="flex items-start justify-between gap-2 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* License icon badge */}
                                            <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                                                <Award className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{license.license_type}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Hash className="h-3 w-3 text-gray-400 shrink-0" />
                                                    <p className="text-xs text-gray-500 dark:text-gray-800 font-mono truncate">{license.license_number}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions menu */}
                                        {(hasPermission(permissions, 'view-professional-licenses') ||
                                            hasPermission(permissions, 'edit-professional-licenses') ||
                                            hasPermission(permissions, 'toggle-status-professional-licenses') ||
                                            hasPermission(permissions, 'delete-professional-licenses')) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 transition-opacity text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        {hasPermission(permissions, 'view-professional-licenses') && (
                                                            <DropdownMenuItem onClick={() => { setCurrentItem(license); setIsViewOpen(true); }}>
                                                                <Eye className="h-4 w-4 mr-2" />{t('View')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {hasPermission(permissions, 'edit-professional-licenses') && (
                                                            <DropdownMenuItem onClick={() => { setCurrentItem({ ...license, status: license?.status == 'expired' ? 'active' : license?.status }); setFormMode('edit'); setIsFormOpen(true); }}>
                                                                <Edit className="h-4 w-4 mr-2" />{t('Edit')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {hasPermission(permissions, 'toggle-status-professional-licenses') && (
                                                            <DropdownMenuItem onClick={() => { setCurrentItem(license); setIsStatusOpen(true); }}>
                                                                <RefreshCw className="h-4 w-4 mr-2" />{t('Change Status')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {hasPermission(permissions, 'delete-professional-licenses') && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-red-600" onClick={() => { setCurrentItem(license); setIsDeleteOpen(true); }}>
                                                                    <Trash2 className="h-4 w-4 mr-2" />{t('Delete')}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                    </div>

                                    {/* ── Card body ── */}
                                    <div className="px-5 py-4 space-y-3 flex-1">

                                        {/* Issuing authority + jurisdiction */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-start gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] tracking-wide font-medium">{t('Authority')}</p>
                                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{license.issuing_authority}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] tracking-wide font-medium">{t('Jurisdiction')}</p>
                                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{license.jurisdiction}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* License Duration Progress Timeline */}
                                        <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{duration}</span>
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${expiry.expired ? 'bg-red-50 text-red-700 ring-red-600/20' : expiry.urgent ? 'bg-orange-50 text-orange-700 ring-orange-600/20' : 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                                                    {expiry.expired
                                                        ? t('Expired')
                                                        : expiry.days !== undefined
                                                            ? `${expiry.days} d left`
                                                            : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                                                <span>{license.issue_date ? fmtDate(license.issue_date) : '—'}</span>
                                                <span className={expiry.expired ? 'text-red-500' : expiry.urgent ? 'text-orange-500' : ''}>
                                                    {license.expiry_date ? fmtDate(license.expiry_date) : '—'}
                                                </span>
                                            </div>
                                            <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${progress.color}`}
                                                    style={{ width: `${progress.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Card footer ── */}
                                    <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                                        {/* Assignee */}
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white dark:ring-gray-900">
                                                <AvatarImage src={license.user?.avatar} alt={license.user?.name} />
                                                <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                                    {getInitials(license.user?.name || '?')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 truncate font-medium">{license?.user?.name}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{license?.user?.email}</div>
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0 ${sc.cls}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {t(sc.label)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── Pagination ── */}
            {licenses?.total > 0 && (
                <div className="mt-5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <Pagination
                        from={licenses?.from || 0}
                        to={licenses?.to || 0}
                        total={licenses?.total || 0}
                        links={licenses?.links}
                        entityName={t('licenses')}
                        perPageOptions={[9, 27, 45, 90]}
                        currentPerPage={pageFilters.per_page?.toString() || '9'}
                        onPerPageChange={(value) => nav({ page: 1, per_page: parseInt(value) })}
                        onPageChange={(url) => {
                            const page = new URL(url).searchParams.get('page');
                            nav({ page });
                        }}
                    />
                </div>
            )}

            {/* ── Create / Edit modal ── */}
            <CrudFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'user_id', label: t('Team Member'), type: 'select', required: true, searchable: true,
                            options: (users || []).map((u: any) => ({ value: u.id.toString(), label: u.name })),
                            emptyNote: { link: route('users.index'), linkText: t('Users') },
                        },
                        { name: 'license_type', label: t('License Type'), type: 'text', required: true, placeholder: 'eg. Bar License' },
                        { name: 'license_number', label: t('License Number'), type: 'text', required: true, placeholder: 'eg. BAR-2024-001' },
                        { name: 'issuing_authority', label: t('Issuing Authority'), type: 'text', required: true, placeholder: 'eg. State Bar Association' },
                        { name: 'jurisdiction', label: t('Jurisdiction'), type: 'text', required: true, placeholder: 'eg. New York' },
                        { name: 'issue_date', label: t('Issue Date'), type: 'date', required: true },
                        { name: 'expiry_date', label: t('Expiry Date'), type: 'date', required: true },
                        {
                            name: 'status', label: t('Status'), type: 'select',
                            options: [
                                { value: 'active', label: t('Active') },
                                { value: 'suspended', label: t('Suspended') },
                                { value: 'revoked', label: t('Revoked') },
                            ],
                            defaultValue: 'active',
                        },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: t('Any additional notes about this license...') },
                    ],
                    modalSize: 'xl',
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    user_id: currentItem.user_id?.toString() || currentItem.user?.id?.toString(),
                } : null}
                title={formMode === 'create' ? t('Add Professional License') : t('Edit Professional License')}
                mode={formMode}
            />

            {/* ── Change status modal ── */}
            <CrudFormModal
                isOpen={isStatusOpen}
                onClose={() => setIsStatusOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [
                        {
                            name: 'status', label: t('Status'), type: 'select', required: true,
                            options: [
                                { value: 'active', label: t('Active') },
                                { value: 'suspended', label: t('Suspended') },
                                { value: 'revoked', label: t('Revoked') },
                            ],
                        },
                    ],
                    modalSize: 'sm',
                }}
                initialData={currentItem ? { status: currentItem.status == 'expired' ? 'active' : currentItem.status } : null}
                title={t('Change License Status')}
                mode="edit"
            />

            {/* ── Delete modal ── */}
            <CrudDeleteModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                itemName={currentItem?.license_number || ''}
                entityName="professional license"
            />

            {/* ── View modal ── */}
            <Dialog open={isViewOpen} onOpenChange={() => setIsViewOpen(false)}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
