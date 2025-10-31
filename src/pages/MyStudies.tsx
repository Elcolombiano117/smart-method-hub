import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Eye, Clock, Pencil, Download, Package, FileSpreadsheet } from "lucide-react";
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

  const handleQuickDownloadPDF = async (study: any) => {
    toast.loading("Generando PDF...", { id: `pdf-${study.id}` });
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      
      let yPos = 20;
      const lineHeight = 7;
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Título
      pdf.setFontSize(18);
      pdf.text(study.process_name || 'Estudio', margin, yPos);
      yPos += lineHeight * 1.5;
      
      // Descripción
      if (study.description) {
        pdf.setFontSize(11);
        pdf.text(study.description, margin, yPos);
        yPos += lineHeight;
      }
      yPos += lineHeight;
      
      // Información general
      pdf.setFontSize(14);
      pdf.text('Información General', margin, yPos);
      yPos += lineHeight;
      
      pdf.setFontSize(10);
      pdf.text(`Fecha: ${format(new Date(study.created_at), 'dd MMMM yyyy', { locale: es })}`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Ciclos: ${study.cycles_count}`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Calificación: ${study.performance_rating}%`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Suplemento: ${study.supplement_percentage}%`, margin, yPos);
      yPos += lineHeight * 2;
      
      // Tiempos
      pdf.setFontSize(14);
      pdf.text('Tiempos Calculados', margin, yPos);
      yPos += lineHeight;
      
      pdf.setFontSize(10);
      pdf.text(`Tiempo Promedio: ${study.average_time?.toFixed(2) || 0} s`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Tiempo Normal: ${study.normal_time?.toFixed(2) || 0} s`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Tiempo Estándar: ${study.standard_time?.toFixed(2) || 0} s`, margin, yPos);
      yPos += lineHeight * 2;
      
      // Observaciones por ciclo (si existen)
      const observedData = typeof study.observed_times === 'object' && study.observed_times !== null 
        ? study.observed_times as { cycles?: any[] } 
        : {};
      const cycles = observedData.cycles || [];
      
      if (cycles.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Detalle por Ciclos', margin, yPos);
        yPos += lineHeight;
        
        cycles.forEach((cycle: any, idx: number) => {
          const observations = cycle.observations || [];
          const average = observations.length > 0 
            ? observations.reduce((a: number, b: number) => a + b, 0) / observations.length / 1000 
            : 0;
          
          pdf.setFontSize(11);
          pdf.text(`${cycle.name || `Ciclo ${idx + 1}`}`, margin, yPos);
          yPos += lineHeight * 0.8;
          
          pdf.setFontSize(9);
          pdf.text(`Observaciones: ${observations.length} | Promedio: ${average.toFixed(2)} s`, margin + 5, yPos);
          yPos += lineHeight;
          
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
        });
      }
      
      const safeName = study.process_name.replace(/[^a-z0-9-_]+/gi, '_');
      pdf.save(`${safeName}_estudio.pdf`);
      toast.success("PDF generado", { id: `pdf-${study.id}` });
    } catch (e: any) {
      console.error("Error al generar PDF:", e);
      toast.error(`Error: ${e?.message || 'Desconocido'}`, { id: `pdf-${study.id}` });
    }
  };

  const handleDownloadAllPDFs = async () => {
    if (!studies || studies.length === 0) {
      toast.error("No hay estudios para descargar");
      return;
    }

    toast.loading(`Generando ${studies.length} PDFs...`, { id: "bulk-pdf" });
    
    try {
      const JSZip = (await import('jszip')).default;
      const { jsPDF } = await import('jspdf');
      const zip = new JSZip();

      for (const study of studies) {
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        
        let yPos = 20;
        const lineHeight = 7;
        const margin = 20;
        
        // Generar contenido del PDF (mismo que handleQuickDownloadPDF)
        pdf.setFontSize(18);
        pdf.text(study.process_name || 'Estudio', margin, yPos);
        yPos += lineHeight * 1.5;
        
        if (study.description) {
          pdf.setFontSize(11);
          pdf.text(study.description, margin, yPos);
          yPos += lineHeight;
        }
        yPos += lineHeight;
        
        pdf.setFontSize(14);
        pdf.text('Información General', margin, yPos);
        yPos += lineHeight;
        
        pdf.setFontSize(10);
        pdf.text(`Fecha: ${format(new Date(study.created_at), 'dd MMMM yyyy', { locale: es })}`, margin, yPos);
        yPos += lineHeight;
        pdf.text(`Ciclos: ${study.cycles_count}`, margin, yPos);
        yPos += lineHeight;
        pdf.text(`Calificación: ${study.performance_rating}%`, margin, yPos);
        yPos += lineHeight;
        pdf.text(`Suplemento: ${study.supplement_percentage}%`, margin, yPos);
        yPos += lineHeight * 2;
        
        pdf.setFontSize(14);
        pdf.text('Tiempos Calculados', margin, yPos);
        yPos += lineHeight;
        
        pdf.setFontSize(10);
        pdf.text(`Tiempo Promedio: ${study.average_time?.toFixed(2) || 0} s`, margin, yPos);
        yPos += lineHeight;
        pdf.text(`Tiempo Normal: ${study.normal_time?.toFixed(2) || 0} s`, margin, yPos);
        yPos += lineHeight;
        pdf.text(`Tiempo Estándar: ${study.standard_time?.toFixed(2) || 0} s`, margin, yPos);
        yPos += lineHeight * 2;
        
        const observedData = typeof study.observed_times === 'object' && study.observed_times !== null 
          ? study.observed_times as { cycles?: any[] } 
          : {};
        const cycles = observedData.cycles || [];
        
        if (cycles.length > 0) {
          pdf.setFontSize(14);
          pdf.text('Detalle por Ciclos', margin, yPos);
          yPos += lineHeight;
          
          cycles.forEach((cycle: any, idx: number) => {
            const observations = cycle.observations || [];
            const average = observations.length > 0 
              ? observations.reduce((a: number, b: number) => a + b, 0) / observations.length / 1000 
              : 0;
            
            pdf.setFontSize(11);
            pdf.text(`${cycle.name || `Ciclo ${idx + 1}`}`, margin, yPos);
            yPos += lineHeight * 0.8;
            
            pdf.setFontSize(9);
            pdf.text(`Observaciones: ${observations.length} | Promedio: ${average.toFixed(2)} s`, margin + 5, yPos);
            yPos += lineHeight;
            
            if (yPos > 270) {
              pdf.addPage();
              yPos = 20;
            }
          });
        }
        
        const safeName = study.process_name.replace(/[^a-z0-9-_]+/gi, '_');
        const pdfBlob = pdf.output('blob');
        zip.file(`${safeName}_estudio.pdf`, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estudios_${format(new Date(), 'yyyy-MM-dd')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${studies.length} estudios descargados en ZIP`, { id: "bulk-pdf" });
    } catch (e: any) {
      console.error("Error al generar ZIP:", e);
      toast.error(`Error: ${e?.message || 'Desconocido'}`, { id: "bulk-pdf" });
    }
  };

  const handleExportCSV = () => {
    if (!studies || studies.length === 0) {
      toast.error("No hay estudios para exportar");
      return;
    }

    try {
      const headers = [
        'Nombre del Proceso',
        'Descripción',
        'Estado',
        'Fecha de Creación',
        'Ciclos',
        'Calificación (%)',
        'Suplemento (%)',
        'Tiempo Promedio (s)',
        'Tiempo Normal (s)',
        'Tiempo Estándar (s)'
      ];

      const rows = studies.map(s => [
        s.process_name || '',
        s.description || '',
        s.status === 'completed' ? 'Completado' : s.status === 'in_progress' ? 'En Progreso' : 'Borrador',
        format(new Date(s.created_at), 'dd/MM/yyyy', { locale: es }),
        s.cycles_count || 0,
        s.performance_rating || 0,
        s.supplement_percentage || 0,
        s.average_time?.toFixed(2) || '0',
        s.normal_time?.toFixed(2) || '0',
        s.standard_time?.toFixed(2) || '0'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const BOM = '\uFEFF'; // UTF-8 BOM para Excel
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estudios_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${studies.length} estudios exportados a CSV`);
    } catch (e: any) {
      console.error("Error al exportar CSV:", e);
      toast.error(`Error: ${e?.message || 'Desconocido'}`);
    }
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
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2">Mis Estudios</h1>
            <p className="text-muted-foreground">Gestiona tus estudios de tiempos y métodos</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {studies && studies.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownloadAllPDFs}>
                  <Package className="mr-2 h-4 w-4" />
                  Descargar Todos (ZIP)
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/nuevo-estudio')}>
              <FileText className="mr-2 h-5 w-5" />
              Nuevo Estudio
            </Button>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {studies.map((study) => (
              <Card key={study.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg break-words">{study.process_name}</CardTitle>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => handleQuickDownloadPDF(study)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      aria-label="Eliminar estudio"
                      className="w-full"
                      onClick={() => deleteMutation.mutate(study.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2">Eliminar</span>
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
