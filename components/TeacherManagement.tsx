
import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../types';
import { TrashIcon, EditIcon } from './icons/IconComponents';
import EditUserModal from './EditUserModal';
import AddTeacherModal from './AddTeacherModal';

interface TeacherManagementProps {
    users: User[];
    onUsersChange: (users: User[]) => void;
    currentUser: User;
}

const TeacherManagement: React.FC<TeacherManagementProps> = ({ users, onUsersChange, currentUser }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const teachers = useMemo(() => users.filter(u => u.role === UserRole.PROFESSOR), [users]);

    const handleAddTeacher = (teacherData: Omit<User, 'id' | 'role' | 'avatarUrl'>) => {
        if (users.some(u => u.email === teacherData.email)) {
            alert('Este email já está em uso.');
            return;
        }

        const newTeacher: User = {
            ...teacherData,
            id: `user_${Date.now()}`,
            role: UserRole.PROFESSOR,
            avatarUrl: `https://i.pravatar.cc/150?u=${teacherData.email}`,
        };

        onUsersChange([...users, newTeacher]);
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Tem certeza de que deseja remover este professor?')) {
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
        
        // Preserve existing fields not handled by EditUserModal
        const finalUser = { ...originalUser, ...updatedUserData };

        onUsersChange(users.map(u => (u.id === finalUser.id ? finalUser : u)));
        handleCloseEditModal();
    };

    return (
        <>
            <AddTeacherModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddTeacher={handleAddTeacher}
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
                        <h3 className="text-2xl font-bold text-gray-800">Lista de Professores</h3>
                        <p className="text-sm text-gray-500">Adicione, edite ou remova professores do sistema.</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-indigo-600 text-white font-bold py-2 px-4 mt-4 md:mt-0 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform transform hover:scale-105 whitespace-nowrap"
                    >
                        + Adicionar Professor
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialização</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {teachers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3"/>
                                        {user.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.contact || 'N/D'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.specialization || 'N/D'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <div className="flex items-center justify-center space-x-4">
                                            <button onClick={() => handleOpenEditModal(user)} title="Editar" className="text-indigo-600 hover:text-indigo-900">
                                                <EditIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id)} title="Excluir" className="text-red-600 hover:text-red-900">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {teachers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">
                                        Nenhum professor cadastrado.
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

export default TeacherManagement;
