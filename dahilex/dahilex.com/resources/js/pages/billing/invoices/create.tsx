import { useState, useEffect, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Clock, ArrowLeft, FileText, ScrollText } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/helpers';
import { DatePicker } from '@/components/ui/date-picker';

export default function CreateInvoice() {
    const { t } = useTranslation();
    const { clients, cases, timeEntries, clientBillingInfo, currencies } = usePage().props as any;

    const [formData, setFormData] = useState({
        client_id: '',
        case_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        tax_rate: 0,
        tax_amount: 0,
        notes: '',
        line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
    });

    const [filteredCases, setFilteredCases] = useState([]);
    const [unbilledTimeEntries, setUnbilledTimeEntries] = useState([]);

    // Get formatted currency using helper function from company settings
    const formatAmount = (amount) => {
        // Always use company settings currency via formatCurrency helper
        return formatCurrency(amount);
    };

    useEffect(() => {
        if (formData.client_id) {
            // Fetch cases for selected client
            fetch(route('api.clients.cases', formData.client_id))
                .then(response => response.json())
                .then(response => {
                    const data = response.data || response;
                    setFilteredCases(Array.isArray(data) ? data : []);
                    updateFormData('case_id', '');
                })
                .catch(err => {

                    setFilteredCases([]);
                });

            // Set client's tax rate and auto-calculate due date
            const selectedClient = clients?.find(c => c.id == formData.client_id);
            const billing = clientBillingInfo?.[formData.client_id];

            let dueDate = '';
            if (billing?.payment_terms && formData.invoice_date) {
                const invoiceDate = new Date(formData.invoice_date);
                switch (billing.payment_terms) {
                    case 'net_15':
                        dueDate = new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        break;
                    case 'net_30':
                        dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        break;
                    case 'net_45':
                        dueDate = new Date(invoiceDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        break;
                    case 'net_60':
                        dueDate = new Date(invoiceDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        break;
                    case 'due_on_receipt':
                        dueDate = formData.invoice_date;
                        break;
                    default:
                        dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                }
            }

            setFormData(prev => ({
                ...prev,
                tax_rate: selectedClient?.tax_rate || 0,
                due_date: dueDate || prev.due_date,
                line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
            }));
            setUnbilledTimeEntries([]);
        } else {
            setFilteredCases([]);
            setUnbilledTimeEntries([]);
        }
    }, [formData.client_id]);

    // Load time entries when case is selected
    useEffect(() => {
        if (formData.case_id) {
            fetch(route('api.cases.time-entries', formData.case_id))
                .then(response => response.json())
                .then(response => {
                    const data = response.data || response;
                    if (Array.isArray(data) && data.length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            line_items: data
                        }));
                        setUnbilledTimeEntries(data);
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
                        }));
                        setUnbilledTimeEntries([]);
                    }
                })
                .catch(err => {
                    setFormData(prev => ({
                        ...prev,
                        line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
                    }));
                    setUnbilledTimeEntries([]);
                });
        } else {
            // Reset when no case selected
            setFormData(prev => ({
                ...prev,
                line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
            }));
            setUnbilledTimeEntries([]);
        }
    }, [formData.case_id]);



    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addLineItem = () => {
        setFormData(prev => ({
            ...prev,
            line_items: [...prev.line_items, { description: '', quantity: 1, rate: 0, amount: 0 }]
        }));
    };

    const removeLineItem = (index) => {
        setFormData(prev => ({
            ...prev,
            line_items: prev.line_items.filter((_, i) => i !== index)
        }));
    };

    const updateLineItem = (index, field, value) => {
        const newItems = [...formData.line_items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = newItems[index].quantity * newItems[index].rate;
        }

        setFormData(prev => ({ ...prev, line_items: newItems }));
    };

    const importTimeEntries = () => {
        const timeLineItems = unbilledTimeEntries.map(entry => ({
            description: entry.description,
            quantity: entry.hours,
            rate: entry.billable_rate,
            amount: entry.hours * entry.billable_rate
        }));

        setFormData(prev => ({
            ...prev,
            line_items: [...prev.line_items, ...timeLineItems]
        }));
    };

    const calculateSubtotal = () => {
        return formData.line_items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    };

    const calculateTaxAmount = () => {
        const subtotal = calculateSubtotal();
        return subtotal * (formData.tax_rate / 100);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTaxAmount();
    };

    const spanRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (spanRef.current && inputRef.current) {
            const width = spanRef.current.offsetWidth + 20; // padding
            inputRef.current.style.width = `${width}px`;
        }
    }, [formData.tax_rate]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.client_id) {
            toast.error('Please select a client');
            return;
        }

        if (!formData.case_id) {
            toast.error('Please select a case');
            return;
        }

        // Get currency ID from company settings instead of client billing info
        let currency_id = null;

        if (currencies && currencies.length > 0) {
            // Use formatCurrency helper which uses company settings
            const companyCurrencyCode = window.appSettings?.defaultCurrency || 'USD';
            const currency = currencies.find(c => c.code === companyCurrencyCode);
            currency_id = currency ? currency.id : null;
        }

        const submitData = {
            ...formData,
            currency_id: currency_id,
            subtotal: calculateSubtotal(),
            tax_amount: calculateTaxAmount(),
            total_amount: calculateTotal()
        };


        router.post(route('billing.invoices.store'), submitData, {
            onSuccess: () => {
                toast.success('Invoice created successfully');
                router.get(route('billing.invoices.index'));
            },
            onError: (errors) => {
                const errorMessages = Object.values(errors).flat().join(', ');
                toast.error(`Failed to add invoice: ${errorMessages}`);
            }
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Billing & Invoicing'), href: route('billing.invoices.index') },
        { title: t('Invoices'), href: route('billing.invoices.index') },
        { title: t('Add Invoice') }
    ];

    return (
        <PageTemplate
            title={t('Add Invoice')}
            description={t('Generate a new invoice by selecting a case and adding billable items.')}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.get(route('billing.invoices.index'))
                }
            ]}
            noPadding
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                {/* Client & Case Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <h3 className="text-base font-semibold text-gray-800">{t('Client & Case Information')}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <Label htmlFor="invoice_date" required>{t('Invoice Date')}</Label>
                            <DatePicker
                                selected={formData.invoice_date}
                                onChange={(e) => updateFormData('invoice_date', e)}
                                className='w-full'
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="due_date" required>{t('Due Date')}</Label>
                            <DatePicker
                                selected={formData.due_date}
                                onChange={(e) => updateFormData('due_date', e)}
                                className='w-full'
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="client_id" required>{t('Client')}</Label>
                            <Select value={formData.client_id} onValueChange={(value) => updateFormData('client_id', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select Client')} />
                                </SelectTrigger>
                                <SelectContent searchable={true}>
                                    {clients && Array.isArray(clients) && clients.length > 0 ? (
                                        clients.map(client => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                                {client.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="no-clients" disabled>
                                            {t('No clients available')}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {(!clients || clients.length === 0) && (
                                <p className="text-xs mt-1">
                                    Click here to add <a href={route('clients.index')} className="underline font-medium">{t('Clients')}</a>
                                </p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="case_id" required>{t('Case')}</Label>
                            <Select value={formData.case_id} onValueChange={(value) => updateFormData('case_id', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select Case')} />
                                </SelectTrigger>
                                <SelectContent searchable={true}>
                                    {filteredCases.length > 0 ? (
                                        filteredCases.map(caseItem => (
                                            <SelectItem key={caseItem.id} value={caseItem.id.toString()}>
                                                {caseItem.case_id ? `${caseItem.case_id} - ${caseItem.title}` : caseItem.title}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="no-cases" disabled>
                                            {t('No cases available')}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {formData.client_id && filteredCases.length === 0 && (
                                <p className="text-xs mt-1">
                                    Click here to add <a href={route('cases.index')} className="underline font-medium">{t('Cases')}</a>
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label>{t('Notes')}</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => updateFormData('notes', e.target.value)}
                            placeholder={t('Additional notes...')}
                            rows={3}
                        />
                    </div>
                </div>

                {/* Invoice Items */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <ScrollText className="h-5 w-5 text-gray-500" />
                            <h3 className="text-base font-semibold text-gray-800">{t('Invoice Items')}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            {unbilledTimeEntries.length > 0 && (
                                <div className="text-sm text-green-600 flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {unbilledTimeEntries.filter(item => item.type === 'time').length} {t('time sheet')}, {unbilledTimeEntries.filter(item => item.type === 'expense').length} {t('expenses available')}
                                </div>
                            )}
                            <Button type="button" variant="default" size="sm" onClick={addLineItem}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('Add Item')}
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 pr-3 font-medium text-gray-700 w-[30%]">{t('Description')}</th>
                                    <th className="text-left py-2 pr-3 font-medium text-gray-700 w-[12%]">{t('Quantity')}</th>
                                    <th className="text-left py-2 pr-3 font-medium text-gray-700 w-[15%]">{t('Rate')}</th>
                                    <th className="text-left py-2 pr-3 font-medium text-gray-700 w-[15%]">{t('Amount')}</th>
                                    <th className="text-left py-2 font-medium text-gray-700 w-[8%]">{t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.line_items.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-100">
                                        <td className="py-3 pr-3">
                                            <Input
                                                value={item.description}
                                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                                placeholder={t('Item description')}
                                            />
                                            {item.type === 'expense' && (
                                                <div className="text-xs text-orange-600 flex items-center mt-1">
                                                    <span className="bg-orange-100 px-2 py-0.5 rounded text-orange-700 font-medium">Expense</span>
                                                    {item.expense_date && <span className="ml-2">{window.appSettings?.formatDate(item.expense_date) || '-'}</span>}
                                                </div>
                                            )}
                                            {item.type === 'time' && (
                                                <div className="text-xs text-blue-600 flex items-center mt-1">
                                                    <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-700 font-medium">Time Sheet</span>
                                                    {item.entry_date && <span className="ml-2">{window.appSettings?.formatDate(item.entry_date) || '-'}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 pr-3">
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="py-3 pr-3">
                                            <Input
                                                type="number"
                                                value={item.rate}
                                                onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="py-3 pr-3">
                                            <Input
                                                type="number"
                                                value={item.amount}
                                                onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="py-3">
                                            {formData.line_items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeLineItem(index)}
                                                    className="text-gray-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Invoice Summary */}
                    <div className="flex justify-end mt-6">
                        <div className="w-72">
                            <h4 className="font-semibold text-gray-800 mb-3">{t('Invoice Summary')}</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>{t('Subtotal')}</span>
                                    <span className="font-mono">{formatAmount(calculateSubtotal() || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600">
                                    <Label htmlFor="tax_rate" className="mb-0">{t('Tax Rate')} (%)</Label>
                                    <span
                                        ref={spanRef}
                                        className="absolute invisible whitespace-pre text-sm px-3"
                                    >
                                        {formData.tax_rate || "0"}
                                    </span>
                                    <Input
                                        ref={inputRef}
                                        id="tax_rate"
                                        type="number"
                                        value={formData.tax_rate}
                                        onChange={(e) => updateFormData('tax_rate', parseFloat(e.target.value) || 0)}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-24 text-right"
                                    />
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>{t('Tax Amount')}</span>
                                    <span className="font-mono">{formatAmount(calculateTaxAmount() || 0)}</span>
                                </div>
                                <div className="flex justify-between text-gray-900 text-base border-t border-gray-200 pt-2">
                                    <span>{t('Total')}</span>
                                    <span className="font-mono">{formatAmount(calculateTotal() || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-gray-600">
                        {formData.line_items.length} {t('items added')}
                    </span>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(route('billing.invoices.index'))}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit">
                            {t('Save')}
                        </Button>

                    </div>
                </div>
            </form>
        </PageTemplate>
    );
}
