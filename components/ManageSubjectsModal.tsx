
import React, { useState, useEffect } from 'react';
import { AcademicYear, Subject, ClassLevelSubjects } from '../types';
import { CloseIcon, TrashIcon } from './icons/IconComponents';

interface ManageSubjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    academicYear: AcademicYear | null;
    onSave: (academicYear: AcademicYear) => void;
}

const ManageSubjectsModal: React.FC<ManageSubjectsModalProps> = ({ isOpen, onClose, academicYear, onSave }) => {
    const [subjectsByClass, setSubjectsByClass] = useState<Record<string, Subject[]>>({});
    const [hasExamByClass, setHasExamByClass] = useState<Record<string, boolean>>({});
    const [newSubjectInputs, setNewSubjectInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        if (academicYear) {
            const initialSubjects: Record<string, Subject[]> = {};
            const initialHasExam: Record<string, boolean> = {};
            const initialInputs: Record<string, string> = {};
            
            Array.from({ length: 12 }, (_, i) => `${i + 1}ª Classe`).forEach(cl => {
                const existing = academicYear.subjectsByClass?.find(sbc => sbc.classLevel === cl);
                initialSubjects[cl] = existing ? existing.subjects : [];
                initialHasExam[cl] = existing ? !!existing.hasExam : false;
                initialInputs[cl] = '';
            });

            setSubjectsByClass(initialSubjects);
            setHasExamByClass(initialHasExam);
            setNewSubjectInputs(initialInputs);
        }
    }, [academicYear]);

    if (!isOpen || !academicYear) return null;
    
    const handleAddSubject = (classLevel: string) => {
        const subjectName = newSubjectInputs[classLevel]?.trim();
        if (subjectName && !subjectsByClass[classLevel].some(s => s.name.toLowerCase() === subjectName.toLowerCase())) {
            const newSubject: Subject = { id: `sub_${Date.now()}`, name: subjectName };
            setSubjectsByClass(prev => ({
                ...prev,
                [classLevel]: [...prev[classLevel], newSubject]
            }));
            setNewSubjectInputs(prev => ({...prev, [classLevel]: ''}));
        }
    };

    const handleRemoveSubject = (classLevel: string, subjectId: string) => {
        setSubjectsByClass(prev => ({
            ...prev,
            [classLevel]: prev[classLevel].filter(s => s.id !== subjectId)
        }));
    };

    const handleToggleExam = (classLevel: string) => {
        setHasExamByClass(prev => ({
            ...prev,
            [classLevel]: !prev[classLevel]
        }));
    };
    
    const handleSave = () => {
        const updatedSubjectsByClass: ClassLevelSubjects[] = Object.keys(subjectsByClass)
            .map((classLevel) => ({ 
                classLevel, 
                subjects: subjectsByClass[classLevel],
                hasExam: hasExamByClass[classLevel]
            }))
            .filter(sbc => sbc.subjects.length > 0 || sbc.hasExam); // Save if has subjects OR has exam config
        
        onSave({ ...academicYear, subjectsByClass: updatedSubjectsByClass });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Gerir Disciplinas e Exames - {academicYear.year}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-6">
                    {Object.keys(subjectsByClass).map(classLevel => (
                        <div key={classLevel} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-md text-gray-700">{classLevel}</h4>
                                <label className="flex items-center space-x-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={hasExamByClass[classLevel]} 
                                        onChange={() => handleToggleExam(classLevel)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-gray-600">Classe com Exame?</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ul className="space-y-2">
                                    {subjectsByClass[classLevel].map(subject => (
                                        <li key={subject.id} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm">
                                            <span className="text-sm text-gray-800">{subject.name}</span>
                                            <button onClick={() => handleRemoveSubject(classLevel, subject.id)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                    {subjectsByClass[classLevel].length === 0 && <p className="text-xs text-gray-500 italic">Nenhuma disciplina adicionada.</p>}
                                </ul>
                                <div className="flex items-start space-x-2">
                                    <input
                                        type="text"
                                        placeholder="Nova disciplina"
                                        value={newSubjectInputs[classLevel]}
                                        onChange={e => setNewSubjectInputs(prev => ({ ...prev, [classLevel]: e.target.value }))}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubject(classLevel)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button onClick={() => handleAddSubject(classLevel)} className="bg-indigo-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-indigo-600 text-sm">
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </main>
                
                <footer className="flex items-center justify-end p-4 border-t bg-gray-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 mr-2">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
                        Salvar Alterações
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ManageSubjectsModal;
