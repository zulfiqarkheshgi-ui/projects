import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { formatCurrency } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';

export default function TimeEntries() {
    const { t } = useTranslation();
    const { auth, timeEntries, cases, allCases, allUsers, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCase, setSelectedCase] = useState(pageFilters.case_id || '_empty_');
    const [selectedUser, setSelectedUser] = useState(pageFilters.user_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [selectedBillable, setSelectedBillable] = useState(pageFilters.is_billable || '_empty_');
    const [dateFrom, setDateFrom] = useState(pageFilters.date_from || '');
    const [dateTo, setDateTo] = useState(pageFilters.date_to || '');
    const [showFilters, setShowFilters] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [calculatedHours, setCalculatedHours] = useState<number | null>(null);

    const hasActiveFilters = () =>
        searchTerm !== '' || selectedCase !== '_empty_' || selectedUser !== '_empty_' ||
        selectedStatus !== '_empty_' || selectedBillable !== '_empty_' || dateFrom !== '' || dateTo !== '';

    const activeFilterCount = () =>
        (searchTerm ? 1 : 0) + (selectedCase !== '_empty_' ? 1 : 0) + (selectedUser !== '_empty_' ? 1 : 0) +
        (selectedStatus !== '_empty_' ? 1 : 0) + (selectedBillable !== '_empty_' ? 1 : 0) +
        (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('billing.time-entries.index'), {
            page: 1,
            search: searchTerm || undefined,
            case_id: selectedCase !== '_empty_' ? selectedCase : undefined,
            user_id: selectedUser !== '_empty_' ? selectedUser : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        // Convert boolean/numeric is_billable to string for form
        if (item) {
            const itemCopy = { ...item };
            if (typeof itemCopy.is_billable === 'boolean' || typeof itemCopy.is_billable === 'number') {
                itemCopy.is_billable = itemCopy.is_billable ? '1' : '0';
            }
            // Ensure case_id and user_id are strings for dependent dropdown
            if (itemCopy.case_id) {
                itemCopy.case_id = itemCopy.case_id.toString();
            }
            if (itemCopy.user_id) {
                itemCopy.user_id = itemCopy.user_id.toString();
            }
            setCurrentItem(itemCopy);
        } else {
            setCurrentItem(item);
        }

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
            case 'approve':
                handleApprove(item);
                break;

        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setCalculatedHours(null);
        setIsFormModalOpen(true);
    };

    // Calculate hours from start and end time
    const calculateHours = (startTime: string, endTime: string): number | null => {
        if (!startTime || !endTime) return null;

        try {
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);

            const startTotalMin = startHour * 60 + startMin;
            const endTotalMin = endHour * 60 + endMin;

            let diffMin = endTotalMin - startTotalMin;

            // Handle case where end time is next day
            if (diffMin < 0) {
                diffMin += 24 * 60;
            }

            const hours = parseFloat((diffMin / 60).toFixed(2));
            return hours > 0 ? hours : null;
        } catch (error) {
            return null;
        }
    };

    const handleFormSubmit = (formData: any) => {
        // Calculate hours from start_time and end_time
        if (formData.start_time && formData.end_time) {
            const hours = calculateHours(formData.start_time, formData.end_time);
            if (hours) {
                formData.hours = hours;
            }
        }

        if (formMode === 'create') {

            router.post(route('billing.time-entries.store'), formData, {
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
                    // Check if it's an error from flash message
                    const page = router.page as any;
                    if (page?.props?.flash?.error) {
                        toast.error(page.props.flash.error);
                    } else {
                        toast.error(`Failed to create time sheet: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        } else if (formMode === 'edit') {

            router.put(route('billing.time-entries.update', currentItem.id), formData, {
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
                    // Check if it's an error from flash message
                    const page = router.page as any;
                    if (page?.props?.flash?.error) {
                        toast.error(page.props.flash.error);
                    } else {
                        toast.error(`Failed to update time sheet: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        }
    };

    const handleDeleteConfirm = () => {

        router.delete(route('billing.time-entries.destroy', currentItem.id), {
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
                toast.error(`Failed to delete time sheet: ${Object.values(errors).join(', ')}`);
            }
        });
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
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('billing.time-entries.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            case_id: selectedCase !== '_empty_' ? selectedCase : undefined,
            user_id: selectedUser !== '_empty_' ? selectedUser : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedCase('_empty_');
        setSelectedUser('_empty_');
        setSelectedStatus('_empty_');
        setSelectedBillable('_empty_');
        setDateFrom('');
        setDateTo('');
        setShowFilters(false);
        router.get(route('billing.time-entries.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Billing & Invoicing'), href: route('billing.time-entries.index') },
        { title: t('Time Sheet') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'entry_id',
            label: t('Entry ID'),
            sortable: true
        },
        {
            key: 'entry_date',
            label: t('Date'),
            sortable: true,
            render: (value: string) => `${window.appSettings?.formatDateTime(value, false) || '-'}`
        },
        {
            key: 'user',
            label: t('Team Member'),
            render: (value: any) => value?.name || '-'
        },
        {
            key: 'case',
            label: t('Case'),
            render: (value: any) => value ? `${value.case_id} - ${value.title}` : t('General')
        },
        {
            key: 'hours',
            label: t('Hours'),
            render: (value: number) => `${value}h`
        },
        {
            key: 'is_billable',
            label: t('Billable'),
            render: (value: boolean) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                    : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                    }`}>
                    {value ? t('Yes') : t('No')}
                </span>
            )
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => {
                const statusColors = {
                    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
                    submitted: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    approved: 'bg-green-50 text-green-700 ring-green-600/20',
                    billed: 'bg-purple-50 text-purple-700 ring-purple-600/20'
                };

                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || statusColors.draft}`}>
                        {t(value?.charAt(0).toUpperCase() + value?.slice(1))}
                    </span>
                );
            }
        },
        {
            key: 'total_amount',
            label: t('Amount'),
            render: (value: any, row: any) => {
                if (!row.is_billable || !row.billable_rate) return '-';
                return (formatCurrency(row.hours * row.billable_rate));
            }
        }
    ];

    // Define table actions
    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-time-entries'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-time-entries',
            condition: (row: any) => row.status !== 'billed'
        },
        {
            label: t('Approve'),
            icon: 'CheckCircle',
            action: 'approve',
            className: 'text-green-500',
            requiredPermission: 'approve-time-entries',
            condition: (row: any) => row.status === 'submitted'
        },

        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-time-entries',
            condition: (row: any) => row.status !== 'billed'
        }
    ];

    // Check if user has manage-own-time-entries permission
    // Handle time change to calculate hours
    const handleTimeChange = (startTime: string, endTime: string) => {
        const hours = calculateHours(startTime, endTime);
        setCalculatedHours(hours);
    };

    return (
        <PageTemplate
            title={t("Time Sheet")}
            url="/billing/time-entries"
            actions={[

                ...(hasPermission(permissions, 'create-time-entries') ? [{
                    label: t('Add Time Sheet'),
                    icon: <Plus className="h-4 w-4 mr-2" />,
                    variant: 'default' as const,
                    onClick: handleAddNew
                }] : [])
            ]}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Search and filters section */}
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
                                { value: '_empty_', label: t('All Cases') },
                                ...(allCases || []).map((caseItem: any) => ({
                                    value: caseItem.id.toString(),
                                    label: caseItem.case_id ? `${caseItem.case_id} - ${caseItem.title}` : 'General'
                                }))
                            ]
                        },
                        {
                            name: 'user_id',
                            label: t('Team Member'),
                            type: 'select',
                            searchable: true,
                            value: selectedUser,
                            onChange: setSelectedUser,
                            options: [
                                { value: '_empty_', label: t('All Users') },
                                ...(allUsers || []).map((user: any) => ({
                                    value: user.id.toString(),
                                    label: user.name
                                }))
                            ]
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
                                { value: 'billed', label: t('Billed') }
                            ]
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
                                { value: '0', label: t('Non-billable') }
                            ]
                        },
                        {
                            name: 'date_from',
                            label: t('Date From'),
                            type: 'date',
                            value: dateFrom,
                            onChange: setDateFrom
                        },
                        {
                            name: 'date_to',
                            label: t('Date To'),
                            type: 'date',
                            value: dateTo,
                            onChange: setDateTo
                        }
                    ]}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    onApplyFilters={applyFilters}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('billing.time-entries.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            case_id: selectedCase !== '_empty_' ? selectedCase : undefined,
                            user_id: selectedUser !== '_empty_' ? selectedUser : undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
                            date_from: dateFrom || undefined,
                            date_to: dateTo || undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            {/* Content section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={timeEntries?.data || []}
                    from={timeEntries?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-time-entries',
                        create: 'create-time-entries',
                        edit: 'edit-time-entries',
                        delete: 'delete-time-entries'
                    }}
                />

                {/* Pagination section */}
                <Pagination
                    from={timeEntries?.from || 0}
                    to={timeEntries?.to || 0}
                    total={timeEntries?.total || 0}
                    links={timeEntries?.links}
                    entityName={t("time sheet")}
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
                            handleTimeChange(formData.start_time || '', formData.end_time || '');
                        }
                    }
                }}
                initialData={currentItem}
                title={
                    formMode === 'create'
                        ? t('Add New Time Sheet')
                        : t('Edit Time Sheet')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.entry_id || ''}
                entityName="time sheet"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
