
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, DiscussionTopic, DiscussionMessage, UserRole, AppNotification } from '../types';
import { ChatBubbleLeftRightIcon, SendIcon, UserAddIcon, TrashIcon, CheckCircleIcon, SearchIcon, CloseIcon, FilterIcon, ReplyIcon } from './icons/IconComponents';

interface InternalChatProps {
    currentUser: User;
    users: User[];
    topics: DiscussionTopic[];
    onTopicsChange: (topics: DiscussionTopic[]) => void;
    messages: DiscussionMessage[];
    onMessagesChange: (messages: DiscussionMessage[]) => void;
    onAddNotifications: (notifications: AppNotification[]) => void;
}

const InternalChat: React.FC<InternalChatProps> = ({ currentUser, users, topics, onTopicsChange, messages, onMessagesChange, onAddNotifications }) => {
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [replyingTo, setReplyingTo] = useState<DiscussionMessage | null>(null);
    
    // Modal specific states
    const [participantSearchTerm, setParticipantSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('All');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Permission checks
    const canCreateTopic = currentUser.role !== UserRole.ENCARREGADO;

    // Filter topics visible to the current user
    const visibleTopics = useMemo(() => {
        let filtered = topics;
        if (currentUser.role !== UserRole.ADMIN) {
            filtered = topics.filter(t => t.participantIds.includes(currentUser.id) || t.createdBy === currentUser.id);
        }
        
        if (searchTerm) {
            filtered = filtered.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // Sort by last message date or creation date
        return filtered.sort((a, b) => {
            const lastMsgA = messages.filter(m => m.topicId === a.id).sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())[0];
            const lastMsgB = messages.filter(m => m.topicId === b.id).sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())[0];
            
            const dateA = lastMsgA ? new Date(lastMsgA.timestamp).getTime() : new Date(a.createdAt).getTime();
            const dateB = lastMsgB ? new Date(lastMsgB.timestamp).getTime() : new Date(b.createdAt).getTime();
            
            return dateB - dateA;
        });
    }, [topics, messages, currentUser, searchTerm]);

    const activeTopic = useMemo(() => topics.find(t => t.id === selectedTopicId), [topics, selectedTopicId]);

    const activeMessages = useMemo(() => {
        if (!selectedTopicId) return [];
        return messages.filter(m => m.topicId === selectedTopicId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedTopicId]);

    // Group messages by date
    const groupedMessages = useMemo(() => {
        const groups: Record<string, DiscussionMessage[]> = {};
        activeMessages.forEach(msg => {
            const date = new Date(msg.timestamp).toLocaleDateString('pt-BR');
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    }, [activeMessages]);

    // Filtered users for the modal
    const filteredModalUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.name.toLowerCase().includes(participantSearchTerm.toLowerCase()) || 
                                  u.email.toLowerCase().includes(participantSearchTerm.toLowerCase());
            const matchesRole = roleFilter === 'All' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [users, participantSearchTerm, roleFilter]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeMessages, replyingTo]);

    // Clear reply state when changing topics
    useEffect(() => {
        setReplyingTo(null);
    }, [selectedTopicId]);

    const handleCreateTopic = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim() || !canCreateTopic) return;

        const newTopic: DiscussionTopic = {
            id: `topic_${Date.now()}`,
            title: newTopicTitle,
            createdBy: currentUser.id,
            createdAt: new Date().toISOString(),
            participantIds: [currentUser.id], // Creator is always a participant
            status: 'Open'
        };

        onTopicsChange([newTopic, ...topics]);
        
        // Notifications Logic
        const notifications: AppNotification[] = [];
        
        // 1. Notify Admins (Security Requirement)
        const admins = users.filter(u => u.role === UserRole.ADMIN);
        admins.forEach(admin => {
            if (admin.id !== currentUser.id) {
                notifications.push({
                    id: `notif_admin_${Date.now()}_${admin.id}`,
                    userId: admin.id,
                    type: 'admin_alert',
                    title: 'Novo Grupo Criado',
                    message: `${currentUser.name} criou o grupo "${newTopic.title}"`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    relatedId: newTopic.id
                });
            }
        });

        if (notifications.length > 0) {
            onAddNotifications(notifications);
        }

        setNewTopicTitle('');
        setIsCreateModalOpen(false);
        setSelectedTopicId(newTopic.id);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTopicId || !activeTopic) return;

        const msg: DiscussionMessage = {
            id: `msg_${Date.now()}`,
            topicId: selectedTopicId,
            userId: currentUser.id,
            content: newMessage,
            timestamp: new Date().toISOString(),
            replyToId: replyingTo?.id
        };

        onMessagesChange([...messages, msg]);
        
        // Notification Logic for Message
        const notifications: AppNotification[] = [];
        activeTopic.participantIds.forEach(pId => {
            if (pId !== currentUser.id) {
                notifications.push({
                    id: `notif_msg_${Date.now()}_${pId}`,
                    userId: pId,
                    type: 'message',
                    title: activeTopic.title,
                    message: `${currentUser.name}: ${newMessage.substring(0, 30)}${newMessage.length > 30 ? '...' : ''}`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    relatedId: activeTopic.id
                });
            }
        });

        if (notifications.length > 0) {
            onAddNotifications(notifications);
        }

        setNewMessage('');
        setReplyingTo(null);
    };

    const handleToggleParticipant = (userId: string) => {
        if (!activeTopic) return;
        
        let newParticipants = [...activeTopic.participantIds];
        const isAdding = !newParticipants.includes(userId);

        if (newParticipants.includes(userId)) {
            newParticipants = newParticipants.filter(id => id !== userId);
        } else {
            newParticipants.push(userId);
        }

        const updatedTopics = topics.map(t => 
            t.id === activeTopic.id ? { ...t, participantIds: newParticipants } : t
        );
        onTopicsChange(updatedTopics);

        // Notify added user
        if (isAdding) {
            onAddNotifications([{
                id: `notif_invite_${Date.now()}_${userId}`,
                userId: userId,
                type: 'topic_invite',
                title: 'Convite para Reunião',
                message: `Você foi adicionado ao grupo "${activeTopic.title}"`,
                read: false,
                timestamp: new Date().toISOString(),
                relatedId: activeTopic.id
            }]);
        }
    };

    const handleBulkAction = (action: 'add' | 'remove') => {
        if (!activeTopic) return;
        
        const userIdsInFilter = filteredModalUsers.map(u => u.id);
        let newParticipants = [...activeTopic.participantIds];
        const addedUserIds: string[] = [];

        if (action === 'add') {
            userIdsInFilter.forEach(id => {
                if (!newParticipants.includes(id)) {
                    newParticipants.push(id);
                    addedUserIds.push(id);
                }
            });
        } else {
            newParticipants = newParticipants.filter(id => !userIdsInFilter.includes(id));
        }

        const updatedTopics = topics.map(t => 
            t.id === activeTopic.id ? { ...t, participantIds: newParticipants } : t
        );
        onTopicsChange(updatedTopics);

        // Notify Added Users
        if (addedUserIds.length > 0) {
            const notifications: AppNotification[] = addedUserIds.map(userId => ({
                id: `notif_invite_${Date.now()}_${userId}`,
                userId: userId,
                type: 'topic_invite',
                title: 'Convite para Reunião',
                message: `Você foi adicionado ao grupo "${activeTopic.title}"`,
                read: false,
                timestamp: new Date().toISOString(),
                relatedId: activeTopic.id
            }));
            onAddNotifications(notifications);
        }
    };

    const handleDeleteTopic = (e: React.MouseEvent, topicId: string) => {
        e.stopPropagation();
        if (window.confirm("Tem certeza que deseja apagar este tema e todas as mensagens?")) {
            onTopicsChange(topics.filter(t => t.id !== topicId));
            onMessagesChange(messages.filter(m => m.topicId !== topicId));
            if (selectedTopicId === topicId) setSelectedTopicId(null);
        }
    };

    const canManageParticipants = activeTopic && (currentUser.role === UserRole.ADMIN || activeTopic.createdBy === currentUser.id);

    // Check if all displayed users are selected
    const areAllFilteredSelected = activeTopic && filteredModalUsers.length > 0 && filteredModalUsers.every(u => activeTopic.participantIds.includes(u.id));

    const getMessageAuthorName = (userId: string) => {
        const u = users.find(user => user.id === userId);
        return u ? u.name : 'Usuário desconhecido';
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            {/* Left Sidebar - Topic List */}
            <div className={`w-full md:w-80 bg-gray-50 flex flex-col border-r border-gray-200 ${selectedTopicId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <ChatBubbleLeftRightIcon className="w-6 h-6 mr-2 text-indigo-600"/>
                            Reuniões
                        </h2>
                        {canCreateTopic && (
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 shadow-sm"
                                title="Novo Tema"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Buscar tema..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {visibleTopics.length > 0 ? (
                        <ul>
                            {visibleTopics.map(topic => {
                                const lastMsg = messages.filter(m => m.topicId === topic.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                                const isActive = selectedTopicId === topic.id;
                                
                                return (
                                    <li 
                                        key={topic.id} 
                                        onClick={() => setSelectedTopicId(topic.id)}
                                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-bold text-sm line-clamp-1 ${isActive ? 'text-indigo-900' : 'text-gray-800'}`}>
                                                {topic.title}
                                            </h4>
                                            {lastMsg && (
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                    {new Date(lastMsg.timestamp).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-1">
                                            {lastMsg ? (
                                                <>
                                                    <span className="font-semibold text-gray-600 mr-1">
                                                        {getMessageAuthorName(lastMsg.userId).split(' ')[0]}:
                                                    </span>
                                                    {lastMsg.content}
                                                </>
                                            ) : 'Sem mensagens.'}
                                        </p>
                                        {currentUser.role === UserRole.ADMIN && (
                                            <button 
                                                onClick={(e) => handleDeleteTopic(e, topic.id)}
                                                className="text-gray-300 hover:text-red-500 mt-2 text-xs"
                                                title="Apagar Tema"
                                            >
                                                Apagar
                                            </button>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <p>Nenhum tema encontrado.</p>
                            {canCreateTopic && (
                                <button onClick={() => setIsCreateModalOpen(true)} className="text-indigo-600 font-semibold mt-2 hover:underline">
                                    Criar um agora
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Chat Area */}
            <div className={`flex-1 flex-col ${selectedTopicId ? 'flex' : 'hidden md:flex'} bg-[#f0f2f5]`}>
                {activeTopic ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center">
                                <button onClick={() => setSelectedTopicId(null)} className="md:hidden mr-3 text-gray-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{activeTopic.title}</h3>
                                    <p className="text-xs text-gray-500">
                                        {activeTopic.participantIds.length} participantes • Criado por {getMessageAuthorName(activeTopic.createdBy)}
                                    </p>
                                </div>
                            </div>
                            {canManageParticipants && (
                                <button 
                                    onClick={() => {
                                        setRoleFilter('All');
                                        setParticipantSearchTerm('');
                                        setIsParticipantsModalOpen(true);
                                    }}
                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                                    title="Gerir Participantes"
                                >
                                    <UserAddIcon className="w-6 h-6" />
                                </button>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-cover bg-center" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'soft-light', backgroundColor: '#e5ddd5'}}>
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <div key={date}>
                                    <div className="flex justify-center mb-4">
                                        <span className="bg-white/80 text-gray-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                                            {date === new Date().toLocaleDateString('pt-BR') ? 'Hoje' : date}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {(msgs as DiscussionMessage[]).map(msg => {
                                            const isMe = msg.userId === currentUser.id;
                                            const sender = users.find(u => u.id === msg.userId);
                                            
                                            // Handle Reply Rendering
                                            const originalMessage = msg.replyToId 
                                                ? activeMessages.find(m => m.id === msg.replyToId) 
                                                : null;

                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                                    {!isMe && (
                                                        <img src={sender?.avatarUrl} alt="" className="w-8 h-8 rounded-full mr-2 self-end mb-1 shadow-sm" />
                                                    )}
                                                    <div className={`max-w-[75%] md:max-w-[60%] rounded-lg px-4 py-2 shadow-sm relative transition-all ${isMe ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                                                        {/* Reply Trigger Button */}
                                                        <button 
                                                            onClick={() => setReplyingTo(msg)}
                                                            className={`absolute top-2 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 p-1.5 bg-gray-200/80 rounded-full hover:bg-gray-300 text-gray-600 transition-opacity z-10`}
                                                            title="Responder"
                                                        >
                                                            <ReplyIcon className="w-4 h-4" />
                                                        </button>

                                                        {/* Render Quoted Message if exists */}
                                                        {originalMessage && (
                                                            <div className="mb-2 p-2 bg-black/5 rounded border-l-4 border-indigo-400 text-xs text-gray-600">
                                                                <p className="font-bold text-indigo-600 mb-0.5">
                                                                    {getMessageAuthorName(originalMessage.userId)}
                                                                </p>
                                                                <p className="line-clamp-2 italic">{originalMessage.content}</p>
                                                            </div>
                                                        )}

                                                        {!isMe && <p className="text-[10px] font-bold text-orange-600 mb-0.5">{sender?.name}</p>}
                                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                        <span className="text-[10px] text-gray-500 float-right ml-2 mt-1">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Preview Banner */}
                        {replyingTo && (
                            <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex justify-between items-center animate-slide-up">
                                <div className="border-l-4 border-indigo-500 pl-3 py-1 flex-1">
                                    <p className="text-xs text-indigo-600 font-bold mb-0.5">
                                        Respondendo a {getMessageAuthorName(replyingTo.userId)}
                                    </p>
                                    <p className="text-xs text-gray-600 line-clamp-1">
                                        {replyingTo.content}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setReplyingTo(null)}
                                    className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
                                >
                                    <CloseIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-3 bg-white border-t border-gray-200">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder={replyingTo ? "Escreva sua resposta..." : "Digite uma mensagem..."}
                                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim()}
                                    className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <SendIcon className="w-6 h-6 pl-1" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="bg-gray-200 p-6 rounded-full mb-4">
                            <ChatBubbleLeftRightIcon className="w-16 h-16" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-600">Reuniões Internas</h3>
                        <p className="text-sm">Selecione um tema para ver a conversa.</p>
                    </div>
                )}
            </div>

            {/* Create Topic Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Criar Novo Tema</h3>
                        <form onSubmit={handleCreateTopic}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Título do Tema</label>
                            <input 
                                type="text" 
                                className="w-full border p-2 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500" 
                                placeholder="Ex: Planeamento Festa Junina" 
                                value={newTopicTitle}
                                onChange={e => setNewTopicTitle(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">Criar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Participants Modal */}
            {isParticipantsModalOpen && activeTopic && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="text-lg font-bold text-gray-800">Gerir Participantes: {activeTopic.title}</h3>
                            <button onClick={() => setIsParticipantsModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b bg-white space-y-3">
                            <div className="flex gap-2 flex-col sm:flex-row">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar por nome..." 
                                        value={participantSearchTerm}
                                        onChange={e => setParticipantSearchTerm(e.target.value)}
                                        className="w-full border pl-9 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                </div>
                                <div className="relative min-w-[180px]">
                                    <select 
                                        value={roleFilter}
                                        onChange={e => setRoleFilter(e.target.value)}
                                        className="w-full border p-2 pl-9 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer"
                                    >
                                        <option value="All">Todas as Funções</option>
                                        <option value={UserRole.PROFESSOR}>Professores</option>
                                        <option value={UserRole.SECRETARIA}>Secretaria</option>
                                        <option value={UserRole.ADMIN}>Administração</option>
                                        <option value={UserRole.ENCARREGADO}>Encarregados</option>
                                    </select>
                                    <FilterIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>{filteredModalUsers.length} usuários encontrados</span>
                                <button 
                                    onClick={() => handleBulkAction(areAllFilteredSelected ? 'remove' : 'add')}
                                    className={`font-semibold hover:underline ${areAllFilteredSelected ? 'text-red-600' : 'text-indigo-600'}`}
                                >
                                    {areAllFilteredSelected ? 'Remover Visíveis' : 'Selecionar Visíveis'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            <div className="bg-white rounded-lg border shadow-sm divide-y">
                                {filteredModalUsers.length > 0 ? filteredModalUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center">
                                            <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full mr-3 border border-gray-100" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{u.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                        u.role === UserRole.ENCARREGADO ? 'bg-orange-100 text-orange-700' :
                                                        u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{u.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleParticipant(u.id)}
                                            className={`p-2 rounded-full transition-colors ${
                                                activeTopic.participantIds.includes(u.id) 
                                                ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                                                : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                                            }`}
                                        >
                                            <CheckCircleIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-gray-500">
                                        Nenhum usuário encontrado com estes filtros.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternalChat;
