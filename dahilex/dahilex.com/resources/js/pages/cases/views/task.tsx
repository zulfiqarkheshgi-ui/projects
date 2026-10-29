import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Tag, AlertCircle, User, Calendar, Clock, FileText } from 'lucide-react';
import { hexToRgba } from '@/utils/helpers';

interface ViewProps {
    record: any;
    users?: any[];
}

export default function TaskView({ record, users }: ViewProps) {
    const { t } = useTranslation();

    const priorityColors: Record<string, string> = {
        critical: 'bg-red-50 text-red-700 ring-red-600/20',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        low: 'bg-green-50 text-green-700 ring-green-600/20',
    };

    const assignedName = record?.assignedUser?.name
        || record?.assigned_user?.name
        || users?.find((u: any) => u.id.toString() === record?.assigned_to?.toString())?.name
        || '-';

    const taskStatus = record?.taskStatus || record?.task_status;

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CheckSquare className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Task Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Task ID & Title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Task ID')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.task_id || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {t('Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.title || '-'}</p>
                    </div>
                </div>

                {/* Priority & Task Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {t('Priority')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${priorityColors[record?.priority] || priorityColors.medium}`}>
                                {record?.priority ? record.priority.charAt(0).toUpperCase() + record.priority.slice(1) : '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Task Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.taskType?.name || record?.task_type?.name || '-'}
                        </p>
                    </div>
                </div>

                {/* Task Status & Assigned To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Task Status')}
                        </label>
                        <div className="mt-1">
                            {taskStatus ? (
                                <span
                                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                    style={{
                                        backgroundColor: `${taskStatus.color}20`,
                                        color: taskStatus.color,
                                        boxShadow: `inset 0 0 0 1px ${hexToRgba(taskStatus.color, 0.2)}`,
                                    }}
                                >
                                    {taskStatus.name}
                                </span>
                            ) : (
                                <p className="text-sm font-medium text-gray-900 dark:text-white">-</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Assigned To')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{assignedName}</p>
                    </div>
                </div>

                {/* Due Date & Estimated Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Due Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.due_date ? (window.appSettings?.formatDate(record.due_date) || new Date(record.due_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    {record?.estimated_duration && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {t('Estimated Duration')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.estimated_duration} hours</p>
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

                {/* Notes */}
                {record?.notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Notes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
