import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, Tag, Calendar, User, AlertCircle } from 'lucide-react';
import { capitalize } from '@/utils/helpers';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        compliant: 'bg-green-50 text-green-700 ring-green-600/20',
        non_compliant: 'bg-red-50 text-red-700 ring-red-600/20',
        overdue: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const priorityColors: Record<string, string> = {
        low: 'bg-green-50 text-green-700 ring-green-600/20',
        medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        critical: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Compliance Requirement Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Title & Regulatory Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            {t('Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Regulatory Body')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.regulatory_body?.name || '-'}</p>
                    </div>
                </div>

                {/* Category & Frequency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.category?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Frequency')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.frequency?.name || '-'}</p>
                    </div>
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                statusColors[record?.status] || 'bg-gray-50 text-gray-700 ring-gray-600/20'
                            }`}>
                                {record?.status ? t(capitalize(record.status)) : '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {t('Priority')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                priorityColors[record?.priority] || 'bg-gray-50 text-gray-700 ring-gray-600/20'
                            }`}>
                                {record?.priority ? t(capitalize(record.priority)) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Effective Date & Deadline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Effective Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.effective_date ? (window.appSettings?.formatDate(record.effective_date) || new Date(record.effective_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Deadline')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.deadline ? (window.appSettings?.formatDate(record.deadline) || new Date(record.deadline).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                </div>

                {/* Jurisdiction & Responsible Party */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {record?.jurisdiction && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                {t('Jurisdiction')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.jurisdiction}</p>
                        </div>
                    )}
                    {record?.responsible_party && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {t('Responsible Party')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.responsible_party}</p>
                        </div>
                    )}
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

                {/* Evidence Requirements */}
                {record?.evidence_requirements && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Evidence Requirements')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.evidence_requirements}</p>
                    </div>
                )}

                {/* Penalty Implications */}
                {record?.penalty_implications && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {t('Penalty Implications')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.penalty_implications}</p>
                    </div>
                )}

                {/* Monitoring Procedures */}
                {record?.monitoring_procedures && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Monitoring Procedures')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.monitoring_procedures}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
