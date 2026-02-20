// Sidebar Component for Dashboard
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  Crown,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = () => {
  const location = useLocation();
  const { user, business, logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Agendamentos', path: '/dashboard/appointments', disabled: true },
    { icon: Users, label: 'Clientes', path: '/dashboard/clients', disabled: true },
    { icon: Scissors, label: 'Serviços', path: '/dashboard/services', disabled: true },
    { icon: Settings, label: 'Configurações', path: '/dashboard/settings', disabled: true },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 min-h-screen bg-card border-r border-border" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2 group">
          <Crown className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
          <span className="text-xl font-bold tracking-tight">
            <span className="gold-text">Crown</span>
            <span className="text-foreground">Flow</span>
          </span>
        </Link>
      </div>

      {/* Business Info */}
      {business && (
        <div className="p-6 border-b border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Sua Barbearia</p>
          <p className="text-lg font-bold text-foreground truncate">{business.name}</p>
          <p className="text-sm text-muted-foreground mono">/{business.slug}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <li key={item.path}>
                {item.disabled ? (
                  <div className="sidebar-link opacity-50 cursor-not-allowed">
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                    <span className="ml-auto text-xs bg-secondary px-2 py-0.5">Em breve</span>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    data-testid={`sidebar-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-6 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name} 
              className="w-10 h-10 rounded-full border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold uppercase">
              {user?.name?.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full text-muted-foreground hover:text-destructive transition-colors text-sm"
          data-testid="sidebar-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
