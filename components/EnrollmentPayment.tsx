
import React, { useState, useMemo, useEffect } from 'react';
import { Student, FinancialSettings, AcademicYear, PaymentRecord, SchoolSettings, PaymentItem, PaymentMethod, User, AppNotification, UserRole, PaymentType } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon } from './icons/IconComponents';
import { printReceipt } from './ReceiptUtils';

interface EnrollmentPaymentProps {
    students: Student[];
    onStudentsChange: (students: Student[]) => void;
    financialSettings: FinancialSettings;
    academicYears: AcademicYear[];
    currentUser: User;
    users: User[];
    onAddNotifications: (notifications: AppNotification[]) => void;
}

type PaymentTypeOption = 'new' | 'renewal';

const months = [
    { val: 1, name: 'Janeiro' }, { val: 2, name: 'Fevereiro' }, { val: 3, name: 'Março' },
    { val: 4, name: 'Abril' }, { val: 5, name: 'Maio' }, { val: 6, name: 'Junho' },
    { val: 7, name: 'Julho' }, { val: 8, name: 'Agosto' }, { val: 9, name: 'Setembro' },
    { val: 10, name: 'Outubro' }, { val: 11, name: 'Novembro' }, { val: 12, name: 'Dezembro' }
];

const paymentMethods: PaymentMethod[] = ['Numerário', 'Transferência Bancária', 'MPesa', 'e-Mola', 'mKesh', 'POS'];

