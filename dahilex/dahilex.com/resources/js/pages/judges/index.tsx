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
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import UserColumn from '@/components/UserColumn';

export default function Judges() {
  const { t } = useTranslation();
  const { auth, judges, courts, allCourts, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedCourt, setSelectedCourt] = useState(pageFilters.court_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const hasActiveFilters = () => searchTerm !== '' || selectedCourt !== '_empty_' || selectedStatus !== '_empty_';

  const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedCourt !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('judges.index'), {
      page: 1,
      search: searchTerm || undefined,
      court_id: selectedCourt !== '_empty_' ? selectedCourt : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    router.get(route('judges.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      court_id: selectedCourt !== '_empty_' ? selectedCourt : undefined,
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

      router.post(route('judges.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          } else if (page.props.flash.error) {
            toast.error(page.props.flash.error);
          }
        },
        onError: (errors) => {
          toast.error(`Failed to create judge: ${Object.values(errors).join(', ')}`);
        }
      });
    } else if (formMode === 'edit') {

      router.put(route('judges.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          } else if (page.props.flash.error) {
            toast.error(page.props.flash.error);
          }
        },
        onError: (errors) => {
          toast.error(`Failed to update judge: ${Object.values(errors).join(', ')}`);
        }
      });
    }
  };

  const handleDeleteConfirm = () => {

    router.delete(route('judges.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        } else if (page.props.flash.error) {
          toast.error(page.props.flash.error);
        }
      },
      onError: (errors) => {
        toast.error(`Failed to delete judge: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const handleToggleStatus = (judge: any) => {
    const newStatus = judge.status === 'active' ? 'inactive' : 'active';

    router.put(route('judges.toggle-status', judge.id), {}, {
      onSuccess: (page) => {
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        } else if (page.props.flash.error) {
          toast.error(page.props.flash.error);
        }
      },
      onError: (errors) => {
        toast.error(`Failed to update judge status: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedCourt, selectedStatus]);

  const handleResetFilters = () => {
    router.get(route('judges.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-judges')) {
    pageActions.push({
      label: t('Add Judge'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Court Schedule'), href: route('courts.index') },
    { title: t('Judges') }
  ];

  const columns = [
    { key: 'judge', label: t('Judge'), sortable: true,
        render: (value: any, row: any) => {
            return (
                <UserColumn user={row} />
            );
        }
    },
    { key: 'title', label: t('Title'), render: (value: string) => value || '-' },
    { key: 'court', label: t('Court'),
        render: (value: any, row: any) => {
            return (
                <UserColumn user={row?.court} hideAvatar/>
            );
        }},
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
          }`}>
          {value === 'active' ? t('Active') : t('Inactive')}
        </span>
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
    { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-judges' },
    { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-judges' },
    { label: t('Toggle Status'), icon: 'Lock', action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'toggle-status-judges' },
    { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-judges' }
  ];

  const courtOptions = [
    { value: '_empty_', label: t('All Courts') },
    ...(allCourts || []).map((court: any) => ({
      value: court.id.toString(),
      label: court.name
    }))
  ];

  const statusOptions = [
    { value: '_empty_', label: t('All Status') },
    { value: 'active', label: t('Active') },
    { value: 'inactive', label: t('Inactive') }
  ];

  return (
    <PageTemplate title={t("Judges")} description={t("Manage judges and their court assignments.")} url="/judges" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            { name: 'court_id', label: t('Court'), type: 'select', value: selectedCourt, searchable: true, onChange: setSelectedCourt, options: courtOptions },
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
          data={judges?.data || []}
          from={judges?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{ view: 'view-judges', create: 'create-judges', edit: 'edit-judges', delete: 'delete-judges' }}
        />

        <Pagination
          from={judges?.from || 0}
          to={judges?.to || 0}
          total={judges?.total || 0}
          links={judges?.links}
          entityName={t("judges")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('judges.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              court_id: selectedCourt !== '_empty_' ? selectedCourt : undefined,
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
            { name: 'court_id', label: t('Court'), type: 'select', required: true, searchable: true, options: courts ? courts.map((court: any) => ({ value: court.id.toString(), label: court.name })) : [], emptyNote: { link: route('courts.index'), linkText: t('Courts') }},
            { name: 'name', label: t('Judge Name'), type: 'text', required: true, placeholder: 'eg. Hon. Jane Smith' },
            { name: 'title', label: t('Title'), type: 'text', placeholder: 'eg. Chief Justice' },
            { name: 'email', label: t('Email'), type: 'email', required: true, placeholder: 'eg. judge.smith@court.gov' },
            { name: 'phone', label: t('Phone'), type: 'text', required: true, placeholder: 'eg. +1 212 000 0000' },
            { name: 'contact_info', label: t('Contact Information'), type: 'textarea', placeholder: 'eg. Chambers on 3rd floor, Room 301' },
            { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Prefers written motions submitted 5 days in advance' },
            { name: 'status', label: t('Status'), type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], defaultValue: 'active' }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem}
        title={formMode === 'create' ? t('Add New Judge') : t('Edit Judge')}
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="judge"
      />

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentItem && <ViewPopup record={currentItem} />}
      </Dialog>
    </PageTemplate>
  );
}
