import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Award, Tag, User, Calendar, FileText, MapPin } from 'lucide-react';
import { capitalize } from '@/utils/helpers';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const statusColors: Record<string, string> = {
        active: 'bg-green-50 text-green-700 ring-green-600/20',
        expired: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        suspended: 'bg-purple-50 text-purple-700 ring-purple-600/20',
        revoked: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const getExpiryInfo = () => {
        if (!record?.expiry_date) return { text: '-', className: '' };
        const expiryDate = new Date(record.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const formatted = window.appSettings?.formatDate(record.expiry_date) || expiryDate.toLocaleDateString();

        if (daysUntilExpiry < 0) return { text: `${formatted} (Expired)`, className: 'text-red-600' };
        if (daysUntilExpiry <= 30) return { text: `${formatted} (${daysUntilExpiry} days left)`, className: 'text-orange-600' };
        return { text: formatted, className: '' };
    };

    const expiryInfo = getExpiryInfo();

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Award className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Professional License Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* User & License Type */}
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
                            <Award className="h-4 w-4" />
                            {t('License Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.license_type || '-'}</p>
                    </div>
                </div>

                {/* License Number & Issuing Authority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('License Number')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.license_number || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Issuing Authority')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.issuing_authority || '-'}</p>
                    </div>
                </div>

                {/* Jurisdiction & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('Jurisdiction')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.jurisdiction || '-'}</p>
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
                                {record?.status ? t(capitalize(record.status)) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Issue Date & Expiry Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Issue Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.issue_date ? (window.appSettings?.formatDate(record.issue_date) || new Date(record.issue_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Expiry Date')}
                        </label>
                        <p className={`mt-1 text-sm font-medium ${expiryInfo.className || 'text-gray-900 dark:text-white'}`}>
                            {expiryInfo.text}
                        </p>
                    </div>
                </div>

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
