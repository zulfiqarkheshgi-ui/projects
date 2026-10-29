<?php

namespace App\Listeners;

use App\Events\NewInvoiceCreated;
use App\Models\User;
use App\Services\TwilioService;
use Exception;

class SendNewInvoiceTwilioNotification
{
    public function __construct(
        private TwilioService $twilioService
    ) {
        //
    }

    public function handle(NewInvoiceCreated $event): void
    {
        $invoice = $event->invoice;
        $contact =$invoice->client->phone;


        if (isNotificationTemplateEnabled('New Invoice', getCompanyId(auth()->id()), 'twilio')) {
            $variables = [
                '{invoice_number}' => $invoice->invoice_number ?? '-',
                '{client_name}' => $invoice->client->name ?? '-',
                '{amount}' => $invoice->total_amount ?? '-',
                '{due_date}' => $invoice->due_date ?? '-',
                '{created_by}' => $invoice->creator->name ?? '-',
            ];

            try {
                session()->forget('twilio_error');

                $twilioSid = getSetting('twilio_sid', '', getCompanyId(auth()->id()));
                $twilioToken = getSetting('twilio_token', '', getCompanyId(auth()->id()));
                $twilioFrom = getSetting('twilio_from', '', getCompanyId(auth()->id()));

                if (filled($twilioSid) && filled($twilioToken) && filled($twilioFrom)) {
                    $createdByUser = User::find(getCompanyId(auth()->id()));
                    $userLanguage = $createdByUser->lang ?? 'en';
                    $this->twilioService->sendTemplateMessageToPhone(
                        templateName: 'New Invoice',
                        variables: $variables,
                        toPhone: $contact,
                        language: $userLanguage,
                        userId: getCompanyId(auth()->id())
                    );
                } else {
                    session()->flash('twilio_error', 'Twilio configuration is incomplete.');
                }
            } catch (Exception $e) {
                session()->flash('twilio_error', 'Failed to send invoice create notification: ' . $e->getMessage());
            }
        }
    }
}
