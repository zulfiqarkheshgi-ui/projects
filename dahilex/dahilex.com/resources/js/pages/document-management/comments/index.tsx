import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudTable } from '@/components/CrudTable';
import { PageTemplate } from '@/components/page-template';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { hasPermission } from '@/utils/authorization';
import { router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { getImagePath } from '@/utils/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DocumentCommentsIndex() {
    const { t } = useTranslation();
    const { auth, comments, documents, filters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [documentFilter, setDocumentFilter] = useState(filters.document_id || '_empty_');
    const [statusFilter, setStatusFilter] = useState(filters.status || '_empty_');
    const [showFilters, setShowFilters] = useState(false);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

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
            case 'toggle-resolve':
                handleToggleResolve(item);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };


    const handleToggleResolve = (comment: any) => {
        const action = comment.is_resolved ? 'Reopening' : 'Resolving';

        router.put(route('document-management.comments.toggle-resolve', comment.id), {}, {
            onSuccess: () => {
                toast.success(t('Comment status updated'));
            },
            onError: (errors) => {
                toast.error(`Failed to update comment: ${Object.values(errors).join(', ')}`);
            },
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('document-management.comments.index'), {
            page: 1,
            search: searchTerm || undefined,
            document_id: documentFilter !== '_empty_' ? documentFilter : undefined,
            status: statusFilter !== '_empty_' ? statusFilter : undefined,
            ...(filters.sort_field && { sort_field: filters.sort_field, sort_direction: filters.sort_direction }),
            ...(filters.per_page && { per_page: filters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleFormSubmit = (formData: any) => {
        const action = formMode === 'create' ? 'store' : 'update';
        const routeName = formMode === 'create'
            ? 'document-management.comments.store'
            : 'document-management.comments.update';


        const method = formMode === 'create' ? 'post' : 'put';
        const url = formMode === 'create' ? route(routeName) : route(routeName, currentItem.id);

        router[method](url, formData, {
            onSuccess: () => {
                setIsFormModalOpen(false);
                toast.success(t(`Comment ${formMode === 'create' ? 'added' : 'updated'} successfully`));
            },
            onError: (errors) => {
                toast.error(`Failed to ${action} comment: ${Object.values(errors).join(', ')}`);
            },
        });
    };

    const handleDeleteConfirm = () => {
        router.delete(route('document-management.comments.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.success(t('Comment deleted successfully'));
            },
            onError: (errors) => {
                toast.error(`Failed to delete comment: ${Object.values(errors).join(', ')}`);
            },
        });
    };

    const handleSort = (field: string) => {
        const direction = filters.sort_field === field
            ? (filters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('document-management.comments.index'), {
            page: 1,
            search: searchTerm || undefined,
            document_id: documentFilter !== '_empty_' ? documentFilter : undefined,
            status: statusFilter !== '_empty_' ? statusFilter : undefined,
            sort_field: field,
            sort_direction: direction,
            ...(filters.per_page && { per_page: filters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const actions = [];
    if (hasPermission(permissions, 'create-document-comments')) {
        actions.push({
            label: t('Add Comment'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew,
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Document Management') },
        { title: t('Comments') },
    ];

    const columns = [
        {
            key: 'document',
            label: t('Document'),
            render: (value: any) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{value?.name || '-'}</span>
                </div>
            ),
        },
        {
            key: 'comment_text',
            label: t('Comment'),
            sortable: true,
            render: (value: string) => (
                <div className="max-w-xs truncate">
                    <span className="text-sm">{value || '-'}</span>
                </div>
            ),
        },
        {
            key: 'is_resolved',
            label: t('Status'),
            sortable: true,
            render: (value: boolean) => (
                <div className="flex items-center gap-2">
                    {value ? (
                        <>
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                {t('Resolved')}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                {t('Open')}
                            </span>
                        </>
                    )}
                </div>
            ),
        },
        {
            key: 'creator',
            label: t('Author'),
            render: (value: any) => (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                            <AvatarImage
                                src={value?.avatar}
                                alt={value?.name}
                            />
                            <AvatarFallback className="text-lg">
                                {value?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <span className="text-sm font-medium">{value?.name || '-'}</span>
                </div>
            ),
        },
        {
            key: 'created_at',
            label: t('Created At'),
            sortable: true,
            type: 'date',
        },
    ];

    const tableActions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-document-comments',
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-document-comments',
        },
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-resolve',
            className: 'text-amber-500',
            requiredPermission: 'resolve-document-comments',
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-document-comments',
        },
    ];

    return (
        <PageTemplate
            title={t('Comments')}
            url="/document-management/comments"
            actions={actions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'document_id',
                            label: t('Document'),
                            type: 'select',
                            searchable: true,
                            value: documentFilter,
                            onChange: setDocumentFilter,
                            options: [
                                { value: '_empty_', label: t('All Documents') },
                                ...(documents || []).map((doc: any) => ({
                                    value: doc.id.toString(),
                                    label: doc.name
                                }))
                            ],
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: statusFilter,
                            onChange: setStatusFilter,
                            options: [
                                { value: '_empty_', label: t('All Status') },
                                { value: 'open', label: t('Open') },
                                { value: 'resolved', label: t('Resolved') },
                            ],
                        },
                    ]}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={() => searchTerm !== '' || documentFilter !== '_empty_' || statusFilter !== '_empty_'}
                    activeFilterCount={() => (searchTerm ? 1 : 0) + (documentFilter !== '_empty_' ? 1 : 0) + (statusFilter !== '_empty_' ? 1 : 0)}
                    onResetFilters={() => {
                        setSearchTerm('');
                        setDocumentFilter('_empty_');
                        setStatusFilter('_empty_');
                        setShowFilters(false);
                        router.get(route('document-management.comments.index'), {}, { preserveState: true, preserveScroll: true });
                    }}
                    onApplyFilters={applyFilters}
                    currentPerPage={filters.per_page?.toString() || '10'}
                    onPerPageChange={(value) => {
                        router.get(route('document-management.comments.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            document_id: documentFilter !== '_empty_' ? documentFilter : undefined,
                            status: statusFilter !== '_empty_' ? statusFilter : undefined,
                            sort_field: filters.sort_field || undefined,
                            sort_direction: filters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={tableActions}
                    data={comments?.data || []}
                    from={comments?.from || 1}
                    onAction={handleAction}
                    sortField={filters.sort_field}
                    sortDirection={filters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-document-comments',
                        create: 'create-document-comments',
                        edit: 'edit-document-comments',
                        delete: 'delete-document-comments',
                        'toggle-resolve': 'resolve-document-comments',
                    }}
                />

                <Pagination
                    from={comments?.from || 0}
                    to={comments?.to || 0}
                    total={comments?.total || 0}
                    links={comments?.links}
                    entityName={t('comments')}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                />
            </div>

            {/* View Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>

            {/* Create/Edit Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'document_id',
                            label: t('Document'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: (documents || []).map((doc: any) => ({
                                value: doc.id,
                                label: doc.name
                            })),
                            emptyNote: { link: route('document-management.documents.index'), linkText: t('Documents') }
                        },
                        {
                            name: 'comment_text',
                            label: t('Comment'),
                            type: 'textarea',
                            required: true,
                            rows: 4,
                            placeholder: 'eg. Please review section 2 for accuracy'
                        }
                    ],
                    modalSize: 'lg'
                }}
                initialData={currentItem}
                title={formMode === 'create' ? t('Add New Comment') : t('Edit Comment')}
                mode={formMode as 'create' | 'edit'}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.comment_text || 'comment'}
                entityName="comment"
            />
        </PageTemplate>
    );
}
