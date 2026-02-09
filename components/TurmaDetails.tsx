
import React, { useState, useMemo, useEffect } from 'react';
import { Turma, Student, Subject, SchoolSettings, Grade, User, UserRole, AttendanceRecord, BehaviorEvaluation, ExamResult } from '../types';
import { ChevronDownIcon, ChartBarIcon, CollectionIcon, BookOpenIcon, CalendarIcon, CheckCircleIcon, StarIcon, ExclamationTriangleIcon, PrinterIcon, CloseIcon, TableCellsIcon } from './icons/IconComponents';
import { printClassPauta, exportClassPautaToExcel, PrintOptions } from './ReceiptUtils';

interface TurmaDetailsProps {
    turma: Turma;
    onBack: () => void;
    allStudents: Student[];
    subjects: Subject[];
    onUpdateStudents: (students: Student[]) => void;
    settings: SchoolSettings;
    currentUser: User;
    hasExam?: boolean; 
}

type PeriodOption = '1º Trimestre' | '2º Trimestre' | '3º Trimestre' | 'Situação Anual';
type ViewMode = 'grades' | 'attendance' | 'behavior';

const periods: PeriodOption[] = ['1º Trimestre', '2º Trimestre', '3º Trimestre', 'Situação Anual'];

const behaviorCriteriaList = [
    { key: 'assiduidade', label: '1. Assiduidade (Pontualidade/Presença)' },
    { key: 'disciplina', label: '2. Disciplina e Respeito' },
    { key: 'participacao', label: '3. Participação' },
    { key: 'responsabilidade', label: '4. Responsabilidade' },
    { key: 'socializacao', label: '5. Socialização' },
    { key: 'atitude', label: '6. Atitude' },
    { key: 'organizacao', label: '7. Organização' },
] as const;

// --- PRINT MODAL COMPONENT ---
interface PrintSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjects: Subject[];
    onConfirm: (options: PrintOptions) => void;
    onExport: (options: PrintOptions) => void;
}

