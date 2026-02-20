// Landing Page for CrownFlow
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  Smartphone, 
  Shield,
  ArrowRight,
  Crown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import Header from '../components/layout/Header';

const LandingPage = () => {
  const { login, isAuthenticated } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: 'Agendamento Online',
      description: 'Seus clientes agendam 24/7, sem precisar ligar. Menos trabalho para você.',
    },
    {
      icon: Users,
      title: 'Gestão de Clientes',
      description: 'Histórico completo de cada cliente. Preferências, serviços anteriores e mais.',
    },
    {
      icon: Clock,
      title: 'Horários Inteligentes',
      description: 'Configure seus horários de trabalho e o sistema gerencia automaticamente.',
    },
    {
      icon: TrendingUp,
      title: 'Relatórios Detalhados',
      description: 'Acompanhe o crescimento do seu negócio com dados claros e acionáveis.',
    },
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Funciona perfeitamente no celular. Para você e seus clientes.',
    },
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Seus dados protegidos com a melhor tecnologia de segurança.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="grain-overlay" />
      <Header />

      {/* Hero Section */}
      <section 
        className="hero-bg min-h-screen flex items-center pt-20"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/3037244/pexels-photo-3037244.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`
        }}
        data-testid="hero-section"
      >
        <div className="hero-content w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <Crown className="w-10 h-10 text-primary" />
              <span className="text-primary uppercase tracking-widest text-sm font-medium">
                CrownFlow
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-foreground">Sua barbearia,</span>
              <br />
              <span className="gold-text">no próximo nível.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
              Sistema de agendamento profissional para barbearias modernas. 
              Menos tempo no telefone, mais tempo fazendo o que você ama.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="btn-primary flex items-center gap-2 group"
                  data-testid="hero-dashboard-btn"
                >
                  Ir para Dashboard
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button 
                  onClick={login}
                  className="btn-primary flex items-center gap-2 group"
                  data-testid="hero-start-btn"
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
              <Button 
                variant="outline"
                className="btn-secondary"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                data-testid="hero-features-btn"
              >
                Ver Recursos
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-background" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Tudo que você <span className="gold-text">precisa</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ferramentas poderosas para gerenciar sua barbearia com eficiência e estilo.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-background p-8 md:p-12 group hover:bg-card transition-colors duration-300"
                >
                  <Icon className="w-10 h-10 text-primary mb-6 transition-transform group-hover:scale-110" />
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-32 bg-card" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img
                src="https://images.pexels.com/photos/7697711/pexels-photo-7697711.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Ferramentas de barbearia"
                className="w-full aspect-square object-cover"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Feito para <span className="gold-text">profissionais</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                CrownFlow foi desenvolvido por quem entende o dia a dia de uma barbearia. 
                Sabemos que seu tempo é valioso e que cada detalhe importa.
              </p>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Nossa plataforma é simples, poderosa e elegante — assim como o seu trabalho 
                deve ser. Sem complicações, sem distrações.
              </p>
              
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-4xl font-bold text-primary mono">500+</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">Barbearias</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mono">50k+</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">Agendamentos</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mono">99%</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">Satisfação</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-background" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Crown className="w-16 h-16 text-primary mx-auto mb-8" />
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Pronto para <span className="gold-text">começar?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
              Junte-se a centenas de barbearias que já estão usando CrownFlow 
              para transformar seu negócio.
            </p>
            
            {!isAuthenticated && (
              <Button 
                onClick={login}
                className="btn-primary flex items-center gap-2 group mx-auto"
                data-testid="cta-start-btn"
              >
                Criar Conta Grátis
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold">
                <span className="gold-text">Crown</span>
                <span className="text-foreground">Flow</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 CrownFlow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
