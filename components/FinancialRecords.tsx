
import React, { useState, useMemo, useEffect } from 'react';
import { Student, FinancialSettings, AcademicYear, PaymentRecord, SchoolSettings, User, UserRole, PaymentItem, PaymentMethod, AppNotification, PaymentType } from '../types';
import { CheckCircleIcon, CloseIcon, CalendarIcon, TrashIcon, ClockIcon, ExclamationTriangleIcon, EditIcon, PrinterIcon } from './icons/IconComponents';
import { printReceipt, printStudentStatement } from './ReceiptUtils';
import EditPaymentModal from './EditPaymentModal';
import { calculateStudentFinancialSummary, formatCurrency } from '../src/financialUtils';

interface FinancialRecordsProps {
    students: Student[];
    onStudentsChange: (students: Student[]) => void;
    financialSettings: FinancialSettings;
    academicYears: AcademicYear[];
    currentUser: User;
    users: User[];
    onAddNotifications: (notifications: AppNotification[]) => void;
    schoolSettings: SchoolSettings;
}

const months = [
    { val: 1, name: 'Janeiro' }, { val: 2, name: 'Fevereiro' }, { val: 3, name: 'Março' },
    { val: 4, name: 'Abril' }, { val: 5, name: 'Maio' }, { val: 6, name: 'Junho' },
    { val: 7, name: 'Julho' }, { val: 8, name: 'Agosto' }, { val: 9, name: 'Setembro' },
    { val: 10, name: 'Outubro' }, { val: 11, name: 'Novembro' }, { val: 12, name: 'Dezembro' }
];

const paymentMethods: PaymentMethod[] = ['Numerário', 'Transferência Bancária', 'MPesa', 'e-Mola', 'mKesh', 'POS'];

