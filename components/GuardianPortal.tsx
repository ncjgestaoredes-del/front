
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, AcademicYear, SchoolSettings, BehaviorEvaluation, Turma, FinancialSettings, PaymentRecord, PaymentMethod, AppNotification, UserRole, PaymentType } from '../types';
import { LogoutIcon, GraduationCapIcon, ChevronDownIcon, AcademicCapIcon, CheckCircleIcon, ExclamationTriangleIcon, CloseIcon, CalendarIcon, StarIcon, UsersIcon, CurrencyDollarIcon, PrinterIcon, DevicePhoneMobileIcon, SignalIcon } from './icons/IconComponents';
import Sidebar from './Sidebar';
import { View } from './Dashboard';
import { printReceipt } from './ReceiptUtils';

interface GuardianPortalProps {
  user: User;
  onLogout: () => void;
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

const GuardianHeader: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
        <div className="flex items-center text-indigo-600 md:hidden">
            <CheckCircleIcon className="h-8 w-8" />
            <h1 className="text-xl font-bold ml-2">Portal</h1>
        </div>
        <div className="hidden md:block">
             <h2 className="text-2xl font-semibold text-gray-800">Portal do Encarregado</h2>
        </div>
        <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
                <div className="font-semibold text-gray-700">{user.name}</div>
                <div className="text-xs text-gray-500">{user.role}</div>
            </div>
            <img className="h-10 w-10 rounded-full object-cover" src={user.avatarUrl} alt={user.name} />
            <button
                onClick={onLogout}
                title="Sair"
                className="p-2 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 focus:outline-none"
            >
                <LogoutIcon className="w-5 h-5" />
            </button>
        </div>
    </header>
);

interface MobilePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    financialSettings: FinancialSettings;
    onPaymentSuccess: (amount: number, method: string, description: string, referenceMonth?: number) => void;
    pendingAmount: number;
    selectedYear: number;
    academicYears: AcademicYear[];
}

const monthsList = [
    { val: 1, name: 'Janeiro' }, { val: 2, name: 'Fevereiro' }, { val: 3, name: 'Março' },
    { val: 4, name: 'Abril' }, { val: 5, name: 'Maio' }, { val: 6, name: 'Junho' },
    { val: 7, name: 'Julho' }, { val: 8, name: 'Agosto' }, { val: 9, name: 'Setembro' },
    { val: 10, name: 'Outubro' }, { val: 11, name: 'Novembro' }, { val: 12, name: 'Dezembro' }
];

