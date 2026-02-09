
import React, { useState, useEffect } from 'react';
import { Student, BehaviorNote } from '../types';
import { CloseIcon, ExclamationTriangleIcon, StarIcon } from './icons/IconComponents';

interface RegisterOccurrenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    onSave: (note: BehaviorNote) => void;
}

const RegisterOccurrenceModal: React.FC<RegisterOccurrenceModalProps> = ({ isOpen, onClose, student, onSave }) => {
    const [type, setType] = useState<'Positivo' | 'Negativo'>('Negativo');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [severity, setSeverity] = useState<'Leve' | 'Moderada' | 'Grave'>('Leve');
    const [note, setNote] = useState('');
    const [measureTaken, setMeasureTaken] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setType('Negativo');
            setDate(new Date().toISOString().split('T')[0]);
            setSeverity('Leve');
            setNote('');
            setMeasureTaken('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) {
            setError('A descrição da ocorrência é obrigatória.');
            return;
        }

        const newNote: BehaviorNote = {
            date,
            type,
            note,
            severity: type === 'Negativo' ? severity : undefined,
            measureTaken: type === 'Negativo' ? measureTaken : undefined
        };

        onSave(newNote);
        onClose();
    };

    if (!isOpen || !student) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <header className={`flex items-center justify-between p-4 border-b rounded-t-2xl ${type === 'Negativo' ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div>
                        <h2 className={`text-xl font-bold ${type === 'Negativo' ? 'text-red-800' : 'text-green-800'}`}>
                            Registar Ocorrência
                        </h2>
                        <p className="text-sm text-gray-600">Aluno: {student.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-white hover:shadow-sm transition-all">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    
                    {/* Type Selection */}
                    <div className="flex space-x-4 mb-2">
                        <button
                            type="button"
                            onClick={() => setType('Positivo')}
                            className={`flex-1 py-2 px-4 rounded-lg border-2 flex items-center justify-center font-bold transition-all ${
                                type === 'Positivo' 
                                ? 'border-green-500 bg-green-50 text-green-700' 
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            <StarIcon className="w-5 h-5 mr-2" filled={type === 'Positivo'} />
                            Elogio / Positivo
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('Negativo')}
                            className={`flex-1 py-2 px-4 rounded-lg border-2 flex items-center justify-center font-bold transition-all ${
                                type === 'Negativo' 
                                ? 'border-red-500 bg-red-50 text-red-700' 
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                            Infração / Negativo
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        
                        {type === 'Negativo' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
                                <select 
                                    value={severity} 
                                    // @ts-ignore
                                    onChange={e => setSeverity(e.target.value)} 
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="Leve">Leve</option>
                                    <option value="Moderada">Moderada</option>
                                    <option value="Grave">Grave</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Fato*</label>
                        <textarea 
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder={type === 'Positivo' ? "Ex: Ajudou um colega com dificuldades..." : "Ex: Chegou atrasado e perturbou a aula..."}
                            required
                        />
                    </div>

                    {type === 'Negativo' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Medida Disciplinar Aplicada</label>
                            <textarea 
                                value={measureTaken}
                                onChange={e => setMeasureTaken(e.target.value)}
                                rows={2}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ex: Advertência verbal, Chamada ao Encarregado..."
                            />
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </form>

                <footer className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        className={`px-6 py-2 text-white rounded-lg font-bold shadow-md transition-colors ${
                            type === 'Positivo' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        Registar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default RegisterOccurrenceModal;
