
import React, { useState, useMemo } from 'react';
import { AcademicYear, Turma, Student, SchoolSettings, FinancialSettings, ExpenseRecord, User, UserRole } from '../types';
import { 
    BookOpenIcon, 
    UsersIcon, 
    ChartBarIcon, 
    ClockIcon, 
    TrendingDownIcon, 
    AcademicCapIcon, 
    CurrencyDollarIcon, 
    ExclamationTriangleIcon,
    PrinterIcon
} from './icons/IconComponents';
import { printStatisticalReport } from './ReceiptUtils';

interface ClassManagementProps {
    academicYears: AcademicYear[];
    turmas: Turma[];
    students: Student[];
    schoolSettings: SchoolSettings;
    financialSettings: FinancialSettings;
    expenses: ExpenseRecord[];
    users: User[];
    currentUser: User;
}

const ClassManagement: React.FC<ClassManagementProps> = ({ 
    academicYears, 
    turmas, 
    students, 
    schoolSettings, 
    financialSettings, 
    expenses,
    users,
    currentUser
}) => {
    // 1. State
    const activeYear = academicYears.find(y => y.status === 'Em Curso')?.year || new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(activeYear);
    const [selectedClassLevel, setSelectedClassLevel] = useState<string>('All');

    // 2. Data Aggregation Helpers
    const availableYears = useMemo(() => academicYears.map(y => y.year).sort((a,b) => b - a), [academicYears]);
    
    const availableClassLevels = useMemo(() => {
        // Extract unique class levels from turmas for the selected year
        const levels = new Set<string>();
        turmas.filter(t => t.academicYear === selectedYear).forEach(t => levels.add(t.classLevel));
        // Also fallback to generic list if empty
        if(levels.size === 0) {
            Array.from({length: 12}, (_, i) => `${i+1}ª Classe`).forEach(l => levels.add(l));
        }
        return Array.from(levels).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    }, [turmas, selectedYear]);

    // 3. Main Calculation Logic
    const reportData = useMemo(() => {
        // Filter Turmas
        const activeTurmas = turmas.filter(t => 
            t.academicYear === selectedYear && 
            (selectedClassLevel === 'All' || t.classLevel === selectedClassLevel)
        );

        // Filter Students
        const studentIdsInTurmas = new Set(activeTurmas.flatMap(t => t.studentIds));
        const activeStudents = students.filter(s => studentIdsInTurmas.has(s.id));

        // --- OVERVIEW ---
        const totalClasses = selectedClassLevel === 'All' ? new Set(activeTurmas.map(t => t.classLevel)).size : 1;
        const totalTurmas = activeTurmas.length;
        const totalStudents = activeStudents.length;
        const teachersSet = new Set<string>();
        activeTurmas.forEach(t => {
            t.teachers?.forEach(assign => teachersSet.add(assign.teacherId));
            // @ts-ignore legacy
            if(t.teacherIds) t.teacherIds.forEach(id => teachersSet.add(id));
            // @ts-ignore legacy
            if(t.teacherId) teachersSet.add(t.teacherId);
        });
        const totalTeachers = teachersSet.size;
        // Estimated: 1 classroom per turma (simplified)
        const classroomsUsed = activeTurmas.length; 
        const shifts = new Set(activeTurmas.map(t => t.shift)).size;

        // --- DEMOGRAPHICS ---
        let male = 0, female = 0;
        let active = 0, transfer = 0, inactive = 0;
        let neeCount = 0;
        const ageGroups = { '6-9': 0, '10-13': 0, '14-17': 0, '18+': 0 };

        const getAge = (birthDate: string): number => {
            const today = new Date();
            const birth = new Date(birthDate);
            let age: number = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age = age - 1;
            return age;
        };

        activeStudents.forEach(s => {
            if (s.gender === 'M') male++; else female++;
            if (s.status === 'Ativo') active++;
            else if (s.status === 'Transferido') transfer++;
            else inactive++;
            
            if (s.healthInfo && s.healthInfo.length > 5 && !s.healthInfo.toLowerCase().includes('nenhuma')) neeCount++;

            const age = getAge(s.birthDate);
            if (age <= 9) ageGroups['6-9']++;
            else if (age <= 13) ageGroups['10-13']++;
            else if (age <= 17) ageGroups['14-17']++;
            else ageGroups['18+']++;
        });

        // --- ACADEMIC ---
        let totalGradesSum = 0;
        let gradesCount = 0;
        let passed = 0, failed = 0;
        const gradeBrackets: Record<string, number> = { 'Excelente (≥14)': 0, 'Bom (12-13)': 0, 'Suficiente (10-11)': 0, 'Insuficiente (<10)': 0 };

        activeStudents.forEach(s => {
            const yearGrades = s.grades?.filter(g => g.academicYear === selectedYear) || [];
            if (yearGrades.length === 0) return;

            // Simple avg calculation across all subjects
            const avg = yearGrades.reduce((acc, g) => acc + (Number(g.grade) || 0), 0) / yearGrades.length;
            totalGradesSum += avg;
            gradesCount++;

            if (avg >= 14) gradeBrackets['Excelente (≥14)']++;
            else if (avg >= 12) gradeBrackets['Bom (12-13)']++;
            else if (avg >= 10) gradeBrackets['Suficiente (10-11)']++;
            else gradeBrackets['Insuficiente (<10)']++;

            // Pass threshold
            if (avg >= 9.5) passed++; else failed++;
        });
        const globalAvg = gradesCount > 0 ? (totalGradesSum / gradesCount).toFixed(1) : 'N/A';

        // --- ATTENDANCE ---
        let totalPresent = 0, totalRecords = 0;
        activeStudents.forEach(s => {
            s.attendance?.forEach(a => {
                if(new Date(a.date).getFullYear() === selectedYear) {
                    totalRecords++;
                    if (a.status === 'Presente') totalPresent++;
                }
            });
        });
        const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

        // --- FINANCIAL ---
        let payingStudents: number = 0;
        let receivedAmount: number = 0;
        let expectedAmount: number = 0;
        let debtAmount: number = 0;

        // Pro-rated expenses
        const totalSchoolStudents = students.filter(s => s.status === 'Ativo').length; // approximation
        const ratio = totalSchoolStudents > 0 ? totalStudents / totalSchoolStudents : 0;
        
        const totalYearExpenses = expenses.reduce((acc: number, e) => {
            if (new Date(e.date).getFullYear() === selectedYear) {
                return acc + (Number(e.amount) || 0);
            }
            return acc;
        }, 0);

        const allocatedCost = Number(totalYearExpenses) * Number(ratio);

        function baseEnrollmentFee(s: Student): number {
             const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === s.desiredClass);
             const fee = specific ? specific.enrollmentFee : financialSettings.enrollmentFee;
             return Number(fee || 0);
        }

        // Revenue
        activeStudents.forEach(s => {
            // Check if paying student (has at least enrolled)
            const hasEnrollment = s.payments?.some(p => p.academicYear === selectedYear && (p.type === 'Matrícula' || p.type === 'Renovação'));
            if(hasEnrollment) payingStudents += 1;

            s.payments?.filter(p => p.academicYear === selectedYear).forEach(p => {
                receivedAmount += Number(p.amount || 0);
            });

            // Expected (Simplified: 10 months * fee)
            let fee: number = Number(financialSettings.monthlyFee || 0);
            if (s.desiredClass) {
                const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === s.desiredClass);
                if (specific) fee = Number(specific.monthlyFee || 0);
            }
            if(hasEnrollment) {
                expectedAmount += (Number(fee) * 10) + (Number(baseEnrollmentFee(s)) || 0);
            }
        });
        
        debtAmount = Math.max(0, expectedAmount - receivedAmount);
        const collectionRate = expectedAmount > 0 ? (receivedAmount / expectedAmount) * 100 : 0;

        // --- DISCIPLINE ---
        const discipline: Record<string, number> = { 'Leve': 0, 'Moderada': 0, 'Grave': 0, 'total': 0 };
        activeStudents.forEach(s => {
            s.behavior?.forEach(b => {
                if (new Date(b.date).getFullYear() === selectedYear && b.type === 'Negativo') {
                    const currentTotal = discipline['total'] || 0;
                    discipline['total'] = Number(currentTotal) + 1;
                    
                    const sev = b.severity || 'Leve';
                    if (discipline[sev] !== undefined) {
                        const currentSevCount = discipline[sev] || 0;
                        discipline[sev] = Number(currentSevCount) + 1;
                    }
                }
            });
        });
        const totalDiscipline = discipline['total'] || 0;
        const indisciplineRate = totalStudents > 0 ? (totalDiscipline / totalStudents) * 100 : 0;

        // --- INFRASTRUCTURE ---
        const studentPerTurma = totalTurmas > 0 ? (totalStudents / totalTurmas).toFixed(1) : '0';
        const studentPerTeacher = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : '0';

        return {
            overview: { totalClasses, totalTurmas, totalTeachers, classroomsUsed, shifts },
            demographics: { totalStudents, male, female, active, transfer, inactive, neeCount, ageGroups },
            academic: { globalAvg, passed, failed, gradeBrackets },
            attendance: { attendanceRate },
            financial: { payingStudents, receivedAmount, expectedAmount, debtAmount, collectionRate, allocatedCost },
            discipline: { discipline, indisciplineRate },
            infra: { studentPerTurma, studentPerTeacher }
        };

    }, [selectedYear, selectedClassLevel, turmas, students, financialSettings, expenses, schoolSettings]);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency });
    };

    const handlePrintClassReport = () => {
        const title = selectedClassLevel === 'All' ? `Relatório Geral de Classes` : `Relatório Detalhado: ${selectedClassLevel}`;
        
        const summaryTable = (data: Record<string, any>) => `
            <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead style="background:#f0f0f0;">
                    <tr><th style="border:1px solid #ddd; padding:8px; text-align:left;">Indicador</th><th style="border:1px solid #ddd; padding:8px; text-align:right;">Valor</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(data).map(([k, v]) => `
                        <tr><td style="border:1px solid #ddd; padding:8px;">${k}</td><td style="border:1px solid #ddd; padding:8px; text-align:right; font-weight:bold;">${v}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const contentHtml = `
            <div style="margin-bottom: 20px; border: 1px solid #indigo; padding: 15px; border-radius: 8px; background: #f9f9ff;">
                <h3 style="margin-top:0; color:#1a237e;">Resumo do Nível</h3>
                <div class="stat-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                    <div class="stat-card" style="border:1px solid #ddd; padding:10px; text-align:center;">
                        <div style="font-size:10px; color:#666;">ALUNOS</div>
                        <div style="font-size:18px; font-weight:bold;">${reportData.demographics.totalStudents}</div>
                    </div>
                    <div class="stat-card" style="border:1px solid #ddd; padding:10px; text-align:center;">
                        <div style="font-size:10px; color:#666;">MÉDIA GERAL</div>
                        <div style="font-size:18px; font-weight:bold;">${reportData.academic.globalAvg}</div>
                    </div>
                    <div class="stat-card" style="border:1px solid #ddd; padding:10px; text-align:center;">
                        <div style="font-size:10px; color:#666;">ASSIDUIDADE</div>
                        <div style="font-size:18px; font-weight:bold;">${reportData.attendance.attendanceRate}%</div>
                    </div>
                    <div class="stat-card" style="border:1px solid #ddd; padding:10px; text-align:center;">
                        <div style="font-size:10px; color:#666;">TURMAS</div>
                        <div style="font-size:18px; font-weight:bold;">${reportData.overview.totalTurmas}</div>
                    </div>
                </div>
            </div>

            <h4 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">Distribuição de Desempenho</h4>
            ${summaryTable(reportData.academic.gradeBrackets)}

            <h4 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">Dados Demográficos</h4>
            ${summaryTable({
                'Masculino': reportData.demographics.male,
                'Feminino': reportData.demographics.female,
                'Alunos Activos': reportData.demographics.active,
                'Transferidos': reportData.demographics.transfer,
                'Necessidades Especiais (NEE)': reportData.demographics.neeCount
            })}

            ${currentUser.role === UserRole.ADMIN ? `
                <h4 style="border-bottom: 1px solid #eee; padding-bottom: 5px; color: #green;">Resumo Financeiro Proporcional</h4>
                ${summaryTable({
                    'Receita Realizada': formatCurrency(reportData.financial.receivedAmount),
                    'Dívida Estimada': formatCurrency(reportData.financial.debtAmount),
                    'Custo Operacional Alocado': formatCurrency(reportData.financial.allocatedCost),
                    'Taxa de Cobrança': reportData.financial.collectionRate.toFixed(1) + '%'
                })}
            ` : ''}

            <h4 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">Rácios de Eficiência</h4>
            ${summaryTable({
                'Alunos por Turma': reportData.infra.studentPerTurma,
                'Alunos por Professor': reportData.infra.studentPerTeacher,
                'Taxa de Indisciplina': reportData.discipline.indisciplineRate.toFixed(1) + '%'
            })}
        `;

        printStatisticalReport(title, contentHtml, schoolSettings, selectedYear);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Filter Header */}
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Relatório Anual de Classes</h2>
                    <p className="text-sm text-gray-500">Análise detalhada por ano lectivo e nível de ensino.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={handlePrintClassReport}
                        className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-md whitespace-nowrap"
                    >
                        <PrinterIcon className="w-5 h-5 mr-2" />
                        Imprimir
                    </button>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="p-2 border rounded-lg bg-gray-50 font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableYears.map(y => <option key={y} value={y}>Ano Letivo {y}</option>)}
                    </select>
                    <select 
                        value={selectedClassLevel} 
                        onChange={(e) => setSelectedClassLevel(e.target.value)}
                        className="p-2 border rounded-lg bg-gray-50 font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="All">Visão Geral (Todas)</option>
                        {availableClassLevels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. Overview Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard 
                    title="Classes/Níveis" 
                    value={reportData.overview.totalClasses} 
                    icon={<BookOpenIcon className="w-5 h-5 text-indigo-600"/>} 
                    color="text-indigo-600"
                    subtext="Níveis activos"
                />
                <StatCard 
                    title="Total Turmas" 
                    value={reportData.overview.totalTurmas} 
                    icon={<UsersIcon className="w-5 h-5 text-blue-600"/>} 
                    color="text-blue-600"
                    subtext="Associadas"
                />
                <StatCard 
                    title="Total Alunos" 
                    value={reportData.demographics.totalStudents} 
                    icon={<AcademicCapIcon className="w-5 h-5 text-green-600"/>} 
                    color="text-green-600"
                    subtext={`M: ${reportData.demographics.male} | F: ${reportData.demographics.female}`}
                />
                <StatCard 
                    title="Professores" 
                    value={reportData.overview.totalTeachers} 
                    icon={<UsersIcon className="w-5 h-5 text-purple-600"/>} 
                    color="text-purple-600"
                    subtext="Alocados"
                />
                <StatCard 
                    title="Salas/Turnos" 
                    value={`${reportData.overview.classroomsUsed} / ${reportData.overview.shifts}`} 
                    icon={<ClockIcon className="w-5 h-5 text-orange-600"/>} 
                    color="text-orange-600"
                    subtext="Uso estimado"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 3. Academic & Attendance */}
                <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 ${currentUser.role !== UserRole.ADMIN ? 'lg:col-span-2' : ''}`}>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                        <ChartBarIcon className="w-5 h-5 mr-2 text-indigo-500"/>
                        Rendimento & Assiduidade
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                            <span className="text-sm text-gray-500 block mb-1">Média Geral</span>
                            <span className={`text-3xl font-bold ${parseFloat(reportData.academic.globalAvg) >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                                {reportData.academic.globalAvg}
                            </span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                            <span className="text-sm text-gray-500 block mb-1">Assiduidade</span>
                            <span className={`text-3xl font-bold ${reportData.attendance.attendanceRate >= 85 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {reportData.attendance.attendanceRate}%
                            </span>
                        </div>
                    </div>
                    
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Classificação Interna</h4>
                    <div className="space-y-3">
                        {Object.entries(reportData.academic.gradeBrackets).map(([label, count]) => {
                            const total = Number(reportData.academic.passed) + Number(reportData.academic.failed);
                            const pct = total > 0 ? (Number(count) / total) * 100 : 0;
                            return (
                                <div key={label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600">{label}</span>
                                        <span className="font-bold text-gray-800">{count} ({pct.toFixed(0)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div 
                                            className={`h-1.5 rounded-full ${label.includes('Excelente') ? 'bg-green-500' : label.includes('Bom') ? 'bg-blue-500' : label.includes('Suficiente') ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                            style={{ width: `${pct}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 4. Financial Statistics - ONLY ADMIN */}
                {currentUser.role === UserRole.ADMIN && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                            <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-600"/>
                            Estatística Financeira
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs text-gray-500">Receita Esperada</p>
                                <p className="text-lg font-bold text-gray-700">{formatCurrency(reportData.financial.expectedAmount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Receita Realizada</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(reportData.financial.receivedAmount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Valor em Atraso</p>
                                <p className="text-lg font-bold text-red-600">{formatCurrency(reportData.financial.debtAmount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Custo Alocado (Est.)</p>
                                <p className="text-lg font-bold text-orange-600">{formatCurrency(reportData.financial.allocatedCost)}</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-600">Taxa de Cobrança</span>
                                <span className="text-sm font-bold text-indigo-900">{reportData.financial.collectionRate.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className="bg-indigo-600 h-3 rounded-full" style={{ width: `${reportData.financial.collectionRate}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                {reportData.financial.payingStudents} alunos pagantes identificados.
                            </p>
                        </div>
                    </div>
                )}

                {/* 5. Discipline & Behavior */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-red-600"/>
                        Disciplina e Comportamento
                    </h3>
                    
                    <div className="flex items-center justify-between mb-6 bg-red-50 p-3 rounded-lg">
                        <span className="text-sm font-medium text-red-800">Taxa de Indisciplina</span>
                        <span className="text-xl font-bold text-red-700">{reportData.discipline.indisciplineRate.toFixed(1)}%</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Leve</span>
                            <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${((reportData.discipline.discipline['Leve'] || 0) / (reportData.discipline.discipline['total'] || 1)) * 100}%` }}></div>
                            </div>
                            <span className="text-sm font-bold">{reportData.discipline.discipline['Leve']}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Moderada</span>
                            <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${((reportData.discipline.discipline['Moderada'] || 0) / (reportData.discipline.discipline['total'] || 1)) * 100}%` }}></div>
                            </div>
                            <span className="text-sm font-bold">{reportData.discipline.discipline['Moderada']}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Grave</span>
                            <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                                <div className="bg-red-600 h-2 rounded-full" style={{ width: `${((reportData.discipline.discipline['Grave'] || 0) / (reportData.discipline.discipline['total'] || 1)) * 100}%` }}></div>
                            </div>
                            <span className="text-sm font-bold">{reportData.discipline.discipline['Grave']}</span>
                        </div>
                    </div>
                </div>

                {/* 6. Infrastructure & Ratios */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                        <TrendingDownIcon className="w-5 h-5 mr-2 text-gray-600"/>
                        Rácios e Infraestrutura
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg text-center bg-gray-50">
                            <span className="text-3xl font-bold text-gray-800 block">{reportData.infra.studentPerTurma}</span>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Alunos / Turma</span>
                        </div>
                        <div className="p-4 border rounded-lg text-center bg-gray-50">
                            <span className="text-3xl font-bold text-gray-800 block">{reportData.infra.studentPerTeacher}</span>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Alunos / Prof.</span>
                        </div>
                        <div className="p-4 border rounded-lg text-center bg-gray-50">
                            <span className="text-3xl font-bold text-gray-800 block">1:1</span>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Aluno / Carteira (Est.)</span>
                        </div>
                        <div className="p-4 border rounded-lg text-center bg-gray-50">
                            <span className="text-3xl font-bold text-gray-800 block">{reportData.demographics.neeCount}</span>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Alunos com NEE</span>
                        </div>
                    </div>
                    
                    {currentUser.role === UserRole.ADMIN && (
                        <div className="pt-4 border-t border-gray-100">
                            <p className="text-sm font-medium text-gray-700 mb-2">Composição do Fluxo</p>
                            <div className="flex h-4 rounded-full overflow-hidden">
                                <div className="bg-green-500" style={{ width: `${reportData.financial.receivedAmount > 0 ? (reportData.financial.receivedAmount - reportData.financial.allocatedCost > 0 ? (reportData.financial.allocatedCost / reportData.financial.receivedAmount * 100) : 100) : 0}%` }} title="Custos"></div>
                                <div className="bg-blue-500 flex-1" title="Margem"></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Custos Alocados ({((reportData.financial.allocatedCost / (reportData.financial.receivedAmount || 1)) * 100).toFixed(0)}%)</span>
                                <span>Margem Contribuição</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; subtext?: string; color: string; icon?: React.ReactNode }> = ({ title, value, subtext, color, icon }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h4>
            {icon && <div className={`p-2 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>{icon}</div>}
        </div>
        <div className="mt-2">
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

export default ClassManagement;
