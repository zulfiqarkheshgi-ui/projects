<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice #{{ $invoice->invoice_number ?? $invoice->id }}</title>
    <style>
        * { box-sizing: border-box; }

        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            font-size: 12px;
            line-height: 1.5;
            background: #fff;
        }

        .invoice-container {
            max-width: 100%;
            width: 100%;
            margin: 0;
            background: white;
            padding: 30px 40px;
        }

        /* Header */
        .header {
            width: 100%;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }

        .header table {
            width: 100%;
            border-collapse: collapse;
        }

        .header td {
            vertical-align: top;
            padding: 0;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .header td.right {
            text-align: right;
            width: 38%;
            padding-left: 10px;
        }

        .company-info h1 {
            font-size: 22px;
            font-weight: bold;
            margin: 0 0 8px 0;
        }

        .company-info p {
            margin: 2px 0;
            font-size: 11px;
            color: #333;
        }

        .invoice-info {
            text-align: right;
        }

        .invoice-info h2 {
            font-size: 20px;
            font-weight: bold;
            margin: 0 0 6px 0;
            letter-spacing: 1px;
        }

        .invoice-info p {
            margin: 2px 0;
            font-size: 11px;
            color: #333;
            word-wrap: break-word;
        }

        .invoice-info .invoice-number {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        /* Billing section */
        .billing-section {
            width: 100%;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ccc;
        }

        .bill-to h3 {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 6px 0;
            color: #000;
        }

        .bill-to p {
            margin: 2px 0;
            font-size: 11px;
            color: #333;
        }

        /* Items table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }

        .items-table thead tr {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
        }

        .items-table th {
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .items-table th.text-right { text-align: right; }
        .items-table th.text-center { text-align: center; }

        .items-table tbody tr {
            border-bottom: 1px solid #e0e0e0;
            page-break-inside: avoid;
        }

        .items-table td {
            padding: 10px 6px;
            font-size: 11px;
            vertical-align: top;
        }

        .items-table td.text-right { text-align: right; }
        .items-table td.text-center { text-align: center; }

        .item-name {
            font-weight: bold;
            margin-bottom: 2px;
        }

        .item-type {
            font-size: 10px;
            color: #666;
            font-style: italic;
        }

        /* Totals */
        .totals {
            float: right;
            width: 260px;
            margin-top: 16px;
            border: 1px solid #ccc;
        }

        .totals table {
            width: 100%;
            border-collapse: collapse;
        }

        .totals td {
            padding: 7px 12px;
            font-size: 12px;
        }

        .totals .total-row td {
            font-weight: bold;
            border-top: 2px solid #000;
            font-size: 13px;
        }

        /* Notes */
        .notes-section {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #ccc;
        }

        .notes-section p {
            margin: 5px 0;
            font-size: 12px;
        }

        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { padding: 20px 30px; }
            .header { page-break-inside: avoid !important; }
            .billing-section { page-break-inside: avoid !important; }
            .items-table thead { display: table-header-group; }
            .items-table tbody tr { page-break-inside: avoid; }
            .totals { page-break-inside: avoid !important; break-inside: avoid; }
            .notes-section { page-break-inside: avoid !important; }
        }
    </style>
</head>

<body>
    <div class="invoice-container">
        <div class="header">
            <table>
                <tr>
                    <td>
                        <div class="company-info">
                            <h1>{{ $companyName ?? 'Company Name' }}</h1>
                            @if($companyProfile)
                                @if($companyProfile->address)<p>{{ $companyProfile->address }}</p>@endif
                                @if($companyProfile->city || $companyProfile->state || $companyProfile->zipcode)
                                <p>{{ $companyProfile->city }}@if($companyProfile->state), {{ $companyProfile->state }}@endif @if($companyProfile->zipcode) {{ $companyProfile->zipcode }}@endif</p>
                                @endif
                                @if($companyProfile->phone)<p>Phone: {{ $companyProfile->phone }}</p>@endif
                                @if($companyProfile->email)<p>Email: {{ $companyProfile->email }}</p>@endif
                            @endif
                        </div>
                    </td>
                    <td class="right">
                        <div class="invoice-info">
                            <h2>INVOICE</h2>
                            <p class="invoice-number">#{{ $invoice->invoice_number ?? 'INV-' . date('Y-m-d') . '-' . str_pad($invoice->id, 4, '0', STR_PAD_LEFT) }}</p>
                            <p>Date: {{ $invoice->created_at ? $invoice->created_at->format('Y-m-d') : date('Y-m-d') }}</p>
                            <p>Due: {{ $invoice->due_date ? $invoice->due_date->format('Y-m-d') : date('Y-m-d', strtotime('+30 days')) }}</p>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="billing-section">
            <div class="bill-to">
                <h3>Client Details</h3>
                <p><strong>{{ $invoice->client->name ?? 'Client Name' }}</strong></p>
                <p>{{ $invoice->client->email ?? '' }}</p>
                @if($invoice->client)
                    @if($invoice->client->address)<p>{{ $invoice->client->address }}</p>@endif
                @endif
                @if($invoice->case)
                    <p style="margin-top:6px; font-size:11px; color:#555;">Case: {{ $invoice->case->title }}</p>
                @endif
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 50%;">ITEM</th>
                    <th class="text-center" style="width: 15%;">QTY</th>
                    <th class="text-right" style="width: 17.5%;">PRICE</th>
                    <th class="text-right" style="width: 17.5%;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                @php
                $timeEntries = collect($invoiceItems)->where('type', 'time');
                $expenses = collect($invoiceItems)->where('type', 'expense');
                $otherItems = collect($invoiceItems)->whereNotIn('type', ['time', 'expense']);
                $sortedItems = $timeEntries->concat($expenses)->concat($otherItems);
                @endphp
                @forelse($sortedItems as $item)
                <tr>
                    <td>
                        <div class="item-name">{{ $item['description'] }}</div>
                        @if($item['type'] === 'time')
                        <div class="item-type">(Time Entry)</div>
                        @elseif($item['type'] === 'expense')
                        <div class="item-type">(Expense)</div>
                        @endif
                    </td>
                    <td class="text-center">{{ number_format($item['quantity'], 2) }}</td>
                    <td class="text-right">@php
                        $formattedRate = number_format($item['rate'], $currencySettings['decimalPlaces'], '.', $currencySettings['thousandsSeparator']);
                        echo $currencySettings['symbolPosition'] === 'before'
                            ? $currencySettings['symbol'] . ($currencySettings['symbolSpace'] ? ' ' : '') . $formattedRate
                            : $formattedRate . ($currencySettings['symbolSpace'] ? ' ' : '') . $currencySettings['symbol'];
                    @endphp</td>
                    <td class="text-right">@php
                        $formattedAmount = number_format($item['amount'], $currencySettings['decimalPlaces'], '.', $currencySettings['thousandsSeparator']);
                        echo $currencySettings['symbolPosition'] === 'before'
                            ? $currencySettings['symbol'] . ($currencySettings['symbolSpace'] ? ' ' : '') . $formattedAmount
                            : $formattedAmount . ($currencySettings['symbolSpace'] ? ' ' : '') . $currencySettings['symbol'];
                    @endphp</td>
                </tr>
                @empty
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px;">No items found</td>
                </tr>
                @endforelse
            </tbody>
        </table>

        <div class="totals">
            <table>
                @php
                    $formatCurrency = function($amount) use ($currencySettings) {
                        $formatted = number_format($amount, $currencySettings['decimalPlaces'], '.', $currencySettings['thousandsSeparator']);
                        return $currencySettings['symbolPosition'] === 'before'
                            ? $currencySettings['symbol'] . ($currencySettings['symbolSpace'] ? ' ' : '') . $formatted
                            : $formatted . ($currencySettings['symbolSpace'] ? ' ' : '') . $currencySettings['symbol'];
                    };
                @endphp
                <tr>
                    <td>Subtotal:</td>
                    <td style="text-align: right;">{{ $formatCurrency($invoice->subtotal ?? 0) }}</td>
                </tr>
                @if(isset($invoice->tax_amount) && $invoice->tax_amount > 0)
                <tr>
                    <td>Tax:</td>
                    <td style="text-align: right;">{{ $formatCurrency($invoice->tax_amount) }}</td>
                </tr>
                @endif
                <tr class="total-row">
                    <td><strong>TOTAL:</strong></td>
                    <td style="text-align: right;"><strong>{{ $formatCurrency($invoice->total_amount ?? 0) }}</strong></td>
                </tr>
                @if(isset($invoice->payments) && $invoice->payments->count() > 0)
                @php
                $totalPaid = $invoice->payments->sum('amount');
                $dueAmount = $invoice->total_amount - $totalPaid;
                @endphp
                <tr>
                    <td>Paid:</td>
                    <td style="text-align: right;">-{{ $formatCurrency($totalPaid) }}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Amount Due:</strong></td>
                    <td style="text-align: right;"><strong>{{ $formatCurrency($dueAmount) }}</strong></td>
                </tr>
                @endif

            </table>
        </div>

        <div style="clear: both; height: 20px;"></div>
        <div class="notes-section">
            <p>Payment is due by the date indicated above. Please reference the invoice number in your payment.</p>
            <p>For queries regarding this invoice, please contact our office.</p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script>
        window.addEventListener('load', function() {
            var element = document.querySelector('.invoice-container');
            var format = '{{ $format ?? '
            pdf ' }}';

            if (format === 'pdf') {
                var opt = {
                    margin: [0.5, 0.5, 0.5, 0.5],
                    filename: 'invoice-{{ $invoice->invoice_number ?? $invoice->id }}.pdf',
                    image: {
                        type: 'jpeg',
                        quality: 0.98
                    },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        letterRendering: true
                    },
                    jsPDF: {
                        unit: 'in',
                        format: 'a4',
                        orientation: 'portrait'
                    }
                };
                html2pdf().set(opt).from(element).save().then(function() {
                    setTimeout(() => window.close(), 1000);
                });
            }
        });
    </script>
</body>

</html>
