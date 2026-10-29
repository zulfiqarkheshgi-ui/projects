import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Tag, Calendar, User, FileText, AlertTriangle } from 'lucide-react';
import { capitalize } from '@/utils/helpers';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const statusColors: Record<string, string> = {
        planned: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        completed: 'bg-green-50 text-green-700 ring-green-600/20',
        cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const levelColors: Record<string, string> = {
        low: 'bg-green-50 text-green-700 ring-green-600/20',
        medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        critical: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Audit Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Audit Title & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            {t('Audit Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.audit_title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Audit Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.audit_type?.name || '-'}</p>
                    </div>
                </div>

                {/* Status & Risk Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[record?.status] || statusColors.planned}`}>
                                {record?.status ? t(capitalize(record.status)) : '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {t('Risk Level')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${levelColors[record?.risk_level] || levelColors.medium}`}>
                                {record?.risk_level ? t(capitalize(record.risk_level)) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Audit Date & Completion Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Audit Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.audit_date ? (window.appSettings?.formatDateTime(record.audit_date, false) || new Date(record.audit_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Completion Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.completion_date ? (window.appSettings?.formatDateTime(record.completion_date, false) || new Date(record.completion_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                </div>

                {/* Auditor & Auditor Organization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Auditor')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.auditor_name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Auditor Organization')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.auditor_organization || '-'}</p>
                    </div>
                </div>

                {/* Follow-up Date */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t('Follow-up Date')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                        {record?.follow_up_date ? (window.appSettings?.formatDate(record.follow_up_date) || new Date(record.follow_up_date).toLocaleDateString()) : '-'}
                    </p>
                </div>

                {/* Description */}
                {record?.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.description}</p>
                    </div>
                )}

                {/* Scope */}
                {record?.scope && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Scope')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.scope}</p>
                    </div>
                )}

                {/* Findings */}
                {record?.findings && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Findings')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.findings}</p>
                    </div>
                )}

                {/* Recommendations */}
                {record?.recommendations && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Recommendations')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.recommendations}</p>
                    </div>
                )}

                {/* Corrective Actions */}
                {record?.corrective_actions && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Corrective Actions')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.corrective_actions}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
