<?php

namespace App\Http\Controllers;
use App\Models\Payment;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-payments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = Payment::with(['invoice.client', 'invoice.client.user', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-payments')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-payments')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('invoice.client', function ($cq) {
                        $cq->where('user_id', Auth::id());
                    })
                    ->orWhereHas('invoice.case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('invoice', function ($invoiceQuery) use ($request) {
                    $invoiceQuery->where('invoice_number', 'like', '%' . $request->search . '%')
                        ->orWhereHas('client', function ($clientQuery) use ($request) {
                            $clientQuery->where('name', 'like', '%' . $request->search . '%');
                        });
                });
            });
        }

        if ($request->filled('payment_method') && $request->payment_method !== '_empty_') {
            $allowedMethods = ['cash', 'check', 'credit_card', 'bank', 'online'];
            if (in_array($request->payment_method, $allowedMethods)) {
                $query->where('payment_method', $request->payment_method);
            }
        }

        if ($request->filled('invoice_id') && $request->invoice_id !== '_empty_') {
            $query->where('invoice_id', $request->invoice_id);
        }

        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $payments = $query->orderBy('payment_date', 'desc')->paginate($perPage)->withQueryString();

        $invoiceQuery = Invoice::where(function ($q) {
            if (Auth::user()->can('manage-any-invoices')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-invoices')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('client', function ($cq) {
                        $cq->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        })->with('client')->select('id', 'invoice_number', 'client_id', 'total_amount');

        $allInvoices = (clone $invoiceQuery)->get()->each->append('remaining_amount');
        $invoices = (clone $invoiceQuery)->whereNotIn('status', ['paid', 'cancelled'])->get()->each->append('remaining_amount');

        return Inertia::render('billing/payments/index', [
            'payments' => $payments,
            'invoices' => $invoices,
            'allInvoices' => $allInvoices,
            'filters' => $request->only(['search', 'payment_method', 'invoice_id', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-payments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $invoice = Invoice::where('id', $request->invoice_id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-invoices')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-invoices')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->firstOrFail();
        $maxAmount = $invoice->remaining_amount ?: $invoice->total_amount;

        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01|max:' . $maxAmount,
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        Payment::create([
            'created_by' => Auth::id(),
            'invoice_id' => $request->invoice_id,
            'payment_method' => $request->payment_method,
            'amount' => $request->amount,
            'payment_date' => $request->payment_date,
            'notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Payment recorded successfully.');
    }

    public function update(Request $request, Payment $payment)
    {
        if (!Auth::user()->can('edit-payments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $invoice = Invoice::where('id', $request->invoice_id)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-invoices')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-invoices')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->firstOrFail();
        $otherPayments = $invoice->payments()->where('id', '!=', $payment->id)->sum('amount');
        $maxAmount = $invoice->total_amount - $otherPayments;

        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01|max:' . $maxAmount,
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $payment->update([
            'invoice_id' => $request->invoice_id,
            'payment_method' => $request->payment_method,
            'amount' => $request->amount,
            'payment_date' => $request->payment_date,
            'notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Payment updated successfully.');
    }

    public function approvePayment(Request $request, $paymentId)
    {
        if (!Auth::user()->can('approve-payments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $payment = Payment::where('id', $paymentId)
            ->where('status', 'pending')
            ->whereHas('invoice', function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->firstOrFail();

        $payment->update(['status' => 'completed']);
        $payment->invoice->updatePaymentStatus();

        return redirect()->back()->with('success', __('Payment approved successfully.'));
    }

    public function rejectPayment(Request $request, $paymentId)
    {
        if (!Auth::user()->can('reject-payments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $payment = Payment::where('id', $paymentId)
            ->where('status', 'pending')
            ->whereHas('invoice', function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->firstOrFail();

        $payment->update(['status' => 'rejected']);

        return redirect()->back()->with('success', __('Payment rejected successfully.'));
    }

    public function destroy(Payment $payment)
    {
        if (!Auth::user()->can('delete-payments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $payment->delete();
        return redirect()->back()->with('success', 'Payment deleted successfully.');
    }
}