const MobilePaymentModal: React.FC<MobilePaymentModalProps> = ({ isOpen, onClose, student, financialSettings, onPaymentSuccess, pendingAmount, selectedYear, academicYears }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Input, 2: Processing, 3: Success
    const [provider, setProvider] = useState<string>('MPesa');
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [selectedOptionId, setSelectedOptionId] = useState<string>('');
    const [customDescription, setCustomDescription] = useState<string>('');
    const [referenceMonth, setReferenceMonth] = useState<number | undefined>(undefined);
    const [error, setError] = useState('');
    const [isSimulatingPin, setIsSimulatingPin] = useState(false);

    // Calculate discounted values
    const calculateDiscountedFee = (baseValue: number, type: PaymentType): number => {
        const profile = student.financialProfile || { status: 'Normal' };
        if (profile.status === 'Isento Total') return 0;
        if (profile.status === 'Desconto Parcial' && profile.affectedTypes?.includes(type)) {
            const discount = profile.discountPercentage || 0;
            return baseValue * (1 - discount / 100);
        }
        return baseValue;
    };

    // Determine fees based on class
    const fees = useMemo(() => {
        let monthly = financialSettings.monthlyFee;
        let renewal = financialSettings.renewalFee;
        
        if (student.desiredClass) {
            const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === student.desiredClass);
            if (specific) {
                monthly = specific.monthlyFee;
                renewal = specific.renewalFee;
            }
        }
        
        return { 
            monthly: calculateDiscountedFee(monthly, 'Mensalidade'),
            renewal: calculateDiscountedFee(renewal, 'Renovação')
        };
    }, [financialSettings, student.desiredClass, student.financialProfile]);

    // Calculate Available Months Logic
    const availableMonths = useMemo(() => {
        const yearConfig = academicYears.find(y => y.year === selectedYear);
        const start = yearConfig?.startMonth || 2; // Default Feb
        const end = yearConfig?.endMonth || 11;   // Default Nov

        // Get set of months already paid for this year
        const paidMonths = new Set(
            student.payments
                ?.filter(p => p.academicYear === selectedYear && p.referenceMonth)
                .map(p => p.referenceMonth)
        );

        return monthsList.filter(m => {
            // Must be within academic year range
            if (m.val < start || m.val > end) return false;
            // Must not be paid
            if (paidMonths.has(m.val)) return false;
            return true;
        });
    }, [selectedYear, academicYears, student.payments]);

    // Build Payment Options
    const paymentOptions = useMemo(() => {
        const options = [];

        // 1. Debt (if exists)
        if (pendingAmount > 0) {
            options.push({ id: 'debt', label: 'Total em Dívida', value: pendingAmount, type: 'Dívida' });
        }

        // 2. Standard Fees
        options.push({ id: 'monthly', label: 'Mensalidade', value: fees.monthly, type: 'Mensalidade' });
        options.push({ id: 'renewal', label: 'Renovação/Matrícula', value: fees.renewal, type: 'Renovação' });

        // 3. Uniforms
        financialSettings.uniforms.forEach(u => {
            options.push({ id: `uniform_${u.id}`, label: `Uniforme: ${u.name}`, value: calculateDiscountedFee(u.price, 'Uniforme'), type: 'Uniforme' });
        });

        // 4. Books (Filtered by class)
        financialSettings.books
            .filter(b => b.classLevel === student.desiredClass)
            .forEach(b => {
                options.push({ id: `book_${b.id}`, label: `Livro: ${b.title}`, value: calculateDiscountedFee(b.price, 'Material'), type: 'Material' });
            });

        // 5. Custom
        options.push({ id: 'custom', label: 'Outro / Valor Livre', value: 0, type: 'Outros' });

        return options;
    }, [pendingAmount, fees, financialSettings, student.desiredClass, student.financialProfile]);

    useEffect(() => {
        if(isOpen) {
            setStep(1);
            setError('');
            setIsSimulatingPin(false);
            setPhoneNumber(student.guardianContact || ''); // Auto-fill phone
            
            // Set initial reference month
            if (availableMonths.length > 0) {
                setReferenceMonth(availableMonths[0].val);
            }

            // Default selection logic
            if (pendingAmount > 0) {
                setSelectedOptionId('debt');
                setAmount(pendingAmount.toString());
                setCustomDescription('Pagamento de Dívida Pendente');
            } else {
                setSelectedOptionId('monthly');
                setAmount(fees.monthly.toString());
                const mName = availableMonths.length > 0 ? availableMonths[0].name : '';
                setCustomDescription(mName ? `Pagamento de Mensalidade (${mName})` : 'Pagamento de Mensalidade');
            }
        }
    }, [isOpen, pendingAmount, fees, student.guardianContact, availableMonths]);

    // Update description when month changes (if monthly fee selected)
    useEffect(() => {
        if (selectedOptionId === 'monthly') {
            if (referenceMonth) {
                const mName = monthsList.find(m => m.val === referenceMonth)?.name;
                setCustomDescription(`Pagamento de Mensalidade (${mName})`);
            } else {
                setCustomDescription('Pagamento de Mensalidade');
            }
        }
    }, [referenceMonth, selectedOptionId]);

    const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const optId = e.target.value;
        setSelectedOptionId(optId);
        
        const option = paymentOptions.find(o => o.id === optId);
        if (option) {
            if (option.id !== 'custom') {
                setAmount(option.value.toString());
                if (option.id === 'monthly') {
                    if (availableMonths.length > 0) {
                        const mName = monthsList.find(m => m.val === referenceMonth)?.name || availableMonths[0].name;
                        // Ensure valid month is selected if current is invalid
                        if (!availableMonths.find(m => m.val === referenceMonth)) {
                            setReferenceMonth(availableMonths[0].val);
                        }
                        setCustomDescription(`Pagamento de Mensalidade (${mName})`);
                    } else {
                        setReferenceMonth(undefined);
                        setCustomDescription('Pagamento de Mensalidade (Todas pagas)');
                    }
                } else {
                    setCustomDescription(`Pagamento de ${option.label}`);
                }
            } else {
                setAmount('');
                setCustomDescription('Pagamento Diverso');
            }
        }
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency });
    };

    const handleConfirm = () => {
        if (!phoneNumber || !amount || Number(amount) < 0) { // Allow 0 if 100% discount
            setError('Por favor, insira um número de telefone e um valor válido.');
            return;
        }
        if (selectedOptionId === 'monthly' && !referenceMonth) {
            setError('Não há mensalidades pendentes para este ano letivo.');
            return;
        }
        setStep(2);
    };

    const handleSimulatePin = () => {
        setIsSimulatingPin(true);
        // Simulate network delay after PIN entry
        setTimeout(() => {
            setIsSimulatingPin(false);
            setStep(3);
        }, 2000);
    };

    const handleFinish = () => {
        const isMonthly = selectedOptionId === 'monthly';
        onPaymentSuccess(Number(amount), provider, customDescription, isMonthly ? referenceMonth : undefined);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden relative">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold flex items-center">
                            <DevicePhoneMobileIcon className="w-5 h-5 mr-2" />
                            Pagamento Mobile
                        </h3>
                        <p className="text-xs text-gray-300 mt-1">Pague via M-Pesa, e-Mola ou mKesh para {selectedYear}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Serviço</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['MPesa', 'e-Mola', 'mKesh'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setProvider(p)}
                                            className={`py-2 px-1 text-sm font-bold rounded-lg border-2 transition-all ${
                                                provider === p 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">O que deseja pagar?</label>
                                <select
                                    value={selectedOptionId}
                                    onChange={handleOptionChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm"
                                >
                                    {paymentOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.label} {opt.value >= 0 ? `(${formatCurrency(opt.value)})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedOptionId === 'monthly' && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mês de Referência ({selectedYear})</label>
                                    {availableMonths.length > 0 ? (
                                        <select
                                            value={referenceMonth}
                                            onChange={(e) => setReferenceMonth(Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-blue-50 text-sm font-bold text-blue-900"
                                        >
                                            {availableMonths.map(m => (
                                                <option key={m.val} value={m.val}>{m.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="p-2 bg-green-100 text-green-800 text-xs rounded border border-green-200 font-semibold text-center">
                                            Todas as mensalidades deste ano letivo já foram pagas!
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Telefone</label>
                                <div className="relative">
                                    <input 
                                        type="tel" 
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="84/85 123 4567"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg tracking-wide"
                                    />
                                    <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor a Pagar ({financialSettings.currency})</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-bold text-gray-800"
                                        disabled={selectedOptionId === 'monthly' && availableMonths.length === 0}
                                    />
                                    <div className="absolute right-3 top-3 text-xs text-gray-400 pointer-events-none">Editável</div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">O valor foi preenchido automaticamente, mas pode ser alterado.</p>
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <button 
                                onClick={handleConfirm}
                                disabled={selectedOptionId === 'monthly' && availableMonths.length === 0}
                                className={`w-full text-white font-bold py-3 rounded-lg shadow-lg transform transition hover:-translate-y-0.5 ${
                                    selectedOptionId === 'monthly' && availableMonths.length === 0 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                Pagar Agora
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Aguardando Confirmação no Telemóvel</h4>
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800 mb-6 text-left">
                                <p className="mb-2 font-semibold">Instruções:</p>
                                <ul className="list-disc pl-4 space-y-1 text-blue-700">
                                    <li>Uma solicitação foi enviada para <strong>{phoneNumber}</strong>.</li>
                                    <li>Verifique o seu telemóvel agora.</li>
                                    <li>Insira o seu <strong>PIN do {provider}</strong> para confirmar a transação.</li>
                                </ul>
                            </div>
                            
                            <div className="flex justify-center">
                                <button
                                    onClick={handleSimulatePin}
                                    disabled={isSimulatingPin}
                                    className={`flex items-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all ${isSimulatingPin ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {isSimulatingPin ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Verificando PIN...
                                        </>
                                    ) : (
                                        <>
                                            <SignalIcon className="w-5 h-5 mr-2" />
                                            Simular: Confirmar PIN no Telemóvel
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Esta é uma simulação para fins de demonstração.</p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-12 h-12 text-green-600" />
                            </div>
                            <h4 className="text-2xl font-bold text-gray-800 mb-2">Pagamento Sucesso!</h4>
                            <p className="text-gray-600 text-sm mb-6">
                                O pagamento de <span className="font-bold text-gray-800">{formatCurrency(Number(amount))}</span> foi processado com sucesso.
                            </p>
                            <button 
                                onClick={handleFinish}
                                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-md"
                            >
                                Concluir e Ver Recibo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface FinancialHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    schoolSettings: SchoolSettings;
    financialSettings: FinancialSettings;
}

const FinancialHistoryModal: React.FC<FinancialHistoryModalProps> = ({ isOpen, onClose, student, schoolSettings, financialSettings }) => {
    if (!isOpen) return null;

    const payments = (student.payments || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency });
    };

    const handlePrint = (payment: PaymentRecord) => {
        printReceipt(payment, student, schoolSettings, financialSettings.currency, payment.operatorName || 'Sistema');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <header className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <CurrencyDollarIcon className="w-6 h-6 mr-2 text-green-600"/>
                            Histórico Financeiro
                        </h3>
                        <p className="text-sm text-gray-500">Extrato de pagamentos: {student.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto flex-1">
                    {payments.length > 0 ? (
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(payment.date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-800">
                                                <div className="font-medium">{payment.type}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-xs">{payment.description}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {payment.method}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <button 
                                                    onClick={() => handlePrint(payment)}
                                                    className="text-indigo-600 hover:text-indigo-900 flex items-center justify-center mx-auto"
                                                    title="Imprimir Recibo"
                                                >
                                                    <PrinterIcon className="w-4 h-4 mr-1"/> Recibo
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            <CurrencyDollarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p>Nenhum pagamento registado até o momento.</p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t rounded-b-2xl text-right">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

interface AttendanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
}

const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({ isOpen, onClose, student }) => {
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

    // Reset filter when modal opens/closes or student changes
    useEffect(() => {
        if(isOpen) setSelectedMonth('all');
    }, [isOpen, student]);

    // Sort records by date descending
    const allRecords = useMemo(() => {
        return [...(student.attendance || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student.attendance]);

    // Extract available months
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        allRecords.forEach(record => {
            // Assuming date format YYYY-MM-DD, extract YYYY-MM
            months.add(record.date.substring(0, 7));
        });
        return Array.from(months).sort().reverse();
    }, [allRecords]);

    // Filter records
    const filteredRecords = useMemo(() => {
        if (selectedMonth === 'all') return allRecords;
        return allRecords.filter(r => r.date.startsWith(selectedMonth));
    }, [allRecords, selectedMonth]);

    // Helper to format month name
    const formatMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                <header className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <CalendarIcon className="w-5 h-5 mr-2 text-indigo-600"/>
                            Histórico de Presença
                        </h3>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    {/* Filter Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full p-2 pl-3 pr-8 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">Todos os meses</option>
                            {availableMonths.map(month => (
                                <option key={month} value={month}>
                                    {formatMonth(month)}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                <div className="p-4 overflow-y-auto flex-1">
                    <div className="mb-2 text-xs text-gray-500 uppercase font-semibold tracking-wide">
                        {filteredRecords.length} Registro(s) encontrado(s)
                    </div>
                    {filteredRecords.length > 0 ? (
                        <ul className="space-y-2">
                            {filteredRecords.map((record, index) => (
                                <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-gray-700 font-medium capitalize">
                                        {new Date(record.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        record.status === 'Presente' ? 'bg-green-100 text-green-700' :
                                        record.status === 'Ausente' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {record.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-gray-500">
                            <p>Nenhum registro encontrado para este período.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface StudentInfoCardProps {
    student: Student;
    selectedYear: number | null;
    academicYears: AcademicYear[];
    schoolSettings: SchoolSettings;
    financialSettings: FinancialSettings;
    turmas: Turma[];
    onOpenPaymentModal: (student: Student, debtAmount: number) => void;
}

const StudentInfoCard: React.FC<StudentInfoCardProps> = ({ student, selectedYear, academicYears, schoolSettings, financialSettings, turmas, onOpenPaymentModal }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [activeGradeTab, setActiveGradeTab] = useState<string>('1º Trimestre');
    
    // Calculate Debt Logic
    const debtInfo = useMemo(() => {
        if (!selectedYear) return { amount: 0, hasDebt: false, details: [] };

        let totalDebt = 0;
        const details = [];
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const currentDay = now.getDate();

        const acYear = academicYears.find(y => y.year === selectedYear);
        const startMonth = acYear ? (acYear.startMonth || 2) : 2;
        const endMonth = acYear ? (acYear.endMonth || 11) : 11;

        // Lógica de Isenção (Mesma do FinancialRecords)
        const matriculationDate = new Date(student.matriculationDate);
        const matriculationMonth = matriculationDate.getMonth() + 1; 
        const matriculationYear = matriculationDate.getFullYear();
        
        let effectiveStartMonth = startMonth;
        
        if (matriculationYear === selectedYear) {
            effectiveStartMonth = Math.max(startMonth, matriculationMonth);
        } else if (matriculationYear > selectedYear) {
            // Matrícula futura (ex: final de 2024 para 2025) - Isento se estivermos olhando 2024
             effectiveStartMonth = endMonth + 1; 
        }

        const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        // Determine specific monthly fee
        let monthlyFee = financialSettings.monthlyFee;
        if (student.desiredClass) {
            const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === student.desiredClass);
            if (specific) monthlyFee = specific.monthlyFee;
        }

        // Apply Profile Discount if exists
        const financialProfile = student.financialProfile || { status: 'Normal' };
        let finalMonthlyFee = monthlyFee;
        
        if (financialProfile.status === 'Isento Total') {
            finalMonthlyFee = 0;
        } else if (financialProfile.status === 'Desconto Parcial' && financialProfile.affectedTypes?.includes('Mensalidade')) {
            const discount = financialProfile.discountPercentage || 0;
            finalMonthlyFee = monthlyFee * (1 - discount / 100);
        }

        for (let m = startMonth; m <= endMonth; m++) {
             // Pular meses isentos
             if (m < effectiveStartMonth) continue;

             // Check payment
             const isPaid = student.payments?.some(p => 
                p.academicYear === selectedYear && 
                (p.type === 'Mensalidade' || p.type === 'Matrícula' || p.type === 'Renovação') && 
                p.referenceMonth === m
            );

            if (!isPaid && finalMonthlyFee > 0) { // Only count debt if there is a fee to pay
                let isLate = false;

                // Ano passado não pago = Atrasado
                if (selectedYear < currentYear) {
                    isLate = true;
                } 
                // Ano corrente
                else if (selectedYear === currentYear) {
                    if (m < currentMonth) isLate = true;
                    else if (m === currentMonth) {
                        if (currentDay > (financialSettings.monthlyPaymentLimitDay || 10)) isLate = true;
                    }
                }

                if (isLate) {
                    let debt = finalMonthlyFee;
                    let penalty = 0;
                    
                    // Adicionar multa se NÃO for 'Sem Multa' nem 'Isento Total'
                    const isExemptFromPenalty = financialProfile.status === 'Sem Multa' || financialProfile.status === 'Isento Total';
                    
                    if (financialSettings.latePaymentPenaltyPercent > 0 && !isExemptFromPenalty) {
                        penalty = (debt * (financialSettings.latePaymentPenaltyPercent / 100));
                        debt += penalty;
                    }
                    totalDebt += debt;
                    details.push({ month: months[m-1], amount: finalMonthlyFee, penalty: penalty });
                }
            }
        }

        return { amount: totalDebt, hasDebt: totalDebt > 0, details };
    }, [student, selectedYear, academicYears, financialSettings]);


    const attendanceSummary = useMemo(() => {
        const attendance = student.attendance || [];
        if (attendance.length === 0) {
            return { present: 0, absent: 0, late: 0, percentage: 0 };
        }
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'Presente').length;
        const absent = attendance.filter(a => a.status === 'Ausente').length;
        const late = attendance.filter(a => a.status === 'Atrasado').length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        return { present, absent, late, percentage };
    }, [student.attendance]);

    // Determine Class Level and Exam capability for the SELECTED YEAR
    const { currentClassLevel, hasExam } = useMemo(() => {
        if (!selectedYear) return { currentClassLevel: student.desiredClass, hasExam: false };

        // 1. Find Turma for student in selected year
        const assignedTurma = turmas.find(t => t.academicYear === selectedYear && t.studentIds.includes(student.id));
        const classLvl = assignedTurma ? assignedTurma.classLevel : student.desiredClass;

        // 2. Check Academic Year config for that class level
        const yearData = academicYears.find(y => y.year === selectedYear);
        const classSubjects = yearData?.subjectsByClass?.find(c => c.classLevel === classLvl);
        
        return { 
            currentClassLevel: classLvl,
            hasExam: classSubjects?.hasExam || false 
        };
    }, [selectedYear, academicYears, student, turmas]);

    // Identify Subjects to Display (even if no grades exist)
    const subjectsList = useMemo(() => {
        if (!selectedYear) return [];
        
        // Try to get configured subjects for the class level
        const yearData = academicYears.find(y => y.year === selectedYear);
        const classConfig = yearData?.subjectsByClass?.find(c => c.classLevel === currentClassLevel);
        
        if (classConfig && classConfig.subjects.length > 0) {
            return classConfig.subjects.map(s => s.name);
        }

        // Fallback: distinct subjects from grades if no config found
        const activeGrades = student.grades?.filter(g => g.academicYear === selectedYear) || [];
        return Array.from(new Set(activeGrades.map(g => g.subject)));
    }, [selectedYear, academicYears, currentClassLevel, student.grades]);

    const activeGrades = useMemo(() => {
        return student.grades?.filter(g => g.academicYear === selectedYear) || [];
    }, [student.grades, selectedYear]);

    const globalStats = useMemo(() => {
        if (subjectsList.length === 0) {
            return { average: 'N/A', internalAverage: 'N/A', status: 'N/A', statusColor: 'text-gray-500 bg-gray-100' };
        }

        let totalFinalGrades = 0;
        let totalInternalGrades = 0;
        let subjectsWithGrades = 0;

        subjectsList.forEach(subject => {
            // Calcular média interna (média dos 3 trimestres)
            const t1 = activeGrades.find(g => g.subject === subject && g.period === '1º Trimestre')?.grade || 0;
            const t2 = activeGrades.find(g => g.subject === subject && g.period === '2º Trimestre')?.grade || 0;
            const t3 = activeGrades.find(g => g.subject === subject && g.period === '3º Trimestre')?.grade || 0;
            
            // Consideramos que se houver alguma nota lançada, a disciplina está "ativa"
            if (t1 > 0 || t2 > 0 || t3 > 0 || activeGrades.some(g => g.subject === subject)) {
                 subjectsWithGrades++;
            }
            
            const mediaInterna = (t1 + t2 + t3) / 3;
            totalInternalGrades += mediaInterna;

            let subjectFinal = mediaInterna;

            // Se tem exame, calcular com a fórmula de exame
            if (hasExam) {
                const examGrade = student.examGrades?.find(e => e.subject === subject && e.academicYear === selectedYear)?.grade || 0;
                const p1 = schoolSettings.examWeights?.internal || 50;
                const p2 = schoolSettings.examWeights?.exam || 50;
                const totalWeight = p1 + p2;
                
                subjectFinal = ((mediaInterna * p1) + (examGrade * p2)) / totalWeight;
            }
            
            totalFinalGrades += subjectFinal;
        });

        // Se não houver notas lançadas, retornar N/A ou 0
        if (subjectsWithGrades === 0 && totalFinalGrades === 0) {
             return { average: '0.0', internalAverage: '0.0', status: 'Sem Notas', statusColor: 'text-gray-500 bg-gray-100' };
        }

        // Evitar divisão por zero, usar subjectsList.length para média real do curso
        const finalAverage = totalFinalGrades / subjectsList.length;
        const internalAverage = totalInternalGrades / subjectsList.length;

        const formattedAvg = finalAverage.toFixed(1);
        const formattedInternalAvg = internalAverage.toFixed(1);
        
        let status = 'Reprovado';
        let statusColor = 'text-red-700 bg-red-100';

        if (finalAverage >= 14) {
            status = 'Quadro de Honra';
            statusColor = 'text-green-800 bg-green-200';
        } else if (hasExam) {
             if (finalAverage >= 9.5) {
                status = 'Aprovado';
                statusColor = 'text-green-700 bg-green-100';
             }
        } else {
             if (finalAverage >= 10) {
                status = 'Aprovado';
                statusColor = 'text-green-700 bg-green-100';
             } else if (finalAverage >= 7) {
                 status = 'Em Recuperação';
                 statusColor = 'text-yellow-700 bg-yellow-100';
             }
        }

        return { average: formattedAvg, internalAverage: formattedInternalAvg, status, statusColor };

    }, [activeGrades, student.examGrades, hasExam, schoolSettings, selectedYear, subjectsList]);


    // Annual Situation Logic
    const annualGrades = useMemo(() => {
        if (activeGradeTab !== 'Situação Anual') return [];

        return subjectsList.map(subject => {
            const t1 = student.grades?.find(g => g.subject === subject && g.period === '1º Trimestre' && g.academicYear === selectedYear)?.grade || 0;
            const t2 = student.grades?.find(g => g.subject === subject && g.period === '2º Trimestre' && g.academicYear === selectedYear)?.grade || 0;
            const t3 = student.grades?.find(g => g.subject === subject && g.period === '3º Trimestre' && g.academicYear === selectedYear)?.grade || 0;
            
            const mediaInterna = parseFloat(((t1 + t2 + t3) / 3).toFixed(1));
            let finalGrade = mediaInterna;
            let examGrade = 0;

            if (hasExam) {
                const exam = student.examGrades?.find(e => e.subject === subject && e.academicYear === selectedYear);
                examGrade = exam ? exam.grade : 0;
                
                const p1 = schoolSettings.examWeights?.internal || 50;
                const p2 = schoolSettings.examWeights?.exam || 50;
                const totalWeight = p1 + p2;
                
                finalGrade = parseFloat((((mediaInterna * p1) + (examGrade * p2)) / totalWeight).toFixed(1));
            }

            return {
                subject,
                mediaInterna,
                examGrade,
                finalGrade,
                isApproved: hasExam ? finalGrade >= 9.5 : finalGrade >= 10
            };
        });
    }, [student.grades, student.examGrades, selectedYear, hasExam, schoolSettings, activeGradeTab, subjectsList]);


    // Behavior Logic
    const behaviorEval = useMemo(() => {
        // @ts-ignore
        return student.behaviorEvaluations?.find(b => b.period === activeGradeTab && b.academicYear === selectedYear);
    }, [student.behaviorEvaluations, activeGradeTab, selectedYear]);

    const behaviorCriteriaList = [
        { key: 'assiduidade', label: 'Assiduidade' },
        { key: 'disciplina', label: 'Disciplina' },
        { key: 'participacao', label: 'Participação' },
        { key: 'responsabilidade', label: 'Responsabilidade' },
        { key: 'socializacao', label: 'Socialização' },
        { key: 'atitude', label: 'Atitude' },
        { key: 'organizacao', label: 'Organização' },
    ] as const;

    const getBehaviorStatus = (percentage: number) => {
        if (percentage >= 80) return { label: 'Excelente', color: 'text-green-600 bg-green-100' };
        if (percentage >= 60) return { label: 'Bom', color: 'text-blue-600 bg-blue-100' };
        if (percentage >= 40) return { label: 'Regular', color: 'text-yellow-600 bg-yellow-100' };
        return { label: 'Precisa Melhorar', color: 'text-red-600 bg-red-100' };
    };

    // Format Currency
    const formatCurrency = (val: number) => {
        return val.toLocaleString(undefined, { style: 'currency', currency: financialSettings.currency });
    };

    return (
        <>
            <AttendanceHistoryModal 
                isOpen={isHistoryOpen} 
                onClose={() => setIsHistoryOpen(false)} 
                student={student} 
            />
            <FinancialHistoryModal 
                isOpen={isFinancialModalOpen}
                onClose={() => setIsFinancialModalOpen(false)}
                student={student}
                financialSettings={financialSettings}
                schoolSettings={schoolSettings}
            />
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 mb-6 relative">
                 {/* DEBT BLOCKER CARD */}
                 {debtInfo.hasDebt && (
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center space-x-4">
                                <img src={student.profilePictureUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100" />
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                                    <p className="text-md text-gray-500">{currentClassLevel} • Matrícula: {student.id}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {financialSettings.enableMobilePayments && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenPaymentModal(student, debtInfo.amount); }}
                                        className="flex items-center space-x-2 text-sm text-white font-bold bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        <DevicePhoneMobileIcon className="w-5 h-5"/>
                                        <span>Pagar (Mobile)</span>
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsFinancialModalOpen(true); }}
                                    className="flex items-center space-x-2 text-sm text-green-700 font-bold bg-green-50 px-4 py-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                                >
                                    <CurrencyDollarIcon className="w-5 h-5"/>
                                    <span>Financeiro</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded shadow-sm">
                            <div className="flex items-start">
                                <div className="p-3 bg-red-100 rounded-full mr-4 flex-shrink-0">
                                    <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-red-800">Pendência Financeira Detectada</h3>
                                    <p className="text-red-700 mt-1">
                                        A visualização das notas e frequência deste aluno está temporariamente suspensa devido a mensalidades em atraso.
                                    </p>
                                    
                                    <div className="mt-4 bg-white p-4 rounded border border-red-200">
                                        <h4 className="font-bold text-red-800 mb-2 border-b border-red-100 pb-1 text-sm">Extrato de Dívida</h4>
                                        <ul className="space-y-2 mb-3">
                                            {debtInfo.details.map((d, idx) => (
                                                <li key={idx} className="flex justify-between text-sm text-red-700">
                                                    <span>Mensalidade {d.month} {d.penalty > 0 ? `(+Multa)` : ''}</span>
                                                    <span className="font-mono">{formatCurrency(d.amount + d.penalty)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex justify-between items-center pt-2 border-t border-red-100">
                                            <span className="font-bold text-red-800">Total em Dívida:</span>
                                            <span className="text-xl font-bold text-red-900">{formatCurrency(debtInfo.amount)}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-red-600 mt-2">
                                        Por favor, utilize a opção "Pagar (Mobile)" ou dirija-se à secretaria para regularizar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT (Only shown if NO DEBT or if we want to show basic header but hide content) */}
                {/* Strategy: Show Header Always, but block expansion if Debt exists */}
                
                {!debtInfo.hasDebt && (
                <>
                    <div className="flex flex-col">
                        <div 
                            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <div className="flex items-center space-x-4">
                                <img src={student.profilePictureUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100" />
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                                    <p className="text-md text-gray-500">{currentClassLevel} • Matrícula: {student.id}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-6">
                                <div className="text-right hidden sm:block">
                                    <div className="flex space-x-4">
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Média Interna</p>
                                            <p className="text-lg font-bold text-gray-600">
                                                {globalStats.internalAverage}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Média Final</p>
                                            <div className="flex flex-col items-end">
                                                <p className={`text-lg font-bold ${parseFloat(globalStats.average as string) >= (hasExam ? 9.5 : 10) ? 'text-green-600' : 'text-red-600'}`}>
                                                    {globalStats.average}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${globalStats.statusColor}`}>
                                                    {globalStats.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {financialSettings.enableMobilePayments && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onOpenPaymentModal(student, 0); }}
                                            className="hidden md:flex items-center space-x-2 text-sm text-white font-bold bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                            title="Pagar Mensalidade/Outros"
                                        >
                                            <DevicePhoneMobileIcon className="w-5 h-5"/>
                                            <span>Pagar</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsFinancialModalOpen(true); }}
                                        className="hidden md:flex items-center space-x-2 text-sm text-green-700 font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                                        title="Ver Histórico Financeiro"
                                    >
                                        <CurrencyDollarIcon className="w-5 h-5"/>
                                        <span>Financeiro</span>
                                    </button>
                                    <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </div>
                        {/* Mobile Financial Button */}
                        <div className="md:hidden px-6 pb-4 flex gap-2">
                             {financialSettings.enableMobilePayments && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onOpenPaymentModal(student, 0); }}
                                    className="flex-1 flex items-center justify-center space-x-2 text-sm text-white font-bold bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <DevicePhoneMobileIcon className="w-5 h-5"/>
                                    <span>Pagar</span>
                                </button>
                             )}
                             <button
                                onClick={(e) => { e.stopPropagation(); setIsFinancialModalOpen(true); }}
                                className="flex-1 flex items-center justify-center space-x-2 text-sm text-green-700 font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                            >
                                <CurrencyDollarIcon className="w-5 h-5"/>
                                <span>Financeiro</span>
                            </button>
                        </div>
                    </div>
                    
                    {isExpanded && (
                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            {/* Tabs */}
                            <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 overflow-x-auto max-w-md mx-auto">
                                {['1º Trimestre', '2º Trimestre', '3º Trimestre', 'Situação Anual'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveGradeTab(tab)}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                                            activeGradeTab === tab 
                                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                
                                {/* --- GRADES SECTION --- */}
                                <div className="xl:col-span-2 space-y-6">
                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                            <h4 className="font-bold text-lg text-gray-800 flex items-center">
                                                <AcademicCapIcon className="w-6 h-6 mr-2 text-indigo-600" />
                                                Boletim de Notas
                                            </h4>
                                            
                                            {/* Summary Badge */}
                                            <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 uppercase font-bold">Média Acumulada</p>
                                                    <p className="text-xl font-bold text-indigo-900 leading-none">{globalStats.average}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${globalStats.statusColor}`}>
                                                    {globalStats.status}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grades Table */}
                                        <div className="overflow-x-auto">
                                            {activeGradeTab === 'Situação Anual' ? (
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                                        <tr>
                                                            <th className="py-3 px-4">Disciplina</th>
                                                            <th className="py-3 px-2 text-center">Média Interna</th>
                                                            {hasExam && <th className="py-3 px-2 text-center text-blue-700 bg-blue-50">Exame</th>}
                                                            <th className="py-3 px-4 text-center font-bold text-indigo-900 bg-indigo-50">Nota Final</th>
                                                            <th className="py-3 px-4 text-center">Situação</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {annualGrades.length > 0 ? (
                                                            annualGrades.map((g, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="py-3 px-4 font-medium text-gray-800">{g.subject}</td>
                                                                    <td className="py-3 px-2 text-center text-gray-600">{g.mediaInterna.toFixed(1)}</td>
                                                                    {hasExam && (
                                                                        <td className="py-3 px-2 text-center font-bold text-blue-700 bg-blue-50">
                                                                            {g.examGrade > 0 ? g.examGrade.toFixed(1) : '-'}
                                                                        </td>
                                                                    )}
                                                                    <td className={`py-3 px-4 text-center font-bold bg-indigo-50 ${
                                                                        g.finalGrade < (hasExam ? 9.5 : 10) ? 'text-red-600' : 'text-indigo-900'
                                                                    }`}>
                                                                        {g.finalGrade.toFixed(1)}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                            g.isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {g.isApproved ? 'Aprovado' : 'Reprovado'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={hasExam ? 5 : 4} className="py-8 text-center text-gray-400 italic">
                                                                    Nenhuma disciplina encontrada para cálculo anual.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                                        <tr>
                                                            <th className="py-3 px-4">Disciplina</th>
                                                            <th className="py-3 px-2 text-center text-xs">ACS 1</th>
                                                            <th className="py-3 px-2 text-center text-xs">ACS 2</th>
                                                            <th className="py-3 px-2 text-center text-xs bg-gray-100">Média ACS</th>
                                                            <th className="py-3 px-2 text-center font-bold text-xs">AT (Prova)</th>
                                                            <th className="py-3 px-4 text-center font-bold text-indigo-900 bg-indigo-50">Média Final</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {subjectsList.length > 0 ? (
                                                            subjectsList.map((subjectName, idx) => {
                                                                // Find grade for this subject and period
                                                                // Fix: Handle potential undefined from find instead of using empty object fallback which lacks properties
                                                                const g = activeGrades.find(g => g.subject === subjectName && g.period === activeGradeTab);
                                                                const acs1 = g?.acs1 || 0;
                                                                const acs2 = g?.acs2 || 0;
                                                                const mediaACS = (acs1 + acs2) / 2;
                                                                const atValue = g?.at || 0;
                                                                const gradeValue = g?.grade;

                                                                return (
                                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                                        <td className="py-3 px-4 font-medium text-gray-800">{subjectName}</td>
                                                                        <td className="py-3 px-2 text-center text-gray-500">{acs1 || '-'}</td>
                                                                        <td className="py-3 px-2 text-center text-gray-500">{acs2 || '-'}</td>
                                                                        <td className="py-3 px-2 text-center text-gray-600 bg-gray-50 font-medium">
                                                                            {mediaACS > 0 ? mediaACS.toFixed(1) : '-'}
                                                                        </td>
                                                                        <td className="py-3 px-2 text-center text-gray-800 font-bold">{atValue || '-'}</td>
                                                                        <td className={`py-3 px-4 text-center font-bold bg-indigo-50 ${
                                                                            (gradeValue || 0) < 10 && (gradeValue || 0) > 0 ? 'text-red-600' : 'text-indigo-900'
                                                                        }`}>
                                                                            {gradeValue !== undefined ? gradeValue.toFixed(1) : '-'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                                                                    Nenhuma disciplina encontrada para este trimestre.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* --- ATTENDANCE & BEHAVIOR SECTION --- */}
                                <div className="xl:col-span-1 space-y-6">
                                    
                                    {/* BEHAVIOR CARD */}
                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center">
                                            <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-amber-500" />
                                            {activeGradeTab === 'Situação Anual' ? 'Comportamento (Último)' : `Comportamento (${activeGradeTab})`}
                                        </h4>
                                        
                                        {activeGradeTab !== 'Situação Anual' && behaviorEval ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                    <span className="text-sm font-medium text-gray-600">Resultado Global</span>
                                                    <div className="text-right">
                                                        <div className="text-xl font-bold text-gray-800">{behaviorEval.percentage}%</div>
                                                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBehaviorStatus(behaviorEval.percentage).color}`}>
                                                            {getBehaviorStatus(behaviorEval.percentage).label}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2">
                                                    {behaviorCriteriaList.map(criteria => (
                                                        <div key={criteria.key} className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-500">{criteria.label}</span>
                                                            <div className="flex">
                                                                {[1, 2, 3, 4, 5].map(s => (
                                                                    <StarIcon 
                                                                        key={s} 
                                                                        className={`w-3 h-3 ${s <= (behaviorEval.scores[criteria.key as keyof BehaviorEvaluation['scores']] || 0) ? 'text-yellow-400' : 'text-gray-200'}`} 
                                                                        filled={s <= (behaviorEval.scores[criteria.key as keyof BehaviorEvaluation['scores']] || 0)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic text-center py-4">
                                                {activeGradeTab === 'Situação Anual' 
                                                    ? "Selecione um trimestre para ver detalhes." 
                                                    : "Sem avaliação comportamental para este período."}
                                            </p>
                                        )}
                                    </div>

                                    {/* Attendance Card */}
                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="font-bold text-lg text-gray-800 flex items-center">
                                                <CheckCircleIcon className="w-6 h-6 mr-2 text-green-600" />
                                                Presenças (Anual)
                                            </h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                                                <p className="text-2xl font-bold text-green-600">{attendanceSummary.percentage}%</p>
                                                <p className="text-xs text-green-800 font-semibold">Presença</p>
                                            </div>
                                            <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                                                <p className="text-2xl font-bold text-red-600">{attendanceSummary.absent}</p>
                                                <p className="text-xs text-red-800 font-semibold">Faltas</p>
                                            </div>
                                            <div className="bg-yellow-50 p-3 rounded-lg text-center border border-yellow-100">
                                                <p className="text-2xl font-bold text-yellow-600">{attendanceSummary.late}</p>
                                                <p className="text-xs text-yellow-800 font-semibold">Atrasos</p>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsHistoryOpen(true); }}
                                            className="w-full text-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition-colors"
                                        >
                                            Ver Histórico Completo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
                )}
            </div>
        </>
    );
};


const GuardianPortal: React.FC<GuardianPortalProps> = ({ user, onLogout, students, onStudentsChange, academicYears, schoolSettings, turmas, financialSettings, activeView = 'painel', setActiveView, onAddNotifications, users }) => {

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
                <GuardianHeader user={user} onLogout={onLogout} />
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
