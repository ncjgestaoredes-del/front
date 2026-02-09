
import React, { useState } from 'react';
import { User } from '../types';

interface SetupAdminPageProps {
  onAdminSetup: (adminData: Omit<User, 'id' | 'role' | 'avatarUrl'>) => void;
}

const GraduationCapIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.721 6.554C21.393 6.425 20.264 6 12 6S2.607 6.425 2.279 6.554A1 1 0 0 0 2 7.499V12c0 4.887 8.038 9 9.5 9.475a1 1 0 0 0 1 0C13.962 21 22 16.887 22 12V7.499a1 1 0 0 0-.279-.945zM12 19.444C5.556 18.2 4 15.231 4 12V8.783C5.939 8.272 9.17 7.9 12 7.9s6.061.372 8 1.117V12c0 3.231-1.556 6.2-8 7.444zM4.75 5.5a1 1 0 0 0 1 1h12.5a1 1 0 1 0 0-2H5.75a1 1 0 0 0-1 1z" />
        <path d="M19.999 7.502a1 1 0 0 0-1 1v1a1 1 0 1 0 2 0v-1a1 1 0 0 0-1-1z" />
    </svg>
);


const SetupAdminPage: React.FC<SetupAdminPageProps> = ({ onAdminSetup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      setError('');
      onAdminSetup({ name, email, password });
    } else {
      setError('Por favor, preencha todos os campos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-teal-400 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-6">
             <div className="bg-blue-500 p-4 rounded-full text-white mb-4">
                <GraduationCapIcon className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Configuração Inicial</h1>
            <p className="text-gray-500 mt-1 text-center">Crie a conta do Administrador Principal.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">Nome Completo</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu Nome Completo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform transform hover:scale-105"
            >
              Criar Conta de Administrador
            </button>
          </form>
           <p className="text-center text-xs text-gray-400 mt-8">
            © 2024 Sistema de Gestão Escolar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetupAdminPage;