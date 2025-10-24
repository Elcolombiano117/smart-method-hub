import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, BarChart3, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: studies } = useQuery({
    queryKey: ['studies-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studies')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return data;
    },
  });

  const stats = [
    {
      title: "Estudios Totales",
      value: studies?.length || 0,
      icon: FileText,
      color: "text-primary",
    },
    {
      title: "En Progreso",
      value: studies?.filter((s: any) => s.status === 'in_progress').length || 0,
      icon: Clock,
      color: "text-accent",
    },
    {
      title: "Completados",
      value: studies?.filter((s: any) => s.status === 'completed').length || 0,
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Panel de Control</h1>
          <p className="text-muted-foreground">Bienvenido a SmartMethods</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comenzar Nuevo Estudio</CardTitle>
            <CardDescription>
              Crea un nuevo estudio de tiempos y métodos para analizar tus procesos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/nuevo-estudio')} size="lg">
              <Clock className="mr-2 h-5 w-5" />
              Iniciar Estudio
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mis Estudios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Consulta y gestiona todos tus estudios anteriores
              </p>
              <Button variant="outline" onClick={() => navigate('/mis-estudios')}>
                Ver Estudios
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análisis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Visualiza estadísticas y tendencias de tus estudios
              </p>
              <Button variant="outline" onClick={() => navigate('/analisis')}>
                Ver Análisis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
