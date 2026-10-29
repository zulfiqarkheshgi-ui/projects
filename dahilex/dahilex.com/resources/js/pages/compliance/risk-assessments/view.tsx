import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FileText, Tag, Calendar, User } from 'lucide-react';
import { capitalize, hexToRgba } from '@/utils/helpers';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const levelColors: Record<string, string> = {
        low: 'bg-green-50 text-green-700 ring-green-600/20',
        medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        critical: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const probabilityColors: Record<string, string> = {
        very_low: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        low: 'bg-green-50 text-green-700 ring-green-600/20',
        medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        very_high: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const statusColors: Record<string, string> = {
        identified: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        assessed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        mitigated: 'bg-green-50 text-green-700 ring-green-600/20',
        monitored: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        closed: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    };

    const calculateRiskScore = (probability: string, impact: string) => {
        const values: Record<string, number> = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
        return (values[probability] || 3) * (values[impact] || 3);
    };

    const getRiskLevel = (score: number) => {
        if (score <= 4) return 'low';
        if (score <= 9) return 'medium';
        if (score <= 16) return 'high';
        return 'critical';
    };

    const score = calculateRiskScore(record?.probability, record?.impact);
    const level = getRiskLevel(score);

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Risk Assessment Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Risk Title & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {t('Risk Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.risk_title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Risk Category')}
                        </label>
                        <div className="mt-1">
                            {record?.risk_category ? (
                                <span
                                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                    style={{
                                        backgroundColor: `${record.risk_category.color}20`,
                                        color: record.risk_category.color,
                                        boxShadow: `inset 0 0 0 1px ${hexToRgba(record.risk_category.color, 0.2)}`,
                                    }}
                                >
                                    {record.risk_category.name}
                                </span>
                            ) : <p className="text-sm font-medium text-gray-900 dark:text-white">-</p>}
                        </div>
                    </div>
                </div>

                {/* Probability & Impact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Probability')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${probabilityColors[record?.probability] || probabilityColors.medium}`}>
                                {record?.probability ? t(capitalize(record.probability)) : '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Impact')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${probabilityColors[record?.impact] || probabilityColors.medium}`}>
                                {record?.impact ? t(capitalize(record.impact)) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Risk Level & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {t('Risk Level')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${levelColors[level]}`}>
                                {t(capitalize(level))} ({score})
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[record?.status] || statusColors.identified}`}>
                                {record?.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Assessment Date & Review Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Assessment Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.assessment_date ? (window.appSettings?.formatDate(record.assessment_date) || new Date(record.assessment_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Review Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.review_date ? (window.appSettings?.formatDate(record.review_date) || new Date(record.review_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                </div>

                {/* Responsible Person */}
                {record?.responsible_person && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Responsible Person')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.responsible_person}</p>
                    </div>
                )}

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

                {/* Mitigation Plan */}
                {record?.mitigation_plan && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Mitigation Plan')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.mitigation_plan}</p>
                    </div>
                )}

                {/* Control Measures */}
                {record?.control_measures && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Control Measures')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.control_measures}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
