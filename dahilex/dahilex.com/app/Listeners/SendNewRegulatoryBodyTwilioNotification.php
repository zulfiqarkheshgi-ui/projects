<?php

namespace App\Listeners;

use App\Events\NewRegulatoryBodyCreated;
use App\Models\User;
use App\Services\TwilioService;
use Exception;

class SendNewRegulatoryBodyTwilioNotification
{
    public function __construct(
        private TwilioService $twilioService
    ) {
        //
    }

    public function handle(NewRegulatoryBodyCreated $event): void
    {
        $regulatoryBody = $event->regulatoryBody;
        $contact = $regulatoryBody->contact_phone;

        if (isNotificationTemplateEnabled('New Regulatory Body', getCompanyId(auth()->id()), 'twilio')) {
            $variables = [
                '{body_name}' => $regulatoryBody->name ?? '-',
                '{jurisdiction}' => $regulatoryBody->jurisdiction ?? '-',
                '{contact_info}' => $regulatoryBody->contact_phone ?? '-',
                '{created_by}' => $regulatoryBody->creator->name ?? '-',
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
                        templateName: 'New Regulatory Body',
                        variables: $variables,
                        toPhone: $contact,
                        language: $userLanguage,
                        userId: getCompanyId(auth()->id())
                    );
                } else {
                    session()->flash('twilio_error', 'Twilio configuration is incomplete.');
                }
            } catch (Exception $e) {
                  \Log::error('Twilio notification failed: ' . $e->getMessage());
                session()->flash('twilio_error', 'Failed to send regulatory body create notification: ' . $e->getMessage());
            }
        }
    }
}
