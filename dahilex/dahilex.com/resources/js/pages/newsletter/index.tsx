import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { CrudTable } from '@/components/CrudTable';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Send } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';

export default function NewsletterPage() {
  const { t } = useTranslation();
  const { auth, subscriptions, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get(route('newsletter.index'), {
      page: 1,
      search: searchTerm || undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    router.get(route('newsletter.index'), {}, { preserveState: true, preserveScroll: true });
  };

  const handleSendNewsletter = () => {
    router.post(route('newsletter.send'), {}, {
      onSuccess: (page) => {
        if (page.props.flash?.success) {
          toast.success(page.props.flash.success);
        } else if (page.props.flash?.error) {
          toast.error(page.props.flash.error);
        } else {
          toast.success(t('Newsletter sent successfully!'));
        }
      },
      onError: (errors) => {
        if (typeof errors === 'object' && errors !== null) {
          const errorMessages = Object.values(errors).flat();
          toast.error(`Failed to send newsletter: ${errorMessages.join(', ')}`);
        } else {
          toast.error(t('Failed to send newsletter. Please try again.'));
        }
      }
    });
  };



  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    if (action === 'delete') {
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (isDeleteModalOpen) {
      router.delete(route('newsletter.destroy', currentItem.id), {
        onSuccess: (page) => {
          setIsDeleteModalOpen(false);
          if (page.props.flash.success) {
            toast.success(page.props.flash.success);
          } else if (page.props.flash.error) {
            toast.error(page.props.flash.error);
          }
        },
        onError: (errors) => {
          setIsDeleteModalOpen(false);
          if (typeof errors === 'string') {
            toast.error(errors);
          } else if (errors.error) {
            toast.error(errors.error);
          } else {
            toast.error(`Failed to delete subscription: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Landing Page') },
    { title: t('Newsletter') }
  ];

  const columns = [
    { key: 'email', label: t('Email') },
    {
      key: 'subscribed_at',
      label: t('Subscribed At'),
      type: 'date'
    },
  ];

  const actions = [
    {
      label: t('Delete'),
      action: 'delete',
      icon: 'Trash2',
      className: 'text-red-600 hover:text-red-900',
      requiredPermission: 'manage-contact-us'
    }
  ];

  return (
    <PageTemplate
      title={t("Newsletter")}
      url="/newsletter"
      breadcrumbs={breadcrumbs}
      description={t("Manage your newsletter subscriptions.")}
      noPadding
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[]}
          hasActiveFilters={() => searchTerm !== ''}
          activeFilterCount={() => searchTerm !== '' ? 1 : 0}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={subscriptions?.data || []}
          from={subscriptions?.from || 1}
          onAction={handleAction}
          permissions={permissions}
          entityPermissions={{
            view: 'manage-contact-us',
            create: false,
            edit: false,
            delete: 'manage-contact-us'
          }}
          showActions={true}
        />

        <Pagination
          from={subscriptions?.from || 0}
          to={subscriptions?.to || 0}
          total={subscriptions?.total || 0}
          links={subscriptions?.links}
          entityName={t("subscriptions")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('newsletter.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
          onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
        />
      </div>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.email || ''}
        entityName={t('newsletter subscription')}
      />
    </PageTemplate>
  );
}
