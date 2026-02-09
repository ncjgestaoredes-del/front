
import React, { useState, useEffect, useMemo } from 'react';
import { PaymentRecord, PaymentType, PaymentMethod, PaymentItem } from '../types';
import { CloseIcon, TrashIcon } from './icons/IconComponents';

interface EditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: PaymentRecord | null;
    onUpdatePayment: (updatedPayment: PaymentRecord) => void;
}

const paymentMethods: PaymentMethod[] = ['Numerário', 'Transferência Bancária', 'MPesa', 'e-Mola', 'mKesh', 'POS'];

const EditPaymentModal: React.FC<EditPaymentModalProps> = ({ isOpen, onClose, payment, onUpdatePayment }) => {
    const [formData, setFormData] = useState<{
        date: string;
        type: PaymentType;
        method: PaymentMethod;
        description: string;
    }>({
        date: '',
        type: 'Mensalidade',
        method: 'Numerário',
        description: ''
    });

    const [items, setItems] = useState<PaymentItem[]>([]);

    useEffect(() => {
        if (payment) {
            setFormData({
                date: payment.date,
                type: payment.type,
                method: payment.method || 'Numerário',
                description: payment.description || ''
            });
            
            // Load existing items or create a default one based on total if no items exist
            if (payment.items && payment.items.length > 0) {
                setItems(payment.items);
            } else {
                setItems([{ item: payment.description || 'Pagamento', value: payment.amount }]);
            }
        }
    }, [payment]);

    // Auto-calculate total based on items
    const totalAmount = useMemo(() => {
        return items.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    }, [items]);

    const handleItemChange = (index: number, field: keyof PaymentItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { item: '', value: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) {
            alert("O pagamento deve ter pelo menos um item.");
            return;
        }
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!payment) return;

        // Validate items
        const invalidItems = items.some(i => !i.item.trim() || i.value < 0);
        if (invalidItems) {
            alert("Por favor, preencha a descrição e valor positivo para todos os itens.");
            return;
        }

        const updatedPayment: PaymentRecord = {
            ...payment,
            date: formData.date,
            amount: totalAmount, // Derived from items sum
            type: formData.type,
            method: formData.method,
            description: formData.description,
            items: items
        };

        onUpdatePayment(updatedPayment);
        onClose();
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });
    };

    if (!isOpen || !payment) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Editar Pagamento Detalhado</h2>
                        <p className="text-xs text-gray-500">ID: {payment.id}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 overflow-y-auto space-y-6">
                        
                        {/* Dados Gerais */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                <input 
                                    type="date" 
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método</label>
                                <select 
                                    value={formData.method}
                                    // @ts-ignore
                                    onChange={e => setFormData({...formData, method: e.target.value})}
                                    className="w-full p-2 border rounded-lg bg-white text-sm"
                                >
                                    {paymentMethods.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                                <select 
                                    value={formData.type}
                                    // @ts-ignore
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                    className="w-full p-2 border rounded-lg bg-white text-sm"
                                >
                                    <option value="Matrícula">Matrícula</option>
                                    <option value="Renovação">Renovação</option>
                                    <option value="Mensalidade">Mensalidade</option>
                                    <option value="Uniforme">Uniforme</option>
                                    <option value="Material">Material</option>
                                </select>
                            </div>
                        </div>

                        {/* Detalhamento de Itens */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
                                <h3 className="text-sm font-bold text-gray-700">Itens do Recibo</h3>
                                <button 
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 font-semibold"
                                >
                                    + Adicionar Item
                                </button>
                            </div>
                            <div className="p-4 bg-gray-50 space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 mb-1">Descrição do Item</label>
                                            <input 
                                                type="text" 
                                                value={item.item}
                                                onChange={e => handleItemChange(index, 'item', e.target.value)}
                                                className="w-full p-2 border rounded text-sm"
                                                placeholder="Ex: Mensalidade Fevereiro"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs text-gray-500 mb-1">Valor</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                step="0.01"
                                                value={item.value}
                                                onChange={e => handleItemChange(index, 'value', parseFloat(e.target.value))}
                                                className="w-full p-2 border rounded text-sm text-right font-mono"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="p-2 text-red-500 hover:bg-red-100 rounded mb-0.5"
                                            title="Remover Item"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white px-4 py-3 border-t flex justify-between items-center">
                                <span className="font-bold text-gray-600">Total Calculado:</span>
                                <span className="text-xl font-bold text-green-600">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações Gerais</label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                rows={2}
                                className="w-full p-2 border rounded-lg text-sm"
                                placeholder="Detalhes adicionais..."
                            />
                        </div>
                    </div>

                    <footer className="flex items-center justify-end p-4 border-t bg-gray-50 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 mr-2">
                            Cancelar
                        </button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 shadow-md">
                            Salvar Alterações
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default EditPaymentModal;
