import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Calendar, TrendingUp, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function StudyDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: study, isLoading } = useQuery({
    queryKey: ['study', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studies')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      draft: { variant: "outline", label: "Borrador" },
      in_progress: { variant: "secondary", label: "En Progreso" },
      completed: { variant: "default", label: "Completado" },
    };
    
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!study) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Estudio no encontrado</h2>
          <Button onClick={() => navigate('/mis-estudios')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Mis Estudios
          </Button>
        </div>
      </Layout>
    );
  }

  // Extraer ciclos de observed_times si existen
  const observedData = typeof study.observed_times === 'object' && study.observed_times !== null 
    ? study.observed_times as { cycles?: any[] } 
    : {};
  const cycles = observedData.cycles || [];
  const hasMultipleCycles = cycles.length > 0;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/mis-estudios')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{study.process_name}</h1>
            <p className="text-muted-foreground">{study.description || 'Sin descripción'}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(study.status)}
            <Button variant="outline" size="sm" onClick={() => navigate(`/estudio/${study.id}/editar`)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
          </div>
        </div>

        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Fecha de Creación</p>
                <p className="text-lg font-semibold">
                  {format(new Date(study.created_at), 'dd MMMM yyyy', { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ciclos Totales</p>
                <p className="text-lg font-semibold">{study.cycles_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Calificación</p>
                <p className="text-lg font-semibold">{study.performance_rating}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Suplemento</p>
                <p className="text-lg font-semibold">{study.supplement_percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados del Análisis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resultados del Análisis
            </CardTitle>
            <CardDescription>Tiempos calculados del estudio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tiempo Promedio</p>
                <p className="text-2xl font-bold">{study.average_time?.toFixed(2) || 0}s</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tiempo Normal</p>
                <p className="text-2xl font-bold">{study.normal_time?.toFixed(2) || 0}s</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tiempo Estándar</p>
                <p className="text-2xl font-bold text-primary">{study.standard_time?.toFixed(2) || 0}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalle por Ciclos */}
        {hasMultipleCycles && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Detalle por Ciclos
              </CardTitle>
              <CardDescription>Observaciones y métricas de cada ciclo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {cycles.map((cycle: any, idx: number) => {
                  const observations = cycle.observations || [];
                  const average = observations.length > 0 
                    ? observations.reduce((a: number, b: number) => a + b, 0) / observations.length / 1000 
                    : 0;
                  const normal = average * (study.performance_rating / 100);
                  const standard = normal * (1 + study.supplement_percentage / 100);

                  return (
                    <div key={idx} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3">{cycle.name || `Ciclo ${idx + 1}`}</h4>
                      
                      {/* Métricas del ciclo */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Promedio</p>
                          <p className="text-lg font-semibold">{average.toFixed(2)}s</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Normal</p>
                          <p className="text-lg font-semibold">{normal.toFixed(2)}s</p>
                        </div>
                        <div className="text-center p-3 bg-primary/10 rounded">
                          <p className="text-xs text-muted-foreground mb-1">Estándar</p>
                          <p className="text-lg font-semibold text-primary">{standard.toFixed(2)}s</p>
                        </div>
                      </div>

                      {/* Tabla de observaciones */}
                      {observations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Observaciones ({observations.length})</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {observations.map((obs: number, i: number) => (
                              <div key={i} className="text-center p-2 bg-background border rounded text-sm">
                                <span className="text-xs text-muted-foreground block">#{i + 1}</span>
                                <span className="font-mono font-semibold">{formatTime(obs)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
