
import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';

interface LoginPageProps {
  onLogin: (schoolCode: string, email: string, password: string) => Promise<boolean>;
  loginError: string;
}

const GraduationCapIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.721 6.554C21.393 6.425 20.264 6 12 6S2.607 6.425 2.279 6.554A1 1 0 0 0 2 7.499V12c0 4.887 8.038 9 9.5 9.475a1 1 0 0 0 1 0C13.962 21 22 16.887 22 12V7.499a1 1 0 0 0-.279-.945zM12 19.444C5.556 18.2 4 15.231 4 12V8.783C5.939 8.272 9.17 7.9 12 7.9s6.061.372 8 1.117V12c0 3.231-1.556 6.2-8 7.444zM4.75 5.5a1 1 0 0 0 1 1h12.5a1 1 0 1 0 0-2H5.75a1 1 0 0 0-1 1z" />
    </svg>
);

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, loginError }) => {
  const [schoolCode, setSchoolCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isSuperAdminEmail = email.trim().toLowerCase() === 'admin@sistema.com';

  useEffect(() => {
    if (isSuperAdminEmail) {
      setSchoolCode('');
    }
  }, [isSuperAdminEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      if (!isSuperAdminEmail && !schoolCode) {
          setError('Por favor, insira o Código de Acesso da sua escola.');
          return;
      }
      setError('');
      setLoading(true);
      await onLogin(schoolCode, email, password);
      setLoading(false);
    } else {
      setError('Preencha seu email e senha de acesso.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccessMsg('');

      if (!email) {
          setError('Insira o seu e-Mola para solicitar a recuperação.');
          return;
      }

      setLoading(true);
      try {
          const result = await apiService.post('/auth/forgot-password', { email });
          if (result.success) {
              setSuccessMsg('Solicitação enviada ao suporte central! Entre em contacto para autorizar a redefinição.');
          }
      } catch (err: any) {
          setError(err.message || 'Erro ao processar solicitação.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
             <div className="bg-indigo-600 p-5 rounded-3xl text-white mb-6 shadow-xl shadow-indigo-200">
                <GraduationCapIcon className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">SEI <span className="text-indigo-600">Smart</span></h1>
            <p className="text-slate-400 mt-2 font-medium text-center">
                {isForgotMode ? 'Recuperação de Acesso Admin' : 'Sistema Escolar Integrado'}
            </p>
          </div>
          
          {isForgotMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                   <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1" htmlFor="email">E-mail do Administrador</label>
                    <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@suaescola.com"
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 font-medium"
                    />
                    <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                        Apenas administradores podem solicitar recuperação via sistema central. 
                    </p>
                  </div>

                  {successMsg && (
                      <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-xs font-bold border border-green-100 flex items-center gap-3">
                          {successMsg}
                      </div>
                  )}

                  {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                            {error}
                        </div>
                   )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white font-black py-5 px-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                  >
                    {loading ? 'PROCESSANDO...' : 'SOLICITAR RECUPERAÇÃO'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsForgotMode(false); setError(''); setSuccessMsg(''); }}
                    className="w-full text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-indigo-600"
                  >
                    Voltar ao Login
                  </button>
              </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
                {!isSuperAdminEmail && (
                  <div className="animate-fade-in">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1" htmlFor="schoolCode">Acesso Geral (Código da Escola)</label>
                      <input
                          id="schoolCode"
                          type="text"
                          value={schoolCode}
                          onChange={(e) => setSchoolCode(e.target.value)}
                          placeholder="Ex: colegiosmart"
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 font-bold text-indigo-700 uppercase"
                      />
                  </div>
                )}

                <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1" htmlFor="email">E-mail Pessoal / Corporativo</label>
                <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 font-medium"
                />
                </div>
                
                <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1" htmlFor="password">Palavra-passe Pessoal</label>
                <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 font-medium"
                />
                <button 
                    type="button"
                    onClick={() => setIsForgotMode(true)}
                    className="text-[10px] text-indigo-500 font-bold mt-2 ml-1 hover:underline uppercase tracking-tighter"
                >
                    Esqueceu a senha?
                </button>
                </div>
                
                {(error || loginError) && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3 animate-shake">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        {error || loginError}
                    </div>
                )}

                <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-black py-5 px-4 rounded-2xl hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all transform active:scale-[0.98] shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                {loading ? 'AUTENTICANDO...' : 'ACEDER AO PORTAL'}
                </button>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Software Licenciado © 2024
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExclamationTriangleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

export default LoginPage;
