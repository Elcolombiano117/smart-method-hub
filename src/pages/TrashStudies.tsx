import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, RotateCcw, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TrashStudies() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: studies, isLoading } = useQuery({
    queryKey: ['trash-studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studies')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('studies')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-studies'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('studies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-studies'] });
    },
  });

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
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Papelera</h1>
            <p className="text-muted-foreground">Estudios eliminados (puedes restaurarlos o eliminarlos definitivamente)</p>
          </div>
        </div>

        {!studies || studies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trash2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay estudios en la papelera</h3>
              <p className="text-muted-foreground mb-4">Los estudios que borres aparecerán aquí</p>
              <Button onClick={() => navigate('/mis-estudios')}>
                <FileText className="mr-2 h-4 w-4" /> Ir a Mis Estudios
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studies.map((study: any) => (
              <Card key={study.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{study.process_name}</CardTitle>
                    <Badge variant="outline">Eliminado</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {study.description || 'Sin descripción'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eliminado:</span>
                      <span className="font-semibold">{study.deleted_at ? format(new Date(study.deleted_at), 'dd MMM yyyy', { locale: es }) : '-'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => restoreMutation.mutate(study.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => permanentDeleteMutation.mutate(study.id)}>
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
