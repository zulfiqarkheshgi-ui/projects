import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { Save, Bell, Mail, DollarSign } from 'lucide-react';
import { SettingsSection } from '@/components/settings-section';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface EmailTemplate {
    id: number;
    name: string;
    notification_type: string;
    is_active: boolean;
    template: {
        id: number;
        name: string;
        from: string;
    };
}

interface Props {
    templates?: EmailTemplate[];
}

export default function EmailNotificationSettings({ templates: initialTemplates = [] }: Props) {
    const { t } = useTranslation();
    const { props } = usePage();
    const { settings = {}, globalSettings } = usePage().props as any;

    const isDemo = (props as any).is_demo;

    const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Handle notification toggle
    const handleNotificationToggle = (templateId: number, enabled: boolean) => {
        setTemplates(prevTemplates =>
            prevTemplates.map(template =>
                template.id === templateId
                    ? { ...template, is_active: enabled }
                    : template
            )
        );
    };
    const submitNotificationSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Create clean settings object
        const settings = templates.map(template => ({
            template_id: template.id,
            is_enabled: template.is_active
        }));

        // Submit to backend using Inertia
        router.post(route('settings.email-notifications.update'), {
            settings: settings
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setSaving(false);
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                const successMessage = page.props.flash?.success;
                const errorMessage = page.props.flash?.error;

                if (successMessage) {
                    toast.success(successMessage);
                } else if (errorMessage) {
                    toast.error(errorMessage);
                } else {
                    toast.success(t('Email Notification settings saved successfully'));
                }
            },
            onError: (errors) => {
                setSaving(false);
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                const errorMessage = errors.error || Object.values(errors).join(', ') || t('Failed to save email settings');
                toast.error(errorMessage);
            }
        });
    };


    if (loading) {
        return (
            <SettingsSection
                title={t("Email Notification Settings")}
                description={t("Configure which email notifications are sent")}
            >
                <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading...</div>
                </div>
            </SettingsSection>
        );
    }

    return (
        <SettingsSection
            title={t("Email Notification Settings")}
            description={t("Edit email notification settings")}
            action={
                <Button
                    type="submit"
                    form="notification-settings-form"
                    size="sm"
                    disabled={saving}
                    className="bg-green-500 hover:bg-green-600"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t("Saving...") : t("Save Changes")}
                </Button>
            }
        >
            <form id="notification-settings-form" onSubmit={submitNotificationSettings}>
                <div className="grid grid-cols-1 gap-6">
                    {/* Format Settings with Live Preview */}
                    <div>
                        <Card>
                            {/* <CardContent> */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 m-6">
                                    {templates.length === 0 ? (
                                        <div className="col-span-full text-center py-8 text-muted-foreground">
                                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No email templates found.</p>
                                            <p className="text-sm">Contact your administrator to set up email templates.</p>
                                        </div>
                                    ) : (
                                        templates.map(template => (
                                            <div key={template.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                <Label htmlFor={template.name} className="text-sm font-medium">{t(template.name)}</Label>
                                                <Switch
                                                    id={`template-${template.id}`}
                                                    checked={template.is_active}
                                                    onCheckedChange={(checked) =>
                                                        handleNotificationToggle(template.id, checked)
                                                    }
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            {/* </CardContent> */}
                        </Card>
                    </div>
                </div>
            </form>
        </SettingsSection>
    );
}
