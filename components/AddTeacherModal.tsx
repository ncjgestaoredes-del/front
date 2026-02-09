
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { User, UserRole, TeacherCategory, TeacherAvailability } from '../types';
import { CloseIcon } from './icons/IconComponents';

interface AddTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTeacher: (teacherData: Omit<User, 'id' | 'role' | 'avatarUrl'>) => void;
}

const availabilityOptions: TeacherAvailability[] = ['Manhã', 'Tarde', 'Noite'];
const categoryOptions: TeacherCategory[] = ['Efetivo', 'Contratado', 'Estagiário'];

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ isOpen, onClose, onAddTeacher }) => {
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: '',
        address: '',
        birthDate: '',
        password: '',
        category: 'Efetivo' as TeacherCategory,
        education: '',
        specialization: '',
        otherOccupations: '',
        availability: [] as TeacherAvailability[],
    });
    const [error, setError] = useState('');

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleAvailabilityChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const selectedAvailability = value as TeacherAvailability;
        setFormData(prev => {
            if (checked) {
                return { ...prev, availability: [...prev.availability, selectedAvailability] };
            } else {
                return { ...prev, availability: prev.availability.filter(item => item !== selectedAvailability) };
            }
        });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const { name, email, password, contact } = formData;
        if (!name || !email || !password || !contact) {
            setError('Nome, Email, Senha e Contato são obrigatórios.');
            return;
        }
        setError('');
        onAddTeacher(formData);
        onClose(); // Close modal on successful submission
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Cadastrar Novo Professor</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {/* Personal Info */}
                        <h3 className="md:col-span-2 text-lg font-semibold text-gray-700 border-b pb-2">Dados Pessoais</h3>
                        <div>
                            <label className="label" htmlFor="name">Nome Completo*</label>
                            <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="input" required />
                        </div>
                        <div>
                            <label className="label" htmlFor="birthDate">Data de Nascimento</label>
                            <input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="input" />
                        </div>
                        <div>
                            <label className="label" htmlFor="email">Email*</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="input" required />
                        </div>
                         <div>
                            <label className="label" htmlFor="contact">Contato*</label>
                            <input id="contact" name="contact" type="text" value={formData.contact} onChange={handleChange} className="input" required />
                        </div>
                        <div>
                            <label className="label" htmlFor="password">Senha Provisória*</label>
                            <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className="input" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label" htmlFor="address">Endereço</label>
                            <input id="address" name="address" type="text" value={formData.address} onChange={handleChange} className="input" />
                        </div>

                        {/* Professional Info */}
                        <h3 className="md:col-span-2 text-lg font-semibold text-gray-700 border-b pb-2 mt-4">Informações Profissionais</h3>
                        <div>
                            <label className="label" htmlFor="category">Categoria</label>
                            <select id="category" name="category" value={formData.category} onChange={handleChange} className="input bg-white">
                                {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="label" htmlFor="education">Formação Acadêmica</label>
                            <input id="education" name="education" type="text" value={formData.education} onChange={handleChange} className="input" placeholder="Ex: Licenciatura em Letras" />
                        </div>
                        <div>
                            <label className="label" htmlFor="specialization">Especialização</label>
                            <input id="specialization" name="specialization" type="text" value={formData.specialization} onChange={handleChange} className="input" placeholder="Ex: Literatura Portuguesa" />
                        </div>
                        <div>
                            <label className="label" htmlFor="otherOccupations">Outras Ocupações</label>
                            <input id="otherOccupations" name="otherOccupations" type="text" value={formData.otherOccupations} onChange={handleChange} className="input" />
                        </div>

                        {/* Availability */}
                        <div className="md:col-span-2 mt-2">
                            <label className="label">Disponibilidade</label>
                            <div className="flex items-center space-x-6 mt-2">
                                {availabilityOptions.map(avail => (
                                    <label key={avail} className="flex items-center space-x-2 text-sm text-gray-800">
                                        <input 
                                            type="checkbox" 
                                            value={avail} 
                                            checked={formData.availability.includes(avail)} 
                                            onChange={handleAvailabilityChange} 
                                            className="rounded text-indigo-600 focus:ring-indigo-500" 
                                        />
                                        <span>{avail}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                    </div>
                    <footer className="flex items-center justify-end p-4 border-t bg-gray-50 rounded-b-2xl">
                        {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 mr-2">
                            Cancelar
                        </button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
                            Salvar Professor
                        </button>
                    </footer>
                </form>
                <style>{`
                    .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
                    .input { width: 100%; padding: 8px 12px; border: 1px solid #D1D5DB; border-radius: 8px; transition: all 0.2s; }
                    .input:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #6366F1; box-shadow: 0 0 0 2px #a5b4fc; }
                `}</style>
            </div>
        </div>
    );
};

export default AddTeacherModal;