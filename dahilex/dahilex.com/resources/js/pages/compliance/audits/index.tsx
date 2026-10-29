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

export default function ComplianceAudits() {
  const { t } = useTranslation();
  const { auth, audits, auditTypes, allAuditTypes, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedType, setSelectedType] = useState(pageFilters.audit_type_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(pageFilters.risk_level || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const hasActiveFilters = () => searchTerm !== '' || selectedType !== '_empty_' || selectedStatus !== '_empty_' || selectedRiskLevel !== '_empty_';
  const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedType !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedRiskLevel !== '_empty_' ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('compliance.audits.index'), {
      page: 1,
      search: searchTerm || undefined,
      audit_type_id: selectedType !== '_empty_' ? selectedType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      risk_level: selectedRiskLevel !== '_empty_' ? selectedRiskLevel : undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    router.get(route('compliance.audits.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      audit_type_id: selectedType !== '_empty_' ? selectedType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      risk_level: selectedRiskLevel !== '_empty_' ? selectedRiskLevel : undefined,
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    const formattedItem = {
      ...item,
      audit_type_id: item.audit_type_id || item.audit_type?.id
    };
    setCurrentItem(formattedItem);

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
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {

      router.post(route('compliance.audits.store'), formData, {
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
            toast.error(`Failed to create audit: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {

      router.put(route('compliance.audits.update', currentItem.id), formData, {
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
            toast.error(`Failed to update audit: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {

    router.delete(route('compliance.audits.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        toast.error(`Failed to delete audit: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedType, selectedStatus, selectedRiskLevel]);


  const handleResetFilters = () => {
    router.get(route('compliance.audits.index'));
  };

  // Define page actions
  const pageActions = [];

  if (hasPermission(permissions, 'create-compliance-audits')) {
    pageActions.push({
      label: t('Add Compliance Audit'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Compliance & Regulatory') },
    { title: t('Compliance Audits') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'auditor_name',
      label: t('Auditor'),
      render: (value: string, row: any) => {
        return (<div>
            <div className="font-medium">{value || '-'}</div>
            <div className="text-sm text-muted-foreground">{row.auditor_organization || '-'}</div>
        </div>)
      }
    },
    {
      key: 'audit_title',
      label: t('Audit Title'),
      sortable: true
    },
    {
      key: 'audit_type',
      label: t('Type'),
      render: (value: any, row: any) => {
        const auditType = row.audit_type;
        if (!auditType) return '-';
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{auditType.name}</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          planned: 'bg-gray-50 text-gray-700 ring-gray-600/20',
          in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          completed: 'bg-green-50 text-green-700 ring-green-600/20',
          cancelled: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
            {t(capitalize(value))}
          </span>
        );
      }
    },
    {
      key: 'risk_level',
      label: t('Risk Level'),
      render: (value: string) => {
        const levelColors = {
          low: 'bg-green-50 text-green-700 ring-green-600/20',
          medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
          critical: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${levelColors[value as keyof typeof levelColors]}`}>
            {t(capitalize(value))}
          </span>
        );
      }
    },
    {
      key: 'audit_date',
      label: t('Audit Date'),
      sortable: true,
      type: "date"
    },
    {
      key: 'completion_date',
      label: t('Completion'),
      render: (value: string) => value ? (window.appSettings?.formatDateTime(value, false) || new Date(value).toLocaleDateString()) : '-'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-compliance-audits'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-compliance-audits'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-compliance-audits'
    }
  ];

  // Prepare options for filters and form
  const typeOptions = [
    { value: '_empty_', label: t('All Types') },
    ...(allAuditTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  const statusOptions = [
    { value: '_empty_', label: t('All Status') },
    { value: 'planned', label: t('Planned') },
    { value: 'in_progress', label: t('In Progress') },
    { value: 'completed', label: t('Completed') },
    { value: 'cancelled', label: t('Cancelled') }
  ];

  const riskLevelOptions = [
    { value: '_empty_', label: t('All Risk Levels') },
    { value: 'low', label: t('Low') },
    { value: 'medium', label: t('Medium') },
    { value: 'high', label: t('High') },
    { value: 'critical', label: t('Critical') }
  ];

  return (
    <PageTemplate
      title={t("Compliance Audits")}
      description={t("Plan and track compliance audits.")}
      url="/compliance/audits"
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
              name: 'audit_type_id',
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
            },
            {
              name: 'risk_level',
              label: t('Risk Level'),
              type: 'select',
              value: selectedRiskLevel,
              onChange: setSelectedRiskLevel,
              options: riskLevelOptions
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
          data={audits?.data || []}
          from={audits?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-compliance-audits',
            create: 'create-compliance-audits',
            edit: 'edit-compliance-audits',
            delete: 'delete-compliance-audits'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={audits?.from || 0}
          to={audits?.to || 0}
          total={audits?.total || 0}
          links={audits?.links}
          entityName={t("audits")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('compliance.audits.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              audit_type_id: selectedType !== '_empty_' ? selectedType : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              risk_level: selectedRiskLevel !== '_empty_' ? selectedRiskLevel : undefined,
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
            { name: 'audit_title', label: t('Audit Title'), type: 'text', required: true, placeholder: 'eg. Annual GDPR Compliance Audit' },
            {
              name: 'audit_type_id',
              label: t('Audit Type'),
              type: 'select',
              searchable: true,
              required: true,
              options: (auditTypes || []).map((type: any) => ({
                value: type.id.toString(),
                label: type.name
              })),
              emptyNote: { link: route('compliance.audit-types.index'), linkText: t('Audit Types') }
            },
            { name: 'description', label: t('Description'), type: 'textarea', required: true, placeholder: 'eg. Annual review of data protection compliance' },
            { name: 'audit_date', label: t('Audit Date'), type: 'date', required: true },
            { name: 'completion_date', label: t('Completion Date'), type: 'date' },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              options: statusOptions.slice(1), // Remove 'All Status' option
              defaultValue: 'planned'
            },
            { name: 'scope', label: t('Scope'), type: 'textarea', placeholder: 'eg. All data processing activities within the EU' },
            { name: 'findings', label: t('Findings'), type: 'textarea', placeholder: 'eg. Minor gaps found in data retention procedures' },
            { name: 'recommendations', label: t('Recommendations'), type: 'textarea', placeholder: 'eg. Update data retention policy and retrain staff' },
            {
              name: 'risk_level',
              label: t('Risk Level'),
              type: 'select',
              options: riskLevelOptions.slice(1), // Remove 'All Risk Levels' option
              defaultValue: 'medium'
            },
            { name: 'auditor_name', label: t('Auditor Name'), type: 'text', placeholder: 'eg. Jane Smith' },
            { name: 'auditor_organization', label: t('Auditor Organization'), type: 'text', placeholder: 'eg. External Compliance Group LLC' },
            { name: 'corrective_actions', label: t('Corrective Actions'), type: 'textarea', placeholder: 'eg. Update privacy policy and conduct staff training by Q2' },
            { name: 'follow_up_date', label: t('Follow-up Date'), type: 'date' }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Compliance Audit')
            : t('Edit Compliance Audit')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.audit_title || ''}
        entityName="compliance audit"
      />

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentItem && <ViewPopup record={currentItem} />}
      </Dialog>
    </PageTemplate>
  );
}
