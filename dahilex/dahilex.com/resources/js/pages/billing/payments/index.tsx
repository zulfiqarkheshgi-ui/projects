import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { capitalize, formatCurrency } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export default function Payments() {
  const { t } = useTranslation();
  const { auth, payments, invoices, allInvoices, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedInvoice, setSelectedInvoice] = useState(pageFilters.invoice_id || '_empty_');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(pageFilters.payment_method || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  // Auto-open modal from invoice page
  const [isAutoOpen, setIsAutoOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto_open') === 'true') {
      const invoiceNumber = urlParams.get('invoice_number');
      const amount = urlParams.get('amount');
      const invoiceId = urlParams.get('invoice_id');

      setIsAutoOpen(true);
      setCurrentItem({
        invoice_id: invoiceId,
        amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash'
      });
      setFormMode('create');
      setIsFormModalOpen(true);

      // Clean URL
      window.history.replaceState({}, '', route('billing.payments.index'));
    }
  }, []);

  const hasActiveFilters = () => searchTerm !== '' || selectedInvoice !== '_empty_' || selectedPaymentMethod !== '_empty_';

  const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedInvoice !== '_empty_' ? 1 : 0) + (selectedPaymentMethod !== '_empty_' ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('billing.payments.index'), {
      page: 1,
      search: searchTerm || undefined,
      invoice_id: selectedInvoice !== '_empty_' ? selectedInvoice : undefined,
      payment_method: selectedPaymentMethod !== '_empty_' ? selectedPaymentMethod : undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        setIsViewModalOpen(true);
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {

      router.post(route('billing.payments.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          }
        },
        onError: (errors) => {
          toast.error(`Failed to add payment: ${Object.values(errors).join(', ')}`);
        }
      });
    } else if (formMode === 'edit') {

      router.put(route('billing.payments.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          }
        },
        onError: (errors) => {
          toast.error(`Failed to update payment: ${Object.values(errors).join(', ')}`);
        }
      });
    }
  };

  const handleDeleteConfirm = () => {

    router.delete(route('billing.payments.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(page.props.flash.success);
        }
      },
      onError: (errors) => {
        toast.error(`Failed to delete payment: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedInvoice, selectedPaymentMethod]);


  const handleResetFilters = () => {
    router.get(route('billing.payments.index'));
  };

  // Define page actions
  const pageActions = [];

  if (hasPermission(permissions, 'create-payments')) {
    pageActions.push({
      label: t('Add Payment'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Billing & Invoicing'), href: route('billing.time-entries.index') },
    { title: t('Payments') }
  ];

  const getInitials = useInitials();
  // Define table columns
  const columns = [
    {
    key: 'client',
    label: t('Client'),
    render: (value: any, row: any) => {
        return (
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage
                        src={row?.invoice?.client?.user?.avatar}
                        alt={row?.invoice?.client?.user?.name}
                    />
                    <AvatarFallback className="text-lg">
                        {getInitials(row?.invoice?.client?.user?.name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="text-sm font-medium">{row?.invoice?.client?.user?.name}</div>
                    <div className="text-xs text-muted-foreground">{row?.invoice?.client?.user?.email}</div>
                </div>
            </div>
        );
    }
    },
    {
      key: 'invoice',
      label: t('Invoice Number'),
      render: (value: any) => value?.invoice_number || '-'
    },
    {
      key: 'amount',
      label: t('Amount'),
      render: (value: any) => {
        const amount = parseFloat(value);
        return <span className="font-mono">{isNaN(amount) ? formatCurrency(0.00) : formatCurrency(amount.toFixed(2))}</span>;
      }
    },
    {
      key: 'payment_method',
      label: t('Method'),
      render: (value: string) => {
        const statusColors = {
          cash: 'bg-gray-50 text-gray-700 ring-gray-600/20',
          check: 'bg-green-50 text-green-700 ring-green-600/20',
          credit_card: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          bank: 'bg-orange-50 text-orange-700 ring-orange-600/20',
          online: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
            {t(capitalize(value))}
          </span>
        );
      }
    },
    {
      key: 'payment_date',
      label: t('Date'),
      type: "date"
    },

  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-payments'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-payments'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-payments'
    }
  ];

  // Prepare filter options
  const invoiceOptions = [
    { value: '_empty_', label: t('All Invoices') },
    ...(allInvoices || []).map((invoice: any) => ({
      value: invoice.id.toString(),
      label: `${invoice.invoice_number} - ${invoice.client?.name}`
    }))
  ];

  const paymentMethodOptions = [
    { value: '_empty_', label: t('All Methods') },
    { value: 'cash', label: t('Cash') },
    { value: 'check', label: t('Check') },
    { value: 'credit_card', label: t('Credit Card') },
    { value: 'bank', label: t('Bank') },
    { value: 'online', label: t('Online Payment') }
  ];

  return (
    <PageTemplate
      title={t("Payments")}
      description={t('View and manage payments received against client invoices.')}
      url="/billing/payments"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'invoice_id',
              label: t('Invoice'),
              type: 'select',
              searchable: true,
              value: selectedInvoice,
              onChange: setSelectedInvoice,
              options: invoiceOptions
            },
            {
              name: 'payment_method',
              label: t('Payment Method'),
              type: 'select',
              value: selectedPaymentMethod,
              onChange: setSelectedPaymentMethod,
              options: paymentMethodOptions
            }
          ]}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={payments?.data || []}
          from={payments?.from || 1}
          onAction={handleAction}
          permissions={permissions}
          entityPermissions={{
            view: 'view-payments',
            create: 'create-payments',
            edit: 'edit-payments',
            delete: 'delete-payments'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={payments?.from || 0}
          to={payments?.to || 0}
          total={payments?.total || 0}
          links={payments?.links}
          entityName={t("payments")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('billing.payments.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              invoice_id: selectedInvoice !== '_empty_' ? selectedInvoice : undefined,
              payment_method: selectedPaymentMethod !== '_empty_' ? selectedPaymentMethod : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
          onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
        />
      </div>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'invoice_id',
              label: t('Invoice'),
              type: 'select',
              searchable: true,
              required: true,
              disabled: isAutoOpen,
              options: (invoices || []).map((invoice: any) => ({
                value: invoice.id.toString(),
                label: `${invoice.invoice_number} - ${invoice.client?.name}`
              })),
              emptyNote: { link: route('billing.invoices.index'), linkText: t('Invoices') }
            },
            {
              name: 'payment_method',
              label: t('Payment Method'),
              type: 'select',
              required: true,
              options: [
                { value: 'cash', label: t('Cash') },
                { value: 'check', label: t('Check') },
                { value: 'credit_card', label: t('Credit Card') },
                { value: 'bank', label: t('Bank') },
                { value: 'online', label: t('Online Payment') }
              ]
            },
            { name: 'amount', label: t('Amount'), type: 'number', step: '0.01', required: true, min: '0', placeholder: 'eg. 500', disabled: isAutoOpen },
            { name: 'payment_date', label: t('Payment Date'), type: 'date', required: true, disabled: isAutoOpen },
            { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Paid via bank transfer' }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Payment')
            : t('Edit Payment')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.invoice?.invoice_number} - $${currentItem?.amount ? parseFloat(currentItem.amount).toFixed(2) : '0.00'}`}
        entityName="payment"
      />

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentItem && <ViewPopup record={currentItem} />}
      </Dialog>
    </PageTemplate>
  );
}
