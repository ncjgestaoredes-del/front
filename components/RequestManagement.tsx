
import React, { useState, useMemo } from 'react';
import { User, SchoolRequest, RequestStatus, RequestPriority, AppNotification } from '../types';
import { InboxIcon, PaperAirplaneIcon, UserAddIcon, CheckCircleIcon, CloseIcon, CheckBadgeIcon, ExclamationTriangleIcon } from './icons/IconComponents';

interface RequestManagementProps {
    currentUser: User;
    users: User[];
    requests: SchoolRequest[];
    onRequestsChange: (requests: SchoolRequest[]) => void;
    onAddNotifications: (notifications: AppNotification[]) => void;
}

const requestTypes = ['Documentação', 'Material', 'Manutenção', 'Transferência', 'Reunião', 'Outros'];
const priorities: RequestPriority[] = ['Baixa', 'Normal', 'Alta', 'Urgente'];

const RequestManagement: React.FC<RequestManagementProps> = ({ currentUser, users, requests, onRequestsChange, onAddNotifications }) => {
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewRequest, setViewRequest] = useState<SchoolRequest | null>(null);
    
    // Create Form State
    const [newRecipientId, setNewRecipientId] = useState('');
    const [newType, setNewType] = useState(requestTypes[0]);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newPriority, setNewPriority] = useState<RequestPriority>('Normal');

    // Update Status State
    const [feedback, setFeedback] = useState('');
    const [statusUpdate, setStatusUpdate] = useState<RequestStatus>('Pendente');

    // Filtering
    const incomingRequests = useMemo(() => 
        requests.filter(r => r.recipientId === currentUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
    [requests, currentUser.id]);

    const outgoingRequests = useMemo(() => 
        requests.filter(r => r.requesterId === currentUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
    [requests, currentUser.id]);

    const displayedRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

    const availableRecipients = useMemo(() => {
        // Exclude current user from recipients list
        return users.filter(u => u.id !== currentUser.id).sort((a,b) => a.name.localeCompare(b.name));
    }, [users, currentUser.id]);

    const getStatusColor = (status: RequestStatus) => {
        switch (status) {
            case 'Pendente': return 'bg-yellow-100 text-yellow-800';
            case 'Em Análise': return 'bg-blue-100 text-blue-800';
            case 'Aprovado': return 'bg-green-100 text-green-800';
            case 'Concluído': return 'bg-gray-100 text-gray-800';
            case 'Rejeitado': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: RequestPriority) => {
        switch (priority) {
            case 'Baixa': return 'text-gray-500';
            case 'Normal': return 'text-blue-500';
            case 'Alta': return 'text-orange-500 font-bold';
            case 'Urgente': return 'text-red-600 font-bold uppercase';
            default: return 'text-gray-500';
        }
    };

    const handleCreateRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecipientId || !newTitle || !newDescription) return;

        const newRequest: SchoolRequest = {
            id: `req_${Date.now()}`,
            requesterId: currentUser.id,
            recipientId: newRecipientId,
            type: newType,
            title: newTitle,
            description: newDescription,
            priority: newPriority,
            status: 'Pendente',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        onRequestsChange([newRequest, ...requests]);

        // Notify Recipient
        onAddNotifications([{
            id: `notif_req_${Date.now()}`,
            userId: newRecipientId,
            type: 'message', // Generic type for now
            title: 'Novo Pedido Recebido',
            message: `${currentUser.name} enviou um pedido: ${newTitle}`,
            read: false,
            timestamp: new Date().toISOString(),
            relatedId: newRequest.id
        }]);

        setIsCreateModalOpen(false);
        // Reset form
        setNewRecipientId('');
        setNewTitle('');
        setNewDescription('');
        setNewPriority('Normal');
    };

    const handleUpdateStatus = () => {
        if (!viewRequest) return;

        const updatedRequest = {
            ...viewRequest,
            status: statusUpdate,
            feedback: feedback || viewRequest.feedback, // Keep old feedback if not changed, or append? Simple overwrite for now.
            updatedAt: new Date().toISOString()
        };

        const updatedList = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
        onRequestsChange(updatedList);

        // Notify Requester
        onAddNotifications([{
            id: `notif_req_update_${Date.now()}`,
            userId: viewRequest.requesterId,
            type: 'request_update',
            title: 'Atualização de Pedido',
            message: `O seu pedido "${viewRequest.title}" mudou para: ${statusUpdate}`,
            read: false,
            timestamp: new Date().toISOString(),
            relatedId: viewRequest.id
        }]);

        setViewRequest(null);
    };

    const openRequestDetails = (req: SchoolRequest) => {
        setViewRequest(req);
        setStatusUpdate(req.status);
        setFeedback(req.feedback || '');
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <InboxIcon className="w-6 h-6 mr-2 text-indigo-600" />
                        Central de Solicitações
                    </h2>
                    <p className="text-sm text-gray-500">Gerencie pedidos e processos internos.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center"
                    >
                        <UserAddIcon className="w-5 h-5 mr-2" />
                        Nova Solicitação
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-gray-50">
                <button
                    onClick={() => setActiveTab('incoming')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'incoming' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center justify-center">
                        <InboxIcon className="w-4 h-4 mr-2" />
                        Caixa de Entrada 
                        {incomingRequests.filter(r => r.status === 'Pendente').length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {incomingRequests.filter(r => r.status === 'Pendente').length}
                            </span>
                        )}
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('outgoing')}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'outgoing' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center justify-center">
                        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        Meus Pedidos (Enviados)
                    </div>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
                {displayedRequests.length > 0 ? (
                    <div className="space-y-3">
                        {displayedRequests.map(req => {
                            const otherUser = users.find(u => u.id === (activeTab === 'incoming' ? req.requesterId : req.recipientId));
                            return (
                                <div 
                                    key={req.id} 
                                    onClick={() => openRequestDetails(req)}
                                    className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer bg-white relative overflow-hidden"
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.priority === 'Urgente' ? 'bg-red-500' : req.priority === 'Alta' ? 'bg-orange-400' : 'bg-blue-300'}`}></div>
                                    <div className="flex justify-between items-start pl-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${getStatusColor(req.status)}`}>
                                                    {req.status}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-gray-800 text-lg">{req.title}</h4>
                                            <p className="text-sm text-gray-500">
                                                {activeTab === 'incoming' ? 'De: ' : 'Para: '}
                                                <span className="font-semibold text-gray-700">{otherUser?.name || 'Usuário Removido'}</span>
                                                <span className="mx-2">•</span>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{req.type}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold ${getPriorityColor(req.priority)}`}>
                                                {req.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <InboxIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Nenhuma solicitação encontrada.</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Nova Solicitação</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRequest} className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Destinatário</label>
                                <select 
                                    value={newRecipientId} 
                                    onChange={(e) => setNewRecipientId(e.target.value)}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {availableRecipients.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select 
                                        value={newType} 
                                        onChange={(e) => setNewType(e.target.value)}
                                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {requestTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                                    <select 
                                        value={newPriority} 
                                        onChange={(e) => setNewPriority(e.target.value as RequestPriority)}
                                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input 
                                    type="text" 
                                    value={newTitle} 
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ex: Autorização de Transferência"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea 
                                    value={newDescription} 
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    rows={4}
                                    placeholder="Detalhes do pedido..."
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 mt-4">
                                Enviar Pedido
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View/Edit Modal */}
            {viewRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-gray-800">Detalhes do Pedido</h3>
                            <button onClick={() => setViewRequest(null)} className="text-gray-500 hover:text-gray-800">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{viewRequest.title}</h2>
                                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${getPriorityColor(viewRequest.priority)} bg-gray-100 border border-gray-200`}>
                                        Prioridade: {viewRequest.priority}
                                    </span>
                                </div>
                                <div className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusColor(viewRequest.status)}`}>
                                    {viewRequest.status}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewRequest.description}</p>
                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                                    <span>
                                        {activeTab === 'incoming' 
                                            ? `Solicitado por: ${users.find(u => u.id === viewRequest.requesterId)?.name}` 
                                            : `Para: ${users.find(u => u.id === viewRequest.recipientId)?.name}`}
                                    </span>
                                    <span>{new Date(viewRequest.createdAt).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Actions for Recipient */}
                            {activeTab === 'incoming' && (
                                <div className="border-t pt-4">
                                    <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                                        <CheckBadgeIcon className="w-5 h-5 mr-2 text-indigo-600" />
                                        Atualizar Estado
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Novo Status</label>
                                            <select 
                                                value={statusUpdate}
                                                // @ts-ignore
                                                onChange={(e) => setStatusUpdate(e.target.value)}
                                                className="w-full border rounded-lg p-2 bg-white"
                                            >
                                                <option value="Pendente">Pendente</option>
                                                <option value="Em Análise">Confirmar Recepção / Em Análise</option>
                                                <option value="Aprovado">Aprovado</option>
                                                <option value="Rejeitado">Rejeitado</option>
                                                <option value="Concluído">Concluído</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Feedback / Resposta</label>
                                            <textarea 
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                className="w-full border rounded-lg p-2"
                                                rows={3}
                                                placeholder="Adicione uma nota ou resposta..."
                                            />
                                        </div>
                                        <button 
                                            onClick={handleUpdateStatus}
                                            className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700"
                                        >
                                            Confirmar Atualização
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* View Feedback for Requester */}
                            {activeTab === 'outgoing' && viewRequest.feedback && (
                                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                                    <h4 className="font-bold text-blue-800 text-sm mb-1">Resposta / Feedback:</h4>
                                    <p className="text-sm text-blue-700">{viewRequest.feedback}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestManagement;
