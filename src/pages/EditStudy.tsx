import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2, Pencil, Check, X, ClipboardPaste, Clock } from "lucide-react";

const schema = z.object({
  process_name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional().nullable(),
  status: z.enum(["draft", "in_progress", "completed"]),
  performance_rating: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "Mínimo 0")
    .max(300, "Máximo 300"),
  supplement_percentage: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "Mínimo 0")
    .max(100, "Máx 100"),
  conclusions: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export default function EditStudy() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Estado para edición de ciclos y observaciones
  const [cycles, setCycles] = useState<{ name: string; observations: number[] }[]>([
    { name: "Ciclo 1", observations: [] },
  ]);
  const [activeCycle, setActiveCycle] = useState(0);
  const [manualMin, setManualMin] = useState<string>("");
  const [manualSec, setManualSec] = useState<string>("");
  const [manualCs, setManualCs] = useState<string>("");
  const [bulkTimes, setBulkTimes] = useState<string>("");
  const [editingCycleIndex, setEditingCycleIndex] = useState<number | null>(null);
  const [editingCycleName, setEditingCycleName] = useState<string>("");
  // Edición inline de observaciones
  const [editingObs, setEditingObs] = useState<{ cycle: number; index: number } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      process_name: "",
      description: "",
      status: "draft",
      performance_rating: 100,
      supplement_percentage: 10,
      conclusions: "",
      recommendations: "",
    },
  });

  const { data: study, isLoading } = useQuery({
    queryKey: ["study", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (study) {
      form.reset({
        process_name: study.process_name ?? "",
        description: study.description ?? "",
        status: (study.status as FormValues["status"]) ?? "draft",
        performance_rating: Number(study.performance_rating ?? 100),
        supplement_percentage: Number(study.supplement_percentage ?? 10),
        conclusions: study.conclusions ?? "",
        recommendations: study.recommendations ?? "",
      });

      // Cargar ciclos desde observed_times
      try {
        const observed = typeof study.observed_times === "object" && study.observed_times
          ? (study.observed_times as any)
          : null;
        const incomingCycles: { name: string; observations: number[] }[] = observed?.cycles?.map((c: any, i: number) => ({
          name: typeof c?.name === "string" ? c.name : `Ciclo ${i + 1}`,
          observations: Array.isArray(c?.observations) ? c.observations.filter((n: any) => typeof n === 'number') : [],
        })) ?? [];

        if (incomingCycles.length > 0) {
          setCycles(incomingCycles);
          setActiveCycle(0);
        } else {
          setCycles([{ name: "Ciclo 1", observations: [] }]);
          setActiveCycle(0);
        }
      } catch {
        setCycles([{ name: "Ciclo 1", observations: [] }]);
      }
    }
  }, [study]);

  // Si cambia el ciclo activo, cancelar edición inline si no coincide
  useEffect(() => {
    if (editingObs && editingObs.cycle !== activeCycle) {
      setEditingObs(null);
      setEditingValue("");
    }
  }, [activeCycle]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const handleAddManualTime = () => {
    const m = manualMin === "" ? 0 : parseInt(manualMin, 10);
    const s = manualSec === "" ? 0 : parseInt(manualSec, 10);
    const c = manualCs === "" ? 0 : parseInt(manualCs, 10);

    if (Number.isNaN(m) || Number.isNaN(s) || Number.isNaN(c)) {
      toast.error("Valores inválidos. Usa números.");
      return;
    }
    if (m < 0 || s < 0 || s > 59 || c < 0 || c > 99) {
      toast.error("Rangos: min ≥ 0, seg 0-59, centésimas 0-99.");
      return;
    }

    const ms = m * 60000 + s * 1000 + c * 10;
    setCycles(prev => prev.map((cycle, idx) => idx === activeCycle ? { ...cycle, observations: [...cycle.observations, ms] } : cycle));
    setManualMin("");
    setManualSec("");
    setManualCs("");
    toast.success("Tiempo agregado");
  };

  const handleBulkAddTimes = () => {
    if (!bulkTimes.trim()) {
      toast.error("Ingresa tiempos en el área de texto");
      return;
    }

    const lines = bulkTimes.split('\n').filter(line => line.trim());
    const validTimes: number[] = [];
    let errors = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      const timeMatch = trimmed.match(/^(\d+):(\d+)\.(\d+)$|^(\d+):(\d+)$|^(\d+)\.(\d+)$|^(\d+)$/);

      if (timeMatch) {
        let m = 0, s = 0, c = 0;
        if (timeMatch[1] !== undefined) {
          m = parseInt(timeMatch[1], 10);
          s = parseInt(timeMatch[2], 10);
          c = parseInt(timeMatch[3], 10);
        } else if (timeMatch[4] !== undefined) {
          m = parseInt(timeMatch[4], 10);
          s = parseInt(timeMatch[5], 10);
        } else if (timeMatch[6] !== undefined) {
          s = parseInt(timeMatch[6], 10);
          c = parseInt(timeMatch[7], 10);
        } else if (timeMatch[8] !== undefined) {
          s = parseInt(timeMatch[8], 10);
        }

        if (s >= 0 && s <= 59 && c >= 0 && c <= 99 && m >= 0) {
          const ms = m * 60000 + s * 1000 + c * 10;
          validTimes.push(ms);
        } else {
          errors++;
        }
      } else {
        errors++;
      }
    });

    if (validTimes.length > 0) {
      setCycles(prev => prev.map((cycle, idx) => idx === activeCycle ? { ...cycle, observations: [...cycle.observations, ...validTimes] } : cycle));
      setBulkTimes("");
      toast.success(`${validTimes.length} tiempo(s) agregado(s)${errors > 0 ? `, ${errors} línea(s) ignorada(s)` : ''}`);
    } else {
      toast.error("No se encontraron tiempos válidos. Usa formatos: 01:30.50, 01:30, 45.30, o 45");
    }
  };

  const handleRemoveObserved = (index: number) => {
    setCycles(prev => prev.map((cycle, idx) => idx === activeCycle ? { ...cycle, observations: cycle.observations.filter((_, i) => i !== index) } : cycle));
  };

  const parseTimeToMs = (value: string): number | null => {
    const trimmed = value.trim();
    const m = trimmed.match(/^(\d+):(\d+)\.(\d+)$/) ||
              trimmed.match(/^(\d+):(\d+)$/) ||
              trimmed.match(/^(\d+)\.(\d+)$/) ||
              trimmed.match(/^(\d+)$/);
    if (!m) return null;
    let minutes = 0, seconds = 0, centis = 0;
    if (m.length === 4 && m[1] !== undefined) { // mm:ss.cc
      minutes = parseInt(m[1], 10);
      seconds = parseInt(m[2], 10);
      centis = parseInt(m[3], 10);
    } else if (m.length === 3 && m[1] !== undefined && m[2] !== undefined && trimmed.includes(":")) { // mm:ss
      minutes = parseInt(m[1], 10);
      seconds = parseInt(m[2], 10);
    } else if (m.length === 3 && m[1] !== undefined && m[2] !== undefined && trimmed.includes(".")) { // ss.cc
      seconds = parseInt(m[1], 10);
      centis = parseInt(m[2], 10);
    } else if (m.length >= 2 && m[1] !== undefined) { // ss
      seconds = parseInt(m[1], 10);
    }
    if (seconds < 0 || seconds > 59 || centis < 0 || centis > 99 || minutes < 0) return null;
    return minutes * 60000 + seconds * 1000 + centis * 10;
  };

  const startEditObservation = (index: number) => {
    const obs = cycles[activeCycle]?.observations?.[index];
    if (typeof obs !== 'number') return;
    setEditingObs({ cycle: activeCycle, index });
    setEditingValue(formatTime(obs));
  };

  const saveEditObservation = () => {
    if (!editingObs) return;
    const ms = parseTimeToMs(editingValue);
    if (ms === null) {
      toast.error("Formato inválido. Usa mm:ss.cc, mm:ss, ss.cc o ss");
      return;
    }
    setCycles(prev => prev.map((c, cIdx) => cIdx !== editingObs.cycle ? c : {
      ...c,
      observations: c.observations.map((v, i) => i === editingObs.index ? ms : v)
    }));
    setEditingObs(null);
    setEditingValue("");
    toast.success("Observación actualizada");
  };

  const cancelEditObservation = () => {
    setEditingObs(null);
    setEditingValue("");
  };

  const calcTimes = (obs: number[], rating: number, supplement: number) => {
    if (obs.length === 0) return { average: 0, normal: 0, standard: 0 };
    const average = obs.reduce((a, b) => a + b, 0) / obs.length / 1000;
    const normal = average * (rating / 100);
    const standard = normal * (1 + supplement / 100);
    return { average, normal, standard };
  };

  const watchedRating = form.watch('performance_rating');
  const watchedSupplement = form.watch('supplement_percentage');
  const currentObservations = cycles[activeCycle]?.observations ?? [];
  const currentTimes = useMemo(() => calcTimes(currentObservations, watchedRating, watchedSupplement), [currentObservations, watchedRating, watchedSupplement]);
  const allObservations = useMemo(() => cycles.flatMap(c => c.observations), [cycles]);
  const generalTimes = useMemo(() => calcTimes(allObservations, watchedRating, watchedSupplement), [allObservations, watchedRating, watchedSupplement]);

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        process_name: values.process_name,
        description: values.description ?? null,
        status: values.status,
        performance_rating: values.performance_rating,
        supplement_percentage: values.supplement_percentage,
        conclusions: values.conclusions ?? null,
        recommendations: values.recommendations ?? null,
        cycles_count: cycles.length,
        observed_times: { cycles: cycles.map(c => ({ name: c.name, observations: c.observations })) },
        average_time: generalTimes.average,
        normal_time: generalTimes.normal,
        standard_time: generalTimes.standard,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("studies")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estudio actualizado");
      queryClient.invalidateQueries({ queryKey: ["study", id] });
      queryClient.invalidateQueries({ queryKey: ["studies"] });
      navigate(`/estudio/${id}`);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Error al actualizar");
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(id ? `/estudio/${id}` : "/mis-estudios") }>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Editar estudio</h1>
            <p className="text-muted-foreground">Actualiza la información del estudio</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos del estudio</CardTitle>
            <CardDescription>Modifica los campos y guarda los cambios</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="process_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del proceso</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Ensamble de pieza" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Borrador</SelectItem>
                            <SelectItem value="in_progress">En Progreso</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="performance_rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calificación (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min={0} max={300} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormDescription>Generalmente 100% si el desempeño es normal.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplement_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suplemento (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min={0} max={100} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormDescription>Tiempo adicional por necesidades personales, fatiga, demoras, etc.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Describe brevemente el proceso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conclusions"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Conclusiones</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Conclusiones del estudio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recommendations"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Recomendaciones</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Recomendaciones para mejorar el método" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => navigate(id ? `/estudio/${id}` : "/mis-estudios")}>Cancelar</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Guardar cambios
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Editor de ciclos y observaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Ciclos</CardTitle>
              <CardDescription className="text-sm sm:text-base">Administra ciclos del estudio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {cycles.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    {editingCycleIndex === idx ? (
                      <div className="flex items-center gap-1">
                        <Input value={editingCycleName} onChange={(e) => setEditingCycleName(e.target.value)} className="h-9 w-32 sm:w-36 text-sm" maxLength={40} />
                        <Button size="icon" className="h-9 w-9" onClick={() => {
                          const newName = editingCycleName.trim();
                          if (!newName) { setEditingCycleIndex(null); setEditingCycleName(""); return; }
                          setCycles(prev => prev.map((cyc, i) => i === idx ? { ...cyc, name: newName } : cyc));
                          setEditingCycleIndex(null); setEditingCycleName("");
                        }} title="Confirmar"><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => { setEditingCycleIndex(null); setEditingCycleName(""); }} title="Cancelar"><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button variant={idx === activeCycle ? 'default' : 'outline'} onClick={() => setActiveCycle(idx)} className="h-9 text-sm px-3">{c.name}</Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setEditingCycleIndex(idx); setEditingCycleName(c.name); }} title="Renombrar"><Pencil className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" onClick={() => { setCycles(prev => [...prev, { name: `Ciclo ${prev.length + 1}`, observations: [] }]); setActiveCycle(cycles.length); }} className="w-full sm:flex-1 h-10">
                  <Plus className="mr-2 h-4 w-4" /> Añadir ciclo
                </Button>
                <Button type="button" variant="outline" disabled={cycles.length === 1} onClick={() => {
                  setCycles(prev => {
                    if (prev.length === 1) return prev;
                    const newArr = prev.filter((_, i) => i !== activeCycle);
                    const newActive = Math.max(0, activeCycle - 1);
                    setActiveCycle(newActive);
                    return newArr.map((c, i) => ({ ...c, name: c.name.startsWith('Ciclo ') ? `Ciclo ${i + 1}` : c.name }));
                  });
                }} className="w-full sm:flex-1 h-10">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar ciclo
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycle-name" className="text-sm sm:text-base">Nombre del ciclo activo</Label>
                <Input id="cycle-name" value={cycles[activeCycle]?.name ?? ''} onChange={(e) => { const val = e.target.value; setCycles(prev => prev.map((c, idx) => idx === activeCycle ? { ...c, name: val } : c)); }} maxLength={40} placeholder={`Ciclo ${activeCycle + 1}`} className="h-10 text-base" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><Clock className="h-5 w-5" /> Tiempos observados — {cycles[activeCycle]?.name ?? `Ciclo ${activeCycle + 1}`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4">
                <Label className="text-sm font-medium mb-3 block">Agregar tiempo manualmente</Label>
                <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                  <div className="flex-1 min-w-[70px] sm:min-w-[80px]">
                    <Label htmlFor="mm" className="text-xs text-muted-foreground mb-1 block">Minutos</Label>
                    <Input id="mm" type="number" min={0} value={manualMin} onChange={(e) => setManualMin(e.target.value)} placeholder="00" className="text-center font-mono h-11 text-base" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-muted-foreground pb-2">:</span>
                  <div className="flex-1 min-w-[70px] sm:min-w-[80px]">
                    <Label htmlFor="ss" className="text-xs text-muted-foreground mb-1 block">Segundos</Label>
                    <Input id="ss" type="number" min={0} max={59} value={manualSec} onChange={(e) => setManualSec(e.target.value)} placeholder="00" className="text-center font-mono h-11 text-base" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-muted-foreground pb-2">.</span>
                  <div className="flex-1 min-w-[70px] sm:min-w-[80px]">
                    <Label htmlFor="cc" className="text-xs text-muted-foreground mb-1 block">Centésimas</Label>
                    <Input id="cc" type="number" min={0} max={99} value={manualCs} onChange={(e) => setManualCs(e.target.value)} placeholder="00" className="text-center font-mono h-11 text-base" />
                  </div>
                  <Button type="button" onClick={handleAddManualTime} size="lg" className="w-full sm:w-auto sm:flex-shrink-0 h-11"><Plus className="mr-2 h-5 w-5" /> Agregar</Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 sm:p-4 mb-4 border border-blue-200 dark:border-blue-800">
                <Label className="text-sm font-medium mb-2 block flex items-center gap-2"><ClipboardPaste className="h-4 w-4" /> Pegar múltiples tiempos</Label>
                <p className="text-xs text-muted-foreground mb-3">Pega tiempos copiados, uno por línea. Formatos: <code className="bg-muted px-1 rounded">01:30.50</code>, <code className="bg-muted px-1 rounded">01:30</code>, <code className="bg-muted px-1 rounded">45.30</code>, o <code className="bg-muted px-1 rounded">45</code></p>
                <Textarea value={bulkTimes} onChange={(e) => setBulkTimes(e.target.value)} placeholder={"Ejemplo:\n01:25.30\n01:28.45\n01:26.12\n45.50\n52"} rows={4} className="font-mono text-sm mb-3 resize-none" />
                <Button type="button" onClick={handleBulkAddTimes} variant="secondary" className="w-full h-11" disabled={!bulkTimes.trim()}><ClipboardPaste className="mr-2 h-4 w-4" /> Agregar todos los tiempos</Button>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 sm:p-4 max-h-64 overflow-y-auto border">
                {currentObservations.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">No hay observaciones registradas</p>
                    <p className="text-muted-foreground text-xs mt-1">Agrega tiempos manualmente o pega múltiples</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentObservations.map((t, i) => {
                      const isEditing = editingObs && editingObs.cycle === activeCycle && editingObs.index === i;
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-background rounded-md hover:bg-accent/5 transition-colors">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <span className="text-xs font-medium text-muted-foreground w-14 sm:w-16 shrink-0">#{i + 1}</span>
                            {isEditing ? (
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="font-mono text-base sm:text-lg h-10"
                                placeholder="mm:ss.cc"
                              />
                            ) : (
                              <span className="font-mono text-base sm:text-lg font-semibold truncate">{formatTime(t)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 ml-2">
                            {isEditing ? (
                              <>
                                <Button size="sm" className="h-9" onClick={saveEditObservation} title="Guardar"><Check className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" className="h-9" onClick={cancelEditObservation} title="Cancelar"><X className="h-4 w-4" /></Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => startEditObservation(i)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-destructive/10" onClick={() => handleRemoveObserved(i)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Resultados del análisis</CardTitle>
            <CardDescription className="text-sm sm:text-base">Cálculos con la calificación y suplemento actuales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 sm:mb-6 p-4 sm:p-6 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Tiempo Estándar General</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-background/80 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Promedio</p><p className="text-lg sm:text-xl font-bold">{generalTimes.average.toFixed(2)}s</p></div>
                <div className="text-center p-3 sm:p-4 bg-background/80 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Normal</p><p className="text-lg sm:text-xl font-bold">{generalTimes.normal.toFixed(2)}s</p></div>
                <div className="text-center p-3 sm:p-4 bg-primary/20 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Estándar</p><p className="text-xl sm:text-2xl font-bold text-primary">{generalTimes.standard.toFixed(2)}s</p></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Basado en {allObservations.length} observaciones totales de {cycles.length} ciclo(s)</p>
            </div>

            <div className="mb-4 sm:mb-6">
              <h4 className="font-semibold text-sm sm:text-base mb-3">Ciclo activo: {cycles[activeCycle]?.name}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-3 sm:p-4 bg-muted rounded-lg"><p className="text-xs sm:text-sm text-muted-foreground mb-1">Promedio</p><p className="text-xl sm:text-2xl font-bold">{currentTimes.average.toFixed(2)}s</p></div>
                <div className="text-center p-3 sm:p-4 bg-muted rounded-lg"><p className="text-xs sm:text-sm text-muted-foreground mb-1">Normal</p><p className="text-xl sm:text-2xl font-bold">{currentTimes.normal.toFixed(2)}s</p></div>
                <div className="text-center p-3 sm:p-4 bg-primary/10 rounded-lg"><p className="text-xs sm:text-sm text-muted-foreground mb-1">Estándar</p><p className="text-xl sm:text-2xl font-bold text-primary">{currentTimes.standard.toFixed(2)}s</p></div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex justify-end">
              <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={updateMutation.isPending} className="w-full sm:w-auto h-12">
                <Save className="mr-2 h-5 w-5" /> Guardar cambios
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
