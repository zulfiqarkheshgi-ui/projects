import { useState, useRef, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, MessageSquare, CheckSquare, User, Calendar,
    Clock, FileText, Tag, Edit, Trash2, Send, Lock, Globe,
    AlertCircle, Hash, UserCheck, Briefcase,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { capitalize, getImagePath, hexToRgba } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CommentForm {
    comment_text: string;
    is_internal: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, { badge: string; border: string; label: string }> = {
    critical: { badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/20 dark:text-red-400', border: 'bg-red-500', label: 'Critical' },
    high: { badge: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-400', border: 'bg-orange-500', label: 'High' },
    medium: { badge: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/20 dark:text-yellow-400', border: 'bg-yellow-500', label: 'Medium' },
    low: { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400', border: 'bg-emerald-500', label: 'Low' },
};

export default function TaskShow() {
    const { t } = useTranslation();
    const { auth, task, comments } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const currentUser = auth?.user;

    // ─── Permissions ──────────────────────────────────────────────────────────
    const canViewComments = hasPermission(permissions, 'view-task-comments');
    const canCreateComment = hasPermission(permissions, 'create-task-comments');
    const canEditComment = hasPermission(permissions, 'edit-task-comments');
    const canDeleteComment = hasPermission(permissions, 'delete-task-comments');
    const canViewCases = hasPermission(permissions, 'view-cases');

    // ─── Comment compose state ────────────────────────────────────────────────
    const [composeText, setComposeText] = useState('');
    const [composeInternal, setComposeInternal] = useState(false);
    const [composeErrors, setComposeErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const composeRef = useRef<HTMLTextAreaElement>(null);

    // ─── Inline edit state ────────────────────────────────────────────────────
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [editInternal, setEditInternal] = useState(false);
    const [editErrors, setEditErrors] = useState<any>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const editRef = useRef<HTMLTextAreaElement>(null);

    // ─── Delete state ─────────────────────────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // ─── Auto-grow textarea helper ────────────────────────────────────────────
    const autoGrow = useCallback((el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, []);

    // ─── Compose handlers ─────────────────────────────────────────────────────
    const handleComposeSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!composeText.trim()) return;
        setComposeErrors({});
        setIsSubmitting(true);

        router.post(route('tasks.task-comments.store'), {
            task_id: task.id,
            comment_text: composeText.trim(),
            is_internal: composeInternal,
        }, {
            onSuccess: (page) => {
                const flash = (page.props as any).flash;
                if (flash?.success) toast.success(flash.success);
                setComposeText('');
                setComposeInternal(false);
                setComposeErrors({});
                if (composeRef.current) composeRef.current.style.height = 'auto';
            },
            onError: (errors) => {
                setComposeErrors(errors);
                toast.error(t('Failed to add comment.'));
            },
            onFinish: () => setIsSubmitting(false),
        });
    };



    // ─── Inline edit handlers ─────────────────────────────────────────────────
    const startEdit = (comment: any) => {
        setEditingId(comment.id);
        setEditText(comment.comment_text || '');
        setEditInternal(!!comment.is_internal);
        setEditErrors({});
        setTimeout(() => {
            autoGrow(editRef.current);
            editRef.current?.focus();
        }, 50);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText('');
        setEditErrors({});
        setIsSavingEdit(false);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    };

    const saveEdit = () => {
        if (!editText.trim()) return;
        setEditErrors({});
        setIsSavingEdit(true);

        router.put(route('tasks.task-comments.update', editingId), {
            task_id: task.id,
            comment_text: editText.trim(),
            is_internal: editInternal,
        }, {
            onSuccess: (page) => {
                const flash = (page.props as any).flash;
                if (flash?.success) toast.success(flash.success);
                cancelEdit();
            },
            onError: (errors) => {
                setEditErrors(errors);
                toast.error(t('Failed to update comment.'));
            },
            onFinish: () => setIsSavingEdit(false),
        });
        setIsSavingEdit(false);
    };

    // ─── Delete handlers ──────────────────────────────────────────────────────
    const openDelete = (comment: any) => {
        setDeleteTarget(comment);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        router.delete(route('tasks.task-comments.destroy', deleteTarget.id), {
            onSuccess: (page) => {
                const flash = (page.props as any).flash;
                if (flash?.success) toast.success(flash.success);
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
                // If we were editing this comment, cancel edit
                if (editingId === deleteTarget?.id) cancelEdit();
            },
            onError: () => {
                toast.error(t('Failed to delete comment.'));
                setIsDeleteModalOpen(false);
            },
        });
    };

    // ─── Breadcrumbs & page actions ───────────────────────────────────────────
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Task & Workflow'), href: route('tasks.index') },
        { title: t('Tasks'), href: route('tasks.index') },
        { title: t('Task Details') },
    ];

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-1" />,
            variant: 'outline' as const,
            onClick: () => window.history.back(),
        },
    ];

    // ─── Derived values ───────────────────────────────────────────────────────
    const priority = task?.priority || 'medium';
    const priorityStyle = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
    const commentList = Array.isArray(comments) ? comments : [];

    return (
        <PageTemplate
            title={task?.title || t('Task Details')}
            description={t("View task details, activity, and comments.")}
            url={`/tasks/${task?.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-5">

                {/* ── Header Banner — title + badges only ── */}
                <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className={`h-1 w-full ${priorityStyle.border}`} />
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mb-1.5 mr-2">
                                <Hash className="h-3 w-3" />{task?.task_id}
                            </span>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{task?.title}</h1>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${priorityStyle.badge}`}>
                                {t(capitalize(priority))}
                            </span>
                            {task?.task_status && (
                                <span
                                    className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold"
                                    style={{
                                        backgroundColor: `${task.task_status.color}18`,
                                        color: task.task_status.color,
                                        boxShadow: `inset 0 0 0 1px ${hexToRgba(task.task_status.color, 0.25)}`,
                                    }}
                                >
                                    {capitalize(task.task_status.name || '-')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 6-6 Grid: Description+Notes | Details ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Left col — Description + Notes */}
                    <Card className="flex flex-col flex-between gap-3 h-[395px] border-none shadow-none">
                        <Card className="shadow-sm flex flex-col h-[192px]">
                            <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 shrink-0 rounded-t-lg">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {t('Description')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 py-4 flex-1 overflow-y-auto space-y-4">

                                <div>
                                    {task?.description
                                        ? <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{task.description}</p>
                                        : <p className="text-sm text-muted-foreground italic">{t('No description added.')}</p>
                                    }
                                </div>

                            </CardContent>
                        </Card>


                        <Card className="shadow-sm flex flex-col h-[192px]">
                            <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 shrink-0 rounded-t-lg">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {t('Notes')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 py-4 flex-1 overflow-y-auto space-y-4">

                                <div>
                                    {task?.notes
                                        ? <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{task.notes}</p>
                                        : <p className="text-sm text-muted-foreground italic">{t('No notes added.')}</p>
                                    }
                                </div>

                            </CardContent>
                        </Card>
                    </Card>

                    {/* Right col — Details */}
                    <Card className="shadow-sm flex flex-col h-[395px]">
                        <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 shrink-0 rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                {t('Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 py-4 flex-1 overflow-y-auto space-y-3">

                            {/* Task Type */}
                            {task?.task_type?.name && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5">{t('Type')}</span>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right">{task.task_type.name}</span>
                                </div>
                            )}

                            {/* Due Date */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5 flex items-center gap-1">
                                    {t('Due Date')}
                                </span>
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right">
                                    {task?.due_date ? (window.appSettings?.formatDateTime(task.due_date, false) || new Date(task.due_date).toLocaleDateString()) : '—'}
                                </span>
                            </div>

                            {/* Duration */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5 flex items-center gap-1">
                                    {t('Duration')}
                                </span>
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                    {task?.estimated_duration ? `${task.estimated_duration} ${t('min')}` : '—'}
                                </span>
                            </div>

                            {/* Created At */}
                            {task?.created_at && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5">{t('Created')}</span>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right">
                                        {window.appSettings?.formatDateTime(task.created_at, false) || new Date(task.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )}

                            <div className="border-t dark:border-gray-700" />

                            {/* Assigned To */}
                            <div className="grid grid-cols-2 gap-3 align-items-center">
                                <div className="flex items-start flex-col gap-2">
                                    <span className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5">{t('Assigned To')}</span>
                                    {task?.assigned_user ? (
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={task.assigned_user.avatar} onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }} />
                                                <AvatarFallback className="text-[10px]">{task.assigned_user.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className='flex flex-col'>
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{task.assigned_user.name}</span>
                                                <span className="text-xs font-muted text-gray-800 dark:text-gray-200">{task.assigned_user.email}</span>
                                            </div>
                                        </div>
                                    ) : <span className="text-sm text-gray-500">—</span>}
                                </div>
                                {/* Created By */}
                                {task?.creator?.name && (
                                    <div className="flex items-end flex-col gap-2">
                                        <span className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5">{t('Created By')}</span>
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={task.creator.avatar} onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }} />
                                                <AvatarFallback className="text-[10px]">{task.creator.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className='flex flex-col'>
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{task.creator.name}</span>
                                                <span className="text-xs font-muted text-gray-800 dark:text-gray-200">{task.creator.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Linked Case */}
                            {task?.case && (
                                <>
                                    <div className="border-t dark:border-gray-700" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5 flex items-center gap-1 mb-1.5">
                                            <Briefcase className="h-3 w-3" />{t('Linked Case')}
                                        </p>
                                        {canViewCases ? (
                                            <button
                                                type="button"
                                                onClick={() => router.get(route('cases.show', task.case.id))}
                                                className="w-full text-left rounded-lg bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 px-3 py-2 hover:bg-primary/5 hover:border-primary/40 dark:hover:bg-primary/10 transition-colors group cursor-pointer"
                                            >
                                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors">{task.case.case_id}</p>
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary/80 transition-colors">{task.case.title}</p>
                                            </button>
                                        ) : (
                                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 px-3 py-2">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{task.case.case_id}</p>
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{task.case.title}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                        </CardContent>
                    </Card>

                </div>{/* end 6-6 grid */}

                {/* ── Comments — full width below grid ── */}
                {canViewComments && (
                    <Card className="shadow-sm">
                        <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                {t('Comments')}
                                {commentList.length > 0 && (
                                    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold w-5 h-5">
                                        {commentList.length}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>

                        {/* Thread body */}
                        <CardContent className="px-5 py-4 max-h-[390px] overflow-y-auto">
                            {commentList.length > 0 ? (
                                <div className="space-y-0">
                                    {commentList.map((comment: any, index: number) => {
                                        const isEditing = editingId === comment.id;
                                        const isLast = index === commentList.length - 1;
                                        return (
                                            <div key={comment.id} className="relative flex gap-3 group">
                                                {/* Avatar + thread line */}
                                                <div className="flex flex-col items-center shrink-0">
                                                    <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-900 shadow-sm z-10">
                                                        <AvatarImage src={comment.creator?.avatar} onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }} />
                                                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                                            {comment.creator?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-primary to-transparent mt-1 mb-1" />}
                                                </div>

                                                {/* Content */}
                                                <div className={`flex-1 min-w-0 pb-4 ${isEditing ? 'rounded-lg border-2 border-primary/40 bg-primary/5 dark:bg-primary/10 px-3 pt-2 pb-3' : ''}`}>
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{comment.creator?.name}</span>
                                                            {comment.is_internal ? (
                                                                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400">
                                                                    <Lock className="h-2.5 w-2.5" />{t('Internal')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400">
                                                                    <Globe className="h-2.5 w-2.5" />{t('External')}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {window.appSettings?.formatDateTime(comment.created_at, false) || '-'}
                                                            </span>
                                                        </div>
                                                        {!isEditing && (
                                                            <div className="flex gap-0.5 transition-opacity shrink-0">
                                                                {canEditComment && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" onClick={() => startEdit(comment)} className="h-7 w-7 text-gray-500">
                                                                                <Edit className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{t('Edit')}</TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                {canDeleteComment && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" onClick={() => openDelete(comment)} className="h-7 w-7 text-gray-500">
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{t('Delete')}</TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isEditing ? (
                                                        <div className="space-y-2 mt-1">
                                                            <textarea
                                                                ref={editRef}
                                                                value={editText}
                                                                onChange={(e) => { setEditText(e.target.value); autoGrow(e.target); }}
                                                                onKeyDown={handleEditKeyDown}
                                                                rows={2}
                                                                className="w-full resize-none rounded-lg border border-primary/40 bg-white dark:bg-gray-900 dark:border-primary/30 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] max-h-48 overflow-y-auto"
                                                            />
                                                            {editErrors.comment_text && (
                                                                <p className="flex items-center gap-1 text-xs text-red-500">
                                                                    <AlertCircle className="h-3 w-3" />{editErrors.comment_text}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditInternal(!editInternal)}
                                                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${editInternal ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400'}`}
                                                                >
                                                                    {editInternal ? <><Lock className="h-3 w-3" />{t('Internal')}</> : <><Globe className="h-3 w-3" />{t('External')}</>}
                                                                </button>
                                                                <div className="flex gap-2">
                                                                    <Button type="button" variant="outline" size="sm" onClick={cancelEdit} className="h-7 px-3 text-xs">{t('Cancel')}</Button>
                                                                    <Button type="button" size="sm" onClick={saveEdit} disabled={!editText.trim() || isSavingEdit} className="h-7 px-3 text-xs">
                                                                        {isSavingEdit ? t('Saving...') : t('Save')}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{comment.comment_text}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-2">
                                        <MessageSquare className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t('No comments yet')}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {canCreateComment ? t('Be the first to leave a comment below.') : t('No comments have been added to this task.')}
                                    </p>
                                </div>
                            )}
                        </CardContent>

                        {/* Compose box */}
                        {canCreateComment && (
                            <div className="border-t dark:border-gray-700 px-5 py-4">
                                <form onSubmit={handleComposeSubmit}>
                                    <div className="flex gap-3">
                                        <Avatar className="h-8 w-8 shrink-0 border-2 border-white dark:border-gray-900 shadow-sm mt-0.5">
                                            <AvatarImage src={currentUser?.avatar} onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }} />
                                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className={`rounded-xl border ${composeErrors.comment_text ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all`}>
                                                <textarea
                                                    ref={composeRef}
                                                    value={composeText}
                                                    onChange={(e) => { setComposeText(e.target.value); autoGrow(e.target); }}
                                                    placeholder={t('Write a comment...')}
                                                    rows={1}
                                                    className="w-full resize-none bg-transparent px-3.5 pt-3 pb-2 text-sm text-gray-900 dark:text-white placeholder:text-muted-foreground focus:outline-none min-h-[40px] max-h-48 overflow-y-auto"
                                                />
                                                <div className="flex items-center justify-between px-3 pb-2.5 pt-1 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setComposeInternal(!composeInternal)}
                                                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${composeInternal ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400'}`}
                                                    >
                                                        {composeInternal ? <><Lock className="h-3 w-3" />{t('Internal')}</> : <><Globe className="h-3 w-3" />{t('External')}</>}
                                                    </button>
                                                    <Button type="submit" size="sm" disabled={!composeText.trim() || isSubmitting} className="h-7 px-3 gap-1.5 text-xs">
                                                        <Send className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {composeErrors.comment_text && (
                                                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                                                    <AlertCircle className="h-3 w-3" />{composeErrors.comment_text}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </Card>
                )}

            </div>

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }}
                onConfirm={handleDeleteConfirm}
                itemName={deleteTarget?.comment_text?.substring(0, 60) || ''}
                entityName={t('comment')}
            />
        </PageTemplate>
    );
}
