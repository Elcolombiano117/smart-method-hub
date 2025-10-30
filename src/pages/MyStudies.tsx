import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Eye, Clock, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

export default function MyStudies() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: studies, isLoading, isError, error } = useQuery({
    queryKey: ['studies', user?.id],
    retry: false,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as any[];
      try {
        const { data, error } = await supabase
          .from('studies')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error as any;
        return data as any[];
      } catch (e: any) {
        // Si la columna deleted_at no existe, reintentar sin filtro
        if (typeof e?.message === 'string' && e.message.toLowerCase().includes('deleted_at')) {
          const { data, error } = await supabase
            .from('studies')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (error) throw error as any;
          return data as any[];
        }
        throw e;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Intento 1: Borrado lógico (papelera)
      try {
        const { error } = await supabase
          .from('studies')
          .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user?.id || '');
        if (error) throw error as any;
        return { mode: 'soft' as const };
      } catch (e: any) {
        // Si la columna no existe o falla por esquema, hacemos hard delete como fallback
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('deleted_at') || msg.includes('column') || msg.includes('no existe')) {
          const { error: delErr } = await supabase
            .from('studies')
            .delete()
            .eq('id', id)
            .eq('user_id', user?.id || '');
          if (delErr) throw delErr as any;
          return { mode: 'hard' as const };
        }
        throw e;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['trash-studies'] });
      toast.success(result.mode === 'soft' ? 'Estudio movido a la papelera' : 'Estudio eliminado definitivamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar');
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

  if (isError) {
    return (
      <Layout>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error al cargar estudios</CardTitle>
              <CardDescription>Intenta de nuevo más tarde.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive/80 mb-3">{(error as any)?.message || 'Error desconocido'}</p>
              <div className="text-sm text-muted-foreground">
                Si ves un error relacionado con "deleted_at", aplica la migración y recarga:
                <ul className="list-disc ml-5 mt-2">
                  <li>Aplica el archivo de migración: <code>supabase/migrations/20251029000100_add_deleted_at_to_studies.sql</code></li>
                  <li>Luego recarga esta página</li>
                </ul>
              </div>
            </CardContent>
          </Card>
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

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/estudio/${study.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/estudio/${study.id}/editar`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      aria-label="Eliminar estudio"
                      className="w-full col-span-2 md:col-span-1"
                      onClick={() => deleteMutation.mutate(study.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2 hidden md:inline">Eliminar</span>
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
