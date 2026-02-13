
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, AcademicYear, SchoolSettings, Turma, FinancialSettings, AppNotification, UserRole, Grade, AttendanceRecord, Subject, PaymentRecord } from '../types';
import { LogoutIcon, GraduationCapIcon, ChevronDownIcon, AcademicCapIcon, CheckCircleIcon, ExclamationTriangleIcon, CloseIcon, CalendarIcon, StarIcon, UsersIcon, CurrencyDollarIcon, ClockIcon, ChartBarIcon, BookOpenIcon, PrinterIcon } from './icons/IconComponents';
import Sidebar from './Sidebar';
import Header from './Header';
import { View } from './Dashboard';

interface GuardianPortalProps {
  user: User;
  onLogout: () => void;
  onUpdateCurrentUser: (data: Partial<User>) => void;
  students: Student[];
  onStudentsChange?: (students: Student[]) => void;
  academicYears: AcademicYear[];
  schoolSettings: SchoolSettings;
  turmas: Turma[];
  financialSettings: FinancialSettings;
  activeView?: View;
  setActiveView?: (view: View) => void;
  onAddNotifications?: (notifications: AppNotification[]) => void;
  users?: User[];
}

// FUNÇÃO DE EXTRAÇÃO DE ANO ULTRA ROBUSTA
const safeExtractYear = (dateInput: any): number => {
    if (!dateInput) return 0;
    
    // Se já for uma string (formato ISO ou brasileiro)
    const str = String(dateInput);
    const match = str.match(/\d{4}/);
    if (match) return parseInt(match[0], 10);
    
    // Tenta via objeto Date
    const d = new Date(dateInput);
    if (!isNaN(d.getFullYear())) return d.getFullYear();
    
    return 0;
};

// GARANTE QUE O DADO É UM ARRAY
const ensureArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

const StatementModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    student: Student | null; 
    year: number; 
    financialSettings: FinancialSettings;
}> = ({ isOpen, onClose, student, year, financialSettings }) => {
    if (!isOpen || !student) return null;

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency || 'MZN' });
    };

    const ledger = useMemo(() => {
        const items: { date: string; desc: string; debit: number; credit: number }[] = [];
        const startMonth = 2;
        const now = new Date();
        const currentMonth = year === now.getFullYear() ? now.getMonth() + 1 : 11;
        
        let monthlyFee = financialSettings.monthlyFee;
        if (student.desiredClass) {
            const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === student.desiredClass);
            if (specific) monthlyFee = specific.monthlyFee;
        }

        for (let m = startMonth; m <= currentMonth; m++) {
            items.push({ 
                date: `${year}-${m.toString().padStart(2, '0')}-01`, 
                desc: `MENSALIDADE - MÊS ${m}`, 
                debit: monthlyFee, 
                credit: 0 
            });
        }

        ensureArray(student.payments).filter(p => Number(p.academicYear) === Number(year)).forEach(p => {
            items.push({ 
                date: p.date, 
                desc: `PAGAMENTO: ${p.type} (${p.method || 'Geral'})`, 
                debit: 0, 
                credit: p.amount 
            });
        });

        return items.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [student, year, financialSettings]);

    let runningBalance = 0;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Extrato de Conta Corrente</h3>
                        <p className="text-sm font-bold text-indigo-500">{student.name} • Ano Letivo {year}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                        <CloseIcon className="w-8 h-8 text-slate-400" />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto p-8">
                    <table className="w-full text-sm">
                        <thead className="text-[10px] font-black uppercase text-slate-400 border-b">
                            <tr>
                                <th className="text-left py-4">Data</th>
                                <th className="text-left py-4">Descrição</th>
                                <th className="text-right py-4">Débito</th>
                                <th className="text-right py-4">Crédito</th>
                                <th className="text-right py-4">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ledger.map((item, i) => {
                                runningBalance += (item.debit - item.credit);
                                return (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 text-slate-500 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="py-4 font-bold text-slate-700">{item.desc}</td>
                                        <td className="py-4 text-right text-rose-600 font-bold">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                                        <td className="py-4 text-right text-emerald-600 font-bold">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
                                        <td className={`py-4 text-right font-black ${runningBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                            {formatCurrency(runningBalance)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <footer className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">Saldo Corrente</p>
                        <p className="text-3xl font-black">{formatCurrency(Math.abs(runningBalance))}</p>
                        <p className="text-[10px] uppercase font-bold">{runningBalance > 0 ? 'Dívida a Regularizar' : 'Situação Regularizada'}</p>
                    </div>
                    <button onClick={onClose} className="bg-indigo-600 px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all">Fechar Extrato</button>
                </footer>
            </div>
        </div>
    );
};

const StudentInfoCard: React.FC<{ 
    student: Student; 
    selectedYear: number | null; 
    academicYears: AcademicYear[]; 
    schoolSettings: SchoolSettings; 
    turmas: Turma[]; 
    financialSettings: FinancialSettings;
    onOpenStatement: (s: Student) => void;
}> = ({ student, selectedYear, academicYears, schoolSettings, turmas, financialSettings, onOpenStatement }) => {
    const [activeTab, setActiveTab] = useState<'grades' | 'attendance' | 'financial' | 'behavior'>('grades');

    const activeTurma = useMemo(() => {
        if (!selectedYear) return null;
        return turmas.find(t => Number(t.academicYear) === Number(selectedYear) && ensureArray(t.studentIds).includes(student.id));
    }, [turmas, selectedYear, student.id]);

    const academicYearConfig = useMemo(() => academicYears.find(ay => Number(ay.year) === Number(selectedYear)), [academicYears, selectedYear]);
    
    const subjects = useMemo(() => {
        if (!activeTurma || !academicYearConfig) return [];
        return ensureArray(academicYearConfig.subjectsByClass).find(cs => cs.classLevel === activeTurma.classLevel)?.subjects || [];
    }, [activeTurma, academicYearConfig]);

    const hasExam = useMemo(() => {
        if (!activeTurma || !academicYearConfig) return false;
        return !!ensureArray(academicYearConfig.subjectsByClass).find(cs => cs.classLevel === activeTurma.classLevel)?.hasExam;
    }, [activeTurma, academicYearConfig]);

    const calcMF = (acs1: number = 0, acs2: number = 0, at: number = 0) => {
        const p1 = schoolSettings.evaluationWeights?.p1 || 40;
        const p2 = schoolSettings.evaluationWeights?.p2 || 60;
        const mediaACS = (acs1 + acs2) / 2;
        const mf = ((mediaACS * p1) + (at * p2)) / (p1 + p2);
        return parseFloat(mf.toFixed(1));
    };

    const academicSummary = useMemo(() => {
        if (!selectedYear || subjects.length === 0) return { globalAvg: 0, passed: false };
        let totalSum = 0; let count = 0;
        subjects.forEach(sub => {
            const grades = ensureArray(student.grades);
            const t1 = grades.find(g => g.subject === sub.name && g.period === '1º Trimestre' && Number(g.academicYear) === Number(selectedYear));
            const t2 = grades.find(g => g.subject === sub.name && g.period === '2º Trimestre' && Number(g.academicYear) === Number(selectedYear));
            const t3 = grades.find(g => g.subject === sub.name && g.period === '3º Trimestre' && Number(g.academicYear) === Number(selectedYear));
            
            const mf1 = t1 ? calcMF(t1.acs1, t1.acs2, t1.at) : 0;
            const mf2 = t2 ? calcMF(t2.acs1, t2.acs2, t2.at) : 0;
            const mf3 = t3 ? calcMF(t3.acs1, t3.acs2, t3.at) : 0;
            
            const valid = [mf1, mf2, mf3].filter(m => m > 0);
            const mediaI = valid.length > 0 ? valid.reduce((a,b) => a+b, 0) / valid.length : 0;
            
            let final = mediaI;
            if (hasExam) {
                const ex = ensureArray(student.examGrades).find(e => e.subject === sub.name && Number(e.academicYear) === Number(selectedYear));
                if (ex) {
                    const w1 = schoolSettings.examWeights?.internal || 50;
                    const w2 = schoolSettings.examWeights?.exam || 50;
                    final = ((mediaI * w1) + (ex.grade * w2)) / (w1 + w2);
                }
            }
            if (final > 0) { totalSum += final; count++; }
        });
        const avg = count > 0 ? parseFloat((totalSum / count).toFixed(1)) : 0;
        return { globalAvg: avg, passed: avg >= 9.5 };
    }, [student, subjects, selectedYear, hasExam, schoolSettings]);

    // LISTA DE FALTAS: Normalização MySQL
    const attendanceSummary = useMemo(() => {
        if (!selectedYear) return { total: 0, present: 0, absent: 0, late: 0, history: [] };
        
        const targetYear = Number(selectedYear);
        const allAttendance = ensureArray(student.attendance);

        const records = allAttendance.filter(a => {
            const y = safeExtractYear(a.date);
            return y === targetYear;
        });

        const present = records.filter(r => r.status === 'Presente').length;
        const absent = records.filter(r => r.status === 'Ausente').length;
        const late = records.filter(r => r.status === 'Atrasado').length;

        const sortedHistory = [...records].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { 
            total: records.length, 
            present, 
            absent, 
            late, 
            history: sortedHistory 
        };
    }, [student.attendance, selectedYear]);

    return (
        <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden mb-10 transition-all hover:shadow-indigo-100">
            <div className="p-8 bg-slate-900 text-white relative">
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <img className="h-24 w-24 rounded-3xl object-cover border-4 border-indigo-500 shadow-xl" src={student.profilePictureUrl || 'https://i.pravatar.cc/150'} alt="" />
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-3xl font-black uppercase tracking-tight">{student.name}</h3>
                        <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mt-2">
                             {activeTurma ? `${activeTurma.classLevel} • ${activeTurma.name}` : student.desiredClass}
                        </p>
                    </div>
                    <div className="bg-indigo-600 p-6 rounded-3xl text-center min-w-[160px] border border-indigo-400/30 shadow-2xl">
                        <p className="text-[10px] font-black uppercase text-indigo-100 mb-1 tracking-widest">Média Global Anual</p>
                        <p className="text-5xl font-black">{academicSummary.globalAvg || '--'}</p>
                        <p className={`text-[10px] font-bold mt-1 ${academicSummary.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {academicSummary.passed ? 'APROVADO' : 'PENDENTE'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex bg-slate-50 border-b overflow-x-auto no-scrollbar p-2 gap-2">
                {[
                    { id: 'grades', label: 'Pauta de Notas', icon: <ChartBarIcon className="w-4 h-4" /> },
                    { id: 'attendance', label: 'Assiduidade', icon: <CalendarIcon className="w-4 h-4" /> },
                    { id: 'financial', label: 'Financeiro', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
                    { id: 'behavior', label: 'Conduta', icon: <StarIcon className="w-4 h-4" /> }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex items-center px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <span className="mr-2">{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </div>

            <div className="p-4 md:p-10">
                {activeTab === 'grades' && (
                    <div className="overflow-x-auto -mx-4 md:mx-0 rounded-2xl border border-slate-100">
                        <table className="min-w-full text-[10px] border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-black uppercase tracking-tighter">
                                    <th className="p-4 text-left border-r border-white/10 sticky left-0 bg-slate-900 z-10">Disciplina</th>
                                    <th colSpan={5} className="p-2 text-center border-r border-white/10 bg-indigo-900/50">1º Trimestre</th>
                                    <th colSpan={5} className="p-2 text-center border-r border-white/10 bg-slate-800">2º Trimestre</th>
                                    <th colSpan={5} className="p-2 text-center border-r border-white/10 bg-indigo-900/50">3º Trimestre</th>
                                    {hasExam && <th className="p-4 text-center border-r border-white/10 bg-amber-600">Exame</th>}
                                    <th className="p-4 text-right bg-indigo-600">Média Anual</th>
                                </tr>
                                <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[8px] border-b">
                                    <th className="p-2 border-r sticky left-0 bg-slate-100 z-10"></th>
                                    {[1,2,3].map(t => (
                                        <React.Fragment key={t}>
                                            <th className="p-1 border-r text-center">ACS1</th>
                                            <th className="p-1 border-r text-center">ACS2</th>
                                            <th className="p-1 border-r text-center bg-gray-50">MAC</th>
                                            <th className="p-1 border-r text-center">AT</th>
                                            <th className="p-1 border-r text-center bg-indigo-50 font-black">MF</th>
                                        </React.Fragment>
                                    ))}
                                    {hasExam && <th className="p-1 border-r text-center bg-amber-50 font-black">Nota</th>}
                                    <th className="p-1 text-right bg-indigo-100 font-black px-4">FINAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px]">
                                {subjects.length > 0 ? subjects.map(sub => {
                                    const grades = ensureArray(student.grades);
                                    const g1 = grades.find(g => g.subject === sub.name && g.period === '1º Trimestre' && Number(g.academicYear) === Number(selectedYear));
                                    const g2 = grades.find(g => g.subject === sub.name && g.period === '2º Trimestre' && Number(g.academicYear) === Number(selectedYear));
                                    const g3 = grades.find(g => g.subject === sub.name && g.period === '3º Trimestre' && Number(g.academicYear) === Number(selectedYear));
                                    const ex = ensureArray(student.examGrades).find(e => e.subject === sub.name && Number(e.academicYear) === Number(selectedYear));

                                    const getRowData = (g: Grade | undefined) => {
                                        const acs1 = g?.acs1 || 0;
                                        const acs2 = g?.acs2 || 0;
                                        const at = g?.at || 0;
                                        const mac = parseFloat(((acs1 + acs2) / 2).toFixed(1));
                                        const mf = calcMF(acs1, acs2, at);
                                        return { acs1, acs2, mac, at, mf };
                                    };

                                    const r1 = getRowData(g1);
                                    const r2 = getRowData(g2);
                                    const r3 = getRowData(g3);

                                    const valMfs = [r1.mf, r2.mf, r3.mf].filter(m => m > 0);
                                    const medI = valMfs.length > 0 ? valMfs.reduce((a,b)=>a+b,0)/valMfs.length : 0;
                                    let final = medI;
                                    if (hasExam && ex) {
                                        const w1 = schoolSettings.examWeights?.internal || 50;
                                        const w2 = schoolSettings.examWeights?.exam || 50;
                                        final = ((medI * w1) + (ex.grade * w2)) / (w1 + w2);
                                    }

                                    const renderVal = (v: number) => v > 0 ? v : '-';
                                    const renderMF = (v: number) => (
                                        <span className={`font-black ${v >= 9.5 ? 'text-indigo-600' : v > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                            {v > 0 ? v.toFixed(1) : '-'}
                                        </span>
                                    );

                                    return (
                                        <tr key={sub.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="p-3 font-bold text-slate-700 border-r sticky left-0 bg-white z-10">{sub.name}</td>
                                            <td className="p-1 text-center border-r">{renderVal(r1.acs1)}</td>
                                            <td className="p-1 text-center border-r">{renderVal(r1.acs2)}</td>
                                            <td className="p-1 text-center border-r bg-gray-50 text-slate-400">{renderVal(r1.mac)}</td>
                                            <td className="p-1 text-center border-r font-bold">{renderVal(r1.at)}</td>
                                            <td className="p-1 text-center bg-indigo-50/50 border-r">{renderMF(r1.mf)}</td>
                                            <td className="p-1 text-center border-r">{renderVal(r2.acs1)}</td>
                                            <td className="p-1 text-center border-r">{renderVal(r2.acs2)}</td>
                                            <td className="p-1 text-center border-r bg-gray-50 text-slate-400">{renderVal(r2.mac)}</td>
                                            <td className="p-1 text-center border-r font-bold">{renderVal(r2.at)}</td>
                                            <td className="p-1 text-center bg-slate-100 border-r">{renderMF(r2.mf)}</td>
                                            <td className="p-1 text-center border-r">{renderVal(r3.acs1)}</td>
                                            <td className="p-1 text-center border-r">{renderVal(r3.acs2)}</td>
                                            <td className="p-1 text-center border-r bg-gray-50 text-slate-400">{renderVal(r3.mac)}</td>
                                            <td className="p-1 text-center border-r font-bold">{renderVal(r3.at)}</td>
                                            <td className="p-1 text-center bg-indigo-50/50 border-r">{renderMF(r3.mf)}</td>
                                            {hasExam && <td className="p-1 text-center bg-amber-50 border-r font-black text-amber-700">{ex?.grade ? ex.grade.toFixed(1) : '-'}</td>}
                                            <td className={`p-3 text-right font-black bg-indigo-100/30 ${final >= 9.5 ? 'text-slate-900' : 'text-rose-600'}`}>
                                                {final > 0 ? final.toFixed(1) : '-'}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={20} className="py-20 text-center text-slate-400 font-black uppercase tracking-widest opacity-50">Sem pauta disponível.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-10 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">Presenças</p>
                                    <p className="text-4xl font-black text-emerald-700">{attendanceSummary.present}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm text-emerald-500"><CheckCircleIcon className="w-10 h-10" /></div>
                            </div>
                            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black text-rose-600 uppercase mb-1 tracking-widest">Faltas</p>
                                    <p className="text-4xl font-black text-rose-700">{attendanceSummary.absent}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm text-rose-500"><CloseIcon className="w-10 h-10" /></div>
                            </div>
                            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black text-amber-600 uppercase mb-1 tracking-widest">Atrasos</p>
                                    <p className="text-4xl font-black text-amber-700">{attendanceSummary.late}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm text-amber-500"><ClockIcon className="w-10 h-10" /></div>
                            </div>
                            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 tracking-widest">Assiduidade</p>
                                    <p className="text-4xl font-black text-indigo-700">{attendanceSummary.total > 0 ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100) : 100}%</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm text-indigo-500"><ChartBarIcon className="w-10 h-10" /></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-3 text-indigo-600" />
                                Histórico Detalhado de Incidentes
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {attendanceSummary.history.filter(a => a.status !== 'Presente').length > 0 ? (
                                    attendanceSummary.history.filter(a => a.status !== 'Presente').map((record, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.01]">
                                            <div className="flex items-center">
                                                <div className={`p-3 rounded-xl mr-4 ${record.status === 'Ausente' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {record.status === 'Ausente' ? <CloseIcon className="w-6 h-6" /> : <ClockIcon className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <p className="text-md font-black text-slate-800">
                                                        {new Date(record.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{record.status}</p>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-300 uppercase bg-slate-50 px-3 py-1 rounded-full">Automático</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-16 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
                                        <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                        <p className="text-emerald-700 font-black uppercase tracking-widest text-sm">Nenhuma falta ou atraso registado.</p>
                                        <p className="text-emerald-600/60 text-xs mt-1">O aluno possui 100% de assiduidade neste período.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-center md:text-left flex-1">
                            <p className="text-xs text-indigo-500 font-black uppercase tracking-widest mb-2">Situação Financeira</p>
                            <h4 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Extrato de Conta Corrente</h4>
                            <p className="text-sm text-slate-500 mt-2 font-medium max-w-lg">Consulte mensalidades, faturas e todos os pagamentos efetuados no ano letivo corrente de forma detalhada.</p>
                        </div>
                        <button 
                            onClick={() => onOpenStatement(student)}
                            className="w-full md:w-auto bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all transform active:scale-95 flex items-center justify-center"
                        >
                            <PrinterIcon className="w-5 h-5 mr-3" />
                            Ver Extrato Digital
                        </button>
                    </div>
                )}

                {activeTab === 'behavior' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
                        {['1º Trimestre', '2º Trimestre', '3º Trimestre'].map(p => {
                            const evaluations = ensureArray(student.behaviorEvaluations);
                            const evalObj = evaluations.find(b => b.period === p && Number(b.academicYear) === Number(selectedYear));
                            const score = evalObj?.percentage || 0;
                            return (
                                <div key={p} className="p-8 bg-white rounded-[2.5rem] text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{p}</p>
                                    <div className={`text-5xl font-black mb-4 ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-indigo-600' : 'text-rose-600'}`}>
                                        {score ? `${score}%` : '--'}
                                    </div>
                                    <div className="flex justify-center gap-1">
                                        {[1,2,3,4,5].map(s => <StarIcon key={s} className={`w-5 h-5 ${s <= Math.round(score/20) ? 'text-amber-400' : 'text-slate-100'}`} filled />)}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">
                                        {score === 0 ? 'Sem Avaliação' : score >= 80 ? 'Excelente' : score >= 50 ? 'Bom' : 'Requer Atenção'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const GuardianPortal: React.FC<GuardianPortalProps> = ({ user, onLogout, onUpdateCurrentUser, students, onStudentsChange, academicYears, schoolSettings, turmas, financialSettings, activeView = 'painel', setActiveView }) => {
    const myStudents = useMemo(() => students.filter(s => String(s.guardianName).trim().toLowerCase() === String(user.name).trim().toLowerCase()), [students, user.name]);
    
    const availableYears = useMemo(() => {
        const yearsSet = new Set<number>();
        
        myStudents.forEach(s => {
            ensureArray(s.attendance).forEach(a => {
                const y = safeExtractYear(a.date);
                if (y > 2000) yearsSet.add(y);
            });
            ensureArray(s.grades).forEach(g => {
                const y = Number(g.academicYear);
                if (y > 2000) yearsSet.add(y);
            });
            turmas.forEach(t => {
                if (ensureArray(t.studentIds).includes(s.id) && Number(t.academicYear) > 2000) {
                    yearsSet.add(Number(t.academicYear));
                }
            });
        });
        
        academicYears.forEach(ay => {
            if (Number(ay.year) > 2000) yearsSet.add(Number(ay.year));
        });

        if (yearsSet.size === 0) {
            yearsSet.add(new Date().getFullYear());
        }
        
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [myStudents, turmas, academicYears]);

    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [statementStudent, setStatementStudent] = useState<Student | null>(null);
    const [isStatementOpen, setIsStatementOpen] = useState(false);

    useEffect(() => { 
        if (availableYears.length > 0 && (selectedYear === null || !availableYears.includes(Number(selectedYear)))) {
            const activeYear = academicYears.find(ay => ay.status === 'Em Curso')?.year;
            setSelectedYear(activeYear ? Number(activeYear) : Number(availableYears[0])); 
        }
    }, [availableYears, selectedYear, academicYears]);

    return (
        <div className="flex h-screen bg-[#fcfcfd] font-sans overflow-hidden">
            {setActiveView && <Sidebar user={user} activeView={activeView} setActiveView={setActiveView} />}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={onLogout} onUpdateProfile={onUpdateCurrentUser} title="Portal do Encarregado" />
                <main className="flex-1 overflow-y-auto p-4 md:p-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Meus Educandos</h2>
                                <p className="text-slate-500 font-bold mt-2">Acompanhamento Escolar em Tempo Real.</p>
                            </div>
                            {availableYears.length > 0 && (
                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Filtrar por Ano:</span>
                                    <select 
                                        value={selectedYear || ''} 
                                        onChange={(e) => setSelectedYear(Number(e.target.value))} 
                                        className="border-none rounded-xl text-sm font-black text-indigo-600 focus:ring-0 bg-slate-50 py-2 pr-10"
                                    >
                                        {availableYears.map(year => <option key={year} value={year}>Ano Letivo {year}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {myStudents.length > 0 ? (
                            myStudents.map(student => (
                                <StudentInfoCard 
                                    key={student.id} 
                                    student={student} 
                                    selectedYear={selectedYear} 
                                    academicYears={academicYears}
                                    schoolSettings={schoolSettings}
                                    turmas={turmas}
                                    financialSettings={financialSettings}
                                    onOpenStatement={(s) => { setStatementStudent(s); setIsStatementOpen(true); }}
                                />
                            ))
                        ) : (
                            <div className="bg-white text-center p-24 rounded-[3rem] shadow-xl border border-slate-100">
                                <UsersIcon className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                                <h3 className="text-2xl font-black text-slate-800">Nenhum aluno vinculado</h3>
                                <p className="text-slate-400 mt-2">Por favor, contacte a secretaria para associar os seus educandos à sua conta de acesso.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            <StatementModal 
                isOpen={isStatementOpen} 
                onClose={() => setIsStatementOpen(false)} 
                student={statementStudent} 
                year={selectedYear || 2024} 
                financialSettings={financialSettings}
            />
        </div>
    );
};

export default GuardianPortal;
