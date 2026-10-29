import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { FileText, Tag, AlertCircle, User } from 'lucide-react';
import { capitalize } from '@/utils/helpers';

interface ViewProps {
    record: any;
}

export default function NoteView({ record }: ViewProps) {
    const { t } = useTranslation();

    const priorityColors: Record<string, string> = {
        low: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        medium: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        urgent: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Note Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Title & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Note Type')}
                        </label>
                        <div className="mt-1">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                {record?.note_type ? record.note_type.charAt(0).toUpperCase() + record.note_type.slice(1) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Priority & Created By */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {t('Priority')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                priorityColors[record?.priority] || priorityColors.medium
                            }`}>
                                {record?.priority ? record.priority.charAt(0).toUpperCase() + record.priority.slice(1) : '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Created By')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.creator?.name || '-'}</p>
                    </div>
                </div>

                {/* Content */}
                {record?.content && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Content')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{record.content}</p>
                    </div>
                )}

                {/* Tags */}
                {record?.tags?.length>0 && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Tags')}
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(Array.isArray(record.tags)
                                ? record.tags
                                : record.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                            ).map((tag: string, index: number) => (
                                <span key={index} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
