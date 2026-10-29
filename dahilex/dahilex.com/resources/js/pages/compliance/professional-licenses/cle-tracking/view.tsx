import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { BookOpen, Tag, User, Calendar, FileText, Eye } from 'lucide-react';
import { capitalize, getImagePath } from '@/utils/helpers';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const statusColors: Record<string, string> = {
        completed: 'bg-green-50 text-green-700 ring-green-600/20',
        in_progress: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        expired: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const getExpiryClass = () => {
        if (!record?.expiry_date) return '';
        return new Date(record.expiry_date) < new Date() ? 'text-red-600' : '';
    };

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('CLE Record Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* User & Course Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('User')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.user?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {t('Course Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.course_name || '-'}</p>
                    </div>
                </div>

                {/* Provider & Certificate Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Provider')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.provider || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Certificate Number')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.certificate_number || '-'}</p>
                    </div>
                </div>

                {/* Credits & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Credits')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.credits_earned ?? '-'} {t('earned')}
                            {record?.credits_required ? ` / ${record.credits_required} ${t('required')}` : ''}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                statusColors[record?.status] || 'bg-gray-50 text-gray-700 ring-gray-600/20'
                            }`}>
                                {capitalize(record?.status)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Completion Date & Expiry Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Completion Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.completion_date ? (window.appSettings?.formatDate(record.completion_date) || new Date(record.completion_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Expiry Date')}
                        </label>
                        <p className={`mt-1 text-sm font-medium ${getExpiryClass() || 'text-gray-900 dark:text-white'}`}>
                            {record?.expiry_date
                                ? `${window.appSettings?.formatDate(record.expiry_date) || new Date(record.expiry_date).toLocaleDateString()}${new Date(record.expiry_date) < new Date() ? ' (Expired)' : ''}`
                                : '-'}
                        </p>
                    </div>
                </div>

                {/* Certificate File Preview */}
                {record?.certificate_file && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Certificate File')}
                            </label>
                            <a
                                href={getImagePath(record.certificate_file)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors"
                            >
                                <img
                                    src={getImagePath(record.certificate_file)}
                                    alt={record.course_name}
                                    className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                                    onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <Eye className="h-6 w-6 text-white" />
                                </div>
                            </a>
                        </div>
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
            </div>
        </DialogContent>
    );
}
