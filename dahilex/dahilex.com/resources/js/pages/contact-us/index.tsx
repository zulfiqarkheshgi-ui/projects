import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { toast } from '@/components/custom-toast';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import UserColumn from '@/components/UserColumn';

export default function ContactUsPage() {
  const { t } = useTranslation();
  const { auth, contacts, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen,setIsDeleteModalOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get(route('contact-us.index'), {
      page: 1,
      search: searchTerm || undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    router.get(route('contact-us.index'), {}, { preserveState: true, preserveScroll: true });
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Landing Page') },
    { title: t('Contact Inquiries') }
  ];

  const handleAction = (action: string, item: any) => {
    setCurrentContact(item);
    if (action === 'delete') {
      setIsDeleteModalOpen(true);
    } else if (action === 'view') {
      setIsViewModalOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (isDeleteModalOpen) {
      router.delete(route('contact-us.destroy', currentContact.id), {
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
            toast.error(`Failed to delete contact message: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const columns = [
    { key: 'user', label: t('User'),
        render: (value: any, row: any) => {
            return (
                <UserColumn user={{ name : row.name, email : row.email}} />
            );
        }
    },
    {
      key: 'created_at',
      label: t('Date'),
      type: 'date',
    }
  ];

  const actions = [
    {
      label: t('View'),
      action: 'view',
      icon: 'Eye',
      className: 'text-blue-500 hover:text-blue-700',
      requiredPermission: 'manage-contact-us'
    },
    {
      label: t('Delete'),
      action: 'delete',
      icon: 'Trash2',
      className: 'text-red-500 hover:text-red-700',
      requiredPermission: 'manage-contact-us'
    }
  ];

  return (
    <PageTemplate
      title={t("Contact Inquiries")}
      url="/contact-us"
      breadcrumbs={breadcrumbs}
      description={t("Manage and review contact inquiries from users.")}
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
          data={contacts?.data || []}
          from={contacts?.from || 1}
          onAction={handleAction}
          sortField={undefined}
          sortDirection={undefined}
          onSort={undefined}
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
          from={contacts?.from || 0}
          to={contacts?.to || 0}
          total={contacts?.total || 0}
          links={contacts?.links}
          entityName={t("contact messages")}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('contact-us.index'), {
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
        itemName={`${currentContact?.name || ''} - ${currentContact?.subject || ''}`}
        entityName={t('contact')}
      />

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentContact && <ViewPopup record={currentContact} />}
      </Dialog>
    </PageTemplate>
  );
}
