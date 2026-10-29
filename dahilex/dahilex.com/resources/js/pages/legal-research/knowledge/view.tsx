import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { BookOpen, Tag, Lock, FileText } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const statusColors: Record<string, string> = {
        draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        published: 'bg-green-50 text-green-700 ring-green-600/20',
        archived: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const tags: string[] = Array.isArray(record?.tags)
        ? record.tags
        : typeof record?.tags === 'string'
            ? record.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [];

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Knowledge Article Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Title & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {t('Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.category?.name || '-'}</p>
                    </div>
                </div>

                {/* Status */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {t('Status')}
                    </label>
                    <div className="mt-1">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            statusColors[record?.status] || statusColors.draft
                        }`}>
                            {record?.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'}
                        </span>
                    </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Tags')}
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {tags.map((tag: string, index: number) => (
                                <span key={index} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

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
            </div>
        </DialogContent>
    );
}
