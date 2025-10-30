import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, BarChart3, TrendingUp, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: studies, isLoading } = useQuery({
    queryKey: ['studies-count', user?.id],
    queryFn: async () => {
      if (!user) return [] as any[];
      const { data, error } = await supabase
        .from('studies')
        .select('id, status, deleted_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const stats = [
    {
      title: "Estudios Totales",
      value: (studies?.filter((s: any) => s.deleted_at == null).length) || 0,
      icon: FileText,
      color: "text-primary",
    },
    {
      title: "En Progreso",
      value: studies?.filter((s: any) => s.status === 'in_progress' && s.deleted_at == null).length || 0,
      icon: Clock,
      color: "text-accent",
    },
    {
      title: "Completados",
      value: studies?.filter((s: any) => s.status === 'completed' && s.deleted_at == null).length || 0,
      icon: TrendingUp,
      color: "text-success",
    },
  ];
  const trashCount = studies?.filter((s: any) => s.deleted_at != null).length || 0;

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Panel de Control</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Bienvenido a SmartMethods</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Comenzar Nuevo Estudio</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Crea un nuevo estudio de tiempos y métodos para analizar tus procesos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/nuevo-estudio')} size="lg" className="w-full sm:w-auto h-12 sm:h-auto">
              <Clock className="mr-2 h-5 w-5" />
              Iniciar Estudio
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FileText className="h-5 w-5" />
                Mis Estudios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Consulta y gestiona todos tus estudios anteriores
              </p>
              <Button variant="outline" onClick={() => navigate('/mis-estudios')} className="w-full sm:w-auto h-11 sm:h-auto">
                Ver Estudios
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trash2 className="h-5 w-5" />
                Papelera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Estudios eliminados recientemente. Actualmente en papelera: {trashCount}
              </p>
              <Button variant="outline" onClick={() => navigate('/papelera')} className="w-full sm:w-auto h-11 sm:h-auto">
                Ver Papelera
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
