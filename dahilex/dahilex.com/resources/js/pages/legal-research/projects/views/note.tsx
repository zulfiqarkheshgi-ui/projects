import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { FileText, Tag } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function NoteView({ record }: ViewProps) {
    const { t } = useTranslation();

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Research Note Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Title */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('Title')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.title || '-'}</p>
                </div>

                {/* Source Reference */}
                {record?.source_reference && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Source Reference')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.source_reference}</p>
                    </div>
                )}

                {/* Tags */}
                {record?.tags && record.tags.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Tags')}
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {record.tags.map((tag: string, index: number) => (
                                <span key={index} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Note Content */}
                {record?.note_content && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Note Content')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{record.note_content}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
