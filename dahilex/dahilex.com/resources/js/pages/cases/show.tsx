import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { PageTemplate } from '@/components/page-template';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { hasPermission } from '@/utils/authorization';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Clock, FileText, Plus, Search, Users, CheckSquare, Calendar, User, MapPin, Phone, Mail, Scale, Gavel, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GoogleCalendarModal from '@/components/GoogleCalendarModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStatusText, hexToRgba } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import TimelineView from './views/timeline';
import CaseTimelineCalendar from './views/timeline-calendar';
import TeamMemberView from './views/team-member';
import DocumentView from './views/document';
import NoteView from './views/note';
import TaskView from './views/task';
import ResearchNoteView from './views/research-note';
import CitationView from './views/citation';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CaseShow() {
    const { t } = useTranslation();
    const {
        auth,
        case: caseData,
        timelines,
        timelineWeekStart,
        timelineMonthLabel,
        timelineMonthNum,
        timelineYearNum,
        teamMembers,
        users,
        allUsers,
        caseDocuments,
        caseNotes,
        documentTypes,
        allDocumentTypes,
        allRoles,
        researchProjects,
        tasks,
        taskTypes,
        allTaskTypes,
        taskStatuses,
        allTaskStatuses,
        eventTypes,
        allEventTypes,
        googleCalendarEnabled,
        filters = {},
    } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const getDefaultTab = () => {
        if (hasPermission(permissions, 'manage-case-timelines')) return 'timelines';
        if (hasPermission(permissions, 'manage-case-team-members')) return 'team';
        if (hasPermission(permissions, 'manage-case-documents')) return 'documents';
        if (hasPermission(permissions, 'manage-case-notes')) return 'notes';
        if (hasPermission(permissions, 'manage-case-tasks')) return 'tasks';
        if (hasPermission(permissions, 'manage-research-projects')) return 'research-projects';
        return 'timelines';
    };
    const [activeTab, setActiveTab] = useState(getDefaultTab());
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [projectSubTab, setProjectSubTab] = useState('details');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewTeamModalOpen, setIsViewTeamModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [selectedCitation, setSelectedCitation] = useState<any>(null);
    const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [isNoteViewModalOpen, setIsNoteViewModalOpen] = useState(false);
    const [isCaseNoteViewModalOpen, setIsCaseNoteViewModalOpen] = useState(false);
    const [isDocumentViewModalOpen, setIsDocumentViewModalOpen] = useState(false);
    const [isTaskViewModalOpen, setIsTaskViewModalOpen] = useState(false);
    const [isTimelineViewModalOpen, setIsTimelineViewModalOpen] = useState(false);
    const [isGoogleCalendarModalOpen, setIsGoogleCalendarModalOpen] = useState(false);

    // Timeline filters
    const [timelineSearch, setTimelineSearch] = useState(filters.timeline_search || '');
    const [timelineEventType, setTimelineEventType] = useState(filters.timeline_event_type || '_empty_');
    const [timelineStatus, setTimelineStatus] = useState(filters.timeline_status || '_empty_');
    const [timelineCompleted, setTimelineCompleted] = useState(filters.timeline_completed || '_empty_');
    const [showTimelineFilters, setShowTimelineFilters] = useState(false);

    // Team filters
    const [teamSearch, setTeamSearch] = useState(filters.team_search || '');
    const [teamRole, setTeamRole] = useState(filters.team_role || '_empty_');
    const [teamStatus, setTeamStatus] = useState(filters.team_status || '_empty_');
    const [showTeamFilters, setShowTeamFilters] = useState(false);

    // Document filters
    const [docSearch, setDocSearch] = useState(filters.doc_search || '');
    const [docType, setDocType] = useState(filters.doc_type || '_empty_');
    const [docConfidentiality, setDocConfidentiality] = useState(filters.doc_confidentiality || '_empty_');
    const [docStatus, setDocStatus] = useState(filters.doc_status || '_empty_');
    const [showDocFilters, setShowDocFilters] = useState(false);

    // Note filters
    const [noteSearch, setNoteSearch] = useState(filters.note_search || '');
    const [noteType, setNoteType] = useState(filters.note_type || '_empty_');
    const [notePriority, setNotePriority] = useState(filters.note_priority || '_empty_');
    const [showNoteFilters, setShowNoteFilters] = useState(false);

    // Task filters
    const [taskSearch, setTaskSearch] = useState(filters.task_search || '');
    const [taskTypeId, setTaskTypeId] = useState(filters.task_type_id || '_empty_');
    const [taskStatus, setTaskStatus] = useState(filters.task_status || '_empty_');
    const [taskPriority, setTaskPriority] = useState(filters.task_priority || '_empty_');
    const [taskAssignedTo, setTaskAssignedTo] = useState(filters.task_assigned_to || '_empty_');
    const [showTaskFilters, setShowTaskFilters] = useState(false);
    const getInitials = useInitials();

    const handleTimelineAction = (action: string, item?: any) => {
        setCurrentItem(item || null);
        switch (action) {
            case 'create':
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'view':
                setIsTimelineViewModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleTimelineToggleStatus(item);
                break;
        }
    };

    const handleTimelineToggleStatus = (timeline: any) => {
        const newStatus = timeline.status === 'active' ? 'inactive' : 'active';

        router.put(
            route('cases.case-timelines.toggle-status', timeline.id),
            {},
            {
                onSuccess: () => {
                    toast.success(t('Timeline status updated'));
                },
                onError: () => {
                    toast.error(t('Failed to update timeline status'));
                },
            },
        );
    };

    const handleTeamAction = (action: string, item?: any) => {
        setCurrentItem(item || null);
        switch (action) {
            case 'create':
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'view':
                setFormMode('view');
                setIsViewTeamModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleTeamToggleStatus(item);
                break;
        }
    };

    const handleTeamToggleStatus = (member: any) => {
        const newStatus = member.status === 'active' ? 'inactive' : 'active';

        router.put(
            route('cases.case-team-members.toggle-status', member.id),
            {},
            {
                onSuccess: () => {
                    toast.success(t('Team member status updated'));
                },
                onError: () => {
                    toast.error(t('Failed to update team member status'));
                },
            },
        );
    };

    const handleDocumentAction = (action: string, item?: any) => {
        setCurrentItem(item || null);
        switch (action) {
            case 'create':
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'view':
                setIsDocumentViewModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'download':
                const link = document.createElement('a');
                link.href = route('advocate.case-documents.download', item.id);
                link.download = item.document_name;
                link.click();
                break;
        }
    };

    const handleNoteAction = (action: string, item?: any) => {
        setCurrentItem(item || null);
        switch (action) {
            case 'create':
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'view':
                setIsCaseNoteViewModalOpen(true);
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

    const handleTimelineSubmit = (formData: any) => {
        const data = { ...formData, case_id: caseData.id };

        if (formMode === 'create') {
            router.post(route('cases.case-timelines.store'), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Timeline event created'));
                },
                onError: (errors) => {
                    toast.error(`Failed to create timeline: ${Object.values(errors).join(', ')}`);
                },
            });
        } else if (formMode === 'edit') {
            router.put(route('cases.case-timelines.update', currentItem.id), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Timeline event updated'));
                },
                onError: (errors) => {
                    toast.error(`Failed to update timeline: ${Object.values(errors).join(', ')}`);
                },
            });
        }
    };

    const handleTeamSubmit = (formData: any) => {
        const data = { ...formData, case_id: caseData.id };

        if (formMode === 'create') {
            router.post(route('cases.case-team-members.store'), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Team member assigned'));
                },
                onError: (errors) => {
                    toast.error(`Failed to assign team member: ${Object.values(errors).join(', ')}`);
                },
            });
        } else if (formMode === 'edit') {
            router.put(route('cases.case-team-members.update', currentItem.id), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Team member updated'));
                },
                onError: (errors) => {
                    toast.error(`Failed to update team member: ${Object.values(errors).join(', ')}`);
                },
            });
        }
    };

    const handleDocumentSubmit = (formData: any) => {
        const data = { ...formData, case_id: caseData.id };

        if (formMode === 'create') {
            router.post(route('advocate.case-documents.store'), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Case document created'));
                },
                onError: (errors) => {
                    toast.error(`Failed to create document: ${Object.values(errors).join(', ')}`);
                },
            });
        } else if (formMode === 'edit') {
            router.put(route('advocate.case-documents.update', currentItem.id), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Case document updated'));
                },
                onError: (errors) => {
                    toast.error(`Failed to update team document: ${Object.values(errors).join(', ')}`);
                },
            });
        }
    };

    const handleDeleteConfirm = () => {
        let route_name = 'cases.case-timelines.destroy';
        if (activeTab === 'team') route_name = 'cases.case-team-members.destroy';
        if (activeTab === 'documents') route_name = 'advocate.case-documents.destroy';
        if (activeTab === 'notes') route_name = 'advocate.case-notes.destroy';
        if (activeTab === 'tasks') route_name = 'tasks.destroy';

        router.delete(route(route_name, currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.success(t('Deleted successfully'));
            },
            onError: (errors) => {
                toast.error(`Failed to delete: ${Object.values(errors).join(', ')}`);
            },
        });
    };

    const handleNoteSubmit = (formData: any) => {
        const data = { ...formData, case_ids: [caseData.id.toString()] };

        if (formMode === 'create') {
            router.post(route('advocate.case-notes.store'), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Case note created'));
                },
                onError: (errors) => {
                    toast.error(`Failed to create note: ${Object.values(errors).join(', ')}`);
                },
            });
        } else if (formMode === 'edit') {
            router.put(route('advocate.case-notes.update', currentItem.id), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Case note updated'));
                },
                onError: (errors) => {
                    toast.error(`Failed to update note: ${Object.values(errors).join(', ')}`);
                },
            });
        }
    };

    const [pageInitialState, setPageInitialState] = useState(true);
    // Timeline filter functions
    const handleTimelineSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyTimelineFilters();
    };

    const applyTimelineFilters = () => {
        router.get(route('cases.show', caseData.id), {
            timeline_search: timelineSearch || undefined,
            timeline_event_type: timelineEventType !== '_empty_' ? timelineEventType : undefined,
            timeline_status: timelineStatus !== '_empty_' ? timelineStatus : undefined,
            timeline_completed: timelineCompleted !== '_empty_' ? timelineCompleted : undefined,
            ...(filters.timeline_sort_field && { timeline_sort_field: filters.timeline_sort_field, timeline_sort_direction: filters.timeline_sort_direction }),
            ...(filters.timeline_per_page && { timeline_per_page: filters.timeline_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    useEffect(() => {
        if (!pageInitialState) applyTimelineFilters();
        setPageInitialState(false);
    }, [timelineStatus, timelineEventType, timelineCompleted]);


    const handleTimelineSort = (field: string) => {
        const direction = filters.timeline_sort_field === field
            ? (filters.timeline_sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('cases.show', caseData.id), {
            timeline_search: timelineSearch || undefined,
            timeline_event_type: timelineEventType !== '_empty_' ? timelineEventType : undefined,
            timeline_status: timelineStatus !== '_empty_' ? timelineStatus : undefined,
            timeline_completed: timelineCompleted !== '_empty_' ? timelineCompleted : undefined,
            timeline_sort_field: field,
            timeline_sort_direction: direction,
            ...(filters.timeline_per_page && { timeline_per_page: filters.timeline_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    // Team filter functions
    const handleTeamSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyTeamFilters();
    };

    const applyTeamFilters = () => {
        router.get(route('cases.show', caseData.id), {
            team_search: teamSearch || undefined,
            team_role: teamRole !== '_empty_' ? teamRole : undefined,
            team_status: teamStatus !== '_empty_' ? teamStatus : undefined,
            ...(filters.team_sort_field && { team_sort_field: filters.team_sort_field, team_sort_direction: filters.team_sort_direction }),
            ...(filters.team_per_page && { team_per_page: filters.team_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    useEffect(() => {
        if (!pageInitialState) applyTeamFilters();
        setPageInitialState(false);
    }, [teamRole, teamStatus]);

    const handleTeamSort = (field: string) => {
        const direction = filters.team_sort_field === field
            ? (filters.team_sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('cases.show', caseData.id), {
            team_search: teamSearch || undefined,
            team_role: teamRole !== '_empty_' ? teamRole : undefined,
            team_status: teamStatus !== '_empty_' ? teamStatus : undefined,
            team_sort_field: field,
            team_sort_direction: direction,
            ...(filters.team_per_page && { team_per_page: filters.team_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    // Document filter functions
    const handleDocumentSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyDocumentFilters();
    };

    const applyDocumentFilters = () => {
        router.get(route('cases.show', caseData.id), {
            doc_search: docSearch || undefined,
            doc_type: docType !== '_empty_' ? docType : undefined,
            doc_confidentiality: docConfidentiality !== '_empty_' ? docConfidentiality : undefined,
            doc_status: docStatus !== '_empty_' ? docStatus : undefined,
            ...(filters.doc_sort_field && { doc_sort_field: filters.doc_sort_field, doc_sort_direction: filters.doc_sort_direction }),
            ...(filters.doc_per_page && { doc_per_page: filters.doc_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    useEffect(() => {
        if (!pageInitialState) applyDocumentFilters();
        setPageInitialState(false);
    }, [docType, docConfidentiality, docStatus]);

    const handleDocumentSort = (field: string) => {
        const direction = filters.doc_sort_field === field
            ? (filters.doc_sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('cases.show', caseData.id), {
            doc_search: docSearch || undefined,
            doc_type: docType !== '_empty_' ? docType : undefined,
            doc_confidentiality: docConfidentiality !== '_empty_' ? docConfidentiality : undefined,
            doc_status: docStatus !== '_empty_' ? docStatus : undefined,
            doc_sort_field: field,
            doc_sort_direction: direction,
            ...(filters.doc_per_page && { doc_per_page: filters.doc_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const applyNoteFilters = () => {
        router.get(route('cases.show', caseData.id), {
            note_search: noteSearch || undefined,
            note_type: noteType !== '_empty_' ? noteType : undefined,
            note_priority: notePriority !== '_empty_' ? notePriority : undefined,
            ...(filters.note_sort_field && { note_sort_field: filters.note_sort_field, note_sort_direction: filters.note_sort_direction }),
            ...(filters.note_per_page && { note_per_page: filters.note_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    useEffect(() => {
        if (!pageInitialState) applyNoteFilters();
        setPageInitialState(false);
    }, [noteType, notePriority]);


    // Task handlers
    const handleTaskAction = (action: string, item?: any) => {
        setCurrentItem(item || null);
        switch (action) {
            case 'create':
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'view':
                setIsTaskViewModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                setIsStatusModalOpen(true);
                break;
        }
    };

    const handleTaskStatusChange = (formData: any) => {
        router.put(route('tasks.toggle-status', currentItem.id), formData, {
            onSuccess: () => {
                setIsStatusModalOpen(false);
                toast.success(t('Task status updated'));
            },
            onError: (errors) => {
                toast.error(`Failed to update task status: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleTaskSubmit = (formData: any) => {
        const data = { ...formData, case_id: caseData.id };

        if (formMode === 'create') {
            router.post(route('tasks.store'), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Task created'));
                },
                onError: (errors) => {
                    toast.error(`Failed to create task: ${Object.values(errors).join(', ')}`);
                },
            });
        } else if (formMode === 'edit') {
            router.put(route('tasks.update', currentItem.id), data, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.success(t('Task updated'));
                },
                onError: (errors) => {
                    toast.error(`Failed to update task: ${Object.values(errors).join(', ')}`);
                },
            });
        }
    };

    // Task filter functions
    const handleTaskSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyTaskFilters();
    };

    const applyTaskFilters = () => {
        router.get(route('cases.show', caseData.id), {
            task_search: taskSearch || undefined,
            task_type_id: taskTypeId !== '_empty_' ? taskTypeId : undefined,
            task_status: taskStatus !== '_empty_' ? taskStatus : undefined,
            task_priority: taskPriority !== '_empty_' ? taskPriority : undefined,
            task_assigned_to: taskAssignedTo !== '_empty_' ? taskAssignedTo : undefined,
            ...(filters.task_sort_field && { task_sort_field: filters.task_sort_field, task_sort_direction: filters.task_sort_direction }),
            ...(filters.task_per_page && { task_per_page: filters.task_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    useEffect(() => {
        if (!pageInitialState) applyTaskFilters();
        setPageInitialState(false);
    }, [taskTypeId, taskStatus, taskPriority, taskAssignedTo]);

    const handleTaskSort = (field: string) => {
        const direction = filters.task_sort_field === field
            ? (filters.task_sort_direction === 'asc' ? 'desc' : 'asc')
            : 'asc';
        router.get(route('cases.show', caseData.id), {
            task_search: taskSearch || undefined,
            task_type_id: taskTypeId !== '_empty_' ? taskTypeId : undefined,
            task_status: taskStatus !== '_empty_' ? taskStatus : undefined,
            task_priority: taskPriority !== '_empty_' ? taskPriority : undefined,
            task_assigned_to: taskAssignedTo !== '_empty_' ? taskAssignedTo : undefined,
            task_sort_field: field,
            task_sort_direction: direction,
            ...(filters.task_per_page && { task_per_page: filters.task_per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Case Management'), href: route('cases.index') },
        { title: t('Cases'), href: route('cases.index') },
        { title: caseData.case_id },
    ];

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="mr-2 h-4 w-4" />,
            variant: 'outline',
            onClick: () => window.history.back(),
        },
    ];

    const timelineColumns = [
        {
            key: 'title',
            label: t('Title'),
            sortable: true,
        },
        {
            key: 'event_type',
            label: t('Event Type'),
            render: (value: string, row: any) => (
                <span
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                    style={row?.event_type ? {
                        backgroundColor: `${row.event_type?.color}20`,
                        color: row.event_type?.color,
                        boxShadow: `inset 0 0 0 1px ${hexToRgba(row.event_type?.color, 0.2)}`,
                    } : {}}
                >
                    {formatStatusText(row?.event_type?.name || '-')}
                </span>
            ),
        },
        {
            key: 'event_date',
            label: t('Event Date'),
            sortable: true,
            type: 'date',
        },
        {
            key: 'is_completed',
            label: t('Completed'),
            render: (value: boolean) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                    }`}>
                    {value ? t('Yes') : t('No')}
                </span>
            ),
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => (
                <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                        ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset'
                        : 'bg-red-50 text-red-700 ring-1 ring-red-600/20 ring-inset'
                        }`}
                >
                    {value === 'active' ? t('Active') : t('Inactive')}
                </span>
            ),
        },
    ];

    const teamColumns = [
        {
            key: 'user',
            label: t('Team Member'),
            render: (value: any, row: any) => {
                return (
                    <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage
                            src={row?.user?.avatar}
                            alt={row?.user?.name}
                        />
                        <AvatarFallback className="text-lg">
                            {getInitials(row?.user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{row?.user?.name}</div>
                        <div className="text-sm text-muted-foreground">{row?.user?.email}</div>
                    </div>
                </div>
                );
            }
        },

        {
            key: 'assigned_date',
            label: t('Assigned Date'),
            sortable: true,
            type: 'date',
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    }`}>
                    {formatStatusText(value)}
                </span>
            ),
        },
    ];

    const timelineActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-case-timelines' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-case-timelines' },
        { label: t('Toggle Status'), icon: 'Lock', action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'toggle-status-case-timelines' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-case-timelines' },
    ];

    const teamActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-case-team-members' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-case-team-members' },
        { label: t('Toggle Status'), icon: 'Lock', action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'toggle-status-case-team-members' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-case-team-members' },
    ];

    const noteActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-case-notes' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-case-notes' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-case-notes' },
    ];

    const taskActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-case-tasks' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-case-tasks' },
        { label: t('Change Status'), icon: 'RefreshCw', action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'toggle-status-case-tasks' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-case-tasks' },
    ];

    return (
        <PageTemplate
            title={`${caseData.title} (${caseData.case_id})`}
            url={`/cases/${caseData.id}`}
            actions={pageActions}
            description={t("Manage and track case progress.")}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-6">



                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('Client')}</p>
                                    <h3 className="text-lg font-bold truncate leading-tight">{caseData.client?.name || '-'}</h3>
                                </div>
                                <div className="rounded-full bg-blue-100 p-3 ml-3">
                                    <User className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('Case Type')}</p>
                                    <h3 className="text-lg font-bold truncate leading-tight">{caseData.case_type?.name || '-'}</h3>
                                </div>
                                <div className="rounded-full bg-purple-100 p-3 ml-3">
                                    <Scale className="h-4 w-4 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('Filing Date')}</p>
                                    <h3 className="text-lg font-bold truncate leading-tight">
                                        {caseData.filing_date ? (window.appSettings?.formatDate(caseData.filing_date) || new Date(caseData.filing_date).toLocaleDateString()) : '-'}
                                    </h3>
                                </div>
                                <div className="rounded-full bg-orange-100 p-3 ml-3">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('Expected Completion')}</p>
                                    <h3 className="text-lg font-bold truncate leading-tight">
                                        {caseData.expected_completion_date ? (window.appSettings?.formatDate(caseData.expected_completion_date) || new Date(caseData.expected_completion_date).toLocaleDateString()) : '-'}
                                    </h3>
                                </div>

                                <div className="rounded-full bg-green-100 p-3 ml-3">
                                    <CheckSquare className="h-4 w-4 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Court Details */}
                {caseData.court && (
                    <Card className="shadow-sm">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Gavel className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Court Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Court Name')}</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{caseData.court.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Court Type')}</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{caseData.court.court_type?.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Jurisdiction')}</label>
                                    <p className="mt-1 text-gray-900 dark:text-white">{caseData.court.jurisdiction || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Address')}</label>
                                    <div className="flex items-start mt-1">
                                        <MapPin className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 shrink-0" />
                                        <p className="text-gray-900 dark:text-white">{caseData.court.address || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Phone')}</label>
                                    <div className="flex items-center mt-1">
                                        <Phone className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                                        <p className="text-gray-900 dark:text-white">{caseData.court.phone || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Email')}</label>
                                    <div className="flex items-center mt-1">
                                        <Mail className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                                        <p className="text-gray-900 dark:text-white">{caseData.court.email || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {caseData.court.judges && caseData.court.judges.length > 0 && (
                                <div className="mt-6 border-t pt-6">
                                    <p className="text-sm font-medium text-muted-foreground mb-3">{t('Judges')}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {caseData.court.judges.map((judge: any) => (
                                            <div key={judge.id} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-gray-900 dark:text-white text-sm">{judge.name}</span>
                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                        {judge.designation || t('Judge')}
                                                    </span>
                                                </div>
                                                {judge.specialization && (
                                                    <p className="text-xs text-muted-foreground">{t('Specialization')}: {judge.specialization}</p>
                                                )}
                                                {judge.contact_info && (
                                                    <p className="text-xs text-muted-foreground mt-1">{t('Contact')}: {judge.contact_info}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Case Details */}
                <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                        <CardTitle className="flex items-center text-lg font-semibold">
                            <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                            {t('Case Details')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Case ID')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white">{caseData.case_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Title')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white">{caseData.title}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Client')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white">{caseData.client?.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Case Type')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white">{caseData.case_type?.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Status')}</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${caseData.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                            }`}>
                                            {formatStatusText(caseData.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Opposing Party')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white">{caseData.opposing_party || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Estimated Value')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white font-mono">
                                        {caseData.estimated_value ? (window.appSettings?.formatCurrency(Number(caseData.estimated_value)) || `$${Number(caseData.estimated_value).toFixed(2)}`) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Filing Date')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white">
                                        {caseData.filing_date ? (window.appSettings?.formatDate(caseData.filing_date) || new Date(caseData.filing_date).toLocaleDateString()) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Expected Completion')}</label>
                                    <p className="text-sm mt-1 text-gray-900 dark:text-white">
                                        {caseData.expected_completion_date ? (window.appSettings?.formatDate(caseData.expected_completion_date) || new Date(caseData.expected_completion_date).toLocaleDateString()) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">{t('Priority')}</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${caseData.priority === 'high'
                                                ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                                : caseData.priority === 'medium'
                                                    ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                                                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                            }`}>
                                            {formatStatusText(caseData.priority)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {caseData.description && (
                            <div className="mt-6 border-t pt-6">
                                <label className="text-sm font-medium text-muted-foreground">{t('Description')}</label>
                                <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">{caseData.description}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>



                {/* Tabs */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex overflow-x-auto">
                            {hasPermission(permissions, 'manage-case-timelines') && (
                                <button
                                    onClick={() => {
                                        setActiveTab('timelines');
                                        router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'timelines'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{t('Timeline')}</span>
                                    </div>
                                </button>
                            )}
                            {hasPermission(permissions, 'manage-case-team-members') && (
                                <button
                                    onClick={() => {
                                        setActiveTab('team');
                                        router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'team'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4" />
                                        <span>{t('Team Members')}</span>
                                    </div>
                                </button>
                            )}
                            {hasPermission(permissions, 'manage-case-documents') && (
                                <button
                                    onClick={() => {
                                        setActiveTab('documents');
                                        router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'documents'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <FileText className="h-4 w-4" />
                                        <span>{t('Documents')}</span>
                                    </div>
                                </button>
                            )}
                            {hasPermission(permissions, 'manage-case-notes') && (
                                <button
                                    onClick={() => {
                                        setActiveTab('notes');
                                        router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'notes'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <FileText className="h-4 w-4" />
                                        <span>{t('Notes')}</span>
                                    </div>
                                </button>
                            )}
                            {hasPermission(permissions, 'manage-case-tasks') && (
                                <button
                                    onClick={() => {
                                        setActiveTab('tasks');
                                        router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'tasks'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <CheckSquare className="h-4 w-4" />
                                        <span>{t('Tasks')}</span>
                                    </div>
                                </button>
                            )}
                            {hasPermission(permissions, 'manage-research-projects') && (
                                <button
                                    onClick={() => {
                                        setActiveTab('research-projects');
                                        router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                    }}
                                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'research-projects'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <Search className="h-4 w-4" />
                                        <span>{t('Research Projects')}</span>
                                    </div>
                                </button>
                            )}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'timelines' && hasPermission(permissions, 'manage-case-timelines') && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Timeline')}</h3>
                                    {hasPermission(permissions, 'create-case-timelines') && (
                                        <Button variant="default" onClick={() => handleTimelineAction('create')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Timeline Event')}
                                        </Button>
                                    )}
                                </div>

                                <CaseTimelineCalendar
                                    timelines={timelines || []}
                                    permissions={permissions}
                                    onAction={handleTimelineAction}
                                    weekStart={timelineWeekStart ?? (() => {
                                        const d = new Date();
                                        const dow = d.getDay();
                                        d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
                                        const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
                                        return `${y}-${m}-${dd}`;
                                    })()}
                                    onWeekChange={(ws) => router.get(
                                        route('cases.show', caseData.id),
                                        { timeline_week_start: ws },
                                        { preserveState: true, preserveScroll: true }
                                    )}
                                    monthLabel={timelineMonthLabel}
                                    monthNum={timelineMonthNum}
                                    yearNum={timelineYearNum}
                                    caseId={caseData.id}
                                />
                            </div>
                        )}

                        {activeTab === 'team' && hasPermission(permissions, 'manage-case-team-members') && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Team Members')}</h3>
                                    {hasPermission(permissions, 'create-case-team-members') && (
                                        <Button variant="default" onClick={() => handleTeamAction('create')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Team Member')}
                                        </Button>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                                    <SearchAndFilterBar
                                        searchTerm={teamSearch}
                                        onSearchChange={setTeamSearch}
                                        onSearch={handleTeamSearch}
                                        filters={[
                                            {
                                                name: 'team_role',
                                                label: t('Role'),
                                                type: 'select',
                                                value: teamRole,
                                                onChange: setTeamRole,
                                                searchable: true,
                                                options: [
                                                    { value: '_empty_', label: t('All Roles') },
                                                    ...(allRoles || []).map((role: any) => ({
                                                        value: role.name,
                                                        label: role.label || role.name
                                                    }))
                                                ],
                                            },
                                            {
                                                name: 'team_status',
                                                label: t('Status'),
                                                type: 'select',
                                                value: teamStatus,
                                                onChange: setTeamStatus,
                                                options: [
                                                    { value: '_empty_', label: t('All Status') },
                                                    { value: 'active', label: t('Active') },
                                                    { value: 'inactive', label: t('Inactive') },
                                                ],
                                            },
                                        ]}
                                        showFilters={showTeamFilters}
                                        setShowFilters={setShowTeamFilters}
                                        hasActiveFilters={() => teamSearch !== '' || teamRole !== '_empty_' || teamStatus !== '_empty_'}
                                        activeFilterCount={() => (teamSearch ? 1 : 0) + (teamRole !== '_empty_' ? 1 : 0) + (teamStatus !== '_empty_' ? 1 : 0)}
                                        onResetFilters={() => {
                                            setTeamSearch('');
                                            setTeamRole('_empty_');
                                            setTeamStatus('_empty_');
                                            router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                        }}
                                        onApplyFilters={applyTeamFilters}
                                        currentPerPage={filters.team_per_page?.toString() || '10'}
                                        onPerPageChange={(value) => {
                                            router.get(route('cases.show', caseData.id), {
                                                team_search: teamSearch || undefined,
                                                team_role: teamRole !== '_empty_' ? teamRole : undefined,
                                                team_status: teamStatus !== '_empty_' ? teamStatus : undefined,
                                                team_sort_field: filters.team_sort_field || undefined,
                                                team_sort_direction: filters.team_sort_direction || undefined,
                                                ...(parseInt(value) !== 10 && { team_per_page: parseInt(value) }),
                                            }, { preserveState: true, preserveScroll: true });
                                        }}
                                    />
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                                    <CrudTable
                                        columns={teamColumns}
                                        actions={teamActions}
                                        data={teamMembers?.data || []}
                                        from={teamMembers?.from || 1}
                                        onAction={handleTeamAction}
                                        sortField={filters.team_sort_field}
                                        sortDirection={filters.team_sort_direction}
                                        onSort={handleTeamSort}
                                        permissions={permissions}
                                        entityPermissions={{
                                            view: 'view-case-team-members',
                                            create: 'create-case-team-members',
                                            edit: 'edit-case-team-members',
                                            delete: 'delete-case-team-members',
                                        }}
                                    />

                                    <Pagination
                                        from={teamMembers?.from || 0}
                                        to={teamMembers?.to || 0}
                                        total={teamMembers?.total || 0}
                                        links={teamMembers?.links}
                                        entityName={t('team members')}
                                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'documents' && hasPermission(permissions, 'manage-case-documents') && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Documents')}</h3>
                                    {hasPermission(permissions, 'create-case-documents') && (
                                        <Button variant="default" onClick={() => handleDocumentAction('create')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Document')}
                                        </Button>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                                    <SearchAndFilterBar
                                        searchTerm={docSearch}
                                        onSearchChange={setDocSearch}
                                        onSearch={handleDocumentSearch}
                                        filters={[
                                            {
                                                name: 'doc_type',
                                                label: t('Document Type'),
                                                type: 'select',
                                                value: docType,
                                                searchable: true,
                                                onChange: setDocType,
                                                options: [
                                                    { value: '_empty_', label: t('All Types') },
                                                    ...(allDocumentTypes || []).map((type: any) => ({
                                                        value: type.id.toString(),
                                                        label: type.name,
                                                    })),
                                                ],
                                            },
                                            {
                                                name: 'doc_confidentiality',
                                                label: t('Confidentiality'),
                                                type: 'select',
                                                value: docConfidentiality,
                                                onChange: setDocConfidentiality,
                                                options: [
                                                    { value: '_empty_', label: t('All Levels') },
                                                    { value: 'public', label: t('Public') },
                                                    { value: 'confidential', label: t('Confidential') },
                                                    { value: 'privileged', label: t('Privileged') },
                                                ],
                                            },
                                            {
                                                name: 'doc_status',
                                                label: t('Status'),
                                                type: 'select',
                                                value: docStatus,
                                                onChange: setDocStatus,
                                                options: [
                                                    { value: '_empty_', label: t('All Status') },
                                                    { value: 'active', label: t('Active') },
                                                    { value: 'archived', label: t('Archived') },
                                                ],
                                            },
                                        ]}
                                        showFilters={showDocFilters}
                                        setShowFilters={setShowDocFilters}
                                        hasActiveFilters={() =>
                                            docSearch !== '' || docType !== '_empty_' || docConfidentiality !== '_empty_' || docStatus !== '_empty_'
                                        }
                                        activeFilterCount={() =>
                                            (docSearch ? 1 : 0) +
                                            (docType !== '_empty_' ? 1 : 0) +
                                            (docConfidentiality !== '_empty_' ? 1 : 0) +
                                            (docStatus !== '_empty_' ? 1 : 0)
                                        }
                                        onResetFilters={() => {
                                            setDocSearch('');
                                            setDocType('_empty_');
                                            setDocConfidentiality('_empty_');
                                            setDocStatus('_empty_');
                                            router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                        }}
                                        onApplyFilters={applyDocumentFilters}
                                        currentPerPage={filters.doc_per_page?.toString() || '10'}
                                        onPerPageChange={(value) => {
                                            router.get(route('cases.show', caseData.id), {
                                                doc_search: docSearch || undefined,
                                                doc_type: docType !== '_empty_' ? docType : undefined,
                                                doc_confidentiality: docConfidentiality !== '_empty_' ? docConfidentiality : undefined,
                                                doc_status: docStatus !== '_empty_' ? docStatus : undefined,
                                                doc_sort_field: filters.doc_sort_field || undefined,
                                                doc_sort_direction: filters.doc_sort_direction || undefined,
                                                ...(parseInt(value) !== 10 && { doc_per_page: parseInt(value) }),
                                            }, { preserveState: true, preserveScroll: true });
                                        }}
                                    />
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                                    <CrudTable
                                        columns={[
                                            { key: 'document_name', label: t('Document Name'), sortable: true },
                                            {
                                                key: 'document_type_id',
                                                label: t('Document Type'),
                                                render: (value: any, row: any) => {
                                                    const docType = row.document_type;
                                                    return docType?.name ? (
                                                        <span
                                                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: `${docType.color || '#3B82F6'}20`,
                                                                color: docType.color || '#3B82F6',
                                                                boxShadow: `inset 0 0 0 1px ${hexToRgba(docType.color, 0.2)}`,
                                                            }}
                                                        >
                                                            {formatStatusText(docType.name)}
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    );
                                                },
                                            },
                                            {
                                                key: 'confidentiality',
                                                label: t('Confidentiality'),
                                                render: (value: string) => {
                                                    const confidentialities = {
                                                        public: { label: t('Public'), class: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' },
                                                        confidential: { label: t('Confidential'), class: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20' },
                                                        privileged: { label: t('Privileged'), class: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' },
                                                    };
                                                    const conf = confidentialities[value as keyof typeof confidentialities];
                                                    return (
                                                        <span
                                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${conf?.class || 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'}`}
                                                        >
                                                            {formatStatusText(conf?.label || value)}
                                                        </span>
                                                    );
                                                },
                                            },

                                            {
                                                key: 'created_at',
                                                label: t('Created At'),
                                                sortable: true,
                                                type: 'date',
                                            },
                                        ]}
                                        actions={[
                                            { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-case-documents' },
                                            { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-case-documents' },
                                            { label: t('Download'), icon: 'Download', action: 'download', className: 'text-green-500', requiredPermission: 'download-case-documents' },
                                            { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-case-documents' },
                                        ]}
                                        data={caseDocuments?.data || []}
                                        from={caseDocuments?.from || 1}
                                        onAction={handleDocumentAction}
                                        sortField={filters.doc_sort_field}
                                        sortDirection={filters.doc_sort_direction}
                                        onSort={handleDocumentSort}
                                        permissions={permissions}
                                        entityPermissions={{
                                            view: 'view-case-documents',
                                            create: 'create-case-documents',
                                            edit: 'edit-case-documents',
                                            delete: 'delete-case-documents',
                                        }}
                                    />

                                    <Pagination
                                        from={caseDocuments?.from || 0}
                                        to={caseDocuments?.to || 0}
                                        total={caseDocuments?.total || 0}
                                        links={caseDocuments?.links}
                                        entityName={t('documents')}
                                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'notes' && hasPermission(permissions, 'manage-case-notes') && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Notes')}</h3>
                                    {hasPermission(permissions, 'create-case-notes') && (
                                        // <button
                                        //     onClick={() => handleNoteAction('create')}
                                        //     className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                        // >
                                        //     <Plus className="h-4 w-4" />
                                        //     {t('Add Note')}
                                        // </button>
                                        <Button variant="default" onClick={() => handleNoteAction('create')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Note')}
                                        </Button>


                                    )}

                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                                    <SearchAndFilterBar
                                        searchTerm={noteSearch}
                                        onSearchChange={setNoteSearch}
                                        onSearch={(e) => {
                                            e.preventDefault();
                                            router.get(route('cases.show', caseData.id), {
                                                note_search: noteSearch || undefined,
                                                note_type: noteType !== '_empty_' ? noteType : undefined,
                                                note_priority: notePriority !== '_empty_' ? notePriority : undefined,
                                                ...(filters.note_sort_field && { note_sort_field: filters.note_sort_field, note_sort_direction: filters.note_sort_direction }),
                                                ...(filters.note_per_page && { note_per_page: filters.note_per_page }),
                                            }, { preserveState: true, preserveScroll: true });
                                        }}
                                        filters={[
                                            {
                                                name: 'note_type',
                                                label: t('Note Type'),
                                                type: 'select',
                                                value: noteType,
                                                onChange: setNoteType,
                                                options: [
                                                    { value: '_empty_', label: t('All Types') },
                                                    { value: 'general', label: t('General') },
                                                    { value: 'meeting', label: t('Meeting') },
                                                    { value: 'research', label: t('Research') },
                                                    { value: 'strategy', label: t('Strategy') },
                                                ],
                                            },
                                            {
                                                name: 'priority',
                                                label: t('Priority'),
                                                type: 'select',
                                                value: notePriority,
                                                onChange: setNotePriority,
                                                options: [
                                                    { value: '_empty_', label: t('All Priorities') },
                                                    { value: 'low', label: t('Low') },
                                                    { value: 'medium', label: t('Medium') },
                                                    { value: 'high', label: t('High') },
                                                    { value: 'urgent', label: t('Urgent') },
                                                ],
                                            },
                                        ]}
                                        showFilters={showNoteFilters}
                                        setShowFilters={setShowNoteFilters}
                                        hasActiveFilters={() => noteSearch !== '' || noteType !== '_empty_' || notePriority !== '_empty_'}
                                        activeFilterCount={() => (noteSearch ? 1 : 0) + (noteType !== '_empty_' ? 1 : 0) + (notePriority !== '_empty_' ? 1 : 0)}
                                        onResetFilters={() => {
                                            setNoteSearch('');
                                            setNoteType('_empty_');
                                            setNotePriority('_empty_');
                                            router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                        }}
                                        onApplyFilters={applyNoteFilters}
                                        currentPerPage={filters.note_per_page?.toString() || '10'}
                                        onPerPageChange={(value) => {
                                            router.get(route('cases.show', caseData.id), {
                                                note_search: noteSearch || undefined,
                                                note_type: noteType !== '_empty_' ? noteType : undefined,
                                                note_priority: notePriority !== '_empty_' ? notePriority : undefined,
                                                note_sort_field: filters.note_sort_field || undefined,
                                                note_sort_direction: filters.note_sort_direction || undefined,
                                                ...(parseInt(value) !== 10 && { note_per_page: parseInt(value) }),
                                            }, { preserveState: true, preserveScroll: true });
                                        }}
                                    />
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                                    <CrudTable
                                        columns={[
                                            {
                                                key: 'creator',
                                                label: t('Created By'),
                                                render: (value: any, row: any) => {
                                                    return (
                                                        <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage
                                                                src={value?.avatar}
                                                                alt={value?.name}
                                                            />
                                                            <AvatarFallback className="text-lg">
                                                                {getInitials(value?.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{value?.name}</div>
                                                            <div className="text-sm text-muted-foreground">{value?.email}</div>
                                                        </div>
                                                    </div>
                                                    );
                                                }
                                            },
                                            { key: 'title', label: t('Title'), sortable: true },
                                            {
                                                key: 'note_type',
                                                label: t('Type'),
                                                render: (value: string) => (
                                                    <span className={'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'}>
                                                        {formatStatusText(value)}
                                                    </span>
                                                ),
                                            },
                                            {
                                                key: 'priority',
                                                label: t('Priority'),
                                                render: (value: string) => {
                                                    const colors = {
                                                        low: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
                                                        medium: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
                                                        high: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
                                                        urgent: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
                                                    };
                                                    return (
                                                        <span
                                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colors[value as keyof typeof colors] || colors.medium}`}
                                                        >
                                                            {formatStatusText(value)}
                                                        </span>
                                                    );
                                                },
                                            },
                                            {
                                                key: 'created_at',
                                                label: t('Created At'),
                                                sortable: true,
                                                type: 'date',
                                            },
                                        ]}
                                        actions={noteActions}
                                        data={caseNotes?.data || []}
                                        from={caseNotes?.from || 1}
                                        onAction={handleNoteAction}
                                        sortField={filters.note_sort_field}
                                        sortDirection={filters.note_sort_direction}
                                        onSort={(field) => {
                                            const direction = filters.note_sort_field === field
                                                ? (filters.note_sort_direction === 'asc' ? 'desc' : 'asc')
                                                : 'asc';
                                            router.get(
                                                route('cases.show', caseData.id),
                                                {
                                                    note_search: noteSearch || undefined,
                                                    note_type: noteType !== '_empty_' ? noteType : undefined,
                                                    note_priority: notePriority !== '_empty_' ? notePriority : undefined,
                                                    note_sort_field: field,
                                                    note_sort_direction: direction,
                                                    ...(filters.note_per_page && { note_per_page: filters.note_per_page }),
                                                },
                                                { preserveState: true, preserveScroll: true },
                                            );
                                        }}
                                        permissions={permissions}
                                        entityPermissions={{
                                            view: 'view-case-notes',
                                            create: 'create-case-notes',
                                            edit: 'edit-case-notes',
                                            delete: 'delete-case-notes',
                                        }}
                                    />

                                    <Pagination
                                        from={caseNotes?.from || 0}
                                        to={caseNotes?.to || 0}
                                        total={caseNotes?.total || 0}
                                        links={caseNotes?.links}
                                        entityName={t('notes')}
                                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'tasks' && hasPermission(permissions, 'manage-case-tasks') && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Tasks')}</h3>
                                    {hasPermission(permissions, 'create-case-tasks') && (
                                        // <button
                                        //     onClick={() => handleTaskAction('create')}
                                        //     className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                        // >
                                        //     <Plus className="h-4 w-4" />
                                        //     {t('Add Task')}
                                        // </button>
                                        <Button variant="default" onClick={() => handleTaskAction('create')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Task')}
                                        </Button>

                                    )}
                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                                    <SearchAndFilterBar
                                        searchTerm={taskSearch}
                                        onSearchChange={setTaskSearch}
                                        onSearch={handleTaskSearch}
                                        filters={[
                                            {
                                                name: 'task_type_id',
                                                label: t('Task Type'),
                                                type: 'select',
                                                searchable: true,
                                                value: taskTypeId,
                                                onChange: setTaskTypeId,
                                                options: [
                                                    { value: '_empty_', label: t('All Types') },
                                                    ...(allTaskTypes?.map((type: any) => ({
                                                        value: type.id.toString(),
                                                        label: type.name,
                                                    })) || []),
                                                ],
                                            },
                                            {
                                                name: 'task_status',
                                                label: t('Task Status'),
                                                type: 'select',
                                                value: taskStatus,
                                                searchable: true,
                                                onChange: setTaskStatus,
                                                options: [
                                                    { value: '_empty_', label: t('All Status') },
                                                    ...(allTaskStatuses || []).map((status: any) => ({
                                                        value: status.id.toString(),
                                                        label: status.name,
                                                    })),
                                                ],
                                            },
                                            {
                                                name: 'task_priority',
                                                label: t('Priority'),
                                                type: 'select',
                                                value: taskPriority,
                                                onChange: setTaskPriority,
                                                options: [
                                                    { value: '_empty_', label: t('All Priorities') },
                                                    { value: 'critical', label: t('Critical') },
                                                    { value: 'high', label: t('High') },
                                                    { value: 'medium', label: t('Medium') },
                                                    { value: 'low', label: t('Low') },
                                                ],
                                            },
                                            {
                                                name: 'task_assigned_to',
                                                label: t('Assigned To'),
                                                type: 'select',
                                                value: taskAssignedTo,
                                                searchable: true,
                                                onChange: setTaskAssignedTo,
                                                options: [
                                                    { value: '_empty_', label: t('All Users') },
                                                    ...(allUsers?.map((user: any) => ({
                                                        value: user.id.toString(),
                                                        label: user.name,
                                                    })) || []),
                                                ],
                                            },
                                        ]}
                                        showFilters={showTaskFilters}
                                        setShowFilters={setShowTaskFilters}
                                        hasActiveFilters={() =>
                                            taskSearch !== '' ||
                                            taskTypeId !== '_empty_' ||
                                            taskStatus !== '_empty_' ||
                                            taskPriority !== '_empty_' ||
                                            taskAssignedTo !== '_empty_'
                                        }
                                        activeFilterCount={() =>
                                            (taskSearch ? 1 : 0) +
                                            (taskTypeId !== '_empty_' ? 1 : 0) +
                                            (taskStatus !== '_empty_' ? 1 : 0) +
                                            (taskPriority !== '_empty_' ? 1 : 0) +
                                            (taskAssignedTo !== '_empty_' ? 1 : 0)
                                        }
                                        onResetFilters={() => {
                                            setTaskSearch('');
                                            setTaskTypeId('_empty_');
                                            setTaskStatus('_empty_');
                                            setTaskPriority('_empty_');
                                            setTaskAssignedTo('_empty_');
                                            router.get(route('cases.show', caseData.id), {}, { preserveState: true, preserveScroll: true });
                                        }}
                                        onApplyFilters={applyTaskFilters}
                                        currentPerPage={filters.task_per_page?.toString() || '10'}
                                        onPerPageChange={(value) => {
                                            router.get(route('cases.show', caseData.id), {
                                                task_search: taskSearch || undefined,
                                                task_type_id: taskTypeId !== '_empty_' ? taskTypeId : undefined,
                                                task_status: taskStatus !== '_empty_' ? taskStatus : undefined,
                                                task_priority: taskPriority !== '_empty_' ? taskPriority : undefined,
                                                task_assigned_to: taskAssignedTo !== '_empty_' ? taskAssignedTo : undefined,
                                                task_sort_field: filters.task_sort_field || undefined,
                                                task_sort_direction: filters.task_sort_direction || undefined,
                                                ...(parseInt(value) !== 10 && { task_per_page: parseInt(value) }),
                                            }, { preserveState: true, preserveScroll: true });
                                        }}
                                    />
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                                    <CrudTable
                                        columns={[
                                            {
                                                key: 'assignedUser',
                                                label: t('Assigned To'),
                                                render: (value: any, row: any) => {
                                                    return (
                                                        <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage
                                                                src={row?.assigned_user?.avatar}
                                                                alt={row?.assigned_user?.name}
                                                            />
                                                            <AvatarFallback className="text-lg">
                                                                {getInitials(row?.assigned_user?.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{row?.assigned_user?.name}</div>
                                                            <div className="text-sm text-muted-foreground">{row?.assigned_user?.email}</div>
                                                        </div>
                                                    </div>
                                                    );
                                                }
                                            },
                                            {
                                                key: 'title',
                                                label: t('Title'),
                                                sortable: true,
                                            },
                                            {
                                                key: 'task_type',
                                                label: t('Type'),
                                                render: (value: any) => (
                                                    <span
                                                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                                        style={value ? {
                                                            backgroundColor: `${value?.color}20`,
                                                            color: value?.color,
                                                            boxShadow: `inset 0 0 0 1px ${hexToRgba(value?.color, 0.2)}`,
                                                        } : {}}
                                                    >
                                                        {formatStatusText(value?.name || '-')}
                                                    </span>
                                                ),
                                            },
                                            {
                                                key: 'priority',
                                                label: t('Priority'),
                                                render: (value: string) => {
                                                    const colors = {
                                                        critical: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
                                                        high: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
                                                        medium: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20',
                                                        low: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
                                                    };
                                                    return (
                                                        <span
                                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colors[value as keyof typeof colors] || colors.medium
                                                                }`}
                                                        >
                                                            {formatStatusText(value || '-')}
                                                        </span>
                                                    );
                                                },
                                            },
                                            {
                                                key: 'task_status',
                                                label: t('Task Status'),
                                                render: (_value: string, row: any) => (
                                                    <span
                                                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                                        style={{
                                                            backgroundColor: `${row.task_status?.color}20`,
                                                            color: row.task_status?.color,
                                                            boxShadow: `inset 0 0 0 1px ${hexToRgba(row.task_status?.color, 0.2)}`,
                                                        }}
                                                    >
                                                        {formatStatusText(row.task_status?.name || '-')}
                                                    </span>
                                                ),
                                            },
                                            {
                                                key: 'due_date',
                                                label: t('Due Date'),
                                                sortable: true,
                                                type: 'date',
                                            },
                                        ]}
                                        actions={taskActions}
                                        data={tasks?.data || []}
                                        from={tasks?.from || 1}
                                        onAction={handleTaskAction}
                                        sortField={filters.task_sort_field}
                                        sortDirection={filters.task_sort_direction}
                                        onSort={handleTaskSort}
                                        permissions={permissions}
                                        entityPermissions={{
                                            view: 'view-case-tasks',
                                            create: 'create-case-tasks',
                                            edit: 'edit-case-tasks',
                                            delete: 'delete-case-tasks',
                                        }}
                                    />

                                    <Pagination
                                        from={tasks?.from || 0}
                                        to={tasks?.to || 0}
                                        total={tasks?.total || 0}
                                        links={tasks?.links}
                                        entityName={t('tasks')}
                                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'research-projects' && hasPermission(permissions, 'manage-research-projects') && (
                            <div>
                                {!selectedProject ? (
                                    <div>
                                        <div className="mb-6 flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Research Projects')}</h3>
                                        </div>

                                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                                            <CrudTable
                                                columns={[
                                                    { key: 'title', label: t('Project Title'), sortable: true },
                                                    { key: 'research_id', label: t('Project ID'), sortable: true },
                                                    {
                                                        key: 'priority',
                                                        label: t('Priority'),
                                                        render: (value: string) => (
                                                            <span
                                                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'urgent'
                                                                    ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                                                    : value === 'high'
                                                                        ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20'
                                                                        : value === 'medium'
                                                                            ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                                                                            : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                                                                    }`}
                                                            >
                                                                {t(value?.charAt(0).toUpperCase() + value?.slice(1))}
                                                            </span>
                                                        ),
                                                    },
                                                    {
                                                        key: 'status',
                                                        label: t('Status'),
                                                        render: (value: string) => (
                                                            <span
                                                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                                                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                                    : value === 'completed'
                                                                        ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                                                                        : value === 'on_hold'
                                                                            ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                                                                            : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                                                    }`}
                                                            >
                                                                {t(value?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()))}
                                                            </span>
                                                        ),
                                                    },
                                                ]}
                                                actions={[{ label: t('View Details'), icon: 'Eye', action: 'view', className: 'text-blue-500' }]}
                                                data={researchProjects?.data || []}
                                                from={researchProjects?.from || 1}
                                                onAction={(action, project) => {
                                                    if (action === 'view') {
                                                        setSelectedProject(project);
                                                        setProjectSubTab('notes');
                                                    }
                                                }}
                                                sortField={filters.research_sort_field}
                                                sortDirection={filters.research_sort_direction}
                                                onSort={(field) => {
                                                    const direction = filters.research_sort_field === field
                                                        ? (filters.research_sort_direction === 'asc' ? 'desc' : 'asc')
                                                        : 'asc';
                                                    router.get(route('cases.show', caseData.id), {
                                                        research_sort_field: field,
                                                        research_sort_direction: direction,
                                                    }, { preserveState: true, preserveScroll: true });
                                                }}
                                                permissions={permissions}
                                                entityPermissions={{
                                                    view: 'view-research-projects',
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProject.title}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProject.research_id}</p>
                                            </div>
                                            <Button
                                                onClick={() => setSelectedProject(null)}
                                                variant="outline"
                                            >
                                                <ArrowLeft className="mr-2 h-4 w-4" />
                                                {t('Back')}
                                            </Button>
                                        </div>

                                        {/* Project Details Card */}
                                        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                                <div>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400">{t('Research Type')}:</span>
                                                    <p className="text-gray-900 dark:text-white">{selectedProject.research_type?.name || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400">{t('Due Date')}:</span>
                                                    <p className="text-gray-900 dark:text-white">
                                                        {selectedProject.due_date ? (window.appSettings?.formatDate(selectedProject.due_date) || new Date(selectedProject.due_date).toLocaleDateString()) : '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400">{t('Priority')}:</span>
                                                    <span
                                                        className={`ml-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${selectedProject.priority === 'urgent'
                                                            ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                                            : selectedProject.priority === 'high'
                                                                ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20'
                                                                : selectedProject.priority === 'medium'
                                                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                                                                    : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                                                            }`}
                                                    >
                                                        {t(selectedProject.priority?.charAt(0).toUpperCase() + selectedProject.priority?.slice(1))}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400">{t('Status')}:</span>
                                                    <span
                                                        className={`ml-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${selectedProject.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                            : selectedProject.status === 'completed'
                                                                ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                                                                : selectedProject.status === 'on_hold'
                                                                    ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                                                                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                                            }`}
                                                    >
                                                        {t(selectedProject.status?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()))}
                                                    </span>
                                                </div>
                                            </div>

                                            {selectedProject.description && (
                                                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                                                    <span className="font-medium text-gray-500 dark:text-gray-400">{t('Description')}:</span>
                                                    <p className="mt-1 text-gray-900 dark:text-white">{selectedProject.description}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Project Sub-tabs */}
                                        <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                                            <div className="border-b border-gray-200 dark:border-gray-700">
                                                <nav className="flex">
                                                    <button
                                                        onClick={() => setProjectSubTab('notes')}
                                                        className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${projectSubTab === 'notes'
                                                            ? 'border-primary text-primary'
                                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <FileText className="h-4 w-4" />
                                                            <span>
                                                                {t('Notes')} ({selectedProject.notes?.length || 0})
                                                            </span>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => setProjectSubTab('citations')}
                                                        className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${projectSubTab === 'citations'
                                                            ? 'border-primary text-primary'
                                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <FileText className="h-4 w-4" />
                                                            <span>
                                                                {t('Citations')} ({selectedProject.citations?.length || 0})
                                                            </span>
                                                        </div>
                                                    </button>
                                                </nav>
                                            </div>

                                            <div className="p-6">
                                                {projectSubTab === 'notes' && (
                                                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                                                        <CrudTable
                                                            columns={[
                                                                { key: 'title', label: t('Title') },
                                                                {
                                                                    key: 'note_content',
                                                                    label: t('Content'),
                                                                    render: (value: string) => value?.substring(0, 50) + '...' || '-',
                                                                },
                                                                {
                                                                    key: 'source_reference',
                                                                    label: t('Source Reference'),
                                                                    render: (value: string) => value || '-',
                                                                },
                                                                {
                                                                    key: 'created_at',
                                                                    label: t('Created'),
                                                                    type: 'date',
                                                                },
                                                            ]}
                                                            actions={[{ label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500' }]}
                                                            data={selectedProject.notes || []}
                                                            from={1}
                                                            onAction={(action, note) => {
                                                                if (action === 'view') {
                                                                    setSelectedNote(note);
                                                                    setIsNoteViewModalOpen(true);
                                                                }
                                                            }}
                                                            permissions={permissions}
                                                            entityPermissions={{
                                                                view: 'view-research-notes',
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {projectSubTab === 'citations' && (
                                                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                                                        <CrudTable
                                                            columns={[
                                                                {
                                                                    key: 'citation_text',
                                                                    label: t('Citation'),
                                                                    render: (value: string) => <span className="">{value}</span>,
                                                                },
                                                                {
                                                                    key: 'citation_type',
                                                                    label: t('Type'),
                                                                    render: (value: string) => (
                                                                        <span
                                                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'case'
                                                                                ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                                                                                : value === 'statute'
                                                                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                                                    : value === 'article'
                                                                                        ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20'
                                                                                        : value === 'book'
                                                                                            ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20'
                                                                                            : value === 'website'
                                                                                                ? 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20'
                                                                                                : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                                                                                }`}
                                                                        >
                                                                            {t(value?.charAt(0).toUpperCase() + value?.slice(1))}
                                                                        </span>
                                                                    ),
                                                                },
                                                                { key: 'source', label: t('Source'), render: (value: any) => value?.source_name || '-' },
                                                                {
                                                                    key: 'created_at',
                                                                    label: t('Created'),
                                                                    type: 'date',
                                                                },
                                                            ]}
                                                            actions={[{ label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500' }]}
                                                            data={selectedProject.citations || []}
                                                            from={1}
                                                            onAction={(action, citation) => {
                                                                if (action === 'view') {
                                                                    setSelectedCitation(citation);
                                                                    setIsCitationModalOpen(true);
                                                                }
                                                            }}
                                                            permissions={permissions}
                                                            entityPermissions={{
                                                                view: 'view-research-citations',
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline Form Modal */}
                {activeTab === 'timelines' && (
                    <CrudFormModal
                        isOpen={isFormModalOpen}
                        onClose={() =>
                            {
                                setIsFormModalOpen(false);
                                setIsTimelineViewModalOpen(true);
                            }
                        }
                        onSubmit={handleTimelineSubmit}
                        formConfig={{
                            fields: [
                                { name: 'title', label: t('Event Title'), type: 'text', required: true, placeholder: 'eg. Client Meeting' },
                                { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Review case documents with client' },
                                {
                                    name: 'event_type_id',
                                    label: t('Event Type'),
                                    type: 'select',
                                    required: true,
                                    options: eventTypes ? eventTypes.map((type: any) => ({
                                        value: type.id,
                                        label: type.name
                                    })) : [],
                                    searchable: true,
                                    defaultValue: eventTypes && eventTypes.length > 0 ? eventTypes[0].name : '',
                                    emptyNote: { link: route('advocate.event-types.index'), linkText: t('Event Types') }
                                },
                                { name: 'event_date', label: t('Event Date'), type: 'date', required: true },
                                { name: 'is_completed', label: t('Completed'), type: 'checkbox' },
                                {
                                    name: 'status',
                                    label: t('Status'),
                                    type: 'select',
                                    options: [
                                        { value: 'active', label: t('Active') },
                                        { value: 'inactive', label: t('Inactive') },
                                    ],
                                    defaultValue: 'active',
                                },
                            ].concat(googleCalendarEnabled && formMode === 'create' ? [{
                                name: 'sync_with_google_calendar',
                                label: t('Synchronize in Google Calendar'),
                                type: 'switch',
                                defaultValue: false
                            }] : []),
                            modalSize: 'lg',
                        }}
                        initialData={currentItem}
                        title={
                            formMode === 'create' ? t('Add New Timeline Event') : formMode === 'edit' ? t('Edit Timeline Event') : t('View Timeline Event')
                        }
                        mode={formMode}
                    />
                )}

                {/* Team Form Modal */}
                {activeTab === 'team' && (
                    <CrudFormModal
                        isOpen={isFormModalOpen}
                        onClose={() => setIsFormModalOpen(false)}
                        onSubmit={handleTeamSubmit}
                        formConfig={{
                            fields: [
                                {
                                    name: 'user_id',
                                    label: t('User'),
                                    type: 'select',
                                    searchable: true,
                                    required: true,
                                    options: users?.map((user: any) => ({
                                        value: user.id.toString(),
                                        label: `${user.name} (${user.email})`,
                                    })) || [],
                                    emptyNote: { link: route('users.index'), linkText: t('Users') }
                                },

                                {
                                    name: 'assigned_date',
                                    label: t('Assigned Date'),
                                    type: 'date',
                                    required: true,
                                    defaultValue: new Date().toISOString().split('T')[0],
                                },
                                {
                                    name: 'status',
                                    label: t('Status'),
                                    type: 'select',
                                    options: [
                                        { value: 'active', label: t('Active') },
                                        { value: 'inactive', label: t('Inactive') },
                                    ],
                                    defaultValue: 'active',
                                },
                            ].concat(googleCalendarEnabled && formMode === 'create' ? [{
                                name: 'sync_with_google_calendar',
                                label: t('Synchronize in Google Calendar'),
                                type: 'switch',
                                defaultValue: false
                            }] : []),
                            modalSize: 'lg',
                        }}
                        initialData={currentItem}
                        title={formMode === 'create' ? t('Add New Team Member') : t('Edit Team Member')}
                        mode={formMode}
                    />
                )}

                {/* View Team Member Modal */}
                {activeTab === 'team' && (
                    <Dialog open={isViewTeamModalOpen} onOpenChange={setIsViewTeamModalOpen}>
                        {currentItem && <TeamMemberView record={currentItem} />}
                    </Dialog>
                )}

                {/* Document Form Modal */}
                {activeTab === 'documents' && (
                    <CrudFormModal
                        isOpen={isFormModalOpen}
                        onClose={() => setIsFormModalOpen(false)}
                        onSubmit={handleDocumentSubmit}
                        formConfig={{
                            fields: [
                                { name: 'document_name', label: t('Document Name'), type: 'text', required: true, placeholder: 'eg. Evidence Report' },
                                { name: 'file', label: t('File'), type: 'media-picker', required: true },
                                {
                                    name: 'document_type_id',
                                    label: t('Document Type'),
                                    type: 'select',
                                    searchable: true,
                                    required: true,
                                    options: documentTypes
                                        ? documentTypes.map((type: any) => ({
                                            value: type.id.toString(),
                                            label: type.name,
                                        }))
                                        : [],
                                    emptyNote: { link: route('advocate.document-types.index'), linkText: t('Document Types') }
                                },
                                {
                                    name: 'confidentiality',
                                    label: t('Confidentiality Level'),
                                    type: 'select',
                                    required: true,
                                    options: [
                                        { value: 'public', label: t('Public') },
                                        { value: 'confidential', label: t('Confidential') },
                                        { value: 'privileged', label: t('Privileged') },
                                    ],
                                },
                                { name: 'document_date', label: t('Document Date'), type: 'date' },
                                { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Supporting evidence for case' },
                                {
                                    name: 'status',
                                    label: t('Status'),
                                    type: 'select',
                                    options: [
                                        { value: 'active', label: t('Active') },
                                        { value: 'archived', label: t('Archived') },
                                    ],
                                    defaultValue: 'active',
                                },
                            ],
                            modalSize: 'xl',
                        }}
                        initialData={{
                            ...currentItem,
                            document_type_id: currentItem?.document_type_id,
                            file: currentItem?.file_path
                        }}
                        title={formMode === 'create' ? t('Add New Document') : t('Edit Document')}
                        mode={formMode}
                    />
                )}

                {/* View Document Modal */}
                {activeTab === 'documents' && (
                    <Dialog open={isDocumentViewModalOpen} onOpenChange={setIsDocumentViewModalOpen}>
                        {currentItem && <DocumentView record={currentItem} documentTypes={documentTypes} />}
                    </Dialog>
                )}

                {/* Note Form Modal */}
                {activeTab === 'notes' && (
                    <CrudFormModal
                        isOpen={isFormModalOpen}
                        onClose={() => setIsFormModalOpen(false)}
                        onSubmit={handleNoteSubmit}
                        formConfig={{
                            fields: [
                                { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. Key Witness Statement' },
                                { name: 'content', label: t('Content'), type: 'textarea', required: true, placeholder: 'eg. Detailed notes about the case...' },
                                {
                                    name: 'note_type',
                                    label: t('Note Type'),
                                    type: 'select',
                                    required: true,
                                    options: [
                                        { value: 'general', label: t('General') },
                                        { value: 'meeting', label: t('Meeting') },
                                        { value: 'research', label: t('Research') },
                                        { value: 'strategy', label: t('Strategy') },
                                    ],
                                },
                                {
                                    name: 'priority',
                                    label: t('Priority'),
                                    type: 'select',
                                    options: [
                                        { value: 'low', label: t('Low') },
                                        { value: 'medium', label: t('Medium') },
                                        { value: 'high', label: t('High') },
                                        { value: 'urgent', label: t('Urgent') },
                                    ],
                                    defaultValue: 'medium',
                                },
                                { name: 'tags', label: t('Tags (comma separated)'), type: 'text', placeholder: 'eg. evidence, witness, contract' },
                            ],
                            modalSize: 'lg',
                        }}
                        initialData={currentItem}
                        title={formMode === 'create' ? t('Add New Note') : t('Edit Note')}
                        mode={formMode}
                    />
                )}

                {/* Task Form Modal */}
                {activeTab === 'tasks' && (
                    <CrudFormModal
                        isOpen={isFormModalOpen}
                        onClose={() => setIsFormModalOpen(false)}
                        onSubmit={handleTaskSubmit}
                        formConfig={{
                            fields: [
                                { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: 'eg. File Motion' },
                                { name: 'description', label: t('Description'), type: 'textarea', placeholder: 'eg. Prepare and file motion with the court' },
                                {
                                    name: 'priority',
                                    label: t('Priority'),
                                    type: 'select',
                                    required: true,
                                    options: [
                                        { value: 'critical', label: t('Critical') },
                                        { value: 'high', label: t('High') },
                                        { value: 'medium', label: t('Medium') },
                                        { value: 'low', label: t('Low') },
                                    ],
                                    defaultValue: 'medium',
                                },
                                { name: 'due_date', label: t('Due Date'), type: 'date' },
                                { name: 'estimated_duration', label: t('Estimated Duration (hours)'), type: 'number', placeholder: 'eg. 2' },
                                {
                                    name: 'assigned_to',
                                    label: t('Assigned To'),
                                    type: 'select',
                                    searchable: true,
                                    required: true,
                                    options: [
                                        ...(users?.map((user: any) => ({
                                            value: user.id.toString(),
                                            label: user.name,
                                        })) || []),
                                    ],
                                    emptyNote: { link: route('users.index'), linkText: t('Users') }
                                },
                                {
                                    name: 'task_type_id',
                                    label: t('Task Type'),
                                    type: 'select',
                                    searchable: true,
                                    required: true,
                                    options: [
                                        ...(taskTypes?.map((type: any) => ({
                                            value: type.id.toString(),
                                            label: type.name,
                                        })) || []),
                                    ],
                                    emptyNote: { link: route('tasks.task-types.index'), linkText: t('Task Types') }
                                },
                                {
                                    name: 'task_status_id',
                                    label: t('Task Status'),
                                    required: true,
                                    type: 'select',
                                    searchable: true,
                                    options: [
                                        ...(taskStatuses?.map((status: any) => ({
                                            value: status.id.toString(),
                                            label: status.name,
                                        })) || []),
                                    ],
                                    emptyNote: { link: route('tasks.task-statuses.index'), linkText: t('Task Status') }
                                },
                                { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: 'eg. Additional context or instructions' },
                            ].concat(googleCalendarEnabled ? [{
                                name: 'sync_with_google_calendar',
                                label: t('Synchronize in Google Calendar'),
                                type: 'switch',
                                defaultValue: false
                            }] : []),
                            modalSize: 'lg',
                        }}
                        initialData={currentItem}
                        title={formMode === 'create' ? t('Add New Task') : formMode === 'edit' ? t('Edit Task') : t('View Task')}
                        mode={formMode}
                    />
                )}

                {/* Timeline View Modal */}
                {activeTab === 'timelines' && (
                    <Dialog open={isTimelineViewModalOpen} onOpenChange={setIsTimelineViewModalOpen}>
                        {currentItem && (
                            <TimelineView
                                record={currentItem}
                                permissions={permissions}
                                onEdit={() => { setIsTimelineViewModalOpen(false); setFormMode('edit'); setIsFormModalOpen(true); }}
                                onToggleStatus={() => { setIsTimelineViewModalOpen(false); handleTimelineToggleStatus(currentItem); }}
                                onDelete={() => { setIsTimelineViewModalOpen(false); setIsDeleteModalOpen(true); }}
                            />
                        )}
                    </Dialog>
                )}

                {/* Task View Modal */}
                {activeTab === 'tasks' && (
                    <Dialog open={isTaskViewModalOpen} onOpenChange={setIsTaskViewModalOpen}>
                        {currentItem && <TaskView record={currentItem} users={users} />}
                    </Dialog>
                )}

                {/* Task Status Change Modal */}
                {activeTab === 'tasks' && (
                    <CrudFormModal
                        isOpen={isStatusModalOpen}
                        onClose={() => setIsStatusModalOpen(false)}
                        onSubmit={handleTaskStatusChange}
                        formConfig={{
                            fields: [
                                {
                                    name: 'task_status_id',
                                    label: t('Task Status'),
                                    required: true,
                                    type: 'select',
                                    searchable: true,
                                    options: [
                                        ...(taskStatuses?.map((status: any) => ({
                                            value: status.id.toString(),
                                            label: status.name,
                                        })) || []),
                                    ],
                                    emptyNote: { link: route('tasks.task-statuses.index'), linkText: t('Task Status') }
                                }
                            ],
                            modalSize: 'sm',
                        }}
                        initialData={currentItem ? { task_status_id: currentItem.task_status_id } : null}
                        title={t('Change Task Status')}
                        mode="edit"
                    />
                )}

                <CrudDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setIsTimelineViewModalOpen(true);
                    }}
                    onConfirm={handleDeleteConfirm}
                    itemName={currentItem?.title || currentItem?.user?.name || currentItem?.document_name || ''}
                    entityName={
                        activeTab === 'timelines'
                            ? 'timeline event'
                            : activeTab === 'team'
                                ? 'team member'
                                : activeTab === 'tasks'
                                    ? 'task'
                                    : 'document'
                    }
                />

                {/* Citation Details Modal */}
                <Dialog open={isCitationModalOpen} onOpenChange={setIsCitationModalOpen}>
                    {selectedCitation && <CitationView record={selectedCitation} />}
                </Dialog>

                {/* Research Note Details Modal */}
                <Dialog open={isNoteViewModalOpen} onOpenChange={setIsNoteViewModalOpen}>
                    {selectedNote && <ResearchNoteView record={selectedNote} />}
                </Dialog>

                {/* Case Note View Modal */}
                <Dialog open={isCaseNoteViewModalOpen} onOpenChange={setIsCaseNoteViewModalOpen}>
                    {currentItem && <NoteView record={currentItem} />}
                </Dialog>

                {/* Google Calendar Modal */}
                <GoogleCalendarModal
                    isOpen={isGoogleCalendarModalOpen}
                    onClose={() => setIsGoogleCalendarModalOpen(false)}
                    caseId={caseData.id}
                    initialDate={caseData.filing_date}
                />
            </div>
        </PageTemplate>
    );
}
