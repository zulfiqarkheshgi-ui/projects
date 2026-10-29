<?php

namespace App\Http\Controllers;

use App\Events\NewInvoiceCreated;
use App\Events\InvoiceSent;
use App\Models\Invoice;
use App\Models\Client;
use App\Models\Expense;
use App\Models\TimeEntry;
use App\Models\ClientBillingInfo;
use App\Services\EmailTemplateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

use Inertia\Inertia;

class InvoiceController extends BaseController
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-invoices')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = Invoice::with(['client', 'client.user', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-invoices')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-invoices')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('client', function ($clientQuery) {
                        $clientQuery->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('invoice_number', 'like', '%' . $request->search . '%')
                    ->orWhereHas('client', function ($clientQuery) use ($request) {
                        $clientQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['draft', 'sent', 'paid', 'partial_paid', 'overdue', 'cancelled'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('client_id') && $request->client_id !== '_empty_') {
            $query->where('client_id', $request->client_id);
        }

        $allowedSortFields = ['invoice_number', 'invoice_date'];
        $sortField = $request->input('sort_field', 'invoice_date');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'invoice_date';
        }

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $invoices = $query->paginate($perPage)->withQueryString();
        $clients = Client::select('id', 'name')
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-clients')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-clients')) {
                    $q->where('created_by', Auth::id())
                        ->orWhere('user_id', Auth::id())
                        ->orWhereHas('cases.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->get();

        return Inertia::render('billing/invoices/index', [
            'invoices' => $invoices,
            'clients' => $clients,
            'filters' => $request->only(['search', 'status', 'client_id', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function create()
    {
        if (!Auth::user()->can('create-invoices')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $clients = Client::query()
            ->select('id', 'name', 'tax_rate')
            ->when(Auth::user()->can('manage-any-clients'), function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->when(Auth::user()->can('manage-own-clients') && !Auth::user()->can('manage-any-clients'), function ($q) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            })
            ->active()
            ->orderBy('name')
            ->get();
        $cases = \App\Models\CaseModel::active()
            ->with('client:id,name')
            ->when(Auth::user()->can('manage-any-cases'), function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->when(Auth::user()->can('manage-own-cases') && !Auth::user()->can('manage-any-cases'), function ($q) {
                $q->where('created_by', Auth::id());
            })
            ->whereHas('timeEntries', function ($q) {
                $q->where('is_billable', true)->whereNull('invoice_id');
            })
            ->select('id', 'title', 'client_id')
            ->get();
        $templates = \App\Models\EmailTemplate::select('id', 'name')->get();
        $currencies = \App\Models\ClientBillingCurrency::query()
            ->where('status', true)
            ->when(Auth::user()->can('manage-any-client-billing-currencies'), function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->when(Auth::user()->can('manage-own-client-billing-currencies') && !Auth::user()->can('manage-any-client-billing-currencies'), function ($q) {
                $q->where('created_by', Auth::id());
            })
            ->select('id', 'name', 'code', 'symbol')
            ->get();
        $timeEntries = \App\Models\TimeEntry::query()
            ->with('case.client:id,name')
            ->where('is_billable', true)
            ->whereNull('invoice_id')
            ->when(Auth::user()->can('manage-any-time-entries'), function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->when(Auth::user()->can('manage-own-time-entries') && !Auth::user()->can('manage-any-time-entries'), function ($q) {
                $q->where('created_by', Auth::id());
            })
            ->get();
        $expenses = \App\Models\Expense::query()
            ->with('category')
            ->unbilled()
            ->when(Auth::user()->can('manage-any-expenses'), function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->when(Auth::user()->can('manage-own-expenses') && !Auth::user()->can('manage-any-expenses'), function ($q) {
                $q->where('created_by', Auth::id());
            })
            ->get();

        // Load client billing info
        $clientBillingInfo = ClientBillingInfo::query()
            ->select('client_id', 'payment_terms', 'custom_payment_terms', 'currency')
            ->when(Auth::user()->can('manage-any-client-billing'), function ($q) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            })
            ->when(Auth::user()->can('manage-own-client-billing') && !Auth::user()->can('manage-any-client-billing'), function ($q) {
                $q->where('created_by', Auth::id());
            })
            ->get()
            ->keyBy('client_id');

        return Inertia::render('billing/invoices/create', [
            'clients' => $clients,
            'cases' => $cases,
            'templates' => $templates,
            'currencies' => $currencies,
            'timeEntries' => $timeEntries,
            'expenses' => $expenses,
            'clientBillingInfo' => $clientBillingInfo
        ]);
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['client.user', 'case', 'payments']);

        // Get all payments for this invoice
        $payments = $invoice->payments()->orderBy('payment_date', 'desc')->get();

        // Get all invoice items: line_items from JSON + linked time entries/expenses
        $invoiceItems = [];

        // Add line_items from JSON field (manually added items)
        if ($invoice->line_items) {
            foreach ($invoice->line_items as $item) {
                $invoiceItems[] = [
                    'id' => $item['id'] ?? null,
                    'type' => $item['type'] ?? 'manual',
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'rate' => $item['rate'],
                    'amount' => $item['amount'],
                    'expense_date' => $item['expense_date'] ?? null,
                    'entry_date' => $item['entry_date'] ?? null
                ];
            }
        }

        // Add linked time entries and expenses
        // $linkedItemsResponse = $this->getCaseTimeEntries($invoice->case_id);
        // $linkedItems = $linkedItemsResponse->original->toArray();
        // $invoiceItems = array_merge($invoiceItems, $linkedItems);

        // Load client billing info and currencies
        // $clientBillingInfo = ClientBillingInfo::withPermissionCheck()
        //     ->select('client_id', 'currency')
        //     ->get()
        //     ->keyBy('client_id');
        // $currencies = \App\Models\ClientBillingCurrency::where('status', true)
        //     ->select('id', 'name', 'code', 'symbol')
        //     ->get();

        return Inertia::render('billing/invoices/show', [
            'invoice' => $invoice,
            'invoiceItems' => $invoiceItems,
            'payments' => $payments,
        ]);
    }

    public function edit(Invoice $invoice)
    {
        $invoice->load(['client', 'case', 'emailTemplate', 'currency']);

        $clients = Client::active()->select('id', 'name', 'tax_rate')->get();
        $cases = \App\Models\CaseModel::active()->with('client:id,name')
            ->select('id', 'case_id', 'title', 'client_id')
            ->get();
        $templates = \App\Models\EmailTemplate::select('id', 'name')->get();
        // $currencies = \App\Models\ClientBillingCurrency::where('status', true)
        //     ->select('id', 'name', 'code', 'symbol')
        //     ->get();

        // Load client billing info
        // $clientBillingInfo = ClientBillingInfo::withPermissionCheck()
        //     ->select('client_id', 'currency')
        //     ->get()
        //     ->keyBy('client_id');

        return Inertia::render('billing/invoices/edit', [
            'clients' => $clients,
            'cases' => $cases,
            'templates' => $templates,
            // 'currencies' => $currencies,
            'invoice' => $invoice,
            // 'clientBillingInfo' => $clientBillingInfo
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-invoices')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        // // Only company users can create invoices
        // if (!auth()->user()->hasRole(['company', 'superadmin'])) {
        //     return redirect()->back()->with('error', 'Only company users can create invoices.');
        // }

        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'case_id' => 'nullable|integer',
            'email_template_id' => 'nullable|exists:email_templates,id',
            'currency_id' => 'nullable|exists:client_billing_currencies,id',
            'subtotal' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after:invoice_date',
            'notes' => 'nullable|string|max:1000',
            'line_items' => 'nullable|array',
            'line_items.*.description' => 'required|string',
            'line_items.*.quantity' => 'required|numeric|min:0',
            'line_items.*.rate' => 'required|numeric|min:0',
            'line_items.*.amount' => 'required|numeric|min:0',
        ]);

        $taxAmount = $request->tax_amount ?? 0;
        $subtotal = $request->subtotal ?? collect($request->line_items)->sum('amount');
        $totalAmount = $subtotal + $taxAmount;

        $invoice = DB::transaction(function () use ($request, $taxAmount, $subtotal, $totalAmount) {
            $invoice = Invoice::create([
                'created_by' => Auth::id(),
                'client_id' => $request->client_id,
                'case_id' => $request->case_id,
                'currency_id' => $request->currency_id,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'status' => 'draft',
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'notes' => $request->notes,
                'line_items' => $request->line_items,
            ]);

            $expenseIds = [];
            $timeEntryIds = [];

            if (is_array($request->line_items)) {
                foreach ($request->line_items as $line_item) {
                    if (isset($line_item['type'])) {
                        if ($line_item['type'] === 'expense') $expenseIds[] = $line_item['id'];
                        if ($line_item['type'] === 'time') $timeEntryIds[] = $line_item['id'];
                    }
                }
            }

            if (!empty($expenseIds)) Expense::whereIn('id', $expenseIds)->update(['invoice_id' => $invoice->id]);
            if (!empty($timeEntryIds)) TimeEntry::whereIn('id', $timeEntryIds)->update(['invoice_id' => $invoice->id]);

            return $invoice;
        });

        // Trigger notifications
        if ($invoice && !IsDemo()) {
            event(new \App\Events\NewInvoiceCreated($invoice, $request->all()));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('SMS send failed: ') . $slackError;
        }

        if (!empty($errors)) {
            $message = __('Invoice created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Invoice created successfully.');
    }

    public function update(Request $request, Invoice $invoice)
    {
        if (!Auth::user()->can('edit-invoices')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'case_id' => 'nullable|integer',
            'email_template_id' => 'nullable|exists:email_templates,id',
            'currency_id' => 'nullable|exists:client_billing_currencies,id',
            'subtotal' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after:invoice_date',
            'notes' => 'nullable|string|max:1000',
            'line_items' => 'nullable|array',
            'line_items.*.description' => 'required|string',
            'line_items.*.quantity' => 'required|numeric|min:0',
            'line_items.*.rate' => 'required|numeric|min:0',
            'line_items.*.amount' => 'required|numeric|min:0',
        ]);

        $taxAmount = $request->tax_amount ?? 0;
        $subtotal = $request->subtotal ?? collect($request->line_items)->sum('amount');
        $totalAmount = $subtotal + $taxAmount;

        DB::transaction(function () use ($request, $invoice, $taxAmount, $subtotal, $totalAmount) {
            $invoice->update([
                'client_id'    => $request->client_id,
                'case_id'      => $request->case_id,
                'subtotal'     => $subtotal,
                'tax_amount'   => $taxAmount,
                'total_amount' => $totalAmount,
                'invoice_date' => $request->invoice_date,
                'due_date'     => $request->due_date,
                'notes'        => $request->notes,
                'line_items'   => $request->line_items,
            ]);

            // Build new sets of linked expense/time-entry IDs from the updated line_items
            $newExpenseIds    = [];
            $newTimeEntryIds  = [];
            if (is_array($request->line_items)) {
                foreach ($request->line_items as $item) {
                    if (!empty($item['type']) && !empty($item['id'])) {
                        if ($item['type'] === 'expense') $newExpenseIds[]   = $item['id'];
                        if ($item['type'] === 'time')    $newTimeEntryIds[] = $item['id'];
                    }
                }
            }

            // Expenses previously linked to this invoice but no longer in line_items → unlink
            Expense::where('invoice_id', $invoice->id)
                ->when(!empty($newExpenseIds), fn($q) => $q->whereNotIn('id', $newExpenseIds))
                ->update(['invoice_id' => null]);

            // Newly added expense ids → link
            if (!empty($newExpenseIds)) {
                Expense::whereIn('id', $newExpenseIds)->update(['invoice_id' => $invoice->id]);
            }

            // Time entries previously linked but no longer in line_items → unlink
            TimeEntry::where('invoice_id', $invoice->id)
                ->when(!empty($newTimeEntryIds), fn($q) => $q->whereNotIn('id', $newTimeEntryIds))
                ->update(['invoice_id' => null]);

            // Newly added time entry ids → link
            if (!empty($newTimeEntryIds)) {
                TimeEntry::whereIn('id', $newTimeEntryIds)->update(['invoice_id' => $invoice->id]);
            }
        });

        return redirect()->back()->with('success', 'Invoice updated successfully.');
    }

    public function destroy(Invoice $invoice)
    {
        if (!Auth::user()->can('delete-invoices')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        DB::transaction(function () use ($invoice) {
            Expense::where('invoice_id', $invoice->id)->update(['invoice_id' => null]);
            TimeEntry::where('invoice_id', $invoice->id)->update(['invoice_id' => null]);
            $invoice->delete();
        });

        return redirect()->back()->with('success', 'Invoice deleted successfully.');
    }

    public function send(Invoice $invoice)
    {
        if (!Auth::user()->can('send-invoices')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $invoice->load(['client', 'case']);

        // Trigger notifications
        if ($invoice && !IsDemo()) {
            event(new \App\Events\InvoiceSent($invoice, []));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');
        $twilioError = session()->pull('twilio_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('Message send failed: ') . $slackError;
        }
        if ($twilioError) {
            $errors[] = __('SMS send failed: ') . $twilioError;
        }

        if (!empty($errors)) {
            $message = implode(', ', $errors);
            return redirect()->back()->with('error', $message);
        }

        if (isEmailTemplateEnabled('Invoice Sent', createdBy()) || IsDemo()) {
            $invoice->update(['status' => 'sent']);
        } else {
            return redirect()->back()->with('error', __('Enable "Invoice Sent" notification from slack notification settings, to send invoice'));
        }

        return redirect()->back()->with('success', 'Invoice sent successfully.');
    }

    public function generate(Invoice $invoice)
    {
        $invoice->load(['client', 'case', 'creator']);

        $companyProfile = \App\Models\CompanyProfile::where('created_by', createdBy())->first();

        // Get brand settings theme color using helper function
        $themeColor = getSetting('customColor') ?? getSetting('themeColor') ?? '#ff6b35';

        // Get all invoice items: line_items from JSON + linked time entries/expenses
        $invoiceItems = [];

        // Add line_items from JSON field (manually added items)
        if ($invoice->line_items) {
            foreach ($invoice->line_items as $item) {
                $invoiceItems[] = [
                    'id' => $item['id'] ?? null,
                    'type' => $item['type'] ?? 'manual',
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'rate' => $item['rate'],
                    'amount' => $item['amount'],
                    'expense_date' => $item['expense_date'] ?? null
                ];
            }
        }

        // Add linked time entries and expenses
        $linkedItemsResponse = $this->getCaseTimeEntries($invoice->case_id);
        $linkedItems = $linkedItemsResponse->original->toArray();
        // $invoiceItems = array_merge($invoiceItems, $linkedItems);

        // Load client billing info and currencies
        $clientBillingInfo = ClientBillingInfo::withPermissionCheck()
            ->select('client_id', 'currency')
            ->get()
            ->keyBy('client_id');
        $currencies = \App\Models\ClientBillingCurrency::where('status', true)
            ->select('id', 'name', 'code', 'symbol')
            ->get();

        return Inertia::render('billing/invoices/generate', [
            'invoice' => $invoice,
            'companyProfile' => $companyProfile,
            'invoiceItems' => $invoiceItems,
            'clientBillingInfo' => $clientBillingInfo,
            'currencies' => $currencies,
            'themeColor' => $themeColor
        ]);
    }

    public function print(Invoice $invoice)
    {
        if (!Auth::user()->can('view-invoices')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $invoice->load(['client', 'case', 'creator', 'currency', 'payments']);

        $invoiceItems = [];
        if ($invoice->line_items) {
            foreach ($invoice->line_items as $item) {
                $invoiceItems[] = [
                    'id' => $item['id'] ?? null,
                    'type' => $item['type'] ?? 'manual',
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'rate' => $item['rate'],
                    'amount' => $item['amount'],
                    'expense_date' => $item['expense_date'] ?? null
                ];
            }
        }

        // Fetch billing info from ClientBillingInfo table
        $billingInfo = ClientBillingInfo::where('client_id', $invoice->client_id)->first();

        $companyProfile = getCompanyProfile();
        $companyName = $companyProfile->name ?? 'Company Name';
        $themeColor = getSetting('customColor') ?? getSetting('themeColor') ?? '#ff6b35';

        $currencySettings = getCompanyCurrencySettings();

        $format = request()->get('download') === 'pdf' ? 'pdf' : 'view';
        return view('invoices.invoice-download', compact(
            'invoice',
            'companyProfile',
            'companyName',
            'invoiceItems',
            'billingInfo',
            'format',
            'themeColor',
            'currencySettings'
        ));
    }
    public function generateFromTimeEntries(Request $request)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'case_id' => 'nullable|exists:cases,id',
            'time_entry_ids' => 'required|array',
            'time_entry_ids.*' => 'exists:time_entries,id',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after:invoice_date',
        ]);

        $timeEntries = \App\Models\TimeEntry::whereIn('id', $request->time_entry_ids)
            ->unbilled()
            ->get();

        if ($timeEntries->isEmpty()) {
            return redirect()->back()->with('error', 'No unbilled time sheet found.');
        }

        $lineItems = $timeEntries->map(function ($entry) {
            return [
                'description' => $entry->description,
                'quantity' => $entry->hours,
                'rate' => $entry->billable_rate,
                'amount' => $entry->total_amount
            ];
        })->toArray();

        $subtotal = $timeEntries->sum('total_amount');

        $invoice = Invoice::create([
            'created_by' => createdBy(),
            'client_id' => $request->client_id,
            'case_id' => $request->case_id,
            'subtotal' => $subtotal,
            'tax_amount' => 0,
            'total_amount' => $subtotal,
            'status' => 'draft',
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'line_items' => $lineItems,
        ]);

        // Mark time entries as billed
        $timeEntries->each(function ($entry) use ($invoice) {
            $entry->update(['invoice_id' => $invoice->id]);
        });

        return redirect()->route('billing.invoices.index')
            ->with('success', 'Invoice generated from time entries successfully.');
    }

    public function generateFromTimeAndExpenses(Request $request)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'case_id' => 'nullable|exists:cases,id',
            'time_entry_ids' => 'nullable|array',
            'time_entry_ids.*' => 'exists:time_entries,id',
            'expense_ids' => 'nullable|array',
            'expense_ids.*' => 'exists:expenses,id',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after:invoice_date',
        ]);

        $lineItems = [];
        $subtotal = 0;

        // Add time entries
        if ($request->time_entry_ids) {
            $timeEntries = \App\Models\TimeEntry::where(function ($q) {
                if (Auth::user()->can('manage-any-time-entries')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-time-entries')) {
                    $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
                }
            })
                ->whereIn('id', $request->time_entry_ids)
                ->unbilled()
                ->get();

            foreach ($timeEntries as $entry) {
                $lineItems[] = [
                    'type' => 'time',
                    'billing_type' => $entry->billing_rate_type,
                    'description' => $entry->description . ' (' . $entry->billing_display . ')',
                    'quantity' => $entry->billing_rate_type === 'fixed' ? 1 : $entry->hours,
                    'rate' => $entry->billing_rate_type === 'fixed' ? $entry->total_amount : $entry->billable_rate,
                    'amount' => $entry->total_amount
                ];
                $subtotal += $entry->total_amount;
            }
        }

        // Add expenses
        if ($request->expense_ids) {
            $expenses = \App\Models\Expense::where(function ($q) {
                if (Auth::user()->can('manage-any-expenses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-expenses')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($cq) {
                            $cq->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
                ->whereIn('id', $request->expense_ids)
                ->unbilled()
                ->get();

            foreach ($expenses as $expense) {
                $lineItems[] = [
                    'type' => 'expense',
                    'description' => $expense->description,
                    'quantity' => 1,
                    'rate' => $expense->amount,
                    'amount' => $expense->amount
                ];
                $subtotal += $expense->amount;
            }
        }

        if (empty($lineItems)) {
            return redirect()->back()->with('error', 'No billable items selected.');
        }

        $invoice = Invoice::create([
            'created_by' => createdBy(),
            'client_id' => $request->client_id,
            'case_id' => $request->case_id,
            'subtotal' => $subtotal,
            'tax_amount' => 0,
            'total_amount' => $subtotal,
            'status' => 'draft',
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'line_items' => $lineItems,
        ]);

        // Mark items as billed
        if (isset($timeEntries) && $timeEntries->count() > 0) {
            foreach ($timeEntries as $entry) {
                $entry->invoice_id = $invoice->id;
                $entry->save();
            }
        }
        if (isset($expenses)) {
            $expenses->each(function ($expense) use ($invoice) {
                $expense->update(['invoice_id' => $invoice->id]);
            });
        }

        return redirect()->route('billing.invoices.index')
            ->with('success', 'Invoice generated successfully.');
    }

    public function getClientCases($clientId)
    {
        $cases = \App\Models\CaseModel::active()->where('client_id', $clientId)
            ->select('id', 'title', 'case_id')
            ->get();

        return response()->json($cases);
    }

    public function getCaseTimeEntries($caseId)
    {
        $case = \App\Models\CaseModel::find($caseId);
        if (!$case) {
            return response()->json([]);
        }

        $timeEntries = \App\Models\TimeEntry::where(function ($q) {
            if (Auth::user()->can('manage-any-time-entries')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-time-entries')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            }
        })
            ->where('case_id', $caseId)
            ->where('is_billable', true)
            ->where('status', 'approved')
            ->with(['case:id,case_id,title'])
            ->unbilled()
            ->select('id', 'case_id', 'client_id', 'description', 'hours', 'billable_rate', 'invoice_id', 'status', 'entry_date')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'type' => 'time',
                    'case_info' => $entry->case ? $entry->case->case_id . ' - ' . $entry->case->title : 'General',
                    'description' => $entry->description,
                    'quantity' => $entry->hours,
                    'rate' => $entry->billable_rate,
                    'amount' => $entry->hours * $entry->billable_rate,
                    'entry_date' => $entry->entry_date,
                    'status' => $entry->status,
                    'invoice_id' => $entry->invoice_id
                ];
            });

        $expenses = \App\Models\Expense::where(function ($q) {
            if (Auth::user()->can('manage-any-expenses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-expenses')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('case_id', $caseId)
            ->where('is_billable', 1)
            ->where('status', 'approved')
            ->with(['category'])
            ->unbilled()
            ->select('id', 'case_id', 'description', 'amount', 'expense_date')
            ->get()
            ->map(function ($expense) {
                return [
                    'id' => $expense->id,
                    'type' => 'expense',
                    'description' => $expense->description,
                    'quantity' => 1,
                    'rate' => $expense->amount,
                    'amount' => $expense->amount,
                    'expense_date' => $expense->expense_date
                ];
            });

        $data = $timeEntries->concat($expenses);

        return response()->json($data);
    }

    public function getClientTimeEntries($clientId)
    {
        $timeEntries = \App\Models\TimeEntry::where(function ($query) use ($clientId) {
            // Case-specific time entries
            $query->whereHas('case', function ($q) use ($clientId) {
                $q->where('client_id', $clientId);
            })
                // OR general time entries for this client
                ->orWhere('client_id', $clientId);
        })
            ->where('is_billable', true)
            ->where('status', 'approved')
            ->whereNull('invoice_id')
            ->with(['case:id,case_id,title'])
            ->select('id', 'case_id', 'client_id', 'description', 'hours', 'billable_rate')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'type' => $entry->case_id ? 'case' : 'general',
                    'case_info' => $entry->case ? $entry->case->case_id . ' - ' . $entry->case->title : 'General',
                    'description' => $entry->description,
                    'quantity' => $entry->hours,
                    'rate' => $entry->billable_rate,
                    'amount' => $entry->hours * $entry->billable_rate
                ];
            });

        return response()->json($timeEntries);
    }

    public function getInvoiceItems($invoiceId)
    {
        // Get time entries and expenses linked to this invoice with permission check
        $timeEntries = \App\Models\TimeEntry::where(function ($q) {
            if (Auth::user()->can('manage-any-time-entries')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-time-entries')) {
                $q->where('created_by', Auth::id())->orWhere('user_id', Auth::id());
            }
        })
            ->where('invoice_id', $invoiceId)
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'type' => 'time',
                    'description' => $entry->description,
                    'quantity' => $entry->hours,
                    'rate' => $entry->billable_rate,
                    'amount' => $entry->hours * $entry->billable_rate,
                    'status' => $entry->status
                ];
            });

        $expenses = \App\Models\Expense::where(function ($q) {
            if (Auth::user()->can('manage-any-expenses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-expenses')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('user_id', Auth::id());
                    })
                    ->orWhereHas('case.teamMembers', function ($teamQuery) {
                        $teamQuery->where('user_id', Auth::id());
                    });
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->where('invoice_id', $invoiceId)
            ->get()
            ->map(function ($expense) {
                return [
                    'id' => $expense->id,
                    'type' => 'expense',
                    'description' => $expense->description,
                    'quantity' => 1,
                    'rate' => $expense->amount,
                    'amount' => $expense->amount
                ];
            });

        return $timeEntries->concat($expenses)->toArray();
    }

    /**
     * Calculate due date based on payment terms
     */
    private function calculateDueDateFromTerms($invoiceDate, $paymentTerms)
    {
        $date = \Carbon\Carbon::parse($invoiceDate);

        return match ($paymentTerms) {
            'net_15' => $date->addDays(15)->format('Y-m-d'),
            'net_30' => $date->addDays(30)->format('Y-m-d'),
            'net_45' => $date->addDays(45)->format('Y-m-d'),
            'net_60' => $date->addDays(60)->format('Y-m-d'),
            'due_on_receipt' => $date->format('Y-m-d'),
            default => $date->addDays(30)->format('Y-m-d')
        };
    }
}
