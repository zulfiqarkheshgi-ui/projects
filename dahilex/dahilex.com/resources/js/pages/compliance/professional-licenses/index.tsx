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
import { capitalize } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';

export default function ProfessionalLicenses() {
  const { t } = useTranslation();
  const { auth, licenses, users, allUsers, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedUser, setSelectedUser] = useState(pageFilters.user_id || 'all');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isToggleStatusModalOpen, setIsToggleStatusModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('compliance.professional-licenses.index'), {
      page: 1,
      search: searchTerm || undefined,
      user_id: selectedUser !== 'all' ? selectedUser : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    router.get(route('compliance.professional-licenses.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      user_id: selectedUser !== 'all' ? selectedUser : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
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
        setIsToggleStatusModalOpen(true);
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

      router.post(route('compliance.professional-licenses.store'), formData, {
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
            toast.error(`Failed to create Licenses record: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
    else if (formMode === 'edit') {
      router.put(route('compliance.professional-licenses.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          }
        },
        onError: (errors) => {
          toast.error('Failed to update license');
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    router.delete(route('compliance.professional-licenses.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        toast.error('Failed to delete license');
      }
    });
  };

  const pageActions = [];
  if (hasPermission(permissions, 'create-professional-licenses')) {
    pageActions.push({
      label: t('Add Professional License'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Compliance & Regulatory'), href: route('compliance.requirements.index') },
    { title: t('Professional Licenses') }
  ];

  const columns = [
    {
      key: 'user',
      label: t('User'),
      render: (value: any, row: any) => <span className="text-sm font-medium">{row.user?.name || '-'}</span>
    },
    {
      key: 'license_type',
      label: t('License Type'),
      sortable: true
    },
    {
      key: 'license_number',
      label: t('License Number'),
      sortable: true
    },
    {
      key: 'issuing_authority',
      label: t('Issuing Authority'),
      sortable: true
    },
    {
      key: 'jurisdiction',
      label: t('Jurisdiction'),
      sortable: true
    },
    {
      key: 'expiry_date',
      label: t('Expiry Date'),
      sortable: true,
      render: (value: string, row: any) => {
        const expiryDate = new Date(value);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let className = '';
        if (daysUntilExpiry < 0) {
          className = 'text-red-600';
        } else if (daysUntilExpiry <= 30) {
          className = 'text-orange-600';
        }

        return (
          <span className={`font-normal ${className}`}>
            {window.appSettings?.formatDate(value) || expiryDate.toLocaleDateString()}
            {daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
              <span className="block text-xs">({daysUntilExpiry} days left)</span>
            )}
            {daysUntilExpiry < 0 && (
              <span className="block text-xs">(Expired)</span>
            )}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          active: 'bg-green-50 text-green-700 ring-green-600/20',
          expired: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          suspended: 'bg-purple-50 text-purple-700 ring-purple-600/20',
          revoked: 'bg-red-50 text-red-700 ring-red-600/20'
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
      requiredPermission: 'view-professional-licenses'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-professional-licenses'
    },
    {
      label: t('Change Status'),
      icon: 'RefreshCw',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'toggle-status-professional-licenses'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-professional-licenses'
    }
  ];

  const userOptions = [
    { value: 'all', label: t('All Users') },
    ...(allUsers || []).map((user: any) => ({
      value: user.id.toString(),
      label: user.name
    }))
  ];

  const statusOptions = [
    { value: 'all', label: t('All Status') },
    { value: 'active', label: t('Active') },
    { value: 'expired', label: t('Expired') },
    { value: 'suspended', label: t('Suspended') },
    { value: 'revoked', label: t('Revoked') }
  ];

  return (
    <PageTemplate
      title={t("Professional Licenses")}
      url="/compliance/professional-licenses"
      actions={pageActions}
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
              name: 'user_id',
              label: t('User'),
              type: 'select',
              searchable: true,
              value: selectedUser,
              onChange: setSelectedUser,
              options: userOptions
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
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={() => searchTerm !== '' || selectedUser !== 'all' || selectedStatus !== 'all'}
          activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedUser !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0)}
          onResetFilters={() => {
            setSearchTerm('');
            setSelectedUser('all');
            setSelectedStatus('all');
            setShowFilters(false);
            router.get(route('compliance.professional-licenses.index'), {}, { preserveState: true, preserveScroll: true });
          }}
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('compliance.professional-licenses.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              user_id: selectedUser !== 'all' ? selectedUser : undefined,
              status: selectedStatus !== 'all' ? selectedStatus : undefined
            });
          }}
        />
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={licenses?.data || []}
          from={licenses?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-professional-licenses',
            create: 'create-professional-licenses',
            edit: 'edit-professional-licenses',
            delete: 'delete-professional-licenses'
          }}
        />

        <Pagination
          from={licenses?.from || 0}
          to={licenses?.to || 0}
          total={licenses?.total || 0}
          links={licenses?.links}
          entityName={t("licenses")}
          onPageChange={(url) => router.get(url)}
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
              name: 'user_id',
              label: t('User'),
              type: 'select',
              searchable: true,
              required: true,
              options: users.map((user: any) => ({
                value: user.id.toString(),
                label: user.name
              })),
              emptyNote: { link: route('users.index'), linkText: t('Users') }
            },
            { name: 'license_type', label: t('License Type'), type: 'text', required: true, placeholder: 'eg. Bar License' },
            { name: 'license_number', label: t('License Number'), type: 'text', required: true, placeholder: 'eg. BAR-2024-001234' },
            { name: 'issuing_authority', label: t('Issuing Authority'), type: 'text', required: true, placeholder: 'eg. State Bar Association' },
            { name: 'jurisdiction', label: t('Jurisdiction'), type: 'text', required: true, placeholder: 'eg. New York State' },
            { name: 'issue_date', label: t('Issue Date'), type: 'date', required: true },
            { name: 'expiry_date', label: t('Expiry Date'), type: 'date', required: true },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              options: [
                { value: 'active', label: t('Active') },
                { value: 'expired', label: t('Expired') },
                { value: 'suspended', label: t('Suspended') },
                { value: 'revoked', label: t('Revoked') }
              ],
              defaultValue: 'active'
            },
            { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Renewal requires 30 CLE credits' }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Professional License')
            : t('Edit Professional License')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.license_number || ''}
        entityName="professional license"
      />

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentItem && <ViewPopup record={currentItem} />}
      </Dialog>

      {/* Toggle Status Modal */}
      <CrudFormModal
        isOpen={isToggleStatusModalOpen}
        onClose={() => setIsToggleStatusModalOpen(false)}
        onSubmit={(formData) => {
          router.put(route('compliance.professional-licenses.toggle-status', currentItem.id), formData, {
            onSuccess: (page) => {
              setIsToggleStatusModalOpen(false);
              if (page.props.flash.success) {
                toast.success(page.props.flash.success);
              }
            },
            onError: (errors) => {
              toast.error('Failed to update status');
            }
          });
        }}
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              options: [
                { value: 'active', label: t('Active') },
                { value: 'expired', label: t('Expired') },
                { value: 'suspended', label: t('Suspended') },
                { value: 'revoked', label: t('Revoked') }
              ]
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem}
        title={t('Update Status')}
        mode="edit"
      />
    </PageTemplate>
  );
}
