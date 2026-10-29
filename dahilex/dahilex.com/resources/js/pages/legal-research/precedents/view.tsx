import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Scale, FileText, Tag, Calendar, Star, Building2 } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const statusColors: Record<string, string> = {
        active: 'bg-green-50 text-green-700 ring-green-600/20',
        overruled: 'bg-red-50 text-red-700 ring-red-600/20',
        questioned: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        archived: 'bg-gray-50 text-gray-700 ring-gray-600/20',
    };

    const keyPoints: string[] = Array.isArray(record?.key_points)
        ? record.key_points
        : typeof record?.key_points === 'string'
            ? record.key_points.split(',').map((p: string) => p.trim()).filter(Boolean)
            : [];

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Scale className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Legal Precedent Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Case Name & Citation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            {t('Case Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.case_name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Citation')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.citation || '-'}</p>
                    </div>
                </div>

                {/* Jurisdiction & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Jurisdiction')}
                        </label>
                        <div className="mt-1">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                                {record?.jurisdiction || '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.category?.name || '-'}</p>
                    </div>
                </div>

                {/* Decision Date & Court Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Decision Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.decision_date ? (window.appSettings?.formatDate(record.decision_date) || new Date(record.decision_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {t('Court Level')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.court_level || '-'}</p>
                    </div>
                </div>

                {/* Relevance Score & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {t('Relevance Score')}
                        </label>
                        <div className="mt-1 flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{record?.relevance_score ?? '-'}/10</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                statusColors[record?.status] || statusColors.active
                            }`}>
                                {record?.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Key Points */}
                {keyPoints.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Key Points')}
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {keyPoints.map((point: string, index: number) => (
                                <span key={index} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                                    {point}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                {record?.summary && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Summary')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{record.summary}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