const EnrollmentPayment: React.FC<EnrollmentPaymentProps> = ({ students, onStudentsChange, financialSettings, academicYears, currentUser, users, onAddNotifications }) => {
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedYear, setSelectedYear] = useState<number | ''>('');
    const [paymentType, setPaymentType] = useState<PaymentTypeOption>('new');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Numerário');
    const [selectedUniforms, setSelectedUniforms] = useState<Record<string, boolean>>({});
    const [selectedBooks, setSelectedBooks] = useState<Record<string, boolean>>({});
    
    // New state for optional first month payment
    const [payFirstMonth, setPayFirstMonth] = useState(true);
    
    const [isSuccess, setIsSuccess] = useState(false);
    const [lastPayment, setLastPayment] = useState<PaymentRecord | null>(null);

    // Set default year to current active one
    useEffect(() => {
        const activeYear = academicYears.find(y => y.status === 'Em Curso' || y.status === 'Planeado');
        if (activeYear) setSelectedYear(activeYear.year);
    }, [academicYears]);

    // Filter students who have NOT paid enrollment/renewal for the selected year
    const eligibleStudents = useMemo(() => {
        if (!selectedYear) return [];
        
        return students.filter(student => {
            const hasPaid = student.payments?.some(p => 
                p.academicYear === Number(selectedYear) && 
                (p.type === 'Matrícula' || p.type === 'Renovação')
            );
            return !hasPaid;
        });
    }, [students, selectedYear]);

    // Clear selected student if they are no longer eligible (e.g. changing year)
    useEffect(() => {
        if (selectedStudentId && !eligibleStudents.find(s => s.id === selectedStudentId)) {
            setSelectedStudentId('');
            setSelectedUniforms({});
            setSelectedBooks({});
        }
    }, [eligibleStudents, selectedStudentId]);

    const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

    // --- LÓGICA DE ALUNO ANTIGO vs NOVO ---
    const isReturningStudent = useMemo(() => {
        if (!selectedStudent || !selectedYear) return false;
        // Verifica se existe algum pagamento de Matrícula ou Renovação em anos ANTERIORES ao selecionado
        return selectedStudent.payments?.some(p => 
            p.academicYear < Number(selectedYear) && 
            (p.type === 'Matrícula' || p.type === 'Renovação')
        ) || false;
    }, [selectedStudent, selectedYear]);

    // --- LÓGICA DE BLOQUEIO POR DÍVIDAS ANTERIORES ---
    const pastDebts = useMemo(() => {
        if (!selectedStudent || !selectedYear || !isReturningStudent) return null;

        const profile = selectedStudent.financialProfile || { status: 'Normal' };
        if (profile.status === 'Isento Total') return null; // Isentos nunca têm bloqueio

        const debts: number[] = [];
        const matriculationYear = new Date(selectedStudent.matriculationDate).getFullYear();

        // Verificar cada ano anterior, desde a matrícula até o ano anterior ao selecionado
        academicYears.forEach(ay => {
            if (ay.year < Number(selectedYear) && ay.year >= matriculationYear) {
                // Calcular expectativa de pagamento para este ano passado
                
                // 1. Taxas Base (Renovação/Matrícula)
                let yearObligation = 0;
                let renewalFee = financialSettings.renewalFee;
                let monthlyFee = financialSettings.monthlyFee;

                // Aplicar descontos do perfil
                if (profile.status === 'Desconto Parcial') {
                    if (profile.affectedTypes?.includes('Renovação')) renewalFee *= (1 - (profile.discountPercentage || 0)/100);
                    if (profile.affectedTypes?.includes('Mensalidade')) monthlyFee *= (1 - (profile.discountPercentage || 0)/100);
                }

                // Obrigação: Renovação/Matrícula
                // Se o aluno trancou a matrícula, ele pagou a renovação no início do ano (supostamente).
                // Vamos assumir que Matrícula/Renovação é sempre devida se o aluno esteve ativo em algum momento do ano.
                yearObligation += renewalFee;

                // Mensalidades: Calcular meses ativos
                let monthsInYear = (ay.endMonth || 11) - (ay.startMonth || 2) + 1; // Default total
                
                // LÓGICA DE SUSPENSÃO:
                if (selectedStudent.status === 'Suspenso' && selectedStudent.suspensionDate) {
                    const suspDate = new Date(selectedStudent.suspensionDate);
                    // Se foi suspenso neste ano passado
                    if (suspDate.getFullYear() === ay.year) {
                        // Meses devidos = Meses antes da suspensão
                        // Ex: Start=2, Susp=5 (Maio). Deve: 2, 3, 4, 5. Total = 5 - 2 + 1 = 4.
                        const activeMonthsCount = Math.max(0, (suspDate.getMonth() + 1) - (ay.startMonth || 2) + 1);
                        monthsInYear = Math.min(monthsInYear, activeMonthsCount);
                    } 
                    // Se foi suspenso ANTES deste ano passado, a obrigação é ZERO (exceto talvez renovação se voltou? mas aqui estamos vendo passado)
                    else if (suspDate.getFullYear() < ay.year) {
                        monthsInYear = 0;
                        yearObligation = 0; // Se estava suspenso o ano todo, não deve nada
                    }
                }

                yearObligation += (monthlyFee * monthsInYear);

                // Calcular Total Pago neste ano
                const totalPaidInYear = selectedStudent.payments
                    ?.filter(p => p.academicYear === ay.year && (p.type === 'Matrícula' || p.type === 'Renovação' || p.type === 'Mensalidade'))
                    .reduce((acc, curr) => acc + curr.amount, 0) || 0;

                // Tolerância de 500 meticais
                if (yearObligation > 0 && (yearObligation - totalPaidInYear) > 500) {
                    debts.push(ay.year);
                }
            }
        });

        return debts.length > 0 ? debts : null;
    }, [selectedStudent, selectedYear, isReturningStudent, academicYears, financialSettings]);

    // Forçar o tipo de pagamento baseado no histórico
    useEffect(() => {
        if (selectedStudent) {
            if (isReturningStudent) {
                setPaymentType('renewal');
            } else {
                setPaymentType('new');
            }
        }
    }, [selectedStudent, isReturningStudent]);
    // --------------------------------------

    const relevantBooks = useMemo(() => {
        if (!selectedStudent) return [];
        return financialSettings.books.filter(b => b.classLevel === selectedStudent.desiredClass);
    }, [selectedStudent, financialSettings]);

    // Helper: Calculate fee with discount applied
    const calculateDiscountedFee = (baseValue: number, type: PaymentType): number => {
        if (!selectedStudent) return baseValue;
        const profile = selectedStudent.financialProfile || { status: 'Normal' };

        if (profile.status === 'Isento Total') return 0;
        if (profile.status === 'Desconto Parcial') {
            if (profile.affectedTypes?.includes(type)) {
                const discount = profile.discountPercentage || 0;
                return baseValue * (1 - discount / 100);
            }
        }
        return baseValue;
    };

    // Logic to determine base fee (Specific Class Fee or Global) WITH Discount
    const baseFee = useMemo(() => {
        const specificFee = selectedStudent?.desiredClass 
            ? financialSettings.classSpecificFees?.find(c => c.classLevel === selectedStudent.desiredClass)
            : undefined;

        let rawFee = 0;
        let type: PaymentType = 'Matrícula';

        if (paymentType === 'renewal') {
            rawFee = specificFee ? specificFee.renewalFee : financialSettings.renewalFee;
            type = 'Renovação';
        } else {
            // For 'new' (Matrícula)
            rawFee = specificFee ? specificFee.enrollmentFee : financialSettings.enrollmentFee;
            type = 'Matrícula';
        }
        
        return calculateDiscountedFee(rawFee, type);
    }, [paymentType, selectedStudent, financialSettings]);

    // Logic for Monthly Fee WITH Discount
    const currentMonthlyFee = useMemo(() => {
        const specificFee = selectedStudent?.desiredClass 
            // Fixed typo: replaced 'student.desiredClass' with 'selectedStudent.desiredClass'
            ? financialSettings.classSpecificFees?.find(c => c.classLevel === selectedStudent.desiredClass)
            : undefined;
        const rawFee = specificFee ? specificFee.monthlyFee : financialSettings.monthlyFee;
        return calculateDiscountedFee(rawFee, 'Mensalidade');
    }, [selectedStudent, financialSettings]);
    
    // Reset selections when student changes
    const handleStudentChange = (id: string) => {
        setSelectedStudentId(id);
        setSelectedUniforms({});
        setSelectedBooks({});
        setSelectedMethod('Numerário');
        setPayFirstMonth(true); // Reset to default true
        setIsSuccess(false);
        setLastPayment(null);
    };

    const toggleUniform = (id: string) => {
        setSelectedUniforms(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleBook = (id: string) => {
        setSelectedBooks(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const calculateTotal = () => {
        let total = 0;
        // Base fees
        total += baseFee; 
        total += calculateDiscountedFee(financialSettings.annualExamFee, 'Taxa de Exames');
        
        if (payFirstMonth) {
            total += currentMonthlyFee; // 1ª Mensalidade (Conditional)
        }
        
        // Uniforms
        Object.keys(selectedUniforms).forEach(id => {
            if (selectedUniforms[id]) {
                const item = financialSettings.uniforms.find(u => u.id === id);
                if (item) total += calculateDiscountedFee(item.price, 'Uniforme');
            }
        });

        // Books
        Object.keys(selectedBooks).forEach(id => {
            if (selectedBooks[id]) {
                const item = financialSettings.books.find(b => b.id === id);
                if (item) total += calculateDiscountedFee(item.price, 'Material');
            }
        });

        return total;
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency || 'MZN' });
    };

    const handleProcessPayment = () => {
        if (!selectedStudent || !selectedYear) return;
        if (pastDebts) {
            alert('Não é possível prosseguir. O aluno possui dívidas de anos anteriores.');
            return;
        }

        const paymentTypeLabel = paymentType === 'new' ? 'Matrícula' : 'Renovação';
        const items: PaymentItem[] = [];
        let totalPaid = 0;

        // 1. Add Base Fees to Items
        const baseFeeLabel = (selectedStudent.desiredClass) 
            ? `${paymentTypeLabel} (${selectedStudent.desiredClass})` 
            : paymentTypeLabel;

        items.push({ item: baseFeeLabel, value: baseFee });
        totalPaid += baseFee;

        if (financialSettings.annualExamFee > 0) {
            const examFee = calculateDiscountedFee(financialSettings.annualExamFee, 'Taxa de Exames');
            items.push({ item: 'Taxas de Testes/Exames', value: examFee });
            totalPaid += examFee;
        }

        // Lógica para calcular a 1ª Mensalidade e seu mês de referência
        let firstMonthlyFeeReference: number | undefined = undefined;
        
        // Only process monthly fee if toggle is ON
        if (payFirstMonth && currentMonthlyFee >= 0) { 
            // Determinar o mês de início de cobrança
            const acYear = academicYears.find(y => y.year === Number(selectedYear));
            const startMonth = acYear ? (acYear.startMonth || 2) : 2; // Padrão Fevereiro se não definido
            
            const now = new Date();
            const currentMonth = now.getMonth() + 1; // 1-12

            // Se estamos matriculando para o ano corrente:
            // Se matricular ANTES do inicio das aulas (ex: Jan para aulas em Fev), cobra Fev.
            // Se matricular DEPOIS (ex: Maio), cobra Maio.
            firstMonthlyFeeReference = Math.max(startMonth, currentMonth);

            // Caso especial: Se estivermos matriculando antecipadamente para o PRÓXIMO ano (ex: em Dez 2023 matriculando para 2024)
            // O currentMonth seria 12, mas o startMonth seria 2. Math.max daria 12 (errado).
            // Então se o ano selecionado for maior que o ano atual, usamos o startMonth.
            if (Number(selectedYear) > now.getFullYear()) {
                firstMonthlyFeeReference = startMonth;
            }
            
            const monthName = months.find(m => m.val === firstMonthlyFeeReference)?.name || 'Mês Referência';

            items.push({ item: `1ª Mensalidade (${monthName})`, value: currentMonthlyFee });
            totalPaid += currentMonthlyFee;
        }

        // 2. Add Uniforms
        Object.keys(selectedUniforms).forEach(id => {
            if (selectedUniforms[id]) {
                const item = financialSettings.uniforms.find(u => u.id === id);
                if (item) {
                    const price = calculateDiscountedFee(item.price, 'Uniforme');
                    items.push({ item: item.name, value: price });
                    totalPaid += price;
                }
            }
        });

        // 3. Add Books
        Object.keys(selectedBooks).forEach(id => {
            if (selectedBooks[id]) {
                const item = financialSettings.books.find(b => b.id === id);
                if (item) {
                    const price = calculateDiscountedFee(item.price, 'Material');
                    items.push({ item: item.title, value: price });
                    totalPaid += price;
                }
            }
        });

        const newPayment: PaymentRecord = {
            id: `pay_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: totalPaid,
            type: paymentTypeLabel,
            method: selectedMethod,
            academicYear: Number(selectedYear),
            description: `Pagamento de ${paymentTypeLabel} referente ao ano ${selectedYear}.`,
            items: items,
            operatorName: currentUser.name // Gravando quem fez o pagamento
        };
        
        if (firstMonthlyFeeReference) {
            newPayment.referenceMonth = firstMonthlyFeeReference;
        }

        // Fix: Explicitly cast the returned object to Student to avoid inferred type mismatch with status
        const updatedStudents: Student[] = students.map(s => {
            if (s.id === selectedStudentId) {
                // CORREÇÃO CRÍTICA: Só atualizar a Data de Matrícula se for um ALUNO NOVO (Nova Matrícula).
                // Se for Renovação, manter a data original para cálculo correto de antiguidade e taxas.
                const isNewEnrollment = paymentType === 'new';
                
                return {
                    ...s,
                    status: 'Ativo', // Reativa o aluno se estiver suspenso
                    suspensionDate: undefined, // Limpa data de suspensão ao renovar
                    payments: [...(s.payments || []), newPayment],
                    matriculationDate: isNewEnrollment 
                        ? new Date().toISOString().split('T')[0] 
                        : s.matriculationDate 
                } as Student;
            }
            return s;
        });

        onStudentsChange(updatedStudents);
        setLastPayment(newPayment);
        
        // Notify Admins
        const adminNotifications: AppNotification[] = users
            .filter(u => u.role === UserRole.ADMIN)
            .map(admin => ({
                id: `notif_pay_${Date.now()}_${admin.id}`,
                userId: admin.id,
                type: 'admin_alert',
                title: 'Recebimento Confirmado',
                message: `Pagamento de ${formatCurrency(totalPaid)} recebido de ${selectedStudent.name} (${paymentTypeLabel}) por ${currentUser.name}.`,
                read: false,
                timestamp: new Date().toISOString()
            }));
        onAddNotifications(adminNotifications);

        setIsSuccess(true);
    };

    const handleReset = () => {
        setSelectedStudentId('');
        setSelectedUniforms({});
        setSelectedBooks({});
        setSelectedMethod('Numerário');
        setPayFirstMonth(true);
        setIsSuccess(false);
        setLastPayment(null);
    };

    const handlePrintReceipt = () => {
        if (lastPayment && selectedStudent) {
            const storedSettings = localStorage.getItem('school_settings');
            const schoolSettings: SchoolSettings = storedSettings ? JSON.parse(storedSettings) : {
                totalClassrooms: 0, studentsPerClass: 0, shifts: 0 
            };
            const operatorToPrint = lastPayment.operatorName || currentUser.name;
            printReceipt(lastPayment, selectedStudent, schoolSettings, financialSettings.currency, operatorToPrint);
        }
    };

    if (isSuccess && selectedStudent) {
        return (
            <div className="bg-white p-12 rounded-2xl shadow-lg text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <CheckCircleIcon className="w-16 h-16 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Pagamento Registrado!</h3>
                <p className="text-gray-600 mb-6">O pagamento via {selectedMethod} foi processado e o aluno {selectedStudent.name} está habilitado para o Ano Letivo {selectedYear}.</p>
                
                <div className="flex gap-4">
                    <button 
                        onClick={handlePrintReceipt}
                        className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 shadow-md transition-transform transform hover:scale-105 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir Recibo
                    </button>
                    <button 
                        onClick={handleReset}
                        className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Nova Operação
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Selection Form */}
            <div className="lg:col-span-2 space-y-6">
                {/* 1. Student Selection */}
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">1. Selecionar Aluno e Ano</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo Referente</label>
                            <select 
                                value={selectedYear} 
                                onChange={e => setSelectedYear(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Selecione...</option>
                                {academicYears.map(y => (
                                    <option key={y.id} value={y.year}>{y.year} ({y.status})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno</label>
                            <select 
                                value={selectedStudentId} 
                                onChange={e => handleStudentChange(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                disabled={!selectedYear}
                            >
                                <option value="">{selectedYear ? 'Selecione...' : 'Selecione o ano primeiro'}</option>
                                {eligibleStudents.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                                ))}
                            </select>
                             {selectedYear && eligibleStudents.length === 0 && (
                                <p className="text-xs text-gray-500 mt-1">Todos os alunos já possuem matrícula paga para este ano.</p>
                             )}
                        </div>
                    </div>
                    {selectedStudent && (
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800 flex justify-between items-center">
                            <span><strong>Classe Pretendida:</strong> {selectedStudent.desiredClass}</span>
                            {selectedStudent.financialProfile && selectedStudent.financialProfile.status !== 'Normal' && (
                                <span className="bg-white px-2 py-1 rounded text-xs font-bold text-green-600 border border-green-200">
                                    {selectedStudent.financialProfile.status}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {selectedStudent && selectedYear && (
                    <>
                        {/* ALERT: DEBT BLOCKER */}
                        {pastDebts && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-md animate-pulse">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-bold text-red-800">Bloqueio Financeiro</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>
                                                O aluno possui dívidas pendentes referentes aos seguintes anos letivos anteriores: <strong>{pastDebts.join(', ')}</strong>.
                                            </p>
                                            <p className="mt-1 font-semibold">
                                                A renovação de matrícula está bloqueada até a regularização dos pagamentos em atraso.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Payment Type */}
                        <div className={`bg-white p-6 rounded-2xl shadow-lg transition-opacity ${pastDebts ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">2. Tipo de Pagamento</h3>
                            <div className="flex space-x-6">
                                <label className={`flex items-center cursor-pointer p-2 rounded-lg border ${paymentType === 'new' ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50 border-gray-200'} ${isReturningStudent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="paymentType" 
                                        value="new" 
                                        checked={paymentType === 'new'} 
                                        onChange={() => setPaymentType('new')}
                                        disabled={isReturningStudent || !!pastDebts}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="ml-2">
                                        <span className="text-gray-700 font-medium block">Nova Matrícula</span>
                                        <span className="text-xs text-gray-500">Para novos alunos</span>
                                    </div>
                                </label>
                                <label className={`flex items-center cursor-pointer p-2 rounded-lg border ${paymentType === 'renewal' ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50 border-gray-200'} ${!isReturningStudent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="paymentType" 
                                        value="renewal" 
                                        checked={paymentType === 'renewal'} 
                                        onChange={() => setPaymentType('renewal')}
                                        disabled={!isReturningStudent || !!pastDebts}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="ml-2">
                                        <span className="text-gray-700 font-medium block">Renovação / Inscrição</span>
                                        <span className="text-xs text-gray-500">Para alunos internos</span>
                                    </div>
                                </label>
                            </div>
                            {isReturningStudent && !pastDebts && (
                                <p className="text-xs text-blue-600 mt-2 ml-1">
                                    ℹ️ O sistema detectou que este aluno já esteve matriculado anteriormente. A opção "Nova Matrícula" está desabilitada.
                                </p>
                            )}
                        </div>

                        {/* 3. Uniforms */}
                         <div className={`bg-white p-6 rounded-2xl shadow-lg transition-opacity ${pastDebts ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">3. Uniformes (Opcional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {financialSettings.uniforms.map(item => (
                                    <label key={item.id} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedUniforms[item.id] ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                checked={!!selectedUniforms[item.id]} 
                                                onChange={() => toggleUniform(item.id)}
                                                className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-600">{formatCurrency(calculateDiscountedFee(item.price, 'Uniforme'))}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                         {/* 4. Books */}
                         <div className={`bg-white p-6 rounded-2xl shadow-lg transition-opacity ${pastDebts ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">4. Livros - {selectedStudent.desiredClass} (Opcional)</h3>
                            {relevantBooks.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {relevantBooks.map(item => (
                                        <label key={item.id} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedBooks[item.id] ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'}`}>
                                            <div className="flex items-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!selectedBooks[item.id]} 
                                                    onChange={() => toggleBook(item.id)}
                                                    className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                />
                                                <span className="ml-2 text-sm font-medium text-gray-700">{item.title}</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-600">{formatCurrency(calculateDiscountedFee(item.price, 'Material'))}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">Nenhum livro cadastrado para esta classe.</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Right Column: Summary & Total */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-2xl shadow-lg sticky top-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b">Resumo do Pagamento</h3>
                    
                    {selectedStudent && selectedYear ? (
                        <div className={`space-y-4 ${pastDebts ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{paymentType === 'new' ? 'Matrícula' : 'Inscrição'} ({selectedYear})</span>
                                <span className="font-medium">{formatCurrency(baseFee)}</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Testes Anuais</span>
                                <span className="font-medium">{formatCurrency(calculateDiscountedFee(financialSettings.annualExamFee, 'Taxa de Exames'))}</span>
                            </div>
                             
                             {/* Optional First Month Checkbox */}
                             <div className="flex justify-between text-sm items-center py-2 border-t border-b border-gray-100 bg-gray-50 -mx-6 px-6">
                                <label className="flex items-center cursor-pointer text-gray-600 select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={payFirstMonth} 
                                        onChange={(e) => setPayFirstMonth(e.target.checked)} 
                                        className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    Incluir 1ª Mensalidade
                                </label>
                                <span className={`font-medium ${payFirstMonth ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                                    {formatCurrency(currentMonthlyFee)}
                                </span>
                            </div>

                            {/* Selected Uniforms Summary */}
                            {Object.keys(selectedUniforms).some(k => selectedUniforms[k]) && (
                                <div className="border-t pt-2 mt-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Uniformes</p>
                                    {Object.keys(selectedUniforms).map(id => {
                                        if(!selectedUniforms[id]) return null;
                                        const item = financialSettings.uniforms.find(u => u.id === id);
                                        if(!item) return null;
                                        return (
                                            <div key={id} className="flex justify-between text-sm text-gray-600 pl-2">
                                                <span>{item.name}</span>
                                                <span>{formatCurrency(calculateDiscountedFee(item.price, 'Uniforme'))}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                             {/* Selected Books Summary */}
                             {Object.keys(selectedBooks).some(k => selectedBooks[k]) && (
                                <div className="border-t pt-2 mt-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Livros</p>
                                    {Object.keys(selectedBooks).map(id => {
                                        if(!selectedBooks[id]) return null;
                                        const item = financialSettings.books.find(b => b.id === id);
                                        if(!item) return null;
                                        return (
                                            <div key={id} className="flex justify-between text-sm text-gray-600 pl-2">
                                                <span>{item.title}</span>
                                                <span>{formatCurrency(calculateDiscountedFee(item.price, 'Material'))}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="border-t border-gray-300 pt-4 mt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-gray-800">Total a Pagar</span>
                                    <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotal())}</span>
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="mt-4 bg-gray-50 p-3 rounded-lg border">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método de Pagamento</label>
                                <select 
                                    value={selectedMethod} 
                                    // @ts-ignore
                                    onChange={e => setSelectedMethod(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                    {paymentMethods.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                onClick={handleProcessPayment}
                                disabled={!!pastDebts}
                                className={`w-full text-white font-bold py-3 px-4 rounded-lg shadow-md transform transition mt-4 ${
                                    pastDebts 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                                }`}
                            >
                                {pastDebts ? 'Bloqueado por Dívida' : 'Confirmar Pagamento'}
                            </button>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 italic">Selecione um aluno e o ano letivo para ver o resumo.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnrollmentPayment;
