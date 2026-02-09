
import React from 'react';
import { HomeIcon, UsersIcon, BookOpenIcon, ChartBarIcon, CogIcon, GraduationCapIcon, CollectionIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon, InboxIcon, DocumentDuplicateIcon, CloseIcon } from './icons/IconComponents';
import { View } from './Dashboard';
import { User, UserRole } from '../types';

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 transform rounded-lg ${
      active
        ? 'bg-indigo-600 text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    {icon}
    <span className="mx-4">{label}</span>
  </button>
);

interface SidebarProps {
    user: User;
    activeView: View;
    setActiveView: (view: View) => void;
    isOpen?: boolean;
    setIsOpen?: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeView, setActiveView, isOpen, setIsOpen }) => {

  const navItems: { view: View; label: string; icon: React.ReactNode; allowedRoles?: UserRole[] }[] = [
    { view: 'painel', label: 'Painel Principal', icon: <HomeIcon className="h-6 w-6" /> },
    { view: 'financeiro', label: 'Financeiro', icon: <CurrencyDollarIcon className="h-6 w-6" />, allowedRoles: [UserRole.ADMIN, UserRole.SECRETARIA] },
    { view: 'solicitacoes', label: 'Solicitações', icon: <InboxIcon className="h-6 w-6" /> },
    { view: 'transferencias', label: 'Transferências', icon: <DocumentDuplicateIcon className="h-6 w-6" />, allowedRoles: [UserRole.ADMIN, UserRole.SECRETARIA] },
    { view: 'alunos', label: 'Alunos', icon: <UsersIcon className="h-6 w-6" /> },
    { view: 'turmas', label: 'Turmas', icon: <CollectionIcon className="h-6 w-6" />, allowedRoles: [UserRole.ADMIN, UserRole.SECRETARIA, UserRole.PROFESSOR] },
    { view: 'reuniao', label: 'Reuniões', icon: <ChatBubbleLeftRightIcon className="h-6 w-6" /> },
    { view: 'encarregados', label: 'Encarregados', icon: <UsersIcon className="h-6 w-6" />, allowedRoles: [UserRole.ADMIN, UserRole.SECRETARIA, UserRole.PROFESSOR] },
    { view: 'professores', label: 'Professores', icon: <UsersIcon className="h-6 w-6" />, allowedRoles: [UserRole.ADMIN, UserRole.SECRETARIA] },
    { view: 'classes', label: 'Classes', icon: <BookOpenIcon className="h-6 w-6" /> },
    { view: 'relatorios', label: 'Relatórios', icon: <ChartBarIcon className="h-6 w-6" /> },
    { view: 'gerenciar-usuarios', label: 'Gerenciar Usuários', icon: <CogIcon className="h-6 w-6" />, allowedRoles: [UserRole.ADMIN] },
    { view: 'configuracoes', label: 'Configurações', icon: <CogIcon className="h-6 w-6" /> },
  ];

  const handleNavClick = (view: View) => {
      setActiveView(view);
      if (setIsOpen) setIsOpen(false); // Fecha no mobile ao clicar
  };

  return (
    <>
      {/* Overlay para Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen && setIsOpen(false)}
        ></div>
      )}

      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-20 border-b px-6">
           <div className="flex items-center text-indigo-600">
              <GraduationCapIcon className="h-8 w-8" />
              <h1 className="text-xl font-bold ml-2 tracking-tight">SEI <span className="text-indigo-800">Smart</span></h1>
          </div>
          <button 
            className="md:hidden p-2 text-gray-500"
            onClick={() => setIsOpen && setIsOpen(false)}
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => (
                  (!item.allowedRoles || item.allowedRoles.includes(user.role)) && (
                      <NavLink 
                          key={item.view}
                          icon={item.icon} 
                          label={item.label}
                          active={activeView === item.view}
                          onClick={() => handleNavClick(item.view)}
                      />
                  )
              ))}
          </nav>
        </div>

        <div className="p-4 border-t bg-gray-50 text-[10px] text-gray-400 font-bold text-center">
            V 2.0.0 • SEI SMART
        </div>
      </div>
    </>
  );
};

export default Sidebar;