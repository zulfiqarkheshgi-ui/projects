<?php

namespace App\Listeners;

use App\Events\NewCaseCreated;
use App\Models\User;
use App\Services\SlackService;
use Exception;

class SendNewCaseSlackNotification
{

    public function __construct(
        private SlackService $slackService
    ) {
        //
    }

    public function handle(NewCaseCreated $event): void
    {
        $case = $event->case;
        $assignedUser = $case->assignedUser;
        $contact = $case->contact;

       if (isNotificationTemplateEnabled('New Case', getCompanyId(auth()->id()), 'slack')) {
            $variables = [
                '{case_number}' => $case->case_id ?? '-',
                '{client_name}' => $case->client->name ?? '-',
                '{case_type}' => $case->caseType->name ?? '-',
                '{created_by}' => $case->creator->name ?? '-',
            ];

            try {
                // Clear any existing slack error
                session()->forget('slack_error');

                $slackWebhookUrl = getSetting('slack_webhook_url', '', getCompanyId(auth()->id()));

                if (filled($slackWebhookUrl)) {
                    $createdByUser = User::find(getCompanyId(auth()->id()));
                    $userLanguage = $createdByUser->lang ?? 'en';
                    $this->slackService->sendTemplateMessageWithLanguage(
                        templateName: 'New Case',
                        variables: $variables,
                        webhookUrl: $slackWebhookUrl,
                        language: $userLanguage
                    );
                } else {
                    session()->flash('slack_error', 'Slack webhook URL is not set.');
                }
            } catch (Exception $e) {
                // Store error in session for frontend notification
                session()->flash('slack_error', 'Failed to send case Create notification: ' . $e->getMessage());
            }
        }
    }
}
