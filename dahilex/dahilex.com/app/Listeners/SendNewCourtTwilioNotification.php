<?php

namespace App\Listeners;

use App\Events\NewCourtCreated;
use App\Models\User;
use App\Services\TwilioService;
use Exception;

class SendNewCourtTwilioNotification
{
    public function __construct(
        private TwilioService $twilioService
    ) {
        //
    }

    public function handle(NewCourtCreated $event): void
    {
        $court = $event->court;
        $contact = $court->phone;


        if (isNotificationTemplateEnabled('New Court', getCompanyId(auth()->id()), 'twilio')) {
            $variables = [
                '{court_name}' => $court->name ?? '-',
                '{location}' => $court->address ?? '-',
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
                        templateName: 'New Court',
                        toPhone: $contact,
                        variables: $variables,
                        language: $userLanguage,
                        userId: getCompanyId(auth()->id())
                    );
                } else {
                    session()->flash('twilio_error', 'Twilio configuration is incomplete.');
                }
            } catch (Exception $e) {
                session()->flash('twilio_error', 'Failed to send court create notification: ' . $e->getMessage());
            }
        }
    }
}
