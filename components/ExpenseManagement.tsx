
import React, { useState, useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory, User, FinancialSettings, AppNotification, UserRole, Student, ExtraCharge } from '../types';
import { TrendingDownIcon, TrashIcon, CalendarIcon, SearchIcon } from './icons/IconComponents';

interface ExpenseManagementProps {
    expenses: ExpenseRecord[];
    onExpensesChange: (expenses: ExpenseRecord[]) => void;
    currentUser: User;
    financialSettings: FinancialSettings;
    users: User[];
    onAddNotifications: (notifications: AppNotification[]) => void;
    students: Student[];
    onStudentsChange: (students: Student[]) => void;
}

const expenseCategories: ExpenseCategory[] = [
    'Salários',
    'Água',
    'Energia',
    'Internet/Telecom',
    'Material didáctico',
    'Manutenção',
    'Transporte',
    'Marketing/Administração',
    'Outras despesas'
];

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ expenses, onExpensesChange, currentUser, financialSettings, users, onAddNotifications, students, onStudentsChange }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<ExpenseCategory>('Salários');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

    // Charge Student State
    const [chargeStudent, setChargeStudent] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency });
    };

    const filteredStudents = useMemo(() => {
        if (!chargeStudent || !studentSearch) return [];
        return students.filter(s => 
            s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
            s.id.toLowerCase().includes(studentSearch.toLowerCase())
        ).slice(0, 5);
    }, [chargeStudent, studentSearch, students]);

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            alert('Por favor, insira um valor válido.');
            return;
        }

        if (chargeStudent && !selectedStudentId) {
            alert('Por favor, selecione um aluno para cobrança.');
            return;
        }

        const expenseId = `exp_${Date.now()}`;

        const newExpense: ExpenseRecord = {
            id: expenseId,
            date,
            category,
            amount: Number(amount),
            description,
            registeredBy: currentUser.name,
            studentId: chargeStudent ? selectedStudentId : undefined,
            isChargeable: chargeStudent
        };

        onExpensesChange([newExpense, ...expenses]);
        
        // Logic to charge student
        if (chargeStudent && selectedStudentId) {
            const student = students.find(s => s.id === selectedStudentId);
            if (student) {
                const newCharge: ExtraCharge = {
                    id: `charge_${Date.now()}`,
                    description: description || 'Despesa/Dano a repor',
                    amount: Number(amount),
                    date: new Date().toISOString(),
                    expenseId: expenseId
                };

                const updatedStudent = {
                    ...student,
                    extraCharges: [...(student.extraCharges || []), newCharge]
                };

                onStudentsChange(students.map(s => s.id === selectedStudentId ? updatedStudent : s));
            }
        }

        // Notify Admins
        const adminNotifications: AppNotification[] = users
            .filter(u => u.role === UserRole.ADMIN)
            .map(admin => ({
                id: `notif_exp_${Date.now()}_${admin.id}`,
                userId: admin.id,
                type: 'admin_alert',
                title: 'Nova Despesa Registada',
                message: `Despesa de ${formatCurrency(newExpense.amount)} (${newExpense.category}) registada por ${currentUser.name}.${chargeStudent ? ' (Cobrada ao aluno)' : ''}`,
                read: false,
                timestamp: new Date().toISOString()
            }));
        onAddNotifications(adminNotifications);

        // Reset form but keep date
        setAmount('');
        setDescription('');
        setChargeStudent(false);
        setSelectedStudentId('');
        setStudentSearch('');
    };

    const handleDeleteExpense = (id: string) => {
        if (window.confirm('Tem certeza que deseja remover esta despesa? Nota: Isso não remove a dívida do aluno automaticamente.')) {
            onExpensesChange(expenses.filter(e => e.id !== id));
        }
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, filterMonth, filterYear]);

    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    }, [filteredExpenses]);

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <TrendingDownIcon className="w-6 h-6 mr-2 text-red-600" />
                        Gestão de Despesas
                    </h3>
                    <p className="text-sm text-gray-500">Registo de saídas e custos operacionais.</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-500 font-medium">Total Despesas (Mês Selecionado)</span>
                    <span className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="bg-white p-6 rounded-2xl shadow-lg h-fit">
                    <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Lançar Nova Despesa</h4>
                    <form onSubmit={handleAddExpense} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <select 
                                value={category} 
                                onChange={e => setCategory(e.target.value as ExpenseCategory)} 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                {expenseCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                            <input 
                                type="number" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Detalhes</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ex: Pagamento referente a..."
                                rows={3}
                            />
                        </div>

                        {/* Charge Student Toggle */}
                        <div className="pt-2 border-t border-gray-100">
                            <label className="flex items-center space-x-2 cursor-pointer mb-2">
                                <input 
                                    type="checkbox" 
                                    checked={chargeStudent} 
                                    onChange={e => setChargeStudent(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-gray-700">Cobrar valor ao aluno?</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Use para danos (ex: carteira partida) ou reposições.</p>
                            
                            {chargeStudent && (
                                <div className="relative animate-fade-in bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Buscar Aluno</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            className="w-full pl-8 p-2 text-sm border rounded focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Nome ou ID..."
                                        />
                                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                                    </div>
                                    
                                    {/* Search Results */}
                                    {studentSearch && filteredStudents.length > 0 && !selectedStudentId && (
                                        <ul className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                            {filteredStudents.map(s => (
                                                <li 
                                                    key={s.id} 
                                                    onClick={() => {
                                                        setSelectedStudentId(s.id);
                                                        setStudentSearch(s.name);
                                                    }}
                                                    className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm border-b last:border-0"
                                                >
                                                    <span className="font-bold">{s.name}</span> <span className="text-xs text-gray-500">({s.desiredClass})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {selectedStudentId && (
                                        <div className="mt-2 flex justify-between items-center bg-indigo-100 px-2 py-1 rounded">
                                            <span className="text-xs font-bold text-indigo-800">Selecionado: {students.find(s => s.id === selectedStudentId)?.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => { setSelectedStudentId(''); setStudentSearch(''); }}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors shadow-md"
                        >
                            Registrar Despesa
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                        <h4 className="font-bold text-gray-800">Histórico</h4>
                        <div className="flex gap-2">
                            <select 
                                value={filterMonth} 
                                onChange={e => setFilterMonth(Number(e.target.value))}
                                className="p-1 border rounded text-sm bg-gray-50"
                            >
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select 
                                value={filterYear} 
                                onChange={e => setFilterYear(Number(e.target.value))}
                                className="p-1 border rounded text-sm bg-gray-50"
                            >
                                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            {new Date(expense.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                            <span className="bg-gray-100 px-2 py-1 rounded-full text-xs border border-gray-200">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={expense.description}>
                                            {expense.description || '-'}
                                            <div className="text-[10px] text-gray-400 mt-0.5">Reg: {expense.registeredBy}</div>
                                            {expense.isChargeable && (
                                                <div className="text-[10px] text-red-500 font-bold">Cobrado ao Aluno</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                                            {formatCurrency(expense.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                                title="Remover"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed m-4">
                                            Nenhuma despesa registada neste período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseManagement;
