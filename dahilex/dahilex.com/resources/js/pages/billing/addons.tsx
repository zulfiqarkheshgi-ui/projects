import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, FileText, Contact, HardDrive, Loader2, Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

interface AddonFeatureRow {
  key: string;
  name: string;
  unit_label: string;
  plan_included: number;
  active_quantity: number;
  pending_quantity: number;
  has_scheduled_change: boolean;
  effective_from_next_billing: string | null;
  step_quantity: number | null;
  unit_price: number | null;
}

interface SubscriptionSummary {
  plan: string;
  billing_cycle: string;
  current_period_end: string;
  next_billing_date: string;
}

const ICONS: Record<string, React.ReactNode> = {
  team_members: <Users className="h-5 w-5" />,
  cases: <FileText className="h-5 w-5" />,
  clients: <Contact className="h-5 w-5" />,
  storage_gb: <HardDrive className="h-5 w-5" />,
};

// Cost of moving from `current` to `target` extra units, block-rounded — mirrors
// AddonPricingRule::costFor() on the backend so the dialog can preview the
// charge before the user confirms. The server always recomputes and is the
// source of truth; this is purely a UI preview.
function estimateBlockCost(target: number, step: number, unitPrice: number): number {
  if (target <= 0 || !step) return 0;
  return Math.ceil(target / step) * unitPrice;
}

export default function AddonsIndex() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [features, setFeatures] = useState<AddonFeatureRow[]>([]);
  const [dialogFeature, setDialogFeature] = useState<AddonFeatureRow | null>(null);
  const [targetExtra, setTargetExtra] = useState(0);
  const [card, setCard] = useState({ card_number: '', expiry_month: '', expiry_year: '', cvv: '', cardholder_name: '' });
  const [submitting, setSubmitting] = useState(false);

  const csrfToken = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(route('addons.index'), { headers: { Accept: 'application/json' } }); // 'addons.index' = the /billing/addons/data JSON route
      const data = await res.json();
      setSubscription(data.subscription);
      setFeatures(data.features);
    } catch (e) {
      toast.error(t('Failed to load add-ons'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDialog = (feature: AddonFeatureRow) => {
    setDialogFeature(feature);
    setTargetExtra(feature.pending_quantity);
    setCard({ card_number: '', expiry_month: '', expiry_year: '', cvv: '', cardholder_name: '' });
  };

  const isIncrease = dialogFeature ? targetExtra > dialogFeature.active_quantity : false;
  const previewCost =
    dialogFeature && isIncrease
      ? Math.max(
          0,
          estimateBlockCost(targetExtra, dialogFeature.step_quantity || 1, dialogFeature.unit_price || 0) -
            estimateBlockCost(dialogFeature.active_quantity, dialogFeature.step_quantity || 1, dialogFeature.unit_price || 0)
        )
      : 0;

  const submit = async () => {
    if (!dialogFeature) return;
    setSubmitting(true);

    try {
      const res = await fetch(route('addons.update', dialogFeature.key), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken(),
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          quantity: targetExtra,
          ...(isIncrease ? card : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('Something went wrong'));
        return;
      }

      if (data.change_type === 'increase' && data.charged) {
        toast.success(t('Add-on increased and charged {{amount}}', { amount: `$${data.charge_amount}` }));
      } else if (data.change_type === 'decrease' || data.change_type === 'cancel') {
        toast.success(t('Change scheduled for your next billing date'));
      } else {
        toast.success(t('Add-on updated'));
      }

      setDialogFeature(null);
      load();
    } catch (e) {
      toast.error(t('Failed to update add-on'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTemplate
      title={t('Add-ons')}
      description={t('Manage extra team members, cases, clients, and storage on top of your plan')}
      url="/billing/addons"
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {subscription && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                <div>
                  <div className="font-semibold">
                    {subscription.plan} ({t(subscription.billing_cycle)})
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('Current period ends')} {subscription.current_period_end} · {t('Next billing')}{' '}
                    {subscription.next_billing_date}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f) => (
              <Card key={f.key}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">{ICONS[f.key] ?? <Plus className="h-5 w-5" />}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('Included in plan')}: {f.plan_included} {f.unit_label}
                      {f.plan_included !== 1 ? 's' : ''}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('Extra active now')}</span>
                    <Badge variant="secondary">
                      +{f.active_quantity} {f.unit_label}
                      {f.active_quantity !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {f.has_scheduled_change && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {t('Changing to')} +{f.pending_quantity} {t('on')} {f.effective_from_next_billing}
                    </div>
                  )}
                  {f.unit_price != null && f.step_quantity != null && (
                    <div className="text-xs text-muted-foreground">
                      ${f.unit_price} {t('per')} {f.step_quantity} {f.unit_label}
                      {f.step_quantity !== 1 ? 's' : ''}
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="mt-2 self-start" onClick={() => openDialog(f)}>
                    {t('Change quantity')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!dialogFeature} onOpenChange={(open) => !open && setDialogFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('Change')} {dialogFeature?.name} {t('add-on')}
            </DialogTitle>
          </DialogHeader>

          {dialogFeature && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTargetExtra((v) => Math.max(0, v - (dialogFeature.step_quantity || 1)))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-2xl font-semibold w-24 text-center">
                  +{targetExtra} {dialogFeature.unit_label}
                  {targetExtra !== 1 ? 's' : ''}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTargetExtra((v) => v + (dialogFeature.step_quantity || 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {isIncrease ? (
                <>
                  <div className="text-sm text-center text-muted-foreground">
                    {t('Charged immediately')}: <span className="font-semibold text-foreground">${previewCost.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>{t('Cardholder Name')}</Label>
                      <Input
                        value={card.cardholder_name}
                        onChange={(e) => setCard({ ...card, cardholder_name: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>{t('Card Number')}</Label>
                      <Input value={card.card_number} onChange={(e) => setCard({ ...card, card_number: e.target.value })} />
                    </div>
                    <div>
                      <Label>{t('Expiry Month')}</Label>
                      <Input
                        placeholder="MM"
                        maxLength={2}
                        value={card.expiry_month}
                        onChange={(e) => setCard({ ...card, expiry_month: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('Expiry Year')}</Label>
                      <Input
                        placeholder="YY"
                        maxLength={2}
                        value={card.expiry_year}
                        onChange={(e) => setCard({ ...card, expiry_year: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>{t('CVV')}</Label>
                      <Input
                        maxLength={4}
                        value={card.cvv}
                        onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-center text-muted-foreground">
                  {t('This will take effect on your next billing date. No charge now, and your current allocation stays available until then.')}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogFeature(null)}>
              {t('Cancel')}
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
