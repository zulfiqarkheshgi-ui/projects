import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Download, Plus, FileText, History,
    CheckCircle, RotateCcw, Trash2, Eye, FolderOpen, Edit,
    MessageSquare, File, FileImage, FileVideo, FileAudio,
    FileSpreadsheet, FileCode, FileArchive,
    RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { formatStatusText, getImagePath, hexToRgba } from '@/utils/helpers';
import { useInitials } from '@/hooks/use-initials';

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
    review: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20',
    final: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    archived: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
};

const CONFIDENTIALITY_BORDER: Record<string, string> = {
    public: 'bg-blue-500',
    internal: 'bg-gray-400',
    confidential: 'bg-orange-500',
    restricted: 'bg-red-500',
};

const CONFIDENTIALITY_STYLES: Record<string, string> = {
    public: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    internal: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
    confidential: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
    restricted: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
};


function getFileExt(path: string) {
    return path?.split('.').pop()?.toUpperCase() ?? '';
}

function isImageFile(path: string) {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
        path?.split('.').pop()?.toLowerCase() ?? ''
    );
}

function getFileIcon(path: string, cls = 'h-14 w-14') {
    const ext = path?.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
        return <FileImage className={`${cls} text-primary`} />;
    if (ext === 'pdf')
        return <FileText className={`${cls} text-red-500`} />;
    if (['doc', 'docx'].includes(ext))
        return <FileText className={`${cls} text-blue-500`} />;
    if (['xls', 'xlsx', 'csv'].includes(ext))
        return <FileSpreadsheet className={`${cls} text-green-500`} />;
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext))
        return <FileVideo className={`${cls} text-pink-500`} />;
    if (['mp3', 'wav', 'ogg', 'aac'].includes(ext))
        return <FileAudio className={`${cls} text-yellow-500`} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
        return <FileArchive className={`${cls} text-orange-500`} />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'php', 'py'].includes(ext))
        return <FileCode className={`${cls} text-cyan-500`} />;
    return <File className={`${cls} text-gray-400`} />;
}

export default function DocumentVersions() {
    const { t } = useTranslation();
    const { auth, document: doc, versions, currentVersion, categories } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDocDeleteOpen, setIsDocDeleteOpen] = useState(false);
    const [isDocStatusOpen, setIsDocStatusOpen] = useState(false);
    const [isDocEditOpen, setIsDocEditOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [previewSrc, setPreviewSrc] = useState<string>(
        getImagePath(currentVersion?.file_path || doc?.file_path || '')
    );
    const [previewVersion, setPreviewVersion] = useState<string>(
        getImagePath(currentVersion?.version_number || 'v1.0')
    );

    const handleDownload = (url: any) => {
        const link = window.document.createElement('a');
        link.href = url;
        link.download = doc?.name || 'document';
        link.click();
    };

    function downloadFile() {
        const a = document.createElement('a');
        a.href = previewSrc;
        a.download = `${doc.name} (${previewVersion})`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    const handleRestore = (version: any) => {
        router.put(route('document-management.versions.restore', version.id), {}, {
            onSuccess: (page) => {
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: () => toast.error(t('Failed to restore version')),
        });
    };

    const handleDelete = () => {
        router.delete(route('document-management.versions.destroy', deleteTarget.id), {
            onSuccess: (page) => {
                setIsDeleteOpen(false);
                setDeleteTarget(null);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: () => toast.error(t('Failed to delete version')),
        });
    };

    const handleAddVersion = (formData: any) => {
        router.post(route('document-management.versions.store'), { ...formData, document_id: doc.id }, {
            onSuccess: (page) => {
                setIsAddOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handleDocDelete = () => {
        router.delete(route('document-management.documents.destroy', doc.id), {
            onSuccess: (page) => {
                setIsDocDeleteOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                router.get(route('document-management.documents.index'));
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handleDocStatusChange = (formData: any) => {
        router.put(route('document-management.documents.toggle-status', doc.id), formData, {
            onSuccess: (page) => {
                setIsDocStatusOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handleDocEdit = (formData: any) => {
        if (formData.tags && typeof formData.tags === 'string') {
            formData.tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
        router.put(route('document-management.documents.update', doc.id), formData, {
            onSuccess: (page) => {
                setIsDocEditOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const pageActions: any[] = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-1" />,
            variant: 'outline' as const,
            onClick: () => router.get(route('document-management.documents.index')),
        },
    ];

    if (hasPermission(permissions, 'create-document-versions')) {
        pageActions.unshift({
            label: t('Add Version'),
            icon: <Plus className="h-4 w-4 mr-1" />,
            variant: 'default' as const,
            onClick: () => setIsAddOpen(true),
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Document Management') },
        { title: t('Documents'), href: route('document-management.documents.index') },
        { title: doc?.name || t('Versions') },
    ];

    const confBorder = CONFIDENTIALITY_BORDER[doc?.confidentiality] ?? CONFIDENTIALITY_BORDER.internal;
    const statusCls = STATUS_STYLES[doc?.status] ?? STATUS_STYLES.draft;
    const confstatusCls = CONFIDENTIALITY_STYLES[doc?.confidentiality] ?? CONFIDENTIALITY_STYLES.public;

    return (
        <PageTemplate
            title={doc?.name || t('Version History')}
            description={t('View all versions of this document and manage version history.')}
            url={`/document-management/versions/document/${doc?.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-5">

                {/* ── Header banner ── */}
                <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className={`h-1 w-full ${confBorder}`} />
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg shrink-0">
                                {doc?.creator && (
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={doc.creator.avatar} onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }} />
                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{doc.creator.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">{doc?.name}</h1>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {doc?.creator?.name || 'Unknown'} | {versions?.length ?? 0} {t('versions')}
                                </p>
                            </div>
                        </div>
                        {/* <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusCls}`}>
                                {formatStatusText(doc?.status)}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${confstatusCls}`}>
                                {formatStatusText(doc?.confidentiality)}
                            </span>
                            {doc?.category?.name && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset gap-1"
                                    style={{
                                        backgroundColor: `${doc?.category?.color}20`,
                                        color: doc?.category?.color,
                                        boxShadow: `inset 0 0 0 1px ${hexToRgba(doc?.category?.color, 0.2)}`,
                                    }}
                                >
                                    <FolderOpen className="h-3 w-3" />{doc.category.name}
                                </span>
                            )}
                            {currentVersion && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset gap-1 bg-primary/5 text-primary ring-primary/20">
                                    <CheckCircle className="h-3 w-3" />v{currentVersion.version_number}
                                </span>
                            )}
                        </div> */}
                    </div>
                </div>

                {/* ── 2-col: preview left, timeline right ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] pr-5 gap-5 items-start">
                    {/* Right — Version timeline */}
                    {(!versions || versions.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                <History className="h-5 w-5 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">{t('No versions yet')}</p>
                        </div>
                    ) : (
                        <Card className="overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-300" style={{ height: 'calc(100vh - 400px)' }}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
                                {versions.map((v: any) => {
                                    const isCurrent = v.is_current;

                                    return (
                                        <div
                                            key={v.id}
                                            className={`group flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 ${isCurrent
                                                ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10'
                                                }`}
                                        >
                                            {/* File icon by extension */}
                                            <div className="cursor-pointer w-full text-center" onClick={() => hasPermission(permissions, 'view-document-versions') && router.get(route('document-management.documents.version', v.id))}>
                                                <div className="relative flex w-full justify-center">
                                                    {getFileIcon(v.file_path || '', `h-14 w-14 ${isCurrent ? 'opacity-100' : 'opacity-80'}`)}
                                                    {isCurrent && (
                                                        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5 shadow">
                                                            <CheckCircle className="h-2.5 w-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Label + date */}
                                                <p className={`text-[11px] font-semibold leading-tight ${isCurrent ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
                                                    }`}>
                                                    v{v.version_number}
                                                </p>
                                                {v.created_at && (
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                                                        {window.appSettings?.formatDate?.(v.created_at) ?? new Date(v.created_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action buttons — always visible */}
                                            <div className="flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-700 pt-1.5 w-full mt-auto">
                                                {hasPermission(permissions, 'download-document-versions') && (
                                                    <TooltipProvider><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => handleDownload(v.file_path)}>
                                                                <Download className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('Download')}</TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                )}
                                                {!isCurrent && hasPermission(permissions, 'restore-document-versions') && (
                                                    <TooltipProvider><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => handleRestore(v)}>
                                                                <RotateCcw className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('Restore')}</TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                )}
                                                {!isCurrent && hasPermission(permissions, 'delete-document-versions') && (
                                                    <TooltipProvider><Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setDeleteTarget(v); setIsDeleteOpen(true); }}>
                                                                <Trash2 className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('Delete')}</TooltipContent>
                                                    </Tooltip></TooltipProvider>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Right — Document Details */}
                    <div className="lg:sticky lg:top-6">
                        <Card className="shadow-sm flex flex-col">
                            <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 shrink-0 rounded-t-lg">
                                <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        {t('Document Details')}
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-0.5">
                                        {hasPermission(permissions, 'view-documents') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.file_path)}>
                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('View')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'edit-documents') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsDocEditOpen(true)}>
                                                        <Edit className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Edit')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'manage-document-comments') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.get(route('document-management.documents.comments', doc.id))}>
                                                        <MessageSquare className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Comments')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'download-documents') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc.file_path)}>
                                                        <Download className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Download')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'toggle-status-documents') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsDocStatusOpen(true)}>
                                                        <RefreshCw className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Change Status')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'delete-documents') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsDocDeleteOpen(true)}>
                                                        <Trash2 className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Delete')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 py-4 flex-1 overflow-y-auto space-y-3">

                                {/* Category */}
                                {doc?.category?.name && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 tracking-wide">{t('Category')}</span>
                                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset gap-1"
                                            style={{
                                                backgroundColor: `${doc?.category?.color}20`,
                                                color: doc?.category?.color,
                                                boxShadow: `inset 0 0 0 1px ${hexToRgba(doc?.category?.color, 0.2)}`,
                                            }}
                                        >
                                            <FolderOpen className="h-3 w-3" />{doc.category.name}
                                        </span>
                                    </div>
                                )}

                                {/* Status */}
                                {doc?.status && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 tracking-wide">{t('Status')}</span>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusCls}`}>
                                            {formatStatusText(doc?.status)}
                                        </span>
                                    </div>
                                )}

                                {/* Confidentiality */}
                                {doc?.confidentiality && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 tracking-wide">{t('Confidentiality')}</span>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${confstatusCls}`}>
                                            {formatStatusText(doc?.confidentiality)}
                                        </span>
                                    </div>
                                )}

                                {doc?.tags?.length > 0 && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 tracking-wide">{t('Tags')}</span>
                                        <div className="flex flex-wrap gap-1 justify-end max-w-125">
                                            {doc.tags?.map((tag: string) => (
                                                <span key={tag} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 dark:bg-blue-700 text-blue-600 dark:text-blue-300">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Current Version */}
                                {currentVersion?.version_number && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 tracking-wide">{t('Current Version')}</span>
                                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset gap-1 bg-primary/5 text-primary ring-primary/20">
                                            <CheckCircle className="h-3 w-3" />v{currentVersion.version_number}
                                        </span>
                                    </div>
                                )}

                                {/* Created */}
                                {doc?.created_at && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 tracking-wide">{t('Created')}</span>
                                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right">
                                            {window.appSettings?.formatDate?.(doc.created_at) ?? new Date(doc.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}

                                {/* Description */}
                                {doc?.description && (
                                    <>
                                        <div className="border-t dark:border-gray-700" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 tracking-wide mb-1.5">{t('Description')}</p>
                                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{doc.description}</p>
                                        </div>
                                    </>
                                )}

                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ── Add version modal ── */}
            <CrudFormModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSubmit={handleAddVersion}
                formConfig={{
                    fields: [
                        { name: 'file', label: t('New File'), type: 'media-picker', required: true },
                        { name: 'changes_description', label: t('Changes Description'), type: 'textarea', placeholder: 'eg. Updated clause 3 to reflect new regulatory requirements' },
                    ],
                    modalSize: 'lg',
                }}
                initialData={null}
                title={t('Add New Version')}
                mode="create"
            />

            {/* ── Edit version modal ── */}
            <CrudFormModal
                isOpen={isDocEditOpen}
                onClose={() => setIsDocEditOpen(false)}
                onSubmit={handleDocEdit}
                formConfig={{
                    fields: [
                        { name: 'name', label: t('Name'), type: 'text', required: true, placeholder: 'eg. Non-Disclosure Agreement' },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Standard NDA template for client engagements' },
                        {
                            name: 'category_id',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: (categories || []).map((cat: any) => ({ value: cat.id, label: cat.name })),
                            emptyNote: { link: route('document-management.categories.index'), linkText: t('Document Categories') }
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'draft', label: t('Draft') },
                                { value: 'review', label: t('Review') },
                                { value: 'final', label: t('Final') },
                                { value: 'archived', label: t('Archived') }
                            ],
                            defaultValue: 'draft'
                        },
                        {
                            name: 'confidentiality',
                            label: t('Confidentiality'),
                            type: 'select',
                            options: [
                                { value: 'public', label: t('Public') },
                                { value: 'internal', label: t('Internal') },
                                { value: 'confidential', label: t('Confidential') },
                                { value: 'restricted', label: t('Restricted') }
                            ],
                            defaultValue: 'internal'
                        },
                        { name: 'tags', label: t('Tags'), type: 'text', placeholder: 'Enter tags separated by commas' }
                    ],
                    modalSize: 'lg'
                }}
                initialData={doc ? {
                    ...doc,
                    tags: doc.tags ? doc.tags.join(', ') : '',
                    file: doc?.file_path ? `${doc.file_path}` : null
                } : null}
                title={t('Edit Document')}
                mode={'edit'}
            />

            {/* ── Delete version modal ── */}
            <CrudDeleteModal
                isOpen={isDeleteOpen}
                onClose={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}
                onConfirm={handleDelete}
                itemName={`Version ${deleteTarget?.version_number}` || ''}
                entityName="version"
            />

            {/* ── Document delete modal ── */}
            <CrudDeleteModal
                isOpen={isDocDeleteOpen}
                onClose={() => setIsDocDeleteOpen(false)}
                onConfirm={handleDocDelete}
                itemName={doc?.name || ''}
                entityName="document"
            />

            {/* ── Document change status modal ── */}
            <CrudFormModal
                isOpen={isDocStatusOpen}
                onClose={() => setIsDocStatusOpen(false)}
                onSubmit={handleDocStatusChange}
                formConfig={{
                    fields: [{
                        name: 'status', label: t('Status'), type: 'select', required: true,
                        options: [
                            { value: 'draft', label: t('Draft') },
                            { value: 'review', label: t('Review') },
                            { value: 'final', label: t('Final') },
                            { value: 'archived', label: t('Archived') },
                        ],
                    }],
                    modalSize: 'sm',
                }}
                initialData={doc ? { status: doc.status } : null}
                title={t('Change Document Status')}
                mode="edit"
            />
        </PageTemplate>
    );
}
