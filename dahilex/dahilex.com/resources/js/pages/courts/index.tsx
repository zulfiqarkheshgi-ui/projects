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
import { hexToRgba } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import UserColumn from '@/components/UserColumn';

export default function Courts() {
    const { t } = useTranslation();
    const { auth, courts, courtTypes, allCourtTypes, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCourtType, setSelectedCourtType] = useState(pageFilters.court_type_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const hasActiveFilters = () => searchTerm !== '' || selectedCourtType !== '_empty_' || selectedStatus !== '_empty_';

    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedCourtType !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('courts.index'), {
            page: 1,
            search: searchTerm || undefined,
            court_type_id: selectedCourtType !== '_empty_' ? selectedCourtType : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('courts.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            court_type_id: selectedCourtType !== '_empty_' ? selectedCourtType : undefined,
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

            router.post(route('courts.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    } else if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    toast.error(`Failed to create court: ${Object.values(errors).join(', ')}`);
                }
            });
        } else if (formMode === 'edit') {

            router.put(route('courts.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    } else if (page.props.flash.error) {
                        toast.error(page.props.flash.error);
                    }
                },
                onError: (errors) => {
                    toast.error(`Failed to update court: ${Object.values(errors).join(', ')}`);
                }
            });
        }
    };

    const handleDeleteConfirm = () => {

        router.delete(route('courts.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                } else if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to delete court: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleToggleStatus = (court: any) => {
        const newStatus = court.status === 'active' ? 'inactive' : 'active';

        router.put(route('courts.toggle-status', court.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                } else if (page.props.flash.error) {
                    toast.error(page.props.flash.error);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to update court status: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedCourtType, selectedStatus]);


    const handleResetFilters = () => {
        router.get(route('courts.index'));
    };

    const pageActions = [];

    if (hasPermission(permissions, 'create-courts')) {
        pageActions.push({
            label: t('Add Court'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Court Schedule'), href: route('courts.index') },
        { title: t('Courts') }
    ];

    const columns = [
        { key: 'name', label: t('Court Name'), sortable: true,
        render: (value: any, row: any) => {
            return (
                <UserColumn user={row} hideAvatar />
            );
        } },
        {
            key: 'court_type_id',
            label: t('Type'),
            render: (value: string, row: any) => {
                const courtType = row.court_type;
                return courtType ? (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                        style={{
                            backgroundColor: `${courtType.color}20`,
                            color: courtType.color,
                            boxShadow: `inset 0 0 0 1px ${hexToRgba(courtType.color, 0.2)}`,
                        }}
                    >
                        {courtType.name}
                    </span>
                ) : '-';
            }
        },
        { key: 'jurisdiction', label: t('Jurisdiction'), render: (value: string) => value || '-' },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    }`}>
                    {value === 'active' ? t('Active') : t('Inactive')}        </span>
            )
        },
        {
            key: 'created_at',
            label: t('Created At'),
            sortable: true,
            type: 'date',
        }
    ];

    const actions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-courts' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-courts' },
        { label: t('Toggle Status'), icon: 'Lock', action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'toggle-status-courts' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-courts' }
    ];

    const courtTypeOptions = [
        { value: '_empty_', label: t('All Types') },
        ...(allCourtTypes || []).map((type: any) => ({
            value: type.id.toString(),
            label: type.name
        }))
    ];

    const statusOptions = [
        { value: '_empty_', label: t('All Status') },
        { value: 'active', label: t('Active') },
        { value: 'inactive', label: t('Inactive') }
    ];

    return (
        <PageTemplate title={t("Courts")} description={t("Manage courts, jurisdictions, and filing details.")} url="/courts" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        { name: 'court_type_id', label: t('Court Type'), type: 'select', value: selectedCourtType, searchable: true, onChange: setSelectedCourtType, options: courtTypeOptions },
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
                    data={courts?.data || []}
                    from={courts?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{ view: 'view-courts', create: 'create-courts', edit: 'edit-courts', delete: 'delete-courts' }}
                />

                <Pagination
                    from={courts?.from || 0}
                    to={courts?.to || 0}
                    total={courts?.total || 0}
                    links={courts?.links}
                    entityName={t("courts")}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('courts.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            court_type_id: selectedCourtType !== '_empty_' ? selectedCourtType : undefined,
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
                        { name: 'name', label: t('Court Name'), type: 'text', required: true, placeholder: 'eg. New York Supreme Court' },
                        { name: 'court_type_id', label: t('Court Type'), type: 'select', required: true, searchable: true, options: courtTypes ? courtTypes.map((type: any) => ({ value: type.id.toString(), label: type.name })) : [], emptyNote: { link: route('advocate.court-types.index'), linkText: t('Court Types') }},
                        { name: 'jurisdiction', label: t('Jurisdiction'), type: 'text', required: true, placeholder: 'eg. New York State' },
                        { name: 'address', label: t('Address'), type: 'textarea', required: true, placeholder: 'eg. 60 Centre St, New York, NY 10007' },
                        { name: 'phone', label: t('Phone'), type: 'text', required: true, placeholder: 'eg. +1 212 000 0000' },
                        { name: 'email', label: t('Email'), type: 'email', required: true, placeholder: 'eg. clerk@court.gov' },
                        { name: 'filing_requirements', label: t('Filing Requirements'), type: 'textarea', placeholder: 'eg. All documents must be filed in triplicate' },
                        { name: 'local_rules', label: t('Local Rules'), type: 'textarea', placeholder: 'eg. No electronic devices in courtroom' },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Parking available on 2nd floor' },
                        { name: 'status', label: t('Status'), type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], defaultValue: 'active' }
                    ],
                    modalSize: 'xl',
                }}
                initialData={currentItem}
                title={formMode === 'create' ? t('Add New Court') : t('Edit Court')}
                mode={formMode}
                columns={3}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName="court"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
