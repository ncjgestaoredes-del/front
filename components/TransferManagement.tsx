
import React, { useState, useMemo } from 'react';
import { Student, AcademicYear, Turma, SchoolSettings, User, SchoolRequest, FinancialSettings, PaymentRecord, UserRole } from '../types';
import { DocumentDuplicateIcon, SearchIcon, PrinterIcon, CheckCircleIcon, ExclamationTriangleIcon, CurrencyDollarIcon, ClockIcon } from './icons/IconComponents';
import { printTransferGuide } from './DocumentUtils';

interface TransferManagementProps {
    students: Student[];
    onStudentsChange: (students: Student[]) => void;
    academicYears: AcademicYear[];
    turmas: Turma[];
    schoolSettings: SchoolSettings;
    financialSettings: FinancialSettings;
    requests: SchoolRequest[];
    onRequestsChange: (requests: SchoolRequest[]) => void;
    currentUser: User;
}

const TransferManagement: React.FC<TransferManagementProps> = ({ 
    students, 
    onStudentsChange, 
    academicYears, 
    turmas, 
    schoolSettings,
    financialSettings,
    requests,
    onRequestsChange,
    currentUser
}) => {
    const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
    
    // New Request State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [destinationSchool, setDestinationSchool] = useState('');
    const [reason, setReason] = useState('Mudança de Residência');
    const [location, setLocation] = useState('Maputo');
    
    // Printing Options State
    const [includeGrades, setIncludeGrades] = useState(true);
    const [includeHistory, setIncludeHistory] = useState(false);
    
    const isAdmin = currentUser.role === UserRole.ADMIN;

    // Get Active Year
    const currentYear = useMemo(() => {
        const active = academicYears.find(y => y.status === 'Em Curso');
        return active ? active.year : new Date().getFullYear();
    }, [academicYears]);

    // Filter Active Students for selection
    const filteredStudents = useMemo(() => {
        return students.filter(s => 
            (s.status === 'Ativo' || s.status === 'Transferido') && 
            (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm))
        ).slice(0, 10); // Limit results
    }, [students, searchTerm]);

    const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

    const studentClassInfo = useMemo(() => {
        if (!selectedStudent) return '';
        // Find class in current year
        const turma = turmas.find(t => t.academicYear === currentYear && t.studentIds.includes(selectedStudent.id));
        return turma ? turma.classLevel : selectedStudent.desiredClass;
    }, [selectedStudent, turmas, currentYear]);

    const transferRequests = useMemo(() => {
        return requests.filter(r => r.type === 'Transferência').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests]);

    const handleSelectStudent = (id: string) => {
        setSelectedStudentId(id);
        setSearchTerm(''); 
    };

    const handleCreateRequest = () => {
        if (!selectedStudent) return;

        // 1. Process Payment
        const transferFee = financialSettings.transferFee || 0;
        
        const newPayment: PaymentRecord = {
            id: `pay_transfer_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: transferFee,
            type: 'Taxa de Transferência',
            method: 'Numerário', // Defaulting for simplicity, or add selector
            academicYear: currentYear,
            description: `Taxa de Transferência para: ${destinationSchool}`,
            operatorName: currentUser.name,
            items: [{ item: 'Emissão de Guia de Transferência', value: transferFee }]
        };

        const updatedStudents = students.map(s => 
            s.id === selectedStudent.id 
            ? { ...s, payments: [...(s.payments || []), newPayment] }
            : s
        );
        onStudentsChange(updatedStudents);

        // 2. Create Request
        const newRequest: SchoolRequest = {
            id: `req_trans_${Date.now()}`,
            requesterId: currentUser.id,
            recipientId: 'ADMIN', // Generic identifier, admins will filter by type
            type: 'Transferência',
            title: `Transferência: ${selectedStudent.name}`,
            description: `Aluno: ${selectedStudent.name} (${selectedStudent.id})\nDestino: ${destinationSchool}\nMotivo: ${reason}\nLocal: ${location}`,
            status: 'Pendente',
            priority: 'Normal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                studentId: selectedStudent.id,
                destinationSchool,
                reason,
                location,
                classLevel: studentClassInfo
            }
        };

        onRequestsChange([newRequest, ...requests]);
        
        alert("Pedido registado e pagamento confirmado. Aguarde a emissão pelo Administrador.");
        setActiveTab('list');
        
        // Reset form
        setSelectedStudentId('');
        setDestinationSchool('');
        setReason('Mudança de Residência');
    };

    const handleApproveRequest = (request: SchoolRequest) => {
        if (!isAdmin) return;

        const updatedRequest: SchoolRequest = {
            ...request,
            status: 'Concluído', // Marked as Done/Ready
            updatedAt: new Date().toISOString(),
            feedback: 'Guia emitida e pronta para impressão.'
        };

        const updatedList = requests.map(r => r.id === request.id ? updatedRequest : r);
        onRequestsChange(updatedList);

        // Optionally mark student as transferred in system
        if (request.metadata?.studentId) {
             const confirmTransfer = window.confirm("Deseja marcar o aluno como 'Transferido' no sistema agora?");
             if (confirmTransfer) {
                 const updatedStudents = students.map(s => 
                    s.id === request.metadata.studentId 
                    ? { ...s, status: 'Transferido' as const, previousSchool: schoolSettings.schoolName }
                    : s
                 );
                 onStudentsChange(updatedStudents);
             }
        }
    };

    const handlePrint = (request: SchoolRequest) => {
        if (request.status !== 'Concluído') {
            alert("A guia ainda não foi emitida pelo Administrador.");
            return;
        }

        const student = students.find(s => s.id === request.metadata?.studentId);
        if (!student) {
            alert("Aluno não encontrado.");
            return;
        }

        printTransferGuide(
            student,
            request.metadata?.destinationSchool || '',
            request.metadata?.reason || '',
            request.metadata?.location || 'Maputo',
            schoolSettings,
            currentYear,
            request.metadata?.classLevel || '',
            includeGrades,
            includeHistory,
            currentUser.name,
            turmas // Passing turmas to enable historical class lookup
        );
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings.currency });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg h-full flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <DocumentDuplicateIcon className="w-7 h-7 mr-2 text-indigo-600" />
                        Transferências
                    </h2>
                    <p className="text-gray-500 mt-1">Gestão de pedidos e emissão de guias.</p>
                </div>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        Novo Pedido
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        Gerir Pedidos
                    </button>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                
                {/* --- NEW REQUEST TAB --- */}
                {activeTab === 'new' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Selection */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <label className="block text-sm font-bold text-indigo-900 mb-2">1. Selecionar Aluno</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Pesquisar nome ou ID..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                </div>
                                
                                {searchTerm && (
                                    <div className="mt-2 bg-white rounded-lg shadow-md max-h-60 overflow-y-auto border border-gray-200">
                                        {filteredStudents.length > 0 ? (
                                            <ul>
                                                {filteredStudents.map(s => (
                                                    <li 
                                                        key={s.id} 
                                                        onClick={() => handleSelectStudent(s.id)}
                                                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                    >
                                                        <div className="font-bold text-gray-800">{s.name}</div>
                                                        <div className="text-xs text-gray-500">ID: {s.id} • {s.desiredClass}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="p-3 text-sm text-gray-500 text-center">Nenhum aluno encontrado.</div>
                                        )}
                                    </div>
                                )}

                                {selectedStudent && (
                                    <div className="mt-4 bg-white p-4 rounded-lg border border-indigo-200 shadow-sm animate-fade-in">
                                        <div className="flex items-center mb-3">
                                            <img src={selectedStudent.profilePictureUrl} alt="" className="w-12 h-12 rounded-full mr-3 object-cover" />
                                            <div>
                                                <h4 className="font-bold text-gray-800">{selectedStudent.name}</h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${selectedStudent.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {selectedStudent.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm space-y-1 text-gray-600">
                                            <p><strong>ID:</strong> {selectedStudent.id}</p>
                                            <p><strong>Classe Atual:</strong> {studentClassInfo}</p>
                                            <p><strong>Encarregado:</strong> {selectedStudent.guardianName}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form */}
                        <div className="lg:col-span-2">
                            <div className={`transition-opacity duration-300 ${selectedStudent ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">2. Dados da Transferência</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Escola de Destino</label>
                                        <input 
                                            type="text" 
                                            value={destinationSchool}
                                            onChange={e => setDestinationSchool(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ex: Escola Secundária Josina Machel"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                                        <input 
                                            type="text" 
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ex: Mudança de residência"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade / Local</label>
                                        <input 
                                            type="text" 
                                            value={location}
                                            onChange={e => setLocation(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                            <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-600"/>
                                            Pagamento da Taxa
                                        </h3>
                                        <div className="text-2xl font-bold text-green-700">
                                            {formatCurrency(financialSettings.transferFee || 0)}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">
                                        O pagamento deve ser realizado no ato do pedido. Ao confirmar, o valor será registrado no histórico do aluno e o pedido enviado para aprovação da administração.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleCreateRequest}
                                    disabled={!destinationSchool}
                                    className={`w-full md:w-auto px-8 py-3 rounded-lg font-bold text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 ${
                                        destinationSchool ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'
                                    }`}
                                >
                                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                                    Receber Pagamento e Solicitar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LIST TAB --- */}
                {activeTab === 'list' && (
                    <div>
                        <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800">Histórico de Pedidos</h3>
                            <div className="flex gap-4">
                                <label className="flex items-center space-x-2 text-sm text-gray-600">
                                    <input type="checkbox" checked={includeGrades} onChange={e => setIncludeGrades(e.target.checked)} className="rounded text-indigo-600"/>
                                    <span>Incluir Notas</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-gray-600">
                                    <input type="checkbox" checked={includeHistory} onChange={e => setIncludeHistory(e.target.checked)} className="rounded text-indigo-600"/>
                                    <span>Incluir Histórico</span>
                                </label>
                            </div>
                        </div>

                        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transferRequests.length > 0 ? transferRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {req.title.replace('Transferência: ', '')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {req.metadata?.destinationSchool || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    req.status === 'Concluído' ? 'bg-green-100 text-green-800' : 
                                                    req.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {req.status === 'Concluído' ? 'Pronto' : req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center space-x-2">
                                                    {isAdmin && req.status === 'Pendente' && (
                                                        <button 
                                                            onClick={() => handleApproveRequest(req)}
                                                            className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs"
                                                        >
                                                            Emitir Guia
                                                        </button>
                                                    )}
                                                    
                                                    {req.status === 'Concluído' ? (
                                                        <button 
                                                            onClick={() => handlePrint(req)}
                                                            className="text-indigo-600 hover:text-indigo-900 flex items-center justify-center"
                                                            title="Imprimir Guia"
                                                        >
                                                            <PrinterIcon className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 flex items-center justify-center cursor-not-allowed" title="Aguardando Emissão">
                                                            <ClockIcon className="w-5 h-5" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                Nenhum pedido de transferência registado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransferManagement;