const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({ isOpen, onClose, subjects, onConfirm, onExport }) => {
    const [period, setPeriod] = useState<PeriodOption>('1º Trimestre');
    const [type, setType] = useState<'general' | 'detailed' | 'general_detailed'>('general');
    const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <PrinterIcon className="w-5 h-5 mr-2 text-indigo-600" />
                        Imprimir / Exportar Pauta
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                        <select 
                            value={period} 
                            // @ts-ignore
                            onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                            {periods.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Relatório</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={type === 'general'} 
                                    onChange={() => setType('general')}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-800">Pauta Geral (Grelha de Notas)</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={type === 'general_detailed'} 
                                    onChange={() => setType('general_detailed')}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-800">Pauta Geral Detalhada (Todas disciplinas: ACS, MAC, AT, MF)</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={type === 'detailed'} 
                                    onChange={() => setType('detailed')}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-800">Pauta Detalhada (Por Disciplina)</span>
                            </label>
                        </div>
                    </div>
                    
                    {type === 'detailed' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Disciplina</label>
                            <select 
                                value={subjectId} 
                                onChange={(e) => setSubjectId(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-between gap-2">
                    <button onClick={onClose} className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg">
                        Cancelar
                    </button>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                if (type === 'detailed' && !subjectId) {
                                    alert('Selecione uma disciplina.');
                                    return;
                                }
                                onExport({ period, type, subjectId });
                                onClose();
                            }}
                            className="px-3 py-2 text-sm font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg shadow-sm flex items-center"
                        >
                            <TableCellsIcon className="w-4 h-4 mr-1" />
                            Excel
                        </button>
                        <button 
                            onClick={() => {
                                if (type === 'detailed' && !subjectId) {
                                    alert('Selecione uma disciplina.');
                                    return;
                                }
                                onConfirm({ period, type, subjectId });
                                onClose();
                            }}
                            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center"
                        >
                            <PrinterIcon className="w-4 h-4 mr-1" />
                            Imprimir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TurmaDetails: React.FC<TurmaDetailsProps> = ({ turma, onBack, allStudents, subjects, onUpdateStudents, settings, currentUser, hasExam = false }) => {
    // Navigation & View State
    const [activeView, setActiveView] = useState<ViewMode>('grades');
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1º Trimestre');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    
    // Grade States
    const [unsavedChanges, setUnsavedChanges] = useState<Record<string, Grade>>({});
    const [unsavedExamChanges, setUnsavedExamChanges] = useState<Record<string, number>>({}); 

    const [isOverviewMode, setIsOverviewMode] = useState(false);
    const [isDetailedSummary, setIsDetailedSummary] = useState(false);
    
    // Attendance States
    const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [attendanceChanges, setAttendanceChanges] = useState<Record<string, 'Presente' | 'Ausente' | 'Atrasado'>>({});

    // Behavior States
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [behaviorChanges, setBehaviorChanges] = useState<Record<string, BehaviorEvaluation>>({});

    // Common State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Filter subjects based on user role and assignment
    const availableSubjects = useMemo(() => {
        if (currentUser.role === UserRole.PROFESSOR) {
            // Find assignments for this teacher in this turma
            const assignment = turma.teachers?.find(t => t.teacherId === currentUser.id);
            if (!assignment) return []; 
            return subjects.filter(s => assignment.subjectIds.includes(s.id));
        }
        // Admins/Secretaria see all subjects
        return subjects;
    }, [subjects, turma, currentUser]);

    // Ensure a subject is selected if available
    useEffect(() => {
        if (availableSubjects.length > 0) {
            if (!selectedSubjectId || !availableSubjects.find(s => s.id === selectedSubjectId)) {
                setSelectedSubjectId(availableSubjects[0].id);
            }
        } else {
            setSelectedSubjectId('');
        }
    }, [availableSubjects, selectedSubjectId]);

    const studentsInTurma = useMemo(() => {
        return allStudents
            .filter(s => turma.studentIds.includes(s.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allStudents, turma]);

    const selectedSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);

    const canEditGrades = currentUser.role === UserRole.PROFESSOR && !isOverviewMode;
    const canEditAttendance = currentUser.role === UserRole.PROFESSOR;
    const canEditBehavior = currentUser.role === UserRole.PROFESSOR;

    const handlePrintConfirm = (options: PrintOptions) => {
        printClassPauta(turma, studentsInTurma, subjects, options, settings, hasExam);
    };

    const handleExportExcel = (options: PrintOptions) => {
        exportClassPautaToExcel(turma, studentsInTurma, subjects, options, settings, hasExam);
    };

    // --- GRADES LOGIC ---

    const calculateFinalGrade = (acs1: number = 0, acs2: number = 0, at: number = 0): number => {
        const p1 = settings.evaluationWeights?.p1 || 40;
        const p2 = settings.evaluationWeights?.p2 || 60;
        
        const mediaACS = (acs1 + acs2) / 2;
        const final = ((mediaACS * p1) + (at * p2)) / (p1 + p2);
        
        return parseFloat(final.toFixed(1));
    };

    const calculateExamFinalGrade = (mediaInterna: number, examGrade: number): number => {
        const p1 = settings.examWeights?.internal || 50; 
        const p2 = settings.examWeights?.exam || 50;     
        const totalWeight = p1 + p2;
        const final = ((mediaInterna * p1) + (examGrade * p2)) / totalWeight;
        return parseFloat(final.toFixed(1));
    };

    const getSubjectGrade = (student: Student, subjectName: string, period: string): number => {
        if (period === 'Situação Anual') {
            const t1 = getSubjectGrade(student, subjectName, '1º Trimestre');
            const t2 = getSubjectGrade(student, subjectName, '2º Trimestre');
            const t3 = getSubjectGrade(student, subjectName, '3º Trimestre');
            return parseFloat(((t1 + t2 + t3) / 3).toFixed(1));
        }
        const gradeObj = student.grades?.find(g => 
            g.subject === subjectName && 
            g.period === period &&
            g.academicYear === turma.academicYear
        );
        return gradeObj ? gradeObj.grade || 0 : 0;
    };

    const getDetailedGrades = (student: Student, subjectName: string, period: string) => {
        const gradeObj = student.grades?.find(g => 
            g.subject === subjectName && 
            g.period === period &&
            g.academicYear === turma.academicYear
        );
        const acs1 = gradeObj?.acs1 || 0;
        const acs2 = gradeObj?.acs2 || 0;
        const at = gradeObj?.at || 0;
        const mediaACS = parseFloat(((acs1 + acs2) / 2).toFixed(1));
        const finalGrade = calculateFinalGrade(acs1, acs2, at);
        return { acs1, acs2, mediaACS, at, finalGrade };
    };

    const getExamGrade = (student: Student, subjectName: string): number => {
        if (unsavedExamChanges[student.id] !== undefined && selectedSubject?.name === subjectName) {
            return unsavedExamChanges[student.id];
        }
        const exam = student.examGrades?.find(e => e.subject === subjectName && e.academicYear === turma.academicYear);
        return exam ? exam.grade : 0;
    };

    const handleGradeChange = (studentId: string, field: 'acs1' | 'acs2' | 'at', value: string) => {
        if (!canEditGrades || selectedPeriod === 'Situação Anual') return;
        const numValue = Math.min(20, Math.max(0, parseFloat(value) || 0));

        setUnsavedChanges(prev => {
            const student = studentsInTurma.find(s => s.id === studentId);
            if (!student || !selectedSubject) return prev;

            const existingGradeIndex = student.grades?.findIndex(g => 
                g.subject === selectedSubject.name && 
                g.period === selectedPeriod && 
                g.academicYear === turma.academicYear
            );

            const currentGradeObj = existingGradeIndex !== undefined && existingGradeIndex !== -1
                ? student.grades![existingGradeIndex] 
                : { 
                    subject: selectedSubject.name, 
                    period: selectedPeriod as '1º Trimestre' | '2º Trimestre' | '3º Trimestre', 
                    academicYear: turma.academicYear, 
                    acs1: 0, acs2: 0, at: 0, grade: 0 
                  };

            const prevChange = prev[`${studentId}`] || currentGradeObj;
            const updatedGradeObj = { ...prevChange, [field]: numValue } as Grade;
            updatedGradeObj.grade = calculateFinalGrade(updatedGradeObj.acs1 || 0, updatedGradeObj.acs2 || 0, updatedGradeObj.at || 0);

            return { ...prev, [`${studentId}`]: updatedGradeObj };
        });
        setSaveStatus('idle');
    };

    const handleExamChange = (studentId: string, value: string) => {
        if (!canEditGrades || selectedPeriod !== 'Situação Anual' || !hasExam) return;
        const numValue = Math.min(20, Math.max(0, parseFloat(value) || 0));
        setUnsavedExamChanges(prev => ({ ...prev, [studentId]: numValue }));
        setSaveStatus('idle');
    };

    const handleSaveGrades = () => {
        setSaveStatus('saving');
        const updatedStudents = [...allStudents];

        Object.entries(unsavedChanges).forEach(([studentId, val]) => {
            const newGrade = val as Grade;
            const studentIndex = updatedStudents.findIndex(s => s.id === studentId);
            if (studentIndex !== -1) {
                const student = { ...updatedStudents[studentIndex] };
                const grades = student.grades ? [...student.grades] : [];
                
                const gradeIndex = grades.findIndex(g => 
                    g.subject === newGrade.subject && 
                    g.period === newGrade.period &&
                    g.academicYear === newGrade.academicYear
                );

                if (gradeIndex !== -1) {
                    grades[gradeIndex] = newGrade;
                } else {
                    grades.push(newGrade);
                }
                student.grades = grades;
                updatedStudents[studentIndex] = student;
            }
        });

        if (selectedPeriod === 'Situação Anual' && hasExam && selectedSubject) {
             Object.entries(unsavedExamChanges).forEach(([studentId, gradeVal]) => {
                const studentIndex = updatedStudents.findIndex(s => s.id === studentId);
                 if (studentIndex !== -1) {
                    const student = { ...updatedStudents[studentIndex] };
                    const exams = student.examGrades ? [...student.examGrades] : [];
                    
                    const examIndex = exams.findIndex(e => e.subject === selectedSubject.name && e.academicYear === turma.academicYear);
                    const newExam: ExamResult = { subject: selectedSubject.name, grade: gradeVal as number, academicYear: turma.academicYear };

                    if (examIndex !== -1) {
                        exams[examIndex] = newExam;
                    } else {
                        exams.push(newExam);
                    }
                    student.examGrades = exams;
                    updatedStudents[studentIndex] = student;
                 }
             });
        }

        onUpdateStudents(updatedStudents);
        setUnsavedChanges({});
        setUnsavedExamChanges({});
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const getGradeValue = (student: Student, field: 'acs1' | 'acs2' | 'at' | 'grade', period: string = selectedPeriod): number => {
        if (period === selectedPeriod && unsavedChanges[student.id]) {
            return ((unsavedChanges[student.id] as any)[field] as number | undefined) ?? 0;
        }
        const gradeObj = student.grades?.find(g => 
            g.subject === selectedSubject?.name && 
            g.period === period &&
            g.academicYear === turma.academicYear
        );
        return gradeObj ? ((gradeObj as any)[field] as number | undefined) ?? 0 : 0;
    };

    // --- ATTENDANCE & BEHAVIOR LOGIC (Kept same as before) ---
    const getAttendanceStatus = (student: Student): 'Presente' | 'Ausente' | 'Atrasado' | '' => {
        if (attendanceChanges[student.id]) return attendanceChanges[student.id];
        const record = student.attendance?.find(a => a.date === attendanceDate);
        return record ? record.status : '';
    };

    const handleAttendanceChange = (studentId: string, status: 'Presente' | 'Ausente' | 'Atrasado') => {
        if (!canEditAttendance) return;
        setAttendanceChanges(prev => ({ ...prev, [studentId]: status }));
        setSaveStatus('idle');
    };

    const handleSaveAttendance = () => {
        setSaveStatus('saving');
        const updatedStudents = [...allStudents];
        studentsInTurma.forEach(student => {
            const newStatus = attendanceChanges[student.id];
            if (!newStatus) return; 
            const studentIndex = updatedStudents.findIndex(s => s.id === student.id);
            if (studentIndex !== -1) {
                const s = { ...updatedStudents[studentIndex] };
                const attendance = s.attendance ? [...s.attendance] : [];
                const recordIndex = attendance.findIndex(a => a.date === attendanceDate);
                const newRecord: AttendanceRecord = { date: attendanceDate, status: newStatus };
                if (recordIndex !== -1) attendance[recordIndex] = newRecord;
                else attendance.push(newRecord);
                s.attendance = attendance;
                updatedStudents[studentIndex] = s;
            }
        });
        onUpdateStudents(updatedStudents);
        setAttendanceChanges({});
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    useEffect(() => { setAttendanceChanges({}); }, [attendanceDate]);

    const getStudentBehaviorEval = (student: Student): BehaviorEvaluation => {
        if (behaviorChanges[student.id]) return behaviorChanges[student.id];
        const evalObj = student.behaviorEvaluations?.find(b => 
            b.period === selectedPeriod && b.academicYear === turma.academicYear
        );
        return evalObj || {
            period: selectedPeriod as any, academicYear: turma.academicYear,
            scores: { assiduidade: 0, disciplina: 0, participacao: 0, responsabilidade: 0, socializacao: 0, atitude: 0, organizacao: 0 },
            percentage: 0
        };
    };

    const handleStarClick = (studentId: string, criteria: keyof BehaviorEvaluation['scores'], score: number) => {
        if (!canEditBehavior || selectedPeriod === 'Situação Anual') return;
        setBehaviorChanges(prev => {
            const currentEval = getStudentBehaviorEval(allStudents.find(s => s.id === studentId)!);
            const newScores = { ...currentEval.scores, [criteria]: score };
            const totalScore = Object.values(newScores).reduce((a, b) => a + b, 0);
            const maxScore = 7 * 5; 
            const percentage = Math.round((totalScore / maxScore) * 100);
            return { ...prev, [studentId]: { ...currentEval, scores: newScores, percentage } };
        });
        setSaveStatus('idle');
    };

    const handleSaveBehavior = () => {
        setSaveStatus('saving');
        const updatedStudents = [...allStudents];
        Object.entries(behaviorChanges).forEach(([studentId, val]) => {
             const newVal = val as BehaviorEvaluation;
             const studentIndex = updatedStudents.findIndex(s => s.id === studentId);
             if (studentIndex !== -1) {
                 const student = { ...updatedStudents[studentIndex] };
                 const evaluations = student.behaviorEvaluations ? [...student.behaviorEvaluations] : [];
                 const evalIndex = evaluations.findIndex(e => e.period === newVal.period && e.academicYear === newVal.academicYear);
                 if(evalIndex !== -1) evaluations[evalIndex] = newVal;
                 else evaluations.push(newVal);
                 student.behaviorEvaluations = evaluations;
                 updatedStudents[studentIndex] = student;
             }
        });
        onUpdateStudents(updatedStudents);
        setBehaviorChanges({});
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const getBehaviorStatusColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600 bg-green-100';
        if (percentage >= 60) return 'text-blue-600 bg-blue-100';
        if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };
    
    const getBehaviorStatusText = (percentage: number) => {
        if (percentage === 0) return 'Não Avaliado';
        if (percentage >= 80) return 'Excelente';
        if (percentage >= 60) return 'Bom';
        if (percentage >= 40) return 'Regular';
        return 'Precisa Melhorar';
    };

    if (!selectedSubject && availableSubjects.length === 0 && activeView === 'grades') {
         return (
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <button onClick={onBack} className="text-indigo-600 font-semibold mb-4 flex items-center hover:underline">
                    ← Voltar para Turmas
                </button>
                <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg border border-dashed">
                    {currentUser.role === UserRole.PROFESSOR 
                        ? "Você não possui disciplinas atribuídas nesta turma."
                        : "Nenhuma disciplina encontrada para esta turma."}
                </div>
            </div>
        );
    }

    const hasChangesToSave = Object.keys(unsavedChanges).length > 0 || Object.keys(unsavedExamChanges).length > 0;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col h-full w-full overflow-hidden">
            <PrintSettingsModal 
                isOpen={isPrintModalOpen} 
                onClose={() => setIsPrintModalOpen(false)} 
                subjects={subjects}
                onConfirm={handlePrintConfirm}
                onExport={handleExportExcel}
            />

            {/* Top Navigation */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 border-b pb-4 gap-4 flex-none">
                <div>
                    <button onClick={onBack} className="text-gray-500 text-sm font-semibold mb-1 hover:text-indigo-600 flex items-center">
                        ← Voltar
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        {turma.name}
                        {hasExam && <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full border border-indigo-200">Classe com Exame</span>}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {turma.classLevel} | {turma.shift} | {turma.academicYear} {turma.room ? `| ${turma.room}` : ''}
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {activeView === 'grades' && (
                        <button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm font-medium transition-colors"
                            title="Imprimir Pauta"
                        >
                            <PrinterIcon className="w-4 h-4 mr-2" />
                            Imprimir / Exportar
                        </button>
                    )}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg self-start xl:self-auto overflow-x-auto">
                        <button
                            onClick={() => setActiveView('grades')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeView === 'grades' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            <ChartBarIcon className="w-4 h-4 inline-block mr-2 mb-0.5" />
                            Pauta de Notas
                        </button>
                        <button
                            onClick={() => setActiveView('attendance')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeView === 'attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            <CalendarIcon className="w-4 h-4 inline-block mr-2 mb-0.5" />
                            Lista de Presenças
                        </button>
                        <button
                            onClick={() => setActiveView('behavior')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeView === 'behavior' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            <ExclamationTriangleIcon className="w-4 h-4 inline-block mr-2 mb-0.5" />
                            Comportamento
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
                {/* --- GRADES VIEW --- */}
                {activeView === 'grades' && (
                    <>
                        {/* Grade Controls */}
                        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
                            <div className="flex gap-4 flex-wrap">
                                {!isOverviewMode && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Disciplina</label>
                                        <select 
                                            value={selectedSubjectId} 
                                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        >
                                            {availableSubjects.map(sub => (
                                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
                                    <select 
                                        value={selectedPeriod} 
                                        // @ts-ignore
                                        onChange={(e) => {
                                            // Fix: cast e.target.value to PeriodOption to fix typing error
                                            setSelectedPeriod(e.target.value as PeriodOption);
                                            if (e.target.value === 'Situação Anual') setIsDetailedSummary(false);
                                        }}
                                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    >
                                        {periods.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {saveStatus === 'saved' && <span className="text-green-600 font-bold animate-pulse text-sm">Salvo!</span>}
                                
                                {isOverviewMode && selectedPeriod !== 'Situação Anual' && (
                                    <button 
                                        onClick={() => setIsDetailedSummary(!isDetailedSummary)}
                                        className={`flex items-center px-3 py-2 rounded-lg font-medium text-sm transition-colors border ${
                                            isDetailedSummary 
                                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <BookOpenIcon className="w-4 h-4 mr-2" />
                                        {isDetailedSummary ? 'Visão Simples' : 'Resumo Detalhado'}
                                    </button>
                                )}

                                <button 
                                    onClick={() => {
                                        setIsOverviewMode(!isOverviewMode);
                                        setIsDetailedSummary(false);
                                    }}
                                    className="flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm"
                                >
                                    {isOverviewMode ? (
                                        <>
                                            <CollectionIcon className="w-4 h-4 mr-2" />
                                            Ver por Disciplina
                                        </>
                                    ) : (
                                        <>
                                            <ChartBarIcon className="w-4 h-4 mr-2" />
                                            Visão Geral
                                        </>
                                    )}
                                </button>

                                {canEditGrades && !isOverviewMode && (
                                    <button 
                                        onClick={handleSaveGrades}
                                        disabled={!hasChangesToSave || saveStatus === 'saving'}
                                        className={`px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-sm ${
                                            hasChangesToSave 
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Notas'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Grade Table */}
                        <div className="overflow-x-auto border rounded-lg relative max-w-full">
                            <table className="min-w-full divide-y divide-gray-200 border-collapse">
                                <thead className="bg-gray-50">
                                    {isOverviewMode ? (
                                        isDetailedSummary && selectedPeriod !== 'Situação Anual' ? (
                                            <>
                                                <tr>
                                                    <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">Aluno</th>
                                                    {availableSubjects.map(sub => (
                                                        <th key={sub.id} colSpan={5} className="px-4 py-2 text-center text-sm font-bold text-indigo-800 uppercase tracking-wider border-b border-l border-gray-200 bg-indigo-50">
                                                            {sub.name}
                                                        </th>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    {availableSubjects.map(sub => (
                                                        <React.Fragment key={sub.id}>
                                                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 w-16">ACS1</th>
                                                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-16">ACS2</th>
                                                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-16 bg-gray-50">MAC</th>
                                                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-16 font-bold">AT</th>
                                                            <th className="px-2 py-2 text-center text-xs font-bold text-indigo-900 w-16 bg-indigo-50">MF</th>
                                                        </React.Fragment>
                                                    ))}
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] sticky left-0 bg-gray-50 z-10 shadow-sm">Aluno</th>
                                                {availableSubjects.map(sub => (
                                                    <th key={sub.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                                        {sub.name}
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-center text-xs font-bold text-indigo-900 uppercase tracking-wider min-w-[120px] bg-indigo-50">
                                                    Média Global
                                                </th>
                                            </tr>
                                        )
                                    ) : (
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Aluno</th>
                                            {selectedPeriod === 'Situação Anual' ? (
                                                hasExam ? (
                                                    <>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Média Interna</th>
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wider w-32 bg-blue-50">Exame</th>
                                                        <th className="px-6 py-3 text-center text-xs font-bold text-indigo-900 uppercase tracking-wider w-32 bg-indigo-50">Nota Final</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Resultado</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">MF 1º T</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">MF 2º T</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">MF 3º T</th>
                                                        <th className="px-6 py-3 text-center text-xs font-bold text-indigo-900 uppercase tracking-wider w-24 bg-indigo-50">Média Anual</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Resultado</th>
                                                    </>
                                                )
                                            ) : (
                                                <>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">ACS 1</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">ACS 2</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 bg-gray-100">Média ACS</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 font-bold">AT (Prova)</th>
                                                    <th className="px-6 py-3 text-center text-xs font-bold text-indigo-900 uppercase tracking-wider w-24 bg-indigo-50">Média Final</th>
                                                </>
                                            )}
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {studentsInTurma.length > 0 ? studentsInTurma.map((student) => {
                                        if (isOverviewMode) {
                                            if (isDetailedSummary && selectedPeriod !== 'Situação Anual') {
                                                return (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">
                                                            <div className="flex items-center">
                                                                <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.profilePictureUrl} alt="" />
                                                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                            </div>
                                                        </td>
                                                        {availableSubjects.map(sub => {
                                                            const { acs1, acs2, mediaACS, at, finalGrade } = getDetailedGrades(student, sub.name, selectedPeriod);
                                                            return (
                                                                <React.Fragment key={sub.id}>
                                                                    <td className="px-2 py-4 text-center text-xs text-gray-500 border-l border-gray-200">{acs1 > 0 ? acs1 : '-'}</td>
                                                                    <td className="px-2 py-4 text-center text-xs text-gray-500">{acs2 > 0 ? acs2 : '-'}</td>
                                                                    <td className="px-2 py-4 text-center text-xs text-gray-600 font-medium bg-gray-50">{mediaACS > 0 ? mediaACS : '-'}</td>
                                                                    <td className="px-2 py-4 text-center text-xs text-gray-800 font-bold">{at > 0 ? at : '-'}</td>
                                                                    <td className={`px-2 py-4 text-center text-xs font-bold bg-indigo-50 ${finalGrade < 10 && finalGrade > 0 ? 'text-red-600' : 'text-indigo-900'}`}>{finalGrade > 0 ? finalGrade : '-'}</td>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            } else {
                                                let totalSum = 0;
                                                let subjectsCount = 0;
                                                return (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 shadow-sm border-r border-gray-100">
                                                            <div className="flex items-center">
                                                                <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.profilePictureUrl} alt="" />
                                                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                            </div>
                                                        </td>
                                                        {availableSubjects.map(sub => {
                                                            const grade = getSubjectGrade(student, sub.name, selectedPeriod);
                                                            if (grade > 0) {
                                                                totalSum += grade;
                                                                subjectsCount++;
                                                            }
                                                            return (
                                                                <td key={sub.id} className={`px-4 py-4 text-center text-sm ${grade < 10 && grade > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                                                    {grade > 0 ? grade.toFixed(1) : '-'}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-4 py-4 text-center text-sm font-bold text-indigo-900 bg-indigo-50 border-l border-gray-200">
                                                            {subjectsCount > 0 ? (totalSum / subjectsCount).toFixed(1) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        } else if (selectedPeriod === 'Situação Anual') {
                                            const mf1 = getGradeValue(student, 'grade', '1º Trimestre');
                                            const mf2 = getGradeValue(student, 'grade', '2º Trimestre');
                                            const mf3 = getGradeValue(student, 'grade', '3º Trimestre');
                                            // Média Interna (MF Anual)
                                            const mediaInterna = parseFloat(((mf1 + mf2 + mf3) / 3).toFixed(1));

                                            if (hasExam && selectedSubject) {
                                                const examGrade = getExamGrade(student, selectedSubject.name);
                                                const finalWithExam = calculateExamFinalGrade(mediaInterna, examGrade);
                                                const isApproved = finalWithExam >= 10;

                                                return (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                                            <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.profilePictureUrl} alt="" />
                                                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-sm text-gray-600 bg-gray-50">{mediaInterna.toFixed(1)}</td>
                                                        <td className="px-4 py-2">
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max="20" 
                                                                step="0.1" 
                                                                value={examGrade} 
                                                                onChange={(e) => handleExamChange(student.id, e.target.value)} 
                                                                disabled={!canEditGrades} 
                                                                className={`w-full text-center border-blue-300 rounded-md shadow-sm sm:text-sm font-bold ${!canEditGrades ? 'bg-gray-100 text-gray-500' : 'bg-blue-50'}`}
                                                            />
                                                        </td>
                                                        <td className={`px-6 py-4 text-center text-sm font-bold bg-indigo-50 ${isApproved ? 'text-green-700' : 'text-red-600'}`}>{finalWithExam.toFixed(1)}</td>
                                                        <td className="px-6 py-4 text-center text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {isApproved ? 'Aprovado' : 'Reprovado'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            } else {
                                                // No Exam
                                                const isApproved = mediaInterna >= 10;
                                                return (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                                            <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.profilePictureUrl} alt="" />
                                                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-sm text-gray-600">{mf1.toFixed(1)}</td>
                                                        <td className="px-4 py-2 text-center text-sm text-gray-600">{mf2.toFixed(1)}</td>
                                                        <td className="px-4 py-2 text-center text-sm text-gray-600">{mf3.toFixed(1)}</td>
                                                        <td className={`px-6 py-4 text-center text-sm font-bold bg-indigo-50 ${isApproved ? 'text-green-700' : 'text-red-600'}`}>{mediaInterna.toFixed(1)}</td>
                                                        <td className="px-6 py-4 text-center text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {isApproved ? 'Aprovado' : 'Reprovado'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        } else {
                                            const acs1 = getGradeValue(student, 'acs1');
                                            const acs2 = getGradeValue(student, 'acs2');
                                            const at = getGradeValue(student, 'at');
                                            const mediaACS = (acs1 + acs2) / 2;
                                            const finalGrade = calculateFinalGrade(acs1, acs2, at); 
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                                        <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.profilePictureUrl} alt="" />
                                                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                    </td>
                                                    <td className="px-4 py-2"><input type="number" min="0" max="20" step="0.1" value={acs1} onChange={(e) => handleGradeChange(student.id, 'acs1', e.target.value)} disabled={!canEditGrades} className={`w-full text-center border-gray-300 rounded-md shadow-sm sm:text-sm ${!canEditGrades ? 'bg-gray-100 text-gray-500' : ''}`}/></td>
                                                    <td className="px-4 py-2"><input type="number" min="0" max="20" step="0.1" value={acs2} onChange={(e) => handleGradeChange(student.id, 'acs2', e.target.value)} disabled={!canEditGrades} className={`w-full text-center border-gray-300 rounded-md shadow-sm sm:text-sm ${!canEditGrades ? 'bg-gray-100 text-gray-500' : ''}`}/></td>
                                                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-600 bg-gray-50">{mediaACS.toFixed(1)}</td>
                                                    <td className="px-4 py-2"><input type="number" min="0" max="20" step="0.1" value={at} onChange={(e) => handleGradeChange(student.id, 'at', e.target.value)} disabled={!canEditGrades} className={`w-full text-center border-gray-300 rounded-md shadow-sm sm:text-sm font-bold ${!canEditGrades ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`}/></td>
                                                    <td className={`px-6 py-4 text-center text-sm font-bold bg-indigo-50 ${finalGrade >= 10 ? 'text-green-700' : 'text-red-600'}`}>{finalGrade.toFixed(1)}</td>
                                                </tr>
                                            );
                                        }
                                    }) : (
                                        <tr><td colSpan={10} className="text-center py-10 text-gray-500">Nenhum aluno nesta turma.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* --- ATTENDANCE & BEHAVIOR VIEWS ... (Kept existing) --- */}
                {activeView === 'attendance' && (
                    <>
                         <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
                            <div className="flex items-center space-x-4">
                                 <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Data da Chamada</label>
                                    <input 
                                        type="date" 
                                        value={attendanceDate}
                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                                {!canEditAttendance && (
                                    <div className="flex items-end h-full pb-1">
                                        <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                            Somente Leitura
                                        </span>
                                    </div>
                                )}
                            </div>
                            {canEditAttendance && (
                                 <div className="flex items-center space-x-2">
                                    {saveStatus === 'saved' && <span className="text-green-600 font-bold animate-pulse text-sm">Salvo!</span>}
                                    <button 
                                        onClick={handleSaveAttendance}
                                        disabled={Object.keys(attendanceChanges).length === 0 || saveStatus === 'saving'}
                                        className={`px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-sm ${
                                            Object.keys(attendanceChanges).length > 0 
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Presenças'}
                                    </button>
                                 </div>
                            )}
                         </div>

                         <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Aluno</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {studentsInTurma.length > 0 ? studentsInTurma.map(student => {
                                        const status = getAttendanceStatus(student);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50">
                                                 <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                                    <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.profilePictureUrl} alt="" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                        <div className="text-xs text-gray-500">{student.id}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center space-x-4">
                                                        {(['Presente', 'Ausente', 'Atrasado'] as const).map(opt => (
                                                            <label key={opt} className={`flex items-center space-x-1 cursor-pointer p-2 rounded-md transition-colors ${status === opt ? 'bg-gray-100 ring-1 ring-gray-300' : ''}`}>
                                                                <input 
                                                                    type="radio" 
                                                                    name={`attendance-${student.id}`}
                                                                    value={opt}
                                                                    checked={status === opt}
                                                                    onChange={() => handleAttendanceChange(student.id, opt)}
                                                                    disabled={!canEditAttendance}
                                                                    className={`h-4 w-4 ${
                                                                        opt === 'Presente' ? 'text-green-600' : 
                                                                        opt === 'Ausente' ? 'text-red-600' : 'text-yellow-500'
                                                                    } focus:ring-indigo-500`}
                                                                />
                                                                <span className={`text-sm font-medium ${
                                                                    opt === 'Presente' ? 'text-green-700' : 
                                                                    opt === 'Ausente' ? 'text-red-700' : 'text-yellow-700'
                                                                }`}>{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr><td colSpan={2} className="text-center py-10 text-gray-500">Nenhum aluno nesta turma.</td></tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                    </>
                )}
                
                {activeView === 'behavior' && (
                    <>
                         <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Período de Avaliação</label>
                                <select 
                                    value={selectedPeriod} 
                                    // @ts-ignore
                                    onChange={(e) => setSelectedPeriod(e.target.value as PeriodOption)}
                                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    {periods.filter(p => p !== 'Situação Anual').map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                {selectedPeriod === 'Situação Anual' && (
                                    <span className="ml-2 text-xs text-red-500">Selecione um trimestre para avaliar.</span>
                                )}
                            </div>
                            {canEditBehavior && selectedPeriod !== 'Situação Anual' && (
                                 <div className="flex items-center space-x-2">
                                    {saveStatus === 'saved' && <span className="text-green-600 font-bold animate-pulse text-sm">Salvo!</span>}
                                    <button 
                                        onClick={handleSaveBehavior}
                                        disabled={Object.keys(behaviorChanges).length === 0 || saveStatus === 'saving'}
                                        className={`px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-sm ${
                                            Object.keys(behaviorChanges).length > 0 
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Avaliações'}
                                    </button>
                                 </div>
                            )}
                         </div>

                         <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                 <div className="col-span-4">Aluno</div>
                                 <div className="col-span-4 text-center">Status Global</div>
                                 <div className="col-span-4 text-right">Ações</div>
                            </div>
                            <div className="bg-white divide-y divide-gray-200">
                                 {studentsInTurma.length > 0 ? studentsInTurma.map(student => {
                                     const evaluation = getStudentBehaviorEval(student);
                                     const isExpanded = expandedStudentId === student.id;
                                     const statusColor = getBehaviorStatusColor(evaluation.percentage);
                                     const statusText = getBehaviorStatusText(evaluation.percentage);

                                     return (
                                         <React.Fragment key={student.id}>
                                             <div className={`px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}>
                                                 <div className="col-span-4 flex items-center">
                                                     <img className="h-10 w-10 rounded-full object-cover mr-3" src={student.profilePictureUrl} alt="" />
                                                     <div>
                                                         <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                         <div className="text-xs text-gray-500">{student.id}</div>
                                                     </div>
                                                 </div>
                                                 <div className="col-span-4 flex flex-col items-center justify-center">
                                                     <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-1">
                                                         <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${evaluation.percentage}%` }}></div>
                                                     </div>
                                                     <div className="text-xs flex gap-2">
                                                         <span className="font-bold text-gray-700">{evaluation.percentage}%</span>
                                                         <span className={`px-2 rounded-full font-semibold ${statusColor}`}>
                                                             {statusText}
                                                         </span>
                                                     </div>
                                                 </div>
                                                 <div className="col-span-4 text-right">
                                                     <button 
                                                        onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                                                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm focus:outline-none"
                                                     >
                                                         {isExpanded ? 'Ocultar Avaliação' : 'Avaliar / Ver Detalhes'}
                                                         <ChevronDownIcon className={`w-4 h-4 inline-block ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                     </button>
                                                 </div>
                                             </div>
                                             {isExpanded && (
                                                 <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 shadow-inner">
                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                         {behaviorCriteriaList.map(criteria => (
                                                             <div key={criteria.key} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                                                                 <span className="text-sm font-medium text-gray-700">{criteria.label}</span>
                                                                 <div className="flex space-x-1">
                                                                     {[1, 2, 3, 4, 5].map(star => (
                                                                         <button
                                                                            key={star}
                                                                            onClick={() => handleStarClick(student.id, criteria.key as keyof BehaviorEvaluation['scores'], star)}
                                                                            disabled={!canEditBehavior || selectedPeriod === 'Situação Anual'}
                                                                            className={`focus:outline-none transition-transform hover:scale-110 ${!canEditBehavior ? 'cursor-default' : ''}`}
                                                                         >
                                                                             <StarIcon 
                                                                                className={`w-6 h-6 ${star <= (evaluation.scores[criteria.key as keyof BehaviorEvaluation['scores']] || 0) ? 'text-yellow-400' : 'text-gray-300'}`} 
                                                                                filled={star <= (evaluation.scores[criteria.key as keyof BehaviorEvaluation['scores']] || 0)}
                                                                             />
                                                                         </button>
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         ))}
                                                     </div>
                                                 </div>
                                             )}
                                         </React.Fragment>
                                     );
                                 }) : (
                                     <div className="text-center py-10 text-gray-500">Nenhum aluno nesta turma.</div>
                                 )}
                            </div>
                         </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TurmaDetails;
