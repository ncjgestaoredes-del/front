
import React, { useState, useEffect, useMemo } from 'react';
import { Turma, Student, AcademicYear, SchoolSettings, Shift, User, UserRole, Subject, TeacherAssignment, TeacherAvailability } from '../types';
import { CloseIcon, UsersIcon, GraduationCapIcon, ChevronDownIcon } from './icons/IconComponents';

interface CreateTurmaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (turma: Turma) => void;
    existingTurma: Turma | null;
    turmas: Turma[];
    students: Student[];
    academicYears: AcademicYear[];
    schoolSettings: SchoolSettings;
    users: User[];
}

interface TeacherAssignmentState {
    subjectIds: string[];
    isSubstitute: boolean;
    justification: string;
}

const CreateTurmaModal: React.FC<CreateTurmaModalProps> = (props) => {
    const { isOpen, onClose, onSave, existingTurma, turmas, students, academicYears, schoolSettings, users } = props;

    const [academicYear, setAcademicYear] = useState<string>('');
    const [classLevel, setClassLevel] = useState<string>('');
    const [name, setName] = useState('');
    const [room, setRoom] = useState('');
    const [shift, setShift] = useState<Shift>('Manhã');
    
    // State to manage teachers and their subjects: { teacherId: { subjectIds, isSubstitute, justification } }
    const [teacherAssignments, setTeacherAssignments] = useState<Record<string, TeacherAssignmentState>>({});
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');
    const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (existingTurma) {
                setAcademicYear(existingTurma.academicYear.toString());
                setClassLevel(existingTurma.classLevel);
                setName(existingTurma.name);
                setRoom(existingTurma.room || '');
                setShift(existingTurma.shift);
                
                // Reconstruct assignments map
                const assignments: Record<string, TeacherAssignmentState> = {};
                if (existingTurma.teachers) {
                    existingTurma.teachers.forEach(t => {
                        assignments[t.teacherId] = {
                            subjectIds: t.subjectIds || [],
                            isSubstitute: !!t.isSubstitute,
                            justification: t.justification || ''
                        };
                    });
                } else {
                    // Legacy support
                    // @ts-ignore
                    const legacyIds = existingTurma.teacherIds || (existingTurma.teacherId ? [existingTurma.teacherId] : []);
                    legacyIds.forEach((id: string) => {
                         assignments[id] = { subjectIds: [], isSubstitute: false, justification: '' };
                    });
                }
                setTeacherAssignments(assignments);
                setSelectedStudentIds(new Set(existingTurma.studentIds));
            } else {
                const activeYear = academicYears.find(ay => ay.status === 'Em Curso' || ay.status === 'Planeado');
                setAcademicYear(activeYear ? activeYear.year.toString() : '');
                setClassLevel('');
                setName('');
                setRoom('');
                setShift('Manhã');
                setTeacherAssignments({});
                setSelectedStudentIds(new Set());
            }
            setError('');
            setExpandedTeacherId(null);
        }
    }, [isOpen, existingTurma, academicYears]);

    const availableTeachers = useMemo(() => {
        return users.filter(u => 
            u.role === UserRole.PROFESSOR && 
            u.availability?.includes(shift as TeacherAvailability)
        );
    }, [users, shift]);

    const availableSubjects = useMemo(() => {
        if (!academicYear || !classLevel) return [];
        const yearData = academicYears.find(ay => ay.year.toString() === academicYear);
        if (!yearData?.subjectsByClass) return [];
        
        const classSubjects = yearData.subjectsByClass.find(cs => cs.classLevel === classLevel);
        return classSubjects ? classSubjects.subjects : [];
    }, [academicYear, classLevel, academicYears]);

    const shiftCapacity = useMemo(() => 
        schoolSettings.totalClassrooms * schoolSettings.studentsPerClass,
    [schoolSettings]);

    const studentsInSelectedShiftOtherClasses = useMemo(() => {
        if (!academicYear || !shift) return 0;
        return turmas
            .filter(t => t.academicYear.toString() === academicYear && t.shift === shift && t.id !== existingTurma?.id)
            .reduce((acc, turma) => acc + turma.studentIds.length, 0);
    }, [turmas, academicYear, shift, existingTurma]);

    const currentShiftTotal = studentsInSelectedShiftOtherClasses + selectedStudentIds.size;
    const remainingShiftSpots = shiftCapacity - currentShiftTotal;

    const availableStudents = useMemo(() => {
        if (!classLevel || !academicYear) return [];

        // 1. Filter by Class Level
        // 2. Check if student is already in another class for this year
        const studentsInOtherTurmasThisYear = new Set(
            turmas
                .filter(t => t.academicYear.toString() === academicYear && t.id !== existingTurma?.id)
                .flatMap(t => t.studentIds)
        );
        
        return students.filter(s => {
            // Must match class level
            if (s.desiredClass !== classLevel) return false;
            
            // Must not be in another class
            if (studentsInOtherTurmasThisYear.has(s.id)) return false;

            // Must have PAID for enrollment or renewal for this academic year
            const hasPaid = s.payments?.some(p => 
                p.academicYear === parseInt(academicYear) && 
                (p.type === 'Matrícula' || p.type === 'Renovação')
            );

            // If existing student in editing mode, always allow them (assuming they were valid when added)
            if (existingTurma && selectedStudentIds.has(s.id)) return true;

            return !!hasPaid;
        });
    }, [classLevel, academicYear, students, turmas, existingTurma, selectedStudentIds]);

    const handleStudentSelect = (studentId: string) => {
        setError('');
        const newSet = new Set(selectedStudentIds);
        
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            if (newSet.size >= schoolSettings.studentsPerClass) {
                alert(`O limite de alunos por turma é ${schoolSettings.studentsPerClass}.`);
                return;
            }
            if (currentShiftTotal + 1 > shiftCapacity) {
                alert(`O limite de ${shiftCapacity} alunos para o turno da ${shift.toLowerCase()} foi atingido. Não é possível adicionar mais alunos.`);
                return;
            }
            newSet.add(studentId);
        }
        setSelectedStudentIds(newSet);
    };

    const handleTeacherToggle = (teacherId: string) => {
        setTeacherAssignments(prev => {
            const newState = { ...prev };
            if (newState[teacherId]) {
                delete newState[teacherId]; // Remove teacher
                if (expandedTeacherId === teacherId) setExpandedTeacherId(null);
            } else {
                newState[teacherId] = { subjectIds: [], isSubstitute: false, justification: '' }; // Add teacher
                setExpandedTeacherId(teacherId); // Auto expand to select subjects
            }
            return newState;
        });
    };

    const handleSubjectToggle = (teacherId: string, subjectId: string) => {
        setTeacherAssignments(prev => {
            const currentData = prev[teacherId];
            if (!currentData) return prev;

            const currentSubjects = currentData.subjectIds;
            const newSubjects = currentSubjects.includes(subjectId)
                ? currentSubjects.filter(id => id !== subjectId)
                : [...currentSubjects, subjectId];
            
            return { ...prev, [teacherId]: { ...currentData, subjectIds: newSubjects } };
        });
    };

    const handleSubstitutionToggle = (teacherId: string, isSubstitute: boolean) => {
        setTeacherAssignments(prev => {
            const currentData = prev[teacherId];
            if (!currentData) return prev;
            return { ...prev, [teacherId]: { ...currentData, isSubstitute } };
        });
    };

    const handleJustificationChange = (teacherId: string, justification: string) => {
        setTeacherAssignments(prev => {
            const currentData = prev[teacherId];
            if (!currentData) return prev;
            return { ...prev, [teacherId]: { ...currentData, justification } };
        });
    };

    const toggleExpandTeacher = (teacherId: string) => {
        setExpandedTeacherId(prev => prev === teacherId ? null : teacherId);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name || !academicYear || !classLevel || !shift) {
            setError("Todos os campos (exceto professores) devem ser preenchidos.");
            return;
        }

        const duplicateName = turmas.find(t => 
            t.academicYear.toString() === academicYear &&
            t.name.trim().toLowerCase() === name.trim().toLowerCase() &&
            t.id !== existingTurma?.id
        );

        if (duplicateName) {
            setError(`Já existe uma turma com o nome "${name}" neste ano letivo.`);
            return;
        }

        const conflictingTurma = turmas.find(t => 
            t.academicYear.toString() === academicYear &&
            t.classLevel === classLevel &&
            t.shift !== shift &&
            t.id !== existingTurma?.id
        );

        if (conflictingTurma) {
            setError(`Conflito de Turno: A ${classLevel} já possui turmas registadas no turno da ${conflictingTurma.shift}.`);
            return;
        }

        if (currentShiftTotal > shiftCapacity) {
            setError(`O limite de ${shiftCapacity} alunos para o turno foi excedido.`);
            return;
        }

        // Convert assignments map to array safely
        const finalTeachers: TeacherAssignment[] = Object.keys(teacherAssignments).map(teacherId => {
            const assignmentData = teacherAssignments[teacherId] as TeacherAssignmentState;
            return {
                teacherId,
                subjectIds: assignmentData.subjectIds,
                isSubstitute: assignmentData.isSubstitute,
                justification: assignmentData.justification
            };
        });

        const newTurma: Turma = {
            id: existingTurma?.id || `turma_${Date.now()}`,
            name,
            academicYear: parseInt(academicYear, 10),
            classLevel,
            shift,
            teachers: finalTeachers,
            studentIds: Array.from(selectedStudentIds),
            room: room || undefined,
        };
        onSave(newTurma);
    };

    if (!isOpen) return null;

    const shiftOptions: Shift[] = ['Manhã', 'Tarde', 'Noite'];
    const teacherCount = Object.keys(teacherAssignments).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{existingTurma ? 'Editar Turma' : 'Criar Nova Turma'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <main className="p-6 flex-1 overflow-y-auto space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="label" htmlFor="turma-year">Ano Letivo*</label>
                                <select id="turma-year" value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="input" required>
                                    <option value="" disabled>Selecione</option>
                                    {academicYears.map(ay => <option key={ay.id} value={ay.year}>{ay.year}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label" htmlFor="turma-class">Classe*</label>
                                <select id="turma-class" value={classLevel} onChange={e => setClassLevel(e.target.value)} className="input" required>
                                    <option value="" disabled>Selecione</option>
                                    {Array.from({ length: 12 }, (_, i) => <option key={i} value={`${i + 1}ª Classe`}>{i + 1}ª Classe</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="label" htmlFor="turma-name">Nome da Turma*</label>
                                <input id="turma-name" type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Ex: Turma A" required />
                            </div>
                            <div>
                                <label className="label" htmlFor="turma-shift">Turno*</label>
                                <select id="turma-shift" value={shift} onChange={e => setShift(e.target.value as Shift)} className="input" required>
                                    {shiftOptions.slice(0, schoolSettings.shifts).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label" htmlFor="turma-room">Sala</label>
                                <input id="turma-room" type="text" value={room} onChange={e => setRoom(e.target.value)} className="input" placeholder="Ex: Sala 1" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Teacher Selection with Subjects */}
                             <div className="flex flex-col h-full min-h-[300px]">
                                <h4 className="font-bold text-md text-gray-700 mb-2 flex items-center">
                                    <GraduationCapIcon className="w-4 h-4 mr-2"/>
                                    Professores e Disciplinas
                                </h4>
                                <div className="flex flex-col p-2 bg-gray-100 rounded-md mb-2">
                                    <span className="text-sm text-gray-600">{teacherCount} professor(es) selecionado(s)</span>
                                </div>
                                
                                {(!academicYear || !classLevel) ? (
                                     <div className="border rounded-lg p-4 bg-gray-50 text-center text-sm text-gray-500">
                                        Selecione Ano e Classe para ver as disciplinas.
                                     </div>
                                ) : availableSubjects.length === 0 ? (
                                     <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200 text-center text-sm text-yellow-800">
                                        Não há disciplinas cadastradas para {classLevel} em {academicYear}. <br/>
                                        <span className="text-xs">Vá em Configurações > Gestão de Anos Letivos.</span>
                                     </div>
                                ) : (
                                    <div className="border rounded-lg flex-1 overflow-y-auto p-2 bg-white">
                                        {availableTeachers.length > 0 ? (
                                            <ul className="divide-y divide-gray-100">
                                                {availableTeachers.map(teacher => {
                                                    const teacherState = teacherAssignments[teacher.id];
                                                    const isSelected = !!teacherState;
                                                    const assignedSubjects = teacherState?.subjectIds || [];
                                                    const isSubstitute = teacherState?.isSubstitute || false;
                                                    const justification = teacherState?.justification || '';
                                                    const isExpanded = expandedTeacherId === teacher.id;

                                                    return (
                                                    <li key={teacher.id} className="py-1">
                                                        <div className={`rounded-md transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`}>
                                                            <div className="flex items-center p-2 justify-between">
                                                                <label className="flex items-center cursor-pointer flex-1">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected}
                                                                        onChange={() => handleTeacherToggle(teacher.id)}
                                                                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <div className="ml-3 flex flex-col">
                                                                        <span className="text-sm font-medium text-gray-800">{teacher.name}</span>
                                                                        <span className="text-xs text-gray-500">{teacher.specialization || 'Geral'}</span>
                                                                    </div>
                                                                </label>
                                                                {isSelected && (
                                                                    <button 
                                                                        onClick={(e) => { e.preventDefault(); toggleExpandTeacher(teacher.id); }}
                                                                        className="p-1 rounded-full hover:bg-indigo-100 text-indigo-500"
                                                                    >
                                                                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            
                                                            {isSelected && isExpanded && (
                                                                <div className="px-3 pb-3 pl-9">
                                                                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Disciplinas:</p>
                                                                    <div className="grid grid-cols-1 gap-1 mb-3">
                                                                        {availableSubjects.map(sub => (
                                                                            <label key={sub.id} className="flex items-center space-x-2 text-sm text-gray-700 hover:text-indigo-700 cursor-pointer">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={assignedSubjects.includes(sub.id)}
                                                                                    onChange={() => handleSubjectToggle(teacher.id, sub.id)}
                                                                                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                                                                />
                                                                                <span>{sub.name}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                    
                                                                    <div className="pt-2 border-t border-indigo-200">
                                                                        <label className="flex items-center space-x-2 text-sm text-gray-800 mb-2 cursor-pointer">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={isSubstitute} 
                                                                                onChange={(e) => handleSubstitutionToggle(teacher.id, e.target.checked)}
                                                                                className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                                                                            />
                                                                            <span className="font-semibold text-xs uppercase tracking-wide text-amber-700">Professor Substituto</span>
                                                                        </label>
                                                                        
                                                                        {isSubstitute && (
                                                                            <input 
                                                                                type="text" 
                                                                                value={justification}
                                                                                onChange={(e) => handleJustificationChange(teacher.id, e.target.value)}
                                                                                placeholder="Justificativa / Motivo da substituição"
                                                                                className="w-full p-2 text-xs border border-amber-300 rounded bg-amber-50 focus:ring-1 focus:ring-amber-500"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                )})}
                                            </ul>
                                        ) : (
                                            <p className="text-center text-sm text-gray-500 py-4">
                                                Nenhum professor disponível para o turno {shift}.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Student Selection */}
                            <div className="flex flex-col h-full min-h-[300px]">
                                <h4 className="font-bold text-md text-gray-700 mb-2 flex items-center">
                                     <UsersIcon className="w-4 h-4 mr-2"/>
                                     Selecionar Alunos
                                </h4>
                                <div className="flex flex-col sm:flex-row items-center justify-between p-2 bg-gray-100 rounded-md mb-2 gap-2">
                                    <div className="flex items-center space-x-2">
                                        {shift && (
                                        <div className={`text-xs font-semibold px-3 py-1 rounded-full ${remainingShiftSpots >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                            Vagas turno: {remainingShiftSpots}
                                        </div>
                                        )}
                                        <div className="flex items-center text-sm font-semibold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                                            {selectedStudentIds.size} / {schoolSettings.studentsPerClass}
                                        </div>
                                    </div>
                                </div>
                                <div className="border rounded-lg flex-1 overflow-y-auto p-2 bg-white">
                                {classLevel ? (
                                        availableStudents.length > 0 ? (
                                            <>
                                                <p className="text-xs text-gray-500 px-2 pb-2">Apenas alunos com Matrícula ou Renovação paga para {academicYear} são exibidos.</p>
                                                <ul className="divide-y divide-gray-100">
                                                    {availableStudents.map(student => (
                                                        <li key={student.id}>
                                                            <label className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={selectedStudentIds.has(student.id)}
                                                                    onChange={() => handleStudentSelect(student.id)}
                                                                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <img src={student.profilePictureUrl} alt={student.name} className="w-8 h-8 rounded-full object-cover mx-3" />
                                                                <span className="text-sm text-gray-800">{student.name}</span>
                                                            </label>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        ) : (
                                            <p className="text-center text-sm text-gray-500 py-4">
                                                Nenhum aluno disponível. <br/>
                                                <span className="text-xs">(Verifique se há alunos na classe {classLevel} com pagamento regularizado para {academicYear})</span>
                                            </p>
                                        )
                                ) : (
                                    <p className="text-center text-sm text-gray-500 py-4">Selecione Ano e Classe primeiro.</p>
                                )}
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="flex items-center justify-end p-4 border-t bg-gray-50 rounded-b-2xl">
                        {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 mr-2">
                            Cancelar
                        </button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
                           {existingTurma ? 'Salvar Alterações' : 'Criar Turma'}
                        </button>
                    </footer>
                </form>
                 <style>{`
                    .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
                    .input { width: 100%; padding: 8px 12px; border: 1px solid #D1D5DB; border-radius: 8px; transition: all 0.2s; background-color: white; }
                    .input:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #6366F1; box-shadow: 0 0 0 2px #a5b4fc; }
                `}</style>
            </div>
        </div>
    );
};

export default CreateTurmaModal;
