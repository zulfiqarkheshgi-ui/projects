import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import {
    Plus, BookOpen, Edit, Trash2, Eye, Globe, Lock,
    Tag, User, Calendar, CheckCircle, FileText, Archive, Send,
    MoreHorizontal, Search,
} from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStatusText, hexToRgba } from '@/utils/helpers';

const STATUS_CONFIG = {
    published: { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    draft: { label: 'Draft', cls: 'bg-gray-50 text-gray-700 ring-gray-600/20' },
    archived: { label: 'Archived', cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
} as const;

function stripHtml(html: string): string {
    return html?.replace(/<[^>]*>/g, '') ?? '';
}

export default function KnowledgeArticles() {
    const { t } = useTranslation();
    const {
        auth,
        articles,
        stats,
        categories,
        allCategories,
        filters: pageFilters = {},
    } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.category_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    // ── helpers ───────────────────────────────────────────────────────────────
    const qp = () => ({
        search: searchTerm || undefined,
        category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
        status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
        sort_field: pageFilters.sort_field || undefined,
        sort_direction: pageFilters.sort_direction || undefined,
        ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    });

    const applyFilters = () =>
        router.get(route('legal-research.knowledge.index'), { ...qp(), page: 1 }, { preserveState: true, preserveScroll: true });

    const handleResetFilters = () => {
        router.get(route('legal-research.knowledge.index'));
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleFormSubmit = (formData: any) => {
        if (formData.tags && typeof formData.tags === 'string') {
            formData.tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
        const isCreate = formMode === 'create';
        router[isCreate ? 'post' : 'put'](
            isCreate ? route('legal-research.knowledge.store') : route('legal-research.knowledge.update', currentItem.id),
            formData,
            {
                onSuccess: (page) => {
                    setIsFormOpen(false);
                    const f = page.props.flash as any;
                    if (f?.success) toast.success(t(f.success));
                    else if (f?.error) toast.error(t(f.error));
                },
                onError: (errors) => toast.error(Object.values(errors).join(', ')),
            }
        );
    };

    const handleDelete = () => {
        router.delete(route('legal-research.knowledge.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(t(f.success));
                else if (f?.error) toast.error(t(f.error));
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handlePublishToggle = (article: any) => {
        router.put(route('legal-research.knowledge.publish', article.id), {}, {
            onSuccess: (page) => {
                const f = page.props.flash as any;
                if (f?.success) toast.success(t(f.success));
                else if (f?.error) toast.error(t(f.error));
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handleArchiveToggle = (article: any) => {
        const newStatus = article.status === 'archived' ? 'draft' : 'archived';
        router.put(route('legal-research.knowledge.update', article.id), { ...article, tags: Array.isArray(article.tags) ? article.tags : [], status: newStatus }, {
            onSuccess: (page) => {
                const f = page.props.flash as any;
                if (f?.success) toast.success(t(f.success));
                else if (f?.error) toast.error(t(f.error));
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    // ── page setup ────────────────────────────────────────────────────────────
    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-knowledge-articles')) {
        pageActions.push({
            label: t('New Article'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => { setCurrentItem(null); setFormMode('create'); setIsFormOpen(true); },
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Legal Research') },
        { title: t('Knowledge Article') },
    ];

    const data: any[] = articles?.data || [];

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedCategory, selectedStatus]);


    return (
        <PageTemplate title={t('Knowledge Article')} url="/legal-research/knowledge" actions={pageActions} description={t("Create and manage legal knowledge articles in one place.")} breadcrumbs={breadcrumbs} noPadding>


            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {([
                    { label: t('Total'),     value: stats?.total     ?? 0, icon: BookOpen,    iconCls: 'text-gray-600',    blobCls: 'bg-gray-100 dark:bg-gray-700/40' },
                    { label: t('Published'), value: stats?.published ?? 0, icon: CheckCircle, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                    { label: t('Draft'),     value: stats?.draft     ?? 0, icon: FileText,    iconCls: 'text-blue-600',    blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
                    { label: t('Archived'),  value: stats?.archived  ?? 0, icon: Archive,     iconCls: 'text-yellow-600',  blobCls: 'bg-yellow-50 dark:bg-yellow-900/30' },
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

            {/* ── Filter bar ── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm mb-5">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={(e) => { e.preventDefault(); applyFilters(); }}
                    filters={[
                        {
                            name: 'category_id', label: t('Category'), type: 'select', searchable: true,
                            value: selectedCategory, onChange: setSelectedCategory,
                            options: [
                                { value: '_empty_', label: t('All Categories') },
                                ...(allCategories || []).map((c: any) => ({ value: c.id.toString(), label: c.name })),
                            ],
                        },
                        {
                            name: 'status', label: t('Status'), type: 'select',
                            value: selectedStatus, onChange: setSelectedStatus,
                            options: [
                                { value: '_empty_', label: t('All Statuses') },
                                { value: 'published', label: t('Published') },
                                { value: 'draft', label: t('Draft') },
                                { value: 'archived', label: t('Archived') },
                            ],
                        },
                    ]}
                    hasActiveFilters={() => searchTerm !== '' || selectedCategory !== '_empty_' || selectedStatus !== '_empty_'}
                    activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0)}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* ── Article grid ── */}
            {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        <BookOpen className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('No articles found')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('Create your first knowledge article to get started.')}</p>
                    {hasPermission(permissions, 'create-knowledge-articles') && (
                        <button
                            onClick={() => { setCurrentItem(null); setFormMode('create'); setIsFormOpen(true); }}
                            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />{t('New Article')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.map((article: any) => {
                        const sc = STATUS_CONFIG[article.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
                        const tags: string[] = Array.isArray(article.tags) ? article.tags : [];

                        return (
                            <Card
                                key={article.id}
                                className="group relative flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-t-3 border-t-primary"
                            >
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400`}>
                                                {<BookOpen className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                    {article.title}
                                                </CardTitle>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset gap-1 ${sc.cls}`}>
                                                        {t(sc.label)}
                                                    </span>
                                                    <span
                                                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                                        style={{
                                                            backgroundColor: `${article.category?.color}20`,
                                                            color: article.category?.color,
                                                            boxShadow: `inset 0 0 0 1px ${hexToRgba(article.category?.color, 0.2)}`,
                                                        }}
                                                    >
                                                        {formatStatusText(article.category?.name || '-')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {(hasPermission(permissions, 'manage-knowledge-articles') ||
                                            hasPermission(permissions, 'edit-knowledge-articles') ||
                                            hasPermission(permissions, 'delete-knowledge-articles') ||
                                            hasPermission(permissions, 'publish-knowledge-articles')) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 transition-opacity text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        {hasPermission(permissions, 'manage-knowledge-articles') && (
                                                            <DropdownMenuItem onClick={() => { setCurrentItem(article); setIsViewOpen(true); }}>
                                                                <Eye className="h-4 w-4 mr-2" />{t('View')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {hasPermission(permissions, 'edit-knowledge-articles') && (
                                                            <DropdownMenuItem onClick={() => { setCurrentItem(article); setFormMode('edit'); setIsFormOpen(true); }}>
                                                                <Edit className="h-4 w-4 mr-2" />{t('Edit')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {hasPermission(permissions, 'publish-knowledge-articles') && (
                                                            <DropdownMenuItem onClick={() => handlePublishToggle(article)}>
                                                                <Send className="h-4 w-4 mr-2" />
                                                                {article.status === 'published' ? t('Unpublish') : t('Publish')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {(hasPermission(permissions, 'edit-knowledge-articles') && article.status !== 'archived') && (
                                                            <DropdownMenuItem onClick={() => handleArchiveToggle(article)}>
                                                                <Archive className="h-4 w-4 mr-2" />
                                                                {t('Archive')}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {hasPermission(permissions, 'delete-knowledge-articles') && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-red-600" onClick={() => { setCurrentItem(article); setIsDeleteOpen(true); }}>
                                                                    <Trash2 className="h-4 w-4 mr-2" />{t('Delete')}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col flex-1 p-5">

                                    <p className="text-sm line-clamp-3 leading-relaxed mb-3 min-h-[70px]">
                                        {stripHtml(article.content).trim()}
                                    </p>

                                    {/* Tags */}
                                    {tags.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap mb-3">
                                            <Tag className="h-3 w-3 text-gray-400 shrink-0" />
                                            {tags.slice(0, 4).map((tag) => (
                                                <span key={tag} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 dark:bg-blue-700 text-blue-600 dark:text-blue-300">
                                                    {tag}
                                                </span>
                                            ))}
                                            {tags.length > 4 && (
                                                <span className="text-[11px] text-gray-400">+{tags.length - 4}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer: author + date */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200 dark:border-gray-800 mt-auto">
                                        {/* <div className="flex items-center gap-2 min-w-0">
                                            <Avatar className="h-7 w-7 shrink-0 ring-2 ring-white dark:ring-gray-900">
                                                <AvatarImage src={article.creator?.avatar} alt={article.creator?.name} />
                                                <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                                    {getInitials(article.creator?.name || '?')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs truncate">{article.creator?.name ?? t('Unknown')}</span>
                                        </div> */}
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage
                                                    src={article.creator?.avatar}
                                                    alt={article.creator?.name}
                                                />
                                                <AvatarFallback className="text-lg">
                                                    {getInitials(article.creator?.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-sm font-medium">{article.creator?.name}</div>
                                                <div className="text-xs text-muted-foreground">{article.creator?.email}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-2 min-w-[110px]">
                                            {article.created_at && <Calendar className="h-4 w-4" />}
                                            <span>{window.appSettings?.formatDate(article.created_at) || '-'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── Pagination ── */}
            {articles?.total > 0 && (
                <div className="mt-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <Pagination
                        from={articles?.from || 0}
                        to={articles?.to || 0}
                        total={articles?.total || 0}
                        links={articles?.links}
                        entityName={t('articles')}
                        perPageOptions={[9,27,45,90]}
                        currentPerPage={pageFilters.per_page?.toString() || '9'}
                        onPerPageChange={(value) => {
                            router.get(route('legal-research.knowledge.index'), {
                                ...qp(), page: 1, per_page: parseInt(value),
                            }, { preserveState: true, preserveScroll: true });
                        }}
                        onPageChange={(url) => {
                            const page = new URL(url).searchParams.get('page');
                            router.get(route('legal-research.knowledge.index'), { ...qp(), page }, { preserveState: true, preserveScroll: true });
                        }}
                    />
                </div>
            )}

            {/* ── Create / Edit modal ── */}
            <CrudFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. Overview of Contract Law Principles' },
                        {
                            name: 'category_id', label: t('Category'), type: 'select', searchable: true, required: true,
                            options: (categories || []).map((c: any) => ({
                                value: c.id,
                                label: c.practice_area ? `${c.name} (${c.practice_area.name})` : c.name,
                            })),
                            emptyNote: { link: route('legal-research.categories.index'), linkText: t('Research Categories') },
                        },
                        { name: 'content', label: t('Content'), type: 'textarea', required: true, rows: 10, placeholder: 'eg. Detailed analysis of contract formation requirements...' },
                        { name: 'tags', label: t('Tags'), type: 'text', placeholder: 'Enter tags separated by commas (e.g., contract, law, precedent)' },
                        {
                            name: 'status', label: t('Status'), type: 'select',
                            options: [
                                { value: 'draft', label: t('Draft') },
                                { value: 'published', label: t('Published') },
                                { value: 'archived', label: t('Archived') },
                            ],
                            defaultValue: 'draft',
                        },
                    ],
                    modalSize: 'xl',
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    tags: currentItem.tags ? currentItem.tags.join(', ') : '',
                } : null}
                title={formMode === 'create' ? t('Add New Knowledge Article') : t('Edit Knowledge Article')}
                mode={formMode}
            />

            {/* ── Delete modal ── */}
            <CrudDeleteModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                itemName={currentItem?.title || ''}
                entityName="knowledge article"
            />

            {/* ── View modal ── */}
            <Dialog open={isViewOpen} onOpenChange={() => setIsViewOpen(false)}>
                {currentItem && <ViewPopup record={currentItem} />}
            </Dialog>
        </PageTemplate>
    );
}
