import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, FileText, Quote, Calendar, ArrowLeft } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { capitalize } from '@/utils/helpers';
import NoteViewPopup from '@/pages/legal-research/projects/views/note';
import CitationViewPopup from '@/pages/legal-research/projects/views/citation';

export default function ViewResearchProject() {
    const { t } = useTranslation();
    const { auth, project, notes, citations, sources, allSources, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const getDefaultTab = () => {
        if (hasPermission(permissions, 'manage-research-notes')) return 'notes';
        if (hasPermission(permissions, 'manage-research-citations')) return 'citations';
        return 'notes';
    };

    const [activeTab, setActiveTab] = useState(getDefaultTab());
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [isCitationsModalOpen, setIsCitationsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [modalType, setModalType] = useState<'notes' | 'citations'>('notes');

    // Notes filters
    const [notesSearchTerm, setNotesSearchTerm] = useState(pageFilters.notes_search || '');
    const [showNotesFilters, setShowNotesFilters] = useState(false);

    // Citations filters
    const [citationsSearchTerm, setCitationsSearchTerm] = useState(pageFilters.citations_search || '');
    const [citationsType, setCitationsType] = useState(pageFilters.citations_type || '_empty_');
    const [citationsSource, setCitationsSource] = useState(pageFilters.citations_source_id || '_empty_');
    const [showCitationsFilters, setShowCitationsFilters] = useState(false);

    const handleNotesAction = (action: string, item: any) => {
        setCurrentItem(item);
        setModalType('notes');
        switch (action) {
            case 'view':
                setIsViewModalOpen(true);
                break;
            case 'edit':
                setFormMode('edit');
                setIsNotesModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
        }
    };

    const handleCitationsAction = (action: string, item: any) => {
        setCurrentItem(item);
        setModalType('citations');
        switch (action) {
            case 'view':
                setIsViewModalOpen(true);
                break;
            case 'edit':
                setFormMode('edit');
                setIsCitationsModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
        }
    };

    const handleAddNote = () => {
        setCurrentItem(null);
        setFormMode('create');
        setModalType('notes');
        setIsNotesModalOpen(true);
    };

    const handleAddCitation = () => {
        setCurrentItem(null);
        setFormMode('create');
        setModalType('citations');
        setIsCitationsModalOpen(true);
    };

    const handleNotesSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyNotesFilters();
    };

    const applyNotesFilters = () => {
        router.get(route('legal-research.projects.show', project.id), {
            notes_page: 1,
            notes_search: notesSearchTerm || undefined,
            ...(pageFilters.notes_sort_field && { notes_sort_field: pageFilters.notes_sort_field, notes_sort_direction: pageFilters.notes_sort_direction }),
            ...(pageFilters.notes_per_page && { notes_per_page: pageFilters.notes_per_page }),
            citations_search: citationsSearchTerm || undefined,
            citations_type: citationsType !== '_empty_' ? citationsType : undefined,
            citations_source_id: citationsSource !== '_empty_' ? citationsSource : undefined,
            ...(pageFilters.citations_sort_field && { citations_sort_field: pageFilters.citations_sort_field, citations_sort_direction: pageFilters.citations_sort_direction }),
            ...(pageFilters.citations_per_page && { citations_per_page: pageFilters.citations_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleNotesSort = (field: string) => {
        const direction = pageFilters.notes_sort_field === field
            ? (pageFilters.notes_sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('legal-research.projects.show', project.id), {
            notes_sort_field: field,
            notes_sort_direction: direction,
            notes_page: 1,
            notes_search: notesSearchTerm || undefined,
            ...(pageFilters.notes_per_page && { notes_per_page: pageFilters.notes_per_page }),
            citations_search: citationsSearchTerm || undefined,
            citations_type: citationsType !== '_empty_' ? citationsType : undefined,
            citations_source_id: citationsSource !== '_empty_' ? citationsSource : undefined,
            ...(pageFilters.citations_sort_field && { citations_sort_field: pageFilters.citations_sort_field, citations_sort_direction: pageFilters.citations_sort_direction }),
            ...(pageFilters.citations_per_page && { citations_per_page: pageFilters.citations_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleCitationsSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyCitationsFilters();
    };

    const applyCitationsFilters = () => {
        router.get(route('legal-research.projects.show', project.id), {
            citations_page: 1,
            citations_search: citationsSearchTerm || undefined,
            citations_type: citationsType !== '_empty_' ? citationsType : undefined,
            citations_source_id: citationsSource !== '_empty_' ? citationsSource : undefined,
            ...(pageFilters.citations_sort_field && { citations_sort_field: pageFilters.citations_sort_field, citations_sort_direction: pageFilters.citations_sort_direction }),
            ...(pageFilters.citations_per_page && { citations_per_page: pageFilters.citations_per_page }),
            notes_search: notesSearchTerm || undefined,
            ...(pageFilters.notes_sort_field && { notes_sort_field: pageFilters.notes_sort_field, notes_sort_direction: pageFilters.notes_sort_direction }),
            ...(pageFilters.notes_per_page && { notes_per_page: pageFilters.notes_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyCitationsFilters();
        setPageInitialState(false);
    }, [citationsType, citationsSource]);

    const handleCitationsSort = (field: string) => {
        const direction = pageFilters.citations_sort_field === field
            ? (pageFilters.citations_sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('legal-research.projects.show', project.id), {
            citations_sort_field: field,
            citations_sort_direction: direction,
            citations_page: 1,
            citations_search: citationsSearchTerm || undefined,
            citations_type: citationsType !== '_empty_' ? citationsType : undefined,
            citations_source_id: citationsSource !== '_empty_' ? citationsSource : undefined,
            ...(pageFilters.citations_per_page && { citations_per_page: pageFilters.citations_per_page }),
            notes_search: notesSearchTerm || undefined,
            ...(pageFilters.notes_sort_field && { notes_sort_field: pageFilters.notes_sort_field, notes_sort_direction: pageFilters.notes_sort_direction }),
            ...(pageFilters.notes_per_page && { notes_per_page: pageFilters.notes_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleNotesSubmit = (formData: any) => {
        // Convert tags string to array
        if (formData.tags && typeof formData.tags === 'string') {
            formData.tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }

        const data = { ...formData, research_project_id: project.id.toString() };
        const method = formMode === 'create' ? 'post' : 'put';
        const url = formMode === 'create'
            ? route('legal-research.notes.store')
            : route('legal-research.notes.update', currentItem.id);


        router[method](url, data, {
            onSuccess: (page) => {
                setIsNotesModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to save note: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleCitationsSubmit = (formData: any) => {
        const data = { ...formData, research_project_id: project.id.toString() };
        const method = formMode === 'create' ? 'post' : 'put';
        const url = formMode === 'create'
            ? route('legal-research.citations.store')
            : route('legal-research.citations.update', currentItem.id);


        router[method](url, data, {
            onSuccess: (page) => {
                setIsCitationsModalOpen(false);
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                }
            },
            onError: (errors) => {
                toast.error(`Failed to save citation: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleDeleteConfirm = () => {
        const route_name = modalType === 'notes' ? 'legal-research.notes.destroy' : 'legal-research.citations.destroy';

        router.delete(route(route_name, currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.success(t(`${modalType.slice(0, -1)} deleted successfully`));
            },
            onError: (errors) => {
                toast.error(`Failed to delete ${modalType.slice(0, -1)}: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Legal Research') },
        { title: t('Research Projects'), href: route('legal-research.projects.index') },
        { title: t('Project Details') }
    ];

    const notesColumns = [
        { key: 'title', label: t('Title'), sortable: true },
        { key: 'note_content', label: t('Content'), render: (value: string) => value?.substring(0, 50) + '...' || '-' },
        { key: 'source_reference', label: t('Source Reference'), render: (value: string) => value || '-' },
        {
            key: 'tags', label: t('Tags'), render: (value: string[]) => (
                <div className="flex flex-wrap gap-1">
                    {(value || []).slice(0, 2).map((tag, index) => (
                        <span key={index} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            {tag}
                        </span>
                    ))}
                    {(value || []).length > 2 && (
                        <span className="text-xs text-gray-500">+{(value || []).length - 2} more</span>
                    )}
                </div>
            )
        },
        {
            key: 'created_at', label: t('Created'),
            type: 'date',
        }
    ];

    const citationsColumns = [
        {
            key: 'citation_text',
            label: t('Citation'),
            sortable: true,
            render: (value: string) => (
                <span className=" text-sm">{value}</span>
            )
        },
        {
            key: 'citation_type',
            label: t('Type'),
            render: (value: string) => {
                const typeColors = {
                    case: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    statute: 'bg-green-50 text-green-700 ring-green-600/20',
                    article: 'bg-purple-50 text-purple-700 ring-purple-600/20',
                    book: 'bg-orange-50 text-orange-700 ring-orange-600/20',
                    website: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
                    other: 'bg-gray-50 text-gray-700 ring-gray-600/20'
                };

                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${typeColors[value as keyof typeof typeColors] || typeColors.other}`}>
                        {t(value.charAt(0).toUpperCase() + value.slice(1))}
                    </span>
                );
            }
        },
        { key: 'source', label: t('Source'), render: (value: any) => value?.source_name || '-' },
        { key: 'page_number', label: t('Page'), render: (value: string) => value || '-' },
        {
            key: 'created_at', label: t('Created'),
            type: 'date',
        }
    ];

    const notesActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-research-notes' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-research-notes' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-research-notes' }
    ];

    const citationsActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-research-citations' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-research-citations' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-research-citations' }
    ];
    const priorityColors = {
        low: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        high: 'bg-orange-50 text-orange-700 ring-orange-600/20',
        urgent: 'bg-red-50 text-red-700 ring-red-600/20'
    };
    return (
        <PageTemplate
            title={project?.title || t('Research Project')}
            url={`/legal-research/projects/${project?.id}`}
            breadcrumbs={breadcrumbs}
            description={t("Manage research notes and research citations.")}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => window.history.back()
                }
            ]}
        >
            {/* Project Details */}
            <Card className="shadow-sm mb-6">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('Project ID')}</label>
                            <p className="mt-1 text-gray-900 dark:text-white">{project?.research_id || '-'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('Research Type')}</label>
                            <p className="mt-1 text-gray-900 dark:text-white">{project?.research_type?.name || '-'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('Associated Case')}</label>
                            <p className="mt-1 text-gray-900 dark:text-white">{project?.case?.title || t('No Case')}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('Priority')}</label>
                            <div className="flex items-start mt-1">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${priorityColors[project?.priority as keyof typeof priorityColors] || priorityColors.medium}`}>{t(capitalize(project?.priority)) || '-'}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('Status')}</label>
                            <div className="flex items-center mt-1">
                                <span
                                    className={`mt-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${project?.status === 'active'
                                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                                        : project?.status === 'completed'
                                            ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                                            : project?.status === 'on_hold'
                                                ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                                : 'bg-red-50 text-red-700 ring-red-600/20'
                                        }`}
                                >
                                    {t(project?.status?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '-')}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('Due Date')}</label>
                            <div className="flex items-center mt-1">
                                <Calendar className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                                <p className="text-gray-900 dark:text-white">{project?.due_date ? (window.appSettings?.formatDate(project.due_date) || new Date(project.due_date).toLocaleDateString()) : '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">{t('Description')}</label>
                        <div className="flex items-center mt-1">
                            <p className="text-gray-900 dark:text-white">{project.description || '-'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex">
                        {hasPermission(permissions, 'manage-research-notes') && (
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={`py-2 px-4 border-b-2 font-medium text-sm cursor-pointer ${activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <FileText className="h-4 w-4 inline mr-2" />
                                {t('Research Notes')}
                            </button>
                        )}
                        {hasPermission(permissions, 'manage-research-citations') && (
                            <button
                                onClick={() => setActiveTab('citations')}
                                className={`py-2 px-4 border-b-2 font-medium text-sm cursor-pointer ${activeTab === 'citations' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <Quote className="h-4 w-4 inline mr-2" />
                                {t('Research Citations')}
                            </button>
                        )}
                    </nav>
                </div>

                <div className="p-4">
                    {activeTab === 'notes' && hasPermission(permissions, 'manage-research-notes') && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">{t('Research Notes')}</h3>
                                {hasPermission(permissions, 'create-research-notes') && (
                                    <Button
                                        onClick={handleAddNote}
                                        variant={'default'}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('Add Research Note')}
                                    </Button>
                                )}
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                                <SearchAndFilterBar
                                    searchTerm={notesSearchTerm}
                                    onSearchChange={setNotesSearchTerm}
                                    onSearch={handleNotesSearch}
                                    filters={[]}
                                    hasActiveFilters={() => notesSearchTerm !== ''}
                                    activeFilterCount={() => (notesSearchTerm ? 1 : 0)}
                                    onResetFilters={() => {
                                        setNotesSearchTerm('');
                                        setShowNotesFilters(false);
                                        router.get(route('legal-research.projects.show', project.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                                <CrudTable
                                    columns={notesColumns}
                                    actions={notesActions}
                                    data={notes?.data || []}
                                    from={notes?.from || 1}
                                    onAction={handleNotesAction}
                                    sortField={pageFilters.notes_sort_field}
                                    sortDirection={pageFilters.notes_sort_direction}
                                    onSort={handleNotesSort}
                                    permissions={permissions}
                                    entityPermissions={{
                                        view: 'view-research-notes',
                                        edit: 'edit-research-notes',
                                        delete: 'delete-research-notes'
                                    }}
                                />
                                {notes?.links && (
                                    <Pagination
                                        from={notes?.from || 0}
                                        to={notes?.to || 0}
                                        total={notes?.total || 0}
                                        links={notes?.links}
                                        entityName={t("notes")}
                                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                                        currentPerPage={pageFilters.notes_per_page?.toString() || '10'}
                                        onPerPageChange={(value) => {
                                            router.get(route('legal-research.projects.show', project.id), {
                                                notes_page: 1,
                                                ...(parseInt(value) !== 10 && { notes_per_page: parseInt(value) }),
                                                notes_search: notesSearchTerm || undefined,
                                                notes_sort_field: pageFilters.notes_sort_field || undefined,
                                                notes_sort_direction: pageFilters.notes_sort_direction || undefined,
                                                citations_search: citationsSearchTerm || undefined,
                                                citations_type: citationsType !== '_empty_' ? citationsType : undefined,
                                                citations_source_id: citationsSource !== '_empty_' ? citationsSource : undefined,
                                                ...(pageFilters.citations_sort_field && { citations_sort_field: pageFilters.citations_sort_field, citations_sort_direction: pageFilters.citations_sort_direction }),
                                                ...(pageFilters.citations_per_page && { citations_per_page: pageFilters.citations_per_page }),
                                            }, { preserveState: true, preserveScroll: true });
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'citations' && hasPermission(permissions, 'manage-research-citations') && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">{t('Research Citations')}</h3>
                                {(hasPermission(permissions, 'create-research-citations') && project.status == 'active') && (
                                    <Button
                                        onClick={handleAddCitation}
                                        variant={'default'}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('Add Research Citation')}
                                    </Button>
                                )}
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                                <SearchAndFilterBar
                                    searchTerm={citationsSearchTerm}
                                    onSearchChange={setCitationsSearchTerm}
                                    onSearch={handleCitationsSearch}
                                    filters={[
                                        {
                                            name: 'citations_type',
                                            label: t('Citation Type'),
                                            type: 'select',
                                            value: citationsType,
                                            onChange: setCitationsType,
                                            options: [
                                                { value: '_empty_', label: t('All Types') },
                                                { value: 'case', label: t('Case') },
                                                { value: 'statute', label: t('Statute') },
                                                { value: 'article', label: t('Article') },
                                                { value: 'book', label: t('Book') },
                                                { value: 'website', label: t('Website') },
                                                { value: 'other', label: t('Other') }
                                            ]
                                        },
                                        {
                                            name: 'citations_source_id',
                                            label: t('Source'),
                                            type: 'select',
                                            searchable: true,
                                            value: citationsSource,
                                            onChange: setCitationsSource,
                                            options: [
                                                { value: '_empty_', label: t('All Sources') },
                                                ...(allSources || []).map((source: any) => ({ value: source.id.toString(), label: source.source_name }))
                                            ]
                                        }
                                    ]}
                                    hasActiveFilters={() => citationsSearchTerm !== '' || citationsType !== '_empty_' || citationsSource !== '_empty_'}
                                    activeFilterCount={() => (citationsSearchTerm ? 1 : 0) + (citationsType !== '_empty_' ? 1 : 0) + (citationsSource !== '_empty_' ? 1 : 0)}
                                    onResetFilters={() => {
                                        setCitationsSearchTerm('');
                                        setCitationsType('_empty_');
                                        setCitationsSource('_empty_');
                                        setShowCitationsFilters(false);
                                        router.get(route('legal-research.projects.show', project.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                                <CrudTable
                                    columns={citationsColumns}
                                    actions={citationsActions}
                                    data={citations?.data || []}
                                    from={citations?.from || 1}
                                    onAction={handleCitationsAction}
                                    sortField={pageFilters.citations_sort_field}
                                    sortDirection={pageFilters.citations_sort_direction}
                                    onSort={handleCitationsSort}
                                    permissions={permissions}
                                    entityPermissions={{
                                        view: 'view-research-citations',
                                        edit: 'edit-research-citations',
                                        delete: 'delete-research-citations'
                                    }}
                                />
                                {citations?.links && (
                                    <Pagination
                                        from={citations?.from || 0}
                                        to={citations?.to || 0}
                                        total={citations?.total || 0}
                                        links={citations?.links}
                                        entityName={t("citations")}
                                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                                        currentPerPage={pageFilters.citations_per_page?.toString() || '10'}
                                        onPerPageChange={(value) => {
                                            router.get(route('legal-research.projects.show', project.id), {
                                                citations_page: 1,
                                                ...(parseInt(value) !== 10 && { citations_per_page: parseInt(value) }),
                                                citations_search: citationsSearchTerm || undefined,
                                                citations_type: citationsType !== '_empty_' ? citationsType : undefined,
                                                citations_source_id: citationsSource !== '_empty_' ? citationsSource : undefined,
                                                citations_sort_field: pageFilters.citations_sort_field || undefined,
                                                citations_sort_direction: pageFilters.citations_sort_direction || undefined,
                                                notes_search: notesSearchTerm || undefined,
                                                ...(pageFilters.notes_sort_field && { notes_sort_field: pageFilters.notes_sort_field, notes_sort_direction: pageFilters.notes_sort_direction }),
                                                ...(pageFilters.notes_per_page && { notes_per_page: pageFilters.notes_per_page }),
                                            }, { preserveState: true, preserveScroll: true });
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notes Modal */}
            <CrudFormModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                onSubmit={handleNotesSubmit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. Key Findings on Liability' },
                        { name: 'note_content', label: t('Note Content'), type: 'textarea', required: true, rows: 8, placeholder: 'eg. Analysis of liability standards based on reviewed cases...' },
                        { name: 'source_reference', label: t('Source Reference'), type: 'text', placeholder: 'eg. Westlaw, p.45' },
                        { name: 'tags', label: t('Tags'), type: 'text', placeholder: 'Enter tags separated by commas (e.g., contract, precedent, analysis)' }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    tags: currentItem.tags ? currentItem.tags.join(', ') : ''
                } : null}
                title={
                    formMode === 'create'
                        ? t('Add New Research Note')
                        : formMode === 'edit'
                            ? t('Edit Research Note')
                            : t('View Research Note')
                }
                mode={formMode}
            />

            {/* Citations Modal */}
            <CrudFormModal
                isOpen={isCitationsModalOpen}
                onClose={() => setIsCitationsModalOpen(false)}
                onSubmit={handleCitationsSubmit}
                formConfig={{
                    fields: [
                        { name: 'citation_text', label: t('Citation Text'), type: 'textarea', required: true, rows: 3, placeholder: 'eg. Smith v. Jones, 123 F.3d 456 (2nd Cir. 2020)' },
                        {
                            name: 'citation_type',
                            label: t('Citation Type'),
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'case', label: t('Case') },
                                { value: 'statute', label: t('Statute') },
                                { value: 'article', label: t('Article') },
                                { value: 'book', label: t('Book') },
                                { value: 'website', label: t('Website') },
                                { value: 'other', label: t('Other') }
                            ]
                        },
                        {
                            name: 'source_id',
                            label: t('Source'),
                            type: formMode === 'view' ? 'text' : 'select',
                            required: true,
                            searchable: true,
                            options: formMode === 'view' ? undefined : [
                                ...(sources || []).map((source: any) => ({ value: source.id, label: source.source_name }))
                            ],
                            readOnly: formMode === 'view',
                            emptyNote: { link: route('legal-research.sources.index'), linkText: t('Research Sources') }
                        },
                        { name: 'page_number', label: t('Page Number'), type: 'text', placeholder: 'eg. 45' },
                        { name: 'notes', label: t('Notes'), type: 'textarea', rows: 3, placeholder: 'eg. Key passage on page 45 supports our argument' }
                    ],
                    modalSize: 'lg'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    source_id: formMode === 'view' ? (currentItem.source?.source_name || currentItem.source_id) : (currentItem.source?.id || currentItem.source_id)
                } : null}
                title={
                    formMode === 'create'
                        ? t('Add New Research Citation')
                        : formMode === 'edit'
                            ? t('Edit Research Citation')
                            : t('View Research Citation')
                }
                mode={formMode}
            />

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {currentItem && modalType === 'notes' && <NoteViewPopup record={currentItem} />}
                {currentItem && modalType === 'citations' && <CitationViewPopup record={currentItem} />}
            </Dialog>

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.citation_text || currentItem?.title || ''}
                entityName={modalType.slice(0, -1)}
            />
        </PageTemplate>
    );
}
