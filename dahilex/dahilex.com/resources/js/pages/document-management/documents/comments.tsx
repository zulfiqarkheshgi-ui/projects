import { useState, useRef, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, FileText, MessageSquare, Tag, Eye, Edit, Trash2, Send, Lock, AlertCircle, CheckCircle, Circle, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { getImagePath, hexToRgba } from '@/utils/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────
const CONFIDENTIALITY_STYLES: Record<string, { badge: string; border: string }> = {
    public: { badge: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400', border: 'bg-blue-500' },
    internal: { badge: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300', border: 'bg-gray-500' },
    confidential: { badge: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-400', border: 'bg-orange-500' },
    restricted: { badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/20 dark:text-red-400', border: 'bg-red-500' },
};

const STATUS_STYLES: Record<string, { badge: string}> = {
    draft: { badge: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300'},
    review: { badge: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/20 dark:text-yellow-400'},
    final: { badge: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400'},
    archived: { badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/20 dark:text-red-400'},
};

const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export default function DocumentComments() {
    const { t } = useTranslation();
    const { auth, document: documentData, latestVersion, comments } = usePage().props as any;
    const userPermissions = auth?.permissions || [];
    const currentUser = auth?.user;

    // ─── Permissions ──────────────────────────────────────────────────────────
    const canDownload = hasPermission(userPermissions, 'download-documents');
    const canViewComments = hasPermission(userPermissions, 'view-document-comments');
    const canCreateComment = hasPermission(userPermissions, 'create-document-comments');
    const canEditComment = hasPermission(userPermissions, 'edit-document-comments');
    const canDeleteComment = hasPermission(userPermissions, 'delete-document-comments');
    const canResolveComment = hasPermission(userPermissions, 'resolve-document-comments');
    const canViewCases = hasPermission(userPermissions, 'view-cases');

    // ─── Comment compose state ────────────────────────────────────────────────
    const [composeText, setComposeText] = useState('');
    const [composeErrors, setComposeErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const composeRef = useRef<HTMLTextAreaElement>(null);

    // ─── Inline edit state ────────────────────────────────────────────────────
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
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

        router.post(route('document-management.comments.store'), {
            document_id: documentData.id,
            comment_text: composeText.trim(),
        }, {
            onSuccess: (page) => {
                const flash = (page.props as any).flash;
                if (flash?.success) toast.success(flash.success);
                setComposeText('');
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
        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    };

    const saveEdit = () => {
        if (!editText.trim()) return;
        setEditErrors({});
        setIsSavingEdit(true);

        router.put(route('document-management.comments.update', editingId), {
            document_id: documentData.id,
            comment_text: editText.trim(),
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

    // ─── Toggle resolve handler ───────────────────────────────────────────────
    const handleToggleResolve = (comment: any) => {
        router.put(route('document-management.comments.toggle-resolve', comment.id), {}, {
            onSuccess: () => toast.success(t('Comment status updated')),
            onError: () => toast.error(t('Failed to update comment status')),
        });
    };

    // ─── Delete handlers ──────────────────────────────────────────────────────
    const openDelete = (comment: any) => {
        setDeleteTarget(comment);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        router.delete(route('document-management.comments.destroy', deleteTarget.id), {
            onSuccess: (page) => {
                const flash = (page.props as any).flash;
                if (flash?.success) toast.success(flash.success);
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
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
        { title: t('Document Management')},
        { title: t('Documents'), href: route('document-management.documents.index') },
        { title: documentData?.name || t('Versions'), href: route('document-management.documents.show', documentData?.id) },
        { title: t('Document Details') },
    ];

    const pageActions: any[] = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-1" />,
            variant: 'outline' as const,
            onClick: () => window.history.back(),
        },
    ];

    // ─── Derived values ───────────────────────────────────────────────────────
    const confidentiality = documentData?.confidentiality || 'internal';
    const status = documentData?.status || 'draft';
    const confidentialityStyle = CONFIDENTIALITY_STYLES[confidentiality] || CONFIDENTIALITY_STYLES.internal;
    const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.draft;
    const commentList = Array.isArray(comments) ? comments : [];
    const filePath = latestVersion?.file_path || documentData?.file_path;

    // CHUNK 2+ renders below
    return (
        <PageTemplate
            title={documentData?.name || t('Document Details')}
            description={t('View comments of the document.')}
            url={`/document-management/documents/${documentData?.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-5">
                {/* ── Comments — full width below grid ── */}
                {canViewComments && (
                    <Card className="shadow-sm flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
                        <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 rounded-t-lg shrink-0">
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
                        <CardContent className="px-5 py-4 overflow-y-auto flex-1">
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
                                                            {comment.is_resolved ? (
                                                                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400">
                                                                    <CheckCircle className="h-2.5 w-2.5" />{t('Resolved')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-400">
                                                                    <Circle className="h-2.5 w-2.5" />{t('Open')}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {window.appSettings?.formatDate(comment.created_at) || new Date(comment.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {!isEditing && (
                                                            <div className="flex gap-0.5 transition-opacity shrink-0">
                                                                {canResolveComment && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" onClick={() => handleToggleResolve(comment)} className='h-7 w-7 text-gray-500'>
                                                                                <Lock className='h-3.5 w-3.5'/>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{'Toggle Status'}</TooltipContent>
                                                                    </Tooltip>
                                                                )}
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
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button type="button" variant="outline" size="sm" onClick={cancelEdit} className="h-7 px-3 text-xs">{t('Cancel')}</Button>
                                                                <Button type="button" size="sm" onClick={saveEdit} disabled={!editText.trim() || isSavingEdit} className="h-7 px-3 text-xs">
                                                                    {isSavingEdit ? t('Saving...') : t('Save')}
                                                                </Button>
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
                                        {canCreateComment ? t('Be the first to leave a comment below.') : t('No comments have been added to this document.')}
                                    </p>
                                </div>
                            )}
                        </CardContent>

                        {/* Compose box */}
                        {canCreateComment && (
                            <div className="border-t dark:border-gray-700 px-5 py-4 shrink-0">
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
                                                <div className="flex items-center justify-end px-3 pb-2.5 pt-1">
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
