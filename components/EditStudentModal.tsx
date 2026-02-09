
import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { Student, StudentDocuments, StudentStatus, FinancialProfile, PaymentType } from '../types';
import { CloseIcon, CurrencyDollarIcon } from './icons/IconComponents';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onUpdateStudent: (student: Student) => void;
}

const documentTypes: { key: keyof StudentDocuments; label: string }[] = [
    { key: 'photos', label: 'Fotos' },
    { key: 'cedula', label: 'Cédula Pessoal' },
    { key: 'bi', label: 'BI' },
    { key: 'drivingLicense', label: 'Carta de Condução' },
    { key: 'reportCard', label: 'Boletim de Passagem' },
    { key: 'transcript', label: 'Declaração de Notas' },
    { key: 'transferNote', label: 'Nota de Transferência' },
];

const statusOptions: StudentStatus[] = ['Ativo', 'Inativo', 'Transferido'];
const paymentTypesForDiscount: PaymentType[] = ['Matrícula', 'Renovação', 'Mensalidade', 'Uniforme', 'Material', 'Taxa de Exames'];

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, student, onUpdateStudent }) => {
  const [formData, setFormData] = useState<Student | null>(student);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
        // Ensure financialProfile exists for older records
        const enhancedStudent = {
            ...student,
            financialProfile: student.financialProfile || { status: 'Normal', discountPercentage: 0, affectedTypes: [], justification: '' }
        };
        setFormData(enhancedStudent);
        setPreview(student.profilePictureUrl || null);
    }
  }, [student]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (!formData) return;

    if (type === 'checkbox' && 'checked' in e.target) {
      setFormData(prev => prev ? { ...prev, [name]: (e.target as HTMLInputElement).checked } : null);
    } else {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }
  }, [formData]);

  const handleFinancialChange = (field: keyof FinancialProfile, value: any) => {
      setFormData(prev => prev ? ({
          ...prev,
          financialProfile: {
              ...prev.financialProfile!,
              [field]: value
          }
      }) : null);
  };

  const handleAffectedTypeToggle = (type: PaymentType) => {
      setFormData(prev => {
          if (!prev || !prev.financialProfile) return prev;
          const currentTypes = prev.financialProfile.affectedTypes || [];
          const newTypes = currentTypes.includes(type) 
            ? currentTypes.filter(t => t !== type)
            : [...currentTypes, type];
          
          return {
              ...prev,
              financialProfile: {
                  ...prev.financialProfile,
                  affectedTypes: newTypes
              }
          };
      });
  };

  const handleDocumentChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => prev ? {
        ...prev,
        documents: { ...prev.documents, [name]: checked }
    } : null);
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setPreview(result);
            setFormData(prev => prev ? { ...prev, profilePictureUrl: result } : null);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !formData.name || !formData.birthDate || !formData.guardianName || !formData.guardianContact || !formData.desiredClass) {
        setError('Campos obrigatórios (Nome, Data de Nascimento, Encarregado, Contato, Classe) devem ser preenchidos.');
        return;
    }
    
    // Validation for Special Financial Status
    if (formData.financialProfile?.status !== 'Normal' && !formData.financialProfile?.justification?.trim()) {
        setError('É obrigatório fornecer uma justificativa para alunos com status financeiro especial (Isento, Sem Multa ou Desconto).');
        return;
    }

    setError('');
    onUpdateStudent(formData);
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Editar Dados do Aluno</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* --- Dados Pessoais --- */}
            <section>
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Dados Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex flex-col items-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                    <div className="w-32 h-32 rounded-full bg-gray-200 mb-2 flex items-center justify-center overflow-hidden">
                        {preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-500 text-center">Sem foto</span>}
                    </div>
                    <input type="file" id="profilePicture" onChange={handlePhotoChange} accept="image/*" className="text-sm w-full" />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">Nome Completo*</label>
                    <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="w-full input" required/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="birthDate">Data de Nascimento*</label>
                    <input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="w-full input" required/>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="gender">Género*</label>
                      <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className="w-full input bg-white" required>
                          <option value="M">Masculino</option>
                          <option value="F">Feminino</option>
                      </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fatherName">Nome do Pai</label>
                    <input id="fatherName" name="fatherName" type="text" value={formData.fatherName} onChange={handleChange} className="w-full input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="motherName">Nome da Mãe</label>
                    <input id="motherName" name="motherName" type="text" value={formData.motherName} onChange={handleChange} className="w-full input" />
                  </div>
                </div>
              </div>
            </section>

             {/* --- Contato e Endereço --- */}
            <section>
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Dados do Encarregado e Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardianName">Nome do Encarregado*</label>
                        <input id="guardianName" name="guardianName" type="text" value={formData.guardianName} onChange={handleChange} className="w-full input" required/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardianContact">Contato do Encarregado*</label>
                        <input id="guardianContact" name="guardianContact" type="text" value={formData.guardianContact} onChange={handleChange} className="w-full input" required/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="guardianRelationship">Grau de Parentesco*</label>
                        <input id="guardianRelationship" name="guardianRelationship" type="text" value={formData.guardianRelationship} onChange={handleChange} className="w-full input" required/>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">Endereço do Estudante</label>
                        <input id="address" name="address" type="text" value={formData.address} onChange={handleChange} className="w-full input" />
                    </div>
                </div>
            </section>

            {/* --- Situação Financeira (Alunos Especiais) --- */}
            <section className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <h3 className="text-lg font-bold text-indigo-800 border-b border-indigo-200 pb-2 mb-4 flex items-center">
                      <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                      Situação Financeira / Bolsa
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status Financeiro</label>
                          <select 
                            value={formData.financialProfile?.status || 'Normal'} 
                            onChange={(e) => handleFinancialChange('status', e.target.value)}
                            className="w-full input bg-white"
                          >
                              <option value="Normal">Normal</option>
                              <option value="Isento Total">Isento Total (Bolsa Completa)</option>
                              <option value="Sem Multa">Sem Multa (Atrasos permitidos)</option>
                              <option value="Desconto Parcial">Desconto Parcial / Isenção Específica</option>
                          </select>
                      </div>
                      
                      {formData.financialProfile?.status === 'Desconto Parcial' && (
                          <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Percentagem de Desconto (%)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    value={formData.financialProfile?.discountPercentage || 0}
                                    onChange={(e) => handleFinancialChange('discountPercentage', parseInt(e.target.value))}
                                    className="w-full input" 
                                />
                            </div>
                            <div className="md:col-span-3 bg-white p-3 rounded border border-indigo-200">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Aplicar Desconto em:</label>
                                <div className="flex flex-wrap gap-4">
                                    {paymentTypesForDiscount.map(type => (
                                        <label key={type} className="flex items-center space-x-2 text-sm cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.financialProfile?.affectedTypes?.includes(type)}
                                                onChange={() => handleAffectedTypeToggle(type)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                          </>
                      )}

                      {/* Justificativa */}
                      {formData.financialProfile?.status !== 'Normal' && (
                          <div className="md:col-span-3 animate-fade-in">
                              <label className="block text-sm font-bold text-gray-700 mb-1">
                                  Justificativa da Isenção/Desconto*
                              </label>
                              <textarea
                                  value={formData.financialProfile?.justification || ''}
                                  onChange={(e) => handleFinancialChange('justification', e.target.value)}
                                  rows={2}
                                  className="w-full input border-indigo-300 focus:ring-indigo-500"
                                  placeholder="Explique o motivo para este benefício..."
                                  required
                              ></textarea>
                          </div>
                      )}
                  </div>
              </section>
            
            {/* --- Informações Adicionais --- */}
            <section>
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Informações Adicionais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="desiredClass">Classe Pretendida*</label>
                     <select
                        id="desiredClass"
                        name="desiredClass"
                        value={formData.desiredClass}
                        onChange={handleChange}
                        className="w-full input bg-white"
                        required
                      >
                        <option value="" disabled>Selecione a classe</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={`${i + 1}ª Classe`}>
                            {i + 1}ª Classe
                          </option>
                        ))}
                      </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">Status do Aluno*</label>
                     <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full input bg-white"
                        required
                      >
                        {statusOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="healthInfo">Condições de Saúde Relevantes</label>
                    <textarea id="healthInfo" name="healthInfo" value={formData.healthInfo} onChange={handleChange} rows={2} className="w-full input"></textarea>
                  </div>
                  <div className="md:col-span-2 flex items-center">
                    <input id="isTransferred" name="isTransferred" type="checkbox" checked={formData.isTransferred} onChange={handleChange} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="isTransferred" className="ml-2 block text-sm text-gray-900">Aluno transferido de outra escola?</label>
                  </div>
                  {formData.isTransferred && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="previousSchool">Escola Anterior</label>
                        <input id="previousSchool" name="previousSchool" type="text" value={formData.previousSchool} onChange={handleChange} className="w-full input" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="previousSchoolFinalGrade">Média Final</label>
                        <input id="previousSchoolFinalGrade" name="previousSchoolFinalGrade" type="text" value={formData.previousSchoolFinalGrade} onChange={handleChange} className="w-full input" />
                      </div>
                    </>
                  )}
              </div>
            </section>

             {/* --- Documentos --- */}
            <section>
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Checklist de Documentos Entregues</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                {documentTypes.map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 text-sm text-gray-800">
                        <input type="checkbox" name={key} checked={formData.documents[key]} onChange={handleDocumentChange} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        <span>{label}</span>
                    </label>
                ))}
              </div>
            </section>
          </div>

          <footer className="flex items-center justify-end p-4 border-t bg-gray-50 rounded-b-2xl">
            {error && <p className="text-red-500 text-sm mr-auto">{error}</p>}
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 mr-2">
              Cancelar
            </button>
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
              Salvar Alterações
            </button>
          </footer>
        </form>
      </div>
      <style>{`
        .input {
            padding: 8px 12px;
            border: 1px solid #D1D5DB;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .input:focus {
            ring: 2px;
            ring-color: #6366F1;
            border-color: #6366F1;
            outline: none;
        }
      `}</style>
    </div>
  );
};

export default EditStudentModal;
