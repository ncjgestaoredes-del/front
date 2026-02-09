
import React, { useState, useMemo } from 'react';
import { Turma, Student, AcademicYear, SchoolSettings, User, UserRole } from '../types';
import CreateTurmaModal from './CreateTurmaModal';
import { EditIcon, TrashIcon, UsersIcon, GraduationCapIcon } from './icons/IconComponents';
import TurmaDetails from './TurmaDetails';

interface TurmaManagementProps {
    turmas: Turma[];
    onTurmasChange: (turmas: Turma[]) => void;
    students: Student[];
    academicYears: AcademicYear[];
    schoolSettings: SchoolSettings;
    users: User[];
    onStudentsChange?: (students: Student[]) => void; // Necessário para salvar notas
    currentUser: User;
}

const TurmaManagement: React.FC<TurmaManagementProps> = (props) => {
    const { turmas, onTurmasChange, students, academicYears, schoolSettings, users, onStudentsChange, currentUser } = props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
    const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);

    const activeYears = useMemo(() => academicYears.filter(ay => ay.status === 'Em Curso' || ay.status === 'Planeado'), [academicYears]);
    const [yearFilter, setYearFilter] = useState<string>(activeYears[0]?.year.toString() || '');

    const handleOpenModal = (e?: React.MouseEvent, turma: Turma | null = null) => {
        if(e) e.stopPropagation();
        setEditingTurma(turma);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingTurma(null);
        setIsModalOpen(false);
    };

    const handleSaveTurma = (turmaData: Turma) => {
        const existing = turmas.find(t => t.id === turmaData.id);
        if (existing) {
            onTurmasChange(turmas.map(t => t.id === turmaData.id ? turmaData : t));
        } else {
            onTurmasChange([...turmas, turmaData]);
        }
        handleCloseModal();
    };

    const handleDeleteTurma = (e: React.MouseEvent, turmaId: string) => {
        e.stopPropagation();
        if (window.confirm("Tem certeza que deseja apagar esta turma? Os alunos ficarão sem turma.")) {
            onTurmasChange(turmas.filter(t => t.id !== turmaId));
            if (selectedTurma?.id === turmaId) setSelectedTurma(null);
        }
    };
    
    const filteredTurmas = useMemo(() => {
        let filtered = turmas.filter(t => t.academicYear.toString() === yearFilter);

        // Se for professor, mostrar apenas as turmas onde ele leciona
        if (currentUser.role === UserRole.PROFESSOR) {
            filtered = filtered.filter(t => {
                // Verifica lista de assignments
                if (t.teachers) {
                    return t.teachers.some(assignment => assignment.teacherId === currentUser.id);
                }
                // Fallback para estrutura antiga (apenas para compatibilidade)
                // @ts-ignore
                if (t.teacherIds) return t.teacherIds.includes(currentUser.id);
                // @ts-ignore
                if (t.teacherId) return t.teacherId === currentUser.id;
                
                return false;
            });
        }

        return filtered;
    }, [turmas, yearFilter, currentUser]);

    const getTeacherDisplayInfo = (turma: Turma) => {
        if (!turma.teachers && !// @ts-ignore
            turma.teacherIds) return <span className="text-gray-400 italic">Sem professores</span>;

        // Normalize data
        let assignments = turma.teachers || [];
        // Handle legacy data if any
        if (assignments.length === 0 && // @ts-ignore
            turma.teacherIds) {
             // @ts-ignore
             assignments = turma.teacherIds.map((id: string) => ({ teacherId: id, subjectIds: [] }));
        }
        if (assignments.length === 0 && // @ts-ignore
             turma.teacherId) {
             // @ts-ignore
             assignments = [{ teacherId: turma.teacherId, subjectIds: [] }];
        }

        if (assignments.length === 0) return <span className="text-gray-400 italic">Sem professores</span>;

        // Find subject names map for this class level and year
        const yearData = academicYears.find(ay => ay.year === turma.academicYear);
        const classSubjects = yearData?.subjectsByClass?.find(cs => cs.classLevel === turma.classLevel)?.subjects || [];
        
        return (
            <ul className="mt-1 space-y-1">
                {assignments.map((assign, idx) => {
                    const teacher = users.find(u => u.id === assign.teacherId);
                    if (!teacher) return null;
                    
                    const subjectNames = assign.subjectIds
                        .map(sid => classSubjects.find(s => s.id === sid)?.name)
                        .filter(Boolean)
                        .join(', ');

                    return (
                        <li key={idx} className="text-sm text-gray-700">
                            <span className="font-medium">{teacher.name}</span>
                            {subjectNames && (
                                <span className="text-xs text-gray-500 ml-1">({subjectNames})</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    };

    const canCreateTurma = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SECRETARIA;

    // Render Detail View
    if (selectedTurma) {
        const yearData = academicYears.find(ay => ay.year === selectedTurma.academicYear);
        const classLevelData = yearData?.subjectsByClass?.find(cl => cl.classLevel === selectedTurma.classLevel);
        const subjectsForTurma = classLevelData?.subjects || [];
        const hasExam = classLevelData?.hasExam || false;
            
        return (
            <TurmaDetails 
                turma={selectedTurma}
                onBack={() => setSelectedTurma(null)}
                allStudents={students}
                subjects={subjectsForTurma}
                onUpdateStudents={onStudentsChange || (() => {})}
                settings={schoolSettings}
                currentUser={currentUser}
                hasExam={hasExam}
            />
        );
    }

    // Render List View
    return (
        <>
            <CreateTurmaModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTurma}
                existingTurma={editingTurma}
                {...props}
            />
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Gestão de Turmas</h3>
                        <p className="text-sm text-gray-500">
                            {currentUser.role === UserRole.PROFESSOR 
                                ? "Visualize suas turmas e gerencie as notas." 
                                : "Crie e organize as turmas para o ano letivo."}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 mt-4 md:mt-0">
                         <div className="flex items-center space-x-2">
                                <label htmlFor="year-filter" className="text-sm font-medium text-gray-700">Ano Letivo:</label>
                                <select
                                    id="year-filter"
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                >
                                    {activeYears.map(year => (
                                        <option key={year.id} value={year.year}>{year.year}</option>
                                    ))}
                                </select>
                            </div>
                        {canCreateTurma && (
                            <button
                                onClick={(e) => handleOpenModal(e)}
                                className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform transform hover:scale-105 whitespace-nowrap"
                            >
                                + Criar Turma
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTurmas.length > 0 ? filteredTurmas.map(turma => (
                        <div 
                            key={turma.id} 
                            onClick={() => setSelectedTurma(turma)}
                            className="bg-gray-50 border rounded-lg p-4 flex flex-col justify-between shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer"
                        >
                            <div>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-lg text-indigo-900">{turma.name}</h4>
                                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">{turma.shift}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 mb-2">
                                    <span>{turma.classLevel}</span>
                                    {turma.room && <span className="mx-2">•</span>}
                                    {turma.room && <span className="font-medium text-gray-700">{turma.room}</span>}
                                </div>
                                
                                <div className="flex items-start border-t pt-2 border-gray-200">
                                    <GraduationCapIcon className="w-4 h-4 mr-2 text-gray-400 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        {getTeacherDisplayInfo(turma)}
                                    </div>
                                </div>

                                <div className="flex items-center text-sm text-gray-500 mt-3 pt-2 border-t border-gray-200">
                                    <UsersIcon className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{turma.studentIds.length} / {schoolSettings.studentsPerClass} alunos</span>
                                </div>
                            </div>
                            {canCreateTurma && (
                                <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                                    <button onClick={(e) => handleOpenModal(e, turma)} className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50 transition-colors" title="Editar">
                                        <EditIcon className="w-5 h-5"/>
                                    </button>
                                    <button onClick={(e) => handleDeleteTurma(e, turma.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors" title="Excluir">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            )}
                        </div>
                    )) : (
                         <div className="col-span-full text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            <p className="text-lg">Nenhuma turma encontrada para o ano letivo de {yearFilter}.</p>
                            {currentUser.role === UserRole.PROFESSOR ? (
                                <p className="text-sm mt-2 text-red-500">Você não está associado a nenhuma turma neste ano.</p>
                            ) : (
                                <p className="text-sm mt-2">Clique em "Criar Turma" para começar a organização.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TurmaManagement;
