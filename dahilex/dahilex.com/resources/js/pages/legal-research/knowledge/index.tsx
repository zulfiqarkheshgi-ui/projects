import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, BookOpen, Globe, Lock } from 'lucide-react';
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

export default function KnowledgeArticles() {
  const { t } = useTranslation();
  const { auth, articles, categories, allCategories, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(pageFilters.category_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
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
    router.get(route('legal-research.knowledge.index'), {
      page: 1,
      search: searchTerm || undefined,
      category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    router.get(route('legal-research.knowledge.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
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

    router.put(route('legal-research.knowledge.update', currentItem.id), { ...currentItem, status: formData.status }, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        if (page.props.flash?.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        // Get the first error message
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError)) {
          toast.error(firstError[0]);
        } else {
          toast.error(firstError);
        }
      },
      onFinish: () => {
        // Check for flash error messages after the request finishes
        setTimeout(() => {
          const { flash } = usePage().props as any;
          if (flash?.error) {
            toast.error(flash.error);
          }
        }, 100);
      }
    });
  };

  const handleFormSubmit = (formData: any) => {
    // Convert tags string to array
    if (formData.tags && typeof formData.tags === 'string') {
      formData.tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    const action = formMode === 'create' ? 'store' : 'update';
    const route_name = formMode === 'create'
      ? 'legal-research.knowledge.store'
      : 'legal-research.knowledge.update';


    const method = formMode === 'create' ? 'post' : 'put';
    const url = formMode === 'create'
      ? route(route_name)
      : route(route_name, currentItem.id);

    router[method](url, formData, {
      onSuccess: (page) => {
        setIsFormModalOpen(false);
        if (page.props.flash?.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        // Get the first error message
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError)) {
          toast.error(firstError[0]);
        } else {
          toast.error(firstError);
        }
      },
      onFinish: () => {
        // Check for flash error messages after the request finishes
        setTimeout(() => {
          const { flash } = usePage().props as any;
          if (flash?.error) {
            toast.error(flash.error);
          }
        }, 100);
      }
    });
  };

  const handleDeleteConfirm = () => {
    router.delete(route('legal-research.knowledge.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        // Get the first error message
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError)) {
          toast.error(firstError[0]);
        } else {
          toast.error(firstError);
        }
      },
      onFinish: () => {
        // Check for flash error messages after the request finishes
        setTimeout(() => {
          const { flash } = usePage().props as any;
          if (flash?.error) {
            toast.error(flash.error);
          }
        }, 100);
      }
    });
  };

  const pageActions = [];
  if (hasPermission(permissions, 'create-knowledge-articles')) {
    pageActions.push({
      label: t('Add Knowledge Article'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Legal Research') },
    { title: t('Knowledge Article') }
  ];

  const columns = [
    {
      key: 'title',
      label: t('Title'),
      sortable: true,
      render: (value: string) => (
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
      key: 'tags',
      label: t('Tags'),
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(value || []).slice(0, 3).map((tag, index) => (
            <span key={index} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
              {tag}
            </span>
          ))}
          {(value || []).length > 3 && (
            <span className="text-xs text-gray-500">+{(value || []).length - 3} more</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
          published: 'bg-green-50 text-green-700 ring-green-600/20',
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
      key: 'created_at',
      label: t('Created'),
        type: 'date',
    }
  ];

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-knowledge-articles'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-knowledge-articles'
    },
    {
      label: t('Publish/Unpublish'),
      icon: 'Globe',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'publish-knowledge-articles'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-knowledge-articles'
    }
  ];

  const categoryOptions = [
    { value: '_empty_', label: t('All Categories') },
    ...(allCategories || []).map((cat: any) => ({ value: cat.id.toString(), label: cat.name }))
  ];

  return (
    <PageTemplate
      title={t("Knowledge Article")}
      url="/legal-research/knowledge"
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
                { value: 'published', label: t('Published') },
                { value: 'archived', label: t('Archived') }
              ]
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={() => searchTerm !== '' || selectedCategory !== '_empty_' || selectedStatus !== '_empty_'}
          activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0)}
          onResetFilters={() => {
            setSearchTerm('');
            setSelectedCategory('_empty_');
            setSelectedStatus('_empty_');
            setShowFilters(false);
            router.get(route('legal-research.knowledge.index'), {}, { preserveState: true, preserveScroll: true });
          }}
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('legal-research.knowledge.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
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
          data={articles?.data || []}
          from={articles?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-knowledge-articles',
            create: 'create-knowledge-articles',
            edit: 'edit-knowledge-articles',
            delete: 'delete-knowledge-articles'
          }}
        />

        <Pagination
          from={articles?.from || 0}
          to={articles?.to || 0}
          total={articles?.total || 0}
          links={articles?.links}
          entityName={t("knowledge articles")}
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
            { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. Overview of Contract Law Principles' },
            {
              name: 'category_id',
              label: t('Category'),
              type: 'select',
              searchable: true,
              required: true,
              options: [
                ...(categories || []).map((cat: any) => ({
                  value: cat.id,
                  label: cat.practice_area ? `${cat.name} (${cat.practice_area.name})` : cat.name
                }))
              ],
              emptyNote: { link: route('legal-research.categories.index'), linkText: t('Research Categories') }
            },
            { name: 'content', label: t('Content'), type: 'textarea', required: true, rows: 10, placeholder: 'eg. Detailed analysis of contract formation requirements...' },
            { name: 'tags', label: t('Tags'), type: 'text', placeholder: 'Enter tags separated by commas (e.g., contract, law, precedent)' },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              options: [
                { value: 'draft', label: t('Draft') },
                { value: 'published', label: t('Published') },
                { value: 'archived', label: t('Archived') }
              ],
              defaultValue: 'draft'
            }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem ? {
          ...currentItem,
          tags: currentItem.tags ? currentItem.tags.join(', ') : ''
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Knowledge Article')
            : t('Edit Knowledge Article')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="knowledge article"
      />

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentItem && <ViewPopup record={currentItem} />}
      </Dialog>

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
                { value: 'published', label: t('Published') },
                { value: 'archived', label: t('Archived') }
              ]
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem ? { status: currentItem.status } : null}
        title={t('Change Article Status')}
        mode='edit'
      />
    </PageTemplate>
  );
}
