import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Download, FileText } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

export default function Documents() {
  const { t } = useTranslation();
  const { auth, documents, categories, allCategories, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(pageFilters.category_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedConfidentiality, setSelectedConfidentiality] = useState(pageFilters.confidentiality || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const hasActiveFilters = () =>
    searchTerm !== '' || selectedCategory !== '_empty_' || selectedStatus !== '_empty_' || selectedConfidentiality !== '_empty_';

  const activeFilterCount = () =>
    (searchTerm ? 1 : 0) +
    (selectedCategory !== '_empty_' ? 1 : 0) +
    (selectedStatus !== '_empty_' ? 1 : 0) +
    (selectedConfidentiality !== '_empty_' ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('document-management.documents.index'), {
      page: 1,
      search: searchTerm || undefined,
      category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      confidentiality: selectedConfidentiality !== '_empty_' ? selectedConfidentiality : undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    router.get(route('document-management.documents.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      confidentiality: selectedConfidentiality !== '_empty_' ? selectedConfidentiality : undefined,
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('document-management.documents.show', item.id));
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

  const handleDownload = (doc: any) => {
    const link = window.document.createElement('a');
    link.href = route('document-management.documents.download', doc.id);
    link.download = doc.name;
    link.click();
  };

  const handleFormSubmit = (formData: any) => {

    // Convert tags string to array
    if (formData.tags && typeof formData.tags === 'string') {
      formData.tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    if (formMode === 'create') {

      router.post(route('document-management.documents.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          } else if (page.props.flash.error) {
            toast.error(page.props.flash.error);
          }
        },
        onError: (errors) => {
          toast.error(`Failed to add document: ${Object.values(errors).join(', ')}`);
        }
      });
    } else if (formMode === 'edit') {

      router.put(route('document-management.documents.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          } else if (page.props.flash.error) {
            toast.error(page.props.flash.error);
          }
        },
        onError: (errors) => {
          toast.error(`Failed to update document: ${Object.values(errors).join(', ')}`);
        }
      });
    }
  };

  const handleDeleteConfirm = () => {

    router.delete(route('document-management.documents.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        } else if (page.props.flash.error) {
          toast.error(page.props.flash.error);
        }
      },
      onError: (errors) => {
        toast.error(`Failed to delete document: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const handleStatusChange = (formData: any) => {
    router.put(route('document-management.documents.toggle-status', currentItem.id), formData, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        if (page.props.flash?.success) {
          toast.success(page.props.flash.success);
        } else if (page.props.flash?.error) {
          toast.error(page.props.flash.error);
        }
      },
      onError: (errors) => {
        const firstError = Object.values(errors)[0];
        const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        toast.error(errorMessage || 'Failed to update status');
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('_empty_');
    setSelectedStatus('_empty_');
    setSelectedConfidentiality('_empty_');
    setShowFilters(false);
    router.get(route('document-management.documents.index'), {}, { preserveState: true, preserveScroll: true });
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-documents')) {
    pageActions.push({
      label: t('Add Document'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Document Management') },
    { title: t('Documents') }
  ];

  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value: string, item: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'category',
      label: t('Category'),
      render: (value: any) => value?.name || '-'
    },

    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
          review: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          final: 'bg-green-50 text-green-700 ring-green-600/20',
          archived: 'bg-red-50 text-red-700 ring-red-600/20'
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || statusColors.draft}`}>
            {t(value.charAt(0).toUpperCase() + value.slice(1))}
          </span>
        );
      }
    },
    {
      key: 'confidentiality',
      label: t('Confidentiality'),
      render: (value: string) => {
        const confidentialityColors = {
          public: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          internal: 'bg-gray-50 text-gray-700 ring-gray-600/20',
          confidential: 'bg-orange-50 text-orange-700 ring-orange-600/20',
          restricted: 'bg-red-50 text-red-700 ring-red-600/20'
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${confidentialityColors[value as keyof typeof confidentialityColors] || confidentialityColors.internal}`}>
            {t(value.charAt(0).toUpperCase() + value.slice(1))}
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
      requiredPermission: 'view-documents'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-documents'
    },
    {
      label: t('Download'),
      icon: 'Download',
      action: 'download',
      className: 'text-green-500',
      requiredPermission: 'download-documents'
    },
    {
      label: t('Change Status'),
      icon: 'RefreshCw',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'toggle-status-documents'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-documents'
    }
  ];

  const categoryOptions = [
    { value: '_empty_', label: t('All Categories') },
    ...(allCategories || []).map((cat: any) => ({ value: cat.id.toString(), label: cat.name }))
  ];

  return (
    <PageTemplate
      title={t("Documents")}
      url="/document-management/documents"
      actions={pageActions}
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
              options: [
                { value: '_empty_', label: t('All Status') },
                { value: 'draft', label: t('Draft') },
                { value: 'review', label: t('Review') },
                { value: 'final', label: t('Final') },
                { value: 'archived', label: t('Archived') }
              ]
            },
            {
              name: 'confidentiality',
              label: t('Confidentiality'),
              type: 'select',
              value: selectedConfidentiality,
              onChange: setSelectedConfidentiality,
              options: [
                { value: '_empty_', label: t('All Levels') },
                { value: 'public', label: t('Public') },
                { value: 'internal', label: t('Internal') },
                { value: 'confidential', label: t('Confidential') },
                { value: 'restricted', label: t('Restricted') }
              ]
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
            router.get(route('document-management.documents.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              confidentiality: selectedConfidentiality !== '_empty_' ? selectedConfidentiality : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

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
            view: 'view-documents',
            edit: 'edit-documents',
            delete: 'delete-documents'
          }}
        />

        <Pagination
          from={documents?.from || 0}
          to={documents?.to || 0}
          total={documents?.total || 0}
          links={documents?.links}
          entityName={t("documents")}
          onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
        />
      </div>

      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            { name: 'name', label: t('Name'), type: 'text', required: true, placeholder: 'eg. Non-Disclosure Agreement' },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Standard NDA template for client engagements' },
            {
              name: 'category_id',
              label: t('Category'),
              type: 'select',
              searchable: true,
              required: true,
              options: (categories || []).map((cat: any) => ({ value: cat.id, label: cat.name })),
              emptyNote: { link: route('document-management.categories.index'), linkText: t('Document Categories') }
            },
            ...(formMode !== 'view' ? [{ name: 'file', label: t('File'), type: 'media-picker', required: true }] : []),
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              options: [
                { value: 'draft', label: t('Draft') },
                { value: 'review', label: t('Review') },
                { value: 'final', label: t('Final') },
                { value: 'archived', label: t('Archived') }
              ],
              defaultValue: 'draft'
            },
            {
              name: 'confidentiality',
              label: t('Confidentiality'),
              type: 'select',
              options: [
                { value: 'public', label: t('Public') },
                { value: 'internal', label: t('Internal') },
                { value: 'confidential', label: t('Confidential') },
                { value: 'restricted', label: t('Restricted') }
              ],
              defaultValue: 'internal'
            },
            { name: 'tags', label: t('Tags'), type: 'text', placeholder: 'Enter tags separated by commas' }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          tags: currentItem.tags ? currentItem.tags.join(', ') : '',
          file: currentItem?.file_path ? `${currentItem.file_path}` : null
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Document')
            : formMode === 'edit'
              ? t('Edit Document')
              : t('View Document')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="document"
      />

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
                { value: 'draft', label: t('Draft') },
                { value: 'review', label: t('Review') },
                { value: 'final', label: t('Final') },
                { value: 'archived', label: t('Archived') }
              ]
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem}
        title={t('Change Document Status')}
        mode="edit"
      />
    </PageTemplate>
  );
}
