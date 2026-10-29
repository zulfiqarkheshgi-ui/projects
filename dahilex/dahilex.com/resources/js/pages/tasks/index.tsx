import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { ExternalLink, Plus, Eye, Edit, Trash2, MoreHorizontal, User, RefreshCw, Calendar } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { formatStatusText, hexToRgba } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import UserColumn from '@/components/UserColumn';

export default function Tasks() {
    const { t } = useTranslation();
    const { auth, tasks, taskTypes, allTaskTypes, users, allUsers, cases, taskStatuses, allTaskStatuses, googleCalendarEnabled, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedTaskType, setSelectedTaskType] = useState(pageFilters.task_type_id || '_empty_');
    const [selectedTaskStatus, setSelectedTaskStatus] = useState(pageFilters.task_status_id || '_empty_');
    const [selectedPriority, setSelectedPriority] = useState(pageFilters.priority || '_empty_');
    const [selectedAssignedTo, setSelectedAssignedTo] = useState(pageFilters.assigned_to || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [activeView, setActiveView] = useState(
        ['list', 'kanban'].includes(pageFilters.view) ? pageFilters.view : 'kanban'
    );
    const [kanbanData, setKanbanData] = useState<any>(null);
    const [isLoadingKanban, setIsLoadingKanban] = useState(false);
    const [prefilledStatus, setPrefilledStatus] = useState<string>('');

    const hasActiveFilters = () =>
        searchTerm !== '' || selectedTaskType !== '_empty_' || selectedTaskStatus !== '_empty_' ||
        selectedPriority !== '_empty_' || selectedAssignedTo !== '_empty_';

    const activeFilterCount = () =>
        (searchTerm ? 1 : 0) + (selectedTaskType !== '_empty_' ? 1 : 0) +
        (selectedTaskStatus !== '_empty_' ? 1 : 0) + (selectedPriority !== '_empty_' ? 1 : 0) +
        (selectedAssignedTo !== '_empty_' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const qp = () => ({
        view: activeView,
        search: searchTerm || undefined,
        task_type_id: selectedTaskType !== '_empty_' ? selectedTaskType : undefined,
        task_status_id: selectedTaskStatus !== '_empty_' ? selectedTaskStatus : undefined,
        priority: selectedPriority !== '_empty_' ? selectedPriority : undefined,
        assigned_to: selectedAssignedTo !== '_empty_' ? selectedAssignedTo : undefined,
        sort_field: pageFilters.sort_field || undefined,
        sort_direction: pageFilters.sort_direction || undefined,
        ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    });

    const applyFilters = () => {
        router.get(route('tasks.index'), { ...qp(), page: 1 }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('tasks.index'), { ...qp(), sort_field: field, sort_direction: direction, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view': router.get(route('tasks.show', item.id)); break;
            case 'edit': setFormMode('edit'); setIsFormModalOpen(true); break;
            case 'delete': setIsDeleteModalOpen(true); break;
            case 'toggle-status': setIsStatusModalOpen(true); break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleAddTask = (statusId: string) => {
        setCurrentItem(null);
        setFormMode('create');
        setPrefilledStatus(statusId);
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        const isCreate = formMode === 'create';
        router[isCreate ? 'post' : 'put'](
            isCreate ? route('tasks.store') : route('tasks.update', currentItem.id),
            formData,
            {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    const f = page.props.flash as any;
                    if (f?.success) toast.success(f.success);
                    else if (f?.error) toast.error(f.error);
                    if (activeView === 'kanban') loadKanbanData();
                },
                onError: (errors) => toast.error(Object.values(errors).join(', '))
            }
        );
    };

    const handleDeleteConfirm = () => {
        router.delete(route('tasks.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
                if (activeView === 'kanban') loadKanbanData();
            },
            onError: (errors) => toast.error(Object.values(errors).join(', '))
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('tasks.toggle-status', currentItem.id), formData, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
                if (activeView === 'kanban') loadKanbanData();
            },
            onError: (errors) => toast.error(Object.values(errors).join(', '))
        });
    };

    const handleResetFilters = () => {
        router.get(route('tasks.index'), { view: activeView });
    };

    const loadKanbanData = () => {
        if (activeView !== 'kanban' || !taskStatuses?.length) return;
        setIsLoadingKanban(true);
        const tasksData = tasks?.data || [];
        const structured: any = {};
        taskStatuses.forEach((status: any) => {
            structured[status.id] = {
                status,
                items: tasksData.filter((task: any) => {
                    const matchesStatus = task.task_status?.id === status.id || task.task_status_id === status.id;
                    const matchesSearch = !searchTerm ||
                        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        task.task_id?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesSelectedTaskStatus = selectedTaskStatus === '_empty_' || task.task_status_id?.toString() === selectedTaskStatus;
                    const matchesType = selectedTaskType === '_empty_' || task.task_type_id?.toString() === selectedTaskType;
                    const matchesPriority = selectedPriority === '_empty_' || task.priority === selectedPriority;
                    const matchesAssigned = selectedAssignedTo === '_empty_' || task.assigned_to?.toString() === selectedAssignedTo;
                    return matchesStatus && matchesSearch && matchesType && matchesPriority && matchesAssigned && matchesSelectedTaskStatus;
                })
            };
        });
        setKanbanData(structured);
        setIsLoadingKanban(false);
    };

    useEffect(() => {
        if (activeView === 'kanban' && taskStatuses?.length) loadKanbanData();
    }, [activeView, tasks, searchTerm, selectedTaskType, selectedPriority, selectedAssignedTo, taskStatuses, selectedTaskStatus]);

    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-tasks')) {
        pageActions.push({
            label: t('Add Task'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Task & Workflow'), href: route('tasks.index') },
        { title: t('Tasks') }
    ];

    const columns = [
        {
            key: 'case',
            label: t('Case'),
            render: (value: string, row: any) => (
                <div className="flex items-center gap-2">
                    {value ? (
                        <>
                            <ExternalLink className="h-4 w-4 text-gray-500" />
                            <a href={route('cases.show', row.case.id)} target="_blank" rel="noopener noreferrer" className="text-blue-600 truncate max-w-xs">
                                {row.case.title}
                            </a>
                        </>
                    ) : (
                        <span className="text-gray-500">-</span>
                    )}
                </div>
            )
        },
        {
            key: 'title',
            label: t('Title'),
            sortable: true
        },
        {
            key: 'assigned_user',
            label: t('Assigned To'),
            render: (value: any, row: any) => {
                return (
                    <UserColumn user={row.assigned_user} />
                );
            }
        },
        {
            key: 'priority',
            label: t('Priority'),
            render: (value: string) => {
                const colors = {
                    critical: 'bg-red-50 text-red-700 ring-red-600/20',
                    high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
                    medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    low: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                };
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[value as keyof typeof colors]}`}>
                        {formatStatusText(value)}
                    </span>
                );
            }
        },
        {
            key: 'task_status_id',
            label: t('Status'),
            render: (value: any, row: any) => {
                return (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                        style={{
                            backgroundColor: `${row.task_status?.color}20`,
                            color: row.task_status?.color,
                            boxShadow: `inset 0 0 0 1px ${hexToRgba(row.task_status?.color, 0.2)}`,
                        }}
                    >
                        {formatStatusText(row.task_status?.name || '-')}
                    </span>
                );
            }
        },
        {
            key: 'task_type_id',
            label: t('Type'),
            render: (value: any, row: any) => {
                return (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                        style={{
                            backgroundColor: `${row.task_type?.color}20`,
                            color: row.task_type?.color,
                            boxShadow: `inset 0 0 0 1px ${hexToRgba(row.task_type?.color, 0.2)}`,
                        }}
                    >
                        {formatStatusText(row.task_type?.name || '-')}
                    </span>
                );
            }
        },
        {
            key: 'due_date',
            label: t('Due Date'),
            sortable: true,
            type: 'date'
        },
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-tasks',
            href: (row: any) => route('tasks.show', row.id)
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-tasks'
        },
        {

            label: t('Change Status'),
            icon: 'RefreshCw',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-tasks'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-tasks'
        }
    ];

    const taskTypeOptions = [
        { value: '_empty_', label: t('All Types') },
        ...(allTaskTypes || []).map((type: any) => ({
            value: type.id.toString(),
            label: type.name
        }))
    ];

    const taskStatusOptions = [
        { value: '_empty_', label: t('All Status') },
        ...(allTaskStatuses || []).map((type: any) => ({
            value: type.id.toString(),
            label: type.name
        }))
    ];

    const priorityOptions = [
        { value: '_empty_', label: t('All Priorities') },
        { value: 'critical', label: t('Critical') },
        { value: 'high', label: t('High') },
        { value: 'medium', label: t('Medium') },
        { value: 'low', label: t('Low') }
    ];

    const userOptions = [
        { value: '_empty_', label: t('All Users') },
        ...(allUsers || []).map((user: any) => ({
            value: user.id.toString(),
            label: user.name
        }))
    ];

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedTaskType, selectedTaskStatus, selectedPriority, selectedAssignedTo]);


    return (
        <PageTemplate
            title={t("Tasks")}
            description={t("Manage and track tasks assigned to cases and team members.")}
            url="/tasks"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
            className={activeView === 'kanban' ? 'overflow-hidden' : ''}
        >
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'task_type_id',
                            label: t('Task Type'),
                            type: 'select',
                            searchable: true,
                            value: selectedTaskType,
                            onChange: setSelectedTaskType,
                            options: taskTypeOptions
                        },
                        {
                            name: 'task_status_id',
                            label: t('Task Status'),
                            type: 'select',
                            searchable: true,
                            value: selectedTaskStatus,
                            onChange: setSelectedTaskStatus,
                            options: taskStatusOptions
                        },
                        {
                            name: 'priority',
                            label: t('Priority'),
                            type: 'select',
                            value: selectedPriority,
                            onChange: setSelectedPriority,
                            options: priorityOptions
                        },
                        {
                            name: 'assigned_to',
                            label: t('Assigned To'),
                            type: 'select',
                            searchable: true,
                            value: selectedAssignedTo,
                            onChange: setSelectedAssignedTo,
                            options: userOptions
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    showViewToggle={true}
                    activeView={activeView}
                    onViewChange={(view: string) => {
                        setActiveView(view);
                        router.get(route('tasks.index'), { ...qp(), view, page: pageFilters.page }, { preserveState: true, preserveScroll: true });
                    }}
                    viewOptions={[
                        { value: 'list', label: t('List View'), icon: 'List' },
                        { value: 'kanban', label: t('Kanban View'), icon: 'Columns' },
                    ]}
                />
            </div>

            {activeView === 'list' ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={tasks?.data || []}
                        from={tasks?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                        entityPermissions={{
                            view: 'view-tasks',
                            create: 'create-tasks',
                            edit: 'edit-tasks',
                            delete: 'delete-tasks'
                        }}
                    />
                    <Pagination
                        from={tasks?.from || 0}
                        to={tasks?.to || 0}
                        total={tasks?.total || 0}
                        links={tasks?.links}
                        entityName={t('tasks')}
                        {...(activeView !== 'kanban' ? {
                            currentPerPage: pageFilters.per_page?.toString() || '10',
                            onPerPageChange: (value: string) => {
                                router.get(route('tasks.index'), {
                                    ...qp(), page: 1,
                                    per_page: parseInt(value),
                                }, { preserveState: true, preserveScroll: true });
                            }
                        } : {
                            hidePerPage: true
                        })}
                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                    />
                </div>
            ) : (
                <div className="w-full">
                    <style>{`
                        .kanban-scroll::-webkit-scrollbar { height: 4px; width: 3px; }
                    `}</style>
                    <div className="bg-white border p-4 rounded-lg overflow-hidden">
                        {isLoadingKanban ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400">{t('Loading kanban board...')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll" style={{ height: 'calc(100vh - 280px)' }}>
                                {(taskStatuses || []).map((status: any) => {
                                    const statusTasks = kanbanData?.[status.id]?.items || [];
                                    return (
                                        <div
                                            key={status.id}
                                            className="flex-shrink-0"
                                            style={{ minWidth: 'calc(20% - 16px)', width: 'calc(20% - 16px)' }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.remove('bg-blue-50');
                                                const taskId = e.dataTransfer.getData('taskId');
                                                if (!taskId) return;
                                                if (!hasPermission(permissions, 'toggle-status-tasks')) {
                                                    toast.error(t('Permission denied.'));
                                                    return;
                                                }
                                                router.put(route('tasks.toggle-status', taskId), { task_status_id: status.id }, {
                                                    onSuccess: (page) => {
                                                        const f = page.props.flash as any;
                                                        if (f?.success) toast.success(f.success);
                                                        else if (f?.error) toast.error(f.error);
                                                        loadKanbanData();
                                                    },
                                                    onError: () => toast.error(t('Failed to update task status'))
                                                });
                                            }}
                                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-50'); }}
                                            onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-50'); }}
                                        >
                                            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg h-full flex flex-col border-t-3" style={{ borderColor: status.color }}>
                                                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                                                            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{status.name}</h3>
                                                        </div>
                                                        <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                            {statusTasks.length}
                                                        </span>
                                                    </div>
                                                    {hasPermission(permissions, 'create-tasks') && (
                                                        <button
                                                            onClick={() => handleAddTask(status.id.toString())}
                                                            className="w-full text-xs text-gray-600 hover:text-primary/90 hover:bg-primary/10 py-2 px-3 rounded-md border border-dashed border-gray-300 hover:border-primary/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                        >
                                                            <Plus className="h-3 w-3" />{t('Add Task')}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="p-2 space-y-2 overflow-y-auto flex-1 kanban-scroll" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                                                    {statusTasks.map((task: any) => (
                                                        <div
                                                            key={task.id}
                                                            draggable={hasPermission(permissions, 'toggle-status-tasks')}
                                                            onDragStart={(e) => {
                                                                if (!hasPermission(permissions, 'toggle-status-tasks')) { e.preventDefault(); return; }
                                                                e.dataTransfer.setData('taskId', task.id.toString());
                                                                e.currentTarget.classList.add('opacity-50', 'scale-95');
                                                            }}
                                                            onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50', 'scale-95')}
                                                            className={`transition-all duration-200 ${hasPermission(permissions, 'toggle-status-tasks') ? 'cursor-move' : 'cursor-default'}`}
                                                        >
                                                            <Card className="hover:shadow-md transition-all duration-200 border-l-4 hover:scale-105" style={{ borderLeftColor: status.color }}>
                                                                <div className="p-3">
                                                                    <div className="space-y-2">
                                                                        {/* Title + menu */}
                                                                        <div className="flex items-start justify-between">
                                                                            <h4
                                                                                className="font-medium text-sm line-clamp-2 transition-colors cursor-pointer flex-1"
                                                                                onClick={() => { hasPermission(permissions, 'view-tasks') && router.get(route('tasks.show', task.id)) }}
                                                                            >
                                                                                {task.title}
                                                                            </h4>
                                                                            {(hasPermission(permissions, 'view-tasks') || hasPermission(permissions, 'edit-tasks') || hasPermission(permissions, 'toggle-status-tasks') || hasPermission(permissions, 'delete-tasks')) && (
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600">
                                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end" className="w-40">
                                                                                        {hasPermission(permissions, 'view-tasks') && (
                                                                                            <DropdownMenuItem onClick={() => router.get(route('tasks.show', task.id))}>
                                                                                                <Eye className="h-4 w-4 mr-2" />{t('View')}
                                                                                            </DropdownMenuItem>
                                                                                        )}
                                                                                        {hasPermission(permissions, 'edit-tasks') && (
                                                                                            <DropdownMenuItem onClick={() => handleAction('edit', task)}>
                                                                                                <Edit className="h-4 w-4 mr-2" />{t('Edit')}
                                                                                            </DropdownMenuItem>
                                                                                        )}
                                                                                        {hasPermission(permissions, 'toggle-status-tasks') && (
                                                                                            <DropdownMenuItem onClick={() => handleAction('toggle-status', task)}>
                                                                                                <RefreshCw className="h-4 w-4 mr-2" />{t('Change Status')}
                                                                                            </DropdownMenuItem>
                                                                                        )}
                                                                                        {hasPermission(permissions, 'delete-tasks') && (
                                                                                            <>
                                                                                                <DropdownMenuSeparator />
                                                                                                <DropdownMenuItem onClick={() => handleAction('delete', task)} className="text-red-600">
                                                                                                    <Trash2 className="h-4 w-4 mr-2" />{t('Delete')}
                                                                                                </DropdownMenuItem>
                                                                                            </>
                                                                                        )}
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            )}
                                                                        </div>

                                                                        {/* Case link + task type */}
                                                                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                                                            {task.case && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                                                    <span className="text-blue-600 truncate cursor-pointer" onClick={() => hasPermission(permissions, 'view-cases') && router.visit(route('cases.show', task.case.id))} >
                                                                                        {task.case.case_id}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Priority + avatar */}
                                                                        <div className="flex items-center justify-between">
                                                                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${{ critical: 'bg-red-50 text-red-700 ring-red-600/20', high: 'bg-orange-50 text-orange-700 ring-orange-600/20', medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20', low: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' }[task.priority as string] || ''}`}>
                                                                                {formatStatusText(task.priority)}
                                                                            </span>
                                                                            {task.task_type && (
                                                                                <span
                                                                                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                                                                    style={{
                                                                                        backgroundColor: `${task.task_type?.color}20`,
                                                                                        color: task.task_type?.color,
                                                                                        boxShadow: `inset 0 0 0 1px ${hexToRgba(task.task_type?.color, 0.2)}`,
                                                                                    }}
                                                                                >
                                                                                    {formatStatusText(task.task_type?.name || '-')}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Due date */}
                                                                        <div className="flex justify-between text-xs text-gray-400">
                                                                            <div className='flex gap-1 items-center'>
                                                                                {task.due_date && (
                                                                                    <>
                                                                                        <Calendar className='w-3 h-3' />
                                                                                        {window.appSettings?.formatDateTime(task.due_date, false) || new Date(task.due_date).toLocaleDateString()}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            {task.assigned_user && (
                                                                                <Avatar className="h-5 w-5">
                                                                                    <AvatarImage src={task.assigned_user.avatar} />
                                                                                    <AvatarFallback className="text-[9px]">{getInitials(task.assigned_user.name)}</AvatarFallback>
                                                                                </Avatar>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        </div>
                                                    ))}
                                                    {statusTasks.length === 0 && (
                                                        <div className="text-center py-8 text-gray-400">
                                                            <User className="h-8 w-8 mx-auto mb-2" />
                                                            <p className="text-sm">{t('No tasks')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. Draft Motion to Dismiss' },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Prepare and review motion documents' },
                        {
                            name: 'priority',
                            label: t('Priority'),
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'critical', label: t('Critical') },
                                { value: 'high', label: t('High') },
                                { value: 'medium', label: t('Medium') },
                                { value: 'low', label: t('Low') }
                            ],
                            defaultValue: 'medium'
                        },
                        { name: 'due_date', label: t('Due Date'), type: 'date', required: true },
                        {
                            name: 'case_assignment',
                            label: t('Case & Assignment'),
                            type: 'dependent-dropdown',
                            dependentConfig: (() => {
                                const caseOptions = (cases || []).map((c: any) => ({
                                    value: c.id.toString(),
                                    label: c.title || c.case_id || `Case ${c.id}`,
                                }));
                                return [
                                    {
                                        name: 'case_id',
                                        label: t('Case'),
                                        searchable: true,
                                        options: caseOptions,
                                        required: true,
                                        emptyNote: { link: route('cases.index'), linkText: t('Cases') }
                                    },
                                    {
                                        name: 'assigned_to',
                                        label: t('Assigned To'),
                                        searchable: true,
                                        apiEndpoint: '/api/tasks/case-users/{case_id}',
                                        showCurrentValue: true,
                                        required: true,
                                        emptyNote: (formData?: any) => formData?.case_id
                                            ? { link: route('cases.show', formData.case_id), linkText: t('Case Team Members') }
                                            : null
                                    }
                                ];
                            })()
                        },
                        {
                            name: 'task_type_id',
                            label: t('Task Type'),
                            type: 'select',
                            searchable: true,
                            placeholder: t('Select Task Type'),
                            options: [
                                ...(taskTypes || []).map((type: any) => ({
                                    value: type.id.toString(),
                                    label: type.name
                                }))
                            ],
                            required: true,
                            emptyNote: { link: route('tasks.task-types.index'), linkText: t('Task Types') }
                        },
                        {
                            name: 'task_status_id',
                            label: t('Task Status'),
                            type: 'select',
                            searchable: true,
                            placeholder: t('Select Task Status'),
                            options: [
                                ...(taskStatuses || []).map((status: any) => ({
                                    value: status.id.toString(),
                                    label: status.name
                                }))
                            ],
                            required: true,
                            defaultValue: prefilledStatus || undefined,
                            hidden: formMode === 'create' && !!prefilledStatus,
                            emptyNote: { link: route('tasks.task-statuses.index'), linkText: t('Task Status') }
                        },
                        { name: 'estimated_duration', label: t('Estimated Duration (minutes)'), type: 'number', placeholder: 'eg. 120' },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Coordinate with senior partner before filing' }
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
                    case_id: currentItem.case_id?.toString() || currentItem.case?.id?.toString(),
                    assigned_to: currentItem.assigned_to?.toString() || currentItem.assigned_user?.id?.toString(),
                    task_type_id: currentItem.task_type_id?.toString() || currentItem.task_type?.id?.toString(),
                    task_status_id: currentItem.task_status_id?.toString() || currentItem.task_status?.id?.toString()
                } : null}
                title={
                    formMode === 'create'
                        ? t('Add New Task')
                        : formMode === 'edit'
                            ? t('Edit Task')
                            : t('View Task')
                }
                mode={formMode}
            />

            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [
                        {
                            name: 'task_status_id',
                            label: t('Task Status'),
                            type: 'select',
                            searchable: true,
                            placeholder: t('Select Task Status'),
                            options: [
                                ...(taskStatuses || []).map((status: any) => ({
                                    value: status.id.toString(),
                                    label: status.name
                                }))
                            ],
                            required: true,
                            emptyNote: { link: route('tasks.task-statuses.index'), linkText: t('Task Status') }
                        }
                    ],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { task_status_id: currentItem.task_status_id?.toString() || currentItem.task_status?.id?.toString() } : null}
                title={t('Change Task Status')}
                mode='edit'
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || ''}
                entityName="task"
            />
        </PageTemplate>
    );
}
