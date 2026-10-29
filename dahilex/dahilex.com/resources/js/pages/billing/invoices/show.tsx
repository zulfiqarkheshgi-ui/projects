import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Edit, Send, Download, DollarSign } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { capitalize, formatCurrencyForCompany, getImagePath } from '@/utils/helpers';
import { CrudTable } from '@/components/CrudTable';

export default function ShowInvoice() {
    const { t } = useTranslation();
    const { invoice, auth, invoiceItems, payments = [] } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const totalPaid = invoice.payments?.reduce((sum, payment) => sum +  (payment.status=='completed' ? parseFloat(payment.amount || 0) : 0), 0) || 0;
    const dueAmount = parseFloat(invoice.total_amount || 0) - totalPaid;


    const formatAmount = (amount) => formatCurrencyForCompany(amount);

    const handleSend = () => {
        router.put(route('billing.invoices.send', invoice.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) toast.success(page.props.flash.success);
                if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => {
                toast.error(`Failed to send invoice: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleDownload = () => {
        window.open(route('billing.invoices.print', invoice.id) + '?download=pdf', '_blank');
    };

    const handleApprovePayment = (payment: any) => {
        router.post(route('billing.payments.approve', payment.id), {}, {
            onSuccess: (page) => {
                if ((page.props.flash as any).success)
                    toast.success(t((page.props.flash as any).success));
                if ((page.props.flash as any).error)
                    toast.error(t((page.props.flash as any).error));
            },
            onError: () => toast.error(t('Failed to approve payment'))
        });
    };

    const handleRejectPayment = (payment: any) => {
        router.post(route('billing.payments.reject', payment.id), {}, {
            onSuccess: (page) => {
                if ((page.props.flash as any).success)
                    toast.success(t((page.props.flash as any).success));
                if ((page.props.flash as any).error)
                    toast.error(t((page.props.flash as any).error));
            },
            onError: () => toast.error(t('Failed to reject payment'))
        });
    };

    const handleViewPayment = (payment: any) => {
        window.open(getImagePath(payment.receipt_path), '_blank');
    }

    const getStatusColor = (status: string) => {
        const statusColors = {
            draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
            sent: 'bg-blue-50 text-blue-700 ring-blue-600/20',
            paid: 'bg-green-50 text-green-700 ring-green-600/20',
            partial: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
            overdue: 'bg-red-50 text-red-700 ring-red-600/20',
            cancelled: 'bg-gray-50 text-gray-700 ring-gray-600/20'
        };
        return statusColors[status as keyof typeof statusColors] || statusColors.draft;
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Billing & Invoicing'), href: route('billing.invoices.index') },
        { title: t('Invoices'), href: route('billing.invoices.index') },
        { title: t('View Invoice') }
    ];

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('billing.invoices.index'))
        }
    ];

    if (hasPermission(permissions, 'edit-invoices') && invoice.status === 'draft') {
        pageActions.push({
            label: t('Edit Invoice'),
            icon: <Edit className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.get(route('billing.invoices.edit', invoice.id))
        });
    }

    const actions = (hasPermission(permissions, 'approve-payments') || hasPermission(permissions, 'reject-payments')) ? [
        {
            label: t('View Receipt'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            condition: (row: any) => row.receipt_path
        },
        {
            label: t('Approve'),
            icon: 'Check',
            action: 'approve',
            className: 'text-green-500',
            requiredPermission: 'approve-payments',
            condition: (row: any) => row.status === 'pending'
        },
        {
            label: t('Reject'),
            icon: 'X',
            action: 'reject',
            className: 'text-red-500',
            requiredPermission: 'reject-payments',
            condition: (row: any) => row.status === 'pending'
        }
    ] : [];

    return (
        <PageTemplate
            title={`${t('Invoice')} #${invoice.invoice_number || invoice.id}`}
            breadcrumbs={breadcrumbs}
            actions={pageActions}
            noPadding
        >
            <div className="space-y-4 pt-4">
                {/* Invoice Header Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    {/* Top row: invoice number + status + total */}
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-base font-medium text-gray-700">#{invoice.invoice_number || invoice.id}</p>
                        <div className="flex items-center gap-4">
                            <span className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold ring-1 ring-inset ${getStatusColor(invoice.status)}`}>
                                {t(capitalize(invoice.status))}
                            </span>
                            <div className="text-right">
                                <div className="text-2xl font-mono">{formatAmount(parseFloat(invoice.total_amount || 0))}</div>
                                <div className="text-xs text-muted-foreground">{t('Total Amount')}</div>
                            </div>
                        </div>
                    </div>

                    {/* 2-column info grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Client */}
                        <div>
                            <h4 className="text-xs font-bold tracking-wide text-gray-500 mb-2">{t('Client')}</h4>
                            <div className="text-sm space-y-0.5">
                                <div className="font-semibold text-gray-900">{invoice.client?.name || '-'}</div>
                                <div className="text-muted-foreground">{invoice.client?.email || '-'}</div>
                                {invoice.client?.phone && (
                                    <div className="text-muted-foreground">{invoice.client.phone}</div>
                                )}
                                {invoice.client?.address && (
                                    <div className="text-muted-foreground mt-1">{invoice.client.address}</div>
                                )}
                            </div>
                        </div>

                        {/* Details + actions */}
                        <div>
                            <h4 className="text-xs font-bold tracking-wide text-gray-500 mb-2">{t('Details')}</h4>
                            <div className="space-y-1 text-sm mb-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('Invoice Date')}</span>
                                    <span>{window.appSettings?.formatDate(invoice.invoice_date) || new Date(invoice.invoice_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('Due Date')}</span>
                                    <span className={new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'text-red-600' : ''}>
                                        {window.appSettings?.formatDate(invoice.due_date) || new Date(invoice.due_date).toLocaleDateString()}
                                    </span>
                                </div>
                                {invoice.case && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('Case')}</span>
                                        <span className="text-right text-xs">{invoice.case.case_id ? `${invoice.case.case_id} - ${invoice.case.title}` : invoice.case.title}</span>
                                    </div>
                                )}
                            </div>

                            {/* Download + balance due */}
                            <div className="bg-blue-50 rounded p-3">
                                <div className="flex flex-row items-center justify-between gap-2">
                                    <div className="flex flex-wrap gap-2">
                                        {hasPermission(permissions, 'view-invoices') && (
                                            <Button variant="outline" size="sm" onClick={handleDownload}>
                                                <Download className="h-4 w-4 mr-2" />
                                                {t('Download PDF')}
                                            </Button>
                                        )}
                                        {hasPermission(permissions, 'send-invoices') && invoice.status === 'draft' && (
                                            <TooltipProvider>
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Button size="sm" onClick={handleSend}>
                                                            <Send className="h-4 w-4 mr-2" />
                                                            {t('Send Invoice')}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('Send invoice to client via email')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-mono text-blue-600">{formatAmount(dueAmount)}</div>
                                        <div className="text-xs text-muted-foreground">{t('Amount Due')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="pt-4 border-t border-gray-100">
                            <span className="text-sm font-medium text-gray-700">{t('Notes')}:</span>
                            <span className="text-sm text-muted-foreground ml-2">{invoice.notes}</span>
                        </div>
                    )}
                </div>

                {/* Invoice Items Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-base font-semibold text-gray-800 mb-5">{t('Invoice Items')}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 pr-4 font-semibold text-gray-700">{t('Description')}</th>
                                    <th className="text-right py-2 px-4 font-semibold text-gray-700">{t('Qty')}</th>
                                    <th className="text-right py-2 px-4 font-semibold text-gray-700">{t('Rate')}</th>
                                    <th className="text-right py-2 pl-4 font-semibold text-gray-700">{t('Amount')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoiceItems?.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td className="py-4 pr-4">
                                            <div className="font-medium text-gray-900">{item.description}</div>
                                            {item.type === 'expense' && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="bg-orange-100 px-2 py-0.5 rounded text-xs text-orange-700 font-medium">{t('Expense')}</span>
                                                    {item.expense_date && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {window.appSettings?.formatDate(item.expense_date) || new Date(item.expense_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {item.type === 'time' && (
                                                <span className="bg-blue-100 px-2 py-0.5 rounded text-xs text-blue-700 font-medium mt-1 inline-block">{t('Time Sheet')}</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-right text-gray-700">{item.quantity}</td>
                                        <td className="py-4 px-4 text-right text-gray-700 font-mono">{formatAmount(parseFloat(item.rate || 0))}</td>
                                        <td className="py-4 pl-4 text-right font-mono text-gray-900">{formatAmount(parseFloat(item.amount || 0))}</td>
                                    </tr>
                                ))}
                                {(!invoiceItems || invoiceItems.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                                            {t('No items found')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Invoice Summary */}
                    <div className="flex justify-end mt-6">
                        <div className="w-80 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>{t('Subtotal')}</span>
                                <span className="font-mono">{formatAmount(parseFloat(invoice.subtotal || 0))}</span>
                            </div>
                            {invoice.tax_amount > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <span>{t('Tax')}</span>
                                    <span className="font-mono">{formatAmount(parseFloat(invoice.tax_amount || 0))}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
                                <span>{t('Total Amount')}</span>
                                <span className="font-mono">{formatAmount(parseFloat(invoice.total_amount || 0))}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>{t('Paid Amount')}</span>
                                <span className="font-mono">{formatAmount(totalPaid)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
                                <span>{t('Balance Due')}</span>
                                <span className="font-mono">{formatAmount(dueAmount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Payment History */}
                {hasPermission(permissions, 'manage-payments') && payments.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-base font-semibold text-gray-800">
                                {t('Payment History')} ({payments.length})
                            </h3>
                        </div>
                        <div>
                            <CrudTable
                                columns={[
                                    {
                                        key: 'payment_date',
                                        label: t('Date'),
                                        render: (value: string) => window.appSettings?.formatDate(value) || new Date(value).toLocaleDateString()
                                    },
                                    {
                                        key: 'payment_method',
                                        label: t('Method'),
                                        render: (value: string) => <span className="capitalize">{value}</span>
                                    },
                                    {
                                        key: 'amount',
                                        label: t('Amount'),
                                        render: (value: any) => <span className="font-mono">{formatAmount(parseFloat(value || 0))}</span>
                                    },
                                    {
                                        key: 'status',
                                        label: t('Status'),
                                        render: (value: string) => {
                                            const statusColors: Record<string, string> = {
                                                completed: 'bg-green-50 text-green-700 ring-green-600/20',
                                                pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                                                rejected: 'bg-red-50 text-red-700 ring-red-600/20',
                                            };
                                            return (
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                                                    {t(capitalize(value))}
                                                </span>
                                            );
                                        }
                                    },
                                    {
                                        key: 'notes',
                                        label: t('Notes'),
                                        render: (value: string) => value || '-'
                                    }
                                ]}
                                actions={actions}
                                data={payments}
                                from={1}
                                onAction={(action: string, item: any) => {
                                    if (action === 'approve') handleApprovePayment(item);
                                    if (action === 'reject') handleRejectPayment(item);
                                    if (action === 'view') handleViewPayment(item);
                                }}
                                permissions={permissions}
                            />
                        </div>
                    </div>
                )}
            </div>
        </PageTemplate>
    );
}
