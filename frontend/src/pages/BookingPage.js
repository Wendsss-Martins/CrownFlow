// Public Booking Page - Client booking flow
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Scissors, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  Phone, 
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2
} from 'lucide-react';
import { format, addDays, isSameDay, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { publicApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Toaster, toast } from 'sonner';

const steps = [
  { id: 1, title: 'Serviço', icon: Scissors },
  { id: 2, title: 'Barbeiro', icon: User },
  { id: 3, title: 'Data', icon: CalendarIcon },
  { id: 4, title: 'Horário', icon: Clock },
  { id: 5, title: 'Confirmar', icon: Check },
];

const BookingPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  
  // Booking data
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Date picker state
  const today = startOfToday();
  const [dateRange, setDateRange] = useState(
    Array.from({ length: 7 }, (_, i) => addDays(today, i))
  );

  useEffect(() => {
    loadBusinessData();
  }, [slug]);

  useEffect(() => {
    if (selectedService && selectedBarber && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedService, selectedBarber, selectedDate]);

  const loadBusinessData = async () => {
    try {
      const [businessData, servicesData, barbersData] = await Promise.all([
        publicApi.getBusiness(slug),
        publicApi.getServices(slug),
        publicApi.getBarbers(slug),
      ]);
      setBusiness(businessData);
      setServices(servicesData);
      setBarbers(barbersData);
    } catch (error) {
      setBusiness(null);
      toast.error('Barbearia não encontrada');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await publicApi.getAvailableSlots(
        slug, 
        selectedBarber.id, 
        selectedService.id, 
        dateStr
      );
      setAvailableSlots(data.slots);
    } catch (error) {
      toast.error('Erro ao carregar horários');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBook = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error('Preencha seu nome e telefone');
      return;
    }

    setIsBooking(true);
    try {
      const bookingData = {
        service_id: selectedService.id,
        barber_id: selectedBarber.id,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        appointment_time: selectedTime,
        client_name: clientName,
        client_phone: clientPhone,
      };
      
      const result = await publicApi.book(slug, bookingData);
      setBookingResult(result);
      setBookingComplete(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao agendar');
    } finally {
      setIsBooking(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const shiftDates = (direction) => {
    if (direction === 'next') {
      setDateRange(prev => prev.map(d => addDays(d, 7)));
    } else {
      const newStart = addDays(dateRange[0], -7);
      if (newStart >= today) {
        setDateRange(prev => prev.map(d => addDays(d, -7)));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Crown className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-card border border-border p-8 text-center"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h1>
          <p className="text-muted-foreground mb-6">
            Seu horário foi reservado com sucesso.
          </p>
          
          <div className="bg-secondary/30 p-6 mb-6 text-left space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Serviço</p>
              <p className="font-medium">{selectedService?.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Barbeiro</p>
              <p className="font-medium">{selectedBarber?.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Data e Horário</p>
              <p className="font-medium">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
              </p>
            </div>
          </div>

          <Button 
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            Voltar ao Início
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="booking-page">
      <Toaster 
        theme="dark" 
        position="top-center"
        toastOptions={{
          style: { background: '#121212', border: '1px solid #27272a', color: '#fff' },
        }}
      />
      
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-bold text-lg">{business?.name}</h1>
              <p className="text-xs text-muted-foreground">Agendar horário</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive ? 'bg-primary text-primary-foreground' :
                        isCompleted ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 hidden sm:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-primary' : 'bg-secondary'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Service */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold mb-6">Escolha o serviço</h2>
              
              {services.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum serviço disponível no momento.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => { setSelectedService(service); handleNext(); }}
                      className={`w-full p-4 border text-left transition-all hover:border-primary ${
                        selectedService?.id === service.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                      }`}
                      data-testid={`service-${service.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">{service.duration_minutes} minutos</p>
                        </div>
                        <span className="text-primary font-bold mono">{formatPrice(service.price)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Select Barber */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold mb-6">Escolha o barbeiro</h2>
              
              {barbers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum barbeiro disponível no momento.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {barbers.map((barber) => (
                    <button
                      key={barber.id}
                      onClick={() => { setSelectedBarber(barber); handleNext(); }}
                      className={`p-6 border text-center transition-all hover:border-primary ${
                        selectedBarber?.id === barber.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                      }`}
                      data-testid={`barber-${barber.id}`}
                    >
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                        {barber.photo ? (
                          <img src={barber.photo} alt={barber.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-bold">{barber.name}</h3>
                      {barber.specialty && (
                        <p className="text-xs text-muted-foreground mt-1">{barber.specialty}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={handleBack} className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            </motion.div>
          )}

          {/* Step 3: Select Date */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold mb-6">Escolha a data</h2>
              
              <div className="flex items-center justify-between mb-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => shiftDates('prev')}
                  disabled={isSameDay(dateRange[0], today)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {format(dateRange[0], "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="outline" size="icon" onClick={() => shiftDates('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {dateRange.map((date) => {
                  const dayOfWeek = date.getDay();
                  const workingDays = business?.working_days?.split(',').map(Number) || [1,2,3,4,5,6];
                  const adjustedDay = dayOfWeek === 0 ? 0 : dayOfWeek;
                  const isWorkingDay = workingDays.includes(adjustedDay);
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => { if (isWorkingDay) { setSelectedDate(date); handleNext(); } }}
                      disabled={!isWorkingDay}
                      className={`p-3 border text-center transition-all ${
                        selectedDate && isSameDay(selectedDate, date) ? 'border-primary bg-primary/5' :
                        isWorkingDay ? 'border-border bg-card hover:border-primary' : 'border-border bg-secondary/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(date, 'EEE', { locale: ptBR })}
                      </p>
                      <p className="text-xl font-bold mt-1">{format(date, 'd')}</p>
                    </button>
                  );
                })}
              </div>

              <Button variant="outline" onClick={handleBack} className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            </motion.div>
          )}

          {/* Step 4: Select Time */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold mb-2">Escolha o horário</h2>
              <p className="text-muted-foreground mb-6">
                {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum horário disponível nesta data.
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => { if (slot.available) { setSelectedTime(slot.time); handleNext(); } }}
                      disabled={!slot.available}
                      className={`p-3 border text-center transition-all mono text-sm ${
                        selectedTime === slot.time ? 'border-primary bg-primary text-primary-foreground' :
                        slot.available ? 'border-border bg-card hover:border-primary' : 'border-border bg-secondary/50 opacity-50 cursor-not-allowed line-through'
                      }`}
                      data-testid={`slot-${slot.time}`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={handleBack} className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            </motion.div>
          )}

          {/* Step 5: Confirm */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold mb-6">Confirmar agendamento</h2>
              
              {/* Summary */}
              <div className="bg-card border border-border p-6 space-y-4">
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Resumo</h3>
                
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Barbeiro</span>
                  <span className="font-medium">{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">
                    {selectedDate && format(selectedDate, "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium mono">{selectedTime}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="text-xl font-bold text-primary mono">
                    {selectedService && formatPrice(selectedService.price)}
                  </span>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground">Seus dados</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="clientName" className="label-uppercase">Nome completo</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Digite seu nome"
                    className="bg-card border-border"
                    data-testid="client-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientPhone" className="label-uppercase">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="clientPhone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="bg-card border-border pl-10"
                      maxLength={15}
                      data-testid="client-phone-input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button 
                  onClick={handleBook}
                  disabled={isBooking || !clientName.trim() || !clientPhone.trim()}
                  className="btn-primary flex-1"
                  data-testid="confirm-booking-btn"
                >
                  {isBooking ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Agendando...</>
                  ) : (
                    'Confirmar Agendamento'
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default BookingPage;
