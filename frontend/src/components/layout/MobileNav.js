// Mobile Bottom Navigation for Dashboard
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Settings 
} from 'lucide-react';

const MobileNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: Calendar, label: 'Agenda', path: '/dashboard/appointments', disabled: true },
    { icon: Users, label: 'Clientes', path: '/dashboard/clients', disabled: true },
    { icon: Scissors, label: 'Serviços', path: '/dashboard/services', disabled: true },
    { icon: Settings, label: 'Config', path: '/dashboard/settings', disabled: true },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" data-testid="mobile-nav">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return item.disabled ? (
            <div
              key={item.path}
              className="flex flex-col items-center gap-1 py-2 px-4 opacity-50"
            >
              <Icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
