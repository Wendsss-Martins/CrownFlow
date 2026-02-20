// Dashboard Page for Owners - Complete with Scheduling
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
  LogOut,
  Scissors,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  XCircle,
  User,
  Copy,
  ExternalLink
} from 'lucide-react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { businessApi, servicesApi, barbersApi, appointmentsApi } from '../services/api';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Toaster, toast } from 'sonner';

const Dashboard = () => {
  const { user, business, updateBusiness, logout } = useAuth();
  
  // States
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessSlug, setBusinessSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data states
  const [stats, setStats] = useState({ today_appointments: 0, month_appointments: 0, month_revenue: 0, unique_clients: 0 });
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [dateRange, setDateRange] = useState(Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i)));
  
  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingBarber, setEditingBarber] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, name: '' });
  
  // Form states
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', duration_minutes: 30 });
  const [barberForm, setBarberForm] = useState({ name: '', specialty: '' });

  useEffect(() => {
    if (user?.role === 'owner' && !business) {
      setShowCreateBusiness(true);
    }
  }, [user, business]);

  useEffect(() => {
    if (business) {
      loadData();
    }
  }, [business]);

  useEffect(() => {
    if (business) {
      loadAppointments();
    }
  }, [business, selectedDate]);

  useEffect(() => {
    const slug = businessName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setBusinessSlug(slug);
  }, [businessName]);

  const loadData = async () => {
    try {
      const [statsData, servicesData, barbersData] = await Promise.all([
        appointmentsApi.getStats(),
        servicesApi.list(),
        barbersApi.list(),
      ]);
      setStats(statsData);
      setServices(servicesData);
      setBarbers(barbersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const data = await appointmentsApi.list({ date: format(selectedDate, 'yyyy-MM-dd') });
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (!businessName.trim() || !businessSlug.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    setIsCreating(true);
    try {
      const newBusiness = await businessApi.create({ name: businessName, slug: businessSlug });
      updateBusiness(newBusiness);
      setShowCreateBusiness(false);
      toast.success('Barbearia criada com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar barbearia');
    } finally {
      setIsCreating(false);
    }
  };

  // Service handlers
  const handleSaveService = async () => {
    if (!serviceForm.name || !serviceForm.price) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }
    try {
      if (editingService) {
        await servicesApi.update(editingService.id, {
          ...serviceForm,
          price: parseFloat(serviceForm.price),
        });
        toast.success('Serviço atualizado!');
      } else {
        await servicesApi.create({
          ...serviceForm,
          price: parseFloat(serviceForm.price),
        });
        toast.success('Serviço criado!');
      }
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({ name: '', description: '', price: '', duration_minutes: 30 });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar serviço');
    }
  };

  const handleDeleteService = async () => {
    try {
      await servicesApi.delete(deleteConfirm.id);
      toast.success('Serviço removido!');
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
      loadData();
    } catch (error) {
      toast.error('Erro ao remover serviço');
    }
  };

  // Barber handlers
  const handleSaveBarber = async () => {
    if (!barberForm.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    try {
      if (editingBarber) {
        await barbersApi.update(editingBarber.id, barberForm);
        toast.success('Barbeiro atualizado!');
      } else {
        await barbersApi.create(barberForm);
        toast.success('Barbeiro adicionado!');
      }
      setShowBarberModal(false);
      setEditingBarber(null);
      setBarberForm({ name: '', specialty: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar barbeiro');
    }
  };

  const handleDeleteBarber = async () => {
    try {
      await barbersApi.delete(deleteConfirm.id);
      toast.success('Barbeiro removido!');
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
      loadData();
    } catch (error) {
      toast.error('Erro ao remover barbeiro');
    }
  };

  // Appointment handlers
  const handleCancelAppointment = async (id) => {
    try {
      await appointmentsApi.cancel(id);
      toast.success('Agendamento cancelado!');
      loadAppointments();
      loadData();
    } catch (error) {
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const handleCompleteAppointment = async (id) => {
    try {
      await appointmentsApi.complete(id);
      toast.success('Agendamento concluído!');
      loadAppointments();
      loadData();
    } catch (error) {
      toast.error('Erro ao concluir agendamento');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const copyBookingLink = () => {
    const link = `${window.location.origin}/agendar/${business?.slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const shiftDates = (direction) => {
    const today = startOfToday();
    if (direction === 'next') {
      setDateRange(prev => prev.map(d => addDays(d, 7)));
    } else {
      const newStart = addDays(dateRange[0], -7);
      if (newStart >= today) {
        setDateRange(prev => prev.map(d => addDays(d, -7)));
      }
    }
  };

  const openEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration_minutes: service.duration_minutes,
    });
    setShowServiceModal(true);
  };

  const openEditBarber = (barber) => {
    setEditingBarber(barber);
    setBarberForm({
      name: barber.name,
      specialty: barber.specialty || '',
    });
    setShowBarberModal(true);
  };

  const statsDisplay = [
    { icon: Calendar, label: 'Agendamentos Hoje', value: stats.today_appointments.toString() },
    { icon: Users, label: 'Clientes do Mês', value: stats.unique_clients.toString() },
    { icon: DollarSign, label: 'Receita do Mês', value: formatPrice(stats.month_revenue) },
    { icon: TrendingUp, label: 'Total do Mês', value: stats.month_appointments.toString() },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      <Toaster 
        theme="dark" 
        position="top-right"
        toastOptions={{ style: { background: '#121212', border: '1px solid #27272a', color: '#fff' } }}
      />
      
      <div className="flex">
        <Sidebar />

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Crown className="w-7 h-7 text-primary" />
              <span className="text-lg font-bold"><span className="gold-text">Crown</span>Flow</span>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="fixed inset-0 top-[60px] bg-background z-40 p-4 animate-fade-in overflow-y-auto">
              <div className="flex items-center gap-3 mb-6 p-4 bg-card border border-border">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full border border-border" />
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
                <LogOut className="w-5 h-5" /><span>Sair da conta</span>
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                    Olá, <span className="gold-text">{user?.name?.split(' ')[0]}</span>
                  </h1>
                  <p className="text-muted-foreground">
                    {business ? `Bem-vindo ao painel de controle da ${business.name}` : 'Configure sua barbearia para começar'}
                  </p>
                </div>
                
                {business && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyBookingLink}
                      className="text-sm"
                      data-testid="copy-link-btn"
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copiar Link
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/agendar/${business.slug}`, '_blank')}
                      className="text-sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> Ver Página
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              {statsDisplay.map((stat, index) => {
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

            {/* Main Tabs */}
            {business && (
              <Tabs defaultValue="appointments" className="space-y-6">
                <TabsList className="bg-card border border-border p-1">
                  <TabsTrigger value="appointments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Calendar className="w-4 h-4 mr-2" /> Agendamentos
                  </TabsTrigger>
                  <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Scissors className="w-4 h-4 mr-2" /> Serviços
                  </TabsTrigger>
                  <TabsTrigger value="barbers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <User className="w-4 h-4 mr-2" /> Barbeiros
                  </TabsTrigger>
                </TabsList>

                {/* Appointments Tab */}
                <TabsContent value="appointments" className="space-y-6">
                  {/* Date Filter */}
                  <div className="bg-card border border-border p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => shiftDates('prev')}
                        disabled={isSameDay(dateRange[0], startOfToday())}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <span className="text-sm font-medium">
                        {format(dateRange[0], "MMMM yyyy", { locale: ptBR })}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => shiftDates('next')}>
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {dateRange.map((date) => (
                        <button
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          className={`p-2 md:p-3 border text-center transition-all ${
                            isSameDay(selectedDate, date) 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <p className="text-xs text-muted-foreground uppercase">
                            {format(date, 'EEE', { locale: ptBR })}
                          </p>
                          <p className={`text-lg font-bold ${isSameDay(selectedDate, date) ? 'text-primary' : ''}`}>
                            {format(date, 'd')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Appointments List */}
                  <div className="bg-card border border-border">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-bold">
                        Agendamentos - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                    </div>
                    
                    {appointments.length === 0 ? (
                      <div className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum agendamento para esta data.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {appointments.map((appointment) => (
                          <div 
                            key={appointment.id} 
                            className="p-4 hover:bg-secondary/20 transition-colors"
                            data-testid={`appointment-${appointment.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold mono text-primary">{appointment.appointment_time}</p>
                                  <p className="text-xs text-muted-foreground">{appointment.duration_minutes}min</p>
                                </div>
                                <div>
                                  <p className="font-bold">{appointment.client_name}</p>
                                  <p className="text-sm text-muted-foreground">{appointment.client_phone}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-secondary px-2 py-0.5">{appointment.service?.name}</span>
                                    <span className="text-xs text-muted-foreground">com {appointment.barber?.name}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className={`text-xs uppercase px-2 py-1 ${
                                  appointment.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                                  appointment.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                  'bg-red-500/10 text-red-500'
                                }`}>
                                  {appointment.status === 'confirmed' ? 'Confirmado' :
                                   appointment.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                </span>
                                
                                {appointment.status === 'confirmed' && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleCompleteAppointment(appointment.id)}
                                      title="Marcar como concluído"
                                    >
                                      <Check className="w-4 h-4 text-green-500" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleCancelAppointment(appointment.id)}
                                      title="Cancelar"
                                    >
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Services Tab */}
                <TabsContent value="services" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Serviços</h3>
                    <Button 
                      onClick={() => { setEditingService(null); setServiceForm({ name: '', description: '', price: '', duration_minutes: 30 }); setShowServiceModal(true); }}
                      className="btn-primary"
                      data-testid="add-service-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Novo Serviço
                    </Button>
                  </div>
                  
                  {services.length === 0 ? (
                    <div className="bg-card border border-border p-8 text-center">
                      <Scissors className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
                      <p className="text-sm text-muted-foreground mt-1">Adicione serviços para seus clientes agendarem.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {services.map((service) => (
                        <div 
                          key={service.id} 
                          className="bg-card border border-border p-6 hover:border-primary/50 transition-colors"
                          data-testid={`service-card-${service.id}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-lg">{service.name}</h4>
                            <span className="text-primary font-bold mono">{formatPrice(service.price)}</span>
                          </div>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {service.duration_minutes} min
                            </span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditService(service)}>
                                Editar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDeleteConfirm({ show: true, type: 'service', id: service.id, name: service.name })}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Barbers Tab */}
                <TabsContent value="barbers" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Barbeiros</h3>
                    <Button 
                      onClick={() => { setEditingBarber(null); setBarberForm({ name: '', specialty: '' }); setShowBarberModal(true); }}
                      className="btn-primary"
                      data-testid="add-barber-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Novo Barbeiro
                    </Button>
                  </div>
                  
                  {barbers.length === 0 ? (
                    <div className="bg-card border border-border p-8 text-center">
                      <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum barbeiro cadastrado.</p>
                      <p className="text-sm text-muted-foreground mt-1">Adicione barbeiros para gerenciar a agenda.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {barbers.map((barber) => (
                        <div 
                          key={barber.id} 
                          className="bg-card border border-border p-6 hover:border-primary/50 transition-colors"
                          data-testid={`barber-card-${barber.id}`}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                              {barber.photo ? (
                                <img src={barber.photo} alt={barber.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <User className="w-8 h-8 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">{barber.name}</h4>
                              {barber.specialty && (
                                <p className="text-sm text-muted-foreground">{barber.specialty}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditBarber(barber)}>
                              Editar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setDeleteConfirm({ show: true, type: 'barber', id: barber.id, name: barber.name })}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {/* Empty State - No Business */}
            {!business && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-card border border-border p-8 md:p-12"
              >
                <div className="text-center">
                  <Crown className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Configure sua barbearia</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Crie sua barbearia para começar a receber agendamentos online.
                  </p>
                  <Button 
                    onClick={() => setShowCreateBusiness(true)}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Criar Barbearia
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </main>

        <MobileNav />
      </div>

      {/* Create Business Dialog */}
      <Dialog open={showCreateBusiness} onOpenChange={setShowCreateBusiness}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" /> Criar Barbearia
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure sua barbearia para começar a receber agendamentos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBusiness} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="label-uppercase">Nome da Barbearia</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: Barbearia Crown"
                className="bg-transparent border-border"
                data-testid="business-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessSlug" className="label-uppercase">Link Personalizado</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">crownflow.com/</span>
                <Input
                  id="businessSlug"
                  value={businessSlug}
                  onChange={(e) => setBusinessSlug(e.target.value)}
                  placeholder="barbearia-crown"
                  className="bg-transparent border-border flex-1"
                  data-testid="business-slug-input"
                />
              </div>
            </div>
            <Button type="submit" className="btn-primary w-full" disabled={isCreating} data-testid="create-business-submit">
              {isCreating ? 'Criando...' : 'Criar Barbearia'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Service Modal */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="label-uppercase">Nome do Serviço</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="Ex: Corte Tradicional"
                className="bg-transparent border-border"
                data-testid="service-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="label-uppercase">Descrição (opcional)</Label>
              <Input
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="Ex: Corte com tesoura e máquina"
                className="bg-transparent border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="label-uppercase">Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  placeholder="45.00"
                  className="bg-transparent border-border"
                  data-testid="service-price-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="label-uppercase">Duração (min)</Label>
                <Input
                  type="number"
                  value={serviceForm.duration_minutes}
                  onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: parseInt(e.target.value) || 30 })}
                  placeholder="30"
                  className="bg-transparent border-border"
                  data-testid="service-duration-input"
                />
              </div>
            </div>
            <Button onClick={handleSaveService} className="btn-primary w-full" data-testid="save-service-btn">
              {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barber Modal */}
      <Dialog open={showBarberModal} onOpenChange={setShowBarberModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="label-uppercase">Nome</Label>
              <Input
                value={barberForm.name}
                onChange={(e) => setBarberForm({ ...barberForm, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="bg-transparent border-border"
                data-testid="barber-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="label-uppercase">Especialidade (opcional)</Label>
              <Input
                value={barberForm.specialty}
                onChange={(e) => setBarberForm({ ...barberForm, specialty: e.target.value })}
                placeholder="Ex: Cortes Modernos"
                className="bg-transparent border-border"
              />
            </div>
            <Button onClick={handleSaveBarber} className="btn-primary w-full" data-testid="save-barber-btn">
              {editingBarber ? 'Salvar Alterações' : 'Adicionar Barbeiro'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.show} onOpenChange={(open) => !open && setDeleteConfirm({ show: false, type: null, id: null, name: '' })}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteConfirm.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm.type === 'service' ? handleDeleteService() : handleDeleteBarber()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
