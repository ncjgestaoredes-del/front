
import React, { useState, FormEvent } from 'react';
import { User } from '../types';
import { CloseIcon } from './icons/IconComponents';

interface AddGuardianModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddGuardian: (guardianData: Omit<User, 'id' | 'role' | 'avatarUrl'>) => void;
}

const AddGuardianModal: React.FC<AddGuardianModalProps> = ({ isOpen, onClose, onAddGuardian }) => {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!name || !contact || !email || !password) {
            setError('Nome, Contato, Email e Senha são obrigatórios.');
            return;
        }
        setError('');
        onAddGuardian({ name, email, password, contact, address });
        // Clear form for next time
        setName('');
        setContact('');
        setEmail('');
        setAddress('');
        setPassword('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Cadastrar Novo Encarregado</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardian-name">Nome Completo*</label>
                            <input id="guardian-name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full input" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardian-contact">Contato*</label>
                            <input id="guardian-contact" type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full input" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardian-email">Email*</label>
                            <input id="guardian-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full input" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardian-address">Endereço</label>
                            <input id="guardian-address" type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full input" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardian-password">Senha Provisória*</label>
                            <input id="guardian-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full input" required />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                    </div>
                    <footer className="flex items-center justify-end p-4 border-t bg-gray-50 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 mr-2">
                            Cancelar
                        </button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
                            Salvar Encarregado
                        </button>
                    </footer>
                </form>
                <style>{`
                    .input {
                        padding: 8px 12px;
                        border: 1px solid #D1D5DB;
                        border-radius: 8px;
                        transition: all 0.2s;
                    }
                    .input:focus {
                        outline: 2px solid transparent;
                        outline-offset: 2px;
                        border-color: #6366F1;
                        box-shadow: 0 0 0 2px #a5b4fc;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default AddGuardianModal;
