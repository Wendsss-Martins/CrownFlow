// Dashboard Page for Owners
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Plus,
  Crown,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { businessApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Sidebar from '../components/layout/Sidebar';
import MobileNav from '../components/layout/MobileNav';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Toaster, toast } from 'sonner';

const Dashboard = () => {
  const { user, business, updateBusiness, logout } = useAuth();
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessSlug, setBusinessSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show create business modal if owner doesn't have a business
  useEffect(() => {
    if (user?.role === 'owner' && !business) {
      setShowCreateBusiness(true);
    }
  }, [user, business]);

  // Auto-generate slug from name
  useEffect(() => {
    const slug = businessName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setBusinessSlug(slug);
  }, [businessName]);

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    
    if (!businessName.trim() || !businessSlug.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsCreating(true);
    try {
      const newBusiness = await businessApi.create({
        name: businessName,
        slug: businessSlug,
      });
      updateBusiness(newBusiness);
      setShowCreateBusiness(false);
      toast.success('Barbearia criada com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar barbearia');
    } finally {
      setIsCreating(false);
    }
  };

  const stats = [
    { icon: Calendar, label: 'Agendamentos Hoje', value: '0', change: '-' },
    { icon: Users, label: 'Clientes Ativos', value: '0', change: '-' },
    { icon: DollarSign, label: 'Receita do Mês', value: 'R$ 0', change: '-' },
    { icon: TrendingUp, label: 'Taxa de Retorno', value: '0%', change: '-' },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      <Toaster 
        theme="dark" 
        position="top-right"
        toastOptions={{
          style: {
            background: '#121212',
            border: '1px solid #27272a',
            color: '#fff',
          },
        }}
      />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Crown className="w-7 h-7 text-primary" />
              <span className="text-lg font-bold">
                <span className="gold-text">Crown</span>Flow
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 top-[60px] bg-background z-40 p-4 animate-fade-in">
              <div className="flex items-center gap-3 mb-6 p-4 bg-card border border-border">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="w-12 h-12 rounded-full border border-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold uppercase">
                    {user?.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              {business && (
                <div className="p-4 bg-card border border-border mb-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Sua Barbearia</p>
                  <p className="text-lg font-bold">{business.name}</p>
                </div>
              )}

              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full p-4 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair da conta</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 pt-[60px] lg:pt-0 pb-20 lg:pb-8">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
            {/* Welcome Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                Olá, <span className="gold-text">{user?.name?.split(' ')[0]}</span>
              </h1>
              <p className="text-muted-foreground">
                {business 
                  ? `Bem-vindo ao painel de controle da ${business.name}`
                  : 'Configure sua barbearia para começar'}
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={index}
                    className="bg-card border border-border p-4 md:p-6 hover:border-primary/50 transition-colors"
                    data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Icon className="w-6 h-6 text-primary mb-4" />
                    <p className="text-2xl md:text-3xl font-bold mono">{stat.value}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-xl font-bold mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button 
                  className="card-crown flex items-center gap-4 text-left opacity-50 cursor-not-allowed"
                  disabled
                >
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">Novo Agendamento</p>
                    <p className="text-sm text-muted-foreground">Em breve</p>
                  </div>
                </button>
                
                <button 
                  className="card-crown flex items-center gap-4 text-left opacity-50 cursor-not-allowed"
                  disabled
                >
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">Adicionar Cliente</p>
                    <p className="text-sm text-muted-foreground">Em breve</p>
                  </div>
                </button>

                {!business && (
                  <button 
                    onClick={() => setShowCreateBusiness(true)}
                    className="card-crown flex items-center gap-4 text-left hover:border-primary transition-colors"
                    data-testid="create-business-btn"
                  >
                    <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold">Criar Barbearia</p>
                      <p className="text-sm text-muted-foreground">Configure seu negócio</p>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Empty State for Appointments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-border p-8 md:p-12"
            >
              <div className="empty-state">
                <Calendar className="empty-state-icon" />
                <h3 className="empty-state-title">Nenhum agendamento</h3>
                <p className="empty-state-description">
                  {business 
                    ? 'Quando clientes agendarem, você verá os compromissos aqui.'
                    : 'Crie sua barbearia para começar a receber agendamentos.'}
                </p>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <MobileNav />
      </div>

      {/* Create Business Dialog */}
      <Dialog open={showCreateBusiness} onOpenChange={setShowCreateBusiness}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              Criar Barbearia
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure sua barbearia para começar a receber agendamentos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBusiness} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="label-uppercase">
                Nome da Barbearia
              </Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: Barbearia Crown"
                className="input-underline"
                data-testid="business-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessSlug" className="label-uppercase">
                Link Personalizado
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">crownflow.com/</span>
                <Input
                  id="businessSlug"
                  value={businessSlug}
                  onChange={(e) => setBusinessSlug(e.target.value)}
                  placeholder="barbearia-crown"
                  className="input-underline flex-1"
                  data-testid="business-slug-input"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Este será o link que seus clientes usarão para agendar.
              </p>
            </div>

            <Button 
              type="submit" 
              className="btn-primary w-full"
              disabled={isCreating}
              data-testid="create-business-submit"
            >
              {isCreating ? 'Criando...' : 'Criar Barbearia'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
