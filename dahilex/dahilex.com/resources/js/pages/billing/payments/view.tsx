import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { DollarSign, FileText, Tag, Calendar, User, Download } from 'lucide-react';
import { capitalize, formatCurrency, getImagePath } from '@/utils/helpers';
import { Button } from '@/components/ui/button';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const methodColors: Record<string, string> = {
        cash: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        check: 'bg-green-50 text-green-700 ring-green-600/20',
        credit_card: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        bank: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        online: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    };

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Payment Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Invoice & Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Invoice')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.invoice?.invoice_number || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Client')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.invoice?.client?.name || '-'}</p>
                    </div>
                </div>

                {/* Amount & Payment Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t('Amount')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white font-mono">
                            {record?.amount ? formatCurrency(parseFloat(record.amount)) : formatCurrency(0)}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Payment Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.payment_date ? (window.appSettings?.formatDate(record.payment_date) || new Date(record.payment_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                </div>

                {/* Payment Method & Receipt*/}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Payment Method')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${methodColors[record?.payment_method] || methodColors.cash
                                }`}>
                                {record?.payment_method ? t(capitalize(record.payment_method)) : '-'}
                            </span>
                        </div>
                    </div>
                    {record?.receipt_path && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                {t('Payment Receipt')}
                            </label>
                            <div className="mt-1">
                                <Button
                                    size={'sm'}
                                    varient={'primary'}
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = getImagePath(record.receipt_path);
                                        link.download = '';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }
                                    }
                                >
                                    {t('Download Receipt')}
                                </Button>

                            </div>
                        </div>
                    )}
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
