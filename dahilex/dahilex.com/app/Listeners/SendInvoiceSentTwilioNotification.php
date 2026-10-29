<?php

namespace App\Listeners;

use App\Events\InvoiceSent;
use App\Models\User;
use App\Services\TwilioService;
use Exception;

class SendInvoiceSentTwilioNotification
{
    public function __construct(
        private TwilioService $twilioService
    ) {
        //
    }

    public function handle(InvoiceSent $event): void
    {
        $invoice = $event->invoice;
        $contact =$invoice->client->phone;

        if (isNotificationTemplateEnabled('Invoice Sent', getCompanyId(auth()->id()), 'twilio')) {
            $variables = [
                '{invoice_number}' => $invoice->invoice_number ?? '-',
                '{due_date}' => $invoice->due_date ?? '-',
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
                        templateName: 'Invoice Sent',
                        variables: $variables,
                        toPhone: $contact,
                        language: $userLanguage,
                        userId: getCompanyId(auth()->id())
                    );
                } else {
                    session()->flash('twilio_error', 'Twilio configuration is incomplete.');
                }
            } catch (Exception $e) {
                session()->flash('twilio_error', 'Failed to send invoice sent notification: ' . $e->getMessage());
            }
        }
    }
}
