import { useState } from 'react';
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
import { formatCurrency } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';

export default function Expenses() {
    const { t } = useTranslation();
    const { auth, expenses, categories, allCategories, cases, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.expense_category_id || '_empty_');
    const [selectedBillable, setSelectedBillable] = useState(pageFilters.is_billable || '_empty_');
    const [selectedApproved, setSelectedApproved] = useState(pageFilters.is_approved || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const hasActiveFilters = () => searchTerm !== '' || selectedCategory !== '_empty_' || selectedBillable !== '_empty_' || selectedApproved !== '_empty_';

    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0) + (selectedBillable !== '_empty_' ? 1 : 0) + (selectedApproved !== '_empty_' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('billing.expenses.index'), {
            page: 1,
            search: searchTerm || undefined,
            expense_category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
            is_approved: selectedApproved !== '_empty_' ? selectedApproved : undefined,
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
            case 'approve':
                handleApprove(item);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        if (formData.is_billable === '0' || formData.is_billable === 0 || formData.is_billable === false) {
            if(!formData?.amount) formData.amount = 0;
        }
        if (formMode === 'create') {

            router.post(route('billing.expenses.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    }
                },
                onError: (errors) => {
                    // Check if it's a duplicate error from flash message
                    const page = router.page as any;
                    if (page?.props?.flash?.error) {
                        toast.error(page.props.flash.error);
                    } else {
                        toast.error(`Failed to create expense: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        } else if (formMode === 'edit') {

            router.put(route('billing.expenses.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (page.props.flash.success) {
                        toast.success(page.props.flash.success);
                    }
                },
                onError: (errors) => {
                    // Check if it's a duplicate error from flash message
                    const page = router.page as any;
                    if (page?.props?.flash?.error) {
                        toast.error(page.props.flash.error);
                    } else {
                        toast.error(`Failed to update expense: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        }
    };

    const handleDeleteConfirm = () => {

        router.delete(route('billing.expenses.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to delete expense: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleApprove = (expense: any) => {
        const action = expense.is_approved ? 'unapproving' : 'approving';

        router.put(route('billing.expenses.approve', expense.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to ${action} expense: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('_empty_');
        setSelectedBillable('_empty_');
        setSelectedApproved('_empty_');
        setShowFilters(false);
        router.get(route('billing.expenses.index'), {}, { preserveState: true, preserveScroll: true });
    };

    // Define page actions
    const pageActions = [];

    if (hasPermission(permissions, 'create-expenses')) {
        pageActions.push({
            label: t('Add Expense'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Billing & Invoicing'), href: route('billing.time-entries.index') },
        { title: t('Expenses') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'case',
            label: t('Case'),
            render: (value: any, row: any) => {
                return row?.case?.title || '-';
            }
        },
        {
            key: 'expense_category',
            label: t('Category'),
            render: (value: any, row: any) => {
                return row?.category?.name || '-';
            }
        },
        {
            key: 'amount',
            label: t('Amount'),
            render: (value: any) => {
                const amount = parseFloat(value);
                return isNaN(amount) ? formatCurrency(0.00) : formatCurrency(amount);
            }
        },
        {
            key: 'expense_date',
            label: t('Date'),
            render: (value: string) => window.appSettings?.formatDate(value) || new Date(value).toLocaleDateString()
        },
        {
            key: 'is_billable',
            label: t('Billable'),
            render: (value: boolean) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                    }`}>
                    {value ? t('Yes') : t('No')}
                </span>
            )
        },
        {
            key: 'is_approved',
            label: t('Status'),
            render: (value: boolean) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                    }`}>
                    {value ? t('Approved') : t('Pending')}
                </span>
            )
        }
    ];

    // Define table actions
    const actions = [
        {
            label: t('Approve'),
            icon: 'CheckCircle',
            action: 'approve',
            className: 'text-green-500',
            requiredPermission: 'approve-expenses',
            condition: (row: any) => !row.is_approved
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-expenses'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-expenses'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-expenses'
        }
    ];

    // Prepare filter options
    const categoryOptions = [
        { value: '_empty_', label: t('All Categories') },
        ...(allCategories || []).map((category: any) => ({
            value: category.id.toString(),
            label: category.name
        }))
    ];

    const billableOptions = [
        { value: '_empty_', label: t('All') },
        { value: '1', label: t('Billable') },
        { value: '0', label: t('Non-billable') }
    ];

    const approvedOptions = [
        { value: '_empty_', label: t('All Status') },
        { value: '1', label: t('Approved') },
        { value: '0', label: t('Pending') }
    ];

    return (
        <PageTemplate
            title={t("Expenses")}
            url="/billing/expenses"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Search and filters section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'expense_category_id',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            value: selectedCategory,
                            onChange: setSelectedCategory,
                            options: categoryOptions
                        },
                        {
                            name: 'is_billable',
                            label: t('Billable'),
                            type: 'select',
                            value: selectedBillable,
                            onChange: setSelectedBillable,
                            options: billableOptions
                        },
                        {
                            name: 'is_approved',
                            label: t('Status'),
                            type: 'select',
                            value: selectedApproved,
                            onChange: setSelectedApproved,
                            options: approvedOptions
                        }
                    ]}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    onApplyFilters={applyFilters}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('billing.expenses.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            expense_category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
                            is_billable: selectedBillable !== '_empty_' ? selectedBillable : undefined,
                            is_approved: selectedApproved !== '_empty_' ? selectedApproved : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            {/* Content section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={expenses?.data || []}
                    from={expenses?.from || 1}
                    onAction={handleAction}
                    sortField={undefined}
                    sortDirection={undefined}
                    onSort={undefined}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-expenses',
                        create: 'create-expenses',
                        edit: 'edit-expenses',
                        delete: 'delete-expenses'
                    }}
                />

                {/* Pagination section */}
                <Pagination
                    from={expenses?.from || 0}
                    to={expenses?.to || 0}
                    total={expenses?.total || 0}
                    links={expenses?.links}
                    entityName={t("expenses")}
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
                            name: 'case_id',
                            label: t('Case'),
                            type: 'select',
                            searchable: true,
                            required:true,
                            options: [
                                // { value: '', label: t('No Case (General Expense)') },
                                ...(cases || []).map((caseItem: any) => ({
                                    value: caseItem.id.toString(),
                                    label: caseItem.case_id ? `${caseItem.case_id} - ${caseItem.title}` : caseItem.title
                                }))
                            ],
                            emptyNote: { link: route('cases.index'), linkText: t('Cases') }
                        },
                        {
                            name: 'expense_category_id',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: (categories || []).filter(category => category.id && category.name).map((category: any) => ({
                                value: category.id.toString(),
                                label: category.name
                            })),
                            emptyNote: { link: route('billing.expense-categories.index'), linkText: t('Expense Categories') }
                        },
                        { name: 'description', label: t('Description'), type: 'textarea', required: true, placeholder: 'eg. Court filing fees for motion' },
                        {
                            name: 'is_billable',
                            label: t('Billable'),
                            type: 'select',
                            options: [
                                { value: '1', label: t('Yes') },
                                { value: '0', label: t('No') }
                            ],
                            defaultValue: '1'
                        },
                        { name: 'amount', label: t('Amount'), type: 'number', step: '0.01', required: true, min: '0', placeholder: 'eg. 250', conditional: (mode: string, formData: any) => formData.is_billable === '1' || formData.is_billable === 1 || formData.is_billable === true },
                        { name: 'expense_date', label: t('Expense Date'), type: 'date', required: true },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Receipt attached' }
                    ],
                    modalSize: 'lg'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    case_id: currentItem.case_id?.toString() || '',
                    expense_category_id: currentItem.expense_category_id?.toString() || '',
                    is_billable: currentItem.is_billable !== undefined ? currentItem.is_billable.toString() : '1'
                } : null}
                title={
                    formMode === 'create'
                        ? t('Add New Expense')
                        : t('Edit Expense')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.description || ''}
                entityName="expense"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
