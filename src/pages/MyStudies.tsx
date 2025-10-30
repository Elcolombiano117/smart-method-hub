import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Eye, Clock, Pencil, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MyStudies() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: studies, isLoading } = useQuery({
    queryKey: ['studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studies')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('studies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Estudio movido a la papelera');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar');
    },
  });

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

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Mis Estudios</h1>
            <p className="text-muted-foreground">Gestiona tus estudios de tiempos y métodos</p>
          </div>
          <Button onClick={() => navigate('/nuevo-estudio')}>
            <FileText className="mr-2 h-5 w-5" />
            Nuevo Estudio
          </Button>
        </div>

        {!studies || studies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tienes estudios aún</h3>
              <p className="text-muted-foreground mb-4">Comienza creando tu primer estudio</p>
              <Button onClick={() => navigate('/nuevo-estudio')}>
                Crear Primer Estudio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studies.map((study) => (
              <Card key={study.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{study.process_name}</CardTitle>
                    {getStatusBadge(study.status)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {study.description || 'Sin descripción'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ciclos:</span>
                      <span className="font-semibold">{study.cycles_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">T. Estándar:</span>
                      <span className="font-semibold">{study.standard_time?.toFixed(2) || 0}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Creado:</span>
                      <span className="font-semibold">
                        {format(new Date(study.created_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/estudio/${study.id}`)}
                      >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/estudio/${study.id}/editar`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(study.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
