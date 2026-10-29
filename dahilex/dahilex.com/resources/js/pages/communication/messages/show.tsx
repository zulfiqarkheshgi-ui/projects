import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Send, Trash2, User, Users, MessageSquare, Mail, Phone, Briefcase, Scale, Calendar, Check, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import AppLayout from '@/layouts/app-layout';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { formatStatusText, getImagePath } from '@/utils/helpers';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageTemplate } from '@/components/page-template';

interface User {
    id: number;
    name: string;
    email: string;
    type?: string;
    avatar?: string;
}

interface Message {
    id: number;
    content: string;
    sender: User;
    created_at: string;
    is_read: boolean;
}

interface Conversation {
    id: number;
    title: string | null;
    type: 'direct' | 'group' | 'case';
    participants: number[];
    case_id: number | null;
    case?: { id: number; title: string };
    receiver?: User;
}

interface Props {
    conversation: Conversation;
    messages: {
        data: Message[];
        links: any[];
        meta: any;
    };
}

export default function MessagesShow({ conversation, messages }: Props) {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const [messagesList, setMessagesList] = useState(messages.data);
    const [newMessage, setNewMessage] = useState('');
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
    const [userDetails, setUserDetails] = useState<any>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const handleUserClick = (userId: number) => {
        fetch(route('communication.messages.getUserDetails', userId))
            .then(r => r.json())
            .then(data => { setUserDetails(data.user); setIsUserDetailsOpen(true); })
            .catch(() => toast.error(t('Failed to load user details')));
    };

    useEffect(() => {
        setMessagesList(messages.data);
    }, [messages.data]);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messagesList]);

    const getConversationTitle = () => {
        if (conversation.receiver) return conversation.receiver.name;
        if (conversation.type === 'case' && conversation.case) return conversation.case.title;
        if (conversation.title) return conversation.title;
        return 'Unknown';
    };

    const getUserTypeIcon = (userType?: string) => {
        switch (userType) {
            case 'company': return <User className="h-3 w-3" />;
            case 'team_member': return <Users className="h-3 w-3" />;
            default: return <User className="h-3 w-3" />;
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        const tempMessage: Message = {
            id: Date.now(),
            content: newMessage,
            sender: auth.user,
            created_at: window.appSettings?.formatDateTime(new Date(), false) || new Date().toISOString(),
            is_read: false,
        };

        setMessagesList((prev) => [...prev, tempMessage]);
        const messageContent = newMessage;
        setNewMessage('');

        router.post(route('communication.messages.store'), { conversation_id: conversation.id, content: messageContent }, {
            onSuccess: () => router.reload({ only: ['messages'] }),
            onError: (errors) => {
                toast.error(`Failed to send message: ${Object.values(errors).join(', ')}`);
                setMessagesList((prev) => prev.filter((m) => m.id !== tempMessage.id));
                setNewMessage(messageContent);
            },
        });
    };

    const confirmDelete = () => {
        router.delete(route('communication.messages.destroy', conversation.id), {
            onSuccess: () => {
                toast.success(t('Conversation deleted successfully'));
                router.visit(route('communication.messages.index'));
            },
            onError: () => toast.error(t('Failed to delete conversation')),
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Communication'), href: route('communication.messages.index') },
        { title: getConversationTitle() },
    ];

    return (
        <PageTemplate title={t('Messages')}
        description={t('View and reply to messages and conversations.')}
        breadcrumbs={breadcrumbs}
              actions={[
                {
                  label: t('Back'),
                  icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                  variant: 'outline',
                  onClick: () => router.get(route('communication.messages.index'))
                }
              ]}
              noPadding>
            <div className="flex h-[calc(100vh-150px)] flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 rounded-xl border">
                {/* Chat Header */}
                <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={getImagePath(conversation?.receiver?.avatar) || getImagePath('/storage/media/avatars/avatar.png')}
                                alt={conversation.receiver?.name || '-'}
                                className="h-8 w-8 rounded-full object-cover shadow-sm"
                                onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }}
                            />
                            <div className="flex items-center gap-2">
                                <h2
                                    className="text-lg font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                    onClick={() => conversation.receiver && handleUserClick(conversation.receiver.id)}
                                >
                                    {getConversationTitle()}
                                </h2>
                                {conversation.receiver?.type && (
                                    <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                                        {getUserTypeIcon(conversation.receiver.type)}
                                        <span>{formatStatusText(conversation.receiver.type)}</span>
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {hasPermission(permissions, 'delete-messages') && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" onClick={() => setIsDeleteAlertOpen(true)} className="h-8 w-8 text-gray-500">
                                            <Trash2 size={16} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                        <p>{t('Delete Communication')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900" style={{ scrollBehavior: 'smooth' }}>
                    {messagesList.length > 0 && hasPermission(permissions, 'view-messages') ? (
                        messagesList.map((message) => {
                            const isCurrentUser = message.sender.id === auth.user.id;
                            return (
                                <div key={message.id} className={`flex items-start space-x-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                    {!isCurrentUser && (
                                        <img
                                            src={getImagePath(message.sender?.avatar) || getImagePath('/storage/media/avatars/avatar.png')}
                                            alt={message.sender?.name}
                                            className="h-8 w-8 rounded-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }}
                                        />
                                    )}
                                    <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                                        <div className={`rounded-lg p-3 shadow-sm ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white'}`}>
                                            <p className="text-sm">{message.content}</p>
                                            <div className={`mt-1 flex items-center gap-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                                <p className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                                                    {window.appSettings?.formatTime(message.created_at) || format(new Date(message.created_at), 'HH:mm')}
                                                </p>
                                                {isCurrentUser && (
                                                    message.is_read
                                                        ? <CheckCheck className="h-3 w-3 text-blue-100" />
                                                        : <Check className="h-3 w-3 text-blue-200" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isCurrentUser && (
                                        <img
                                            src={getImagePath(auth.user?.avatar) || getImagePath('/storage/media/avatars/avatar.png')}
                                            alt={message.sender?.name}
                                            className="order-2 h-8 w-8 rounded-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }}
                                        />
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                            <div className="text-center">
                                <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>{t('No messages yet')}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center space-x-2">
                        <Input
                            placeholder={t('Type a message...')}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && hasPermission(permissions, 'send-messages') && handleSendMessage()}
                            className="flex-1"
                            hidden={!hasPermission(permissions, 'send-messages')}
                        />
                        <Button onClick={handleSendMessage} hidden={!hasPermission(permissions, 'send-messages')} disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* User Details Dialog */}
            <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {t('User Details')}
                        </DialogTitle>
                    </DialogHeader>
                    {userDetails && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <img
                                    src={getImagePath(userDetails?.avatar) || getImagePath('/storage/media/avatars/avatar.png')}
                                    alt={userDetails.name}
                                    className="h-16 w-16 rounded-full object-cover shadow-sm"
                                    onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('/storage/media/avatars/avatar.png'); }}
                                />
                                <div>
                                    <h3 className="text-xl font-semibold">{userDetails.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Mail className="h-4 w-4" />
                                        {userDetails.email}
                                    </div>
                                    <Badge variant="outline" className="mt-1">{formatStatusText(userDetails.type)}</Badge>
                                </div>
                            </div>
                            {userDetails.client && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {t('Client Information')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">{t('Client ID')}:</span>
                                            <p>{userDetails.client.client_id}</p>
                                        </div>
                                        {userDetails.client.phone && (
                                            <div>
                                                <span className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{t('Phone')}:</span>
                                                <p>{userDetails.client.phone}</p>
                                            </div>
                                        )}
                                        {userDetails.client.company_name && (
                                            <div>
                                                <span className="font-medium flex items-center gap-1"><Briefcase className="h-3 w-3" />{t('Company')}:</span>
                                                <p>{userDetails.client.company_name}</p>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <span className="font-medium">{t('Status')}:</span>
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                                userDetails.client.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                            }`}>{formatStatusText(userDetails.client.status)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {userDetails.cases && userDetails.cases.length > 0 && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3 flex items-center gap-2">
                                        <Scale className="h-4 w-4" />
                                        {t('Cases')} ({userDetails.cases.length})
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {userDetails.cases.map((case_: any) => (
                                            <div key={case_.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                <div>
                                                    <p className="font-medium text-sm">{case_.title}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">ID: {case_.case_id}</p>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {formatStatusText(case_.case_status?.name || case_.status)}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="border-t pt-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {t('Member since')}: {window.appSettings?.formatDate(userDetails.created_at) || format(new Date(userDetails.created_at), 'MMM dd, yyyy')}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <CrudDeleteModal
                isOpen={isDeleteAlertOpen}
                onClose={() => setIsDeleteAlertOpen(false)}
                onConfirm={confirmDelete}
                itemName={conversation.receiver?.name ? 'conversation with ' + conversation.receiver.name : 'conversation'}
                entityName={t('communication')}
            />
        </PageTemplate>
    );
}
