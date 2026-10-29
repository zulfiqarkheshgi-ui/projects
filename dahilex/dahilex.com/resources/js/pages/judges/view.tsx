import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { User, Tag, Lock, Phone, Mail, Building2, FileText } from 'lucide-react';

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
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Judge Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Judge ID & Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Judge ID')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.judge_id || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Judge Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.name || '-'}</p>
                    </div>
                </div>

                {/* Title & Court */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {t('Court')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.court?.name || '-'}</p>
                    </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {t('Email')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.email || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {t('Phone')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.phone || '-'}</p>
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
                            record?.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : 'bg-red-50 text-red-700 ring-red-600/20'
                        }`}>
                            {record?.status === 'active' ? t('Active') : t('Inactive')}
                        </span>
                    </div>
                </div>

                {/* Contact Info */}
                {record?.contact_info && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Contact Information')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.contact_info}</p>
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
