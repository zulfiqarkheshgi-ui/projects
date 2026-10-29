import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Clock, FileText, Lock, Tag, CheckSquare, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ViewProps {
    record: any;
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleStatus?: () => void;
    permissions?: string[];
}

export default function TimelineView({ record, onEdit, onDelete, onToggleStatus, permissions = [] }: ViewProps) {
    const { t } = useTranslation();
    const canEdit = permissions.includes('edit-case-timelines');
    const canDelete = permissions.includes('delete-case-timelines');
    const canToggle = permissions.includes('toggle-status-case-timelines');

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Timeline Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Title & Event Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Event Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Event Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record?.event_type?.name || '-'}</p>
                    </div>
                </div>

                {/* Event Date & Completed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Event Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record?.event_date ? (window.appSettings?.formatDate(record.event_date) || new Date(record.event_date).toLocaleDateString()) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {t('Completed')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${record?.is_completed
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                    : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                }`}>
                                {record?.is_completed ? t('Yes') : t('No')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {t('Status')}
                    </label>
                    <div className="mt-1">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${record?.status === 'active'
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-red-50 text-red-700 ring-red-600/20'
                            }`}>
                            {record?.status === 'active' ? t('Active') : t('Inactive')}
                        </span>
                    </div>
                </div>

                {/* Description */}
                {record?.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.description}</p>
                    </div>
                )}

            </div>
            {(canEdit || canToggle || canDelete) && (
                <div className="flex px-6 py-4 space-y-4 justify-end gap-1 pt-2 border-t">
                    {canEdit && onEdit && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn('h-8 w-8 text-gray-500')} onClick={onEdit}>
                                        <Edit size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {canToggle && onToggleStatus && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn('h-8 w-8 text-gray-500')} onClick={onToggleStatus}>
                                        <Lock size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{record?.status === 'active' ? t('Deactivate') : t('Activate')}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {canDelete && onDelete && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn('h-8 w-8 text-gray-500')} onClick={onDelete}>
                                        <Trash2 size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )}
        </DialogContent>
    );
}
