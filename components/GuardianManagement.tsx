
import React, { useState, useMemo } from 'react';
import { User, UserRole, Student } from '../types';
import { TrashIcon, EditIcon, ChevronDownIcon } from './icons/IconComponents';
import EditUserModal from './EditUserModal';
import AddGuardianModal from './AddGuardianModal';

interface GuardianManagementProps {
    users: User[];
    onUsersChange: (users: User[]) => void;
    currentUser: User;
    students: Student[];
}

const GuardianManagement: React.FC<GuardianManagementProps> = ({ users, onUsersChange, currentUser, students }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [expandedGuardianId, setExpandedGuardianId] = useState<string | null>(null);

    const canManageGuardians = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SECRETARIA;

    const filteredGuardians = useMemo(() => {
        let currentGuardians = users.filter(u => u.role === UserRole.ENCARREGADO);

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            currentGuardians = currentGuardians.filter(guardian =>
                guardian.name.toLowerCase().includes(lowercasedTerm) ||
                guardian.email.toLowerCase().includes(lowercasedTerm) ||
                (guardian.contact && guardian.contact.toLowerCase().includes(lowercasedTerm))
            );
        }
        return currentGuardians;
    }, [users, searchTerm]);


    const handleToggleExpand = (guardianId: string) => {
        setExpandedGuardianId(prevId => (prevId === guardianId ? null : guardianId));
    };

    const handleAddGuardian = (newGuardianData: Omit<User, 'id' | 'role' | 'avatarUrl'>) => {
        const newGuardian: User = {
            ...newGuardianData,
            id: `user_${Date.now()}`,
            role: UserRole.ENCARREGADO,
            avatarUrl: `https://i.pravatar.cc/150?u=${newGuardianData.email}`,
            password: newGuardianData.password || '123456' // Default password
        };
        onUsersChange([...users, newGuardian]);
        setIsAddModalOpen(false);
    };

    const handleDeleteUser = (userId: string) => {
        if (userId === currentUser.id) {
            alert("Você não pode remover sua própria conta.");
            return;
        }
        if (window.confirm('Tem certeza de que deseja remover este encarregado?')) {
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

        // Ensure contact and address are preserved if not provided in the update
        const finalUser = { 
            ...originalUser, 
            ...updatedUserData,
            contact: updatedUserData.contact || originalUser.contact,
            address: updatedUserData.address || originalUser.address,
        };

        onUsersChange(users.map(u => (u.id === finalUser.id ? finalUser : u)));
        handleCloseEditModal();
    };

    return (
        <>
            <AddGuardianModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddGuardian={handleAddGuardian}
            />
            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                user={editingUser}
                onUpdateUser={handleUpdateUser}
            />
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Lista de Encarregados</h3>
                        <p className="text-sm text-gray-500">
                            {canManageGuardians ? 'Adicione, edite ou remova encarregados.' : 'Visualize os encarregados associados aos seus alunos.'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 mt-4 md:mt-0">
                         <div className="relative">
                            <input
                                type="text"
                                placeholder="Pesquisar por nome, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-indigo-400"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        {canManageGuardians && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform transform hover:scale-105 whitespace-nowrap"
                            >
                                + Cadastrar Encarregado
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                {canManageGuardians && (
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredGuardians.map(user => {
                                const associatedStudents = students.filter(s => s.guardianName === user.name);
                                const isExpanded = expandedGuardianId === user.id;

                                return (
                                <React.Fragment key={user.id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleToggleExpand(user.id)} className="p-1 rounded-full hover:bg-gray-200">
                                                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                                            {user.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.contact || 'N/A'}</td>
                                        {canManageGuardians && (
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex items-center justify-center space-x-4">
                                                    <button onClick={() => handleOpenEditModal(user)} title="Editar" className="text-indigo-600 hover:text-indigo-900">
                                                        <EditIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(user.id)} title="Excluir" className="text-red-600 hover:text-red-900">
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-indigo-50">
                                            <td colSpan={canManageGuardians ? 5 : 4} className="p-4">
                                                <div className="p-4 bg-white rounded-lg shadow-inner">
                                                    <h4 className="font-bold text-md text-gray-700 mb-2">Alunos Associados ({associatedStudents.length})</h4>
                                                    {associatedStudents.length > 0 ? (
                                                        <ul className="divide-y divide-gray-200">
                                                            {associatedStudents.map(student => (
                                                                <li key={student.id} className="py-2 flex justify-between items-center">
                                                                    <span className="text-sm text-gray-800">{student.name}</span>
                                                                    <span className="text-xs text-gray-500">{student.id} - {student.desiredClass}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">Nenhum aluno associado a este encarregado.</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )})}
                             {filteredGuardians.length === 0 && (
                                <tr>
                                    <td colSpan={canManageGuardians ? 5 : 4} className="text-center py-10 text-gray-500">
                                        Nenhum encarregado encontrado com os filtros aplicados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default GuardianManagement;
