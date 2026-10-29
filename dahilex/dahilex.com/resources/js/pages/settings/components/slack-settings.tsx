import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Send, Save, MessageSquare, HelpCircle, Bell, Link, Key, AlertCircle, Slack } from 'lucide-react';
import { SettingsSection } from '@/components/settings-section';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePage } from '@inertiajs/react';
import axios from 'axios';

export default function SlackSettings() {
    const { t } = useTranslation();
    const { props } = usePage();
    const isDemo = (props as any).is_demo;
    const [isEnabled, setIsEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');

    // Initialize notifications state
    const [notifications, setNotifications] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Load current Slack notification settings
        axios.get(route('settings.slack-notifications.get'))
            .then(response => {
                setNotifications(response.data);
            })
            .catch(error => {

            });
    }, []);

    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [availableNotifications, setAvailableNotifications] = useState<any[]>([]);
    const [testMessageResult, setTestMessageResult] = useState<{ success: boolean, message: string } | null>(null);

    useEffect(() => {
        // Load available notifications
        axios.get(route('settings.slack-notifications.available'))
            .then(response => {
                setAvailableNotifications(response.data);
            })
            .catch(error => {

            });

        // Load Slack config
        axios.get(route('settings.slack-config.get'))
            .then(response => {
                setWebhookUrl(response.data.slack_webhook_url || '');
                setIsEnabled(response.data.slack_enabled || false);
            })
            .catch(error => {

            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if webhook URL is null or empty when Slack is enabled
        if (isEnabled && !webhookUrl) {
            toast.error(t('Please enter a webhook URL when Slack integration is enabled'));
            return;
        }

        setIsSaving(true);


        try {
            await router.post(route('settings.slack-notifications.update'), {
                slack_enabled: isEnabled,
                slack_webhook_url: webhookUrl,
                ...notifications
            }, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    setIsSaving(false);
                    const successMessage = page.props.flash?.success;
                    const errorMessage = page.props.flash?.error;
                    if (successMessage) {
                        toast.success(successMessage);
                    } else if (errorMessage) {
                        toast.error(errorMessage);
                    }
                },
                onError: (errors) => {
                    setIsSaving(false);
                    toast.error(t('Failed to update payment settings'));
                }

            });
        } catch (error) {
            toast.error(t("Failed to save Slack settings"));
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        if (!webhookUrl) {
            toast.error(t("Please enter a webhook URL first"));
            return;
        }

        setIsTesting(true);
        setTestMessageResult(null);

        try {
            await router.post(route('slack.test-webhook'), {
                webhook_url: webhookUrl,
                debug: false
            }, {
                preserveState: true,
                // onSuccess: (page) => {
                //     toast.dismiss();
                //     const successMessage = (page.props as any).flash?.success;
                //     const errorMessage = (page.props as any).flash?.error;

                //     if (successMessage) {
                //         toast.success(successMessage);
                //         setTestMessageResult({ success: true, message: successMessage });
                //     } else if (errorMessage) {
                //         toast.error(errorMessage);
                //         setTestMessageResult({ success: false, message: errorMessage });
                //     } else {
                //         const message = t("Test message sent successfully to Slack!");
                //         toast.success(message);
                //         setTestMessageResult({ success: true, message });
                //     }

                //     setTimeout(() => {
                //         setTestMessageResult(null);
                //     }, 5000);
                // },
                onError: (errors) => {
                    const errorMessage = errors.error || Object.values(errors).join(', ') || t('Failed to update slack notification settings');
                    toast.error(errorMessage);
                },
            });
        } catch (error) {
            toast.error(t("Failed to send test message"));
            setTestMessageResult({ success: false, message: t("Failed to send test message") });
            setIsTesting(false);

            setTimeout(() => {
                setTestMessageResult(null);
            }, 5000);
        }
    };

    const handleNotificationChange = (key: string, value: boolean) => {
        setNotifications(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <SettingsSection
            title={t("Slack Settings")}
            description={t("Configure Slack settings for notifications and communications")}
            action={
                <Button onClick={handleSave} size="sm" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? t("Saving...") : t("Save Changes")}
                </Button>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Configuration */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Credentials */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            {/* Enable Integration */}
                            <div className="flex items-center justify-between p-4 border rounded-md mb-6">
                                <div>
                                    <Label className="font-medium">{t("Enable Slack Integration")}</Label>
                                    <p className="text-xs text-muted-foreground mt-1">{t("Turn on to receive notifications in Slack")}</p>
                                </div>
                                <Switch
                                    checked={isEnabled}
                                    onCheckedChange={setIsEnabled}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2" required={isEnabled}>
                                        <Link className="h-4 w-4" />
                                        {t("Webhook URL")}
                                    </Label>
                                    <Input
                                        value={webhookUrl}
                                        required={true}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        placeholder="https://hooks.slack.com/services/..."
                                        className="font-mono"
                                        disabled={!isEnabled}
                                    />
                                </div>
                            </div>

                            {/* Slack Notification Settings */}
                            <div className="flex items-center gap-2 my-6">
                                <Bell className="h-5 w-5 text-emerald-500" />
                                <h3 className="font-medium text-gray-900">{t("Slack Notification Settings")}</h3>
                            </div>
                            {availableNotifications.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {availableNotifications.map(item => (
                                        <div key={item.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                            <Label htmlFor={item.name} className="text-sm font-medium">{t(item.label)}</Label>
                                            <Switch
                                                id={item.name}
                                                checked={notifications[item.name] || false}
                                                onCheckedChange={(checked) => handleNotificationChange(item.name, checked)}
                                                disabled={!isEnabled}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    {t("No notification template available")}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Test Configuration */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 h-fit">
                        <div className="flex items-center gap-2 mb-4">
                            <Send className="h-4 w-4 text-emerald-500" />
                            <h3 className="font-medium text-gray-900">{t("Test Slack Configuration")}</h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-xs text-gray-600">
                                {t("Send a test message to verify your slack webhook.")}
                            </p>

                            <Button
                                type="button"
                                onClick={handleTest}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                                disabled={isTesting || !isEnabled || !webhookUrl}
                            >
                                {isTesting ? (
                                    <>
                                        <span className="animate-spin mr-2">◌</span>
                                        {t("Sending...")}
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        {t("Send Test Message")}
                                    </>
                                )}
                            </Button>
                        </div>
                        {/* Setup Instructions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Slack className="h-4 w-4 text-blue-600" />
                                <h3 className="text-sm font-medium text-blue-900">{t("Slack Setup Instructions")}</h3>
                            </div>
                            <ol className="space-y-2 text-xs text-blue-800">
                                <li>{t("1. Go to your Slack workspace")}</li>
                                <li>{t("2. Create a new Slack app")}</li>
                                <li>{t("3. Enable Incoming Webhooks")}</li>
                                <li>{t("4. Add webhook to workspace")}</li>
                                <li>{t("5. Copy the webhook URL here")}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
}
