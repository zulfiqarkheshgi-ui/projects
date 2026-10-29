import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Calendar, Clock } from 'lucide-react';
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

export default function Hearings() {
  const { t } = useTranslation();
  const { auth, hearings, cases, courts, allCourts, judges, hearingTypes, googleCalendarEnabled, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedCourt, setSelectedCourt] = useState(pageFilters.court_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hearings.index'), {
      page: 1,
      search: searchTerm || undefined,
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
    router.get(route('hearings.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      court_id: selectedCourt !== '_empty_' ? selectedCourt : undefined,
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
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      router.post(route('hearings.store'), formData, {
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
          const errorMessages = Object.values(errors).flat().join(', ');
          toast.error(`Failed to add hearing: ${errorMessages}`);
        }
      });
    } else if (formMode === 'edit') {
      router.put(route('hearings.update', currentItem.id), formData, {
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
          const errorMessages = Object.values(errors).flat().join(', ');
          toast.error(`Failed to update hearing: ${errorMessages}`);
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    router.delete(route('hearings.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        toast.error('Failed to delete hearing');
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hearings.index'));
  };

  const pageActions = [];
  if (hasPermission(permissions, 'create-hearings')) {
    pageActions.push({
      label: t('Add Hearing'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Case Management'), href: route('cases.index') },
    { title: t('Hearings') }
  ];

  const columns = [
    { key: 'title', label: t('Title'), sortable: true },
    {
      key: 'case',
      label: t('Case'),
      render: (value: any) => value ? `${value.case_id} - ${value.title}` : '-'
    },
    {
      key: 'judge',
      label: t('Judge'),
        render: (value: any, row: any) => {
            return (
                <UserColumn user={{name: value?.name , email: value?.email}} />
            );
        }
    },
    {
      key: 'court',
      label: t('Court'),
        render: (value: any, row: any) => {
            return (
                <UserColumn user={row?.court} hideAvatar/>
            );
        }
    },
    {
      key: 'hearing_date',
      label: t('Date & Time'),
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
            {value && <Calendar className="h-4 w-4" />}
            <span>{window.appSettings?.formatDate(value) || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{window.appSettings?.formatTime(`2000-01-01T${row.hearing_time}`) || row.hearing_time} ({row.duration_minutes}min)</span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          in_progress: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          completed: 'bg-green-50 text-green-700 ring-green-600/20',
          postponed: 'bg-orange-50 text-orange-700 ring-orange-600/20',
          cancelled: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
            {capitalize(value)}
          </span>
        );
      }
    }
  ];

  const actions = [
    { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-hearings' },
    { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-hearings' },
    { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-hearings' }
  ];

  const statusOptions = [
    { value: '_empty_', label: t('All Status') },
    { value: 'scheduled', label: t('Scheduled') },
    { value: 'in_progress', label: t('In Progress') },
    { value: 'completed', label: t('Completed') },
    { value: 'postponed', label: t('Postponed') },
    { value: 'cancelled', label: t('Cancelled') }
  ];

  const courtOptions = [
    { value: '_empty_', label: t('All Courts') },
    ...(allCourts || []).map((court: any) => ({
      value: court.id.toString(),
      label: court.name
    }))
  ];

  const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedStatus, selectedCourt]);


  return (
    <PageTemplate title={t("Hearings")} url="/hearings" actions={pageActions} description={t("Manage case hearing schedules.")} breadcrumbs={breadcrumbs} noPadding>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            { name: 'status', label: t('Status'), type: 'select', value: selectedStatus, onChange: setSelectedStatus, options: statusOptions },
            { name: 'court_id', label: t('Court'), type: 'select', value: selectedCourt, searchable: true, onChange: setSelectedCourt, options: courtOptions }
          ]}
          hasActiveFilters={() => searchTerm !== '' || selectedStatus !== '_empty_' || selectedCourt !== '_empty_'}
          activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedCourt !== '_empty_' ? 1 : 0)}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={hearings?.data || []}
          from={hearings?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-hearings',
            create: 'create-hearings',
            edit: 'edit-hearings',
            delete: 'delete-hearings'
          }}
        />

        <Pagination
          from={hearings?.from || 0}
          to={hearings?.to || 0}
          total={hearings?.total || 0}
          links={hearings?.links}
          entityName={t("hearings")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hearings.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
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
            {
              name: 'case_id',
              label: t('Case'),
              type: 'select',
              searchable: true,
              required: true,
              options: cases ? cases.map((c: any) => ({ value: c.id.toString(), label: `${c.case_id} - ${c.title}` })) : [],
              emptyNote: { link: route('cases.index'), linkText: t('Cases') }
            },
            {
              name: 'court_judge',
              type: 'dependent-dropdown',
              dependentConfig: [
                {
                  name: 'court_id',
                  label: t('Court'),
                  required: true,
                  searchable: true,
                  options: courts ? courts.map((c: any) => ({ value: c.id.toString(), label: c.name })) : [],
                  emptyNote: { link: route('courts.index'), linkText: t('Courts') }
                },
                {
                  name: 'judge_id',
                  label: t('Judge'),
                  required: true,
                  searchable: true,
                  apiEndpoint: '/api/hearings/court-judges/{court_id}',
                  emptyNote: { link: route('judges.index'), linkText: t('Judges') }
                }
              ]
            },
            {
              name: 'hearing_type_id',
              label: t('Hearing Type'),
              type: 'select',
              searchable: true,
              required: true,
              placeholder: t('Select Hearing Type'),
              options: hearingTypes ? hearingTypes.map((ht: any) => ({ value: ht.id.toString(), label: ht.name, duration: ht.duration_estimate })) : [],
              emptyNote: { link: route('hearing-types.index'), linkText: t('Hearing Types') },
              onChange: (value: string, formData: any, setFormData: any) => {
                const selectedType = hearingTypes?.find((ht: any) => ht.id.toString() === value);
                if (selectedType && selectedType.duration_estimate && !formData.duration_minutes) {
                  setFormData((prev: any) => ({ ...prev, duration_minutes: selectedType.duration_estimate }));
                }
              }
            },
            { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. Motion Hearing' },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Hearing to review motion filed by plaintiff' },
            { name: 'hearing_date', label: t('Date'), type: 'date', required: true },
            { name: 'hearing_time', label: t('Time'), type: 'time', required: true },
            { name: 'duration_minutes', label: t('Duration (minutes)'), type: 'number', placeholder: 'eg. 60' },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              options: statusOptions.filter(opt => opt.value !== '_empty_'),
              defaultValue: 'scheduled'
            },
            { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Bring all relevant documents' },
            ...(formMode === 'edit' ? [{ name: 'outcome', label: t('Outcome'), type: 'textarea', placeholder: 'eg. Ruling in favor of plaintiff' }] : [])
          ].concat(googleCalendarEnabled && formMode === 'create' ? [{
            name: 'sync_with_google_calendar',
            label: t('Synchronize in Google Calendar'),
            type: 'switch',
            defaultValue: false
          }] : []),
          modalSize: 'xl'
        }}
        initialData={currentItem ? {
          ...currentItem,
          court_id: currentItem.court_id?.toString() || currentItem.court?.id?.toString(),
          judge_id: currentItem.judge_id?.toString() || currentItem.judge?.id?.toString(),
          case_id: currentItem.case_id?.toString() || currentItem.case?.id?.toString(),
          hearing_type_id: currentItem.hearing_type_id?.toString() || currentItem.hearing_type?.id?.toString()
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Hearing')
            : t('Edit Hearing')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="hearing"
      />

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentItem && <ViewPopup record={currentItem} />}
      </Dialog>
    </PageTemplate>
  );
}
