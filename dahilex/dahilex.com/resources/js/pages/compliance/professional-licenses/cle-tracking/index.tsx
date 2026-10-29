import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Download, CheckCircle2, Clock, AlertTriangle, BookOpen, Award, FileCheck } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import { capitalize, formatStatusText, getImagePath } from '@/utils/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';



export default function CleTracking() {
    const { t } = useTranslation();
    const { auth, cleRecords, users, allUsers, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedUser, setSelectedUser] = useState(pageFilters.user_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const getInitials=useInitials();

    const hasActiveFilters = () => searchTerm !== '' || selectedUser !== '_empty_' || selectedStatus !== '_empty_';
    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedUser !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('compliance.cle-tracking.index'), {
            page: 1,
            search: searchTerm || undefined,
            user_id: selectedUser !== '_empty_' ? selectedUser : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('compliance.cle-tracking.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            user_id: selectedUser !== '_empty_' ? selectedUser : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'view':
                setIsViewModalOpen(true);
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'download':
                handleDownload(item);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleDownload = (doc: any) => {
        const link = document.createElement('a');
        link.href = route('compliance.cle-tracking.download', doc.id);
        link.download = doc.course_name || 'certificate';
        link.click();
    };

    const handleFormSubmit = (formData: any) => {

        if (formMode === 'create') {

            router.post(route('compliance.cle-tracking.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    } else if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to create CLE record: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        } else if (formMode === 'edit') {

            router.post(route('compliance.cle-tracking.update', currentItem.id), {
                ...formData,
                _method: 'PUT'
            }, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    } else if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to update CLE record: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        }
    };

    const handleDeleteConfirm = () => {

        router.delete(route('compliance.cle-tracking.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                } else if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to delete CLE record: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };

    const handleResetFilters = () => {
        router.get(route('compliance.cle-tracking.index'));
    };

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedUser, selectedStatus]);


    // Define page actions
    const pageActions = [];

    // Add the "Add CLE Tracking" button if user has permission
    if (hasPermission(permissions, 'create-cle-tracking')) {
        pageActions.push({
            label: t('Add CLE Tracking'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Compliance & Regulatory'), href: route('compliance.requirements.index') },
        { title: t('CLE Tracking') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'user',
            label: t('User'),
            render: (value: any, row: any) => {
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage
                                src={row?.user?.avatar}
                                alt={row?.user?.name}
                            />
                            <AvatarFallback className="text-lg">
                                {getInitials(row?.user?.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{row?.user?.name}</div>
                            <div className="text-sm text-muted-foreground">{row?.user?.email}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'course_name',
            label: t('Course / Provider'),
            sortable: true,
            render: (value: string, row: any) => (
                <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">{value}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-muted-foreground">{row.provider}</p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'credits_earned',
            label: t('Credits'),
            render: (value: any, row: any) => {
                const earned   = parseFloat(value) || 0;
                const required = parseFloat(row.credits_required) || 0;
                const pct      = required > 0 ? Math.min(100, (earned / required) * 100) : 100;
                const color    = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400';
                return (
                    <div className="min-w-[100px] space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                                <Award className="h-3 w-3 text-yellow-500 shrink-0" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                                    {earned}{required > 0 && <span className="font-normal text-gray-400">/{required}</span>}
                                </span>
                            </div>
                            {required > 0 && (
                                <span className={`text-[10px] font-semibold tabular-nums ${
                                    pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-blue-600' : 'text-orange-500'
                                }`}>{Math.round(pct)}%</span>
                            )}
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'completion_date',
            label: t('Completion Date'),
            sortable: true,
            type: "date"
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => {
                const cfg: Record<string, { cls: string; icon: any }> = {
                    completed:   { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: CheckCircle2 },
                    in_progress: { cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',          icon: Clock },
                    expired:     { cls: 'bg-red-50 text-red-700 ring-red-600/20',             icon: AlertTriangle },
                };
                const { cls, icon: Icon } = cfg[value] ?? cfg.completed;
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
                        {t(formatStatusText(value))}
                    </span>
                );
            },
        },
    ];

    // Define table actions
    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-cle-tracking'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-cle-tracking'
        },
        {
            label: t('Download Certificate'),
            icon: 'Download',
            action: 'download',
            className: 'text-green-500',
            requiredPermission: 'download-cle-tracking'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-cle-tracking'
        }
    ];

    // Prepare options for filters and form
    const userOptions = [
        { value: '_empty_', label: t('All Users') },
        ...(allUsers || []).map((user: any) => ({
            value: user.id.toString(),
            label: user.name
        }))
    ];

    const statusOptions = [
        { value: '_empty_', label: t('All Status') },
        { value: 'completed', label: t('Completed') },
        { value: 'in_progress', label: t('In Progress') },
        { value: 'expired', label: t('Expired') }
    ];

    return (
        <PageTemplate
            title={t("CLE Tracking")}
            description={t("Track continuing legal education credits and course completions.")}
            url="/compliance/cle-tracking"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Search and filters section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'user_id',
                            label: t('User'),
                            type: 'select',
                            searchable: true,
                            value: selectedUser,
                            onChange: setSelectedUser,
                            options: userOptions
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: statusOptions
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* Content section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={cleRecords?.data || []}
                    from={cleRecords?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-cle-tracking',
                        create: 'create-cle-tracking',
                        edit: 'edit-cle-tracking',
                        delete: 'delete-cle-tracking'
                    }}
                />

                {/* Pagination section */}
                <Pagination
                    from={cleRecords?.from || 0}
                    to={cleRecords?.to || 0}
                    total={cleRecords?.total || 0}
                    links={cleRecords?.links}
                    entityName={t("CLE records")}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('compliance.cle-tracking.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            user_id: selectedUser !== '_empty_' ? selectedUser : undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                />
            </div>

            {/* Form Modal (Create/Edit) */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'user_id',
                            label: t('User'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: users.map((user: any) => ({
                                value: user.id.toString(),
                                label: user.name
                            })),
                            emptyNote: { link: route('users.index'), linkText: t('Users') }
                        },
                        { name: 'course_name', label: t('Course Name'), type: 'text', required: true, placeholder: 'eg. Ethics in Legal Practice' },
                        { name: 'provider', label: t('Provider'), type: 'text', required: true, placeholder: 'eg. American Bar Association' },
                        { name: 'credits_earned', label: t('Credits Earned'), type: 'number', required: true, placeholder: 'eg. 3' },
                        { name: 'credits_required', label: t('Credits Required'), type: 'number', placeholder: 'eg. 30' },
                        { name: 'completion_date', label: t('Completion Date'), type: 'date', required: true },
                        { name: 'expiry_date', label: t('Expiry Date'), type: 'date' },
                        { name: 'certificate_number', label: t('Certificate Number'), type: 'text', placeholder: 'eg. CERT-2024-5678' },
                        {
                            name: 'certificate_file',
                            label: t('Certificate File'),
                            type: 'media-picker',
                            required: true
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'completed', label: t('Completed') },
                                { value: 'in_progress', label: t('In Progress') },
                                { value: 'expired', label: t('Expired') }
                            ],
                            defaultValue: 'completed'
                        },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Covers professional responsibility and ethical obligations' }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem}
                title={
                    formMode === 'create'
                        ? t('Add New CLE Tracking')
                        : t('Edit CLE Tracking')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.course_name || ''}
                entityName="CLE Tracking"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
