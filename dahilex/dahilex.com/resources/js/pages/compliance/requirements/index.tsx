import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw, ShieldAlert, User, Calendar, Building2, ChevronUp, ChevronsUp, ShieldCheck, ShieldX } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { capitalize, hexToRgba } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import ViewPopup from './view';

export default function ComplianceRequirements() {
    const { t } = useTranslation();
    const { auth, requirements, categories, allCategories, frequencies, regulatoryBodies, stats, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.category_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [selectedPriority, setSelectedPriority] = useState(pageFilters.priority || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('compliance.requirements.index'), {
            page: 1,
            search: searchTerm || undefined,
            category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('compliance.requirements.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
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
            case 'toggle-status':
                setIsStatusModalOpen(true);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('compliance.requirements.toggle-status', currentItem.id), { status: formData.status }, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
                if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                toast.error('Failed to update status');
            }
        });
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            router.post(route('compliance.requirements.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    }
                    if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    toast.error('Failed to create requirement');
                }
            });
        } else if (formMode === 'edit') {
            router.put(route('compliance.requirements.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    }
                    if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    toast.error('Failed to update requirement');
                }
            });
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('compliance.requirements.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
                if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                toast.error('Failed to delete requirement');
            }
        });
    };

    const pageActions = [];
    if (hasPermission(permissions, 'create-compliance-requirements')) {
        pageActions.push({
            label: t('Add Compliance Requirement'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Compliance & Regulatory'), href: route('compliance.requirements.index') },
        { title: t('Compliance Requirements') }
    ];

    const STATUS_META: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
        pending:       { icon: Clock,         cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',   label: t('Pending') },
        in_progress:   { icon: RefreshCw,     cls: 'bg-blue-50 text-blue-700 ring-blue-600/20',         label: t('In Progress') },
        compliant:     { icon: CheckCircle2,  cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', label: t('Compliant') },
        non_compliant: { icon: XCircle,       cls: 'bg-red-50 text-red-700 ring-red-600/20',             label: t('Non Compliant') },
        overdue:       { icon: AlertTriangle, cls: 'bg-red-50 text-red-700 ring-red-600/20',             label: t('Overdue') },
    };

    const PRIORITY_META: Record<string, { cls: string; dot: string; label: string; icon: React.ElementType | null }> = {
        low:      { cls: 'bg-gray-50 text-gray-600 ring-gray-400/20',      dot: 'bg-gray-400',    label: t('Low'),      icon: null },
        medium:   { cls: 'bg-yellow-50 text-yellow-700 ring-yellow-500/20', dot: 'bg-yellow-400',  label: t('Medium'),   icon: null },
        high:     { cls: 'bg-orange-50 text-orange-700 ring-orange-500/20', dot: 'bg-orange-500',  label: t('High'),     icon: ChevronUp },
        critical: { cls: 'bg-red-50 text-red-700 ring-red-500/20',         dot: 'bg-red-500',     label: t('Critical'), icon: ChevronsUp },
    };

    const columns = [
        {
            key: 'title',
            label: t('Requirement'),
            sortable: true,
            render: (_: any, row: any) => {
                const sMeta = STATUS_META[row.status] || STATUS_META.pending;
                const StatusIcon = sMeta.icon;
                return (
                    <div className="flex items-center gap-3 max-w-xs">
                        <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${sMeta.cls}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white leading-snug">{row.title}</p>
                            {row.responsible_party && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <User className="h-3 w-3 shrink-0" />
                                    {row.responsible_party}
                                </p>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'category',
            label: t('Category'),
            render: (_: any, row: any) => {
                const category = row.category;
                if (!category) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium w-fit"
                        style={{
                            backgroundColor: `${category.color}20`,
                            color: category.color,
                            boxShadow: `inset 0 0 0 1px ${hexToRgba(category.color, 0.25)}`,
                        }}
                    >
                        {category.name}
                    </span>
                );
            },
        },
        {
            key: 'deadline',
            label: t('Deadline'),
            sortable: true,
            render: (value: any, row: any) => {
                if (!row.deadline) return <span className="text-xs text-muted-foreground">—</span>;
                const deadlineDate = new Date(row.deadline);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isPast = diffDays < 0;
                const isUrgent = diffDays >= 0 && diffDays <= 7;
                return (
                    <div className={`flex flex-col gap-1 ${(isPast && row.status != 'compliant') ? 'text-red-500' : (isUrgent && row.status != 'compliant')? 'text-orange-500': 'text-gray-500'}`}>
                        <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                            {value && <Calendar className="h-4 w-4" />}
                            <span>{window.appSettings?.formatDate(value) || '-'}</span>
                        </div>
                        {row.status != 'compliant' &&
                        <div className="flex items-center gap-2 text-xs">
                            <Clock className="h-4 w-4" />
                            <span>{Math.abs(diffDays)} days {isPast ? 'overdue' : 'left'}</span>
                        </div>}
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => {
                const meta = STATUS_META[value] || STATUS_META.pending;
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${meta.cls}`}>
                        {meta.label}
                    </span>
                );
            },
        },
        {
            key: 'priority',
            label: t('Priority'),
            render: (value: string) => {
                const meta = PRIORITY_META[value] || PRIORITY_META.medium;
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${meta.cls}`}>
                        {meta.label}
                    </span>
                );
            },
        },
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-compliance-requirements'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-compliance-requirements'
        },
        {
            label: t('Change Status'),
            icon: 'RefreshCw',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-compliance-requirements'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-compliance-requirements'
        }
    ];

    const categoryOptions = [
        { value: '_empty_', label: t('All Categories') },
        ...(allCategories || []).map((category: any) => ({
            value: category.id.toString(),
            label: category.name
        }))
    ];

    const statusOptions = [
        { value: '_empty_', label: t('All Status') },
        { value: 'pending', label: t('Pending') },
        { value: 'in_progress', label: t('In Progress') },
        { value: 'compliant', label: t('Compliant') },
        { value: 'non_compliant', label: t('Non Compliant') },
        { value: 'overdue', label: t('Overdue') }
    ];

    const priorityOptions = [
        { value: '_empty_', label: t('All Priorities') },
        { value: 'low', label: t('Low') },
        { value: 'medium', label: t('Medium') },
        { value: 'high', label: t('High') },
        { value: 'critical', label: t('Critical') }
    ];
    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedCategory, selectedStatus, selectedPriority]);

    const handleResetFilters = () => {
        router.get(route('compliance.requirements.index'));
    };



    return (
        <PageTemplate
            title={t("Compliance Requirements")}
            description={t("Track and manage compliance requirements.")}
            url="/compliance/requirements"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {([
                    { label: t('Total'),         value: stats?.total         ?? 0, icon: ShieldCheck,  iconCls: 'text-gray-600',    blobCls: 'bg-gray-100 dark:bg-gray-700/40' },
                    { label: t('Compliant'),     value: stats?.compliant     ?? 0, icon: CheckCircle2, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                    { label: t('Non Compliant'), value: stats?.non_compliant ?? 0, icon: ShieldX,      iconCls: 'text-red-600',     blobCls: 'bg-red-50 dark:bg-red-900/30' },
                    { label: t('Overdue'),       value: stats?.overdue       ?? 0, icon: AlertTriangle, iconCls: 'text-orange-600',  blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                    <Card key={label} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                        <CardContent className="relative p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                                </div>
                                <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5`}>
                                    <Icon className={`h-5 w-5 ${iconCls}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search and filters section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'category_id',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            value: selectedCategory,
                            onChange: setSelectedCategory,
                            options: categoryOptions
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: statusOptions
                        },
                        {
                            name: 'priority',
                            label: t('Priority'),
                            type: 'select',
                            value: selectedPriority,
                            onChange: setSelectedPriority,
                            options: priorityOptions
                        }
                    ]}
                    hasActiveFilters={() => searchTerm !== '' || selectedCategory !== '_empty_' || selectedStatus !== '_empty_' || selectedPriority !== '_empty_'}
                    activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedPriority !== '_empty_' ? 1 : 0)}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* Content section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={requirements?.data || []}
                    from={requirements?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-compliance-requirements',
                        create: 'create-compliance-requirements',
                        edit: 'edit-compliance-requirements',
                        delete: 'delete-compliance-requirements'
                    }}
                />

                <Pagination
                    from={requirements?.from || 0}
                    to={requirements?.to || 0}
                    total={requirements?.total || 0}
                    links={requirements?.links}
                    entityName={t("requirements")}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('compliance.requirements.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                            priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                />
            </div>

            {/* Form Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. GDPR Data Retention Policy' },
                        { name: 'description', label: t('Description'), type: 'textarea', required: true, placeholder: 'eg. Ensure all client data is retained per GDPR guidelines' },
                        {
                            name: 'regulatory_body_id',
                            label: t('Regulatory Body'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: regulatoryBodies ? regulatoryBodies.map((rb: any) => ({
                                value: rb.id.toString(),
                                label: rb.name
                            })) : [],
                            emptyNote: { link: route('compliance.regulatory-bodies.index'), linkText: t('Regulatory Bodies') }
                        },
                        {
                            name: 'category_id',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: categories ? categories.map((cat: any) => ({
                                value: cat.id.toString(),
                                label: cat.name
                            })) : [],
                            emptyNote: { link: route('compliance.categories.index'), linkText: t('Compliance Categories') }
                        },
                        {
                            name: 'frequency_id',
                            label: t('Frequency'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: frequencies ? frequencies.map((freq: any) => ({
                                value: freq.id.toString(),
                                label: freq.name
                            })) : [],
                            emptyNote: { link: route('compliance.frequencies.index'), linkText: t('Compliance Frequencies') }
                        },
                        { name: 'jurisdiction', label: t('Jurisdiction'), type: 'text', placeholder: 'eg. European Union' },
                        { name: 'scope', label: t('Scope'), type: 'textarea', placeholder: 'eg. Applies to all client data processed within the EU' },
                        { name: 'effective_date', label: t('Effective Date'), type: 'date' },
                        { name: 'deadline', label: t('Deadline'), type: 'date' },
                        { name: 'responsible_party', label: t('Responsible Party'), type: 'text', placeholder: 'eg. Data Protection Officer' },
                        { name: 'evidence_requirements', label: t('Evidence Requirements'), type: 'textarea', placeholder: 'eg. Signed data processing agreements, audit logs' },
                        { name: 'penalty_implications', label: t('Penalty Implications'), type: 'textarea', placeholder: 'eg. Fines up to 4% of annual global turnover' },
                        { name: 'monitoring_procedures', label: t('Monitoring Procedures'), type: 'textarea', placeholder: 'eg. Monthly review of data access logs' },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'pending', label: t('Pending') },
                                { value: 'in_progress', label: t('In Progress') },
                                { value: 'compliant', label: t('Compliant') },
                                { value: 'non_compliant', label: t('Non Compliant') },
                                { value: 'overdue', label: t('Overdue') }
                            ],
                            defaultValue: 'pending'
                        },
                        {
                            name: 'priority',
                            label: t('Priority'),
                            type: 'select',
                            options: [
                                { value: 'low', label: t('Low') },
                                { value: 'medium', label: t('Medium') },
                                { value: 'high', label: t('High') },
                                { value: 'critical', label: t('Critical') }
                            ],
                            defaultValue: 'medium'
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem}
                title={
                    formMode === 'create'
                        ? t('Add New Compliance Requirement')
                        : t('Edit Compliance Requirement')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || ''}
                entityName="compliance requirement"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>

            {/* Status Change Modal */}
            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'pending', label: t('Pending') },
                                { value: 'in_progress', label: t('In Progress') },
                                { value: 'compliant', label: t('Compliant') },
                                { value: 'non_compliant', label: t('Non Compliant') },
                                { value: 'overdue', label: t('Overdue') }
                            ]
                        }
                    ],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Requirement Status')}
                mode='edit'
            />
        </PageTemplate>
    );
}
