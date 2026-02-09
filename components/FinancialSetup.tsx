
import React, { useState, useEffect } from 'react';
import { FinancialSettings, BookItem, UniformItem, ClassSpecificFee } from '../types';
import { TrashIcon, DevicePhoneMobileIcon } from './icons/IconComponents';

interface FinancialSetupProps {
    settings: FinancialSettings;
    onSettingsChange: (settings: FinancialSettings) => void;
}

const FinancialSetup: React.FC<FinancialSetupProps> = ({ settings, onSettingsChange }) => {
    const [localSettings, setLocalSettings] = useState<FinancialSettings>(settings);
    
    // Temporary states for new items
    const [newUniformName, setNewUniformName] = useState('');
    const [newUniformPrice, setNewUniformPrice] = useState('');
    
    const [newBookTitle, setNewBookTitle] = useState('');
    const [newBookClass, setNewBookClass] = useState('1ª Classe');
    const [newBookPrice, setNewBookPrice] = useState('');

    // State for Class Specific Fees
    const [newClassFeeLevel, setNewClassFeeLevel] = useState('1ª Classe');
    const [newClassEnrollmentFee, setNewClassEnrollmentFee] = useState('');
    const [newClassRenewalFee, setNewClassRenewalFee] = useState('');
    const [newClassMonthlyFee, setNewClassMonthlyFee] = useState('');

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleBaseFeeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'currency') {
             setLocalSettings(prev => ({ ...prev, [name]: value }));
        } else if (name === 'enableMobilePayments') {
             setLocalSettings(prev => ({ ...prev, enableMobilePayments: (e.target as HTMLInputElement).checked }));
        } else {
            setLocalSettings(prev => ({
                ...prev,
                [name]: parseFloat(value) || 0
            }));
        }
    };

    const handleMobileConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({
            ...prev,
            mobilePaymentConfig: {
                ...prev.mobilePaymentConfig,
                [name]: value
            }
        }));
    };

    const handleAddUniform = () => {
        if (newUniformName && newUniformPrice) {
            const newItem: UniformItem = {
                id: `u_${Date.now()}`,
                name: newUniformName,
                price: parseFloat(newUniformPrice) || 0
            };
            const updated = { ...localSettings, uniforms: [...localSettings.uniforms, newItem] };
            setLocalSettings(updated);
            onSettingsChange(updated); // Auto-save
            setNewUniformName('');
            setNewUniformPrice('');
        }
    };

    const handleRemoveUniform = (id: string) => {
        const updated = { ...localSettings, uniforms: localSettings.uniforms.filter(u => u.id !== id) };
        setLocalSettings(updated);
        onSettingsChange(updated);
    };

    const handleAddBook = () => {
        if (newBookTitle && newBookPrice && newBookClass) {
            const newItem: BookItem = {
                id: `b_${Date.now()}`,
                title: newBookTitle,
                classLevel: newBookClass,
                price: parseFloat(newBookPrice) || 0
            };
            const updated = { ...localSettings, books: [...localSettings.books, newItem] };
            setLocalSettings(updated);
            onSettingsChange(updated); // Auto-save
            setNewBookTitle('');
            setNewBookPrice('');
        }
    };
    
    const handleRemoveBook = (id: string) => {
        const updated = { ...localSettings, books: localSettings.books.filter(b => b.id !== id) };
        setLocalSettings(updated);
        onSettingsChange(updated);
    };

    const handleAddClassFee = () => {
        if (newClassFeeLevel && (newClassEnrollmentFee || newClassRenewalFee || newClassMonthlyFee)) {
            const enrollment = parseFloat(newClassEnrollmentFee) || 0;
            const renewal = parseFloat(newClassRenewalFee) || 0;
            const monthly = parseFloat(newClassMonthlyFee) || 0;

            // Check if class already exists and update it, otherwise add new
            const existingIndex = localSettings.classSpecificFees?.findIndex(c => c.classLevel === newClassFeeLevel);
            let updatedFees = localSettings.classSpecificFees ? [...localSettings.classSpecificFees] : [];

            if (existingIndex !== undefined && existingIndex >= 0) {
                updatedFees[existingIndex] = { 
                    classLevel: newClassFeeLevel, 
                    enrollmentFee: enrollment,
                    renewalFee: renewal,
                    monthlyFee: monthly
                };
            } else {
                updatedFees.push({ 
                    classLevel: newClassFeeLevel, 
                    enrollmentFee: enrollment,
                    renewalFee: renewal,
                    monthlyFee: monthly
                });
            }

            const updated = { ...localSettings, classSpecificFees: updatedFees };
            setLocalSettings(updated);
            onSettingsChange(updated); // Auto-save
            setNewClassEnrollmentFee('');
            setNewClassRenewalFee('');
            setNewClassMonthlyFee('');
        } else {
            alert('Preencha pelo menos um dos valores para adicionar.');
        }
    };

    const handleRemoveClassFee = (classLevel: string) => {
        const updatedFees = localSettings.classSpecificFees?.filter(c => c.classLevel !== classLevel) || [];
        const updated = { ...localSettings, classSpecificFees: updatedFees };
        setLocalSettings(updated);
        onSettingsChange(updated);
    };
    
    const handleSaveBaseFees = () => {
        onSettingsChange(localSettings);
        alert("Configurações salvas com sucesso!");
    };

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
        const locale = getCurrencyLocale(localSettings.currency);
        return price.toLocaleString(locale, { style: 'currency', currency: localSettings.currency });
    };

    return (
        <div className="space-y-8">
            {/* Base Fees */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Taxas Base e Moeda</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Moeda do Sistema</label>
                         <select 
                            name="currency"
                            value={localSettings.currency}
                            onChange={handleBaseFeeChange}
                            className="w-full p-2 border rounded-lg bg-white"
                        >
                            <option value="MZN">Metical (MZN)</option>
                            <option value="AOA">Kwanza (AOA)</option>
                            <option value="USD">Dólar (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Matrícula (Padrão)</label>
                        <input 
                            type="number" 
                            name="enrollmentFee"
                            value={localSettings.enrollmentFee}
                            onChange={handleBaseFeeChange}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Renovação/Inscrição</label>
                        <input 
                            type="number" 
                            name="renewalFee"
                            value={localSettings.renewalFee}
                            onChange={handleBaseFeeChange}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mensalidade Base</label>
                        <input 
                            type="number" 
                            name="monthlyFee"
                            value={localSettings.monthlyFee}
                            onChange={handleBaseFeeChange}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Testes Anual</label>
                        <input 
                            type="number" 
                            name="annualExamFee"
                            value={localSettings.annualExamFee}
                            onChange={handleBaseFeeChange}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Transferência</label>
                        <input 
                            type="number" 
                            name="transferFee"
                            value={localSettings.transferFee || 0}
                            onChange={handleBaseFeeChange}
                            className="w-full p-2 border rounded-lg bg-indigo-50"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <h4 className="text-lg font-bold text-gray-700 mt-6 mb-3 border-t pt-4">Configuração de Multas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dia Limite de Pagamento (Mensal)</label>
                        <input 
                            type="number" 
                            name="monthlyPaymentLimitDay"
                            value={localSettings.monthlyPaymentLimitDay || 10}
                            onChange={handleBaseFeeChange}
                            min="1"
                            max="31"
                            className="w-full p-2 border rounded-lg"
                            placeholder="Ex: 10"
                        />
                        <p className="text-xs text-gray-500 mt-1">Pagamentos após este dia terão multa aplicada.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Multa por Atraso (%)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                name="latePaymentPenaltyPercent"
                                value={localSettings.latePaymentPenaltyPercent || 0}
                                onChange={handleBaseFeeChange}
                                min="0"
                                max="100"
                                className="w-full p-2 border rounded-lg pr-8"
                                placeholder="Ex: 10"
                            />
                            <span className="absolute right-3 top-2 text-gray-500">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Percentagem adicionada ao valor da mensalidade em caso de atraso.</p>
                    </div>
                </div>

                <button 
                    onClick={handleSaveBaseFees}
                    className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                    Salvar Configurações
                </button>
            </div>

            {/* Mobile Money Integration */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <DevicePhoneMobileIcon className="w-6 h-6 mr-2 text-indigo-600" />
                        Integração Mobile Money
                    </h3>
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                name="enableMobilePayments"
                                checked={localSettings.enableMobilePayments || false}
                                onChange={handleBaseFeeChange}
                                className="sr-only"
                            />
                            <div className={`block w-14 h-8 rounded-full transition-colors ${localSettings.enableMobilePayments ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${localSettings.enableMobilePayments ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-700">Ativar Pagamentos</span>
                    </label>
                </div>
                
                {localSettings.enableMobilePayments && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Business Code</label>
                            <input 
                                type="text" 
                                name="mpesaCode"
                                value={localSettings.mobilePaymentConfig?.mpesaCode || ''}
                                onChange={handleMobileConfigChange}
                                className="w-full p-2 border rounded-lg"
                                placeholder="Ex: 12345"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">e-Mola Code</label>
                            <input 
                                type="text" 
                                name="emolaCode"
                                value={localSettings.mobilePaymentConfig?.emolaCode || ''}
                                onChange={handleMobileConfigChange}
                                className="w-full p-2 border rounded-lg"
                                placeholder="Ex: 841234567"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">mKesh Code</label>
                            <input 
                                type="text" 
                                name="mkeshCode"
                                value={localSettings.mobilePaymentConfig?.mkeshCode || ''}
                                onChange={handleMobileConfigChange}
                                className="w-full p-2 border rounded-lg"
                                placeholder="Ex: 821234567"
                            />
                        </div>
                    </div>
                )}
                <div className="flex justify-end mt-4">
                     <button 
                        onClick={handleSaveBaseFees}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 text-sm font-bold"
                    >
                        Atualizar Integrações
                    </button>
                </div>
            </div>

            {/* Class Specific Fees */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Taxas Específicas por Classe</h3>
                <p className="text-sm text-gray-500 mb-4">Defina valores diferenciados para classes específicas. Se 0 ou vazio, preencha com o valor que deseja cobrar (não assumirá o padrão automaticamente se a linha existir).</p>
                
                <div className="flex gap-4 mb-4 items-end flex-wrap">
                    <div className="w-32">
                         <label className="block text-xs text-gray-500 mb-1">Classe</label>
                         <select 
                            value={newClassFeeLevel} 
                            onChange={e => setNewClassFeeLevel(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={`${i + 1}ª Classe`}>{i + 1}ª Classe</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">Matrícula</label>
                        <input 
                            type="number" 
                            value={newClassEnrollmentFee}
                            onChange={e => setNewClassEnrollmentFee(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">Renovação</label>
                        <input 
                            type="number" 
                            value={newClassRenewalFee}
                            onChange={e => setNewClassRenewalFee(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">Mensalidade</label>
                        <input 
                            type="number" 
                            value={newClassMonthlyFee}
                            onChange={e => setNewClassMonthlyFee(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <button onClick={handleAddClassFee} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 h-10">
                        Definir Valores
                    </button>
                </div>

                 <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classe</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matrícula</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renovação</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensalidade</th>
                                <th className="px-6 py-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {localSettings.classSpecificFees?.sort((a,b) => a.classLevel.localeCompare(b.classLevel, undefined, {numeric: true})).map(c => (
                                <tr key={c.classLevel}>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-bold">{c.classLevel}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{formatPrice(c.enrollmentFee)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{formatPrice(c.renewalFee)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{formatPrice(c.monthlyFee)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleRemoveClassFee(c.classLevel)} className="text-red-600 hover:text-red-800" title="Remover e usar valor padrão">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {(!localSettings.classSpecificFees || localSettings.classSpecificFees.length === 0) && <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhuma taxa específica configurada.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Uniforms */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Catálogo de Uniformes</h3>
                <div className="flex gap-4 mb-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Item</label>
                        <input 
                            type="text" 
                            value={newUniformName}
                            onChange={e => setNewUniformName(e.target.value)}
                            placeholder="Ex: Calças"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">Preço</label>
                        <input 
                            type="number" 
                            value={newUniformPrice}
                            onChange={e => setNewUniformPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <button onClick={handleAddUniform} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 h-10">
                        Adicionar
                    </button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                                <th className="px-6 py-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {localSettings.uniforms.map(u => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{u.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatPrice(u.price)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleRemoveUniform(u.id)} className="text-red-600 hover:text-red-800">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {localSettings.uniforms.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-500">Nenhum item cadastrado.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Books */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Livros por Classe</h3>
                 <div className="flex gap-4 mb-4 items-end flex-wrap">
                    <div className="w-40">
                         <label className="block text-xs text-gray-500 mb-1">Classe</label>
                         <select 
                            value={newBookClass} 
                            onChange={e => setNewBookClass(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={`${i + 1}ª Classe`}>{i + 1}ª Classe</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">Título/Disciplina</label>
                        <input 
                            type="text" 
                            value={newBookTitle}
                            onChange={e => setNewBookTitle(e.target.value)}
                            placeholder="Ex: Matemática"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">Preço</label>
                        <input 
                            type="number" 
                            value={newBookPrice}
                            onChange={e => setNewBookPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                    <button onClick={handleAddBook} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 h-10">
                        Adicionar
                    </button>
                </div>

                 <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classe</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Livro</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                                <th className="px-6 py-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {localSettings.books.sort((a,b) => a.classLevel.localeCompare(b.classLevel, undefined, {numeric: true})).map(b => (
                                <tr key={b.id}>
                                    <td className="px-6 py-4 text-sm text-gray-500">{b.classLevel}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{b.title}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatPrice(b.price)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleRemoveBook(b.id)} className="text-red-600 hover:text-red-800">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {localSettings.books.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-500">Nenhum livro cadastrado.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialSetup;
