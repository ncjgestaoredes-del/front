
import React, { useState, useMemo } from 'react';
import { Student, FinancialSettings, SchoolSettings, PaymentRecord, User, AppNotification, UserRole } from '../types';
import { CalendarIcon, CurrencyDollarIcon, ClockIcon, FilterIcon, SendIcon } from './icons/IconComponents';
import { printDailyReport } from './ReceiptUtils';

interface DailyClosingSheetProps {
    students: Student[];
    financialSettings: FinancialSettings;
    schoolSettings: SchoolSettings;
    currentUser: User;
    users: User[];
    onAddNotifications: (notifications: AppNotification[]) => void;
}

const DailyClosingSheet: React.FC<DailyClosingSheetProps> = ({ students, financialSettings, schoolSettings, currentUser, users, onAddNotifications }) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedOperator, setSelectedOperator] = useState<string>('all');

    // Aggregate all payments for the selected date
    const allDailyPayments = useMemo(() => {
        const payments: (PaymentRecord & { studentName: string, className: string, operatorName?: string })[] = [];
        students.forEach(student => {
            if (student.payments) {
                student.payments.forEach(p => {
                    if (p.date === selectedDate) {
                        payments.push({
                            ...p,
                            studentName: student.name,
                            className: student.desiredClass,
                            operatorName: p.operatorName // Include operator name if available
                        });
                    }
                });
            }
        });
        // Sort by ID (roughly chronological if using timestamp in ID)
        return payments.sort((a, b) => a.id.localeCompare(b.id));
    }, [students, selectedDate]);

    // Extract unique operators from today's payments
    const availableOperators = useMemo(() => {
        const ops = new Set(allDailyPayments.map(p => p.operatorName).filter(Boolean));
        return Array.from(ops);
    }, [allDailyPayments]);

    // Filter payments based on selected operator
    const displayedPayments = useMemo(() => {
        if (selectedOperator === 'all') return allDailyPayments;
        return allDailyPayments.filter(p => p.operatorName === selectedOperator);
    }, [allDailyPayments, selectedOperator]);

    // Calculate Summary based on displayed (filtered) payments
    const summary = useMemo(() => {
        const sumByMethod: Record<string, number> = {};
        let total = 0;

        displayedPayments.forEach(p => {
            const method = p.method || 'Outro';
            sumByMethod[method] = (sumByMethod[method] || 0) + p.amount;
            total += p.amount;
        });

        return { sumByMethod, total };
    }, [displayedPayments]);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency });
    };

    const handlePrint = () => {
        const title = selectedOperator === 'all' 
            ? 'Folha de Fecho de Caixa Geral' 
            : `Fecho de Caixa - ${selectedOperator}`;
            
        const signee = selectedOperator === 'all' ? 'Direção' : selectedOperator;

        printDailyReport(
            selectedDate,
            displayedPayments,
            summary.sumByMethod,
            summary.total,
            schoolSettings,
            financialSettings.currency,
            signee,
            title
        );
    };

    const handleNotifyAdmin = () => {
        if (displayedPayments.length === 0) return;

        const dateStr = new Date(selectedDate).toLocaleDateString('pt-BR');
        
        const adminNotifications: AppNotification[] = users
            .filter(u => u.role === UserRole.ADMIN)
            .map(admin => ({
                id: `notif_closing_${Date.now()}_${admin.id}`,
                userId: admin.id,
                type: 'admin_alert',
                title: 'Fecho de Caixa Realizado',
                message: `Fecho de Caixa (${selectedOperator === 'all' ? 'Geral' : selectedOperator}) do dia ${dateStr} confirmado por ${currentUser.name}. Total: ${formatCurrency(summary.total)}.`,
                read: false,
                timestamp: new Date().toISOString()
            }));
        
        onAddNotifications(adminNotifications);
        alert('Administradores notificados com sucesso!');
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <CurrencyDollarIcon className="w-6 h-6 mr-2 text-green-600" />
                        Fecho de Caixa Diário
                    </h3>
                    <p className="text-sm text-gray-500">Resumo financeiro e conciliação de caixa.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative">
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSelectedOperator('all'); // Reset filter on date change
                            }}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                        <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    <div className="flex items-center space-x-2">
                        <FilterIcon className="w-5 h-5 text-gray-500" />
                        <select 
                            value={selectedOperator} 
                            onChange={(e) => setSelectedOperator(e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm text-sm"
                            disabled={allDailyPayments.length === 0}
                        >
                            <option value="all">Todos (Geral)</option>
                            {availableOperators.map((op, idx) => (
                                <option key={idx} value={op as string}>{op}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={handleNotifyAdmin}
                            disabled={displayedPayments.length === 0}
                            title="Confirmar Fecho e Notificar Admin"
                            className={`flex items-center px-4 py-2 rounded-lg font-bold shadow-sm transition-all whitespace-nowrap bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed`}
                        >
                            <SendIcon className="h-5 w-5 mr-2" />
                            Confirmar Fecho
                        </button>
                        <button 
                            onClick={handlePrint}
                            disabled={displayedPayments.length === 0}
                            className={`flex items-center px-4 py-2 rounded-lg font-bold shadow-sm transition-all whitespace-nowrap ${
                                displayedPayments.length > 0 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {displayedPayments.length > 0 ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Grand Total Card */}
                        <div className="bg-green-600 text-white p-6 rounded-xl shadow-md">
                            <p className="text-sm font-medium opacity-80 mb-1">Total Arrecadado</p>
                            <h4 className="text-3xl font-bold">{formatCurrency(summary.total)}</h4>
                            <p className="text-xs mt-2 opacity-70">{displayedPayments.length} transações</p>
                        </div>

                        {/* Method Breakdown Cards */}
                        {Object.entries(summary.sumByMethod).map(([method, value]) => {
                            const amount = value as number;
                            return (
                                <div key={method} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{method}</p>
                                        <h4 className="text-2xl font-bold text-gray-800">{formatCurrency(amount)}</h4>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                                        <div 
                                            className="bg-indigo-500 h-1.5 rounded-full" 
                                            style={{ width: `${(amount / summary.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h4 className="font-bold text-gray-800">Detalhamento de Transações</h4>
                            {selectedOperator !== 'all' && (
                                <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                    Operador: {selectedOperator}
                                </span>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref/Hora</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {displayedPayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                                                <ClockIcon className="w-4 h-4 mr-1 text-gray-400" />
                                                #{p.id.split('_')[1]}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{p.studentName}</div>
                                                <div className="text-xs text-gray-500">{p.className}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    p.type === 'Mensalidade' ? 'bg-blue-100 text-blue-800' :
                                                    p.type === 'Matrícula' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {p.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={p.description}>
                                                {p.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                                                {p.method}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {p.operatorName || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                                {formatCurrency(p.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white p-12 rounded-2xl shadow-lg text-center border border-dashed border-gray-300">
                    <div className="mx-auto bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Sem movimentos</h3>
                    <p className="text-gray-500 mt-1">
                        {allDailyPayments.length === 0 
                            ? `Não foram encontrados pagamentos registados para a data ${new Date(selectedDate).toLocaleDateString('pt-BR')}.` 
                            : `O operador selecionado não possui transações nesta data.`}
                    </p>
                </div>
            )}
        </div>
    );
};

export default DailyClosingSheet;
