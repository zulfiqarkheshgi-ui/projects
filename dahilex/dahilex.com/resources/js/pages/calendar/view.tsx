import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, FileText, MapPin, User, Tag } from 'lucide-react';
import { formatStatusText, hexToRgba } from '@/utils/helpers';

interface ViewProps {
    record: any;
    formatTime: (time: string) => string;
}

export default function View({ record, formatTime }: ViewProps) {
    const { t } = useTranslation();

    if (!record) return null;

    const typeLabel = record.type === 'hearing' ? t('Hearing') : record.type === 'task' ? t('Task') : t('Timeline');

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg" style={{ backgroundColor: `${record.color}20` }}>
                        <Calendar className="h-5 w-5" style={{ color: record.color }} />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{record.title}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record.date ? (window.appSettings?.formatDate(record.date) || new Date(record.date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Time')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record.time ? formatTime(record.time) : '-'}
                            {record.duration ? ` (${record.duration} min)` : ''}
                        </p>
                    </div>
                </div>

                {/* Type & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Type')}
                        </label>
                        <div className="mt-1">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20">
                                {typeLabel}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span
                                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                style={{
                                    backgroundColor: `${record.color}20`,
                                    color: record.color,
                                    boxShadow: `inset 0 0 0 1px ${hexToRgba(record.color, 0.2)}`,
                                }}
                            >
                                {formatStatusText(record.status || '-')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Case */}
                {record.case_title && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Case')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.case_title}</p>
                    </div>
                )}

                {/* Court */}
                {record.court_name && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('Court')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.court_name}</p>
                    </div>
                )}

                {/* Judge */}
                {record.judge_name && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Judge')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.judge_name}</p>
                    </div>
                )}

                {/* Description */}
                {record.details?.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.details.description}</p>
                    </div>
                )}

                {/* Notes */}
                {record.details?.notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Notes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.details.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
