import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Scale, Star, Calendar, Book, TrendingUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import { Card, CardContent } from '@/components/ui/card';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';

export default function LegalPrecedents() {
    const { t } = useTranslation();
    const { auth, precedents, categories, allCategories, stats, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.category_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [selectedRelevance, setSelectedRelevance] = useState(pageFilters.relevance_score || '_empty_');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const [pageInitialState, setPageInitialState] = useState(true);


    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedCategory, selectedStatus, selectedRelevance])

    const applyFilters = () => {
        router.get(route('legal-research.precedents.index'), {
            page: 1,
            search: searchTerm || undefined,
            category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            relevance_score: selectedRelevance !== '_empty_' ? selectedRelevance : undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field
            ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('legal-research.precedents.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
            relevance_score: selectedRelevance !== '_empty_' ? selectedRelevance : undefined,
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
            case 'toggle-status':
                setIsStatusModalOpen(true);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleStatusChange = (formData: any) => {

        router.put(route('legal-research.precedents.update', currentItem.id), { ...currentItem, status: formData.status }, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to update precedent status: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleFormSubmit = (formData: any) => {
        // Convert key_points string to array
        if (formData.key_points && typeof formData.key_points === 'string') {
            formData.key_points = formData.key_points.split(',').map((point: string) => point.trim()).filter(Boolean);
        }

        const action = formMode === 'create' ? 'store' : 'update';
        const route_name = formMode === 'create'
            ? 'legal-research.precedents.store'
            : 'legal-research.precedents.update';


        const method = formMode === 'create' ? 'post' : 'put';
        const url = formMode === 'create'
            ? route(route_name)
            : route(route_name, currentItem.id);

        router[method](url, formData, {
            onSuccess: (page) => {
                setIsFormModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to ${action} legal precedent: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleDeleteConfirm = () => {
        router.delete(route('legal-research.precedents.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to delete legal precedent: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const pageActions = [];
    if (hasPermission(permissions, 'create-legal-precedents')) {
        pageActions.push({
            label: t('Add Legal Precedent'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Legal Research') },
        { title: t('Legal Precedents') }
    ];

    const columns = [
        {
            key: 'case_name',
            label: t('Case Name'),
            sortable: true,
            render: (value: string, row: any) => (
                <div>
                    <div className="font-medium">{row.case_name}</div>
                    <div className="text-sm text-muted-foreground">{row.citation}</div>
                </div>
            )
        },
        {
            key: 'jurisdiction',
            label: t('Jurisdiction'),
            render: (value: string) => (
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    {value}
                </span>
            )
        },
        {
            key: 'category',
            label: t('Category'),
            render: (value: any) => value?.name || '-'
        },
        {
            key: 'relevance_score',
            label: t('Relevance'),
            sortable: true,
            render: (value: number) => {
                const earned = value || 0;
                const required = 10;
                const pct = required > 0 ? Math.min(100, (earned / required) * 100) : 100;
                const color = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400';
                return (
                    <div className="min-w-[100px] space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                                    {earned}{required > 0 && <span className="font-normal text-gray-400">/{required}</span>}
                                </span>
                            </div>
                            {required > 0 && (
                                <span className={`text-[10px] font-semibold tabular-nums ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-blue-600' : 'text-orange-500'
                                    }`}>{Math.round(pct)}%</span>
                            )}
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'decision_date',
            label: t('Decision Date'),
            type: 'date'
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => {
                const statusColors = {
                    active: 'bg-green-50 text-green-700 ring-green-600/20',
                    overruled: 'bg-red-50 text-red-700 ring-red-600/20',
                    questioned: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    archived: 'bg-gray-50 text-gray-700 ring-gray-600/20'
                };

                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors] || statusColors.active}`}>
                        {t(value.charAt(0).toUpperCase() + value.slice(1))}
                    </span>
                );
            }
        }
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-gray-500',
            requiredPermission: 'view-legal-precedents'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-gray-500',
            requiredPermission: 'edit-legal-precedents'
        },
        {
            label: t('Change Status'),
            icon: 'RefreshCw',
            action: 'toggle-status',
            className: 'text-gray-500',
            requiredPermission: 'toggle-status-legal-precedents'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-gray-500',
            requiredPermission: 'delete-legal-precedents'
        }
    ];

    const categoryOptions = [
        { value: '_empty_', label: t('All Categories') },
        ...(allCategories || []).map((cat: any) => ({ value: cat.id.toString(), label: cat.name }))
    ];

    const handleResetFilters = () => {
        router.get(route('legal-research.precedents.index'));
    };



    return (
        <PageTemplate
            title={t("Legal Precedents")}
            description={t("Manage and analize precedent cases with advansed search and filtering")}
            url="/legal-research/precedents"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {([
                    { label: t('Total Precedents'), value: stats?.total ?? 0, icon: Book, iconCls: 'text-gray-600', blobCls: 'bg-gray-100 dark:bg-gray-700/40' },
                    { label: t('Active'), value: stats?.active ?? 0, icon: CheckCircle2, iconCls: 'text-red-600', blobCls: 'bg-red-50 dark:bg-red-900/30' },
                    { label: t('Overruled / Questioned'), value: (stats?.overruled ?? 0) + ( stats?.questioned ?? 0 ), icon: AlertTriangle, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                    { label: t('Avg. Relevance'), value: stats?.avg_relevance, icon: TrendingUp, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                    <Card key={label} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                        <CardContent className="relative p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                                </div>
                                <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5`}>
                                    <Icon className={`h-5 w-5 ${iconCls}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'category_id',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            value: selectedCategory,
                            onChange: setSelectedCategory,
                            options: categoryOptions
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                                { value: '_empty_', label: t('All Status') },
                                { value: 'active', label: t('Active') },
                                { value: 'overruled', label: t('Overruled') },
                                { value: 'questioned', label: t('Questioned') },
                                { value: 'archived', label: t('Archived') }
                            ]
                        },
                        {
                            name: 'relevance_score',
                            label: t('Min Relevance'),
                            type: 'select',
                            value: selectedRelevance,
                            onChange: setSelectedRelevance,
                            options: [
                                { value: '_empty_', label: t('All Scores') },
                                { value: '8', label: t('8+ Stars') },
                                { value: '6', label: t('6+ Stars') },
                                { value: '4', label: t('4+ Stars') }
                            ]
                        }
                    ]}
                    hasActiveFilters={() => searchTerm !== '' || selectedCategory !== '_empty_' || selectedStatus !== '_empty_' || selectedRelevance !== '_empty_'}
                    activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedRelevance !== '_empty_' ? 1 : 0)}
                    onResetFilters={handleResetFilters}
                />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={precedents?.data || []}
                    from={precedents?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-legal-precedents',
                        create: 'create-legal-precedents',
                        edit: 'edit-legal-precedents',
                        delete: 'delete-legal-precedents'
                    }}
                />

                <Pagination
                    from={precedents?.from || 0}
                    to={precedents?.to || 0}
                    total={precedents?.total || 0}
                    links={precedents?.links}
                    entityName={t("legal precedents")}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('legal-research.precedents.index'), {
                            page: 1,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            search: searchTerm || undefined,
                            category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
                            status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                            relevance_score: selectedRelevance !== '_empty_' ? selectedRelevance : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                />
            </div>

            {/* Form Modal (Create/Edit) */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'case_name', label: t('Case Name'), type: 'text', required: true, placeholder: 'eg. Smith v. Jones' },
                        { name: 'citation', label: t('Citation'), type: 'text', required: true, placeholder: 'eg. 123 F.3d 456 (2nd Cir. 2020)' },
                        { name: 'jurisdiction', label: t('Jurisdiction'), type: 'text', required: true, placeholder: 'eg. Federal, New York State' },
                        {
                            name: 'category_id',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: [
                                ...(categories || []).map((cat: any) => ({ value: cat.id, label: cat.name }))
                            ],
                            emptyNote: { link: route('legal-research.categories.index'), linkText: t('Research Categories') }
                        },
                        { name: 'summary', label: t('Summary'), type: 'textarea', required: true, rows: 4, placeholder: 'eg. Court ruled in favor of plaintiff on grounds of breach of contract...' },
                        {
                            name: 'relevance_score',
                            label: t('Relevance Score (1-10)'),
                            type: 'number',
                            required: true,
                            min: 1,
                            max: 10,
                            defaultValue: 5
                        },
                        { name: 'decision_date', label: t('Decision Date'), type: 'date' },
                        { name: 'court_level', label: t('Court Level'), type: 'text', placeholder: 'eg. Court of Appeals' },
                        { name: 'key_points', label: t('Key Points'), type: 'text', placeholder: 'Enter key points separated by commas' },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'active', label: t('Active') },
                                { value: 'overruled', label: t('Overruled') },
                                { value: 'questioned', label: t('Questioned') },
                                { value: 'archived', label: t('Archived') }
                            ],
                            defaultValue: 'active'
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    key_points: currentItem.key_points ? currentItem.key_points.join(', ') : ''
                } : null}
                title={
                    formMode === 'create'
                        ? t('Add New Legal Precedent')
                        : t('Edit Legal Precedent')
                }
                mode={formMode}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.case_name || ''}
                entityName="legal precedent"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>

            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'active', label: t('Active') },
                                { value: 'overruled', label: t('Overruled') },
                                { value: 'questioned', label: t('Questioned') },
                                { value: 'archived', label: t('Archived') }
                            ]
                        }
                    ],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Precedent Status')}
                mode='edit'
            />
        </PageTemplate >
    );
}
