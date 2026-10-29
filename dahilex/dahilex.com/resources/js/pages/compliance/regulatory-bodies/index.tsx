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
import { capitalize } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import UserColumn from '@/components/UserColumn';

export default function RegulatoryBodies() {
    const { t } = useTranslation();
    const { auth, bodies, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [selectedJurisdiction, setSelectedJurisdiction] = useState(pageFilters.jurisdiction || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('compliance.regulatory-bodies.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            jurisdiction: selectedJurisdiction !== '_empty_' ? selectedJurisdiction : undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('compliance.regulatory-bodies.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            jurisdiction: selectedJurisdiction !== '_empty_' ? selectedJurisdiction : undefined,
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

    const handleToggleStatus = (item: any) => {
        router.put(route('compliance.regulatory-bodies.toggle-status', item.id), {}, {
            onSuccess: (page) => {
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

            router.post(route('compliance.regulatory-bodies.store'), formData, {
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
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to create Regulatory Body record: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        }
        else if (formMode === 'edit') {
            router.put(route('compliance.regulatory-bodies.update', currentItem.id), formData, {
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
                    toast.error('Failed to update regulatory body');
                }
            });
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('compliance.regulatory-bodies.destroy', currentItem.id), {
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
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error('Failed to delete regulatory body');
                }
            }
        });
    };

    const pageActions = [];
    if (hasPermission(permissions, 'create-regulatory-bodies')) {
        pageActions.push({
            label: t('Add Regulatory Body'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Compliance & Regulatory'), href: route('compliance.requirements.index') },
        { title: t('Regulatory Bodies') }
    ];

    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: any, row: any) => {
                return (
                    <UserColumn user={{name: value,email: row.contact_email}} hideAvatar />
                );
            }
        },
        {
            key: 'jurisdiction',
            label: t('Jurisdiction'),
            sortable: true
        },
        {
            key: 'contact_phone',
            label: t('Contact Phone'),
            render: (value: string) => value || '-'
        },
        {
            key: 'website',
            label: t('Website'),
            render: (value: string) => value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {value}
                </a>
            ) : '-'
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => {
                const statusColors = {
                    active: 'bg-green-50 text-green-700 ring-green-600/20',
                    inactive: 'bg-red-50 text-red-700 ring-red-600/20'
                };
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                        {t(capitalize(value))}
                    </span>
                );
            }
        }
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-regulatory-bodies'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-regulatory-bodies'
        },
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-regulatory-bodies'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-regulatory-bodies'
        }
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

    const handleResetFilters = () => {
        router.get(route('compliance.regulatory-bodies.index'));
    };


    return (
        <PageTemplate
            title={t("Regulatory Bodies")}
            description={t("Manage regulatory authorities and their contact information.")}
            url="/compliance/regulatory-bodies"
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
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: statusOptions
                        }
                    ]}
                    hasActiveFilters={() => searchTerm !== '' || selectedStatus !== '_empty_' || selectedJurisdiction !== '_empty_'}
                    activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedJurisdiction !== '_empty_' ? 1 : 0)}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* Content section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={bodies?.data || []}
                    from={bodies?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-regulatory-bodies',
                        create: 'create-regulatory-bodies',
                        edit: 'edit-regulatory-bodies',
                        delete: 'delete-regulatory-bodies'
                    }}
                />

                <Pagination
                    from={bodies?.from || 0}
                    to={bodies?.to || 0}
                    total={bodies?.total || 0}
                    links={bodies?.links}
                    entityName={t("regulatory bodies")}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('compliance.regulatory-bodies.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                            jurisdiction: selectedJurisdiction !== '_empty_' ? selectedJurisdiction : undefined,
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
                        { name: 'name', label: t('Name'), type: 'text', required: true, placeholder: 'eg. Financial Industry Regulatory Authority' },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. US regulator for broker-dealers and exchange markets' },
                        { name: 'jurisdiction', label: t('Jurisdiction'), type: 'text', required: true, placeholder: 'eg. United States' },
                        { name: 'contact_email', label: t('Contact Email'), type: 'email', placeholder: 'eg. contact@regulator.gov' },
                        { name: 'contact_phone', label: t('Contact Phone'), type: 'text', placeholder: 'eg. +1 202 000 0000' },
                        { name: 'address', label: t('Address'), type: 'textarea', placeholder: 'eg. 1735 K St NW, Washington, DC 20006' },
                        { name: 'website', label: t('Website'), type: 'text', placeholder: 'eg. https://www.finra.org' },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'active', label: t('Active') },
                                { value: 'inactive', label: t('Inactive') }
                            ],
                            defaultValue: 'active'
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem}
                title={
                    formMode === 'create'
                        ? t('Add New Regulatory Body')
                        : t('Edit Regulatory Body')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName="regulatory body"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
