import { useState, useEffect } from 'react';
import { usePage, router, Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, CheckCircle2, Banknote, CreditCard, IndianRupee, Wallet, Coins, MapPin, Mail, Phone, Briefcase, CalendarDays, Hash } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { PaymentGatewaySelection } from '@/components/payment-gateway-selection';
import { StripePaymentModal } from '@/components/payment-modals/stripe-payment-modal';
import { BankPaymentModal } from '@/components/payment-modals/bank-payment-modal';
import { PayPalPaymentModal } from '@/components/payment-modals/paypal-payment-modal';
import { RazorpayPaymentModal } from '@/components/payment-modals/razorpay-payment-modal';
import { FlutterwavePaymentModal } from '@/components/payment-modals/flutterwave-payment-modal';
import { TapPaymentModal } from '@/components/payment-modals/tap-payment-modal';
import { XenditPaymentModal } from '@/components/payment-modals/xendit-payment-modal';
import { PaystackPaymentModal } from '@/components/payment-modals/paystack-payment-modal';
import { CoinGatePaymentModal } from '@/components/payment-modals/coingate-payment-modal';
import { AamarpayPaymentModal } from '@/components/payment-modals/aamarpay-payment-modal';
import { AuthorizeNetPaymentModal } from '@/components/payment-modals/authorizenet-payment-modal';
import { BenefitPaymentModal } from '@/components/payment-modals/benefit-payment-modal';
import { CashfreePaymentModal } from '@/components/payment-modals/cashfree-payment-modal';
import { CinetPayPaymentModal } from '@/components/payment-modals/cinetpay-payment-modal';
import { EasebuzzPaymentModal } from '@/components/payment-modals/easebuzz-payment-modal';
import { FedaPayPaymentModal } from '@/components/payment-modals/fedapay-payment-modal';
import { IyzipayPaymentModal } from '@/components/payment-modals/iyzipay-payment-modal';
import { KhaltiPaymentModal } from '@/components/payment-modals/khalti-payment-modal';
import { MidtransPaymentModal } from '@/components/payment-modals/midtrans-payment-modal';
import { MolliePaymentModal } from '@/components/payment-modals/mollie-payment-modal';
import { OzowPaymentModal } from '@/components/payment-modals/ozow-payment-modal';
import { PaiementPaymentModal } from '@/components/payment-modals/paiement-payment-modal';
import { PayfastPaymentModal } from '@/components/payment-modals/payfast-payment-modal';
import { PayHerePaymentModal } from '@/components/payment-modals/payhere-payment-modal';
import { PayTabsPaymentModal } from '@/components/payment-modals/paytabs-payment-modal';
import { PayTRPaymentModal } from '@/components/payment-modals/paytr-payment-modal';
import { ToyyibPayPaymentModal } from '@/components/payment-modals/toyyibpay-payment-modal';
import { YooKassaPaymentModal } from '@/components/payment-modals/yookassa-payment-modal';
import { SkrillPaymentModal } from '@/components/payment-modals/skrill-payment-modal';
import { MercadoPagoPaymentModal } from '@/components/payment-modals/mercadopago-payment-modal';
import { useFavicon } from '@/hooks/use-favicon';
import { t } from '@/utils/i18n';
import { isDemoMode } from '@/utils/cookies';

