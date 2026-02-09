
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, AcademicYear, SchoolSettings, BehaviorEvaluation, Turma, FinancialSettings, PaymentRecord, PaymentMethod, AppNotification, UserRole, PaymentType } from '../types';
import { LogoutIcon, GraduationCapIcon, ChevronDownIcon, AcademicCapIcon, CheckCircleIcon, ExclamationTriangleIcon, CloseIcon, CalendarIcon, StarIcon, UsersIcon, CurrencyDollarIcon, PrinterIcon, DevicePhoneMobileIcon, SignalIcon } from './icons/IconComponents';
import Sidebar from './Sidebar';
import Header from './Header';
import { View } from './Dashboard';
import { printReceipt } from './ReceiptUtils';

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

const GuardianHeader: React.FC<{ user: User; onLogout: () => void; onUpdateProfile: (data: Partial<User>) => void }> = ({ user, onLogout, onUpdateProfile }) => (
    <Header user={user} onLogout={onLogout} onUpdateProfile={onUpdateProfile} title="Portal do Encarregado" />
);

// Added AttendanceHistoryModal to fix missing component error
const AttendanceHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; student: Student; selectedYear: number | null }> = ({ isOpen, onClose, student, selectedYear }) => {
    const records = useMemo(() => {
        if (!selectedYear) return [];
        return (student.attendance || []).filter(a => new Date(a.date).getFullYear() === selectedYear).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student.attendance, selectedYear]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">Histórico de Presenças - {selectedYear}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {records.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead><tr className="text-left border-b">
                                <th className="pb-2">Data</th>
                                <th className="pb-2">Status</th>
                            </tr></thead>
                            <tbody>
                                {records.map((r, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="py-2">{new Date(r.date).toLocaleDateString()}</td>
                                        <td className="py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'Presente' ? 'bg-green-100 text-green-700' : r.status === 'Ausente' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="text-center text-gray-500 py-8">Nenhum registo para este ano.</p>}
                </div>
            </div>
        </div>
    );
};

// Added FinancialHistoryModal to fix missing component error
const FinancialHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; student: Student; selectedYear: number | null; financialSettings: FinancialSettings; schoolSettings: SchoolSettings }> = ({ isOpen, onClose, student, selectedYear, financialSettings, schoolSettings }) => {
    const payments = useMemo(() => {
        if (!selectedYear) return [];
        return (student.payments || []).filter(p => p.academicYear === selectedYear).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student.payments, selectedYear]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">Histórico de Pagamentos - {selectedYear}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {payments.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead><tr className="text-left border-b">
                                <th className="pb-2">Data</th>
                                <th className="pb-2">Tipo</th>
                                <th className="pb-2 text-right">Valor</th>
                                <th className="pb-2 text-center">Ações</th>
                            </tr></thead>
                            <tbody>
                                {payments.map((p, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="py-2">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="py-2">{p.type}</td>
                                        <td className="py-2 text-right font-bold">{p.amount.toLocaleString()} MT</td>
                                        <td className="py-2 text-center">
                                            <button onClick={() => printReceipt(p, student, schoolSettings, financialSettings.currency)} className="text-indigo-600 hover:text-indigo-800"><PrinterIcon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="text-center text-gray-500 py-8">Nenhum pagamento para este ano.</p>}
                </div>
            </div>
        </div>
    );
};

// Added MobilePaymentModal to fix missing component error
const MobilePaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; student: Student; financialSettings: FinancialSettings; onPaymentSuccess: (amount: number, method: string, description: string, referenceMonth?: number) => void; pendingAmount: number; selectedYear: number; academicYears: AcademicYear[] }> = ({ isOpen, onClose, student, financialSettings, onPaymentSuccess, pendingAmount, selectedYear, academicYears }) => {
    const [amount, setAmount] = useState(pendingAmount.toString());
    const [method, setMethod] = useState<'MPesa' | 'e-Mola' | 'mKesh'>('MPesa');
    const [phone, setPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'form' | 'confirm'>('form');

    const handlePay = () => {
        if (!phone || !amount || Number(amount) <= 0) return;
        setIsProcessing(true);
        // Simulate USSD push
        setTimeout(() => {
            setIsProcessing(false);
            onPaymentSuccess(Number(amount), method, `Pagamento Mobile via ${method}`, new Date().getMonth() + 1);
            onClose();
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className={`p-6 text-white flex justify-between items-center ${method === 'MPesa' ? 'bg-red-600' : method === 'e-Mola' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                    <h3 className="font-black uppercase tracking-tight flex items-center"><DevicePhoneMobileIcon className="w-5 h-5 mr-2" /> Pagar via {method}</h3>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-8 space-y-6">
                    {step === 'form' ? (
                        <>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setMethod('MPesa')} className={`p-2 rounded-xl border-2 transition-all ${method === 'MPesa' ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-100 text-gray-400'}`}>M-Pesa</button>
                                <button onClick={() => setMethod('e-Mola')} className={`p-2 rounded-xl border-2 transition-all ${method === 'e-Mola' ? 'border-orange-500 bg-orange-50 text-orange-500' : 'border-gray-100 text-gray-400'}`}>e-Mola</button>
                                <button onClick={() => setMethod('mKesh')} className={`p-2 rounded-xl border-2 transition-all ${method === 'mKesh' ? 'border-yellow-500 bg-yellow-50 text-yellow-600' : 'border-gray-100 text-gray-400'}`}>mKesh</button>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor a Pagar</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-2xl font-black text-center" />
                                <p className="text-[10px] text-gray-500 mt-2">Dívida estimada: {pendingAmount} MT</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Telefone da Conta</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="84/85/86/87..." className="w-full p-4 bg-gray-50 rounded-2xl text-xl font-bold text-center" />
                            </div>
                            <button onClick={() => setStep('confirm')} disabled={!phone || !amount} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Próximo</button>
                        </>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="bg-blue-50 p-6 rounded-2xl">
                                <p className="text-sm text-blue-600">Verifique o seu telemóvel e introduza o seu PIN para autorizar a transação de <strong>{amount} MT</strong>.</p>
                            </div>
                            <button onClick={handlePay} disabled={isProcessing} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center">
                                {isProcessing ? <><SignalIcon className="w-6 h-6 animate-ping mr-3" /> PROCESSANDO...</> : 'JÁ AUTORIZEI'}
                            </button>
                            <button onClick={() => setStep('form')} disabled={isProcessing} className="text-gray-400 font-bold text-xs uppercase tracking-widest">Voltar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Added StudentInfoCard to fix missing component error
const StudentInfoCard: React.FC<{ student: Student; selectedYear: number | null; academicYears: AcademicYear[]; schoolSettings: SchoolSettings; turmas: Turma[]; financialSettings: FinancialSettings; onOpenPaymentModal: (student: Student, debt: number) => void }> = ({ student, selectedYear, academicYears, schoolSettings, turmas, financialSettings, onOpenPaymentModal }) => {
    const [isFinModalOpen, setIsFinModalOpen] = useState(false);
    const [isAttModalOpen, setIsAttModalOpen] = useState(false);

    const activeTurma = useMemo(() => {
        if (!selectedYear) return null;
        return turmas.find(t => t.academicYear === selectedYear && t.studentIds.includes(student.id));
    }, [turmas, selectedYear, student.id]);

    const financialStatus = useMemo(() => {
        if (!selectedYear) return { paid: 0, debt: 0, isLate: false };
        
        const yearPayments = (student.payments || []).filter(p => p.academicYear === selectedYear);
        const totalPaid = yearPayments.reduce((acc, curr) => acc + curr.amount, 0);

        let monthlyFee = financialSettings.monthlyFee;
        if (student.desiredClass) {
            const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === student.desiredClass);
            if (specific) monthlyFee = specific.monthlyFee;
        }

        const now = new Date();
        const startMonth = 2; // Feb
        const currentMonth = now.getMonth() + 1;
        const monthsDue = Math.max(0, currentMonth - startMonth + 1);
        const totalDue = (monthlyFee * monthsDue) + (financialSettings.enrollmentFee || 0);
        
        const debt = Math.max(0, totalDue - totalPaid);

        return { paid: totalPaid, debt, isLate: debt > 0 };
    }, [student, selectedYear, financialSettings]);

    const grades = useMemo(() => {
        if (!selectedYear) return [];
        return (student.grades || []).filter(g => g.academicYear === selectedYear);
    }, [student.grades, selectedYear]);

    const attendanceRate = useMemo(() => {
        if (!selectedYear) return 100;
        const yearAtt = (student.attendance || []).filter(a => new Date(a.date).getFullYear() === selectedYear);
        if (yearAtt.length === 0) return 100;
        const present = yearAtt.filter(a => a.status === 'Presente').length;
        return Math.round((present / yearAtt.length) * 100);
    }, [student.attendance, selectedYear]);

    return (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow">
            <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-800 text-white">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <img className="h-24 w-24 rounded-full object-cover border-4 border-white/20 shadow-lg" src={student.profilePictureUrl || 'https://i.pravatar.cc/150'} alt="" />
                    <div className="text-center md:text-left flex-1">
                        <h3 className="text-2xl font-black uppercase tracking-tight">{student.name}</h3>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                             <div className="flex items-center text-indigo-300 text-xs font-bold uppercase"><AcademicCapIcon className="w-4 h-4 mr-1" /> {activeTurma ? `${activeTurma.classLevel} - ${activeTurma.name}` : student.desiredClass}</div>
                             <div className="flex items-center text-indigo-300 text-xs font-bold uppercase"><CalendarIcon className="w-4 h-4 mr-1" /> ID: {student.id}</div>
                             <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase ${student.status === 'Ativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{student.status}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center border-b pb-2"><ChartBarIcon className="w-4 h-4 mr-2" /> Rendimento Académico</h4>
                    {grades.length > 0 ? (
                        <div className="space-y-2">
                            {grades.slice(0, 3).map((g, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 truncate mr-2">{g.subject}</span>
                                    <span className={`font-black ${g.grade! >= 10 ? 'text-indigo-600' : 'text-red-500'}`}>{g.grade}</span>
                                </div>
                            ))}
                            {grades.length > 3 && <p className="text-[10px] text-gray-400 text-right">+ {grades.length - 3} disciplinas</p>}
                        </div>
                    ) : <p className="text-sm text-gray-400 italic">Sem notas registadas.</p>}
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center border-b pb-2"><CheckCircleIcon className="w-4 h-4 mr-2" /> Assiduidade</h4>
                    <div className="text-center">
                        <div className={`text-4xl font-black ${attendanceRate >= 90 ? 'text-green-600' : 'text-orange-500'}`}>{attendanceRate}%</div>
                        <button onClick={() => setIsAttModalOpen(true)} className="text-[10px] text-indigo-500 font-bold uppercase mt-2 hover:underline tracking-widest">Ver Detalhes</button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center border-b pb-2"><CurrencyDollarIcon className="w-4 h-4 mr-2" /> Situação Financeira</h4>
                    <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Pagas</span><span className="font-bold text-gray-800">{financialStatus.paid.toLocaleString()} MT</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Dívida Estimada</span><span className={`font-bold ${financialStatus.debt > 0 ? 'text-red-500' : 'text-green-600'}`}>{financialStatus.debt.toLocaleString()} MT</span></div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsFinModalOpen(true)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-colors">Extrato</button>
                            {financialStatus.debt > 0 && financialSettings.enableMobilePayments && (
                                <button onClick={() => onOpenPaymentModal(student, financialStatus.debt)} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-700 shadow-lg shadow-green-100 transition-colors">Pagar</button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center border-b pb-2"><ExclamationTriangleIcon className="w-4 h-4 mr-2" /> Comportamento</h4>
                    <div className="space-y-2">
                        {(student.behavior || []).filter(b => new Date(b.date).getFullYear() === selectedYear).length > 0 ? (
                            <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                                <span>{(student.behavior || []).filter(b => new Date(b.date).getFullYear() === selectedYear).length} Ocorrências Negativas</span>
                            </div>
                        ) : (
                            <div className="bg-green-50 text-green-700 p-3 rounded-2xl text-xs font-bold border border-green-100 flex items-center gap-2">
                                <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                                <span>Bom Comportamento</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FinancialHistoryModal isOpen={isFinModalOpen} onClose={() => setIsFinModalOpen(false)} student={student} selectedYear={selectedYear} financialSettings={financialSettings} schoolSettings={schoolSettings} />
            <AttendanceHistoryModal isOpen={isAttModalOpen} onClose={() => setIsAttModalOpen(false)} student={student} selectedYear={selectedYear} />
        </div>
    );
};

const GuardianPortal: React.FC<GuardianPortalProps> = ({ user, onLogout, onUpdateCurrentUser, students, onStudentsChange, academicYears, schoolSettings, turmas, financialSettings, activeView = 'painel', setActiveView, onAddNotifications, users }) => {

    const myStudents = useMemo(() => students.filter(s => s.guardianName === user.name), [students, user.name]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        myStudents.forEach(student => {
            // Grades years
            (student.grades || []).forEach(grade => years.add(grade.academicYear));
            
            // Turmas years - IMPORTANT: Check if student is enrolled in any class for a year
            turmas.forEach(t => {
                if (t.studentIds.includes(student.id)) {
                    years.add(t.academicYear);
                }
            });
        });
        
        // If list empty, maybe student is new or system reset? 
        // We can fallback to 'Em Curso' year from academicYears if needed, but sticking to data is safer.
        if (years.size === 0) {
            const active = academicYears.find(ay => ay.status === 'Em Curso');
            if(active) years.add(active.year);
        }
        
        return Array.from(years).sort((a, b) => b - a);
    }, [myStudents, turmas, academicYears]);

    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
    const [pendingDebt, setPendingDebt] = useState<number>(0);

    useEffect(() => {
        if (availableYears.length > 0 && selectedYear === null) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    const handleOpenPaymentModal = (student: Student, debt: number) => {
        setPaymentStudent(student);
        setPendingDebt(debt);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = (amount: number, method: string, description: string, referenceMonth?: number) => {
        if (!paymentStudent || !onStudentsChange) return;

        const newPayment: PaymentRecord = {
            id: `pay_${Date.now()}_mob`,
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            type: 'Mensalidade', // Default type, description handles details
            method: method as PaymentMethod, // 'MPesa' | 'e-Mola' etc
            academicYear: selectedYear || new Date().getFullYear(),
            description: description,
            referenceMonth: referenceMonth,
            operatorName: user.name, // The guardian initiated it
            items: [{ item: description, value: amount }]
        };

        const updatedStudents = students.map(s => {
            if (s.id === paymentStudent.id) {
                return { ...s, payments: [...(s.payments || []), newPayment] };
            }
            return s;
        });

        onStudentsChange(updatedStudents);

        // Notify Admins
        if (onAddNotifications && users) {
            const admins = users.filter(u => u.role === UserRole.ADMIN);
            const notifications: AppNotification[] = admins.map(admin => ({
                id: `notif_pay_${Date.now()}_${admin.id}`,
                userId: admin.id,
                type: 'admin_alert',
                title: 'Pagamento Mobile Recebido',
                message: `Pagamento de ${amount} recebido de ${user.name} via ${method} para o aluno ${paymentStudent.name}.`,
                read: false,
                timestamp: new Date().toISOString()
            }));
            onAddNotifications(notifications);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {setActiveView && <Sidebar user={user} activeView={activeView} setActiveView={setActiveView} />}
            <div className="flex-1 flex flex-col overflow-hidden">
                <GuardianHeader user={user} onLogout={onLogout} onUpdateProfile={onUpdateCurrentUser} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800">Seus Alunos</h2>
                                <p className="text-gray-500 mt-1">Acompanhe o desempenho escolar, frequência e comportamento.</p>
                            </div>
                            {availableYears.length > 0 && (
                                <div className="flex items-center space-x-3 mt-4 md:mt-0 bg-white p-2 rounded-lg shadow-sm">
                                    <label htmlFor="year-select" className="text-sm font-medium text-gray-700 pl-2">Ano Letivo:</label>
                                    <select
                                        id="year-select"
                                        value={selectedYear || ''}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="text-sm border-gray-200 rounded-md focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-gray-50 py-1.5"
                                    >
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {myStudents.length > 0 ? (
                            <div className="space-y-6">
                                {myStudents.map(student => (
                                    <StudentInfoCard 
                                        key={student.id} 
                                        student={student} 
                                        selectedYear={selectedYear} 
                                        academicYears={academicYears}
                                        schoolSettings={schoolSettings}
                                        turmas={turmas}
                                        financialSettings={financialSettings}
                                        onOpenPaymentModal={handleOpenPaymentModal}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white text-center p-12 rounded-2xl shadow-lg border border-gray-100">
                                <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
                                    <UsersIcon className="h-full w-full" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-700">Nenhum aluno encontrado.</h3>
                                <p className="text-gray-500 mt-2 max-w-md mx-auto">Não há alunos associados à sua conta no momento. Se acredita que isto é um erro, por favor, entre em contato com a secretaria da escola.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            {paymentStudent && selectedYear && (
                <MobilePaymentModal 
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    student={paymentStudent}
                    financialSettings={financialSettings}
                    onPaymentSuccess={handlePaymentSuccess}
                    pendingAmount={pendingDebt}
                    selectedYear={selectedYear}
                    academicYears={academicYears}
                />
            )}
        </div>
    );
};

export default GuardianPortal;