const FinancialRecords: React.FC<FinancialRecordsProps> = ({ students, onStudentsChange, financialSettings, academicYears, currentUser, users, onAddNotifications, schoolSettings }) => {
    const [activeYear, setActiveYear] = useState<number | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'Mensalidade' | 'Uniforme' | 'Material' | 'Multa/Danos'>('Mensalidade');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Numerário');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedUniforms, setSelectedUniforms] = useState<Record<string, boolean>>({});
    const [selectedBooks, setSelectedBooks] = useState<Record<string, boolean>>({});
    const [selectedCharges, setSelectedCharges] = useState<Record<string, boolean>>({}); 
    
    const [isSuccess, setIsSuccess] = useState(false);
    const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

    useEffect(() => {
        const current = academicYears.find(y => y.status === 'Em Curso' || y.status === 'Planeado');
        if (current) setActiveYear(current.year);
    }, [academicYears]);

    const enrolledStudents = useMemo(() => {
        if (!activeYear) return [];
        return students.filter(s => {
            const hasPayments = s.payments?.some(p => p.academicYear === activeYear);
            const nameMatches = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
            const isNotInactive = s.status !== 'Inativo';
            return hasPayments && nameMatches && isNotInactive;
        });
    }, [students, activeYear, searchTerm]);

    const getStudentTotalPaid = (student: Student) => {
        if (!activeYear || !student.payments) return 0;
        return student.payments
            .filter(p => p.academicYear === activeYear)
            .reduce((acc, curr) => acc + curr.amount, 0);
    };

    const getStudentBalance = React.useCallback((student: Student) => {
        if (!activeYear || !financialSettings || !academicYears || academicYears.length === 0) {
            return { balance: 0, status: 'Regular' };
        }
        const summary = calculateStudentFinancialSummary(student, academicYears, financialSettings);
        return {
            balance: summary.balance,
            status: summary.status
        };
    }, [activeYear, financialSettings, academicYears]);

    const getCurrencyLocale = (currency: string) => {
        switch(currency) {
            case 'MZN': return 'pt-MZ';
            case 'AOA': return 'pt-AO';
            case 'USD': return 'en-US';
            case 'EUR': return 'pt-PT';
            default: return 'pt-MZ';
        }
    };

    const formatPrice = (price: number) => {
        const currency = financialSettings.currency || 'MZN';
        const locale = getCurrencyLocale(currency);
        return price.toLocaleString(locale, { style: 'currency', currency: currency });
    };

    const handleOpenStudentDetails = (student: Student) => {
        setSelectedStudent(student);
        setTransactionType(student.extraCharges && student.extraCharges.some(c => !c.isPaid) ? 'Multa/Danos' : 'Mensalidade');
        setSelectedMonth(new Date().getMonth() + 1);
        setSelectedMethod('Numerário');
        setSelectedUniforms({});
        setSelectedBooks({});
        setSelectedCharges({});
        setIsSuccess(false);
        setLastPaymentId(null);
    };

    const handleCloseDetails = () => {
        setSelectedStudent(null);
        setIsTransactionModalOpen(false);
    };
    
    const handlePrintReceipt = (payment: PaymentRecord) => {
        if (!selectedStudent) return;
        const operatorToPrint = payment.operatorName || currentUser.name;
        printReceipt(payment, selectedStudent, schoolSettings, financialSettings.currency, operatorToPrint);
    };

    const handlePrintStatement = () => {
        if (!selectedStudent || !activeYear) return;
        printStudentStatement(selectedStudent, Number(activeYear), financialSettings, schoolSettings, academicYears);
    };

    const handleEditPayment = (payment: PaymentRecord) => {
        setEditingPayment(payment);
        setIsEditModalOpen(true);
    };

    const handleUpdatePayment = (updatedPayment: PaymentRecord) => {
        if (!selectedStudent) return;
        const updatedPayments = selectedStudent.payments?.map(p => p.id === updatedPayment.id ? updatedPayment : p) || [];
        const updatedStudent = { ...selectedStudent, payments: updatedPayments };
        const updatedAllStudents = students.map(s => s.id === selectedStudent.id ? updatedStudent : s);
        onStudentsChange(updatedAllStudents);
        setSelectedStudent(updatedStudent);
    };

    const handleDeletePayment = (paymentId: string) => {
        if (!selectedStudent) return;
        if (window.confirm('Tem certeza de que deseja apagar este registro de pagamento? Esta ação é irreversível.')) {
            const updatedPayments = selectedStudent.payments?.filter(p => p.id !== paymentId);
            const updatedStudent = { ...selectedStudent, payments: updatedPayments };
            const updatedAllStudents = students.map(s => s.id === selectedStudent.id ? updatedStudent : s);
            onStudentsChange(updatedAllStudents);
            setSelectedStudent(updatedStudent);
        }
    };

    const isPaymentLate = React.useCallback((targetMonth: number, academicYear: number, student: Student): boolean => {
        const profile = student.financialProfile;
        if (profile?.status === 'Sem Multa' || profile?.status === 'Isento Total') return false;
        if (!activeYear) return false;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        if (academicYear < currentYear) return true;
        if (academicYear > currentYear) return false;
        if (targetMonth < currentMonth) return true;
        if (targetMonth === currentMonth) {
            const limitDay = financialSettings.monthlyPaymentLimitDay || 10;
            if (currentDay > limitDay) return true;
        }
        return false;
    }, [activeYear, financialSettings.monthlyPaymentLimitDay]);

    const getDiscountedFee = React.useCallback((student: Student | null, baseFee: number, type: PaymentType) => {
        if (!student) return baseFee;
        const profile = student.financialProfile || { status: 'Normal' };
        if (profile.status === 'Isento Total') return 0;
        if (profile.status === 'Desconto Parcial' && profile.affectedTypes?.includes(type)) {
            const discount = profile.discountPercentage || 0;
            return baseFee * (1 - discount / 100);
        }
        return baseFee;
    }, []);

    const getMonthlyFeeForStudent = React.useCallback((student: Student | null) => {
        if (!student || !student.desiredClass) return financialSettings.monthlyFee;
        const specificFee = financialSettings.classSpecificFees?.find(c => c.classLevel === student.desiredClass);
        const baseFee = specificFee ? specificFee.monthlyFee : financialSettings.monthlyFee;
        return getDiscountedFee(student, baseFee, 'Mensalidade');
    }, [financialSettings.monthlyFee, financialSettings.classSpecificFees, getDiscountedFee]);

    const getPenaltyAmount = (): number => {
        if (transactionType !== 'Mensalidade' || !activeYear || !selectedStudent) return 0;
        const isLate = isPaymentLate(selectedMonth, Number(activeYear), selectedStudent);
        if (isLate) {
            const penaltyPercent = financialSettings.latePaymentPenaltyPercent || 0;
            const monthlyFee = getMonthlyFeeForStudent(selectedStudent);
            return monthlyFee * (penaltyPercent / 100);
        }
        return 0;
    };

    const getMonthlyFinancialStatus = React.useCallback((student: Student, year: number, month: number) => {
        const matriculationDate = new Date(student.matriculationDate);
        const matriculationMonth = matriculationDate.getMonth() + 1;
        const matriculationYear = matriculationDate.getFullYear();

        // Se o mês for anterior à matrícula no mesmo ano, ou se o ano for anterior à matrícula
        const isBeforeEnrollment = (matriculationYear === year && month < matriculationMonth) || (matriculationYear > year);

        const payments = student.payments?.filter(p => 
            p.academicYear === year && 
            (p.type === 'Mensalidade' || p.type === 'Matrícula' || p.type === 'Renovação') && 
            p.referenceMonth === month
        ) || [];
        const totalPaid = payments.reduce((acc, curr) => acc + curr.amount, 0);
        
        if (isBeforeEnrollment) {
            return {
                totalPaid,
                totalRequired: 0,
                remaining: 0,
                isFullyPaid: true,
                isPartiallyPaid: false
            };
        }

        const baseFee = getMonthlyFeeForStudent(student);
        const isLate = isPaymentLate(month, year, student);
        const penalty = isLate ? (baseFee * (financialSettings.latePaymentPenaltyPercent / 100)) : 0;
        const totalRequired = baseFee + penalty;
        return {
            totalPaid,
            totalRequired,
            remaining: Math.max(0, totalRequired - totalPaid),
            isFullyPaid: totalPaid >= totalRequired - 1, 
            isPartiallyPaid: totalPaid > 0 && totalPaid < totalRequired - 1,
            penalty
        };
    }, [financialSettings.latePaymentPenaltyPercent, getMonthlyFeeForStudent, isPaymentLate]);

    const calculateTransactionTotal = () => {
        let total = 0;
        if (transactionType === 'Mensalidade') {
            if (selectedStudent && activeYear) {
                const status = getMonthlyFinancialStatus(selectedStudent, Number(activeYear), selectedMonth);
                total = status.remaining;
            } else {
                total = getMonthlyFeeForStudent(selectedStudent) + getPenaltyAmount();
            }
        } else if (transactionType === 'Uniforme') {
            Object.keys(selectedUniforms).forEach(id => {
                if (selectedUniforms[id]) {
                    const item = financialSettings.uniforms.find(u => u.id === id);
                    if (item) total += getDiscountedFee(selectedStudent, item.price, 'Uniforme');
                }
            });
        } else if (transactionType === 'Material') {
            Object.keys(selectedBooks).forEach(id => {
                if (selectedBooks[id]) {
                    const item = financialSettings.books.find(b => b.id === id);
                    if (item) total += getDiscountedFee(selectedStudent, item.price, 'Material');
                }
            });
        } else if (transactionType === 'Multa/Danos') {
            if (selectedStudent && selectedStudent.extraCharges) {
                Object.keys(selectedCharges).forEach(id => {
                    if (selectedCharges[id]) {
                        const charge = selectedStudent.extraCharges?.find(c => c.id === id);
                        if (charge) total += charge.amount;
                    }
                });
            }
        }
        return total;
    };

    const handleProcessTransaction = () => {
        if (!selectedStudent || !activeYear) return;
        if (transactionType === 'Mensalidade') {
            const status = getMonthlyFinancialStatus(selectedStudent, Number(activeYear), selectedMonth);
            if (status.isFullyPaid) {
                alert("Esta mensalidade já foi paga integralmente.");
                return;
            }
        }
        const total = calculateTransactionTotal();
        if (total < 0) {
            alert("O valor total inválido.");
            return;
        }
        const items: PaymentItem[] = [];
        let refMonth = undefined;
        if (transactionType === 'Mensalidade') {
            const monthName = months.find(m => m.val === selectedMonth)?.name;
            const status = getMonthlyFinancialStatus(selectedStudent, Number(activeYear), selectedMonth);
            let itemDesc = `Mensalidade (${monthName})`;
            if (status.isPartiallyPaid) itemDesc += ` - Restante`;
            items.push({ item: itemDesc, value: total });
            refMonth = selectedMonth;
        } else if (transactionType === 'Uniforme') {
             Object.keys(selectedUniforms).forEach(id => {
                if (selectedUniforms[id]) {
                    const item = financialSettings.uniforms.find(u => u.id === id);
                    if (item) items.push({ item: item.name, value: getDiscountedFee(selectedStudent, item.price, 'Uniforme') });
                }
            });
        } else if (transactionType === 'Material') {
             Object.keys(selectedBooks).forEach(id => {
                if (selectedBooks[id]) {
                    const item = financialSettings.books.find(b => b.id === id);
                    if (item) items.push({ item: item.title, value: getDiscountedFee(selectedStudent, item.price, 'Material') });
                }
            });
        } else if (transactionType === 'Multa/Danos') {
             Object.keys(selectedCharges).forEach(id => {
                if (selectedCharges[id]) {
                    const charge = selectedStudent.extraCharges?.find(c => c.id === id);
                    if (charge) items.push({ item: charge.description, value: charge.amount });
                }
            });
        }
        const newPayment: PaymentRecord = {
            id: `pay_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: total,
            type: transactionType,
            method: selectedMethod,
            academicYear: Number(activeYear),
            referenceMonth: refMonth,
            description: transactionType === 'Mensalidade' ? `Pagamento de Mensalidade` : transactionType === 'Multa/Danos' ? 'Pagamento de Dívida / Danos' : transactionType === 'Uniforme' ? 'Compra de Uniforme (Extra)' : 'Compra de Material (Extra)',
            items: items,
            operatorName: currentUser.name
        };
        const updatedExtraCharges = transactionType === 'Multa/Danos' ? (selectedStudent.extraCharges || []).map(c => selectedCharges[c.id] ? { ...c, isPaid: true } : c) : selectedStudent.extraCharges;
        const updatedStudents = students.map(s => s.id === selectedStudent.id ? { ...s, payments: [...(s.payments || []), newPayment], extraCharges: updatedExtraCharges } : s);
        onStudentsChange(updatedStudents);
        setLastPaymentId(newPayment.id);
        const adminNotifications: AppNotification[] = users.filter(u => u.role === UserRole.ADMIN).map(admin => ({
            id: `notif_pay_${Date.now()}_${admin.id}`,
            userId: admin.id,
            type: 'admin_alert',
            title: 'Recebimento Confirmado',
            message: `Pagamento de ${formatPrice(total)} recebido de ${selectedStudent.name} (${transactionType}) por ${currentUser.name}.`,
            read: false,
            timestamp: new Date().toISOString()
        }));
        onAddNotifications(adminNotifications);
        const updatedSelectedStudent = updatedStudents.find(s => s.id === selectedStudent.id);
        if (updatedSelectedStudent) setSelectedStudent(updatedSelectedStudent);
        setIsSuccess(true);
    };

    const handleNewTransaction = () => {
        setIsSuccess(false);
        setLastPaymentId(null);
        setIsTransactionModalOpen(true);
    };
    
    const handlePaySpecificMonth = (monthVal: number) => {
        setIsSuccess(false);
        setLastPaymentId(null);
        setTransactionType('Mensalidade');
        setSelectedMonth(monthVal);
        setIsTransactionModalOpen(true);
    };

    const relevantBooks = useMemo(() => {
        if (!selectedStudent) return [];
        return financialSettings.books.filter(b => b.classLevel === selectedStudent.desiredClass);
    }, [selectedStudent, financialSettings]);

    const isAdmin = currentUser.role === UserRole.ADMIN;

    const monthlyStatus = useMemo(() => {
        if (!selectedStudent || !activeYear) return [];
        const acYear = academicYears.find(y => y.year === activeYear);
        const startMonth = acYear ? (acYear.startMonth || 2) : 2;
        const endMonth = acYear ? (acYear.endMonth || 11) : 11;
        const matriculationDate = new Date(selectedStudent.matriculationDate);
        const matriculationMonth = matriculationDate.getMonth() + 1;
        const matriculationYear = matriculationDate.getFullYear();
        let effectiveStartMonth = startMonth;
        if (matriculationYear === activeYear) {
            effectiveStartMonth = Math.max(startMonth, matriculationMonth);
        } else if (matriculationYear > activeYear) {
            effectiveStartMonth = endMonth + 1; 
        }
        const statusList = [];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        for (let m = startMonth; m <= endMonth; m++) {
            if (m < effectiveStartMonth) {
                statusList.push({ month: m, status: 'Isento', details: { isFullyPaid: true, isPartiallyPaid: false } });
                continue;
            }
            const status = getMonthlyFinancialStatus(selectedStudent, Number(activeYear), m);
            if (status.isFullyPaid) statusList.push({ month: m, status: 'Pago', details: status });
            else if (status.isPartiallyPaid) statusList.push({ month: m, status: 'Parcial', details: status });
            else {
                if (activeYear < currentYear) statusList.push({ month: m, status: 'Atrasado', details: status });
                else if (activeYear > currentYear) statusList.push({ month: m, status: 'Futuro', details: status });
                else {
                    if (m < currentMonth) statusList.push({ month: m, status: 'Atrasado', details: status });
                    else if (m === currentMonth) {
                        const today = new Date().getDate();
                        const limit = financialSettings.monthlyPaymentLimitDay || 10;
                        if (today > limit) statusList.push({ month: m, status: 'Atrasado', details: status });
                        else statusList.push({ month: m, status: 'Pendente', details: status });
                    }
                    else statusList.push({ month: m, status: 'Futuro', details: status });
                }
            }
        }
        return statusList;
    }, [selectedStudent, activeYear, academicYears, financialSettings.monthlyPaymentLimitDay, financialSettings.monthlyFee, financialSettings.latePaymentPenaltyPercent, getMonthlyFinancialStatus]);


    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Histórico Financeiro</h3>
                    <p className="text-sm text-gray-500">Visualize alunos matriculados e registre pagamentos.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <select 
                        value={activeYear} 
                        onChange={e => setActiveYear(Number(e.target.value))}
                        className="p-2 border rounded-lg bg-gray-50"
                    >
                        <option value="">Ano Letivo</option>
                        {academicYears.map(y => <option key={y.id} value={y.year}>{y.year}</option>)}
                    </select>
                    <input 
                        type="text" 
                        placeholder="Buscar aluno..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 border rounded-lg w-full md:w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classe</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Pago ({activeYear})</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {enrolledStudents.length > 0 ? enrolledStudents.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-500">{student.id}</td>
                                <td className="px-6 py-4 flex items-center">
                                    <img className="h-8 w-8 rounded-full object-cover mr-3 flex-shrink-0" src={student.profilePictureUrl} alt="" />
                                    <span className="text-sm font-medium text-gray-900 truncate">{student.name}</span>
                                    {student.financialProfile?.status !== 'Normal' && (
                                        <span className="ml-2 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] border border-indigo-100 whitespace-nowrap">
                                            {student.financialProfile?.status}
                                        </span>
                                    )}
                                    {student.extraCharges && student.extraCharges.some(c => !c.isPaid) && (
                                        <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] border border-red-200 flex items-center whitespace-nowrap">
                                            Dívida
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{student.desiredClass}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-green-600 whitespace-nowrap">
                                    {formatPrice(getStudentTotalPaid(student))}
                                </td>
                                <td className="px-6 py-4 text-center sticky right-0 bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)] md:shadow-none">
                                    <button 
                                        onClick={() => handleOpenStudentDetails(student)}
                                        className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap"
                                    >
                                        Ver Extrato
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                    Nenhum aluno encontrado para este ano letivo.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
                        <header className="flex items-center justify-between p-4 border-b">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h2>
                                <p className="text-sm text-gray-500">Extrato Financeiro - {activeYear}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintStatement}
                                    className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-bold"
                                >
                                    <PrinterIcon className="w-4 h-4 mr-2" />
                                    Imprimir
                                </button>
                                <button onClick={handleCloseDetails} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                                    <CloseIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </header>
                        
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                                        <CalendarIcon className="w-5 h-5 mr-2" />
                                        Carnê de Mensalidades ({activeYear})
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {monthlyStatus.map(ms => {
                                            const monthName = months.find(m => m.val === ms.month)?.name;
                                            let statusColor = 'bg-gray-100 text-gray-500 border-gray-200';
                                            let icon = null;
                                            if (ms.status === 'Pago') { statusColor = 'bg-green-100 text-green-700 border-green-200'; icon = <CheckCircleIcon className="w-4 h-4 ml-1"/>; }
                                            else if (ms.status === 'Parcial') { statusColor = 'bg-blue-100 text-blue-700 border-blue-200'; icon = <ClockIcon className="w-4 h-4 ml-1"/>; }
                                            else if (ms.status === 'Atrasado') {
                                                if (selectedStudent.financialProfile?.status === 'Sem Multa') { statusColor = 'bg-orange-100 text-orange-700 border-orange-200'; icon = <ClockIcon className="w-4 h-4 ml-1"/>; }
                                                else { statusColor = 'bg-red-100 text-red-700 border-red-200'; icon = <ExclamationTriangleIcon className="w-4 h-4 ml-1"/>; }
                                            }
                                            else if (ms.status === 'Pendente') { statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'; icon = <ClockIcon className="w-4 h-4 ml-1"/>; }
                                            else if (ms.status === 'Isento') { statusColor = 'bg-gray-50 text-gray-400 border-gray-100 opacity-60'; }
                                            return (
                                                <div key={ms.month} className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center relative ${statusColor}`}>
                                                    <span className="text-[10px] font-bold uppercase mb-1">{monthName}</span>
                                                    <div className="flex items-center text-xs font-black">
                                                        {ms.status}
                                                        {icon}
                                                    </div>
                                                    {ms.status !== 'Pago' && ms.status !== 'Isento' && ms.status !== 'Futuro' && (
                                                        <button 
                                                            onClick={() => handlePaySpecificMonth(ms.month)}
                                                            className="mt-2 text-[10px] bg-white border border-current rounded px-2 py-1 hover:opacity-80 shadow-sm font-bold uppercase"
                                                        >
                                                            Pagar
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-gray-700">Histórico</h3>
                                        <button onClick={handleNewTransaction} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700">+ Novo</button>
                                    </div>
                                    <div className="border rounded-lg overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedStudent.payments?.filter(p => p.academicYear === activeYear).map(payment => (
                                                    <tr key={payment.id}>
                                                        <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">{new Date(payment.date).toLocaleDateString('pt-BR')}</td>
                                                        <td className="px-4 py-2 text-xs text-gray-800 font-medium">{payment.type}</td>
                                                        <td className="px-4 py-2 text-xs text-right font-bold text-gray-700">{formatPrice(payment.amount)}</td>
                                                        <td className="px-4 py-2 text-center flex justify-center space-x-2">
                                                            <button onClick={() => handlePrintReceipt(payment)} className="text-indigo-600 hover:text-indigo-800 p-1"><PrinterIcon className="w-4 h-4"/></button>
                                                            {isAdmin && (
                                                                <>
                                                                    <button onClick={() => handleEditPayment(payment)} className="text-blue-600 hover:text-blue-800 p-1"><EditIcon className="w-4 h-4"/></button>
                                                                    <button onClick={() => handleDeletePayment(payment.id)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="w-4 h-4"/></button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            {isTransactionModalOpen && (
                                <div className="bg-gray-50 p-6 rounded-xl border border-indigo-100 shadow-lg h-fit sticky top-6">
                                    <h4 className="font-bold text-gray-800 mb-4 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-indigo-600"/>Pagamento</h4>
                                    <div className="space-y-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                                            <select value={transactionType} onChange={e => setTransactionType(e.target.value as any)} className="w-full p-2 border rounded-lg bg-white">
                                                <option value="Mensalidade">Mensalidade</option>
                                                <option value="Uniforme">Uniforme</option>
                                                <option value="Material">Material (Livros)</option>
                                                {(selectedStudent.extraCharges && selectedStudent.extraCharges.length > 0) && (<option value="Multa/Danos">Dívida / Danos</option>)}
                                            </select>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border">
                                            {transactionType === 'Mensalidade' && (
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Mês</label>
                                                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white text-sm mb-2">
                                                        {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                                                    </select>
                                                    {(() => {
                                                        const status = getMonthlyFinancialStatus(selectedStudent, Number(activeYear), selectedMonth);
                                                        if (status.isFullyPaid) return (<div className="bg-green-50 border border-green-200 p-3 rounded text-xs text-green-700 font-bold">Mês Pago Integralmente</div>);
                                                        return (
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-xs text-gray-600"><span>A pagar:</span><span>{formatPrice(status.remaining)}</span></div>
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            )}
                                            {transactionType === 'Uniforme' && (
                                                 <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                                    {financialSettings.uniforms.map(item => (
                                                        <label key={item.id} className="flex items-center justify-between p-1 border-b text-xs cursor-pointer">
                                                            <div className="flex items-center"><input type="checkbox" checked={!!selectedUniforms[item.id]} onChange={() => setSelectedUniforms(prev => ({...prev, [item.id]: !prev[item.id]}))} className="rounded text-indigo-600"/><span className="ml-2">{item.name}</span></div>
                                                            <span className="font-bold">{formatPrice(getDiscountedFee(selectedStudent, item.price, 'Uniforme'))}</span>
                                                        </label>
                                                    ))}
                                                 </div>
                                            )}
                                            {transactionType === 'Material' && (
                                                 <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                                    {relevantBooks.length > 0 ? relevantBooks.map(item => (
                                                        <label key={item.id} className="flex items-center justify-between p-1 border-b text-xs cursor-pointer">
                                                            <div className="flex items-center"><input type="checkbox" checked={!!selectedBooks[item.id]} onChange={() => setSelectedBooks(prev => ({...prev, [item.id]: !prev[item.id]}))} className="rounded text-indigo-600"/><span className="ml-2 truncate max-w-[120px]">{item.title}</span></div>
                                                            <span className="font-bold">{formatPrice(getDiscountedFee(selectedStudent, item.price, 'Material'))}</span>
                                                        </label>
                                                    )) : <p className="text-xs text-gray-500">Sem livros.</p>}
                                                 </div>
                                            )}
                                            {transactionType === 'Multa/Danos' && (
                                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                                    {selectedStudent.extraCharges && selectedStudent.extraCharges.some(c => !c.isPaid) ? (
                                                        selectedStudent.extraCharges.filter(c => !c.isPaid).map(charge => (
                                                            <label key={charge.id} className="flex items-center justify-between p-1 border-b text-xs cursor-pointer">
                                                                <div className="flex items-center"><input type="checkbox" checked={!!selectedCharges[charge.id]} onChange={() => setSelectedCharges(prev => ({...prev, [charge.id]: !prev[charge.id]}))} className="rounded text-red-600"/><span className="ml-2 font-bold text-red-800">{charge.description}</span></div>
                                                                <span className="font-bold text-red-700">{formatPrice(charge.amount)}</span>
                                                            </label>
                                                        ))
                                                    ) : (<p className="text-xs text-gray-500">Sem dívidas.</p>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col pt-4 border-t space-y-3">
                                        <div className="flex justify-between items-center text-md font-bold"><span>Total:</span><span className="text-green-600">{formatPrice(calculateTransactionTotal())}</span></div>
                                        <div className="bg-white p-2 rounded border">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Método</label>
                                            <select value={selectedMethod} onChange={e => setSelectedMethod(e.target.value as any)} className="w-full p-1 border-none text-sm">
                                                {paymentMethods.map(m => (<option key={m} value={m}>{m}</option>))}
                                            </select>
                                        </div>
                                        {isSuccess ? (
                                            <div className="flex flex-col gap-2">
                                                <button className="w-full py-2 bg-green-500 text-white rounded-lg font-bold flex items-center justify-center">Sucesso!</button>
                                                <button onClick={() => { const p = selectedStudent.payments?.find(x => x.id === lastPaymentId); if(p) handlePrintReceipt(p); }} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold">Recibo</button>
                                            </div>
                                        ) : (
                                            <button onClick={handleProcessTransaction} className={`w-full py-2 rounded-lg font-bold text-white ${calculateTransactionTotal() >= 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'}`}>Confirmar</button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <EditPaymentModal 
                        key={editingPayment ? `edit-pay-${editingPayment.id}` : 'edit-pay-none'}
                        isOpen={isEditModalOpen} 
                        onClose={() => setIsEditModalOpen(false)} 
                        payment={editingPayment} 
                        onUpdatePayment={handleUpdatePayment} 
                    />
                </div>
            )}
        </div>
    );
};

export default FinancialRecords;
