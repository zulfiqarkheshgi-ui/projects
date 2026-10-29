<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\Setting;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;

class BankPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'amount' => 'required|numeric|min:0',
            'receipt' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);

            $receiptPath = null;
            if ($request->hasFile('receipt') && !IsDemo()) {
                $file = $request->file('receipt');
                $fileNameToStore = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '_' . time() . '.' . $file->getClientOriginalExtension();
                $upload = upload_file($request, 'receipt', $fileNameToStore, 'bank-receipts');
                if ($upload['status'] == true) {
                    $receiptPath = $upload['url'];
                }
            }

            createPlanOrder([
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'bank',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => 'BANK_' . strtoupper(uniqid()),
                'status' => 'pending',
                'receipt_path' => $receiptPath,
            ]);

            return back()->with('success', __('Payment request submitted. Your plan will be activated after payment verification.'));
        } catch (\Exception $e) {
            return handlePaymentError($e, 'bank');
        }
    }

    public function processInvoicePayment(Request $request)
    {
        try {
            $request->validate([
                'invoice_token' => 'required|string',
                'amount' => 'required|numeric|min:0',
                'receipt' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);

            $invoice = Invoice::where('payment_token', $request->invoice_token)->firstOrFail();

            $receiptPath = null;
            if ($request->hasFile('receipt') && !IsDemo()) {
                $file = $request->file('receipt');
                $fileNameToStore = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '_' . time() . '.' . $file->getClientOriginalExtension();
                $upload = upload_file($request, 'receipt', $fileNameToStore, 'bank-receipts');
                if ($upload['status'] == true) {
                    $receiptPath = $upload['url'];
                }
            }

            Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $request->amount,
                'payment_method' => 'bank',
                'payment_date' => now(),
                'status' => 'pending',
                'receipt_path' => $receiptPath,
                'created_by' => $invoice->created_by,
            ]);

            return redirect()->route('invoice.payment', $invoice->payment_token)
                ->with('success', __('Payment request submitted. Invoice will be marked as paid after payment verification.'));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return back()->withErrors(['error' => __('Invoice not found. Please check the link and try again.')]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => __('Payment request failed. Please try again or contact support.')]);
        }
    }
}
