import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, BarChart3, FileText, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroBanner from "@/assets/hero-banner.jpg";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Clock,
      title: "Cronómetro Integrado",
      description: "Mide tiempos con precisión y registra automáticamente tus ciclos de trabajo"
    },
    {
      icon: BarChart3,
      title: "Análisis Automático",
      description: "Calcula tiempos estándar, normales y promedios con un solo clic"
    },
    {
      icon: FileText,
      title: "Informes Profesionales",
      description: "Genera reportes PDF completos con gráficos y conclusiones"
    },
    {
      icon: Zap,
      title: "Optimización Continua",
      description: "Identifica oportunidades de mejora en tus procesos industriales"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-[500px] sm:h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBanner})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/70"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4 sm:space-y-6 animate-fade-in py-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl sm:text-3xl">SM</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight px-2">
            Bienvenido a <span className="text-primary">SmartMethods</span> ⚙️
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Tu asistente digital para realizar estudios de métodos y tiempos de forma rápida, precisa y profesional.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center pt-4 px-4">
            <Button 
              size="lg" 
              className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto w-full sm:w-auto"
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
            >
              {user ? 'Ir al Dashboard' : 'Comenzar Ahora'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {!user && (
              <Button 
                size="lg" 
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto w-full sm:w-auto"
                onClick={() => navigate('/auth')}
              >
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 animate-slide-up">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-2">
              Herramientas Potentes para Ingenieros
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg px-4">
              Todo lo que necesitas para optimizar tus procesos industriales
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm sm:text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold px-2">
            Haz más eficiente tu trabajo, con datos inteligentes
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
            🔹 Analiza tus procesos paso a paso<br/>
            🔹 Calcula tiempos estándar automáticamente<br/>
            🔹 Guarda tus resultados y genera informes PDF
          </p>
          <Button 
            size="lg" 
            className="text-base sm:text-lg px-8 sm:px-12 h-12 sm:h-auto w-full sm:w-auto max-w-sm"
            onClick={() => navigate(user ? '/nuevo-estudio' : '/auth')}
          >
            {user ? 'Comenzar Estudio' : 'Registrarse Gratis'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
