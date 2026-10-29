import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { BookOpen, Tag, FileText, Link } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function CitationView({ record }: ViewProps) {
    const { t } = useTranslation();

    const typeColors: Record<string, string> = {
        case: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        statute: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        article: 'bg-purple-50 text-purple-700 ring-purple-600/20',
        book: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        website: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    };

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Citation Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Type & Source */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Type')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                typeColors[record?.citation_type] || 'bg-gray-50 text-gray-700 ring-gray-600/20'
                            }`}>
                                {record?.citation_type ? record.citation_type.charAt(0).toUpperCase() + record.citation_type.slice(1) : '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            {t('Source')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.source?.source_name || '-'}</p>
                    </div>
                </div>

                {/* Citation Text */}
                {record?.citation_text && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {t('Citation Text')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{record.citation_text}</p>
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
