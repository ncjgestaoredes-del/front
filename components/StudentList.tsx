
import React, { useState, useMemo } from 'react';
import { Student, StudentStatus, User, UserRole, AppNotification, BehaviorNote, FinancialSettings, AcademicYear, PaymentType } from '../types';
import AddStudentModal from './AddStudentModal';
import EditStudentModal from './EditStudentModal';
import RegisterOccurrenceModal from './RegisterOccurrenceModal';
import { EditIcon, ExclamationTriangleIcon, FilterIcon, CurrencyDollarIcon, LockClosedIcon } from './icons/IconComponents';

const StatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const baseClasses = 'px-3 py-1 text-xs font-semibold rounded-full';
  const statusClasses = {
    Ativo: 'bg-green-100 text-green-800',
    Inativo: 'bg-red-100 text-red-800',
    Transferido: 'bg-yellow-100 text-yellow-800',
    Suspenso: 'bg-gray-200 text-gray-700',
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const filterOptions: (StudentStatus | 'Todos')[] = ['Todos', 'Ativo', 'Inativo', 'Transferido', 'Suspenso'];
const financialFilterOptions = ['Todos', 'Devedores (Saldo Negativo)', 'Em Dia / Credores'];

interface StudentListProps {
  user: User;
  users: User[];
  onUsersChange: (users: User[]) => void;
  students: Student[];
  onStudentsChange: (students: Student[]) => void;
  onAddNotifications: (notifications: AppNotification[]) => void;
  financialSettings?: FinancialSettings;
  academicYears?: AcademicYear[];
}

const StudentList: React.FC<StudentListProps> = ({ user, users, onUsersChange, students, onStudentsChange, onAddNotifications, financialSettings, academicYears }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'Todos'>('Todos');
  const [financialFilter, setFinancialFilter] = useState<string>('Todos');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Discipline State
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [disciplinaryStudent, setDisciplinaryStudent] = useState<Student | null>(null);

  const canManageStudents = user.role === UserRole.ADMIN || user.role === UserRole.SECRETARIA;
  const canRegisterOccurrence = canManageStudents || user.role === UserRole.PROFESSOR;

  const handleAddStudent = (newStudentData: Omit<Student, 'id' | 'matriculationDate' | 'status'>) => {
    const newStudent: Student = {
        ...newStudentData,
        id: `S${(students.length + 1).toString().padStart(3, '0')}`,
        matriculationDate: new Date().toISOString().split('T')[0],
        status: 'Ativo',
    };
    onStudentsChange([newStudent, ...students]);
    setIsAddModalOpen(false);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    onStudentsChange(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    handleCloseEditModal();
  };

  // --- Discipline Handlers ---
  const handleOpenOccurrenceModal = (student: Student) => {
      setDisciplinaryStudent(student);
      setIsOccurrenceModalOpen(true);
  };

  const handleSaveOccurrence = (note: BehaviorNote) => {
      if (!disciplinaryStudent) return;

      const updatedStudent = {
          ...disciplinaryStudent,
          behavior: [note, ...(disciplinaryStudent.behavior || [])]
      };

      onStudentsChange(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      
      if (note.type === 'Negativo' && note.severity === 'Grave') {
          const notifications: AppNotification[] = [];
          const admins = users.filter(u => u.role === UserRole.ADMIN);
          admins.forEach(admin => {
              notifications.push({
                  id: `notif_discipline_${Date.now()}_${admin.id}`,
                  userId: admin.id,
                  type: 'admin_alert',
                  title: 'Ocorrência Disciplinar Grave',
                  message: `O aluno ${updatedStudent.name} cometeu uma infração grave: ${note.note.substring(0, 50)}...`,
                  read: false,
                  timestamp: new Date().toISOString()
              });
          });
          if (notifications.length > 0) onAddNotifications(notifications);
      }

      setIsOccurrenceModalOpen(false);
      setDisciplinaryStudent(null);
  };

  // --- Financial Calculation Logic ---
  const calculateStudentBalance = (student: Student) => {
      // Safety check for dependencies
      if (!financialSettings || !academicYears || academicYears.length === 0) {
          return { balance: 0, isDebtor: false };
      }

      try {
          const activeYearObj = academicYears.find(y => y.status === 'Em Curso') || academicYears[0];
          if (!activeYearObj) return { balance: 0, isDebtor: false };
          
          const currentYear = activeYearObj.year;

          // 1. Calcular Créditos (O que foi pago neste ano letivo)
          const totalPaid = student.payments
              ?.filter(p => p.academicYear === currentYear)
              .reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

          // --- FIX: Recém Matriculados ---
          // Se o aluno foi matriculado neste ano/mês e ainda não fez pagamentos,
          // consideramos saldo 0 visualmente para não indicar dívida imediata antes do ato da matrícula financeira.
          const matDate = new Date(student.matriculationDate);
          const now = new Date();
          // Verifica se a matrícula é do ano corrente e se é recente (mesmo mês)
          const isNewThisMonth = matDate.getFullYear() === now.getFullYear() && matDate.getMonth() === now.getMonth();
          
          if (totalPaid === 0 && isNewThisMonth) {
              return { balance: 0, isDebtor: false };
          }
          // -------------------------------

          // 2. Calcular Débitos (Obrigações até o momento)
          let totalObligation = 0;
          const profile = student.financialProfile || { status: 'Normal' };
          
          // Determine taxas base (considerando descontos)
          const getFee = (type: PaymentType, baseValue: number) => {
              if (profile.status === 'Isento Total') return 0;
              if (profile.status === 'Desconto Parcial' && profile.affectedTypes?.includes(type)) {
                  return baseValue * (1 - (profile.discountPercentage || 0) / 100);
              }
              return baseValue;
          };

          // Valores Base (Classe Específica ou Global)
          let monthlyFeeBase = financialSettings.monthlyFee;
          let enrollmentFeeBase = financialSettings.enrollmentFee;
          let renewalFeeBase = financialSettings.renewalFee;

          if (student.desiredClass && financialSettings.classSpecificFees) {
              const specific = financialSettings.classSpecificFees.find(c => c.classLevel === student.desiredClass);
              if (specific) {
                  monthlyFeeBase = specific.monthlyFee;
                  enrollmentFeeBase = specific.enrollmentFee;
                  renewalFeeBase = specific.renewalFee;
              }
          }

          // A. Matrícula / Renovação
          const matriculationYear = matDate.getFullYear();
          if (!isNaN(matriculationYear)) {
              if (matriculationYear === currentYear) {
                  totalObligation += getFee('Matrícula', enrollmentFeeBase);
              } else if (matriculationYear < currentYear && student.status !== 'Inativo') {
                  totalObligation += getFee('Renovação', renewalFeeBase);
              }
          }

          // B. Mensalidades (Até o mês atual)
          const currentMonth = now.getMonth() + 1;
          const currentDay = now.getDate();
          const startMonth = activeYearObj.startMonth || 2;
          const endMonth = activeYearObj.endMonth || 11;
          
          // Ajustar início da cobrança com base na data de entrada
          let effectiveStartMonth = startMonth;
          if (matDate.getFullYear() === currentYear) {
              effectiveStartMonth = Math.max(startMonth, matDate.getMonth() + 1);
          }

          const checkLimit = (activeYearObj.year === now.getFullYear()) 
              ? Math.min(currentMonth, endMonth) 
              : endMonth; // Se for ano passado, cobra tudo. Se futuro, nada.

          if (currentYear > now.getFullYear()) {
              // Ano futuro não gera dívida de mensalidade vencida ainda
          } else {
              for (let m = effectiveStartMonth; m <= checkLimit; m++) {
                  // Lógica de Suspensão: Se suspenso, não cobrar meses APÓS a suspensão
                  if (student.status === 'Suspenso' && student.suspensionDate) {
                      const suspDate = new Date(student.suspensionDate);
                      if (currentYear === suspDate.getFullYear() && m > (suspDate.getMonth() + 1)) {
                          continue; 
                      }
                      if (currentYear > suspDate.getFullYear()) {
                          continue;
                      }
                  }

                  let monthlyAmount = getFee('Mensalidade', monthlyFeeBase);
                  
                  // Verificar Multa se estiver atrasado
                  // Se o ano analisado é passado, todos os meses estão atrasados
                  const isLate = (currentYear < now.getFullYear()) || (m < currentMonth || (m === currentMonth && currentDay > (financialSettings.monthlyPaymentLimitDay || 10)));

                  if (isLate) {
                      if (financialSettings.latePaymentPenaltyPercent > 0 && profile.status !== 'Sem Multa' && profile.status !== 'Isento Total') {
                          monthlyAmount += (monthlyAmount * (financialSettings.latePaymentPenaltyPercent / 100));
                      }
                  }
                  
                  totalObligation += monthlyAmount;
              }
          }

          // C. Taxas Extras e Danos (Registrados no perfil do aluno)
          if (student.extraCharges) {
              student.extraCharges.forEach(charge => {
                  const chargeDate = new Date(charge.date);
                  if (chargeDate.getFullYear() === currentYear && !charge.isPaid) {
                      totalObligation += charge.amount;
                  }
              });
          }

          // D. Compras Loja
          
          const balance = totalPaid - totalObligation;
          // Tolerância de 50 meticais
          return { 
              balance, 
              isDebtor: balance < -50 
          };
      } catch (error) {
          console.error("Erro ao calcular saldo:", error);
          return { balance: 0, isDebtor: false };
      }
  };

  const handleSuspendStudent = (student: Student) => {
      // 1. Check Debts
      const { isDebtor, balance } = calculateStudentBalance(student);
      
      if (isDebtor) {
          alert(`BLOQUEADO: Não é possível trancar a matrícula.\n\nO aluno possui uma dívida estimada de ${Math.abs(balance).toLocaleString()} MT.\nPor favor, regularize a situação financeira antes de suspender.`);
          return;
      }

      // 2. Confirm Action
      if (window.confirm(`ATENÇÃO: Deseja TRANCAR a matrícula de ${student.name}?\n\n- O status mudará para "Suspenso".\n- As mensalidades deixarão de ser cobradas a partir de hoje.\n- O aluno perderá acesso às aulas até renovar a matrícula.`)) {
          
          const updatedStudent: Student = {
              ...student,
              status: 'Suspenso',
              suspensionDate: new Date().toISOString().split('T')[0] // Use simple date format YYYY-MM-DD
          };

          onStudentsChange(students.map(s => s.id === student.id ? updatedStudent : s));
          alert(`Matrícula de ${student.name} trancada com sucesso.`);
      }
  };

  const formatCurrency = (val: number) => {
      return val.toLocaleString('pt-MZ', { style: 'currency', currency: financialSettings?.currency || 'MZN' });
  };

  const filteredStudents = useMemo(() => {
    let currentStudents = students;

    // 1. Status Filter
    if (statusFilter !== 'Todos') {
      currentStudents = currentStudents.filter(student => student.status === statusFilter);
    }
    
    // 2. Financial Filter
    if (financialFilter !== 'Todos' && financialSettings && academicYears) {
        currentStudents = currentStudents.filter(student => {
            const { isDebtor } = calculateStudentBalance(student);
            if (financialFilter === 'Devedores (Saldo Negativo)') return isDebtor;
            if (financialFilter === 'Em Dia / Credores') return !isDebtor;
            return true;
        });
    }

    // 3. Search Filter
    if (searchTerm) {
      currentStudents = currentStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.desiredClass.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentStudents;
  }, [searchTerm, statusFilter, financialFilter, students, financialSettings, academicYears]);

  return (
    <>
      <AddStudentModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStudent={handleAddStudent}
        users={users}
        onUsersChange={onUsersChange}
        onAddNotifications={onAddNotifications}
      />
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        student={editingStudent}
        onUpdateStudent={handleUpdateStudent}
      />
      <RegisterOccurrenceModal 
        isOpen={isOccurrenceModalOpen}
        onClose={() => setIsOccurrenceModalOpen(false)}
        student={disciplinaryStudent}
        onSave={handleSaveOccurrence}
      />

      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
              <h3 className="text-2xl font-bold text-gray-800">Lista de Alunos</h3>
              <p className="text-sm text-gray-500">
                  {academicYears?.find(y => y.status === 'Em Curso') ? `Ano Letivo: ${academicYears?.find(y => y.status === 'Em Curso')?.year}` : 'Gestão Geral'}
              </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Pesquisar por nome, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-indigo-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {canManageStudents && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform transform hover:scale-105 whitespace-nowrap w-full sm:w-auto"
              >
                + Cadastrar Aluno
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-gray-600 mr-2 flex items-center">
                    <FilterIcon className="w-4 h-4 mr-1"/> Status:
                </span>
                {filterOptions.map(option => (
                    <button
                        key={option}
                        onClick={() => setStatusFilter(option)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors duration-200 ${
                            statusFilter === option
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {canManageStudents && financialSettings && academicYears && (
                <div className="flex items-center gap-2 border-l pl-4 ml-2 border-gray-300">
                    <span className="text-sm font-bold text-gray-600 flex items-center">
                        <CurrencyDollarIcon className="w-4 h-4 mr-1"/> Financeiro:
                    </span>
                    <select 
                        value={financialFilter}
                        onChange={(e) => setFinancialFilter(e.target.value)}
                        className="p-1.5 text-xs font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        {financialFilterOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nome do Aluno</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Classe</th>
                {financialSettings && <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-100">Saldo Final</th>}
                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => {
                  const { balance, isDebtor } = calculateStudentBalance(student);
                  
                  return (
                    <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${isDebtor ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{student.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 flex items-center">
                          <img src={student.profilePictureUrl} className="w-8 h-8 rounded-full mr-3 border border-gray-200" alt=""/>
                          <span className={isDebtor ? 'text-red-700 font-bold' : ''}>{student.name}</span>
                          {student.financialProfile && student.financialProfile.status !== 'Normal' && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                  {student.financialProfile.status}
                              </span>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.desiredClass}</td>
                      
                      {/* Coluna Saldo Final */}
                      {financialSettings && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                              <span className={`px-2 py-1 rounded font-bold ${isDebtor ? 'text-red-600 bg-white border border-red-200' : 'text-green-600 bg-green-50 border border-green-200'}`}>
                                  {formatCurrency(balance)}
                              </span>
                          </td>
                      )}

                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-center space-x-3">
                            {canRegisterOccurrence && (
                                <button 
                                    onClick={() => handleOpenOccurrenceModal(student)} 
                                    className="text-amber-600 hover:text-amber-800 flex items-center gap-1"
                                    title="Registar Ocorrência Disciplinar"
                                >
                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                </button>
                            )}
                            {canManageStudents && (
                                <>
                                    <button onClick={() => handleOpenEditModal(student)} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1" title="Editar">
                                        <EditIcon className="w-5 h-5" />
                                    </button>
                                    
                                    {student.status === 'Ativo' && (
                                        <button 
                                            onClick={() => handleSuspendStudent(student)} 
                                            className="text-gray-500 hover:text-red-600 flex items-center gap-1"
                                            title="Trancar Matrícula (Requer saldo regularizado)"
                                        >
                                            <LockClosedIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
              })}
              {filteredStudents.length === 0 && (
                  <tr>
                      <td colSpan={financialSettings ? 6 : 5} className="text-center py-10 text-gray-500">
                          Nenhum aluno encontrado com os filtros aplicados.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredStudents.length > 0 && financialSettings && (
            <div className="mt-4 text-xs text-gray-500 text-right">
                * O Saldo Final é calculado subtraindo o total de obrigações (Matrícula, Mensalidades vencidas, Taxas) do total pago no ano letivo corrente. Valor negativo indica dívida.
            </div>
        )}
      </div>
    </>
  );
};

export default StudentList;
