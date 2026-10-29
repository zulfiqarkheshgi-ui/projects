import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Download, RotateCcw, FileText,
    CheckCircle, User, Calendar, Hash, FolderOpen, Eye,
    SquareArrowOutUpRight, File, FileImage, FileVideo, FileAudio,
    FileSpreadsheet, FileCode, FileArchive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { formatStatusText, getImagePath, hexToRgba } from '@/utils/helpers';

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

function isImageFile(path: string) {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
        path?.split('.').pop()?.toLowerCase() ?? ''
    );
}

function getFileIcon(path: string, cls = 'h-12 w-12') {
    const ext = path?.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage className={`${cls} text-purple-500`} />;
    if (ext === 'pdf') return <FileText className={`${cls} text-red-500`} />;
    if (['doc', 'docx'].includes(ext)) return <FileText className={`${cls} text-blue-500`} />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className={`${cls} text-green-500`} />;
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return <FileVideo className={`${cls} text-pink-500`} />;
    if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return <FileAudio className={`${cls} text-yellow-500`} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive className={`${cls} text-orange-500`} />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'php', 'py'].includes(ext)) return <FileCode className={`${cls} text-cyan-500`} />;
    return <File className={`${cls} text-gray-400`} />;
}

export default function VersionShow() {
    const { t } = useTranslation();
    const { auth, version } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const doc = version?.document;

    const confBorder = CONFIDENTIALITY_BORDER[doc?.confidentiality] ?? CONFIDENTIALITY_BORDER.internal;
    const statusCls = STATUS_STYLES[doc?.status] ?? STATUS_STYLES.draft;
    const confstatusCls = CONFIDENTIALITY_STYLES[doc?.confidentiality] ?? CONFIDENTIALITY_STYLES.public;

    const fileSrc = getImagePath(version?.file_path || '');

    const handleDownload = () => {
        const link = window.document.createElement('a');
        link.href = route('document-management.versions.download', version.id);
        link.download = doc?.name || 'document';
        link.click();
    };

    const handleRestore = () => {
        router.put(route('document-management.versions.restore', version.id), {}, {
            onSuccess: (page) => {
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: () => toast.error(t('Failed to restore version')),
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Document Management') },
        { title: t('Documents'), href: route('document-management.documents.index') },
        { title: doc?.name || t('Versions'), href: route('document-management.documents.show', doc?.id) },
        { title: `v${version?.version_number}` },
    ];

    const pageActions: any[] = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-1" />,
            variant: 'outline' as const,
            onClick: () => window.history.back(),
        },
    ];

    return (
        <PageTemplate
            title={`${doc?.name || t('Version')} - v${version?.version_number}`}
            description={t('Preview the file and review details for this document version.')}
            url={`/document-management/documents/version/${version?.id}`}

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
                                {version?.creator && (
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={version.creator.avatar} onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }} />
                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{version.creator.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">{doc?.name}</h1>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {version?.creator?.name || 'Unknown'} | v{version?.version_number}
                                </p>
                            </div>
                        </div>
                        <div>
                            {version?.is_current && (
                                <span className="ml-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset gap-1 bg-primary/5 text-primary ring-primary/20">
                                    <CheckCircle className="h-3 w-3" />{t('Current')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 2-col: file preview left, details right ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] pr-5 gap-5 items-start">

                    {/* Left — File Preview */}
                    <Card className="overflow-hidden" style={{ height: 'calc(100vh - 350px)' }}>
                        {version?.file_path ? (
                            isImageFile(version.file_path) ? (
                                <CardContent className='w-full h-full flex items-center justify-center p-4'>
                                    <img
                                        src={fileSrc}
                                        alt={doc?.name}
                                        className="max-w-full max-h-full object-contain rounded-lg shadow"
                                    />
                                </CardContent>
                            ) : (
                                <CardContent className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900">
                                    <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                                        {getFileIcon(version.file_path || '')}
                                    </div>
                                    <p className="text-sm text-gray-500">{t('Preview not available for this file type')}</p>
                                </CardContent>
                            )
                        ) : (
                            <CardContent className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                                <p className="text-sm text-gray-400">{t('No file available')}</p>
                            </CardContent>
                        )}
                    </Card>

                    {/* Right — Version Details */}
                    <div className="lg:sticky lg:top-6">
                        <Card className="shadow-sm flex flex-col">
                            <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 shrink-0 rounded-t-lg">
                                <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        {t('Version Details')}
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        {hasPermission(permissions, 'view-document-versions') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(fileSrc, '_blank')}>
                                                        <SquareArrowOutUpRight className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Open')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'download-document-versions') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
                                                        <Download className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Download')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                        {!version?.is_current && hasPermission(permissions, 'restore-document-versions') && (
                                            <TooltipProvider><Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRestore}>
                                                        <RotateCcw className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Restore')}</TooltipContent>
                                            </Tooltip></TooltipProvider>
                                        )}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 py-4 flex-1 overflow-y-auto space-y-3">

                                {/* Version number */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">{t('Version')}</span>
                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-primary/5 text-primary ring-primary/20">
                                        {version?.is_current && <CheckCircle className="h-3 w-3 ml-0.5" />}
                                        v{version?.version_number}
                                    </span>
                                </div>

                                {/* Category */}
                                {doc?.category?.name && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">{t('Category')}</span>
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
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">{t('Status')}</span>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusCls}`}>
                                            {formatStatusText(doc?.status)}
                                        </span>
                                    </div>
                                )}

                                {/* Confidentiality */}
                                {doc?.confidentiality && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">{t('Confidentiality')}</span>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${confstatusCls}`}>
                                            {formatStatusText(doc?.confidentiality)}
                                        </span>
                                    </div>
                                )}

                                {/* Created at */}
                                {version?.created_at && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">{t('Created')}</span>
                                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            {window.appSettings?.formatDate?.(version.created_at) ?? new Date(version.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}

                                {/* Changes description */}
                                {version?.changes_description && (
                                    <>
                                        <div className="border-t dark:border-gray-700" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide mb-1.5">{t('Changes Description')}</p>
                                            <p className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">{version.changes_description}</p>
                                        </div>
                                    </>
                                )}

                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageTemplate>
    );
}
