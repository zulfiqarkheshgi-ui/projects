<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoicePaymentController extends Controller
{
    public function show($token, Request $request)
    {
        // Handle Iyzipay POST callback first
        if ($request->isMethod('post') && $request->has('token')) {
            return $this->handleIyzipayCallback($token, $request);
        }

        return $this->showPaymentPage($token, $request);
    }

    private function handleIyzipayCallback($token, Request $request)
    {
        try {
            $iyzipayToken = $request->input('token');
            $invoice = Invoice::where('payment_token', $token)->firstOrFail();

            $paymentSettings = PaymentSetting::where('user_id', $invoice->created_by)
                ->whereIn('key', ['iyzipay_public_key', 'iyzipay_secret_key', 'iyzipay_mode'])
                ->pluck('value', 'key')
                ->toArray();

            $options = new \Iyzipay\Options();
            $options->setApiKey($paymentSettings['iyzipay_public_key']);
            $options->setSecretKey($paymentSettings['iyzipay_secret_key']);
            $options->setBaseUrl($paymentSettings['iyzipay_mode'] === 'live' ? 'https://api.iyzipay.com' : 'https://sandbox-api.iyzipay.com');

            $retrieveRequest = new \Iyzipay\Request\RetrieveCheckoutFormRequest();
            $retrieveRequest->setToken($iyzipayToken);
            $paymentResult = \Iyzipay\Model\CheckoutForm::retrieve($retrieveRequest, $options);

            if ($paymentResult && $paymentResult->getPaymentStatus() === 'SUCCESS') {
                $invoice->createPaymentRecord($paymentResult->getPaidPrice(), 'iyzipay', $paymentResult->getPaymentId());
                return redirect()->route('invoice.payment', $token)->with('success', 'Payment completed successfully!');
            }

            return redirect()->route('invoice.payment', $token)->with('error', 'Payment verification failed');
        } catch (\Exception $e) {
            return redirect()->route('invoice.payment', $token)->with('error', 'Payment processing failed');
        }
    }

    private function showPaymentPage($token, Request $request)
    {
        $invoice = Invoice::where('payment_token', $token)
            ->with(['client', 'case', 'creator'])
            ->firstOrFail();

        // Get company information
        $company = \App\Models\User::where('id', $invoice->created_by)
            ->where('type', 'company')
            ->select('id', 'name', 'email')
            ->first();

        // Get favicon and app name from settings table
        $settings = \App\Models\Setting::where('user_id', $invoice->created_by)
            ->whereIn('key', ['favicon', 'app_name'])
            ->pluck('value', 'key')
            ->toArray();

        $favicon = $settings['favicon'] ?? null;
        $appName = $settings['app_name'] ?? 'Advocate Saas';

        // Handle success/error parameters from Iyzipay callback
        if ($request->has('success')) {
            session()->flash('success', 'Payment completed successfully!');
        } elseif ($request->has('error')) {
            session()->flash('error', 'Payment processing failed');
        }

        // Generic payment callback handler removed - all payments use their own controllers

        // Always show payment page, even if paid (to show updated status)

        $enabledGateways = $this->getEnabledPaymentGateways($invoice->created_by);

        // Load client billing info and currencies (no permission check for public payment page)
        $clientBillingInfo = \App\Models\ClientBillingInfo::select('client_id', 'currency')
            ->get()
            ->keyBy('client_id');
        $currencies = \App\Models\ClientBillingCurrency::where('status', true)
            ->select('id', 'name', 'code', 'symbol')
            ->get();

        // Get PayPal settings for frontend
        $paypalSettings = getPaymentMethodConfig('paypal', $invoice->created_by);

        // Get payment gateway settings for frontend
        $paymentSettings = PaymentSetting::where('user_id', $invoice->created_by)
            ->pluck('value', 'key')
            ->toArray();

        // Get company currency setting
        $companyCurrency = \App\Models\Setting::where('user_id', $invoice->created_by)
            ->where('key', 'currency')
            ->value('value');

        // Get currency details if company currency is set
        $defaultCurrency = null;
        if ($companyCurrency) {
            $defaultCurrency = \App\Models\ClientBillingCurrency::where('code', $companyCurrency)
                ->orWhere('id', $companyCurrency)
                ->select('id', 'name', 'code', 'symbol')
                ->first();
        }

        $themeColor = getSetting('themeColor','#3b82f6',getCompanyId($invoice->created_by));
        if($themeColor=='custom'){
            $themeColor= getSetting('customColor','#3b82f6',getCompanyId($invoice->created_by));
        }

        return Inertia::render('invoice/payment', [
            'invoice' => $invoice,
            'themeColor' => $themeColor,
            'enabledGateways' => $enabledGateways,
            'remainingAmount' => $invoice->remaining_amount,
            'clientBillingInfo' => $clientBillingInfo,
            'currencies' => $currencies,
            'defaultCurrency' => $defaultCurrency,
            'paypalClientId' => $paypalSettings['client_id'] ?? null,
            'flutterwavePublicKey' => $paymentSettings['flutterwave_public_key'] ?? null,
            'tapPublicKey' => $paymentSettings['tap_secret_key'] ?? null,
            'paystackPublicKey' => $paymentSettings['paystack_public_key'] ?? null,
            'company' => $company,
            'favicon' => $favicon,
            'appName' => $appName
        ]);
    }

    public function processPayment(Request $request, $token)
    {
        $invoice = Invoice::where('payment_token', $token)->firstOrFail();

        $maxAmount = $invoice->remaining_amount ?: $invoice->total_amount;

        $request->validate([
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01|max:' . $maxAmount
        ]);

        // Ensure amount doesn't exceed remaining balance
        if ($request->amount > $maxAmount) {
            return back()->withErrors(['amount' => 'Payment amount cannot exceed remaining balance of ' . $maxAmount]);
        }

        // Add invoice context to request
        $request->merge([
            'invoice_id' => $invoice->id,
            'invoice_token' => $token,
            'type' => 'invoice'
        ]);

        $paymentMethod = $request->payment_method;

        // Call specific invoice payment methods
        $controllerMap = [
            'bank' => '\App\Http\Controllers\BankPaymentController',
            'stripe' => '\App\Http\Controllers\StripePaymentController',
            'paypal' => '\App\Http\Controllers\PayPalPaymentController',
            'razorpay' => '\App\Http\Controllers\RazorpayController',
            'paystack' => '\App\Http\Controllers\PaystackPaymentController',
            'flutterwave' => '\App\Http\Controllers\FlutterwavePaymentController',
            'paytabs' => '\App\Http\Controllers\PayTabsPaymentController',
            'skrill' => '\App\Http\Controllers\SkrillPaymentController',
            'coingate' => '\App\Http\Controllers\CoinGatePaymentController',
            'payfast' => '\App\Http\Controllers\PayfastPaymentController',
            'tap' => '\App\Http\Controllers\TapPaymentController',
            'xendit' => '\App\Http\Controllers\XenditPaymentController',
            'paytr' => '\App\Http\Controllers\PayTRPaymentController',
            'mollie' => '\App\Http\Controllers\MolliePaymentController',
            'toyyibpay' => '\App\Http\Controllers\ToyyibPayPaymentController',
            'iyzipay' => '\App\Http\Controllers\IyzipayPaymentController',
            'benefit' => '\App\Http\Controllers\BenefitPaymentController',
            'ozow' => '\App\Http\Controllers\OzowPaymentController',
            'easebuzz' => '\App\Http\Controllers\EasebuzzPaymentController',
            'authorizenet' => '\App\Http\Controllers\AuthorizeNetPaymentController',
            'fedapay' => '\App\Http\Controllers\FedaPayPaymentController',
            'payhere' => '\App\Http\Controllers\PayHerePaymentController',
            'cinetpay' => '\App\Http\Controllers\CinetPayPaymentController',
            'paiement' => '\App\Http\Controllers\PaiementPaymentController',
            'yookassa' => '\App\Http\Controllers\YooKassaPaymentController',
            'aamarpay' => '\App\Http\Controllers\AamarpayPaymentController',
            'midtrans' => '\App\Http\Controllers\MidtransPaymentController',
            'cashfree' => '\App\Http\Controllers\CashfreeController',
            'khalti' => '\App\Http\Controllers\KhaltiPaymentController',
            'nepalste' => '\App\Http\Controllers\NepalstePaymentController'

        ];

        if (!isset($controllerMap[$paymentMethod])) {
            return back()->withErrors(['error' => 'Payment method not supported']);
        }

        try {
            $controller = app($controllerMap[$paymentMethod]);
            return $controller->processInvoicePayment($request);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return back()->withErrors(['error' => __('Invoice not found. Please check the link and try again.')]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => __('Payment processing failed. Please try again or contact support.')]);
        }
    }
    public function success($token)
    {
        $invoice = Invoice::where('payment_token', $token)
            ->with(['client', 'payments'])
            ->firstOrFail();

        return Inertia::render('invoice/payment-success', [
            'invoice' => $invoice,
            'message' => session('success')
        ]);
    }

    private function getEnabledPaymentGateways($invoiceCreatorId = null)
    {
        if (!$invoiceCreatorId) {
            return [];
        }

        // Get company-specific payment settings only
        $settings = PaymentSetting::where('user_id', getCompanyId($invoiceCreatorId))->pluck('value', 'key')->toArray();

        $gateways = [];
        $paymentGateways = [
            'bank' => ['name' => 'Bank Transfer', 'icon' => '🏦'],
            'stripe' => ['name' => 'Credit Card (Stripe)', 'icon' => '💳'],
            'paypal' => ['name' => 'PayPal', 'icon' => '🅿️'],
            'razorpay' => ['name' => 'Razorpay', 'icon' => '💰'],
            'mercadopago' => ['name' => 'MercadoPago', 'icon' => '💳'],
            'paystack' => ['name' => 'Paystack', 'icon' => '🅿️'],
            'flutterwave' => ['name' => 'Flutterwave', 'icon' => '💳'],
            'paytabs' => ['name' => 'Paytabs', 'icon' => '🅿️'],
            'skrill' => ['name' => 'Skrill', 'icon' => '💳'],
            'coingate' => ['name' => 'Coin Gate', 'icon' => '💳'],
            'payfast' => ['name' => 'Pay Fast', 'icon' => '🅿️'],
            'tap' => ['name' => 'Tap', 'icon' => '💳'],
            'xendit' => ['name' => 'Xendit', 'icon' => '💳'],
            'paytr' => ['name' => 'PayTR', 'icon' => '🅿️'],
            'mollie' => ['name' => 'Mollie', 'icon' => '💳'],
            'toyyibpay' => ['name' => 'Toyyib Pay', 'icon' => '💳'],
            'iyzipay' => ['name' => 'Iyzipay', 'icon' => '💳'],
            'benefit' => ['name' => 'Benefit', 'icon' => '💳'],
            'ozow' => ['name' => 'Ozow', 'icon' => '💳'],
            'easebuzz' => ['name' => 'Easebuzz', 'icon' => '💳'],
            'authorizenet' => ['name' => 'Authorize.net', 'icon' => '💳'],
            'payhere' => ['name' => 'Pay Here', 'icon' => '🅿️'],
            'cinetpay' => ['name' => 'Cinet Pay', 'icon' => '💳'],
            'paiement' => ['name' => 'Paiement Pro', 'icon' => '🅿️'],
            'yookassa' => ['name' => 'Yoo Kassa', 'icon' => '💳'],
            'aamarpay' => ['name' => 'Aamar Pay', 'icon' => '💳'],
            'midtrans' => ['name' => 'Midtrans', 'icon' => '💳'],
            'cashfree' => ['name' => 'Cashfree', 'icon' => '💳'],
            'khalti' => ['name' => 'Khalti', 'icon' => '💳'],
            'fedapay' =>['name'=> 'Fedapay', 'icon' => '💳'],

        ];

        foreach ($paymentGateways as $key => $config) {
            $enabledKey = "is_{$key}_enabled";
            if (($settings[$enabledKey] ?? '0') === '1') {
                $gateways[] = [
                    'id' => $key,
                    'name' => $config['name'],
                    'icon' => $config['icon']
                ];
            }
        }

        return $gateways;
    }
}

