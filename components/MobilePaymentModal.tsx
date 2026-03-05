
import React, { useState } from 'react';
import { Student, FinancialSettings, PaymentType } from '../types';
import { CloseIcon, DevicePhoneMobileIcon, CheckCircleIcon } from './icons/IconComponents';

interface MobilePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    financialSettings: FinancialSettings;
    amount?: number;
}

const MobilePaymentModal: React.FC<MobilePaymentModalProps> = ({ isOpen, onClose, student, financialSettings, amount }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedMethod, setSelectedMethod] = useState<'MPesa' | 'e-Mola' | 'mKesh' | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentAmount, setPaymentAmount] = useState(amount?.toString() || '');
    const [paymentType, setPaymentType] = useState<PaymentType>('Mensalidade');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleProcessPayment = () => {
        if (!selectedMethod || !phoneNumber || !paymentAmount) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        setIsProcessing(true);
        // Simulating payment processing
        setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
        }, 3000);
    };

    const getMethodCode = () => {
        if (!selectedMethod) return '';
        if (selectedMethod === 'MPesa') return financialSettings.mobilePaymentConfig?.mpesaCode || 'N/A';
        if (selectedMethod === 'e-Mola') return financialSettings.mobilePaymentConfig?.emolaCode || 'N/A';
        if (selectedMethod === 'mKesh') return financialSettings.mobilePaymentConfig?.mkeshCode || 'N/A';
        return '';
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency || 'MZN' });
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Solicitação Enviada!</h3>
                    <p className="text-slate-500 font-medium mb-8">
                        Uma solicitação de pagamento foi enviada para o número <span className="font-bold text-slate-800">{phoneNumber}</span>. 
                        Por favor, confirme no seu telemóvel introduzindo o seu PIN.
                    </p>
                    <button 
                        onClick={onClose}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-fade-in">
                <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="bg-indigo-100 p-3 rounded-2xl mr-4">
                            <DevicePhoneMobileIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pagamento Móvel</h3>
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{student.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </header>

                <div className="p-8 space-y-6">
                    {step === 1 ? (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Selecione o Método</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {financialSettings.mobilePaymentConfig?.mpesaCode && (
                                        <button 
                                            onClick={() => setSelectedMethod('MPesa')}
                                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedMethod === 'MPesa' ? 'border-red-500 bg-red-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xs">M</div>
                                            <span className="text-[10px] font-black uppercase">M-Pesa</span>
                                        </button>
                                    )}
                                    {financialSettings.mobilePaymentConfig?.emolaCode && (
                                        <button 
                                            onClick={() => setSelectedMethod('e-Mola')}
                                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedMethod === 'e-Mola' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xs">E</div>
                                            <span className="text-[10px] font-black uppercase">e-Mola</span>
                                        </button>
                                    )}
                                    {financialSettings.mobilePaymentConfig?.mkeshCode && (
                                        <button 
                                            onClick={() => setSelectedMethod('mKesh')}
                                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedMethod === 'mKesh' ? 'border-yellow-500 bg-yellow-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-black text-xs">K</div>
                                            <span className="text-[10px] font-black uppercase">mKesh</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Pagamento</label>
                                    <select 
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Mensalidade">Mensalidade</option>
                                        <option value="Matrícula">Matrícula</option>
                                        <option value="Renovação">Renovação</option>
                                        <option value="Uniforme">Uniforme</option>
                                        <option value="Material">Material</option>
                                        <option value="Taxa de Exames">Taxa de Exames</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor ({financialSettings.currency})</label>
                                    <input 
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Número de Telemóvel</label>
                                <input 
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="84 / 85 / 82 / 86 / 87..."
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-lg font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 tracking-widest"
                                />
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                disabled={!selectedMethod || !phoneNumber || !paymentAmount}
                                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuar para Resumo
                            </button>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Aluno</span>
                                    <span className="text-sm font-black text-slate-800">{student.name}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Serviço</span>
                                    <span className="text-sm font-black text-slate-800">{paymentType}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Método</span>
                                    <span className="text-sm font-black text-slate-800">{selectedMethod}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Número</span>
                                    <span className="text-sm font-black text-slate-800">{phoneNumber}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Total a Pagar</span>
                                    <span className="text-2xl font-black text-indigo-600">{formatCurrency(parseFloat(paymentAmount))}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Voltar
                                </button>
                                <button 
                                    onClick={handleProcessPayment}
                                    disabled={isProcessing}
                                    className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center"
                                >
                                    {isProcessing ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    ) : null}
                                    {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
                                </button>
                            </div>
                            <p className="text-[9px] text-center text-slate-400 font-bold uppercase leading-relaxed">
                                Ao confirmar, você receberá um prompt no seu telemóvel para autorizar a transação.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobilePaymentModal;
