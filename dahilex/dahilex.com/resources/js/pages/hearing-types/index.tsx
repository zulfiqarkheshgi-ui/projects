import { useEffect, useState } from 'react';
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
import { formatStatusText } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';

export default function HearingTypes() {
    const { t } = useTranslation();
    const { auth, hearingTypes, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== '_empty_';

    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('hearing-types.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('hearing-types.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
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
            case 'toggle-status':
                handleToggleStatus(item);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {

            router.post(route('hearing-types.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    } else if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    toast.error(`Failed to create hearing type: ${Object.values(errors).join(', ')}`);
                }
            });
        } else if (formMode === 'edit') {

            router.put(route('hearing-types.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    } else if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    toast.error(`Failed to update hearing type: ${Object.values(errors).join(', ')}`);
                }
            });
        }
    };

    const handleDeleteConfirm = () => {

        router.delete(route('hearing-types.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                } else if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to delete hearing type: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleToggleStatus = (hearingType: any) => {
        const newStatus = hearingType.status === 'active' ? 'inactive' : 'active';

        router.put(route('hearing-types.toggle-status', hearingType.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                } else if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to update hearing type status: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleResetFilters = () => {
        router.get(route('hearing-types.index'));
    };

    const pageActions = [];

    if (hasPermission(permissions, 'create-hearing-types')) {
        pageActions.push({
            label: t('Add Hearing Type'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Case Management'), href: route('cases.index') },
        { title: t('Case Setup') },
         { title: t('Hearing Types') }
    ];

    const columns = [
        { key: 'name', label: t('Hearing Type'), sortable: true },
        { key: 'duration_estimate', label: t('Duration (min)'), render: (value: number) => value ? `${value} min` : '-' },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    }`}>
                    {formatStatusText(value)}
                </span>
            )
        }
    ];

    const actions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-hearing-types' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-hearing-types' },
        { label: t('Toggle Status'), icon: 'Lock', action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'toggle-status-hearing-types' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-hearing-types' }
    ];

    const statusOptions = [
        { value: '_empty_', label: t('All Status') },
        { value: 'active', label: t('Active') },
        { value: 'inactive', label: t('Inactive') }
    ];

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedStatus]);


    return (
        <PageTemplate title={t("Hearing Types")} url="/hearing-types" actions={pageActions} description={t("Manage hearing types for your hearings.")} breadcrumbs={breadcrumbs} noPadding>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        { name: 'status', label: t('Status'), type: 'select', value: selectedStatus, onChange: setSelectedStatus, options: statusOptions }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={hearingTypes?.data || []}
                    from={hearingTypes?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{ view: 'view-hearing-types', create: 'create-hearing-types', edit: 'edit-hearing-types', delete: 'delete-hearing-types' }}
                />

                <Pagination
                    from={hearingTypes?.from || 0}
                    to={hearingTypes?.to || 0}
                    total={hearingTypes?.total || 0}
                    links={hearingTypes?.links}
                    entityName={t("hearing types")}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('hearing-types.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                />
            </div>

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'name', label: t('Hearing Type Name'), type: 'text', required: true, placeholder: 'eg. Preliminary Hearing' },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Initial hearing to determine case direction' },
                        { name: 'duration_estimate', label: t('Duration Estimate (minutes)'), type: 'number', placeholder: 'eg. 60' },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Requires court reporter' },
                        { name: 'status', label: t('Status'), type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], defaultValue: 'active' }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem}
                title={formMode === 'create' ? t('Add New Hearing Type') : t('Edit Hearing Type')}
                mode={formMode}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName="hearing type"
            />

            {/* View Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
