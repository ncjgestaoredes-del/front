
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { TrashIcon, UserAddIcon, EditIcon } from './icons/IconComponents';
import EditUserModal from './EditUserModal';

interface UserManagementProps {
    users: User[];
    onUsersChange: (users: User[]) => void;
    currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onUsersChange, currentUser }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.PROFESSOR);
    const [error, setError] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    
    // Lista de papéis permitidos para criação dentro de uma escola
    const allowedRoles = [
        UserRole.ADMIN,
        UserRole.SECRETARIA,
        UserRole.PROFESSOR,
        UserRole.ENCARREGADO
    ];

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !email || !password) {
            setError('Todos os campos são obrigatórios.');
            return;
        }
        if (users.some(u => u.email === email)) {
            setError('Este email já está em uso.');
            return;
        }

        const newUser: User = {
            id: `user_${Date.now()}`,
            schoolId: currentUser.schoolId, // Garante que o novo usuário pertença à mesma escola
            name,
            email,
            password,
            role,
            avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
        };

        onUsersChange([...users, newUser]);

        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        setRole(UserRole.PROFESSOR);
        setError('');
    };

    const handleDeleteUser = (userId: string) => {
        if (userId === currentUser.id) {
            alert("Você não pode remover sua própria conta.");
            return;
        }
        if(window.confirm('Tem certeza de que deseja remover este usuário?')) {
            onUsersChange(users.filter(u => u.id !== userId));
        }
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const handleUpdateUser = (updatedUserData: Partial<User> & { id: string }) => {
        const originalUser = users.find(u => u.id === updatedUserData.id);
        if (!originalUser) return;

        const finalUser = { ...originalUser, ...updatedUserData };

        onUsersChange(users.map(u => (u.id === finalUser.id ? finalUser : u)));
        handleCloseEditModal();
    };

    return (
        <>
            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                user={editingUser}
                onUpdateUser={handleUpdateUser}
            />
            <div className="space-y-8">
                {/* Add User Form */}
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                        <UserAddIcon className="w-7 h-7 mr-3 text-indigo-600"/>
                        Cadastrar Novo Usuário
                    </h3>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">Nome Completo</label>
                            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do usuário" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
                            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Senha</label>
                            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">Função</label>
                            <select id="role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                                {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="lg:col-span-4">
                            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                            <button type="submit" className="w-full md:w-auto bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform transform hover:scale-105">
                                Adicionar Usuário
                            </button>
                        </div>
                    </form>
                </div>

                {/* User List */}
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Lista de Usuários</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3 border"/>
                                            {user.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                                                user.role === UserRole.PROFESSOR ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex items-center justify-center space-x-4">
                                                <button onClick={() => handleOpenEditModal(user)} title="Editar" className="text-indigo-600 hover:text-indigo-900">
                                                    <EditIcon className="w-5 h-5"/>
                                                </button>
                                                <button onClick={() => handleDeleteUser(user.id)} title="Excluir" disabled={user.id === currentUser.id} className="text-red-600 hover:text-red-900 disabled:text-gray-300 disabled:cursor-not-allowed">
                                                    <TrashIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserManagement;