export default function InvoicePayment() {
    useFavicon();
    const { invoice, themeColor, enabledGateways, remainingAmount, clientBillingInfo, currencies, paypalClientId, flutterwavePublicKey, tapPublicKey, paystackPublicKey, flash, company, favicon, appName } = usePage().props as any;
    const themeColors: Record<string, string> = { blue: '#3b82f6', green: '#10b77f', purple: '#8b5cf6', orange: '#f97316', red: '#ef4444' };
    const resolvedColor = themeColor?.startsWith('#') ? themeColor : (themeColors[themeColor] || '#3b82f6');
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showGatewayModal, setShowGatewayModal] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(remainingAmount || invoice.total_amount || 0);

    // Apply themeColor from invoice props — runs after every render to win over BrandContext
    useEffect(() => {
        if (!isDemoMode()) {
            document.documentElement.style.setProperty('--primary', resolvedColor);
            document.documentElement.style.setProperty('--theme-color', resolvedColor);
        }
    });

    // Payment method icons mapping with Lucide React icons (same as plans)
    const getPaymentMethodIcon = (gatewayId: string) => {
        const iconMap = {
            bank: <Banknote className="h-5 w-5" />,
            stripe: <CreditCard className="h-5 w-5" />,
            paypal: <CreditCard className="h-5 w-5" />,
            razorpay: <IndianRupee className="h-5 w-5" />,
            mercadopago: <Wallet className="h-5 w-5" />,
            paystack: <CreditCard className="h-5 w-5" />,
            flutterwave: <CreditCard className="h-5 w-5" />,
            paytabs: <CreditCard className="h-5 w-5" />,
            skrill: <Wallet className="h-5 w-5" />,
            coingate: <Coins className="h-5 w-5" />,
            payfast: <CreditCard className="h-5 w-5" />,
            tap: <CreditCard className="h-5 w-5" />,
            xendit: <CreditCard className="h-5 w-5" />,
            paytr: <CreditCard className="h-5 w-5" />,
            mollie: <CreditCard className="h-5 w-5" />,
            toyyibpay: <CreditCard className="h-5 w-5" />,
            cashfree: <IndianRupee className="h-5 w-5" />,
            khalti: <CreditCard className="h-5 w-5" />,
            iyzipay: <CreditCard className="h-5 w-5" />,
            benefit: <CreditCard className="h-5 w-5" />,
            ozow: <CreditCard className="h-5 w-5" />,
            easebuzz: <IndianRupee className="h-5 w-5" />,
            authorizenet: <CreditCard className="h-5 w-5" />,
            fedapay: <CreditCard className="h-5 w-5" />,
            payhere: <CreditCard className="h-5 w-5" />,
            cinetpay: <CreditCard className="h-5 w-5" />,
            paiement: <CreditCard className="h-5 w-5" />,
            nepalste: <CreditCard className="h-5 w-5" />,
            yookassa: <CreditCard className="h-5 w-5" />,
            aamarpay: <CreditCard className="h-5 w-5" />,
            midtrans: <CreditCard className="h-5 w-5" />
        };
        return iconMap[gatewayId] || <CreditCard className="h-5 w-5" />;
    };

    // Add icons to enabled gateways
    const gatewaysWithIcons = enabledGateways?.map(gateway => ({
        ...gateway,
        icon: getPaymentMethodIcon(gateway.id)
    })) || [];

    useEffect(() => {
        // Add a small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            if (flash?.success) {
                toast.success(flash.success);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 5000);
            }
            if (flash?.error) {
                toast.error(flash.error);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [flash]);

    // Check for payment status changes and show toast
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const paymentStatus = urlParams.get('status');

        if (paymentSuccess === 'true' || paymentStatus === 'success') {
            toast.success('Payment successful');
            // Clean URL parameters
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, []);

    // Monitor invoice status changes
    useEffect(() => {
        const checkPaymentStatus = () => {
            if (invoice?.status === 'paid' && remainingAmount === 0 && !flash?.success) {
                toast.success('Payment successful');
            }
        };

        checkPaymentStatus();
    }, [invoice?.status, remainingAmount, flash?.success]);

    // Get formatted currency using company settings
    const formatAmount = (amount) => {
        if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
            const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
            return window.appSettings.formatCurrency(numericAmount, { showSymbol: true });
        }
        return `$${parseFloat(amount).toFixed(2)}`;
    };

    const isOverdue = new Date(invoice.due_date) < new Date();

    const handleGatewaySelect = (gatewayId: string) => {
        try {
            setSelectedGateway(gatewayId);
            setShowPaymentModal(true);
        } catch (error) {
            toast.error('Failed to select payment method. Please try again.');
        }
    };

    const closeModal = () => {
        try {
            setShowPaymentModal(false);
            setSelectedGateway(null);
        } catch (error) {
            toast.error('An error occurred. Please refresh the page.');
        }
    };

    const handlePaymentSuccess = () => {
        toast.success('Payment successful');
        closeModal();
        // Reload page after a short delay to show updated status
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const renderPaymentModal = () => {
        if (!selectedGateway || !showPaymentModal) return null;

        const modalProps = {
            isOpen: showPaymentModal,
            onClose: closeModal,
            onSuccess: handlePaymentSuccess,
            invoice,
            amount: Number(paymentAmount)
        };

        switch (selectedGateway) {
            case 'stripe':
                return <StripePaymentModal {...modalProps} />;
            case 'bank':
                return <BankPaymentModal {...modalProps} />;
            case 'paypal':
                return <PayPalPaymentModal {...modalProps} paypalClientId={paypalClientId} />;
            case 'razorpay':
                return <RazorpayPaymentModal {...modalProps} />;
            case 'flutterwave':
                return <FlutterwavePaymentModal {...modalProps} flutterwavePublicKey={flutterwavePublicKey} />;
            case 'tap':
                return <TapPaymentModal {...modalProps} tapPublicKey={tapPublicKey} />;
            case 'xendit':
                return <XenditPaymentModal {...modalProps} />;
            case 'paystack':
                return <PaystackPaymentModal
                    isOpen={showPaymentModal}
                    onClose={closeModal}
                    invoice={invoice}
                    amount={Number(paymentAmount)}
                    paystackKey={paystackPublicKey}
                />;
            case 'coingate':
                return <CoinGatePaymentModal {...modalProps} amount={paymentAmount} />;
            case 'aamarpay':
                return <AamarpayPaymentModal {...modalProps} />;
            case 'authorizenet':
                return <AuthorizeNetPaymentModal {...modalProps} />;
            case 'benefit':
                return <BenefitPaymentModal {...modalProps} />;
            case 'cashfree':
                return <CashfreePaymentModal {...modalProps} />;
            case 'cinetpay':
                return <CinetPayPaymentModal {...modalProps} />;
            case 'easebuzz':
                return <EasebuzzPaymentModal {...modalProps} />;
            case 'fedapay':
                return <FedaPayPaymentModal {...modalProps} />;
            case 'iyzipay':
                return <IyzipayPaymentModal {...modalProps} />;
            case 'khalti':
                return <KhaltiPaymentModal {...modalProps} />;
            case 'midtrans':
                return <MidtransPaymentModal {...modalProps} />;
            case 'mollie':
                return <MolliePaymentModal {...modalProps} />;
            case 'ozow':
                return <OzowPaymentModal {...modalProps} />;
            case 'paiement':
                return <PaiementPaymentModal {...modalProps} />;
            case 'payfast':
                return <PayfastPaymentModal {...modalProps} />;
            case 'payhere':
                return <PayHerePaymentModal {...modalProps} />;
            case 'paytabs':
                return (
                    <PayTabsPaymentModal
                        invoiceToken={invoice.payment_token}
                        amount={modalProps.amount}
                        onSuccess={handlePaymentSuccess}
                        onCancel={closeModal}
                    />
                );
            case 'paytr':
                return <PayTRPaymentModal {...modalProps} />;
            case 'skrill':
                return <SkrillPaymentModal {...modalProps} />;
            case 'toyyibpay':
                return <ToyyibPayPaymentModal {...modalProps} />;
            case 'yookassa':
                return <YooKassaPaymentModal {...modalProps} />;
            case 'mercadopago':
                return <MercadoPagoPaymentModal {...modalProps} />;
            default:
                return null;
        }
    };

    return (
        <>
            <Head title={`Invoice - ${company?.name || 'Advocate Saas'}`}>
                {favicon && <link rel="icon" type="image/x-icon" href={favicon} />}
            </Head>
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-start justify-center py-10 px-4">
                <div className="w-full max-w-7xl">

                    {/* Header Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-5">
                        <div className="px-8 py-7 flex flex-col sm:flex-row justify-between items-start gap-4 bg-primary">
                            <div>
                                <p className="text-white text-xs font-medium mb-1">Invoice</p>
                                <h1 className="text-white font-bold text-xl">{company?.name || 'Advocate'}</h1>
                            </div>
                            <div className="text-right">
                                <p className="text-white text-xs font-medium mb-1">Invoice No.</p>
                                <p className="text-white font-bold text-xl">{invoice.invoice_number}</p>
                                <div className="flex flex-col gap-1 mt-3 text-white text-xs">
                                    <span>Issued: {new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    <span>
                                        Due: {new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action bar */}
                        <div className="px-8 py-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center gap-3">
                            <p className="text-xs text-gray-900">Secure payment powered by your preferred gateway</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-xs"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(window.location.href);
                                            setShowCopiedMessage(true);
                                            setTimeout(() => setShowCopiedMessage(false), 2000);
                                            toast.success('Link copied to clipboard!');
                                        } catch (error) {
                                            toast.error('Failed to copy link. Please try again.');
                                        }
                                    }}
                                >
                                    {showCopiedMessage ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied!</> : <><Link2 className="h-3.5 w-3.5" /> Copy Link</>}
                                </Button>
                                {(invoice.status === 'partial_paid' || (invoice.status !== 'paid' && remainingAmount > 0)) && (
                                    <Button
                                        size="sm"
                                        className="gap-2 text-xs px-5 bg-primary"
                                        onClick={() => {
                                            try { setShowGatewayModal(true); }
                                            catch (error) { toast.error('Failed to open payment options. Please try again.'); }
                                        }}
                                    >
                                        Pay Now
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-5">
                        <div className="p-8 space-y-8">

                            {/* 3-column info cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                {/* Bill To */}
                                <div className="rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
                                    <p className="text-xs font-bold text-gray-900 mb-3">Bill To</p>
                                    <p className="text-sm font-bold text-gray-900">{invoice.client?.name}</p>
                                    {invoice.client?.address && <p className="flex items-start gap-1.5 text-xs text-gray-900 mt-2"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />{invoice.client.address}</p>}
                                    {invoice.client?.email && <p className="flex items-center gap-1.5 text-xs text-gray-900 mt-1.5"><Mail className="h-3.5 w-3.5 shrink-0" />{invoice.client.email}</p>}
                                    {invoice.case && <p className="flex items-center gap-1.5 text-xs text-gray-900 mt-1.5"><Briefcase className="h-3.5 w-3.5 shrink-0" />{invoice.case.title}</p>}
                                </div>
                                <div></div>

                                {/* Invoice Details */}
                                <div className="rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
                                    <p className="text-xs font-bold text-gray-900 mb-3">Invoice Details</p>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs text-gray-900"><Hash className="h-3.5 w-3.5" />Invoice No.</span>
                                            <span className="text-xs font-semibold text-gray-900">{invoice.invoice_number}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs text-gray-900"><CalendarDays className="h-3.5 w-3.5" />Issued</span>
                                            <span className="text-xs font-semibold text-gray-900">{new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs text-gray-900"><CalendarDays className="h-3.5 w-3.5" />Due Date</span>
                                            <span className={`text-xs font-semibold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>{new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs text-gray-900">Status</span>
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${invoice.status === 'paid' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                                                invoice.status === 'partial_paid' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20' :
                                                    isOverdue ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                                                        'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                                                }`}>
                                                {invoice.status === 'paid' ? 'Paid' : invoice.status === 'partial_paid' ? 'Partial Paid' : isOverdue ? 'Overdue' : 'Unpaid'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Items table */}
                            {invoice.line_items && invoice.line_items.length > 0 && (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-6 py-3.5 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-bold text-gray-900">Services & Items</p>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Description</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900">Qty</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900">Rate</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoice.line_items.map((item: any, index: number) => (
                                                <tr key={index} className={`border-b border-gray-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
                                                    <td className="px-6 py-4">
                                                        <span className="font-medium text-gray-900 text-sm">{item.description}</span>
                                                        {item.type === 'time' && <span className="ml-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">Time Sheet</span>}
                                                        {item.type === 'expense' && <span className="ml-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">Expense</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-right text-sm font-mono text-gray-900">{formatAmount(item.rate)}</td>
                                                    <td className="px-6 py-4 text-right text-sm font-semibold font-mono text-gray-900">{formatAmount(item.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Summary */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-5 bg-gray-100 dark:bg-gray-800 flex justify-end">
                                        <div className="w-64 space-y-2.5">
                                            {(() => {
                                                const subtotal = invoice.line_items?.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;
                                                const taxAmount = parseFloat(invoice.tax_amount) || 0;
                                                const grandTotal = parseFloat(invoice.total_amount) || subtotal + taxAmount;
                                                const paidAmount = (grandTotal - remainingAmount) || 0;
                                                return (
                                                    <>
                                                        <div className="flex justify-between text-xs text-gray-900">
                                                            <span>Subtotal</span>
                                                            <span className="font-medium font-mono text-gray-700">{formatAmount(subtotal)}</span>
                                                        </div>
                                                        {taxAmount > 0 && (
                                                            <div className="flex justify-between text-xs text-gray-900">
                                                                <span>Tax</span>
                                                                <span className="font-medium font-mono text-gray-700">{formatAmount(taxAmount)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-sm font-bold text-gray-900 pt-2.5 border-t border-gray-200">
                                                            <span>Total</span>
                                                            <span className="font-mono">{formatAmount(grandTotal)}</span>
                                                        </div>
                                                        {paidAmount > 0 && (
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-900">Paid</span>
                                                                <span className="font-semibold font-mono text-green-600">{formatAmount(paidAmount)}</span>
                                                            </div>
                                                        )}
                                                        {remainingAmount > 0 && (
                                                            <div className="flex justify-between items-center bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1">
                                                                <span className="text-xs font-semibold text-red-700">Balance Due</span>
                                                                <span className="text-sm font-bold font-mono text-red-700">{formatAmount(remainingAmount)}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment History */}
                            {invoice.payments && invoice.payments.length > 0 && (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-6 py-3.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-bold text-gray-900">Payment History</p>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Method</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoice.payments.map((payment: any, index: number) => (
                                                <tr key={index} className={`border-b border-gray-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
                                                    <td className="px-6 py-3.5 text-xs text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-3.5 text-xs text-gray-900 capitalize">{payment.payment_method}</td>
                                                    <td className="px-6 py-3.5 text-right text-xs font-semibold font-mono text-gray-900">{formatAmount(payment.amount)}</td>
                                                    <td className="px-6 py-3.5">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>

            {/* Payment Gateway Selection Modal */}
            <Dialog open={showGatewayModal} onOpenChange={setShowGatewayModal}>
                <DialogContent className="max-w-md max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="text-center">Pay Invoice #{invoice.invoice_number}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-primary">Invoice #{invoice.invoice_number}</span>
                                <span className="font-mono text-primary">{formatAmount(invoice.total_amount)}</span>
                            </div>
                            <div className="text-xs mt-1 text-primary/70">{invoice.client?.name}</div>
                            <div className="text-xs mt-1 text-primary/70">Remaining: <span className="font-mono">{formatAmount(remainingAmount)}</span></div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Amount</label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={remainingAmount}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                placeholder="Enter amount to pay"
                                className="w-full"
                            />
                            <div className="flex gap-2 mt-2">
                                <Button variant="outline" size="sm" onClick={() => setPaymentAmount(remainingAmount / 2)}>50%</Button>
                                <Button variant="outline" size="sm" onClick={() => setPaymentAmount(remainingAmount)}>Full Amount</Button>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-3 block">Select Payment Method</label>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {gatewaysWithIcons.map((gateway, index) => (
                                    <Card
                                        key={`${gateway.id}-${index}`}
                                        className={`cursor-pointer transition-colors ${selectedGateway === gateway.id ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}
                                        onClick={() => setSelectedGateway(gateway.id)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="text-primary">{gateway.icon}</div>
                                                <span className="font-medium">{gateway.name}</span>
                                                {selectedGateway === gateway.id && (
                                                    <Badge variant="secondary" className="ml-auto">
                                                        {t('Selected')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    try { setShowGatewayModal(false); }
                                    catch (error) { toast.error('An error occurred. Please refresh the page.'); }
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    try {
                                        if (!selectedGateway) { toast.error('Please select a payment method first.'); return; }
                                        if (!paymentAmount || paymentAmount <= 0) { toast.error('Please enter a valid payment amount.'); return; }
                                        if (paymentAmount > remainingAmount) { toast.error('Payment amount cannot exceed remaining balance.'); return; }
                                        setShowGatewayModal(false);
                                        setShowPaymentModal(true);
                                    } catch (error) { toast.error('Failed to process payment. Please try again.'); }
                                }}
                                disabled={!selectedGateway || !paymentAmount || paymentAmount <= 0}
                            >
                                Pay <span className="font-mono">{formatAmount(paymentAmount)}</span>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Payment Modals */}
            {renderPaymentModal()}
        </>
    );
}
