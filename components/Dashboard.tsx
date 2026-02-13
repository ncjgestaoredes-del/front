
import React, { useState, useMemo } from 'react';
import { User, UserRole, Student, AcademicYear, SchoolSettings, Turma, FinancialSettings, ExpenseRecord, DiscussionTopic, DiscussionMessage, AppNotification, SchoolRequest } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import StudentList from './StudentList';
import UserManagement from './UserManagement';
import GuardianManagement from './GuardianManagement';
import GuardianPortal from './GuardianPortal';
import AcademicYearManagement from './AcademicYearManagement';
import SchoolCapacitySettings from './SchoolCapacitySettings';
import VacancyOverview from './VacancyOverview';
import TurmaManagement from './TurmaManagement';
import TeacherManagement from './TeacherManagement';
import FinancialSetup from './FinancialSetup';
import EnrollmentPayment from './EnrollmentPayment';
import FinancialRecords from './FinancialRecords';
import ReportsView from './ReportsView';
import DailyClosingSheet from './DailyClosingSheet';
import ExpenseManagement from './ExpenseManagement';
import InternalChat from './InternalChat';
import ClassManagement from './ClassManagement';
import RequestManagement from './RequestManagement';
import TransferManagement from './TransferManagement';
import DataManagement from './DataManagement';
import { ClipboardListIcon, CurrencyDollarIcon, CalendarIcon, TrendingDownIcon } from './icons/IconComponents';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateCurrentUser: (data: Partial<User>) => void;
  users: User[];
  onUsersChange: (users: User[]) => void;
  students: Student[];
  onStudentsChange: (students: Student[]) => void;
  onResetApp: () => void;
  onClearStudents: () => void;
  academicYears: AcademicYear[];
  onAcademicYearsChange: (years: AcademicYear[]) => void;
  schoolSettings: SchoolSettings;
  onSchoolSettingsChange: (settings: SchoolSettings) => void;
  financialSettings: FinancialSettings;
  onFinancialSettingsChange: (settings: FinancialSettings) => void;
  turmas: Turma[];
  onTurmasChange: (turmas: Turma[]) => void;
  expenses: ExpenseRecord[];
  onExpensesChange: (expenses: ExpenseRecord[]) => void;
  topics: DiscussionTopic[];
  onTopicsChange: (topics: DiscussionTopic[]) => void;
  messages: DiscussionMessage[];
  onMessagesChange: (messages: DiscussionMessage[]) => void;
  notifications: AppNotification[];
  onAddNotifications: (notifications: AppNotification[]) => void;
  onMarkNotificationAsRead: (id: string) => void;
  requests: SchoolRequest[];
  onRequestsChange: (requests: SchoolRequest[]) => void;
}

export type View = 'painel' | 'alunos' | 'turmas' | 'reuniao' | 'encarregados' | 'professores' | 'classes' | 'relatorios' | 'configuracoes' | 'gerenciar-usuarios' | 'financeiro' | 'solicitacoes' | 'transferencias';

