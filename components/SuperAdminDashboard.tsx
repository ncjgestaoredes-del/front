
import React, { useState, useMemo, useEffect } from 'react';
import { SchoolInstance, SchoolStatus, User, UserRole, PaymentMethod, PasswordResetRequest } from '../types';
import { UsersIcon, CurrencyDollarIcon, CloseIcon, CheckCircleIcon, ExclamationTriangleIcon, SearchIcon, LogoutIcon, LockClosedIcon, LockOpenIcon, PrinterIcon, InboxIcon, ClockIcon, EditIcon, TrashIcon } from './icons/IconComponents';
import { apiService } from '../apiService';

interface SuperAdminDashboardProps {
    schools: SchoolInstance[];
    onSchoolsChange: (schools: SchoolInstance[]) => void;
    onLogout: () => void;
    currentUser: User;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ schools, onSchoolsChange, onLogout, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState<SchoolInstance | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Password Reset Requests
    const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
    const [tempPassword, setTempPassword] = useState('');

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const data = await apiService.get('/saas/password-requests');
                setResetRequests(data);
            } catch (err) {
                console.error("Erro ao buscar solicitações de senha.");
            }
        };
        fetchRequests();
    }, []);

    const saveRequestsToAPI = async (updated: PasswordResetRequest[]) => {
        setResetRequests(updated);
        try {
            await apiService.post('/school/SYSTEM/sync/password_requests', updated);
        } catch (err) {
            console.error("Erro ao sincronizar solicitações.");
        }
    };

    // Form States para Nova/Edição de Escola
    const [newName, setNewName] = useState('');
    const [newAccessCode, setNewAccessCode] = useState('');
    const [newRep, setNewRep] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newContact, setNewContact] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newFee, setNewFee] = useState('5000');

    // Gerar código de acesso automático apenas ao criar nova escola
    useEffect(() => {
        if (!newName || editingSchool) {
            return;
        }
        const slug = newName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "")
            .substring(0, 20);
        setNewAccessCode(slug);
    }, [newName, editingSchool]);

    const filteredSchools = useMemo(() => {
        return schools.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.representativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.accessCode?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [schools, searchTerm]);

    const resetForm = () => {
        setNewName(''); 
        setNewAccessCode(''); 
        setNewRep(''); 
        setNewEmail(''); 
        setNewContact(''); 
        setNewPass('');
        setEditingSchool(null);
    };

    const handleAddSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newAccessCode || !newRep || !newEmail || !newPass) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        setIsProcessing(true);
        const schoolId = `sch_${Date.now()}`;
        
        const newSchool: SchoolInstance = {
            id: schoolId,
            name: newName,
            accessCode: newAccessCode,
            representativeName: newRep,
            email: newEmail,
            contact: newContact,
            status: 'Ativo',
            createdAt: new Date().toISOString(),
            subscription: {
                lastPaymentDate: new Date().toISOString(),
                monthlyFee: Number(newFee),
                nextDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                paymentHistory: []
            }
        };

        const firstAdmin: User = {
            id: `user_adm_${Date.now()}`,
            schoolId: schoolId,
            name: newRep,
            email: newEmail,
            password: newPass,
            role: UserRole.ADMIN,
            avatarUrl: `https://i.pravatar.cc/150?u=${newEmail}`,
            contact: newContact
        };

        try {
            await apiService.post('/schools/sync', [newSchool]);
            await apiService.post(`/school/${schoolId}/sync/users`, [firstAdmin]);
            onSchoolsChange([newSchool, ...schools]);
            setIsAddModalOpen(false);
            resetForm();
            alert(`Sucesso! A escola ${newName} foi criada.\n\nACESSO GERAL: ${newAccessCode}\nADMIN: ${newEmail}\nSENHA: ${newPass}`);
        } catch (err: any) {
            console.error(err);
            alert("Erro ao criar escola: " + (err.message || "E-mail ou Código de Acesso já pode estar em uso."));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenEdit = (school: SchoolInstance) => {
        setEditingSchool(school);
        setNewName(school.name);
        setNewAccessCode(school.accessCode);
        setNewRep(school.representativeName);
        setNewEmail(school.email);
        setNewContact(school.contact);
        setIsEditModalOpen(true);
    };

    const handleUpdateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchool) return;

        setIsProcessing(true);
        const updatedSchool: SchoolInstance = {
            ...editingSchool,
            name: newName,
            accessCode: newAccessCode,
            representativeName: newRep,
            email: newEmail,
            contact: newContact
        };

        try {
            await apiService.post('/schools/sync', [updatedSchool]);
            onSchoolsChange(schools.map(s => s.id === updatedSchool.id ? updatedSchool : s));
            setIsEditModalOpen(false);
            resetForm();
            alert("Dados da escola atualizados com sucesso.");
        } catch (err: any) {
            alert("Erro ao atualizar escola: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteSchool = async (schoolId: string) => {
        const school = schools.find(s => s.id === schoolId);
        if (!school) return;

        if (window.confirm(`ATENÇÃO: Deseja REALMENTE excluir a escola "${school.name}"?\nTodos os dados de alunos, professores e finanças desta escola serão apagados permanentemente!`)) {
            try {
                await apiService.delete(`/schools/${schoolId}`);
                onSchoolsChange(schools.filter(s => s.id !== schoolId));
                alert("Escola excluída com sucesso.");
            } catch (err: any) {
                alert("Erro ao excluir escola: " + err.message);
            }
        }
    };

    const handleProcessReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest || !tempPassword) return;

        try {
            const data = await apiService.get(`/school/${selectedRequest.schoolId}/full-data`);
            const users = data.users || [];
            
            const updatedUsers = users.map((u: any) => {
                if (u.email === selectedRequest.userEmail) {
                    return { ...u, password: tempPassword };
                }
                return u;
            });

            await apiService.post(`/school/${selectedRequest.schoolId}/sync/users`, updatedUsers);

            const updatedRequests = resetRequests.map(r => 
                r.id === selectedRequest.id ? { ...r, status: 'Resolvido' as const } : r
            );
            await saveRequestsToAPI(updatedRequests);

            alert(`Senha redefinida com sucesso para o administrador.`);
            setIsResetModalOpen(false);
            setSelectedRequest(null);
            setTempPassword('');
        } catch (err) {
            alert("Erro ao redefinir senha.");
        }
    };

    const toggleSchoolLock = async (schoolId: string) => {
        const school = schools.find(s => s.id === schoolId);
        if (!school) return;

        const newStatus: SchoolStatus = school.status === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
        if (window.confirm(`Deseja realmente ${newStatus === 'Bloqueado' ? 'BLOQUEAR' : 'DESBLOQUEAR'} o acesso da escola ${school.name}?`)) {
            const updated = schools.map(s => s.id === schoolId ? { ...s, status: newStatus } : s);
            try {
                await apiService.post('/schools/sync', updated.filter(s => s.id === schoolId));
                onSchoolsChange(updated);
            } catch (e) {
                alert("Falha ao atualizar status da escola.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
            <header className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500 p-2 rounded-lg">
                        <UsersIcon className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-tight">SaaS CONTROL CENTER</h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-sm font-bold">{currentUser.name}</p>
                        <p className="text-[10px] text-indigo-400 uppercase font-black">Super Admin Global</p>
                    </div>
                    <button onClick={onLogout} className="bg-white/10 p-2 rounded-full hover:bg-red-500 transition-colors">
                        <LogoutIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="p-8 flex-1 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-indigo-500">
                        <p className="text-xs font-bold text-gray-400 uppercase">Escolas Registradas</p>
                        <p className="text-3xl font-black text-slate-800">{schools.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
                        <p className="text-xs font-bold text-gray-400 uppercase">Escolas Ativas</p>
                        <p className="text-3xl font-black text-green-600">{schools.filter(s => s.status === 'Ativo').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-500">
                        <p className="text-xs font-bold text-gray-400 uppercase">Resets Pendentes</p>
                        <p className="text-3xl font-black text-amber-600">{resetRequests.filter(r => r.status === 'Pendente').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
                        <p className="text-xs font-bold text-gray-400 uppercase">SaaS Status</p>
                        <p className="text-xl font-black text-blue-600">ONLINE</p>
                    </div>
                </div>

                {resetRequests.filter(r => r.status === 'Pendente').length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 shadow-sm">
                        <h3 className="text-lg font-black text-amber-800 flex items-center gap-2 mb-4">
                            <InboxIcon className="w-5 h-5" />
                            SOLICITAÇÕES DE RECUPERAÇÃO DE SENHA
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {resetRequests.filter(r => r.status === 'Pendente').map(req => (
                                <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">{req.userName}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-black">{req.schoolName}</p>
                                        <p className="text-xs text-indigo-600">{req.userEmail}</p>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedRequest(req); setIsResetModalOpen(true); }}
                                        className="bg-indigo-600 text-white text-[10px] font-black px-3 py-2 rounded-xl hover:bg-indigo-700 uppercase"
                                    >
                                        Atender
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative w-full md:w-96">
                            <SearchIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Filtrar por escola, email ou código..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button 
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                        >
                            + Cadastrar Nova Escola
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Escola / Empresa</th>
                                    <th className="px-6 py-4">Código Login</th>
                                    <th className="px-6 py-4">Representante (Admin)</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSchools.map(school => (
                                    <tr key={school.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{school.name}</p>
                                            <p className="text-xs text-indigo-500 font-medium">{school.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-black text-indigo-800 border uppercase">
                                                {school.accessCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-700">{school.representativeName}</p>
                                            <p className="text-xs text-gray-400">{school.contact}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                school.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleOpenEdit(school)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    title="Editar Escola"
                                                >
                                                    <EditIcon className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => toggleSchoolLock(school.id)} 
                                                    className={`p-2 rounded-lg transition-colors ${school.status === 'Bloqueado' ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'}`}
                                                    title={school.status === 'Bloqueado' ? "Desbloquear" : "Bloquear Acesso"}
                                                >
                                                    {school.status === 'Bloqueado' ? <LockOpenIcon className="w-5 h-5" /> : <LockClosedIcon className="w-5 h-5" />}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteSchool(school.id)}
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Excluir Permanentemente"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSchools.length === 0 && (
                                    <tr><td colSpan={5} className="p-10 text-center text-gray-400">Nenhuma escola encontrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal de Cadastro */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <header className="bg-slate-900 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight">Novo Registro Escolar</h3>
                            <button onClick={() => { resetForm(); setIsAddModalOpen(false); }} className="hover:rotate-90 transition-transform"><CloseIcon className="w-6 h-6" /></button>
                        </header>
                        <form onSubmit={handleAddSchool} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome Oficial da Escola</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ex: Colégio Smart Maputo" className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Código de Acesso para Login (Geral da Escola)</label>
                                <input type="text" value={newAccessCode} onChange={e => setNewAccessCode(e.target.value.toLowerCase().replace(/\s/g, ""))} required placeholder="colegiosmart" className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700" />
                                <p className="text-[9px] text-indigo-400 mt-1">Este código será solicitado a todos os usuários desta escola na tela de login.</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome do Representante</label>
                                <input type="text" value={newRep} onChange={e => setNewRep(e.target.value)} required placeholder="Nome do Administrador" className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-mail de Acesso Pessoal</label>
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="admin@escola.com" className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Telefone de Contato</label>
                                <input type="text" value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="+258..." className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Senha de Primeiro Acesso</label>
                                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required placeholder="********" className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-2 mt-4">
                                <button 
                                    type="submit" 
                                    disabled={isProcessing}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isProcessing ? "PROCESSANDO..." : "FINALIZAR E CRIAR ADMIN"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Edição */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <header className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight">Editar Dados Escolares</h3>
                            <button onClick={() => { resetForm(); setIsEditModalOpen(false); }} className="hover:rotate-90 transition-transform"><CloseIcon className="w-6 h-6" /></button>
                        </header>
                        <form onSubmit={handleUpdateSchool} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome Oficial da Escola</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Código de Acesso (Login Geral)</label>
                                <input type="text" value={newAccessCode} onChange={e => setNewAccessCode(e.target.value.toLowerCase().replace(/\s/g, ""))} required className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome do Representante</label>
                                <input type="text" value={newRep} onChange={e => setNewRep(e.target.value)} required className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-mail Principal</label>
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Telefone de Contato</label>
                                <input type="text" value={newContact} onChange={e => setNewContact(e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-2 mt-4">
                                <button 
                                    type="submit" 
                                    disabled={isProcessing}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isProcessing ? "PROCESSANDO..." : "SALVAR ALTERAÇÕES"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isResetModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
                         <header className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight">Redefinição SaaS</h3>
                            <button onClick={() => setIsResetModalOpen(false)}><CloseIcon className="w-6 h-6" /></button>
                        </header>
                        <form onSubmit={handleProcessReset} className="p-8 space-y-4">
                            <p className="text-sm text-gray-600">Nova senha para <strong>{selectedRequest.userName}</strong> ({selectedRequest.schoolName}).</p>
                            <input type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} required placeholder="Senha temporária" className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest">Autorizar Acesso</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
