import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Lock, Search, Trash2, X, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function TaskStatuses() {
    const { t } = useTranslation();
    const { auth, taskStatuses, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    const [formData, setFormData] = useState({
        name: '',
        color: '#6B7280',
        is_completed: 0,
        status: 'active',
    });
    const [formErrors, setFormErrors] = useState<any>({});

    const resetForm = () => {
        setFormData({ name: '', color: '#6B7280', is_completed: 0, status: 'active' });
        setFormErrors({});
        setFormMode('create');
        setCurrentItem(null);
    };

    const loadItemForEdit = (item: any) => {
        setFormData({
            name: item.name || '',
            color: item.color || '#6B7280',
            is_completed: item.is_completed,
            status: item.status || 'active',
        });
        setFormMode('edit');
        setCurrentItem(item);
        setFormErrors({});
    };

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all';

    const applyFilters = () => {
        router.get(route('tasks.task-statuses.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            sort_field: pageFilters.sort_field,
            sort_direction: pageFilters.sort_direction,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e?.preventDefault) e.preventDefault();
        applyFilters();
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('tasks.task-statuses.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        router.get(route('tasks.task-statuses.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'edit':
                loadItemForEdit(item);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        if (formMode === 'create') {
            router.post(route('tasks.task-statuses.store'), formData, {
                onSuccess: (page) => {
                    if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); }
                    else if (page.props.flash.error) toast.error(page.props.flash.error);
                },
                onError: (errors) => { setFormErrors(errors); toast.error('Failed to create task status.'); },
            });
        } else {
            router.put(route('tasks.task-statuses.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); }
                    else if (page.props.flash.error) toast.error(page.props.flash.error);
                },
                onError: (errors) => { setFormErrors(errors); toast.error('Failed to update task status.'); },
            });
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('tasks.task-statuses.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) { toast.success(page.props.flash.success); if (formMode === 'edit') resetForm(); }
                else if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => {
                setIsDeleteModalOpen(false);
                toast.error(`Failed to delete task status: ${Object.values(errors).join(', ')}`);
            },
        });
    };

    const handleToggleStatus = (taskStatus: any) => {
        router.put(route('tasks.task-statuses.toggle-status', taskStatus.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                    if (formMode === 'edit' && currentItem?.id === taskStatus.id) {
                        setFormData(prev => ({ ...prev, status: taskStatus.status === 'active' ? 'inactive' : 'active' }));
                    }
                } else if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => toast.error(`Failed to update task status: ${Object.values(errors).join(', ')}`),
        });
    };

    const canCreate = hasPermission(permissions, 'create-task-statuses');
    const canEdit = hasPermission(permissions, 'edit-task-statuses');
    const canToggle = hasPermission(permissions, 'toggle-status-task-statuses');
    const canDelete = hasPermission(permissions, 'delete-task-statuses');

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Task & Workflow'), href: route('tasks.index') },
        { title: t('Task Setup'), href: route('tasks.index') },
        { title: t('Task Status') },
    ];

    return (
        <PageTemplate title={t('Task Status')} description={t('Configure custom statuses for your task workflow.')} url="/tasks/task-statuses" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Left — Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formMode === 'create' ? t('Add New Task Status') : t('Edit Task Status')}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {formMode === 'create'
                                    ? t('Fill in the details to create a new task status')
                                    : t('Update the task status details below')}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" required>{t('Name')}</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('eg. In Progress')}
                                    className={formErrors.name ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                    required
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="color" required>{t('Color')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className={`h-10 w-14 cursor-pointer p-1 ${formErrors.color ? 'border-red-500' : ''}`}
                                        disabled={!canCreate && !canEdit}
                                    />
                                    <Input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        pattern="^#[0-9A-Fa-f]{6}$"
                                        className="font-mono text-sm uppercase"
                                        placeholder="#000000"
                                        disabled={!canCreate && !canEdit}
                                    />
                                </div>
                                {formErrors.color && <p className="text-sm text-red-500">{formErrors.color}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">{t('Status')}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    disabled={!canCreate && !canEdit}
                                >
                                    <SelectTrigger className={formErrors.status ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.status && <p className="text-sm text-red-500">{formErrors.status}</p>}
                            </div>

                            <div className="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                                {(canCreate || canEdit) && (
                                    <Button type="submit" className="flex-1">
                                        {formMode === 'create' ? t('Add Task Status') : t('Update Task Status')}
                                    </Button>
                                )}
                                {formMode === 'edit' && (
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        {t('Cancel')}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right — List */}
                <div className="space-y-4 lg:col-span-2">
                    {/* Search & Filter */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder={t('Search task statuses...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button onClick={handleSearch} variant="default">{t('Search')}</Button>
                                {hasActiveFilters() && (
                                    <Button onClick={handleResetFilters} variant="outline">
                                        <X className="mr-2 h-4 w-4" />{t('Reset')}
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {(taskStatuses?.data || []).length > 0 ? (
                            <>
                                {/* <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Task Statuses')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Manage task status categories for your tasks.')}</p>
                                </div> */}

                                {/* Desktop Table */}
                                <div className="hidden overflow-x-auto lg:block">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr className='bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t'>
                                                <th className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300" onClick={() => handleSort('name')}>
                                                    <div className="flex items-center gap-1">
                                                        {t('Task Status')}
                                                        {pageFilters.sort_field === 'name'
                                                            ? (pageFilters.sort_direction === 'asc' ? ' ↑' : ' ↓')
                                                            : <span className="opacity-40">↕</span>}
                                                    </div>
                                                </th>
                                                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Status')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 px-[50px]">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                            {taskStatuses.data.map((item: any) => (
                                                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center">
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: item.color || '#6B7280' }}>
                                                                <Tag className="h-5 w-5" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                                            {item.status === 'active' ? t('Active') : t('Inactive')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip>}
                                                            {canToggle && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', item)} className="h-8 w-8 p-0 text-gray-500"><Lock className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{item.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent></Tooltip>}
                                                            {canDelete && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="space-y-4 p-4 lg:hidden">
                                    {taskStatuses.data.map((item: any) => (
                                        <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                            <div className="mb-3 flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: item.color || '#6B7280' }}>
                                                        <Tag className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex justify-end gap-1">
                                                    {canEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip>}
                                                    {canToggle && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', item)} className="h-8 w-8 p-0 text-gray-500"><Lock className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{item.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent></Tooltip>}
                                                    {canDelete && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip>}
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Status')}</p>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                                        {item.status === 'active' ? t('Active') : t('Inactive')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {taskStatuses?.total > (taskStatuses?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination
                                            from={taskStatuses?.from || 0}
                                            to={taskStatuses?.to || 0}
                                            total={taskStatuses?.total || 0}
                                            links={taskStatuses?.links}
                                            entityName={t('task statuses')}
                                            hidePerPage={true}
                                            onPageChange={(url) => {
                                                router.get(url, {
                                                    search: searchTerm || undefined,
                                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                                    sort_field: pageFilters.sort_field,
                                                    sort_direction: pageFilters.sort_direction,
                                                }, { preserveState: true, preserveScroll: true });
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                    <Tag className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No task statuses found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
                                    {hasActiveFilters()
                                        ? t('No task statuses match your search criteria. Try adjusting your filters.')
                                        : t('Create task statuses to start categorizing your tasks.')}
                                </p>
                                {!hasActiveFilters() && canCreate && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Use the form on the left to add your first task status.')}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('task status')}
            />
        </PageTemplate>
    );
}
