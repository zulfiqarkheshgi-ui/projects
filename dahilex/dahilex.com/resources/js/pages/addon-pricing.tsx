import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

interface PricingRule {
  id: number;
  plan_id: number | null;
  billing_cycle: 'monthly' | 'yearly';
  step_quantity: number;
  unit_price: string;
  is_current: boolean;
}

interface AddonFeatureRow {
  id: number;
  key: string;
  name: string;
  unit_label: string;
  is_active: boolean;
  pricing_rules: PricingRule[];
}

export default function AddonPricingIndex() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<AddonFeatureRow[]>([]);
  const [editing, setEditing] = useState<{ feature: AddonFeatureRow; cycle: 'monthly' | 'yearly' } | null>(null);
  const [form, setForm] = useState({ step_quantity: '1', unit_price: '0' });
  const [saving, setSaving] = useState(false);

  const csrfToken = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(route('addon-pricing.index'), { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setFeatures(data.features);
    } catch (e) {
      toast.error(t('Failed to load add-on pricing'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const globalRuleFor = (feature: AddonFeatureRow, cycle: 'monthly' | 'yearly') =>
    feature.pricing_rules.find((r) => r.plan_id === null && r.billing_cycle === cycle && r.is_current);

  const openEdit = (feature: AddonFeatureRow, cycle: 'monthly' | 'yearly') => {
    const rule = globalRuleFor(feature, cycle);
    setForm({
      step_quantity: String(rule?.step_quantity ?? 1),
      unit_price: String(rule?.unit_price ?? 0),
    });
    setEditing({ feature, cycle });
  };

  const saveRate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(route('addon-pricing.store', editing.feature.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken(),
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          billing_cycle: editing.cycle,
          step_quantity: Number(form.step_quantity),
          unit_price: Number(form.unit_price),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t('Failed to save rate'));
        return;
      }
      toast.success(t('Rate updated. Existing subscribers keep their old rate until their next renewal.'));
      setEditing(null);
      load();
    } catch (e) {
      toast.error(t('Failed to save rate'));
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = async (feature: AddonFeatureRow) => {
    try {
      const res = await fetch(route('addon-pricing.toggle', feature.id), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken(),
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(t('Failed to toggle feature'));
        return;
      }
      setFeatures((prev) => prev.map((f) => (f.id === feature.id ? { ...f, is_active: data.is_active } : f)));
    } catch (e) {
      toast.error(t('Failed to toggle feature'));
    }
  };

  return (
    <PageTemplate
      title={t('Add-On Pricing')}
      description={t('Configure block rates for team members, cases, clients, and storage')}
      url="/super-admin/addon-pricing"
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {features.map((feature) => (
            <Card key={feature.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <div className="font-semibold">{feature.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('key')}: {feature.key}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{feature.is_active ? t('Sellable') : t('Disabled')}</span>
                  <Switch checked={feature.is_active} onCheckedChange={() => toggleFeature(feature)} />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Billing Cycle')}</TableHead>
                      <TableHead>{t('Step Quantity')}</TableHead>
                      <TableHead>{t('Unit Price')}</TableHead>
                      <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(['monthly', 'yearly'] as const).map((cycle) => {
                      const rule = globalRuleFor(feature, cycle);
                      return (
                        <TableRow key={cycle}>
                          <TableCell className="capitalize">{t(cycle)}</TableCell>
                          <TableCell>{rule ? rule.step_quantity : <Badge variant="outline">{t('Not set')}</Badge>}</TableCell>
                          <TableCell>{rule ? `$${rule.unit_price}` : '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(feature, cycle)}>
                              <Pencil className="h-4 w-4 mr-1" /> {t('Edit')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="font-semibold">
                {editing.feature.name} — {t(editing.cycle)}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('Saving publishes a new rate version. Existing subscribers keep their current rate until their next renewal.')}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label>{t('Step Quantity')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.step_quantity}
                  onChange={(e) => setForm({ ...form, step_quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('Unit Price')} ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  {t('Cancel')}
                </Button>
                <Button onClick={saveRate} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('Save Rate')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageTemplate>
  );
}
