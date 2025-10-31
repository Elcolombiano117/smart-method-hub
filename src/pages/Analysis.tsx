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
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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
  const [showAvg, setShowAvg] = useState(true);
  const [showStd, setShowStd] = useState(true);
  const [showObs, setShowObs] = useState(true);

  // Persistir switches por usuario
  const prefsKey = user?.id ? `analysis_series_prefs_${user.id}` : null;
  useEffect(() => {
    if (!prefsKey) return;
    try {
      const raw = localStorage.getItem(prefsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.showAvg === 'boolean') setShowAvg(parsed.showAvg);
        if (typeof parsed.showStd === 'boolean') setShowStd(parsed.showStd);
        if (typeof parsed.showObs === 'boolean') setShowObs(parsed.showObs);
      }
    } catch {}
  }, [prefsKey]);

  useEffect(() => {
    if (!prefsKey) return;
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ showAvg, showStd, showObs }));
    } catch {}
  }, [prefsKey, showAvg, showStd, showObs]);

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

  // Datos por ciclo: promedio y estándar por ciclo en segundos
  const cyclesChartData = useMemo(() => {
    if (!activeStudy?.observed_times || !("cycles" in activeStudy.observed_times)) return [] as { ciclo: string; promedio: number; count: number }[];
    const cycles = (activeStudy.observed_times as any).cycles as { name: string; observations: number[] }[];
    const perf = performance; // %
    const supp = supplement; // %
    return cycles
      .map((c) => {
        const secs = (c.observations || []).map((ms) => ms / 1000);
        const avg = secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : 0;
        const normalC = avg * (perf / 100);
        const estandarC = normalC * (1 + supp / 100);
        return { ciclo: c.name || "Ciclo", promedio: Number(avg.toFixed(2)), estandar: Number(estandarC.toFixed(2)), count: secs.length } as const;
      })
      .filter((d) => d.count > 0) as any;
  }, [activeStudy]);

  const cyclesChartConfig = {
    promedio: {
      label: "Promedio por ciclo (s)",
      color: "hsl(var(--primary))",
    },
    estandar: {
      label: "Estándar por ciclo (s)",
      color: "hsl(var(--muted-foreground))",
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
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <h3 className="text-lg font-semibold">Tiempos observados</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Switch checked={showObs} onCheckedChange={setShowObs} id="toggle-obs" />
                        <label htmlFor="toggle-obs" className="cursor-pointer">Observados</label>
                      </div>
                    </div>
                  </div>
                  {chartData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sin observaciones registradas.</div>
                  ) : (
                    <ChartContainer config={chartConfig} className="w-full">
                      <BarChart data={chartData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="obs" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        {showObs && (
                          <Bar dataKey="tiempo" fill="var(--color-tiempo)" radius={4}>
                            <LabelList dataKey="tiempo" position="top" formatter={(v: number) => v.toFixed(2)} className="fill-foreground/80" />
                          </Bar>
                        )}
                        <ChartLegend content={<ChartLegendContent />} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <h3 className="text-lg font-semibold">Promedio y estándar por ciclo</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Switch checked={showAvg} onCheckedChange={setShowAvg} id="toggle-avg" />
                        <label htmlFor="toggle-avg" className="cursor-pointer">Promedio</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={showStd} onCheckedChange={setShowStd} id="toggle-std" />
                        <label htmlFor="toggle-std" className="cursor-pointer">Estándar</label>
                      </div>
                    </div>
                  </div>
                  {cyclesChartData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sin ciclos con observaciones.</div>
                  ) : (
                    <ChartContainer config={cyclesChartConfig} className="w-full">
                      <BarChart data={cyclesChartData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="ciclo" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        {showAvg && (
                          <Bar dataKey="promedio" fill="var(--color-promedio)" radius={4}>
                            <LabelList dataKey="promedio" position="top" formatter={(v: number) => v.toFixed(2)} className="fill-foreground/80" />
                          </Bar>
                        )}
                        {showStd && (
                          <Bar dataKey="estandar" fill="var(--color-estandar)" radius={4}>
                            <LabelList dataKey="estandar" position="top" formatter={(v: number) => v.toFixed(2)} className="fill-foreground/80" />
                          </Bar>
                        )}
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
