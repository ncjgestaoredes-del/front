
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, AppNotification } from '../types';
import { LogoutIcon, BellIcon, EditIcon } from './icons/IconComponents';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onUpdateProfile?: (data: Partial<User>) => void;
  title: string;
  notifications?: AppNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onUpdateProfile, title, notifications = [], onMarkNotificationAsRead, onToggleSidebar }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const myNotifications = useMemo(() => {
      return notifications.filter(n => n.userId === user.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, user.id]);

  const unreadCount = useMemo(() => myNotifications.filter(n => !n.read).length, [myNotifications]);

  const handleNotificationClick = (notification: AppNotification) => {
      if (onMarkNotificationAsRead && !notification.read) {
          onMarkNotificationAsRead(notification.id);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateProfile) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            onUpdateProfile({ avatarUrl: base64String });
            setDropdownOpen(false);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b z-20 shadow-sm">
      <div className="flex items-center">
        {/* Menu Hamburguer Mobile */}
        <button 
          onClick={onToggleSidebar}
          className="p-2 mr-3 text-gray-600 md:hidden rounded-lg hover:bg-gray-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-lg md:text-2xl font-bold text-gray-800 truncate max-w-[150px] sm:max-w-none">{title}</h2>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
            <button 
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 relative focus:outline-none"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-30">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-700">Notificações</h3>
                        {unreadCount > 0 && <span className="text-xs text-indigo-600 font-semibold">{unreadCount} novas</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {myNotifications.length > 0 ? (
                            <ul>
                                {myNotifications.map(notification => (
                                    <li 
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex items-start">
                                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 mr-3 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                                            <div>
                                                <p className={`text-sm ${!notification.read ? 'font-bold text-gray-800' : 'font-medium text-gray-600'}`}>{notification.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-6 text-center text-gray-500 text-sm">
                                Nenhuma notificação.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 focus:outline-none p-1 rounded-lg hover:bg-gray-50">
            <img className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover border border-indigo-100 shadow-sm" src={user.avatarUrl} alt={user.name} />
            <div className="text-left hidden lg:block">
              <div className="font-bold text-sm text-gray-700 leading-tight">{user.name}</div>
              <div className="text-[10px] text-gray-400 uppercase font-black">{user.role}</div>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 py-2 w-56 bg-white rounded-lg shadow-2xl z-20 border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-3">
                 <img className="h-10 w-10 rounded-full object-cover" src={user.avatarUrl} alt="" />
                 <div>
                    <p className="text-sm font-bold text-gray-800">{user.name}</p>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase">{user.role}</p>
                 </div>
              </div>
              
              <div className="py-1">
                {onUpdateProfile && (
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors font-medium"
                        >
                            <EditIcon className="w-4 h-4 mr-3 text-indigo-500" />
                            Alterar Foto de Perfil
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </>
                )}
                
                <button
                    onClick={onLogout}
                    className="w-full text-left flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold"
                >
                    <LogoutIcon className="w-5 h-5 mr-3" />
                    Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