const viewTitles: Record<View, string> = {
    'painel': 'Painel Principal',
    'alunos': 'Alunos',
    'turmas': 'Turmas',
    'reuniao': 'Comunicação',
    'encarregados': 'Encarregados',
    'professores': 'Professores',
    'classes': 'Relatório de Classes',
    'relatorios': 'Relatórios',
    'configuracoes': 'Configurações',
    'gerenciar-usuarios': 'Usuários',
    'financeiro': 'Finanças',
    'solicitacoes': 'Solicitações',
    'transferencias': 'Transferências'
};

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { user, onLogout, onUpdateCurrentUser, users, onUsersChange, students, onStudentsChange, onResetApp, onClearStudents, academicYears, onAcademicYearsChange, schoolSettings, onSchoolSettingsChange, financialSettings, onFinancialSettingsChange, turmas, onTurmasChange, expenses, onExpensesChange, topics, onTopicsChange, messages, onMessagesChange, notifications, onAddNotifications, onMarkNotificationAsRead, requests, onRequestsChange } = props;
  
  const [activeView, setActiveView] = useState<View>('painel');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [financialTab, setFinancialTab] = useState<'payment' | 'setup' | 'records' | 'daily' | 'expenses'>('payment');

  const visibleStudents = useMemo(() => {
      if (user.role === UserRole.PROFESSOR) {
          const myTurmas = turmas.filter(t =>
              t.teachers?.some(teach => teach.teacherId === user.id) ||
              // @ts-ignore legacy
              t.teacherIds?.includes(user.id) || t.teacherId === user.id
          );
          const myStudentIds = new Set(myTurmas.flatMap(t => t.studentIds));
          return students.filter(s => myStudentIds.has(s.id));
      }
      return students;
  }, [user, turmas, students]);

  const visibleUsers = useMemo(() => {
      if (user.role === UserRole.PROFESSOR) {
          const guardianNames = new Set(visibleStudents.map(s => s.guardianName));
          return users.filter(u => {
              if (u.role !== UserRole.ENCARREGADO) return true; 
              return guardianNames.has(u.name);
          });
      }
      return users;
  }, [user, visibleStudents, users]);

  if (user.role === UserRole.ENCARREGADO) {
    if (activeView === 'reuniao') {
        return (
            <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
                <Sidebar user={user} activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header 
                        user={user} 
                        onLogout={onLogout} 
                        onUpdateProfile={onUpdateCurrentUser}
                        title={viewTitles[activeView]} 
                        notifications={notifications} 
                        onMarkNotificationAsRead={onMarkNotificationAsRead}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 md:p-8">
                        <InternalChat 
                            currentUser={user}
                            users={users}
                            topics={topics}
                            onTopicsChange={onTopicsChange}
                            messages={messages}
                            onMessagesChange={onMessagesChange}
                            onAddNotifications={onAddNotifications}
                        />
                    </main>
                </div>
            </div>
        );
    }

    return <GuardianPortal 
              user={user} 
              onLogout={onLogout} 
              onUpdateCurrentUser={onUpdateCurrentUser}
              students={students}
              onStudentsChange={onStudentsChange}
              academicYears={academicYears}
              schoolSettings={schoolSettings}
              turmas={turmas}
              financialSettings={financialSettings}
              activeView={activeView}
              setActiveView={setActiveView}
              onAddNotifications={onAddNotifications}
              users={users}
            />;
  }

  const renderContent = () => {
    switch (activeView) {
        case 'painel':
            return <VacancyOverview turmas={turmas} schoolSettings={schoolSettings} students={students} academicYears={academicYears} />;
        case 'reuniao':
            return <InternalChat currentUser={user} users={users} topics={topics} onTopicsChange={onTopicsChange} messages={messages} onMessagesChange={onMessagesChange} onAddNotifications={onAddNotifications} />;
        case 'solicitacoes':
            return <RequestManagement currentUser={user} users={users} requests={requests} onRequestsChange={onRequestsChange} onAddNotifications={onAddNotifications} />;
        case 'transferencias':
            return <TransferManagement students={students} onStudentsChange={onStudentsChange} academicYears={academicYears} turmas={turmas} schoolSettings={schoolSettings} financialSettings={financialSettings} requests={requests} onRequestsChange={onRequestsChange} currentUser={user} />;
        case 'financeiro':
             if (user.role === UserRole.ADMIN || user.role === UserRole.SECRETARIA) {
                 return (
                     <div className="space-y-6">
                         <div className="flex space-x-1 p-1 bg-white border border-gray-100 rounded-xl shadow-sm w-full overflow-x-auto no-scrollbar">
                             <button 
                                onClick={() => setFinancialTab('payment')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center whitespace-nowrap ${financialTab === 'payment' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                             >
                                 <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                                 Matrículas
                             </button>
                             <button 
                                onClick={() => setFinancialTab('records')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center whitespace-nowrap ${financialTab === 'records' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                             >
                                 <ClipboardListIcon className="w-4 h-4 mr-2" />
                                 Registos
                             </button>
                             <button 
                                onClick={() => setFinancialTab('expenses')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center whitespace-nowrap ${financialTab === 'expenses' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                             >
                                 <TrendingDownIcon className="w-4 h-4 mr-2" />
                                 Despesas
                             </button>
                             <button 
                                onClick={() => setFinancialTab('daily')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center whitespace-nowrap ${financialTab === 'daily' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                             >
                                 <CalendarIcon className="w-4 h-4 mr-2" />
                                 Fecho
                             </button>
                             {user.role === UserRole.ADMIN && (
                                <button 
                                    onClick={() => setFinancialTab('setup')}
                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center whitespace-nowrap ${financialTab === 'setup' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                >
                                    Setup
                                </button>
                             )}
                         </div>

                         {financialTab === 'payment' ? (
                             <EnrollmentPayment students={students} onStudentsChange={onStudentsChange} financialSettings={financialSettings} academicYears={academicYears} currentUser={user} users={users} onAddNotifications={onAddNotifications} />
                         ) : financialTab === 'records' ? (
                             <FinancialRecords students={students} onStudentsChange={onStudentsChange} financialSettings={financialSettings} academicYears={academicYears} currentUser={user} users={users} onAddNotifications={onAddNotifications} schoolSettings={schoolSettings} />
                         ) : financialTab === 'expenses' ? (
                             <ExpenseManagement expenses={expenses} onExpensesChange={onExpensesChange} currentUser={user} financialSettings={financialSettings} users={users} onAddNotifications={onAddNotifications} students={students} onStudentsChange={onStudentsChange} />
                         ) : financialTab === 'daily' ? (
                             <DailyClosingSheet students={students} financialSettings={financialSettings} schoolSettings={schoolSettings} currentUser={user} users={users} onAddNotifications={onAddNotifications} />
                         ) : (
                             <FinancialSetup settings={financialSettings} onSettingsChange={onFinancialSettingsChange} />
                         )}
                     </div>
                 );
             }
             return <div className="p-4 text-center text-gray-500 font-bold">Acesso negado.</div>;
        case 'alunos':
            return <StudentList user={user} users={visibleUsers} onUsersChange={onUsersChange} students={visibleStudents} onStudentsChange={onStudentsChange} onAddNotifications={onAddNotifications} financialSettings={financialSettings} academicYears={academicYears} />;
        case 'turmas':
             return <TurmaManagement turmas={turmas} onTurmasChange={onTurmasChange} students={students} academicYears={academicYears} schoolSettings={schoolSettings} users={users} currentUser={user} onStudentsChange={onStudentsChange} onAddNotifications={onAddNotifications} />;
        case 'professores':
            return <TeacherManagement users={users} onUsersChange={onUsersChange} currentUser={user} />;
        case 'encarregados':
            return <GuardianManagement users={visibleUsers} onUsersChange={onUsersChange} currentUser={user} students={visibleStudents} />;
        case 'gerenciar-usuarios':
            return <UserManagement users={users} onUsersChange={onUsersChange} currentUser={user} />;
        case 'classes':
            return <ClassManagement academicYears={academicYears} turmas={turmas} students={students} schoolSettings={schoolSettings} financialSettings={financialSettings} expenses={expenses} users={users} currentUser={user} />;
        case 'relatorios':
            return <ReportsView currentUser={user} students={students} academicYears={academicYears} turmas={turmas} schoolSettings={schoolSettings} users={users} financialSettings={financialSettings} expenses={expenses} />;
        case 'configuracoes':
            return (
                <div className="space-y-8 pb-10">
                    {user.role === UserRole.ADMIN && (
                      <>
                        <SchoolCapacitySettings settings={schoolSettings} onSettingsChange={onSchoolSettingsChange} />
                        <AcademicYearManagement academicYears={academicYears} onAcademicYearsChange={onAcademicYearsChange} students={students} onStudentsChange={onStudentsChange} turmas={turmas} schoolSettings={schoolSettings} />
                        <DataManagement schoolId={user.schoolId} />
                      </>
                    )}
                    <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 tracking-tight">Preferências Pessoais</h3>
                        <p className="mt-2 text-sm text-gray-500">Mais opções de personalização em breve.</p>
                    </div>
        
                    {user.role === UserRole.ADMIN && (
                        <div className="p-6 bg-white rounded-2xl shadow-lg border-2 border-red-100">
                            <h4 className="text-lg font-black text-red-700 flex items-center uppercase tracking-tighter">
                                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Administração Crítica
                            </h4>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-red-50 rounded-xl bg-red-50/30">
                                    <p className="font-bold text-gray-800 text-sm">Limpar Todos Alunos</p>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase">Remove apenas os cadastros de estudantes.</p>
                                    <button onClick={onClearStudents} className="mt-3 w-full bg-white text-red-600 border border-red-200 text-xs font-black py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">LIMPAR AGORA</button>
                                </div>
                                <div className="p-4 border border-red-100 rounded-xl bg-red-50/50">
                                    <p className="font-bold text-gray-800 text-sm">Reset do Sistema</p>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase">Apaga absolutamente tudo (SaaS Reset).</p>
                                    <button onClick={onResetApp} className="mt-3 w-full bg-red-700 text-white text-xs font-black py-2 rounded-lg hover:bg-red-900 transition-all shadow-lg shadow-red-200">RESET TOTAL</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        default:
            return <div className="p-6 bg-white rounded-2xl shadow-md text-center py-20">
                <h3 className="text-xl font-bold text-gray-800">Bem-vindo(a)</h3>
                <p className="mt-2 text-gray-500">Selecione uma opção no menu para começar.</p>
            </div>;
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar user={user} activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
            user={user} 
            onLogout={onLogout} 
            onUpdateProfile={onUpdateCurrentUser}
            title={viewTitles[activeView]} 
            notifications={notifications}
            onMarkNotificationAsRead={onMarkNotificationAsRead}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
             {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
