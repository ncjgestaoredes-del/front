
import React, { useState, useCallback, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { apiService } from './apiService';
import { User, UserRole, Student, AcademicYear, SchoolSettings, Turma, FinancialSettings, ExpenseRecord, DiscussionTopic, DiscussionMessage, AppNotification, SchoolRequest, SchoolInstance } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<SchoolInstance[]>([]);
  
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({ totalClassrooms: 10, studentsPerClass: 25, shifts: 2 });
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({ currency: 'MZN', enrollmentFee: 2500, renewalFee: 1500, monthlyFee: 5000, annualExamFee: 1000, transferFee: 500, monthlyPaymentLimitDay: 10, latePaymentPenaltyPercent: 10, uniforms: [], books: [] });
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [requests, setRequests] = useState<SchoolRequest[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string>('');

  // 1. Carregar Infraestrutura SaaS do Banco de Dados
  useEffect(() => {
    const loadInitialData = async () => {
        setLoading(true);
        setDbError(null);
        try {
            const data = await apiService.get('/schools');
            setSchools(data);
        } catch (err) {
            console.error("Falha ao conectar com o backend MySQL.");
            setDbError("Não foi possível conectar ao servidor central. Verifique sua conexão ou se o backend no Render está ativo.");
        } finally {
            setLoading(false);
        }
    };
    loadInitialData();
  }, []);

  // 2. Carregar dados específicos da escola via API após login
  useEffect(() => {
    if (currentUser && currentUser.schoolId) {
        const loadSchoolData = async () => {
            setLoading(true);
            try {
                const sid = currentUser.schoolId;
                const data = await apiService.get(`/school/${sid}/full-data`);
                
                if (data.users) setUsers(data.users);
                if (data.students) setStudents(data.students);
                if (data.academic_years) setAcademicYears(data.academic_years);
                if (data.settings) setSchoolSettings(data.settings);
                if (data.financial) setFinancialSettings(data.financial);
                if (data.turmas) setTurmas(data.turmas);
                if (data.expenses) setExpenses(data.expenses);
                if (data.topics) setTopics(data.topics);
                if (data.messages) setMessages(data.messages);
                if (data.notifications) setNotifications(data.notifications);
                if (data.requests) setRequests(data.requests);
            } catch (err) {
                console.error("Erro ao carregar dados da escola:", err);
            } finally {
                setLoading(false);
            }
        };
        loadSchoolData();
    }
  }, [currentUser]);

  // Sincronizar dados com o MySQL
  const saveSchoolData = useCallback(async (key: string, data: any) => {
      if (currentUser?.schoolId) {
          setIsSyncing(true);
          try {
              await apiService.post(`/school/${currentUser.schoolId}/sync/${key}`, data);
          } catch (err) {
              console.error(`Erro ao sincronizar ${key}:`, err);
          } finally {
              setTimeout(() => setIsSyncing(false), 1000);
          }
      }
  }, [currentUser]);

  const handleSchoolsChange = async (updated: SchoolInstance[]) => {
      setSchools(updated);
      setIsSyncing(true);
      try {
          await apiService.post('/schools/sync', updated);
      } catch (err) {
          console.error("Erro ao sincronizar escolas.");
      } finally {
          setTimeout(() => setIsSyncing(false), 1000);
      }
  };

  const handleLogin = async (schoolCode: string, email: string, password: string): Promise<boolean> => {
    setLoginError('');
    try {
        const result = await apiService.post('/auth/login', { 
            schoolCode: schoolCode.trim().toLowerCase(), 
            email: email.trim().toLowerCase(), 
            password 
        });
        
        if (result.success) {
            setCurrentUser(result.user);
            return true;
        } else {
            setLoginError(result.message || 'Credenciais ou código da escola inválidos.');
            return false;
        }
    } catch (err: any) {
        setLoginError(err.message || 'Falha na conexão com o servidor.');
        return false;
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-black tracking-[0.2em] uppercase text-sm">Sincronizando Banco de Dados...</p>
          </div>
      );
  }

  if (dbError) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
              <div className="bg-red-500/20 p-6 rounded-full mb-6">
                  <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-2xl font-black mb-2 uppercase">Erro de Conexão Crítico</h2>
              <p className="text-slate-400 max-w-md mb-8">{dbError}</p>
              <button onClick={() => window.location.reload()} className="bg-indigo-600 px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all">TENTAR NOVAMENTE</button>
          </div>
      );
  }

  return (
    <>
      {isSyncing && (
          <div className="fixed bottom-4 right-4 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Salvando no Banco de Dados...</span>
          </div>
      )}

      {!currentUser ? (
        <LoginPage onLogin={handleLogin} loginError={loginError} />
      ) : currentUser.role === UserRole.SUPER_ADMIN ? (
        <SuperAdminDashboard schools={schools} onSchoolsChange={handleSchoolsChange} onLogout={() => setCurrentUser(null)} currentUser={currentUser} />
      ) : (
        <Dashboard 
            user={currentUser} 
            onLogout={() => setCurrentUser(null)}
            users={users}
            onUsersChange={(u: User[]) => { setUsers(u); saveSchoolData('users', u); }}
            students={students}
            onStudentsChange={(s: Student[]) => { setStudents(s); saveSchoolData('students', s); }}
            onResetApp={() => alert("Função desativada em modo MySQL. Use o DB Admin.")}
            onClearStudents={() => { if(window.confirm("Limpar?")) { setStudents([]); saveSchoolData('students', []); } }}
            academicYears={academicYears}
            onAcademicYearsChange={(y: AcademicYear[]) => { setAcademicYears(y); saveSchoolData('academic_years', y); }}
            schoolSettings={schoolSettings}
            onSchoolSettingsChange={(s: SchoolSettings) => { setSchoolSettings(s); saveSchoolData('settings', s); }}
            financialSettings={financialSettings}
            onFinancialSettingsChange={(f: FinancialSettings) => { setFinancialSettings(f); saveSchoolData('financial', f); }}
            turmas={turmas}
            onTurmasChange={(t: Turma[]) => { setTurmas(t); saveSchoolData('turmas', t); }}
            expenses={expenses}
            onExpensesChange={(e: ExpenseRecord[]) => { setExpenses(e); saveSchoolData('expenses', e); }}
            topics={topics}
            onTopicsChange={(t: DiscussionTopic[]) => { setTopics(t); saveSchoolData('topics', t); }}
            messages={messages}
            onMessagesChange={(m: DiscussionMessage[]) => { setMessages(m); saveSchoolData('messages', m); }}
            notifications={notifications}
            onAddNotifications={(n: AppNotification[]) => { const upd = [...n, ...notifications]; setNotifications(upd); saveSchoolData('notifications', upd); }}
            onMarkNotificationAsRead={(id: string) => { const upd = notifications.map(n => n.id === id ? { ...n, read: true } : n); setNotifications(upd); saveSchoolData('notifications', upd); }}
            requests={requests}
            onRequestsChange={(r: SchoolRequest[]) => { setRequests(r); saveSchoolData('requests', r); }}
        />
      )}
    </>
  );
};

export default App;
