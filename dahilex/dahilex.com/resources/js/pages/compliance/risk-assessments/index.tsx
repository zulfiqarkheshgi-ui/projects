import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import {
    Plus, ShieldAlert,
    CheckCircle2,
    BarChart3, TrendingUp, XCircle,
} from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { capitalize, hexToRgba } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ViewPopup from './view';

// ── Helpers ───────────────────────────────────────────────────────────────────
const PROB_VALUES: Record<string, number> = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
const PROB_LABELS = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const PROB_KEYS = ['very_low', 'low', 'medium', 'high', 'very_high'];

function calcScore(probability: string, impact: string) {
    return (PROB_VALUES[probability] ?? 3) * (PROB_VALUES[impact] ?? 3);
}

function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 4) return 'low';
    if (score <= 9) return 'medium';
    if (score <= 16) return 'high';
    return 'critical';
}

function getCellColor(p: number, i: number): string {
    const score = p * i;
    if (score <= 4) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800/60';
    if (score <= 9) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800/60';
    if (score <= 16) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800/60';
    return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/60';
}

const LEVEL_CONFIG = {
    low: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', bar: 'border-t-emerald-400' },
    medium: { cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20', bar: 'border-t-yellow-400' },
    high: { cls: 'bg-orange-50 text-orange-700 ring-orange-600/20', bar: 'border-t-orange-400' },
    critical: { cls: 'bg-red-50 text-red-700 ring-red-600/20', bar: 'border-t-red-500' },
} as const;

const STATUS_CONFIG: Record<string, string> = {
    identified: 'bg-gray-50 text-gray-700 ring-gray-600/20',
    assessed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    mitigated: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    monitored: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    closed: 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

// ── Risk Matrix component ─────────────────────────────────────────────────────
function RiskMatrix({ matrixCounts, selectedCell, onCellClick }: {
    matrixCounts: Record<string, number>;
    selectedCell: string | null;
    onCellClick: (key: string | null) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('Risk Matrix')}</h3>
                {selectedCell && (
                    <button
                        onClick={() => onCellClick(null)}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                    >
                        <XCircle className="h-3.5 w-3.5" />{t('Clear')}
                    </button>
                )}
            </div>

            <div className="flex gap-2">
                {/* Y-axis label */}
                <div className="flex items-center justify-center w-5 shrink-0">
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-widest"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                        {t('Probability')}
                    </span>
                </div>

                <div className="flex-1">
                    {/* Matrix grid — probability rows high→low, impact cols low→high */}
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(5, 1fr)` }}>
                        {[...PROB_KEYS].reverse().map((probKey, rowIdx) => {
                            const p = PROB_VALUES[probKey];
                            return PROB_KEYS.map((impactKey, colIdx) => {
                                const i = PROB_VALUES[impactKey];
                                const key = `${probKey}_${impactKey}`;
                                const count = matrixCounts[key] ?? 0;
                                const isSelected = selectedCell === key;
                                return (
                                    <TooltipProvider key={key}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => onCellClick(isSelected ? null : key)}
                                                    className={`relative flex flex-col items-center justify-center rounded-md h-12 text-xs font-bold transition-all duration-150 cursor-pointer
                                                        ${getCellColor(p, i)}
                                                        ${isSelected ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-md' : ''}
                                                    `}
                                                >
                                                    <span className="text-base leading-none">{count > 0 ? count : '·'}</span>
                                                    <span className="text-[9px] opacity-60 leading-none mt-0.5">{p * i}</span>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-xs">
                                                {`P: ${PROB_LABELS[p - 1]} × I: ${PROB_LABELS[i - 1]} = ${p * i}`}
                                                {count > 0 ? ` (${count} risk${count > 1 ? 's' : ''})` : ''}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            });
                        })}
                    </div>

                    {/* X-axis labels */}
                    <div className="grid mt-1 gap-1" style={{ gridTemplateColumns: `repeat(5, 1fr)` }}>
                        {PROB_LABELS.map(l => (
                            <span key={l} className="text-center text-[9px] text-gray-400 dark:text-gray-500 font-medium truncate px-0.5">{l}</span>
                        ))}
                    </div>
                    <p className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-widest mt-1">{t('Impact')}</p>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                {([
                    { level: 'low', cls: 'bg-emerald-100 text-emerald-700' },
                    { level: 'medium', cls: 'bg-yellow-100 text-yellow-700' },
                    { level: 'high', cls: 'bg-orange-100 text-orange-700' },
                    { level: 'critical', cls: 'bg-red-100 text-red-700' },
                ]).map(({ level }) => (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${LEVEL_CONFIG[level].cls}`}>
                        {t(capitalize(level))}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RiskAssessments() {
    const { t } = useTranslation();
    const {
        auth, riskAssessments, riskCategories, allRiskCategories,
        stats, matrixCounts,
        filters: pageFilters = {}
    } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.risk_category || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [selectedRiskLevel, setSelectedRiskLevel] = useState(pageFilters.risk_level || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    // Matrix cell derived from URL — server does the filtering
    const selectedCell = (pageFilters.probability && pageFilters.impact)
        ? `${pageFilters.probability}_${pageFilters.impact}` : null;

    const hasActiveFilters = () => searchTerm !== '' || selectedCategory !== '_empty_' || selectedStatus !== '_empty_' || selectedRiskLevel !== '_empty_';
    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedRiskLevel !== '_empty_' ? 1 : 0);

    const nav = (extra: Record<string, any> = {}) => router.get(route('compliance.risk-assessments.index'), {
        search: searchTerm || undefined,
        risk_category: selectedCategory !== '_empty_' ? selectedCategory : undefined,
        status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
        risk_level: selectedRiskLevel !== '_empty_' ? selectedRiskLevel : undefined,
        probability: pageFilters.probability || undefined,
        impact: pageFilters.impact || undefined,
        ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
        ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        ...extra,
    }, { preserveState: true, preserveScroll: true });

    const handleCellClick = (key: string | null) => {
        if (!key) { nav({ probability: undefined, impact: undefined, page: 1 }); return; }
        // Parse "<prob>_<impact>" where prob/impact may contain underscores (e.g. very_low)
        let probability = '';
        let impact = '';
        for (const pk of PROB_KEYS) {
            if (key.startsWith(pk + '_')) {
                probability = pk;
                impact = key.slice(pk.length + 1);
                break;
            }
        }
        nav({ probability, impact, page: 1 });
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleFormSubmit = (formData: any) => {
        const isCreate = formMode === 'create';
        router[isCreate ? 'post' : 'put'](
            isCreate ? route('compliance.risk-assessments.store') : route('compliance.risk-assessments.update', currentItem.id),
            formData,
            {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    const f = page.props.flash as any;
                    if (f?.success) toast.success(f.success);
                    else if (f?.error) toast.error(f.error);
                },
                onError: (errors) => toast.error(Object.values(errors).join(', ')),
            }
        );
    };

    const handleDeleteConfirm = () => {
        router.delete(route('compliance.risk-assessments.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                if (f?.error) toast.error(f.error);
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    // ── Page setup ────────────────────────────────────────────────────────────
    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-risk-assessments')) {
        pageActions.push({
            label: t('Add Risk Assessment'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); },
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Compliance & Regulatory') },
        { title: t('Risk Assessments') },
    ];

    // Data already filtered server-side by probability+impact when cell selected
    const data: any[] = riskAssessments?.data || [];

    // Define table columns
    const columns = [
        {
            key: 'risk_title',
            label: t('Risk Title'),
            sortable: true
        },
        {
            key: 'risk_category',
            label: t('Category'),
            render: (value: any, row: any) => {
                const category = row.risk_category;
                return category ? (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                        style={{
                            backgroundColor: `${category?.color}20`,
                            color: category?.color,
                            boxShadow: `inset 0 0 0 1px ${hexToRgba(category?.color, 0.2)}`,
                        }}
                    >
                        {category.name}
                    </span>
                ) : '-';
            },
        },
        {
            key: 'risk_level',
            label: t('Risk Level'),
            render: (value: any, row: any) => {
                const score = calcScore(row.probability, row.impact);
                const level = getRiskLevel(score);
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${LEVEL_CONFIG[level].cls}`}>
                        {t(capitalize(level))} · {score}
                    </span>
                );
            },
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_CONFIG[value] ?? STATUS_CONFIG.identified}`}>
                    {t(capitalize(value))}
                </span>
            ),
        },
        {
            key: 'responsible_person',
            label: t('Responsible'),
        },
        {
            key: 'assessment_date',
            label: t('Date'),
            sortable: true,
            type: 'date' as const,
        },
    ];

    // Define table actions
    const tableActions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-risk-assessments'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-risk-assessments'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-risk-assessments'
        }
    ];

    const handleAction = (action: string, item: any) => {
        setCurrentItem(action === 'edit'
            ? { ...item, risk_category_id: item.risk_category_id?.toString() }
            : item
        );
        if (action === 'view') setIsViewModalOpen(true);
        if (action === 'edit') { setFormMode('edit'); setIsFormModalOpen(true); }
        if (action === 'delete') setIsDeleteModalOpen(true);
    };

    const handleSort = (field: string) => {
        nav({
            page: 1,
            sort_field: field,
            sort_direction: pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc',
        });
    };

    // Prepare options for filters and form
    const categoryOptions = [
        { value: '_empty_', label: t('All Categories') },
        ...(allRiskCategories || []).map((category: any) => ({
            value: category.id.toString(),
            label: category.name
        }))
    ];
    const statusOptions = [
        { value: '_empty_', label: t('All Status') },
        { value: 'identified', label: t('Identified') },
        { value: 'assessed', label: t('Assessed') },
        { value: 'mitigated', label: t('Mitigated') },
        { value: 'monitored', label: t('Monitored') },
        { value: 'closed', label: t('Closed') }
    ];

    const riskLevelOptions = [
        { value: '_empty_', label: t('All Risk Levels') },
        { value: 'low', label: t('Low') },
        { value: 'medium', label: t('Medium') },
        { value: 'high', label: t('High') },
        { value: 'critical', label: t('Critical') }
    ];

    const probabilityOptions = [
        { value: 'very_low', label: t('Very Low') },
        { value: 'low', label: t('Low') },
        { value: 'medium', label: t('Medium') },
        { value: 'high', label: t('High') },
        { value: 'very_high', label: t('Very High') }
    ];

    const impactOptions = [
        { value: 'very_low', label: t('Very Low') },
        { value: 'low', label: t('Low') },
        { value: 'medium', label: t('Medium') },
        { value: 'high', label: t('High') },
        { value: 'very_high', label: t('Very High') }
    ];
    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) nav({ page: 1 });
        setPageInitialState(false);
    }, [selectedCategory, selectedStatus, selectedRiskLevel]);

    const handleResetFilters = () => {
        router.get(route('compliance.risk-assessments.index'));
    };



    return (
        <PageTemplate
            title={t("Risk Assessments")}
            description={t("Identify, assess, and mitigate organizational compliance risks.")}
            url="/compliance/risk-assessments"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {([
                    { label: t('Total'), value: stats?.total ?? 0, icon: BarChart3, iconCls: 'text-gray-600', blobCls: 'bg-gray-100 dark:bg-gray-700/40' },
                    { label: t('Critical / High'), value: stats?.critical_high ?? 0, icon: ShieldAlert, iconCls: 'text-red-600', blobCls: 'bg-red-50 dark:bg-red-900/30' },
                    { label: t('Open'), value: stats?.open ?? 0, icon: TrendingUp, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                    { label: t('Closed'), value: stats?.closed ?? 0, icon: CheckCircle2, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
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


            {/* Search and filters section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={(e) => { e.preventDefault(); nav({ page: 1 }); }}
                    filters={[
                        {
                            name: 'risk_category',
                            label: t('Category'),
                            type: 'select',
                            value: selectedCategory,
                            searchable: true,
                            onChange: setSelectedCategory,
                            options: categoryOptions
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: statusOptions
                        },
                        {
                            name: 'risk_level',
                            label: t('Risk Level'),
                            type: 'select',
                            value: selectedRiskLevel,
                            onChange: setSelectedRiskLevel,
                            options: riskLevelOptions
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* ── Two-column: Matrix + Cards ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">

                {/* ── Left: Risk Matrix ── */}
                <div className="lg:sticky lg:top-4">
                    <RiskMatrix
                        matrixCounts={matrixCounts || {}}
                        selectedCell={selectedCell}
                        onCellClick={handleCellClick}
                    />
                </div>

                {/* ── Right: Risk table ── */}
                <div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                        <CrudTable
                            columns={columns}
                            actions={tableActions}
                            data={data}
                            from={riskAssessments?.from || 1}
                            onAction={handleAction}
                            sortField={pageFilters.sort_field}
                            sortDirection={pageFilters.sort_direction}
                            onSort={handleSort}
                            permissions={permissions}
                            entityPermissions={{
                                view: 'view-risk-assessments',
                                create: 'create-risk-assessments',
                                edit: 'edit-risk-assessments',
                                delete: 'delete-risk-assessments'
                            }}
                        />
                        <Pagination
                            from={riskAssessments?.from || 0}
                            to={riskAssessments?.to || 0}
                            total={riskAssessments?.total || 0}
                            links={riskAssessments?.links}
                            entityName={t("risk assessments")}
                            currentPerPage={pageFilters.per_page?.toString() || '10'}
                            onPerPageChange={(value) => nav({ page: 1, per_page: parseInt(value) })}
                            onPageChange={(url) => nav({ page: new URL(url).searchParams.get('page') })}
                        />
                    </div>
                </div>
            </div>

            {/* Form Modal (Create/Edit) */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'risk_title', label: t('Risk Title'), type: 'text', required: true, placeholder: 'eg. Data Breach Risk' },
                        {
                            name: 'risk_category_id',
                            label: t('Risk Category'),
                            type: 'select',
                            searchable: true,
                            required: true,
                            options: riskCategories ? riskCategories.map((category: any) => ({
                                value: category.id.toString(),
                                label: category.name
                            })) : [],
                            emptyNote: { link: route('compliance.risk-categories.index'), linkText: t('Risk Categories') }
                        },
                        { name: 'description', label: t('Description'), type: 'textarea', required: true, placeholder: 'eg. Risk of unauthorized access to client data' },
                        {
                            name: 'probability',
                            label: t('Probability'),
                            type: 'select',
                            required: true,
                            options: probabilityOptions
                        },
                        {
                            name: 'impact',
                            label: t('Risk Level'),
                            type: 'select',
                            required: true,
                            options: impactOptions
                        },
                        { name: 'mitigation_plan', label: t('Mitigation Plan'), type: 'textarea', placeholder: 'eg. Implement two-factor authentication and encryption' },
                        { name: 'control_measures', label: t('Control Measures'), type: 'textarea', placeholder: 'eg. Regular security audits and staff training' },
                        { name: 'assessment_date', label: t('Assessment Date'), type: 'date', required: true },
                        { name: 'review_date', label: t('Review Date'), type: 'date' },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: statusOptions.slice(1), // Remove 'All Status' option
                            defaultValue: 'identified'
                        },
                        { name: 'responsible_person', label: t('Responsible Person'), type: 'text', placeholder: 'eg. Chief Compliance Officer' }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem}
                title={
                    formMode === 'create'
                        ? t('Add New Risk Assessment')
                        : t('Edit Risk Assessment')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.risk_title || ''}
                entityName="risk assessment"
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
