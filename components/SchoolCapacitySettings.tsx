
import React, { useState, useEffect } from 'react';
import { SchoolSettings } from '../types';

interface SchoolCapacitySettingsProps {
    settings: SchoolSettings;
    onSettingsChange: (settings: SchoolSettings) => void;
}

const SchoolCapacitySettings: React.FC<SchoolCapacitySettingsProps> = ({ settings, onSettingsChange }) => {
    const [formData, setFormData] = useState<SchoolSettings>(settings);
    const [isSaved, setIsSaved] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(settings.schoolLogo || null);

    useEffect(() => {
        setFormData(settings);
        setLogoPreview(settings.schoolLogo || null);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        if (name === 'p1' || name === 'p2') {
             setFormData(prev => ({
                ...prev,
                evaluationWeights: {
                    ...prev.evaluationWeights,
                    p1: name === 'p1' ? parseInt(value, 10) || 0 : prev.evaluationWeights?.p1 || 0,
                    p2: name === 'p2' ? parseInt(value, 10) || 0 : prev.evaluationWeights?.p2 || 0
                } as { p1: number, p2: number }
            }));
        } else if (name === 'examInternal' || name === 'examWeight') {
            setFormData(prev => ({
                ...prev,
                examWeights: {
                    internal: name === 'examInternal' ? parseInt(value, 10) || 0 : prev.examWeights?.internal || 50,
                    exam: name === 'examWeight' ? parseInt(value, 10) || 0 : prev.examWeights?.exam || 50
                }
            }));
        } else if (['totalClassrooms', 'studentsPerClass', 'shifts'].includes(name)) {
            setFormData(prev => ({
                ...prev,
                [name]: parseInt(value, 10) || 0
            }));
        } else {
            // For text fields (School Name, NUIT, etc)
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                setFormData(prev => ({ ...prev, schoolLogo: result }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSettingsChange(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="space-y-6">
             {/* School Institutional Data */}
             <div className="p-6 bg-white rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800">Dados da Escola</h3>
                <p className="mt-2 text-gray-600 mb-6">Informações institucionais que aparecerão nos documentos e recibos.</p>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                         <div className="md:col-span-1 flex flex-col items-center">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Logotipo da Escola</label>
                            <div className="w-32 h-32 rounded-full bg-gray-100 mb-2 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <span className="text-xs text-gray-500 text-center">Carregar Logo</span>
                                )}
                            </div>
                            <input type="file" onChange={handleLogoChange} accept="image/*" className="text-sm w-full max-w-xs" />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="schoolName">Nome da Instituição</label>
                                <input 
                                    id="schoolName" 
                                    name="schoolName"
                                    type="text" 
                                    value={formData.schoolName || ''} 
                                    onChange={handleChange}
                                    placeholder="Ex: Escola Primária Heróis"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nuit">NUIT</label>
                                <input 
                                    id="nuit" 
                                    name="nuit"
                                    type="text" 
                                    value={formData.nuit || ''} 
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="contact">Contacto Telefónico</label>
                                <input 
                                    id="contact" 
                                    name="contact"
                                    type="text" 
                                    value={formData.contact || ''} 
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
                                <input 
                                    id="email" 
                                    name="email"
                                    type="email" 
                                    value={formData.email || ''} 
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                             <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">Endereço Físico</label>
                                <input 
                                    id="address" 
                                    name="address"
                                    type="text" 
                                    value={formData.address || ''} 
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end border-t pt-4">
                         <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105">
                            Salvar Dados da Escola
                        </button>
                    </div>
                </form>
             </div>

             {/* School Capacity Section */}
            <div className="p-6 bg-white rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800">Capacidade e Estrutura</h3>
                <p className="mt-2 text-gray-600 mb-6">Defina os limites estruturais da escola. Estes valores serão usados para calcular vagas e limites de turmas.</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="totalClassrooms">Total de Salas de Aula</label>
                            <input 
                                id="totalClassrooms" 
                                name="totalClassrooms"
                                type="number" 
                                value={formData.totalClassrooms} 
                                onChange={handleChange}
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="studentsPerClass">Alunos por Turma (Limite)</label>
                            <input 
                                id="studentsPerClass" 
                                name="studentsPerClass"
                                type="number" 
                                value={formData.studentsPerClass} 
                                onChange={handleChange}
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="shifts">Número de Turnos</label>
                            <input 
                                id="shifts" 
                                name="shifts"
                                type="number" 
                                value={formData.shifts} 
                                onChange={handleChange}
                                min="1"
                                max="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                     <h3 className="text-2xl font-bold text-gray-800 border-t pt-6 mt-6">Sistema de Avaliação (Trimestral)</h3>
                     <p className="mt-2 text-gray-600 mb-6">
                        Defina os pesos para o cálculo da Média Final do Trimestre (MT).
                        <br/>
                        <code className="text-xs bg-gray-100 p-1 rounded">MT = ((ACS x P1) + (AT x P2)) / (P1 + P2)</code>
                     </p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="p1">Peso da Avaliação Contínua (P1)</label>
                            <div className="relative">
                                <input 
                                    id="p1" 
                                    name="p1"
                                    type="number" 
                                    value={formData.evaluationWeights?.p1 || 0} 
                                    onChange={handleChange}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-8"
                                />
                                <span className="absolute right-3 top-2 text-gray-400">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="p2">Peso da Prova (P2)</label>
                            <div className="relative">
                                <input 
                                    id="p2" 
                                    name="p2"
                                    type="number" 
                                    value={formData.evaluationWeights?.p2 || 0} 
                                    onChange={handleChange}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-8"
                                />
                                <span className="absolute right-3 top-2 text-gray-400">%</span>
                            </div>
                        </div>
                     </div>

                     <h3 className="text-2xl font-bold text-gray-800 border-t pt-6 mt-6">Sistema de Exame Final</h3>
                     <p className="mt-2 text-gray-600 mb-6">
                        Aplicável apenas para classes com exame.
                        <br/>
                        <code className="text-xs bg-gray-100 p-1 rounded">Nota Final = (Média Interna x P1%) + (Exame x P2%)</code>
                     </p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="examInternal">Peso da Média Interna (P1%)</label>
                            <div className="relative">
                                <input 
                                    id="examInternal" 
                                    name="examInternal"
                                    type="number" 
                                    value={formData.examWeights?.internal || 50} 
                                    onChange={handleChange}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-8"
                                />
                                <span className="absolute right-3 top-2 text-gray-400">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="examWeight">Peso do Exame (P2%)</label>
                            <div className="relative">
                                <input 
                                    id="examWeight" 
                                    name="examWeight"
                                    type="number" 
                                    value={formData.examWeights?.exam || 50} 
                                    onChange={handleChange}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-8"
                                />
                                <span className="absolute right-3 top-2 text-gray-400">%</span>
                            </div>
                        </div>
                     </div>

                    <div className="flex items-center">
                        <button type="submit" className="w-full md:w-auto bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform transform hover:scale-105">
                            Salvar Configurações
                        </button>
                        {isSaved && <span className="ml-4 text-green-600 text-sm font-semibold">Salvo!</span>}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SchoolCapacitySettings;
