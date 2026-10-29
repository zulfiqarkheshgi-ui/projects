import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Search, Calendar, BookOpen, AlertTriangle } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import * as LucidIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatStatusText } from '@/utils/helpers';
import { CrudTable } from '@/components/CrudTable';

export default function ResearchProjects() {
  const { t } = useTranslation();
  const { auth, projects, cases, allCases, researchTypes, allResearchTypes, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedType, setSelectedType] = useState(pageFilters.research_type_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedPriority, setSelectedPriority] = useState(pageFilters.priority || '_empty_');
  const [selectedCase, setSelectedCase] = useState(pageFilters.case_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const [activeView, setActiveView] = useState(
        ['list', 'grid'].includes(pageFilters.view) ? pageFilters.view : 'list'
    );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('legal-research.projects.index'), {
      page: 1,
      search: searchTerm || undefined,
      research_type_id: selectedType !== '_empty_' ? selectedType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
      case_id: selectedCase !== '_empty_' ? selectedCase : undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    router.get(route('legal-research.projects.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      research_type_id: selectedType !== '_empty_' ? selectedType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
      case_id: selectedCase !== '_empty_' ? selectedCase : undefined,
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    switch (action) {
      case 'view':
        router.get(route('legal-research.projects.show', item.id));
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
  const handleFormSubmit = (formData: any) => {
    const action = formMode === 'create' ? 'store' : 'update';
    const route_name = formMode === 'create'
      ? 'legal-research.projects.store'
      : 'legal-research.projects.update';


    const method = formMode === 'create' ? 'post' : 'put';
    const url = formMode === 'create'
      ? route(route_name)
      : route(route_name, currentItem.id);

    router[method](url, formData, {
      onSuccess: (page) => {
        setIsFormModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        toast.error(`Failed to ${action} research project: ${Object.values(errors).join(', ')}`);
      }
    });
  };


  const handleDeleteConfirm = () => {
    router.delete(route('legal-research.projects.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        toast.error(`Failed to delete research project: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const handleStatusChange = (formData: any) => {
    router.put(route('legal-research.projects.toggle-status', currentItem.id), formData, {
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

  const pageActions = [];
  if (hasPermission(permissions, 'create-research-projects')) {
    pageActions.push({
      label: t('Add Research Project'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Legal Research') },
    { title: t('Research Projects') }
  ];

  const priorityConfig: Record<string, { cls: string; bar: string }> = {
    low:    { cls: 'bg-gray-50 text-gray-700 ring-gray-600/20',      bar: 'border-t-gray-400' },
    medium: { cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20', bar: 'border-t-yellow-400' },
    high:   { cls: 'bg-orange-50 text-orange-700 ring-orange-600/20', bar: 'border-t-orange-400' },
    urgent: { cls: 'bg-red-50 text-red-700 ring-red-600/20', bar: 'border-t-red-500' },
  };

  const statusConfig: Record<string, string> = {
    active:    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    completed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    on_hold:   'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  };

  const cardActions = [
    { label: t('View'),          icon: 'Eye',      action: 'view',          permission: 'view-research-projects' },
    { label: t('Edit'),          icon: 'Edit',     action: 'edit',          permission: 'edit-research-projects' },
    { label: t('Change Status'), icon: 'RefreshCw', action: 'toggle-status', permission: 'toggle-status-research-projects' },
    { label: t('Delete'),        icon: 'Trash2',   action: 'delete',        permission: 'delete-research-projects' },
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
      key: 'research_type',
      label: t('Type'),
      render: (value: any, item: any) => {
        const researchType = item.research_type;
        return (
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
            {researchType?.name || '-'}
          </span>
        );
      }
    },
    {
      key: 'case',
      label: t('Case'),
      render: (value: any) => {
        if (!value) return '-';
        return value.case_id ? `${value.case_id} - ${value.title}` : value.title;
      }
    },

    {
      key: 'priority',
      label: t('Priority'),
      render: (value: string) => {
        const priorityColors = {
          low: 'bg-gray-50 text-gray-700 ring-gray-600/20',
          medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
          urgent: 'bg-red-50 text-red-700 ring-red-600/20'
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${priorityColors[value as keyof typeof priorityColors] || priorityColors.medium}`}>
            {t(value.charAt(0).toUpperCase() + value.slice(1))}
          </span>
        );
      }
    },
    {
      key: 'due_date',
      label: t('Due Date'),
      type: 'date'
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          active: 'bg-green-50 text-green-700 ring-green-600/20',
          completed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          on_hold: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          cancelled: 'bg-red-50 text-red-700 ring-red-600/20'
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || statusColors.active}`}>
            {t(value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))}
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
      requiredPermission: 'view-research-projects'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-research-projects'
    },
    {
      label: t('Change Status'),
      icon: 'RefreshCw',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'toggle-status-research-projects'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-research-projects'
    }
  ];

  const caseOptions = [
    { value: '_empty_', label: t('All Cases') },
    ...(allCases || []).map((case_item: any) => ({
      value: case_item.id.toString(),
      label: case_item.case_id ? `${case_item.case_id} - ${case_item.title}` : case_item.title
    }))
  ];

  const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedType, selectedStatus, selectedPriority, selectedCase]);

    const handleResetFilters = () => {
        router.get(route('legal-research.projects.index'), {view:activeView});
    };

  return (
    <PageTemplate
      title={t("Research Projects")}
      url="/legal-research/projects"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      description={t("Manage your research projects.")}
      noPadding
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'research_type_id',
              label: t('Research Type'),
              type: 'select',
              searchable: true,
              value: selectedType,
              onChange: setSelectedType,
              options: [
                { value: '_empty_', label: t('All Types') },
                ...(allResearchTypes || []).map((type: any) => ({ value: type.id.toString(), label: type.name }))
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
                { value: 'completed', label: t('Completed') },
                { value: 'on_hold', label: t('On Hold') },
                { value: 'cancelled', label: t('Cancelled') }
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
                { value: 'high', label: t('High') },
                { value: 'urgent', label: t('Urgent') }
              ]
            },
            {
              name: 'case_id',
              label: t('Case'),
              type: 'select',
              searchable: true,
              value: selectedCase,
              onChange: setSelectedCase,
              options: caseOptions
            }
          ]}
          hasActiveFilters={() => searchTerm !== '' || selectedType !== '_empty_' || selectedStatus !== '_empty_' || selectedPriority !== '_empty_' || selectedCase !== '_empty_'}
          activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedType !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedPriority !== '_empty_' ? 1 : 0) + (selectedCase !== '_empty_' ? 1 : 0)}
          onResetFilters={handleResetFilters}
          showViewToggle={true}
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            router.get(route('legal-research.projects.index'), {view});
            }}
        />
      </div>
    {activeView == 'list' &&
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={projects?.data || []}
          from={projects?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-research-projects',
            create: 'create-research-projects',
            edit: 'edit-research-projects',
            delete: 'delete-research-projects'
          }}
        />

        <Pagination
          from={projects?.from || 0}
          to={projects?.to || 0}
          total={projects?.total || 0}
          links={projects?.links}
          entityName={t("research projects")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('legal-research.projects.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              research_type_id: selectedType !== '_empty_' ? selectedType : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
              case_id: selectedCase !== '_empty_' ? selectedCase : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
          onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
        />
      </div>}
    {activeView == 'grid' &&
        <>
            {(projects?.data || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{t('No research projects found.')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(projects?.data || []).map((item: any) => {
                    const priority = item.priority || 'medium';
                    const pCfg = priorityConfig[priority] || priorityConfig.medium;
                    const sCls = statusConfig[item.status] || statusConfig.active;
                    const dueDate = item.due_date ? window.appSettings?.formatDate(item.due_date) || item.due_date : null;
                    const isOverdue = (item.due_date ?? new Date(item.due_date + 'T00:00:00') < new Date() ) && item.status !== 'completed';

                    return (
                    <Card
                        key={item.id}
                        className={`relative overflow-hidden border shadow hover:shadow-md ${isOverdue ? 'bg-red-50' : ''}`}
                    >
                        <CardContent className="p-5 flex flex-col flex-1">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-sm leading-snug line-clamp-1 ${isOverdue ? 'bg-red-50 dark:text-black' : ''} ${hasPermission(permissions, 'view-research-projects') && 'hover:text-primary  cursor-pointer'}`} onClick={()=> hasPermission(permissions, 'view-research-projects') && handleAction('view', item)}>{item.title}</h3>
                            {item.research_id && (
                                <p className="text-xs text-muted-foreground mt-0.5">#{item.research_id}</p>
                            )}
                            <p className="space-y-1.5 text-xs text-muted-foreground mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">{item.description}</p>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {cardActions.map((act) => {
                                if (!hasPermission(permissions, act.permission)) return null;
                                const Icon = (LucidIcons as any)[act.icon] as React.ElementType;
                                return (
                                <TooltipProvider key={act.action}>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn('h-7 w-7 text-gray-500')}
                                        onClick={() => handleAction(act.action, item)}
                                        >
                                        <Icon size={14} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{act.label}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                );
                            })}
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pCfg.cls}`}>
                            {t(formatStatusText(priority))}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${sCls}`}>
                            {t(formatStatusText(item.status))}
                            </span>
                            {item.research_type && (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                {item.research_type.name}
                            </span>
                            )}
                        </div>

                        {/* Meta */}
                        <div className="space-y-1.5 text-xs text-muted-foreground mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                            {item.case && (
                            <div className="flex items-center gap-1.5">
                                <LucidIcons.Briefcase className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.case.case_id ? `${item.case.case_id} — ${item.case.title}` : item.case.title}</span>
                            </div>
                            )}
                            {dueDate && (
                            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-500' : ''}`}>
                                {isOverdue ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Calendar className="h-3.5 w-3.5 shrink-0" />}
                                <span>{isOverdue ? t('Deadline Passed') : t('Due by')}: {dueDate}</span>
                            </div>
                            )}
                        </div>
                        </CardContent>
                    </Card>
                    );
                })}
                </div>
            )}

            {projects?.total > 0 &&
                <div className="mt-5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <Pagination
                    from={projects?.from || 0}
                    to={projects?.to || 0}
                    total={projects?.total || 0}
                    links={projects?.links}
                    entityName={t("research projects")}
                    currentPerPage={pageFilters.per_page?.toString() || "9"}
                    perPageOptions={[9, 27, 45, 90]}
                    onPerPageChange={(value) => {
                        router.get(route('legal-research.projects.index'), {
                        page: 1,
                        ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                        search: searchTerm || undefined,
                        research_type_id: selectedType !== '_empty_' ? selectedType : undefined,
                        status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                        priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
                        case_id: selectedCase !== '_empty_' ? selectedCase : undefined,
                        sort_field: pageFilters.sort_field || undefined,
                        sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                    />
                </div>
            }
            </>
        }

      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. Contract Dispute Research' },
            { name: 'description', label: t('Description'), type: 'textarea', rows: 3, placeholder: 'eg. Research on breach of contract case law' },
            {
              name: 'research_type_id',
              label: t('Research Type'),
              type: 'select',
              searchable: true,
              required: true,
              options: (researchTypes || []).map((type: any) => ({ value: type.id, label: type.name })),
              displayValue: formMode === 'view' ? currentItem?.research_type?.name : undefined,
              emptyNote: { link: route('legal-research.research-types.index'), linkText: t('Research Types') }
            },
            {
              name: 'case_id',
              label: t('Associated Case'),
              type: 'select',
              searchable: true,
              required: true,
              options: [
                ...(cases || []).map((case_item: any) => ({
                  value: case_item.id,
                  label: case_item.case_id ? `${case_item.case_id} - ${case_item.title}` : case_item.title
                }))
              ],
              displayValue: formMode === 'view' ? (currentItem?.case?.title || t('No Case')) : undefined,
              emptyNote: { link: route('cases.index'), linkText: t('Cases') }
            },
            {
              name: 'priority',
              label: t('Priority'),
              type: 'select',
              required: true,
              options: [
                { value: 'low', label: t('Low') },
                { value: 'medium', label: t('Medium') },
                { value: 'high', label: t('High') },
                { value: 'urgent', label: t('Urgent') }
              ],
              defaultValue: 'medium'
            },

            { name: 'due_date', label: t('Due Date'), type: 'date' },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              options: [
                { value: 'active', label: t('Active') },
                { value: 'completed', label: t('Completed') },
                { value: 'on_hold', label: t('On Hold') },
                { value: 'cancelled', label: t('Cancelled') }
              ],
              defaultValue: 'active'
            }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem}
        title={formMode === 'create' ? t('Add New Research Project') : t('Edit Research Project')}
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="research project"
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
                { value: 'active', label: t('Active') },
                { value: 'completed', label: t('Completed') },
                { value: 'on_hold', label: t('On Hold') },
                { value: 'cancelled', label: t('Cancelled') }
              ]
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem}
        title={t('Change Project Status')}
        mode="edit"
      />


    </PageTemplate>
  );
}
