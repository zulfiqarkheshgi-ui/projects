import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Search, Trash2, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function TaskComments() {
    const { t } = useTranslation();
    const { auth, comments, tasks, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedTask, setSelectedTask] = useState(pageFilters.task_id || 'all');
    const [selectedInternal, setSelectedInternal] = useState(pageFilters.is_internal || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
    const [overflowingComments, setOverflowingComments] = useState<Set<number>>(new Set());
    const commentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const commentRefsMobile = useRef<Map<number, HTMLDivElement>>(new Map());

    const checkOverflow = useCallback(() => {
        const next = new Set<number>();
        commentRefs.current.forEach((el, id) => {
            if (el && el.scrollHeight > el.clientHeight) next.add(id);
        });
        commentRefsMobile.current.forEach((el, id) => { if (el && el.scrollHeight > el.clientHeight) next.add(id); });
        setOverflowingComments(next);
    }, []);

    useEffect(() => {
        checkOverflow();
        const observer = new ResizeObserver(checkOverflow);
        commentRefs.current.forEach((el) => { if (el) observer.observe(el); });
        commentRefsMobile.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, [checkOverflow, comments?.data]);

    const [formData, setFormData] = useState({
        task_id: '',
        comment_text: '',
        is_internal: 'false',
    });
    const [formErrors, setFormErrors] = useState<any>({});

    const resetForm = () => {
        setFormData({ task_id: '', comment_text: '', is_internal: 'false' });
        setFormErrors({});
        setFormMode('create');
        setCurrentItem(null);
    };

    const loadItemForEdit = (item: any) => {
        setFormData({
            task_id: item.task_id?.toString() || '',
            comment_text: item.comment_text || '',
            is_internal: item.is_internal ? 'true' : 'false',
        });
        setFormMode('edit');
        setCurrentItem(item);
        setFormErrors({});
    };

    const hasActiveFilters = () => searchTerm !== '' || selectedTask !== 'all' || selectedInternal !== 'all';

    const applyFilters = () => {
        router.get(route('tasks.task-comments.index'), {
            page: 1,
            search: searchTerm || undefined,
            task_id: selectedTask !== 'all' ? selectedTask : undefined,
            is_internal: selectedInternal !== 'all' ? selectedInternal : undefined,
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
        router.get(route('tasks.task-comments.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            task_id: selectedTask !== 'all' ? selectedTask : undefined,
            is_internal: selectedInternal !== 'all' ? selectedInternal : undefined,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedTask('all');
        setSelectedInternal('all');
        router.get(route('tasks.task-comments.index'), {}, { preserveState: true, preserveScroll: true });
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
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        const processedData = {
            ...formData,
            is_internal: formData.is_internal === 'true' || formData.is_internal === true,
        };

        if (formMode === 'create') {
            router.post(route('tasks.task-comments.store'), processedData, {
                onSuccess: (page) => {
                    if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); }
                    else if (page.props.flash.error) toast.error(page.props.flash.error);
                },
                onError: (errors) => { setFormErrors(errors); toast.error('Failed to create comment.'); },
            });
        } else {
            router.put(route('tasks.task-comments.update', currentItem.id), processedData, {
                onSuccess: (page) => {
                    if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); }
                    else if (page.props.flash.error) toast.error(page.props.flash.error);
                },
                onError: (errors) => { setFormErrors(errors); toast.error('Failed to update comment.'); },
            });
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('tasks.task-comments.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) { toast.success(page.props.flash.success); if (formMode === 'edit') resetForm(); }
                else if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => {
                setIsDeleteModalOpen(false);
                toast.error(`Failed to delete comment: ${Object.values(errors).join(', ')}`);
            },
        });
    };

    const toggleComment = (id: number) => {
        const next = new Set(expandedComments);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpandedComments(next);
    };

    const canCreate = hasPermission(permissions, 'create-task-comments');
    const canEdit = hasPermission(permissions, 'edit-task-comments');
    const canDelete = hasPermission(permissions, 'delete-task-comments');

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Task & Workflow'), href: route('tasks.index') },
        { title: t('Comments') },
    ];

    return (
        <PageTemplate title={t('Comments')} url="/tasks/task-comments" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Left — Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formMode === 'create' ? t('Add New Comment') : t('Edit Comment')}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {formMode === 'create'
                                    ? t('Fill in the details to create a new comment')
                                    : t('Update the comment details below')}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="task_id" required>{t('Task')}</Label>
                                <Select
                                    value={formData.task_id}
                                    onValueChange={(value) => setFormData({ ...formData, task_id: value })}
                                    disabled={!canCreate && !canEdit}
                                >
                                    <SelectTrigger className={formErrors.task_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Task')} />
                                    </SelectTrigger>
                                    <SelectContent
                                    searchable={true}>
                                        {(tasks || []).map((task: any) => (
                                            <SelectItem key={task.id} value={task.id.toString()}>
                                                {task.task_id} - {task.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.task_id && <p className="text-sm text-red-500">{formErrors.task_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="comment_text" required>{t('Comment')}</Label>
                                <Textarea
                                    id="comment_text"
                                    value={formData.comment_text}
                                    onChange={(e) => setFormData({ ...formData, comment_text: e.target.value })}
                                    placeholder={t('eg. Updated the document as requested')}
                                    rows={4}
                                    className={formErrors.comment_text ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                    required
                                />
                                {formErrors.comment_text && <p className="text-sm text-red-500">{formErrors.comment_text}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="is_internal" required>{t('Comment Type')}</Label>
                                <Select
                                    value={formData.is_internal}
                                    onValueChange={(value) => setFormData({ ...formData, is_internal: value })}
                                    disabled={!canCreate && !canEdit}
                                >
                                    <SelectTrigger className={formErrors.is_internal ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="false">{t('External')}</SelectItem>
                                        <SelectItem value="true">{t('Internal')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.is_internal && <p className="text-sm text-red-500">{formErrors.is_internal}</p>}
                            </div>

                            <div className="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                                {(canCreate || canEdit) && (
                                    <Button type="submit" className="flex-1">
                                        {formMode === 'create' ? t('Add Comment') : t('Update Comment')}
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
                                        placeholder={t('Search comments...')}
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
                                <Select value={selectedTask} onValueChange={setSelectedTask}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Tasks')} />
                                    </SelectTrigger>
                                    <SelectContent searchable={true}>
                                        <SelectItem value="all">{t('All Tasks')}</SelectItem>
                                        {(tasks || []).map((task: any) => (
                                            <SelectItem key={task.id} value={task.id.toString()}>
                                                {task.task_id} - {task.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedInternal} onValueChange={setSelectedInternal}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Types')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Types')}</SelectItem>
                                        <SelectItem value="true">{t('Internal')}</SelectItem>
                                        <SelectItem value="false">{t('External')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {(comments?.data || []).length > 0 ? (
                            <>
                                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Comments')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Manage task comments and notes.')}</p>
                                </div>

                                {/* Desktop Table */}
                                <div className="hidden overflow-x-auto lg:block">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr className='bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t'>
                                                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Task')}</th>
                                                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Comment')}</th>
                                                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Type')}</th>
                                                <th className="cursor-pointer select-none px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300" onClick={() => handleSort('created_at')}>
                                                    <div className="flex items-center gap-1">
                                                        {t('Author')}
                                                        {pageFilters.sort_field === 'created_at'
                                                            ? (pageFilters.sort_direction === 'asc' ? ' ↑' : ' ↓')
                                                            : <span className="opacity-40">↕</span>}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 px-[50px]">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                            {comments.data.map((item: any) => (
                                                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center">
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                                <MessageSquare className="h-5 w-5" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {item.task ? item.task.title : '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <div className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
                                                            <div
                                                                ref={(el) => { if (el) commentRefs.current.set(item.id, el); else commentRefs.current.delete(item.id); }}
                                                                className={expandedComments.has(item.id) ? '' : 'line-clamp-2'}
                                                            >{item.comment_text}</div>
                                                            {(overflowingComments.has(item.id) || expandedComments.has(item.id)) && (
                                                                <button onClick={() => toggleComment(item.id)} className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                                                    {expandedComments.has(item.id)
                                                                        ? <><ChevronUp className="mr-1 h-3 w-3" />{t('Show less')}</>
                                                                        : <><ChevronDown className="mr-1 h-3 w-3" />{t('Show more')}</>}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.is_internal ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' : 'bg-blue-50 text-blue-700 ring-blue-600/20'}`}>
                                                            {item.is_internal ? t('Internal') : t('External')}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <div className="text-sm text-gray-900 dark:text-white">{item.creator?.name || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip>}
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
                                    {comments.data.map((item: any) => (
                                        <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                            <div className="mb-3 flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                        <MessageSquare className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {item.task ? `${item.task.task_id} - ${item.task.title}` : '-'}
                                                        </h4>
                                                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                                <div
                                                                    ref={(el) => { if (el) commentRefsMobile.current.set(item.id, el); else commentRefsMobile.current.delete(item.id); }}
                                                                    className={expandedComments.has(item.id) ? '' : 'line-clamp-2'}
                                                                >{item.comment_text}</div>
                                                                {(overflowingComments.has(item.id) || expandedComments.has(item.id)) && (
                                                                    <button onClick={() => toggleComment(item.id)} className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                                                        {expandedComments.has(item.id)
                                                                            ? <><ChevronUp className="mr-1 h-3 w-3" />{t('Show less')}</>
                                                                            : <><ChevronDown className="mr-1 h-3 w-3" />{t('Show more')}</>}
                                                                    </button>
                                                                )}
                                                            </div>
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex justify-end gap-1">
                                                    {canEdit && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip>}
                                                    {canDelete && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip>}
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Type')}</p>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.is_internal ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' : 'bg-blue-50 text-blue-700 ring-blue-600/20'}`}>
                                                        {item.is_internal ? t('Internal') : t('External')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Author')}</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.creator?.name || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {comments?.total > (comments?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination
                                            from={comments?.from || 0}
                                            to={comments?.to || 0}
                                            total={comments?.total || 0}
                                            links={comments?.links}
                                            entityName={t('comments')}
                                            onPageChange={(url) => {
                                                router.get(url, {
                                                    search: searchTerm || undefined,
                                                    task_id: selectedTask !== 'all' ? selectedTask : undefined,
                                                    is_internal: selectedInternal !== 'all' ? selectedInternal : undefined,
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
                                    <MessageSquare className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No comments found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
                                    {hasActiveFilters()
                                        ? t('No comments match your search criteria. Try adjusting your filters.')
                                        : t('Add comments to tasks to keep track of updates and notes.')}
                                </p>
                                {!hasActiveFilters() && canCreate && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Use the form on the left to add your first comment.')}</p>
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
                itemName={currentItem?.comment_text?.substring(0, 50) + '...' || ''}
                entityName={t('comment')}
            />

        </PageTemplate>
    );
}
