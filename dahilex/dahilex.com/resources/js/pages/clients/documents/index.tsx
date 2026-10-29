import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Download } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { formatStatusText, hexToRgba } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export default function ClientDocuments() {
    const { t } = useTranslation();
    const { auth, documents, clients, allClients, documentTypes, allDocumentTypes, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedClient, setSelectedClient] = useState(pageFilters.client_id || '_empty_');
    const [selectedType, setSelectedType] = useState(pageFilters.document_type_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const hasActiveFilters = () => searchTerm !== '' || selectedClient !== '_empty_' || selectedType !== '_empty_' || selectedStatus !== '_empty_';

    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedClient !== '_empty_' ? 1 : 0) + (selectedType !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('clients.documents.index'), {
            page: 1,
            search: searchTerm || undefined,
            client_id: selectedClient !== '_empty_' ? selectedClient : undefined,
            document_type_id: selectedType !== '_empty_' ? selectedType : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('clients.documents.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            client_id: selectedClient !== '_empty_' ? selectedClient : undefined,
            document_type_id: selectedType !== '_empty_' ? selectedType : undefined,
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
        link.href = route('clients.documents.download', doc.id);
        link.download = doc.course_name || 'certificate';
        link.click();

    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {

            router.post(route('clients.documents.store'), formData, {
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
                        toast.error(`Failed to upload document: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        } else if (formMode === 'edit') {

            router.post(route('clients.documents.update', currentItem.id), {
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
                        toast.error(`Failed to update document: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        }
    };

    const handleDeleteConfirm = () => {

        router.delete(route('clients.documents.destroy', currentItem.id), {
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
                    toast.error(`Failed to delete document: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedClient, selectedType, selectedStatus]);


    const handleResetFilters = () => {
        router.get(route('clients.documents.index'));
    };

    // Define page actions
    const pageActions = [];

    // Add the "Add Document" button if user has permission
    if (hasPermission(permissions, 'create-client-documents')) {
        pageActions.push({
            label: t('Add Document'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Client Management'), href: route('clients.index') },
        { title: t('Documents') }
    ];
    const getInitials = useInitials();

    // Define table columns
    const columns = [
        {
        key: 'client',
        label: t('Client'),
        render: (value: any, row: any) => {
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage
                            src={row?.client?.user?.avatar}
                            alt={row?.client?.user?.name}
                        />
                        <AvatarFallback className="text-lg">
                            {getInitials(row?.client?.user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="text-sm font-medium">{row?.client?.user?.name}</div>
                        <div className="text-xs text-muted-foreground">{row?.client?.user?.email}</div>
                    </div>
                </div>
            );
        }
        },
        {
            key: 'document_name',
            label: t('Document Name'),
            sortable: true
        },
        {
            key: 'document_type_id',
            label: t('Type'),
            render: (value: string, row: any) => {
                const docType = row.document_type;
                return docType ? (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                        style={{
                            backgroundColor: `${docType.color}20`,
                            color: docType.color,
                            boxShadow: `inset 0 0 0 1px ${hexToRgba(docType.color, 0.2)}`,
                        }}
                    >
                        {formatStatusText(docType.name || '-')}
                    </span>
                ) : '-';
            }
        },

        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => {
                const statusColors = {
                    active: 'bg-green-50 text-green-700 ring-green-600/20',
                    archived: 'bg-gray-50 text-gray-700 ring-gray-600/20'
                };
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                    </span>
                );
            }
        },
        {
            key: 'created_at',
            label: t('Uploaded'),
            sortable: true,
            type: 'date',
        }
    ];

    // Define table actions
    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-client-documents'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-client-documents'
        },
        {
            label: t('Download'),
            icon: 'Download',
            action: 'download',
            className: 'text-green-500',
            requiredPermission: 'download-client-documents'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-client-documents'
        }
    ];

    // Prepare options for filters and form
    const clientOptions = [
        { value: '_empty_', label: t('All Clients') },
        ...(allClients || []).map((client: any) => ({
            value: client.id.toString(),
            label: client.name
        }))
    ];

    const typeOptions = [
        { value: '_empty_', label: t('All Types') },
        ...(allDocumentTypes || []).map((type: any) => ({
            value: type.id.toString(),
            label: type.name
        }))
    ];

    const statusOptions = [
        { value: '_empty_', label: t('All Status') },
        { value: 'active', label: t('Active') },
        { value: 'archived', label: t('Archived') }
    ];

    return (
        <PageTemplate
            title={t("Documents")}
            description={t("Upload and manage documents for your clients.")}
            url="/clients/documents"
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
                            name: 'client_id',
                            label: t('Client'),
                            type: 'select',
                            searchable: true,
                            value: selectedClient,
                            onChange: setSelectedClient,
                            options: clientOptions
                        },
                        {
                            name: 'document_type_id',
                            label: t('Type'),
                            type: 'select',
                            searchable: true,
                            value: selectedType,
                            onChange: setSelectedType,
                            options: typeOptions
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
                    data={documents?.data || []}
                    from={documents?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-client-documents',
                        create: 'create-client-documents',
                        edit: 'edit-client-documents',
                        delete: 'delete-client-documents'
                    }}
                />

                {/* Pagination section */}
                <Pagination
                    from={documents?.from || 0}
                    to={documents?.to || 0}
                    total={documents?.total || 0}
                    links={documents?.links}
                    entityName={t("documents")}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('clients.documents.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            client_id: selectedClient !== '_empty_' ? selectedClient : undefined,
                            document_type_id: selectedType !== '_empty_' ? selectedType : undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
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
                        {
                            name: 'client_id',
                            label: t('Client'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: clients ? clients.map((client: any) => ({
                                value: client.id.toString(),
                                label: client.name
                            })) : [],
                            emptyNote: { link: route('clients.index'), linkText: t('Clients') }
                        },
                        { name: 'document_name', label: t('Document Name'), type: 'text', required: true, placeholder: 'eg. ID Copy' },
                        {
                            name: 'document_type_id',
                            label: t('Document Type'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: documentTypes ? documentTypes.map((type: any) => ({
                                value: type.id.toString(),
                                label: type.name
                            })) : [],
                            emptyNote: { link: route('advocate.document-types.index'), linkText: t('Document Types') }
                        },
                        {
                            name: 'file',
                            label: t('File'),
                            type: 'media-picker',
                            required: true
                        },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Government issued identification document' },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'active', label: t('Active') },
                                { value: 'archived', label: t('Archived') }
                            ],
                            defaultValue: 'active'
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={{
                    ...currentItem,
                    file: currentItem?.file_path
                }}
                title={
                    formMode === 'create'
                        ? t('Add New Document')
                        : t('Edit Document')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.document_name || ''}
                entityName="document"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
