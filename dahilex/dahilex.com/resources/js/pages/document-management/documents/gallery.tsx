import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import {
    Plus, Download, Edit, Trash2, Eye,
    MoreHorizontal, Tag, Lock, Globe, ShieldAlert, ShieldOff,
    FolderOpen, RefreshCw, CheckCircle, Clock, Archive, PenLine,
    FileText,
    FolderIcon
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
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import { formatStatusText, getImagePath, hexToRgba } from '@/utils/helpers';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    draft: { label: 'Draft', icon: PenLine, cls: 'bg-gray-50 text-gray-700 ring-gray-600/20' },
    review: { label: 'Review', icon: Clock, cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
    final: { label: 'Final', icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    archived: { label: 'Archived', icon: Archive, cls: 'bg-red-50 text-red-700 ring-red-600/20' },
} as const;

const CONFIDENTIALITY_CONFIG = {
    public: { label: 'Public', icon: Globe, cls: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
    internal: { label: 'Internal', icon: Lock, cls: 'bg-gray-50 text-gray-600 ring-gray-500/20' },
    confidential: { label: 'Confidential', icon: ShieldAlert, cls: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
    restricted: { label: 'Restricted', icon: ShieldOff, cls: 'bg-red-50 text-red-700 ring-red-600/20' },
} as const;

function getFileExt(filePath: string) {
    if (!filePath) return '';
    return filePath.split('.').pop()?.toUpperCase() ?? '';
}

export default function DocumentGallery() {
    const { t } = useTranslation();
    const { auth, documents, categories, allCategories, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.category_id || '_empty_');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [selectedConfidentiality, setSelectedConfidentiality] = useState(pageFilters.confidentiality || '_empty_');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    // ── helpers ───────────────────────────────────────────────────────────────
    const qp = () => ({
        search: searchTerm || undefined,
        category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
        status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
        confidentiality: selectedConfidentiality !== '_empty_' ? selectedConfidentiality : undefined,
        sort_field: pageFilters.sort_field || undefined,
        sort_direction: pageFilters.sort_direction || undefined,
    });

    const nav = (extra = {}) =>
        router.get(route('document-management.documents.index'), { ...qp(), ...extra }, { preserveState: true, preserveScroll: true });

    const handleDownload = (doc: any) => {
        const link = window.document.createElement('a');
        link.href = route('document-management.documents.download', doc.id);
        link.download = doc.name;
        link.click();
    };

    const openVersions = (doc: any) => {
        if(hasPermission(permissions,'view-documents')) router.get(route('document-management.documents.show', doc.id));
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleFormSubmit = (formData: any) => {
        if (formData.tags && typeof formData.tags === 'string') {
            formData.tags = formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        const isCreate = formMode === 'create';
        router[isCreate ? 'post' : 'put'](
            isCreate ? route('document-management.documents.store') : route('document-management.documents.update', currentItem.id),
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

    const handleDelete = () => {
        router.delete(route('document-management.documents.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('document-management.documents.toggle-status', currentItem.id), formData, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false);
                const f = page.props.flash as any;
                if (f?.success) toast.success(f.success);
                else if (f?.error) toast.error(f.error);
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) nav({ page: 1 });
        setPageInitialState(false);
    }, [selectedCategory, selectedStatus, selectedConfidentiality]);


    const handleResetFilters = () => {
        router.get(route('document-management.documents.index'));
    };


    // ── page setup ────────────────────────────────────────────────────────────
    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-documents')) {
        pageActions.push({
            label: t('Upload Document'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); },
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Document Management') },
        { title: t('Documents') },
    ];

    const data: any[] = documents?.data || [];

    function isImageFile(path: string) {
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
            path?.split('.').pop()?.toLowerCase() ?? ''
        );
    }

    return (
        <PageTemplate title={t('Documents')} description={t('Browse and manage all uploaded documents.')} url="/document-management/documents" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>

            {/* ── Filter bar ── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={(e) => { e.preventDefault(); nav({ page: 1 }); }}
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
                                { value: 'draft', label: t('Draft') },
                                { value: 'review', label: t('Review') },
                                { value: 'final', label: t('Final') },
                                { value: 'archived', label: t('Archived') },
                            ],
                        },
                        {
                            name: 'confidentiality', label: t('Confidentiality'), type: 'select',
                            value: selectedConfidentiality, onChange: setSelectedConfidentiality,
                            options: [
                                { value: '_empty_', label: t('All Levels') },
                                { value: 'public', label: t('Public') },
                                { value: 'internal', label: t('Internal') },
                                { value: 'confidential', label: t('Confidential') },
                                { value: 'restricted', label: t('Restricted') },
                            ],
                        },
                    ]}
                    hasActiveFilters={() => searchTerm !== '' || selectedCategory !== '_empty_' || selectedStatus !== '_empty_' || selectedConfidentiality !== '_empty_'}
                    activeFilterCount={() => (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedConfidentiality !== '_empty_' ? 1 : 0)}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* ── Gallery grid / empty state ── */}
            {data.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <FolderOpen className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('No documents found')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('Upload a document to get started.')}</p>
                        {hasPermission(permissions, 'create-documents') && (
                            <button
                                onClick={() => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); }}
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />{t('Upload Document')}
                            </button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
                    {data.map((doc: any) => {
                        return (
                            <Card
                                key={doc.id}
                                onClick={() => openVersions(doc)}
                                className="group flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer"
                            >
                                <FolderIcon className="h-20 w-20 text-primary transition-transform duration-200 group-hover:scale-110" />
                                <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-primary text-center transition-colors duration-200">
                                    {doc.name}
                                </span>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── Pagination ── */}
            {documents?.total > 0 && (
                <div className="mt-5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <Pagination
                        from={documents?.from || 0}
                        to={documents?.to || 0}
                        total={documents?.total || 0}
                        links={documents?.links}
                        entityName={t('documents')}
                        hidePerPage
                        onPageChange={(url) => {
                            const page = new URL(url).searchParams.get('page');
                            nav({ page });
                        }}
                    />
                </div>
            )}

            {/* ── Create / Edit modal ── */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'name', label: t('Name'), type: 'text', required: true, placeholder: 'eg. Non-Disclosure Agreement' },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Standard NDA template for client engagements' },
                        {
                            name: 'category_id', label: t('Category'), type: 'select', searchable: true, required: true,
                            options: (categories || []).map((c: any) => ({ value: c.id, label: c.name })),
                            emptyNote: { link: route('document-management.categories.index'), linkText: t('Document Categories') },
                        },
                        ...(formMode === 'create' ? [{ name: 'file', label: t('File'), type: 'media-picker', required: true }] : []),
                        {
                            name: 'status', label: t('Status'), type: 'select',
                            options: [
                                { value: 'draft', label: t('Draft') },
                                { value: 'review', label: t('Review') },
                                { value: 'final', label: t('Final') },
                                { value: 'archived', label: t('Archived') },
                            ],
                            defaultValue: 'draft',
                        },
                        {
                            name: 'confidentiality', label: t('Confidentiality'), type: 'select',
                            options: [
                                { value: 'public', label: t('Public') },
                                { value: 'internal', label: t('Internal') },
                                { value: 'confidential', label: t('Confidential') },
                                { value: 'restricted', label: t('Restricted') },
                            ],
                            defaultValue: 'internal',
                        },
                        { name: 'tags', label: t('Tags'), type: 'text', placeholder: t('Enter tags separated by commas') },
                    ],
                    modalSize: 'lg',
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    tags: currentItem.tags ? currentItem.tags.join(', ') : '',
                    file: currentItem?.file_path ?? null,
                } : null}
                title={formMode === 'create' ? t('Upload Document') : t('Edit Document')}
                mode={formMode}
            />

            {/* ── Change status modal ── */}
            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [{
                        name: 'status', label: t('Status'), type: 'select', required: true,
                        options: [
                            { value: 'draft', label: t('Draft') },
                            { value: 'review', label: t('Review') },
                            { value: 'final', label: t('Final') },
                            { value: 'archived', label: t('Archived') },
                        ],
                    }],
                    modalSize: 'sm',
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Document Status')}
                mode="edit"
            />

            {/* ── Delete modal ── */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                itemName={currentItem?.name || ''}
                entityName="document"
            />
        </PageTemplate>
    );
}
