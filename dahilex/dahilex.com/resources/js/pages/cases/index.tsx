import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Scale, CheckCircle2, AlertTriangle, TrendingDown, Gauge } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { formatStatusText, hexToRgba } from '@/utils/helpers';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

export default function Cases() {
  const { t } = useTranslation();
  const { auth, cases, caseTypes, allCaseTypes, caseStatuses, allCaseStatuses, clients, courts, allCourts, googleCalendarEnabled, planLimits, stats, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedCaseType, setSelectedCaseType] = useState(pageFilters.case_type_id || '_empty_');
  const [selectedCaseStatus, setSelectedCaseStatus] = useState(pageFilters.case_status_id || '_empty_');
  const [selectedPriority, setSelectedPriority] = useState(pageFilters.priority || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedCourt, setSelectedCourt] = useState(pageFilters.court_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const getInitials = useInitials();

  const hasActiveFilters = () =>
    searchTerm !== '' || selectedCaseType !== '_empty_' || selectedCaseStatus !== '_empty_' ||
    selectedPriority !== '_empty_' || selectedStatus !== '_empty_' || selectedCourt !== '_empty_';

  const activeFilterCount = () =>
    (searchTerm ? 1 : 0) + (selectedCaseType !== '_empty_' ? 1 : 0) +
    (selectedCaseStatus !== '_empty_' ? 1 : 0) + (selectedPriority !== '_empty_' ? 1 : 0) +
    (selectedStatus !== '_empty_' ? 1 : 0) + (selectedCourt !== '_empty_' ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('cases.index'), {
      page: 1,
      search: searchTerm || undefined,
      case_type_id: selectedCaseType !== '_empty_' ? selectedCaseType : undefined,
      case_status_id: selectedCaseStatus !== '_empty_' ? selectedCaseStatus : undefined,
      priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      court_id: selectedCourt !== '_empty_' ? selectedCourt : undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    router.get(route('cases.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      case_type_id: selectedCaseType !== '_empty_' ? selectedCaseType : undefined,
      case_status_id: selectedCaseStatus !== '_empty_' ? selectedCaseStatus : undefined,
      priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      court_id: selectedCourt !== '_empty_' ? selectedCourt : undefined,
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('cases.show', item.id));
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
      router.post(route('cases.store'), formData, {
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
            toast.error(`Failed to create case: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      router.put(route('cases.update', currentItem.id), formData, {
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
            toast.error(`Failed to update case: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    router.delete(route('cases.destroy', currentItem.id), {
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
          toast.error(`Failed to delete case: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleToggleStatus = (caseItem: any) => {
    router.put(route('cases.toggle-status', caseItem.id), {}, {
      onSuccess: (page) => {
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
          toast.error(`Failed to update case status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('cases.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-cases')) {
    const canCreate = !planLimits || planLimits.can_create;
    pageActions.push({
      label: planLimits && !canCreate ? t('Case Limit Reached ({{current}}/{{max}})', { current: planLimits.current_cases, max: planLimits.max_cases }) : t('Add Case'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: canCreate ? 'default' : 'outline',
      onClick: canCreate ? () => handleAddNew() : () => toast.error(t('Case limit exceeded. Your plan allows maximum {{max}} cases. Please upgrade your plan.', { max: planLimits.max_cases })),
      disabled: !canCreate
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Case Management'), href: route('cases.index') },
    { title: t('Cases') }
  ];

  const columns = [
    {
        key: 'title',
        label: t('Title'),
        sortable: true
    },
    {
    key: 'client',
    label: t('Client'),
    render: (value: any, row: any) => {
        return (
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage
                        src={row?.client?.user?.avatar}
                        alt={row?.client?.user?.name}
                    />
                    <AvatarFallback className="text-lg">
                        {getInitials(row?.client?.user?.name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium">{row?.client?.user?.name}</div>
                    <div className="text-sm text-muted-foreground">{row?.client?.user?.email}</div>
                </div>
            </div>
        );
    }
    },
    {
      key: 'case_type',
      label: t('Type'),
      render: (value: any, row: any) => (
        <span
          className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${row.case_type?.color}20`,
            color: row.case_type?.color,
            boxShadow: `inset 0 0 0 1px ${hexToRgba(row.case_type?.color, 0.2)}`,
          }}
        >
          {formatStatusText(row.case_type?.name || '-')}
        </span>
      )
    },
    {
      key: 'case_status',
      label: t('Status'),
      render: (value: any, row: any) => (
        <span
          className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${row.case_status?.color}20`,
            color: row.case_status?.color,
            boxShadow: `inset 0 0 0 1px ${hexToRgba(row.case_status?.color, 0.2)}`,
          }}
        >
          {formatStatusText(row.case_status?.name || '-')}
        </span>
      )
    },
    {
      key: 'priority',
      label: t('Priority'),
      render: (value: string) => {
        const colors = {
          low: 'bg-green-50 text-green-700 ring-green-600/20',
          medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          high: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[value as keyof typeof colors] || colors.medium}`}>
            {formatStatusText(value || '-')}
          </span>
        );
      }
    },
    {
      key: 'filing_date',
      label: t('Filing Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'status',
      label: t('Active Status'),
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
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-cases'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-cases'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'toggle-status-cases'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-cases'
    }
  ];

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedCaseType, selectedCaseStatus, selectedPriority, selectedStatus, selectedCourt]);


  return (
    <PageTemplate
      title={t("Cases")}
      url="/cases"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      description={t("Manage all your legal cases and track their progress.")}
      noPadding
    >
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {([
          { label: t('Total Cases'),    value: stats?.total  ?? 0, icon: Scale,         iconCls: 'text-gray-600',    blobCls: 'bg-gray-100 dark:bg-gray-700/40' },
          { label: t('Low Priority'),   value: stats?.low    ?? 0, icon: TrendingDown,  iconCls: 'text-blue-600',    blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
          { label: t('Medium Priority'),value: stats?.medium ?? 0, icon: Gauge,  iconCls: 'text-amber-600', blobCls: 'bg-amber-50 dark:bg-amber-900/30' },
          { label: t('High Priority'),  value: stats?.high   ?? 0, icon: AlertTriangle, iconCls: 'text-red-600',     blobCls: 'bg-red-50 dark:bg-red-900/30' },
        ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
          <Card key={label} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
            <CardContent className="relative p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
                <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5`}>
                  <Icon className={`h-5 w-5 ${iconCls}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'case_type_id',
              label: t('Case Type'),
              type: 'select',
              searchable: true,
              value: selectedCaseType,
              onChange: setSelectedCaseType,
              options: [
                { value: '_empty_', label: t('All Types') },
                ...(allCaseTypes || []).map((type: any) => ({
                  value: type.id.toString(),
                  label: type.name
                }))
              ]
            },
            {
              name: 'case_status_id',
              label: t('Case Status'),
              type: 'select',
              searchable: true,
              value: selectedCaseStatus,
              onChange: setSelectedCaseStatus,
              options: [
                { value: '_empty_', label: t('All Status') },
                ...(allCaseStatuses || []).map((status: any) => ({
                  value: status.id.toString(),
                  label: status.name
                }))
              ]
            },
            {
              name: 'priority',
              label: t('Priority'),
              type: 'select',
              value: selectedPriority,
              onChange: setSelectedPriority,
              options: [
                { value: '_empty_', label: t('All Priorities') },
                { value: 'low', label: t('Low') },
                { value: 'medium', label: t('Medium') },
                { value: 'high', label: t('High') }
              ]
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              value: selectedStatus,
              onChange: setSelectedStatus,
              options: [
                { value: '_empty_', label: t('All Status') },
                { value: 'active', label: t('Active') },
                { value: 'inactive', label: t('Inactive') }
              ]
            },
            {
              name: 'court_id',
              label: t('Court'),
              type: 'select',
              searchable: true,
              value: selectedCourt,
              onChange: setSelectedCourt,
              options: [
                { value: '_empty_', label: t('All Courts') },
                ...(allCourts || []).map((court: any) => ({
                  value: court.id.toString(),
                  label: court.name,
                  key: `filter-court-${court.id}`
                }))
              ]
            }
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
          data={cases?.data || []}
          from={cases?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-cases',
            create: 'create-cases',
            edit: 'edit-cases',
            delete: 'delete-cases'
          }}
        />

        <Pagination
          from={cases?.from || 0}
          to={cases?.to || 0}
          total={cases?.total || 0}
          links={cases?.links}
          entityName={t("cases")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('cases.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              case_type_id: selectedCaseType !== '_empty_' ? selectedCaseType : undefined,
              case_status_id: selectedCaseStatus !== '_empty_' ? selectedCaseStatus : undefined,
              priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              court_id: selectedCourt !== '_empty_' ? selectedCourt : undefined,
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
            { name: 'title', label: t('Case Title'), type: 'text', required: true, placeholder: 'eg. Smith vs. Jones' },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Brief description of the case' },
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
            {
              name: 'case_type_id',
              label: t('Case Type'),
              type: 'select',
              searchable: true,
              required: true,
              options: caseTypes ? caseTypes.map((type: any) => ({
                value: type.id.toString(),
                label: type.name
              })) : [],
              emptyNote: { link: route('cases.case-types.index'), linkText: t('Case Types') }
            },
            {
              name: 'case_status_id',
              label: t('Case Status'),
              type: 'select',
              searchable: true,
              required:true,
              options: caseStatuses ? caseStatuses.map((status: any) => ({
                value: status.id.toString(),
                label: status.name
              })) : [],
              defaultValue: caseStatuses?.find((s: any) => s.is_default)?.id?.toString(),
              emptyNote: { link: route('cases.case-statuses.index'), linkText: t('Case Status') }
            },
            {
              name: 'court_id',
              label: t('Court'),
              type: 'select',
              searchable: true,
              required: true,
              options: courts ? courts.map((court: any) => ({
                value: court.id.toString(),
                label: court.name,
                key: `court-${court.id}`
              })) : [],
              emptyNote: { link: route('courts.index'), linkText: t('Courts') }
            },
            {
              name: 'priority',
              label: t('Priority'),
              type: 'select',
              required: true,
              options: [
                { value: 'low', label: t('Low') },
                { value: 'medium', label: t('Medium') },
                { value: 'high', label: t('High') }
              ],
              defaultValue: 'medium'
            },
            { name: 'filing_date', label: t('Filing Date'), type: 'date' },
            { name: 'expected_completion_date', label: t('Expected Completion'), type: 'date' },
            { name: 'estimated_value', label: t('Estimated Value'), type: 'number', placeholder: 'eg. 50000' },
            { name: 'opposing_party', label: t('Opposing Party'), type: 'text', placeholder: 'eg. John Doe' },
            { name: 'court_details', label: t('Court Details'), type: 'textarea', placeholder: 'eg. Room 3B, Floor 2' },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ],
              defaultValue: 'active'
            }
          ].concat(googleCalendarEnabled ? [{
            name: 'sync_with_google_calendar',
            label: t('Synchronize in Google Calendar'),
            type: 'switch',
            defaultValue: false
          }] : []),
          modalSize: 'xl',
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Case')
            : formMode === 'edit'
              ? t('Edit Case')
              : t('View Case')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="case"
      />
    </PageTemplate>
  );
}
