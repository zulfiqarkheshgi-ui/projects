import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Copy, CheckCircle, Upload, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatCurrencyForCompany } from '@/utils/helpers';

interface BankPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  amount: number;
}

export function BankPaymentModal({ isOpen, onClose, invoice, amount }: BankPaymentModalProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (!allowedTypes.includes(file.type)) {
          toast.error(t('Only JPG, PNG, and PDF files are allowed'));
          return;
        }
        if (file.size > maxSize) {
          toast.error(t('File size must not exceed 5MB'));
          return;
        }
        setReceipt(file);
      }
    };

  const handleRemoveFile = () => {
    setReceipt(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!receipt) {
      toast.error(t('Please upload your bank transfer receipt'));
      return;
    }

    setProcessing(true);

    const formData = new FormData();
    formData.append('payment_method', 'bank');
    formData.append('invoice_token', invoice.payment_token);
    formData.append('amount', amount.toString());
    formData.append('receipt', receipt);

    router.post(route('invoice.payment.process',invoice.payment_token), formData, {
      onSuccess: () => {
        toast.success(t('Payment request submitted successfully'));
        onClose();
      },
      onError: (errors) => {
        toast.error(Object.values(errors).join(', '));
        setProcessing(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Bank Transfer Payment')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">{t('Payment Instructions')}</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>{t('Amount')}:</strong> {formatCurrencyForCompany(amount.toFixed(2))}</p>
              <p><strong>{t('Invoice')}:</strong> #{invoice.invoice_number}</p>
              <p><strong>{t('Reference')}:</strong> {invoice.payment_token}</p>
            </div>
          </div>

          {/* Receipt Upload */}
      <div className="space-y-2">
        <Label htmlFor="bank-receipt" required>{t('Bank Transfer Receipt')}</Label>
        <Input
          id="bank-receipt"
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        {!receipt ? (
          <label
            htmlFor="bank-receipt"
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Upload className="h-5 w-5 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">{t('Click to upload receipt')}</span>
            <span className="text-xs text-gray-400">{t('JPG, PNG, PDF up to 5MB')}</span>
          </label>
        ) : (
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">{receipt.name}</span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
              title={t('Remove')}
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              {t('Your payment request will be submitted for manual verification. Please contact support for bank transfer details.')}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('Cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={processing} className="flex-1">
              {processing ? t('Submitting...') : t('Submit Request')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
