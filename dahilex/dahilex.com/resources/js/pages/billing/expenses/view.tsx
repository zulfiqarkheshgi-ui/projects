import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { DollarSign, FileText, Tag, Calendar, ScrollText, Eye } from 'lucide-react';
import { capitalize, formatCurrency, getImagePath } from '@/utils/helpers';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const isBillable = record?.is_billable === 1 || record?.is_billable === '1' || record?.is_billable === true;

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Expense Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Case & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Case')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.case ? `${record.case.case_id} - ${record.case.title}` : t('General')}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.category?.name || '-'}</p>
                    </div>
                </div>

                {/* Amount & Expense Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t('Amount')}
                        </label>
                        <p className="mt-1 text-sm font-medium font-mono text-gray-900 dark:text-white">
                            {record?.amount ? formatCurrency(parseFloat(record.amount)) : formatCurrency(0)}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Expense Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.expense_date ? (window.appSettings?.formatDate(record.expense_date) || new Date(record.expense_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                </div>

                {/* Billable & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Billable')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isBillable
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                                }`}>
                                {isBillable ? t('Yes') : t('No')}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${record?.status == 'approved'
                                ? ('bg-emerald-50 text-emerald-700 ring-emerald-600/20')
                                : record?.status == 'rejected' ? 'bg-red-50 text-red-700 ring-red-600/20' : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                }`}>
                                {capitalize(record?.status || '-')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Invoice */}
                {record?.invoice && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <ScrollText className="h-4 w-4" />
                                {t('Invoice Number')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                {record?.invoice?.invoice_number || '-'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Receipt File */}
                {record?.receipt_file && (() => {
                    const filePath = getImagePath(record.receipt_file);
                    const isPdf = record.receipt_file.toLowerCase().endsWith('.pdf');
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {t('Receipt')}
                                </label>
                                {isPdf ? (
                                    <a
                                        href={filePath}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-red-50 hover:border-primary transition-colors w-fit"
                                    >
                                        <FileText className="h-8 w-8 text-red-500 shrink-0"/>
                                        <div>
                                            <p className="text-xs font-medium text-gray-700">{record.receipt_file.split('/').pop()}</p>
                                            <p className="text-[11px] text-primary">{t('Click to view PDF')}</p>
                                        </div>
                                    </a>
                                ) : (
                                    <a
                                        href={filePath}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors"
                                    >
                                        <img
                                            src={filePath}
                                            alt={t('Receipt')}
                                            className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                                            onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                            <Eye className="h-6 w-6 text-white" />
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })()}

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
