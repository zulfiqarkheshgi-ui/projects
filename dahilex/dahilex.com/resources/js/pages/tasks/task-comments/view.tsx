import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { MessageSquare, FileText, Tag, User } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const isInternal = record?.is_internal === true || record?.is_internal === 1;

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Comment Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Task & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Task')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.task ? `${record.task.task_id} - ${record.task.title}` : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Comment Type')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                isInternal
                                    ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                    : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                            }`}>
                                {isInternal ? t('Internal') : t('External')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Author */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('Author')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.creator?.name || '-'}</p>
                </div>

                {/* Comment */}
                {record?.comment_text && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            {t('Comment')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{record.comment_text}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
