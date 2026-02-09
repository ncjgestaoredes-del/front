
import React, { useState } from 'react';
import { AcademicYear, AcademicYearStatus, Student, SchoolSettings, Turma } from '../types';
import { TrashIcon, EditIcon } from './icons/IconComponents';
import ManageSubjectsModal from './ManageSubjectsModal';

interface AcademicYearManagementProps {
    academicYears: AcademicYear[];
    onAcademicYearsChange: (years: AcademicYear[]) => void;
    // New props for promotion logic
    students?: Student[];
    onStudentsChange?: (students: Student[]) => void;
    schoolSettings?: SchoolSettings;
    turmas?: Turma[];
}

const StatusBadge: React.FC<{ status: AcademicYearStatus }> = ({ status }) => {
  const baseClasses = 'px-3 py-1 text-xs font-semibold rounded-full inline-block';
  const statusClasses = {
    'Planeado': 'bg-blue-100 text-blue-800',
    'Em Curso': 'bg-green-100 text-green-800',
    'Concluído': 'bg-gray-200 text-gray-800',
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const months = [
    { val: 1, name: 'Janeiro' }, { val: 2, name: 'Fevereiro' }, { val: 3, name: 'Março' },
    { val: 4, name: 'Abril' }, { val: 5, name: 'Maio' }, { val: 6, name: 'Junho' },
    { val: 7, name: 'Julho' }, { val: 8, name: 'Agosto' }, { val: 9, name: 'Setembro' },
    { val: 10, name: 'Outubro' }, { val: 11, name: 'Novembro' }, { val: 12, name: 'Dezembro' }
];

const AcademicYearManagement: React.FC<AcademicYearManagementProps> = ({ 
    academicYears, 
    onAcademicYearsChange,
    students,
    onStudentsChange,
    schoolSettings,
    turmas
}) => {
    const currentYear = new Date().getFullYear();
    const [newYear, setNewYear] = useState<string>((currentYear + 1).toString());
    const [newStatus, setNewStatus] = useState<AcademicYearStatus>('Planeado');
    const [startMonth, setStartMonth] = useState<number>(2); // Default February
    const [endMonth, setEndMonth] = useState<number>(11); // Default November
    const [autoPromote, setAutoPromote] = useState(false);
    
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

    const getClassNumber = (className: string) => parseInt(className.replace(/\D/g, ''), 10) || 0;

    const handlePromoteStudents = (previousYear: number) => {
        if (!students || !onStudentsChange || !turmas || !schoolSettings) return 0;

        let promotedCount = 0;
        const updatedStudents = students.map(student => {
            // Logic duplicated from ReportsView for consistency, but simplified here
            
            // 1. Find Previous Turma
            const turma = turmas.find(t => t.academicYear === previousYear && t.studentIds.includes(student.id));
            if (!turma) return student; // No data for prev year, skip

            const currentClass = turma.classLevel;
            
            // 2. Check Subjects
            const yearData = academicYears.find(ay => ay.year === previousYear);
            const classConfig = yearData?.subjectsByClass?.find(cs => cs.classLevel === currentClass);
            const hasExam = classConfig?.hasExam || false;
            
            let subjectNames: string[] = [];
            if (classConfig && classConfig.subjects.length > 0) {
                subjectNames = classConfig.subjects.map(s => s.name);
            } else {
                 // Fallback
                 subjectNames = Array.from(new Set(student.grades?.filter(g => g.academicYear === previousYear).map(g => g.subject) || []));
            }

            if (subjectNames.length === 0) return student;

            // 3. Calc Grades
            let totalSum = 0;
            subjectNames.forEach(subj => {
                const t1 = student.grades?.find(g => g.subject === subj && g.period === '1º Trimestre' && g.academicYear === previousYear)?.grade || 0;
                const t2 = student.grades?.find(g => g.subject === subj && g.period === '2º Trimestre' && g.academicYear === previousYear)?.grade || 0;
                const t3 = student.grades?.find(g => g.subject === subj && g.period === '3º Trimestre' && g.academicYear === previousYear)?.grade || 0;
                const internalAvg = (t1 + t2 + t3) / 3;
                let finalSubjectGrade = internalAvg;

                if (hasExam) {
                    const exam = student.examGrades?.find(e => e.subject === subj && e.academicYear === previousYear);
                    const examGrade = exam ? exam.grade : 0;
                    const p1 = schoolSettings.examWeights?.internal || 50;
                    const p2 = schoolSettings.examWeights?.exam || 50;
                    finalSubjectGrade = ((internalAvg * p1) + (examGrade * p2)) / (p1 + p2);
                }
                totalSum += finalSubjectGrade;
            });

            const annualAverage = totalSum / subjectNames.length;
            const isApproved = hasExam ? annualAverage >= 9.5 : annualAverage >= 9.5;

            // 4. Update Desired Class for next year
            if (isApproved) {
                const currentNum = getClassNumber(currentClass);
                if (currentNum < 12) {
                    promotedCount++;
                    return { ...student, desiredClass: `${currentNum + 1}ª Classe` };
                }
            }
            
            // If failed, they stay in the same class (desiredClass usually reflects enrollment target)
            // Ideally, we might want to update desiredClass to the SAME class if it was different, 
            // but for now, we assume desiredClass holds their current target.
            return { ...student, desiredClass: currentClass }; 
        });

        onStudentsChange(updatedStudents);
        return promotedCount;
    };

    const handleAddYear = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        const yearNumber = parseInt(newYear, 10);
        if (isNaN(yearNumber) || yearNumber < 2020 || yearNumber > 2050) {
            setError('Por favor, insira um ano válido (entre 2020 e 2050).');
            return;
        }
        if (academicYears.some(ay => ay.year === yearNumber)) {
            setError('Este ano letivo já existe.');
            return;
        }
        if (startMonth > endMonth) {
            setError('O mês de início deve ser anterior ou igual ao mês de fim.');
            return;
        }

        const newAcademicYear: AcademicYear = {
            id: `ay_${yearNumber}`,
            year: yearNumber,
            status: newStatus,
            startMonth,
            endMonth,
            // Copy subjects from previous year if exists, for convenience
            subjectsByClass: academicYears.find(ay => ay.year === yearNumber - 1)?.subjectsByClass || []
        };

        const updatedYears = [...academicYears, newAcademicYear].sort((a, b) => a.year - b.year);
        onAcademicYearsChange(updatedYears);
        
        let msg = `Ano Letivo ${yearNumber} criado com sucesso.`;

        // Promotion Logic
        if (autoPromote) {
            const count = handlePromoteStudents(yearNumber - 1);
            msg += ` ${count} alunos foram promovidos automaticamente com base nas notas de ${yearNumber - 1}.`;
        }
        
        setSuccessMsg(msg);
        setNewYear((yearNumber + 1).toString());
        setNewStatus('Planeado');
        setAutoPromote(false);
        setTimeout(() => setSuccessMsg(''), 5000);
    };
    
    const handleUpdateStatus = (id: string, status: AcademicYearStatus) => {
        const updatedYears = academicYears.map(ay => 
            ay.id === id ? { ...ay, status } : ay
        );
        onAcademicYearsChange(updatedYears);
    };

    const handleDeleteYear = (id: string) => {
        if (window.confirm('Tem a certeza que deseja apagar este ano letivo? Esta ação não pode ser desfeita.')) {
            const updatedYears = academicYears.filter(ay => ay.id !== id);
            onAcademicYearsChange(updatedYears);
        }
    };
    
    const handleOpenSubjectsModal = (year: AcademicYear) => {
        setEditingYear(year);
        setIsSubjectsModalOpen(true);
    };

    const handleSaveSubjects = (updatedYear: AcademicYear) => {
        onAcademicYearsChange(academicYears.map(ay => ay.id === updatedYear.id ? updatedYear : ay));
        setIsSubjectsModalOpen(false);
    };


    return (
        <>
            <ManageSubjectsModal
                isOpen={isSubjectsModalOpen}
                onClose={() => setIsSubjectsModalOpen(false)}
                academicYear={editingYear}
                onSave={handleSaveSubjects}
            />
            <div className="p-6 bg-white rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800">Gestão de Anos Letivos</h3>
                <p className="mt-2 text-gray-600 mb-6">Configure os anos letivos e o período de cobrança de mensalidades.</p>
                
                <form onSubmit={handleAddYear} className="p-4 border rounded-lg bg-gray-50 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newYear">Novo Ano Letivo</label>
                            <input 
                                id="newYear" 
                                type="number" 
                                value={newYear} 
                                onChange={e => setNewYear(e.target.value)}
                                min="2020"
                                max="2050"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newStatus">Status Inicial</label>
                            <select 
                                id="newStatus" 
                                value={newStatus} 
                                onChange={e => setNewStatus(e.target.value as AcademicYearStatus)} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="Planeado">Planeado</option>
                                <option value="Em Curso">Em Curso</option>
                                <option value="Concluído">Concluído</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Início Aulas (Mês)</label>
                            <select 
                                value={startMonth} 
                                onChange={e => setStartMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fim Aulas (Mês)</label>
                            <select 
                                value={endMonth} 
                                onChange={e => setEndMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform transform hover:scale-105">
                            Adicionar
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="autoPromote"
                            checked={autoPromote}
                            onChange={e => setAutoPromote(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <label htmlFor="autoPromote" className="text-sm text-gray-700">
                            Atualizar automaticamente a classe dos alunos aprovados no ano anterior?
                        </label>
                    </div>

                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    {successMsg && <p className="text-green-600 text-sm mt-2 font-bold">{successMsg}</p>}
                </form>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ano</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período Letivo</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {academicYears.sort((a, b) => a.year - b.year).map(ay => (
                                <tr key={ay.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{ay.year}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <StatusBadge status={ay.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {months.find(m => m.val === (ay.startMonth || 2))?.name} a {months.find(m => m.val === (ay.endMonth || 11))?.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                onClick={() => handleOpenSubjectsModal(ay)}
                                                className="flex items-center text-sm bg-gray-200 text-gray-800 font-semibold py-1 px-3 rounded-lg hover:bg-gray-300"
                                            >
                                               <EditIcon className="w-4 h-4 mr-2" />
                                               Gerir Disciplinas
                                            </button>
                                            <select 
                                                value={ay.status} 
                                                onChange={(e) => handleUpdateStatus(ay.id, e.target.value as AcademicYearStatus)}
                                                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                aria-label={`Mudar status do ano ${ay.year}`}
                                            >
                                                <option value="Planeado">Planeado</option>
                                                <option value="Em Curso">Em Curso</option>
                                                <option value="Concluído">Concluído</option>
                                            </select>
                                            <button 
                                                onClick={() => handleDeleteYear(ay.id)} 
                                                title="Excluir" 
                                                className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100"
                                            >
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {academicYears.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
                          Nenhum ano letivo cadastrado.
                      </div>
                  )}
                </div>
            </div>
        </>
    );
};

export default AcademicYearManagement;
