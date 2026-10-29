import { PageTemplate } from '@/components/page-template';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft, FileText, User, Phone, Mail, MapPin,
    CreditCard, Calendar, Eye, Download, Hash, Tag,
} from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { getImagePath } from '@/utils/helpers';

export default function ClientShow() {
    const { t } = useTranslation();
    const { auth, client, documents } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const canManageDocs   = hasPermission(permissions, 'manage-client-documents');
    const canDownloadDocs = hasPermission(permissions, 'download-client-documents');

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Client Management'), href: route('clients.index') },
        { title: t('Clients'), href: route('clients.index') },
        { title: t('Client Details') },
    ];

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-1" />,
            variant: 'outline' as const,
            onClick: () => router.get(route('clients.index')),
        },
    ];

    const isActive = client?.status === 'active';

    return (
        <PageTemplate
            title={client?.name || t('Client')}
            description={t("View client details, contact information, and documents.")}
            url={`/clients/${client?.id}`}
            breadcrumbs={breadcrumbs}
            actions={pageActions}
        >
            <div className="space-y-5">

                {/* ── Header Banner ── */}
                <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className={`h-1 w-full ${isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mb-1.5 mr-2">
                                <Hash className="h-3 w-3" />{client?.client_id}
                            </span>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{client?.name}</h1>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {client?.client_type?.name && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-orange-50 text-orange-700 ring-orange-600/20">
                                    {client.client_type.name}
                                </span>
                            )}
                            {client?.tax_id && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20">
                                    {t('Tax ID')}: {client.tax_id}
                                </span>
                            )}
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20">
                                {t('Tax Rate')}: {client?.tax_rate ? `${client.tax_rate}%` : '0%'}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                isActive
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : 'bg-red-50 text-red-700 ring-red-600/20'
                            }`}>
                                {isActive ? t('Active') : t('Inactive')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Contact Information ── */}
                <Card className="flex flex-col">
                        <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 shrink-0 rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {t('Contact Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 py-4 flex-1 overflow-y-auto space-y-3">

                            {/* Email */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-2">
                                    <Mail className="h-4 w-4" />{t('Email')}
                                </span>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right truncate max-w-[60%]">
                                    {client?.email || '—'}
                                </span>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-2">
                                    <Phone className="h-4 w-4" />{t('Phone')}
                                </span>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right">
                                    {client?.phone || '—'}
                                </span>
                            </div>

                            {/* Date of Birth */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />{t('Date of Birth')}
                                </span>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right">
                                    {client?.date_of_birth
                                        ? (window.appSettings?.formatDateTime(client.date_of_birth, false) || new Date(client.date_of_birth).toLocaleDateString())
                                        : '—'}
                                </span>
                            </div>

                            <div className="border-t dark:border-gray-700" />

                            {/* Address */}
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1.5">
                                    <MapPin className="h-4 w-4" />{t('Address')}
                                </span>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                                    {client?.address || '—'}
                                </p>
                            </div>

                        </CardContent>
                    </Card>

                {/* ── Documents ── */}
                {canManageDocs && (
                    <Card className="shadow-sm">
                        <CardHeader className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700 rounded-t-lg shrink-0">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {t('Documents')}
                                {documents?.length > 0 && (
                                    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold w-5 h-5">
                                        {documents.length}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            {documents && documents.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {documents.map((doc: any, index: number) => (
                                        <div key={index} className="group relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                            {/* File Preview */}
                                            <div className="relative h-28 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                                {doc.file_path ? (
                                                    <>
                                                        <img
                                                            src={getImagePath(doc.file_path)}
                                                            alt={doc.document_name}
                                                            className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                                            }}
                                                        />
                                                        <div className="hidden w-full h-full items-center justify-center">
                                                            <FileText className="h-7 w-7 text-gray-400" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <FileText className="h-7 w-7 text-gray-400" />
                                                )}
                                                {/* Hover actions */}
                                                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                                    {doc.file_path && (
                                                        <button
                                                            onClick={() => window.open(getImagePath(doc.file_path), '_blank')}
                                                            className="p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors cursor-pointer"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 text-gray-700" />
                                                        </button>
                                                    )}
                                                    {canDownloadDocs && (
                                                        <button
                                                            onClick={() => window.open(route('clients.documents.download', doc.id), '_blank')}
                                                            className="p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors cursor-pointer"
                                                        >
                                                            <Download className="h-3.5 w-3.5 text-gray-700" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Doc info */}
                                            <div className="px-2.5 py-2 border-t border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{doc.document_name}</p>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    {doc.document_type && (
                                                        <span
                                                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: `${doc.document_type.color}20`,
                                                                color: doc.document_type.color,
                                                                boxShadow: `inset 0 0 0 1px ${doc.document_type.color}33`,
                                                            }}
                                                        >
                                                            {doc.document_type.name}
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                                        doc.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                            : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-600/20'
                                                    }`}>
                                                        {doc.status === 'active' ? t('Active') : t('Archived')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-2">
                                        <FileText className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t('No documents found')}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('No documents have been uploaded for this client.')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

            </div>
        </PageTemplate>
    );
}
