// Header Component for CrownFlow
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Crown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, login, logout, user } = useAuth();
  const location = useLocation();

  const isLandingPage = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <Crown className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold tracking-tight">
              <span className="gold-text">Crown</span>
              <span className="text-foreground">Flow</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {isLandingPage && (
              <>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors uppercase text-sm tracking-wider">
                  Recursos
                </a>
                <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors uppercase text-sm tracking-wider">
                  Sobre
                </a>
              </>
            )}
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button variant="ghost" className="uppercase tracking-wider text-sm" data-testid="dashboard-link">
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full border border-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold uppercase">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    className="uppercase tracking-wider text-sm rounded-none border-border hover:border-primary hover:text-primary"
                    data-testid="logout-btn"
                  >
                    Sair
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={login}
                className="btn-primary"
                data-testid="login-btn"
              >
                Entrar
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground"
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              {isLandingPage && (
                <>
                  <a 
                    href="#features" 
                    className="text-muted-foreground hover:text-foreground transition-colors uppercase text-sm tracking-wider py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Recursos
                  </a>
                  <a 
                    href="#about" 
                    className="text-muted-foreground hover:text-foreground transition-colors uppercase text-sm tracking-wider py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sobre
                  </a>
                </>
              )}
              
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="text-muted-foreground hover:text-foreground transition-colors uppercase text-sm tracking-wider py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="text-left text-muted-foreground hover:text-foreground transition-colors uppercase text-sm tracking-wider py-2"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Button 
                  onClick={() => { login(); setMobileMenuOpen(false); }}
                  className="btn-primary w-full"
                >
                  Entrar
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
