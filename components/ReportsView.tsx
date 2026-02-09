
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AcademicYear, Turma, SchoolSettings, User, FinancialSettings, UserRole, ExpenseRecord } from '../types';
import { ChartBarIcon, CurrencyDollarIcon, UsersIcon, AcademicCapIcon, CheckCircleIcon, ExclamationTriangleIcon, BookOpenIcon, UserAddIcon, ClockIcon, TrendingDownIcon, GraduationCapIcon, PrinterIcon } from './icons/IconComponents';
import { printStatisticalReport } from './ReceiptUtils';

interface ReportsViewProps {
    currentUser: User;
    students: Student[];
    academicYears: AcademicYear[];
    turmas: Turma[];
    schoolSettings: SchoolSettings;
    users: User[];
    financialSettings: FinancialSettings;
    expenses: ExpenseRecord[];
}

// Helper Components for Reports
const StatCard: React.FC<{ title: string; value: string | number; subtext?: string; color: string; icon?: React.ReactNode }> = ({ title, value, subtext, color, icon }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
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

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">{title}</h3>
);

const BarChart: React.FC<{ data: { label: string; value: number; color?: string }[]; maxVal?: number }> = ({ data, maxVal }) => {
    const max = maxVal || Math.max(...data.map(d => d.value)) || 1;
    return (
        <div className="flex items-end space-x-2 h-40 mt-4">
            {data.map((d, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs rounded py-1 px-2 transition-opacity z-10 whitespace-nowrap">
                        {d.label}: {d.value}
                    </div>
                    <div 
                        className={`w-full rounded-t-md transition-all duration-500 ${d.color || 'bg-indigo-500'}`}
                        style={{ height: `${(d.value / max) * 100}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

const ReportsView: React.FC<ReportsViewProps> = ({ currentUser, students, academicYears, turmas, schoolSettings, users, financialSettings, expenses }) => {
    const [activeTab, setActiveTab] = useState<'students' | 'classes' | 'academic' | 'attendance' | 'staff' | 'teachers_detail' | 'discipline' | 'financial'>('students');
    
    // Initialize with the Active Year (Em Curso) or the most recent one
    const [selectedYear, setSelectedYear] = useState<number>(() => {
        const active = academicYears.find(y => y.status === 'Em Curso');
        return active ? active.year : new Date().getFullYear();
    });

    useEffect(() => {
        if (academicYears.length > 0) {
             const active = academicYears.find(y => y.status === 'Em Curso');
             if (active && selectedYear === new Date().getFullYear() && !academicYears.some(y => y.year === selectedYear)) {
                 setSelectedYear(active.year);
             }
        }
    }, [academicYears, selectedYear]);

    const availableYears = useMemo(() => academicYears.map(y => y.year).sort((a, b) => b - a), [academicYears]);

    const getAge = (birthDate: string) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency });
    };

    const visibleTurmas = useMemo(() => {
        if (currentUser.role === UserRole.PROFESSOR) {
            return turmas.filter(t =>
                t.teachers?.some(teach => teach.teacherId === currentUser.id) ||
                // @ts-ignore legacy check
                t.teacherIds?.includes(currentUser.id) || t.teacherId === currentUser.id
            );
        }
        return turmas;
    }, [currentUser, turmas]);

    const visibleStudents = useMemo(() => {
        if (currentUser.role === UserRole.PROFESSOR) {
            const myStudentIds = new Set(visibleTurmas.flatMap(t => t.studentIds));
            return students.filter(s => myStudentIds.has(s.id));
        }
        return students;
    }, [currentUser, students, visibleTurmas]);

    const tabs = useMemo(() => {
        const allTabs = [
            { id: 'students', label: 'Alunos', icon: <UsersIcon className="w-4 h-4"/> },
            { id: 'classes', label: 'Turmas', icon: <BookOpenIcon className="w-4 h-4"/> },
            { id: 'academic', label: 'Pedagógico', icon: <AcademicCapIcon className="w-4 h-4"/> },
            { id: 'attendance', label: 'Assiduidade', icon: <CheckCircleIcon className="w-4 h-4"/> },
            { id: 'discipline', label: 'Disciplina', icon: <ExclamationTriangleIcon className="w-4 h-4"/> },
        ];

        if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SECRETARIA) {
             allTabs.splice(4, 0, { id: 'staff', label: 'Pessoal', icon: <UserAddIcon className="w-4 h-4"/> });
        }

        if (currentUser.role === UserRole.ADMIN) {
            allTabs.push({ id: 'teachers_detail', label: 'Docentes', icon: <GraduationCapIcon className="w-4 h-4"/> });
            allTabs.push({ id: 'financial', label: 'Financeiro', icon: <CurrencyDollarIcon className="w-4 h-4"/> });
        }

        return allTabs;
    }, [currentUser.role]);


    // --- MODULE 1: STUDENTS ---
    const studentsStats = useMemo(() => {
        let totalActive = 0;
        let male = 0;
        let female = 0;
        const ageGroups = { '6-9': 0, '10-13': 0, '14-17': 0, '18+': 0 };
        const statusCounts = { Ativo: 0, Transferido: 0, Inativo: 0 };
        const admissionTypes = { novos: 0, renovacoes: 0 };
        let neeCount = 0;
        let financial = { paid: 0, late: 0 };
        const currentMonth = new Date().getMonth() + 1;
        visibleStudents.forEach(s => {
            const matriculaPayment = s.payments?.find(p => p.academicYear === selectedYear && p.type === 'Matrícula');
            const renovacaoPayment = s.payments?.find(p => p.academicYear === selectedYear && p.type === 'Renovação');
            const isLinkedToYear = !!matriculaPayment || !!renovacaoPayment;
            if (isLinkedToYear) {
                if (matriculaPayment) admissionTypes.novos++; else if (renovacaoPayment) admissionTypes.renovacoes++;
                if (s.status === 'Inativo') statusCounts.Inativo++;
                else if (s.status === 'Transferido') statusCounts.Transferido++;
                else if (s.status === 'Ativo') {
                    statusCounts.Ativo++; totalActive++;
                    if (s.gender === 'M') male++; else female++;
                    const age = getAge(s.birthDate);
                    if (age <= 9) ageGroups['6-9']++; else if (age <= 13) ageGroups['10-13']++; else if (age <= 17) ageGroups['14-17']++; else ageGroups['18+']++;
                    if (s.healthInfo && s.healthInfo.length > 5 && !s.healthInfo.toLowerCase().includes('nenhuma')) neeCount++;
                    const hasPaidCurrent = s.payments?.some(p => p.academicYear === selectedYear && p.referenceMonth === currentMonth);
                    if (hasPaidCurrent) financial.paid++; else financial.late++;
                }
            }
        });
        return { total: totalActive, male, female, ageGroups, statusCounts, admissionTypes, neeCount, financial };
    }, [visibleStudents, selectedYear]);

    // --- MODULE 2: CLASSES ---
    const turmasStats = useMemo(() => {
        const yearTurmas = visibleTurmas.filter(t => t.academicYear === selectedYear);
        const totalTurmas = yearTurmas.length;
        const totalStudentsInTurmas = yearTurmas.reduce((acc, t) => acc + t.studentIds.length, 0);
        const avgStudents = totalTurmas > 0 ? Math.round(totalStudentsInTurmas / totalTurmas) : 0;
        const byShift = { 'Manhã': 0, 'Tarde': 0, 'Noite': 0 };
        yearTurmas.forEach(t => { if (byShift[t.shift] !== undefined) byShift[t.shift]++; });
        const capacity = schoolSettings.studentsPerClass;
        const occupancy = { 'Cheia (100%)': 0, 'Normal': 0, 'Baixa (<50%)': 0 };
        yearTurmas.forEach(t => {
            const perc = t.studentIds.length / capacity;
            if (perc >= 1) occupancy['Cheia (100%)']++; else if (perc < 0.5) occupancy['Baixa (<50%)']++; else occupancy['Normal']++;
        });
        return { totalTurmas, avgStudents, byShift, occupancy };
    }, [visibleTurmas, selectedYear, schoolSettings]);

    // --- MODULE 3: PEDAGOGICAL ---
    const pedagogicalStats = useMemo(() => {
        let totalSum = 0; let gradeCount = 0;
        const subjectPerformance: Record<string, { total: number, count: number }> = {};
        const distribution = { 'Excelente (≥14)': 0, 'Bom (12-13)': 0, 'Suficiente (10-11)': 0, 'Insuficiente (<10)': 0 };
        let approved = 0, failed = 0;
        visibleStudents.forEach(s => {
            if(s.status !== 'Ativo') return;
            const yearGrades = s.grades?.filter(g => g.academicYear === selectedYear) || [];
            if (yearGrades.length === 0) return;
            const studentSum = yearGrades.reduce((acc, g) => acc + Number(g.grade || 0), 0);
            const studentAvg = studentSum / yearGrades.length;
            if (studentAvg >= 14) distribution['Excelente (≥14)']++; else if (studentAvg >= 12) distribution['Bom (12-13)']++; else if (studentAvg >= 10) distribution['Suficiente (10-11)']++; else distribution['Insuficiente (<10)']++;
            if (studentAvg >= 10) approved++; else failed++;
            totalSum += studentSum; gradeCount += yearGrades.length;
            yearGrades.forEach(g => {
                if (!subjectPerformance[g.subject]) subjectPerformance[g.subject] = { total: 0, count: 0 };
                subjectPerformance[g.subject].total += Number(g.grade || 0); subjectPerformance[g.subject].count++;
            });
        });
        const globalAvg = gradeCount > 0 ? (totalSum / gradeCount).toFixed(1) : '0.0';
        const subjectAvgs = Object.entries(subjectPerformance).map(([sub, data]) => ({
            name: sub, avg: data.count > 0 ? data.total / data.count : 0
        })).sort((a, b) => b.avg - a.avg);
        return { globalAvg, distribution, approved, failed, topSubjects: subjectAvgs.slice(0, 3), bottomSubjects: subjectAvgs.slice(-3).reverse() };
    }, [visibleStudents, selectedYear]);

    // --- MODULE 4: ATTENDANCE ---
    const attendanceStats = useMemo(() => {
        let totalPresent = 0, totalAbsent = 0;
        visibleStudents.forEach(s => {
            s.attendance?.forEach(a => {
                if (new Date(a.date).getFullYear() === selectedYear) { if (a.status === 'Presente') totalPresent++; else totalAbsent++; }
            });
        });
        const totalRecords = totalPresent + totalAbsent;
        const avgPresence = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        return { avgPresence, totalAbsent };
    }, [visibleStudents, selectedYear]);

    // --- MODULE 5: STAFF ---
    const staffStats = useMemo(() => {
        const teachers = users.filter(u => u.role === UserRole.PROFESSOR);
        const admin = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SECRETARIA);
        const byDegree: Record<string, number> = {};
        teachers.forEach(t => { const degree = t.education || 'N/D'; byDegree[degree] = (byDegree[degree] || 0) + 1; });
        return { teachersCount: teachers.length, adminCount: admin.length, byDegree };
    }, [users]);

    // --- MODULE 6: TEACHERS DETAIL (NEW) ---
    const teachersDetailStats = useMemo(() => {
        if (currentUser.role !== UserRole.ADMIN) return null;
        
        const yearTurmas = turmas.filter(t => t.academicYear === selectedYear);
        const teacherUsers = users.filter(u => u.role === UserRole.PROFESSOR);

        const details = teacherUsers.map(teacher => {
            const myTurmas = yearTurmas.filter(t => 
                t.teachers?.some(assign => assign.teacherId === teacher.id) ||
                // @ts-ignore
                t.teacherIds?.includes(teacher.id) || t.teacherId === teacher.id
            );

            const shifts = { 'Manhã': 0, 'Tarde': 0, 'Noite': 0 };
            const rooms = new Set<string>();
            const subjectsSet = new Set<string>();

            myTurmas.forEach(t => {
                // @ts-ignore
                shifts[t.shift]++;
                if (t.room) rooms.add(t.room);
                
                const assignment = t.teachers?.find(a => a.teacherId === teacher.id);
                if (assignment && assignment.subjectIds) {
                    const yearData = academicYears.find(ay => ay.year === selectedYear);
                    const classSubjects = yearData?.subjectsByClass?.find(cs => cs.classLevel === t.classLevel)?.subjects || [];
                    assignment.subjectIds.forEach(sid => {
                        const sName = classSubjects.find(cs => cs.id === sid)?.name;
                        if (sName) subjectsSet.add(sName);
                    });
                }
            });

            return {
                teacher,
                turmasCount: myTurmas.length,
                myTurmas,
                shifts,
                rooms: Array.from(rooms),
                subjects: Array.from(subjectsSet)
            };
        }).sort((a, b) => b.turmasCount - a.turmasCount);

        const avgTurmasPerTeacher = teacherUsers.length > 0 ? (yearTurmas.reduce((acc, t) => acc + (t.teachers?.length || 1), 0) / teacherUsers.length).toFixed(1) : 0;

        return { details, avgTurmasPerTeacher };
    }, [users, turmas, selectedYear, academicYears, currentUser.role]);

    // --- MODULE 7: DISCIPLINE ---
    const disciplineStats = useMemo(() => {
        const occurrences = { 'Leve': 0, 'Moderada': 0, 'Grave': 0 };
        const typeCounts: Record<string, number> = {};
        visibleStudents.forEach(s => {
            s.behavior?.forEach(b => {
                if (new Date(b.date).getFullYear() === selectedYear && b.type === 'Negativo') {
                    const sev = b.severity || 'Leve'; if (occurrences[sev] !== undefined) occurrences[sev]++;
                    const keyword = b.note.split(' ')[0] || 'Outros'; typeCounts[keyword] = (typeCounts[keyword] || 0) + 1;
                }
            });
        });
        const topTypes = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        return { occurrences, topTypes };
    }, [visibleStudents, selectedYear]);

    // --- MODULE 8: FINANCIAL ---
    const financialStats = useMemo(() => {
        let totalRevenue = 0;
        const revenueByCategory = { 'Propinas (Mensalidades)': 0, 'Inscrições/Matrículas': 0, 'Uniformes': 0, 'Material': 0, 'Outros': 0 };
        const payingStudentsSet = new Set<string>();
        const uniformNames = new Set(financialSettings.uniforms.map(u => u.name));
        const bookTitles = new Set(financialSettings.books.map(b => b.title));
        visibleStudents.forEach(s => {
            if (!s.payments) return;
            const yearPayments = s.payments.filter(p => p.academicYear === selectedYear);
            if (yearPayments.length > 0) payingStudentsSet.add(s.id);
            yearPayments.forEach(p => {
                const amount = Number(p.amount || 0); totalRevenue += amount;
                if (p.items && p.items.length > 0) {
                    p.items.forEach(item => {
                        const name = item.item; const val = Number(item.value || 0);
                        if (name.includes('Mensalidade')) revenueByCategory['Propinas (Mensalidades)'] += val;
                        else if (name.includes('Matrícula') || name.includes('Renovação') || name.includes('Inscrição')) revenueByCategory['Inscrições/Matrículas'] += val;
                        else if (uniformNames.has(name) || p.type === 'Uniforme') revenueByCategory['Uniformes'] += val;
                        else if (bookTitles.has(name) || p.type === 'Material') revenueByCategory['Material'] += val;
                        else revenueByCategory['Outros'] += val;
                    });
                } else {
                    if (p.type === 'Mensalidade') revenueByCategory['Propinas (Mensalidades)'] += amount;
                    else if (p.type === 'Matrícula' || p.type === 'Renovação') revenueByCategory['Inscrições/Matrículas'] += amount;
                    else if (p.type === 'Uniforme') revenueByCategory['Uniformes'] += amount;
                    else if (p.type === 'Material') revenueByCategory['Material'] += amount;
                    else revenueByCategory['Outros'] += amount;
                }
            });
        });
        let currentDebt = 0; const currentMonth = new Date().getMonth() + 1;
        const acYear = academicYears.find(y => y.year === selectedYear);
        const startMonth = acYear ? (acYear.startMonth || 2) : 2; const endMonth = acYear ? (acYear.endMonth || 11) : 11;
        visibleStudents.forEach(s => {
            if (s.status === 'Transferido') return;
            const hasEnrolledCurrent = s.payments?.some(p => p.academicYear === selectedYear && (p.type === 'Matrícula' || p.type === 'Renovação'));
            if (hasEnrolledCurrent) {
                let monthlyFee = Number(financialSettings.monthlyFee);
                if (s.desiredClass) { const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === s.desiredClass); if (specific) monthlyFee = Number(specific.monthlyFee); }
                const profile = s.financialProfile || { status: 'Normal' };
                if (profile.status === 'Isento Total') monthlyFee = 0;
                else if (profile.status === 'Desconto Parcial' && profile.affectedTypes?.includes('Mensalidade')) monthlyFee *= (1 - (profile.discountPercentage || 0) / 100);
                const checkLimit = (selectedYear === new Date().getFullYear()) ? currentMonth : endMonth;
                for(let m = startMonth; m <= checkLimit; m++) {
                     const mYear = new Date(s.matriculationDate).getFullYear();
                     if (mYear === selectedYear && m < (new Date(s.matriculationDate).getMonth() + 1)) continue;
                     if (!s.payments?.some(p => p.academicYear === selectedYear && p.type === 'Mensalidade' && p.referenceMonth === m)) currentDebt += monthlyFee;
                }
            }
        });
        const totalExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selectedYear).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        return {
            revenue: { total: totalRevenue, byCategory: revenueByCategory },
            expenses: { total: totalExpenses },
            tuition: { arrears: currentDebt },
            health: { profit: totalRevenue - totalExpenses }
        };
    }, [visibleStudents, expenses, selectedYear, financialSettings, academicYears]);

    const handlePrintCurrentReport = () => {
        let contentHtml = '';
        let title = '';

        const getSummaryTable = (data: Record<string, number | string>) => `
            <table>
                <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
                <tbody>
                    ${Object.entries(data).map(([k, v]) => `<tr><td>${k}</td><td><strong>${v}</strong></td></tr>`).join('')}
                </tbody>
            </table>
        `;

        switch(activeTab) {
            case 'students':
                title = 'Relatório Geral de Alunos';
                contentHtml = `
                    <div class="stat-grid">
                        <div class="stat-card"><div class="stat-value">${studentsStats.total}</div><div class="stat-label">Alunos Ativos</div></div>
                        <div class="stat-card"><div class="stat-value">${studentsStats.male}</div><div class="stat-label">Masculino</div></div>
                        <div class="stat-card"><div class="stat-value">${studentsStats.female}</div><div class="stat-label">Feminino</div></div>
                    </div>
                    ${getSummaryTable({
                        'Alunos Novos': studentsStats.admissionTypes.novos,
                        'Renovações': studentsStats.admissionTypes.renovacoes,
                        'Transferidos': studentsStats.statusCounts.Transferido,
                        'Inativos/Desistentes': studentsStats.statusCounts.Inativo,
                        'Necessidades Especiais (NEE)': studentsStats.neeCount
                    })}
                `;
                break;
            case 'financial':
                title = 'Relatório Financeiro Anual';
                contentHtml = `
                    <div class="stat-grid">
                        <div class="stat-card"><div class="stat-value">${formatCurrency(financialStats.revenue.total)}</div><div class="stat-label">Receita Bruta</div></div>
                        <div class="stat-card"><div class="stat-value">${formatCurrency(financialStats.expenses.total)}</div><div class="stat-label">Despesas</div></div>
                        <div class="stat-card"><div class="stat-value">${formatCurrency(financialStats.health.profit)}</div><div class="stat-label">Saldo Final</div></div>
                    </div>
                    <h4>Receita por Categoria</h4>
                    ${getSummaryTable(Object.fromEntries(
                        Object.entries(financialStats.revenue.byCategory).map(([k, v]) => [k, formatCurrency(v as number)])
                    ))}
                    <p style="color: red; font-weight: bold; margin-top: 20px;">Dívida Estimada em Mensalidades: ${formatCurrency(financialStats.tuition.arrears)}</p>
                `;
                break;
            case 'academic':
                title = 'Relatório Pedagógico';
                contentHtml = `
                    <div class="stat-grid">
                        <div class="stat-card"><div class="stat-value">${pedagogicalStats.globalAvg}</div><div class="stat-label">Média Global</div></div>
                        <div class="stat-card"><div class="stat-value">${pedagogicalStats.approved}</div><div class="stat-label">Aprovados</div></div>
                        <div class="stat-card"><div class="stat-value">${pedagogicalStats.failed}</div><div class="stat-label">Reprovados</div></div>
                    </div>
                    <h4>Distribuição de Níveis</h4>
                    ${getSummaryTable(pedagogicalStats.distribution)}
                `;
                break;
            case 'teachers_detail':
                title = 'Relatório de Alocação Docente';
                contentHtml = `
                    <div class="stat-grid">
                        <div class="stat-card"><div class="stat-value">${staffStats.teachersCount}</div><div class="stat-label">Professores</div></div>
                        <div class="stat-card"><div class="stat-value">${teachersDetailStats?.avgTurmasPerTeacher}</div><div class="stat-label">Média Turmas/Prof</div></div>
                    </div>
                    <table>
                        <thead>
                            <tr><th>Professor</th><th>Turmas</th><th>Turnos</th><th>Salas</th></tr>
                        </thead>
                        <tbody>
                            ${teachersDetailStats?.details.map(d => `
                                <tr>
                                    <td>${d.teacher.name}</td>
                                    <td>${d.turmasCount}</td>
                                    <td>${Object.entries(d.shifts).filter(([_, v]) => (v as number) > 0).map(([k, _]) => k[0]).join('/')}</td>
                                    <td>${d.rooms.join(', ')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                break;
            default:
                title = 'Relatório Estatístico';
                contentHtml = '<p>Selecione uma aba específica para imprimir os dados detalhados.</p>';
        }

        printStatisticalReport(title, contentHtml, schoolSettings, selectedYear);
    };


    const renderContent = () => {
        switch (activeTab) {
            case 'students':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <StatCard title="Total Alunos (Ativos)" value={studentsStats.total} color="text-indigo-600" icon={<UsersIcon className="w-5 h-5 text-indigo-600"/>} />
                            <StatCard title="Novos (Externos)" value={studentsStats.admissionTypes.novos} subtext="Pagaram Matrícula" color="text-green-600" icon={<UserAddIcon className="w-5 h-5 text-green-600"/>} />
                            <StatCard title="Renovações (Internos)" value={studentsStats.admissionTypes.renovacoes} subtext="Pagaram Renovação" color="text-blue-600" icon={<CheckCircleIcon className="w-5 h-5 text-blue-600"/>} />
                            <StatCard title="Desistentes/Inativos" value={studentsStats.statusCounts.Inativo} color="text-red-600" />
                            <StatCard title="NEE (Nec. Esp.)" value={studentsStats.neeCount} color="text-purple-600" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border">
                                <SectionTitle title="Distribuição por Género" />
                                <div className="flex items-center justify-around h-32">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-500">{studentsStats.male}</div>
                                        <div className="text-sm text-gray-500">Masculino</div>
                                    </div>
                                    <div className="h-16 w-px bg-gray-200"></div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-pink-500">{studentsStats.female}</div>
                                        <div className="text-sm text-gray-500">Feminino</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border">
                                <SectionTitle title="Faixa Etária" />
                                <BarChart data={Object.entries(studentsStats.ageGroups).map(([k,v]) => ({ label: k, value: v, color: 'bg-teal-500' }))} />
                            </div>
                        </div>
                    </div>
                );
            case 'classes':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Total de Turmas" value={turmasStats.totalTurmas} color="text-indigo-600" />
                            <StatCard title="Média Alunos/Turma" value={turmasStats.avgStudents} subtext={`Limite: ${schoolSettings.studentsPerClass}`} color="text-blue-600" />
                            <StatCard title="Salas Cheias" value={turmasStats.occupancy['Cheia (100%)']} color="text-amber-600" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border">
                                <SectionTitle title="Turmas por Turno" />
                                <BarChart data={Object.entries(turmasStats.byShift).map(([k,v]) => ({ label: k, value: v, color: 'bg-indigo-500' }))} />
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border">
                                <SectionTitle title="Lotação das Salas" />
                                <BarChart data={Object.entries(turmasStats.occupancy).map(([k,v]) => ({ label: k, value: v, color: k.includes('Cheia') ? 'bg-red-400' : 'bg-green-400' }))} />
                            </div>
                        </div>
                    </div>
                );
            case 'academic':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Média Geral" value={pedagogicalStats.globalAvg} color="text-purple-600" icon={<AcademicCapIcon className="w-5 h-5 text-purple-600"/>} />
                            <StatCard title="Aprovados" value={pedagogicalStats.approved} color="text-green-600" icon={<CheckCircleIcon className="w-5 h-5 text-green-600"/>} />
                            <StatCard title="Reprovados (Prev.)" value={pedagogicalStats.failed} color="text-red-600" icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-600"/>} />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <SectionTitle title="Distribuição de Resultados" />
                            <BarChart data={Object.entries(pedagogicalStats.distribution).map(([k,v]) => ({ label: k, value: v, color: k.includes('Insuficiente') ? 'bg-red-400' : (k.includes('Excelente') ? 'bg-green-500' : 'bg-blue-400') }))} />
                        </div>
                    </div>
                );
            case 'attendance':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StatCard title="Presença Média Global" value={`${attendanceStats.avgPresence}%`} color={attendanceStats.avgPresence > 90 ? "text-green-600" : "text-yellow-600"} icon={<ClockIcon className="w-5 h-5"/>} />
                            <StatCard title="Total de Faltas Registadas" value={attendanceStats.totalAbsent} color="text-red-600" />
                        </div>
                    </div>
                );
            case 'staff':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StatCard title="Total Professores" value={staffStats.teachersCount} color="text-indigo-600" />
                            <StatCard title="Pessoal Administrativo" value={staffStats.adminCount} color="text-gray-600" />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <SectionTitle title="Nível Académico dos Professores" />
                            <BarChart data={Object.entries(staffStats.byDegree).map(([k,v]) => ({ label: k, value: v, color: 'bg-blue-500' }))} />
                        </div>
                    </div>
                );
            case 'teachers_detail':
                if (!teachersDetailStats) return null;
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Docentes Activos" value={staffStats.teachersCount} color="text-indigo-600" icon={<GraduationCapIcon className="w-5 h-5 text-indigo-600"/>} />
                            <StatCard title="Média Turmas/Prof" value={teachersDetailStats.avgTurmasPerTeacher} color="text-blue-600" icon={<BookOpenIcon className="w-5 h-5 text-blue-600"/>} />
                            <StatCard title="Salas em Uso" value={new Set(turmas.filter(t => t.academicYear === selectedYear).map(t => t.room)).size} color="text-green-600" icon={<ClockIcon className="w-5 h-5 text-green-600"/>} />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b">
                                <h3 className="font-bold text-gray-800">Mapa de Alocação de Docentes</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Turmas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnos (M/T/N)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salas / Disciplinas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {teachersDetailStats.details.map((d, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <img className="h-8 w-8 rounded-full object-cover mr-3 border" src={d.teacher.avatarUrl} alt="" />
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900">{d.teacher.name}</div>
                                                            <div className="text-[10px] text-gray-500">{d.teacher.category || 'Efetivo'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
                                                        {d.turmasCount}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex gap-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${d.shifts['Manhã'] > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-300'}`}>M: {d.shifts['Manhã']}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${d.shifts['Tarde'] > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-300'}`}>T: {d.shifts['Tarde']}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${d.shifts['Noite'] > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-300'}`}>N: {d.shifts['Noite']}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-gray-700">
                                                        <div className="mb-1"><span className="font-bold text-gray-500">Salas:</span> {d.rooms.join(', ') || 'N/D'}</div>
                                                        <div className="line-clamp-1"><span className="font-bold text-gray-500">Disciplinas:</span> {d.subjects.join(', ') || 'Todas'}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'discipline':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Ocorrências Leves" value={disciplineStats.occurrences.Leve} color="text-yellow-600" />
                            <StatCard title="Ocorrências Moderadas" value={disciplineStats.occurrences.Moderada} color="text-orange-600" />
                            <StatCard title="Ocorrências Graves" value={disciplineStats.occurrences.Grave} color="text-red-600" />
                        </div>
                    </div>
                );
            case 'financial':
                if (currentUser.role !== UserRole.ADMIN) return null;
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <StatCard title="Receita Total" value={formatCurrency(financialStats.revenue.total)} color="text-green-600" icon={<CurrencyDollarIcon className="w-5 h-5 text-green-600"/>} />
                            <StatCard title="Dívida Estimada" value={formatCurrency(financialStats.tuition.arrears)} color="text-red-600" />
                            <StatCard title="Lucro/Prejuízo" value={formatCurrency(financialStats.health.profit)} color={financialStats.health.profit >= 0 ? "text-blue-600" : "text-red-600"} />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">Relatórios Estatísticos</h3>
                    <p className="text-sm text-gray-500">Análise detalhada da escola.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handlePrintCurrentReport}
                        className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-md"
                    >
                        <PrinterIcon className="w-5 h-5 mr-2" />
                        Imprimir Relatório
                    </button>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="p-2 border rounded-lg bg-gray-50 font-bold text-gray-700"
                    >
                        {availableYears.map(y => <option key={y} value={y}>Ano Letivo {y}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex overflow-x-auto pb-2 space-x-2 bg-gray-100 p-2 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {renderContent()}
        </div>
    );
};

export default ReportsView;