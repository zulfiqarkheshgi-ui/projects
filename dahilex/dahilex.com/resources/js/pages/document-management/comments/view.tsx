import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { MessageSquare, FileText, Lock, User, Calendar } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Document')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.document?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${record?.is_resolved
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                                }`}>
                                {record?.is_resolved ? t('Resolved') : t('Open')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Author')}
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                                <AvatarImage
                                    src={record?.creator?.avatar}
                                    alt={record?.creator?.name}
                                />
                                <AvatarFallback className="text-lg">
                                    {record?.creator?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{record?.creator?.name || '-'}</p>
                                {record?.creator?.email && (
                                    <p className="text-xs text-gray-500">{record.creator.email}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Created At')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.created_at ? (window.appSettings?.formatDateTime(record.created_at, false) || record.created_at) : '-'}
                        </p>
                    </div>
                </div>

                {record?.comment_text && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            {t('Comment')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.comment_text}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
