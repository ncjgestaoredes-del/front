
import React, { useMemo } from 'react';
import { SchoolSettings, Turma, Student, AcademicYear } from '../types';
import { AcademicCapIcon, CheckCircleIcon, UsersIcon, ClockIcon } from './icons/IconComponents';

interface VacancyOverviewProps {
    turmas: Turma[];
    schoolSettings: SchoolSettings;
    students: Student[];
    academicYears: AcademicYear[];
}

const VacancyOverview: React.FC<VacancyOverviewProps> = ({ turmas, schoolSettings, students, academicYears }) => {
    
    // 1. Determine Years
    const currentYearObj = academicYears.find(y => y.status === 'Em Curso');
    const planningYearObj = academicYears.find(y => y.status === 'Planeado');
    
    // Fallback if no specific year set, use system date
    const currentYear = currentYearObj?.year || new Date().getFullYear();
    const targetYear = planningYearObj?.year || (currentYear + 1);

    const getClassNumber = (className: string) => parseInt(className.replace(/\D/g, ''), 10) || 0;

    // 2. Projection Logic
    const projection = useMemo(() => {
        const totalCapacity = schoolSettings.totalClassrooms * schoolSettings.studentsPerClass * schoolSettings.shifts;
        
        // Buckets for counting
        const pendingRenewal: Record<string, number> = {};
        const confirmedNextYear: Record<string, number> = {};
        
        let totalConfirmed = 0; // Alunos que PAGARAM para o Ano Alvo
        let totalPending = 0;   // Alunos ativos que pagaram Ano Corrente (Previstos)

        students.forEach(student => {
            // REGRA: Deixa de ser previsto se for transferido ou inativo.
            if (student.status !== 'Ativo') return;

            // REGRA: Ocupação Prevista inclui quem pagou matrícula do ano anterior (corrente) ou do ano alvo.
            // "não que foram cadastradas" -> Exige pagamento.

            // 1. Check Target Year Payment
            const hasConfirmed = student.payments?.some(p => 
                p.academicYear === targetYear && 
                (p.type === 'Matrícula' || p.type === 'Renovação')
            );

            if (hasConfirmed) {
                // Confirmado: Já pagou para o próximo ano.
                const cls = student.desiredClass;
                confirmedNextYear[cls] = (confirmedNextYear[cls] || 0) + 1;
                totalConfirmed++;
            } else {
                // 2. Check Current Year Payment (Para ser "Previsto")
                const hasPaidCurrent = student.payments?.some(p => 
                    p.academicYear === currentYear && 
                    (p.type === 'Matrícula' || p.type === 'Renovação')
                );

                if (!hasPaidCurrent) return; // Apenas cadastrado, sem pagamento -> Ignorar.

                // Calcular para onde ele vai (Próxima classe)
                const currentTurma = turmas.find(t => t.academicYear === currentYear && t.studentIds.includes(student.id));
                const currentClass = currentTurma ? currentTurma.classLevel : student.desiredClass;
                
                // Lógica de Aprovação Simplificada para Projeção
                const yearData = academicYears.find(ay => ay.year === currentYear);
                const classConfig = yearData?.subjectsByClass?.find(cs => cs.classLevel === currentClass);
                const hasExam = classConfig?.hasExam || false;
                
                let subjectNames: string[] = [];
                if (classConfig && classConfig.subjects.length > 0) {
                    subjectNames = classConfig.subjects.map(s => s.name);
                } else {
                    subjectNames = Array.from(new Set(student.grades?.filter(g => g.academicYear === currentYear).map(g => g.subject) || []));
                }

                let predictedClass = currentClass; // Assume reprovação por padrão (conservador) ou manutenção

                if (subjectNames.length > 0) {
                    let totalSum = 0;
                    subjectNames.forEach(subj => {
                        const t1 = student.grades?.find(g => g.subject === subj && g.period === '1º Trimestre' && g.academicYear === currentYear)?.grade || 0;
                        const t2 = student.grades?.find(g => g.subject === subj && g.period === '2º Trimestre' && g.academicYear === currentYear)?.grade || 0;
                        const t3 = student.grades?.find(g => g.subject === subj && g.period === '3º Trimestre' && g.academicYear === currentYear)?.grade || 0;
                        const internalAvg = (t1 + t2 + t3) / 3;
                        
                        let finalSubjectGrade = internalAvg;
                        // Nota: Para projeção rápida, usamos média interna ou exame se disponível
                        const exam = student.examGrades?.find(e => e.subject === subj && e.academicYear === currentYear);
                        if (hasExam && exam) {
                             const p1 = schoolSettings.examWeights?.internal || 50;
                             const p2 = schoolSettings.examWeights?.exam || 50;
                             finalSubjectGrade = ((internalAvg * p1) + (exam.grade * p2)) / (p1 + p2);
                        }
                        totalSum += finalSubjectGrade;
                    });

                    const annualAvg = totalSum / subjectNames.length;
                    const isApproved = hasExam ? annualAvg >= 9.5 : annualAvg >= 9.5; 

                    if (isApproved) {
                        const num = getClassNumber(currentClass);
                        if (num < 12) predictedClass = `${num + 1}ª Classe`;
                        else predictedClass = 'Concluído';
                    }
                }

                if (predictedClass !== 'Concluído') {
                    pendingRenewal[predictedClass] = (pendingRenewal[predictedClass] || 0) + 1;
                    totalPending++;
                }
            }
        });

        // REGRA: Ocupação Prevista = Confirmados + Pendentes (que pagaram ano anterior)
        const totalProjectedOccupancy = totalConfirmed + totalPending; 
        const availableForNew = Math.max(0, totalCapacity - totalProjectedOccupancy);

        return {
            totalCapacity,
            totalConfirmed,
            totalPending,
            totalProjectedOccupancy,
            availableForNew,
            pendingRenewal,
            confirmedNextYear
        };

    }, [students, turmas, schoolSettings, currentYear, targetYear, academicYears]);

    // Consolidate list of classes
    const allClasses = useMemo(() => {
        const classes = new Set([...Object.keys(projection.pendingRenewal), ...Object.keys(projection.confirmedNextYear)]);
        return Array.from(classes).sort((a, b) => getClassNumber(a) - getClassNumber(b));
    }, [projection]);

    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg animate-fade-in">
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Projeção de Vagas - {targetYear}</h3>
                <p className="mt-1 text-gray-500">
                    Baseado em matrículas pagas e alunos ativos aptos a renovar.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <InfoCard 
                    icon={<AcademicCapIcon className="w-8 h-8 text-blue-500" />}
                    title="Capacidade Global"
                    value={projection.totalCapacity.toString()}
                    description="Total de vagas na escola"
                    color="bg-blue-50"
                />
                 <InfoCard 
                    icon={<UsersIcon className="w-8 h-8 text-indigo-500" />}
                    title="Ocupação Prevista"
                    value={projection.totalProjectedOccupancy.toString()}
                    description={`${projection.totalConfirmed} confirmados + ${projection.totalPending} previstos.`}
                    color="bg-indigo-50"
                />
                 <InfoCard 
                    icon={<ClockIcon className="w-8 h-8 text-green-500" />}
                    title="Vagas Disponíveis"
                    value={projection.availableForNew.toString()}
                    description="Para novos alunos."
                    color="bg-green-50"
                />
            </div>
            
            {/* Detailed Table */}
            <div>
                 <h4 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
                    <CheckCircleIcon className="w-5 h-5 mr-2"/>
                    Detalhamento por Classe
                 </h4>
                 
                 {allClasses.length > 0 ? (
                    <div className="overflow-x-auto border rounded-xl">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Classe</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-amber-600 uppercase tracking-wider">Previstos (Renovação)</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-green-600 uppercase tracking-wider">Confirmados (Pagos)</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-indigo-900 uppercase tracking-wider">Ocupação Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {allClasses.map((cls) => {
                                    const pending = projection.pendingRenewal[cls] || 0;
                                    const confirmed = projection.confirmedNextYear[cls] || 0;
                                    const totalOccupied = pending + confirmed; 
                                    
                                    return (
                                        <tr key={cls} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{cls}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-amber-600 bg-amber-50">
                                                {pending}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-green-600 bg-green-50">
                                                {confirmed}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-900">
                                                {totalOccupied}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                 ) : (
                    <p className="text-center text-gray-500 py-8 border rounded-lg bg-gray-50">
                        Ainda não há dados suficientes para projeção.
                    </p>
                 )}
            </div>
        </div>
    );
};

interface InfoCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    description: string;
    color?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, value, description, color = "bg-gray-50" }) => (
    <div className={`${color} p-6 rounded-xl flex items-center space-x-4 border border-gray-100 shadow-sm`}>
        <div className="bg-white p-3 rounded-full shadow-sm">
            {icon}
        </div>
        <div>
            <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-extrabold text-gray-800 mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
    </div>
);

export default VacancyOverview;
