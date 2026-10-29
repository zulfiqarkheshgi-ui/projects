<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MercadoPagoController extends Controller
{
    private const BASE_URL = 'https://api.mercadopago.com';

    private function getMercadoPagoCredentials(): array
    {
        $settings = getPaymentGatewaySettings();

        return [
            'access_token' => $settings['payment_settings']['mercadopago_access_token'] ?? null,
            'mode'         => $settings['payment_settings']['mercadopago_mode'] ?? 'sandbox',
            'currency'     => $settings['general_settings']['defaultCurrency'] ?? '',
        ];
    }

    private function createPreferenceRequest(string $accessToken, array $data): array
    {
        $response = Http::withToken($accessToken)
            ->timeout(30)
            ->post(self::BASE_URL . '/checkout/preferences', $data);

        if ($response->successful()) {
            return ['success' => true, 'data' => $response->json()];
        }

        return $this->handleApiError($response);
    }

    private function handleApiError($response): array
    {
        $status = $response->status();
        $body   = $response->json() ?? [];

        $message = match (true) {
            $status === 401 => __('Invalid MercadoPago access token.'),
            $status === 400 => $body['message'] ?? collect($body['cause'] ?? [])->pluck('description')->implode(', ') ?: __('Invalid request.'),
            $status === 404 => __('Resource not found.'),
            $status >= 500  => __('MercadoPago service is temporarily unavailable.'),
            default         => __('Something went wrong.'),
        };

        Log::error('MercadoPago API error', ['status' => $status, 'body' => $body]);

        return ['success' => false, 'error' => $message, 'status_code' => $status];
    }

    /**
     * Create a checkout preference for plan subscription
     */
    public function createPreference(Request $request)
    {
        $validated = validatePaymentRequest($request);

        try {
            $plan        = Plan::findOrFail($validated['plan_id']);
            $pricing     = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);
            $credentials = $this->getMercadoPagoCredentials();

            if (!$credentials['access_token']) {
                throw new \Exception(__('MercadoPago API credentials not found'));
            }

            $externalReference = 'plan_' . $plan->id . '_' . auth()->id() . '_' . $validated['billing_cycle'];
            if (!empty($validated['coupon_code'])) {
                $externalReference .= '_coupon_' . $validated['coupon_code'];
            }

            $user   = auth()->user();
            $result = $this->createPreferenceRequest($credentials['access_token'], [
                'items' => [[
                    'title'       => 'Plan: ' . $plan->name . ' (' . $validated['billing_cycle'] . ')',
                    'quantity'    => 1,
                    'unit_price'  => (float) $pricing['final_price'],
                    'currency_id' => $credentials['currency'],
                ]],
                'back_urls' => [
                    'success' => route('mercadopago.success'),
                    'failure' => route('mercadopago.failure'),
                    'pending' => route('mercadopago.pending'),
                ],
                'auto_return'        => 'approved',
                'external_reference' => $externalReference,
                'payer' => [
                    'name'  => $user->name ?? '',
                    'email' => $user->email ?? '',
                ],
            ]);

            if (!$result['success']) {
                return $request->expectsJson()
                    ? response()->json(['error' => $result['error']], $result['status_code'] ?? 500)
                    : redirect()->back()->with('error', $result['error']);
            }

            $responseData = $result['data'];
            $redirectUrl  = $credentials['mode'] === 'live'
                ? ($responseData['init_point'] ?? '')
                : ($responseData['sandbox_init_point'] ?? '');

            if (!$redirectUrl) {
                throw new \Exception(__('MercadoPago redirect URL is not available'));
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'success'       => true,
                    'redirect_url'  => $redirectUrl,
                    'preference_id' => $responseData['id'] ?? null,
                    'mode'          => $credentials['mode'],
                ]);
            }

            return redirect($redirectUrl);
        } catch (\Exception $e) {
            Log::error('MercadoPago createPreference error', ['message' => $e->getMessage()]);
            if ($request->expectsJson()) {
                return response()->json(['error' => $e->getMessage()], 500);
            }
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Handle successful plan payment callback
     */
    public function success(Request $request)
    {
        try {
            $paymentId         = $request->payment_id;
            $externalReference = $request->external_reference;

            if (!$externalReference) {
                return redirect()->route('plans.index')->with('error', __('Invalid payment reference'));
            }

            // Parse: plan_{planId}_{userId}_{billingCycle}[_coupon_{code}]
            $parts        = explode('_', $externalReference);
            $planId       = (int) ($parts[1] ?? 0);
            $userId       = (int) ($parts[2] ?? 0);
            $billingCycle = $parts[3] ?? 'monthly';
            $couponCode   = (isset($parts[4]) && $parts[4] === 'coupon') ? ($parts[5] ?? null) : null;

            if (!$planId) {
                return redirect()->route('plans.index')->with('error', __('Invalid payment reference format'));
            }

            if ($userId !== auth()->id()) {
                return redirect()->route('plans.index')->with('error', __('Unauthorized payment reference'));
            }

            if (!Plan::find($planId)) {
                return redirect()->route('plans.index')->with('error', __('Plan not found'));
            }

            // Verify payment status via API if payment_id is present
            if ($paymentId) {
                $credentials = $this->getMercadoPagoCredentials();
                $response    = Http::withToken($credentials['access_token'])
                    ->timeout(30)
                    ->get(self::BASE_URL . "/v1/payments/{$paymentId}");

                if ($response->successful() && ($response->json()['status'] ?? '') !== 'approved') {
                    return redirect()->route('plans.index')->with('error', __('Payment was not approved.'));
                }
            }

            processPaymentSuccess([
                'user_id'        => $userId,
                'plan_id'        => $planId,
                'billing_cycle'  => $billingCycle,
                'payment_method' => 'mercadopago',
                'coupon_code'    => $couponCode,
                'payment_id'     => $paymentId,
            ]);

            return redirect()->route('plans.index')
                ->with('success', __('Payment successful! Your subscription has been activated.'));
        } catch (\Exception $e) {
            return redirect()->route('plans.index')
                ->with('error', __('Failed to process payment: :message', ['message' => $e->getMessage()]));
        }
    }

    /**
     * Handle failed plan payment
     */
    public function failure(Request $request)
    {
        return redirect()->route('plans.index')->with('error', __('Payment failed. Please try again.'));
    }

    /**
     * Handle pending plan payment
     */
    public function pending(Request $request)
    {
        return redirect()->route('plans.index')
            ->with('info', __('Your payment is pending. We will notify you once it is confirmed.'));
    }

    /**
     * Handle MercadoPago webhook notifications
     */
    public function webhook(Request $request)
    {
        return response()->json(['status' => 'success']);
    }

    /**
     * Process direct card payment for plan
     */
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'token'             => 'required|string',
            'payment_method_id' => 'required|string',
        ]);

        try {
            $plan        = Plan::findOrFail($validated['plan_id']);
            $pricing     = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);
            $credentials = $this->getMercadoPagoCredentials();

            if (!$credentials['access_token']) {
                throw new \Exception(__('MercadoPago API credentials not found'));
            }

            $response = Http::withToken($credentials['access_token'])
                ->timeout(30)
                ->post(self::BASE_URL . '/v1/payments', [
                    'transaction_amount' => (float) $pricing['final_price'],
                    'token'              => $validated['token'],
                    'description'        => 'Plan: ' . $plan->name,
                    'installments'       => 1,
                    'payment_method_id'  => $validated['payment_method_id'],
                    'payer'              => ['email' => auth()->user()->email],
                ]);

            if (!$response->successful()) {
                $error = $this->handleApiError($response);
                return response()->json(['success' => false, 'error' => $error['error']], 400);
            }

            $payment = $response->json();

            if (($payment['status'] ?? '') === 'approved') {
                processPaymentSuccess([
                    'user_id'        => auth()->id(),
                    'plan_id'        => $plan->id,
                    'billing_cycle'  => $validated['billing_cycle'],
                    'payment_method' => 'mercadopago',
                    'coupon_code'    => $validated['coupon_code'] ?? null,
                    'payment_id'     => $payment['id'],
                ]);

                return response()->json(['success' => true, 'message' => __('Payment successful! Your subscription has been activated.')]);
            }

            if (in_array($payment['status'] ?? '', ['in_process', 'pending'])) {
                return response()->json(['success' => true, 'status' => 'pending', 'message' => __('Your payment is being processed.')]);
            }

            return response()->json(['success' => false, 'error' => __('Payment failed: :status', ['status' => $payment['status_detail'] ?? 'unknown'])], 400);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a checkout preference for invoice payment
     */
    public function createInvoicePreference(Request $request)
    {
        $request->validate([
            'invoice_token' => 'required|string',
            'amount'        => 'required|numeric|min:0.01',
        ]);

        try {
            $invoice         = Invoice::where('payment_token', $request->invoice_token)->firstOrFail();
            $paymentSettings = $invoice->getPaymentSettings('mercadopago');

            if (empty($paymentSettings['mercadopago_access_token']) || $paymentSettings['is_mercadopago_enabled'] !== '1') {
                return response()->json(['error' => 'MercadoPago payment not configured'], 400);
            }

            $accessToken = $paymentSettings['mercadopago_access_token'];
            $mode        = $paymentSettings['mercadopago_mode'] ?? 'sandbox';

            $result = $this->createPreferenceRequest($accessToken, [
                'items' => [[
                    'title'      => 'Invoice #' . $invoice->invoice_id,
                    'quantity'   => 1,
                    'unit_price' => (float) $request->amount,
                ]],
                'back_urls' => [
                    'success' => route('invoice.mercadopago.success', ['invoice_token' => $request->invoice_token]),
                    'failure' => route('invoice.mercadopago.failure', ['invoice_token' => $request->invoice_token]),
                    'pending' => route('invoice.mercadopago.pending', ['invoice_token' => $request->invoice_token]),
                ],
                'auto_return'        => 'all',
                'external_reference' => 'invoice_' . $invoice->id . '_' . $request->invoice_token,
            ]);

            if (!$result['success']) {
                return response()->json(['error' => $result['error']], $result['status_code'] ?? 500);
            }

            $responseData = $result['data'];
            $redirectUrl  = $mode === 'live'
                ? ($responseData['init_point'] ?? '')
                : ($responseData['sandbox_init_point'] ?? '');

            return response()->json([
                'success'       => true,
                'redirect_url'  => $redirectUrl,
                'preference_id' => $responseData['id'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('MercadoPago createInvoicePreference error', ['message' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle successful invoice payment callback
     */
    public function InvoiceSuccess(Request $request)
    {
        try {
            $invoiceToken      = $request->invoice_token ?? $request->query('invoice_token');
            $paymentId         = $request->payment_id;
            $externalReference = $request->external_reference;

            if (!$invoiceToken && $externalReference) {
                $parts        = explode('_', $externalReference, 3);
                $invoiceToken = $parts[2] ?? null;
            }

            if (!$invoiceToken) {
                return redirect()->route('dashboard')->with('error', __('Invalid payment reference'));
            }

            $invoice = Invoice::where('payment_token', $invoiceToken)->firstOrFail();
            $invoice->createPaymentRecord(
                $invoice->remaining_amount,
                'mercadopago',
                $paymentId ?? ('mp_' . time())
            );

            return redirect()->route('invoice.payment', $invoiceToken)
                ->with('success', __('Payment successful! Your invoice has been paid.'));
        } catch (\Exception $e) {
            return redirect()->route('dashboard')
                ->with('error', __('Failed to process payment: :message', ['message' => $e->getMessage()]));
        }
    }

    /**
     * Handle failed invoice payment callback
     */
    public function InvoiceFailure(Request $request)
    {
        $invoiceToken = $request->invoice_token ?? $request->query('invoice_token');

        return $invoiceToken
            ? redirect()->route('invoice.payment', $invoiceToken)->with('error', __('Payment failed. Please try again.'))
            : redirect()->route('dashboard')->with('error', __('Payment failed. Please try again.'));
    }

    /**
     * Handle pending invoice payment callback
     */
    public function InvoicePending(Request $request)
    {
        $invoiceToken = $request->invoice_token ?? $request->query('invoice_token');

        return $invoiceToken
            ? redirect()->route('invoice.payment', $invoiceToken)->with('info', __('Your payment is pending. We will notify you once it is confirmed.'))
            : redirect()->route('dashboard')->with('info', __('Your payment is pending. We will notify you once it is confirmed.'));
    }

    /**
     * Process invoice payment record after MercadoPago callback
     */
    public function processInvoicePayment(Request $request)
    {
        $request->validate([
            'invoice_token' => 'required|string',
            'amount'        => 'required|numeric|min:0.01',
            'payment_id'    => 'required|string',
        ]);

        try {
            $invoice = Invoice::where('payment_token', $request->invoice_token)->firstOrFail();
            $invoice->createPaymentRecord($request->amount, 'mercadopago', $request->payment_id);

            return redirect()->route('invoice.payment', $invoice->payment_token);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Payment processing failed: ' . $e->getMessage()]);
        }
    }
}
