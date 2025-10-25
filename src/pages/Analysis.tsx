import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select } from "@/components/ui/select";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

type Study = {
  id: string;
  process_name: string;
  created_at: string | null;
  average_time: number | null; // seconds
  normal_time: number | null; // seconds
  standard_time: number | null; // seconds
  performance_rating: number | null; // 100 = 100%
  supplement_percentage: number | null;
  observed_times: any | null; // { cycles: { name: string, observations: number[] }[] } with ms values
};

export default function Analysis() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<"all" | "7" | "30" | "90">("all");
  const printRef = useRef<HTMLDivElement | null>(null);

  const { data: studies, isLoading } = useQuery({
    queryKey: ["analysis-studies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as Study[];
      const { data, error } = await supabase
        .from("studies")
        .select("id, process_name, created_at, average_time, normal_time, standard_time, performance_rating, supplement_percentage, observed_times")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return [] as Study[];
      return (data as unknown) as Study[];
    },
    enabled: !!user?.id,
  });

  const activeStudy: Study | null = useMemo(() => {
    if (!studies || studies.length === 0) return null;
    // Filtrar por rango
    const filtered = studies.filter((s) => {
      if (range === "all") return true;
      if (!s.created_at) return false;
      const days = parseInt(range, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return new Date(s.created_at) >= cutoff;
    });
    if (filtered.length === 0) return null;
    if (selectedId) return filtered.find((s) => s.id === selectedId) || filtered[0];
    return filtered[0];
  }, [studies, selectedId, range]);

  // Asegurar que el seleccionado exista tras cambiar el filtro
  useEffect(() => {
    if (!studies || studies.length === 0) return;
    const filtered = studies.filter((s) => {
      if (range === "all") return true;
      if (!s.created_at) return false;
      const days = parseInt(range, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return new Date(s.created_at) >= cutoff;
    });
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((s) => s.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [range, studies]);

  const observedTimesSec = useMemo(() => {
    if (!activeStudy?.observed_times || !("cycles" in activeStudy.observed_times)) return [] as number[];
    const cycles = (activeStudy.observed_times as any).cycles as { name: string; observations: number[] }[];
    return cycles.flatMap((c) => c.observations).map((ms) => ms / 1000);
  }, [activeStudy]);

  const average = useMemo(() => {
    if (typeof activeStudy?.average_time === "number") return activeStudy.average_time;
    if (observedTimesSec.length === 0) return 0;
    return observedTimesSec.reduce((a, b) => a + b, 0) / observedTimesSec.length;
  }, [activeStudy, observedTimesSec]);

  const performance = useMemo(() => {
    // Ej: 108 => 108%
    if (typeof activeStudy?.performance_rating === "number") return activeStudy.performance_rating;
    return 100; // por defecto
  }, [activeStudy]);

  const supplement = useMemo(() => {
    if (typeof activeStudy?.supplement_percentage === "number") return activeStudy.supplement_percentage;
    return 15;
  }, [activeStudy]);

  const normal = useMemo(() => {
    if (typeof activeStudy?.normal_time === "number") return activeStudy.normal_time;
    return average * (performance / 100);
  }, [activeStudy, average, performance]);

  const standard = useMemo(() => {
    if (typeof activeStudy?.standard_time === "number") return activeStudy.standard_time;
    return normal * (1 + supplement / 100);
  }, [activeStudy, normal, supplement]);

  const efficiencyPct = useMemo(() => {
    // Definimos eficiencia como la calificación de desempeño (rating)
    return performance; // 108 => 108%
  }, [performance]);

  const variability = useMemo(() => {
    if (observedTimesSec.length < 2) return 0;
    const mean = average;
    const variance = observedTimesSec.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / (observedTimesSec.length - 1);
    const std = Math.sqrt(variance);
    const cv = mean > 0 ? (std / mean) * 100 : 0; // coeficiente de variación %
    return cv;
  }, [observedTimesSec, average]);

  const conclusion = useMemo(() => {
    const eff = efficiencyPct;
    let rendimiento = "dentro del estándar";
    if (eff > 105) rendimiento = "superior al estándar";
    else if (eff < 95) rendimiento = "por debajo del estándar";

    const variabMsg = variability > 12
      ? "alta variabilidad entre ciclos"
      : variability > 6
        ? "cierta variabilidad que conviene revisar"
        : "variabilidad controlada";

    return `El operario mantiene un rendimiento ${rendimiento} con una eficiencia del ${eff.toFixed(0)}%, se observa ${variabMsg}. Se recomienda ${variability > 6 ? "revisar el método e identificar causas de dispersión" : "mantener el método actual y continuar monitoreando"}.`;
  }, [efficiencyPct, variability]);

  const chartData = useMemo(() => {
    return observedTimesSec.map((v, i) => ({ obs: i + 1, tiempo: Number(v.toFixed(2)) }));
  }, [observedTimesSec]);

  const chartConfig = {
    tiempo: {
      label: "Tiempo observado (s)",
      color: "hsl(var(--primary))",
    },
  } as const;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2">Análisis</h1>
            <p className="text-muted-foreground">Visualiza estadísticas y tendencias de tus estudios</p>
          </div>
          {studies && studies.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-64">
                <Select value={activeStudy?.id ?? undefined} onValueChange={(v) => setSelectedId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estudio" />
                  </SelectTrigger>
                  <SelectContent>
                    {studies
                      .filter((s) => {
                        if (range === "all") return true;
                        if (!s.created_at) return false;
                        const days = parseInt(range, 10);
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - days);
                        return new Date(s.created_at) >= cutoff;
                      })
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.process_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={range} onValueChange={(v) => setRange(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="7">Últimos 7 días</SelectItem>
                    <SelectItem value="30">Últimos 30 días</SelectItem>
                    <SelectItem value="90">Últimos 90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                if (!printRef.current) return;
                const content = printRef.current;
                const printWindow = window.open("", "_blank", "width=1024,height=768");
                if (!printWindow) return;
                const doc = printWindow.document;
                doc.open();
                // Copiar estilos
                const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
                  .map((node) => (node as HTMLElement).outerHTML)
                  .join("\n");
                doc.write(`<!doctype html><html><head><meta charset='utf-8'/>${styles}<title>Análisis</title></head><body><div id='print-root'>${content.innerHTML}</div></body></html>`);
                doc.close();
                // Esperar a que carguen los estilos y SVG
                printWindow.focus();
                setTimeout(() => {
                  printWindow.print();
                  printWindow.close();
                }, 400);
              }}>
                <FileText className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Panel de Análisis
            </CardTitle>
            <CardDescription>
              {isLoading ? "Cargando…" : activeStudy ? `Estudio: ${activeStudy.process_name}` : "Crea un estudio para ver el análisis"}
            </CardDescription>
          </CardHeader>
          <CardContent ref={printRef}>
            {!activeStudy ? (
              <div className="text-center py-12 text-muted-foreground">No hay estudios para analizar.</div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Promedio (s)</p>
                    <p className="text-2xl font-bold">{average.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Tiempo normal (s)</p>
                    <p className="text-2xl font-bold">{normal.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Tiempo estándar (s)</p>
                    <p className="text-2xl font-bold text-primary">{standard.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Eficiencia (%)</p>
                    <p className="text-2xl font-bold">{efficiencyPct.toFixed(0)}%</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Tiempos observados</h3>
                  {chartData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sin observaciones registradas.</div>
                  ) : (
                    <ChartContainer config={chartConfig} className="w-full">
                      <BarChart data={chartData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="obs" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="tiempo" fill="var(--color-tiempo)" radius={4} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </div>

                <div className="rounded-lg border p-4 bg-muted/40">
                  <p className="text-sm leading-relaxed">
                    {conclusion}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
