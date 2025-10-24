import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, FileText, Sparkles } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <img 
            src={heroBanner} 
            alt="SmartMethods Industrial Engineering" 
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-transparent flex items-center">
            <div className="max-w-2xl p-12 space-y-6 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-white">Tu asistente digital</span>
              </div>
              <h1 className="text-5xl font-bold text-white leading-tight">
                Bienvenido a <span className="text-accent">SmartMethods</span>
              </h1>
              <p className="text-xl text-white/90 leading-relaxed">
                Tu asistente digital para realizar estudios de métodos y tiempos de forma 
                rápida, precisa y profesional.
              </p>
              <div className="flex gap-4 pt-4">
                <Button size="lg" className="bg-accent hover:bg-accent-hover shadow-lg">
                  Comenzar Nuevo Estudio
                </Button>
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm">
                  Ver Mis Estudios
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-primary">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Análisis de Procesos</CardTitle>
              <CardDescription>
                Analiza tus procesos paso a paso con herramientas intuitivas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-accent">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Cálculo Automático</CardTitle>
              <CardDescription>
                Calcula tiempos estándar automáticamente con precisión
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-primary">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Informes PDF</CardTitle>
              <CardDescription>
                Genera informes profesionales listos para compartir
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-accent">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Datos Inteligentes</CardTitle>
              <CardDescription>
                Guarda tus resultados y accede a ellos cuando quieras
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-br from-primary to-primary-hover text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>
          <CardContent className="pt-12 pb-12 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl font-bold">
                Haz más eficiente tu trabajo, con datos inteligentes
              </h2>
              <p className="text-xl text-white/90">
                Comienza tu primer estudio de métodos y tiempos ahora y descubre 
                cómo SmartMethods puede transformar tu análisis industrial.
              </p>
              <Button size="lg" className="bg-accent hover:bg-accent-hover shadow-xl mt-4">
                Crear Mi Primer Estudio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
