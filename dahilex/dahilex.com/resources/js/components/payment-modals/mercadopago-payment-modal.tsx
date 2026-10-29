import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Loader2, Wallet, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface MercadoPagoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  amount: number;
}

export function MercadoPagoPaymentModal({ isOpen, onClose, invoice, amount }: MercadoPagoPaymentModalProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(route('invoice.mercadopago.create-preference'), {
        invoice_token: invoice.payment_token,
        amount: amount,
      });

      if (response.data.redirect_url) {
        window.location.href = response.data.redirect_url;
      } else {
        toast.error(response.data.error || t('Failed to create payment preference'));
        setProcessing(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('Failed to initialize payment'));
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('MercadoPago Payment')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('You will be redirected to MercadoPago to complete your payment securely.')}
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">{t('Amount to Pay')}</span>
              <span className="text-lg font-bold">{amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={processing}>
              {t('Cancel')}
            </Button>
            <Button onClick={handlePayment} disabled={processing} className="flex-1">
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('Processing...')}
                </>
              ) : (
                t('Pay with MercadoPago')
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {t('Powered by MercadoPago - Secure payment processing')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
