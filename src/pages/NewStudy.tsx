import { useState, useEffect, useRef } from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Play, Pause, RotateCcw, Save, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function NewStudy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  // Ciclos con múltiples observaciones por ciclo
  const [cycles, setCycles] = useState<{ name: string; observations: number[] }[]>([
    { name: 'Ciclo 1', observations: [] },
  ]);
  const [activeCycle, setActiveCycle] = useState(0);
  const [manualMin, setManualMin] = useState<string>("");
  const [manualSec, setManualSec] = useState<string>("");
  const [manualCs, setManualCs] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    processName: '',
    description: '',
    performanceRating: 100,
    supplementPercentage: 15,
  });

  // Effect para manejar el cronómetro
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 10);
      }, 10);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (isRunning) {
      // Si está corriendo, registrar el tiempo
      setCycles(prev => prev.map((c, idx) => idx === activeCycle
        ? { ...c, observations: [...c.observations, time] }
        : c
      ));
      setTime(0);
    } else {
      // Si no está corriendo, iniciarlo
      setIsRunning(true);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
  };

  // Agregar tiempo observado manualmente (mm:ss.cc)
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
    setCycles(prev => prev.map((cycle, idx) =>
      idx === activeCycle ? { ...cycle, observations: [...cycle.observations, ms] } : cycle
    ));
    setManualMin("");
    setManualSec("");
    setManualCs("");
    toast.success("Tiempo agregado");
  };

  const handleRemoveObserved = (index: number) => {
    setCycles(prev => prev.map((cycle, idx) =>
      idx === activeCycle ? { ...cycle, observations: cycle.observations.filter((_, i) => i !== index) } : cycle
    ));
  };

  const calculateTimes = (obs: number[]) => {
    if (obs.length === 0) return { average: 0, normal: 0, standard: 0 };
    
    const average = obs.reduce((a, b) => a + b, 0) / obs.length / 1000;
    const normal = average * (formData.performanceRating / 100);
    const standard = normal * (1 + formData.supplementPercentage / 100);
    
    return { average, normal, standard };
  };

  const handleSave = async () => {
    if (!user || !formData.processName) {
      toast.error('Por favor completa el nombre del proceso');
      return;
    }

    // Guardar métricas del Ciclo 1 como resumen principal
    const firstCycleObs = cycles[0]?.observations ?? [];
    const times = calculateTimes(firstCycleObs);
    
    try {
      const { error } = await supabase.from('studies').insert({
        user_id: user.id,
        process_name: formData.processName,
        description: formData.description,
        cycles_count: cycles.length,
        performance_rating: formData.performanceRating,
        supplement_percentage: formData.supplementPercentage,
        // Guardamos estructura completa de ciclos en JSON
        observed_times: {
          cycles: cycles.map(c => ({ name: c.name, observations: c.observations }))
        },
        average_time: times.average,
        normal_time: times.normal,
        standard_time: times.standard,
        status: 'completed',
      });

      if (error) throw error;

      toast.success('Estudio guardado exitosamente');
      navigate('/mis-estudios');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el estudio');
    }
  };

  const currentObservations = cycles[activeCycle]?.observations ?? [];
  const times = calculateTimes(currentObservations);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Nuevo Estudio de Tiempos</h1>
          <p className="text-muted-foreground">Registra y analiza tus mediciones</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gestión de ciclos */}
          <Card>
            <CardHeader>
              <CardTitle>Ciclos</CardTitle>
              <CardDescription>Administra ciclos y selecciona el activo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {cycles.map((c, idx) => (
                  <Button
                    key={idx}
                    variant={idx === activeCycle ? 'default' : 'outline'}
                    onClick={() => setActiveCycle(idx)}
                    className="h-8"
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setCycles(prev => [...prev, { name: `Ciclo ${prev.length + 1}`, observations: [] }]);
                    setActiveCycle(cycles.length);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Añadir ciclo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={cycles.length === 1}
                  onClick={() => {
                    setCycles(prev => {
                      if (prev.length === 1) return prev;
                      const newArr = prev.filter((_, i) => i !== activeCycle);
                      // Ajustar índice activo
                      const newActive = Math.max(0, activeCycle - 1);
                      setActiveCycle(newActive);
                      return newArr.map((c, i) => ({
                        ...c,
                        // Reetiquetar nombres para mantener orden (opcional)
                        name: c.name.startsWith('Ciclo ')
                          ? `Ciclo ${i + 1}`
                          : c.name,
                      }));
                    });
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar ciclo
                </Button>
              </div>
              {/* Renombrar ciclo activo */}
              <div className="space-y-2">
                <Label htmlFor="cycle-name">Nombre del ciclo activo</Label>
                <Input
                  id="cycle-name"
                  value={cycles[activeCycle]?.name ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCycles(prev => prev.map((c, idx) => idx === activeCycle ? { ...c, name: val } : c));
                  }}
                  maxLength={40}
                  placeholder={`Ciclo ${activeCycle + 1}`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información del Estudio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="processName">Nombre del Proceso *</Label>
                <Input
                  id="processName"
                  value={formData.processName}
                  onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                  placeholder="Ej: Ensamblaje de componente A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el proceso..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating">Calificación (%)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="80"
                    max="120"
                    value={formData.performanceRating}
                    onChange={(e) => setFormData({ ...formData, performanceRating: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplement">Suplemento (%)</Label>
                  <Input
                    id="supplement"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.supplementPercentage}
                    onChange={(e) => setFormData({ ...formData, supplementPercentage: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cronómetro — {cycles[activeCycle]?.name ?? `Ciclo ${activeCycle + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-mono font-bold text-primary mb-6">
                  {formatTime(time)}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleStart}
                    size="lg"
                    className={isRunning ? 'bg-accent hover:bg-accent/90' : ''}
                  >
                    {isRunning ? <><Pause className="mr-2 h-5 w-5" /> Registrar</> : <><Play className="mr-2 h-5 w-5" /> Iniciar</>}
                  </Button>
                  <Button onClick={handlePause} variant="outline" size="lg">
                    <Pause className="mr-2 h-5 w-5" /> Pausar
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg">
                    <RotateCcw className="mr-2 h-5 w-5" /> Reset
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Tiempos Observados — {cycles[activeCycle]?.name} ({currentObservations.length})</h3>
                {/* Formulario de entrada manual */}
                <div className="flex items-end gap-2 mb-3">
                  <div>
                    <Label htmlFor="mm" className="text-xs">Min</Label>
                    <Input
                      id="mm"
                      type="number"
                      min={0}
                      value={manualMin}
                      onChange={(e) => setManualMin(e.target.value)}
                      placeholder="00"
                      className="w-20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ss" className="text-xs">Seg</Label>
                    <Input
                      id="ss"
                      type="number"
                      min={0}
                      max={59}
                      value={manualSec}
                      onChange={(e) => setManualSec(e.target.value)}
                      placeholder="00"
                      className="w-20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cc" className="text-xs">Centésimas</Label>
                    <Input
                      id="cc"
                      type="number"
                      min={0}
                      max={99}
                      value={manualCs}
                      onChange={(e) => setManualCs(e.target.value)}
                      placeholder="00"
                      className="w-24"
                    />
                  </div>
                  <Button type="button" onClick={handleAddManualTime} className="ml-1">
                    <Plus className="mr-2 h-4 w-4" /> Agregar
                  </Button>
                </div>

                <div className="bg-muted rounded-lg p-4 max-h-48 overflow-y-auto">
                  {currentObservations.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center">No hay mediciones aún</p>
                  ) : (
                    <div className="space-y-1">
                      {currentObservations.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <span>Obs {i + 1}:</span>
                            <span className="font-mono">{formatTime(t)}</span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRemoveObserved(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resultados del Análisis</CardTitle>
            <CardDescription>Cálculos basados en el ciclo activo y resumen por ciclo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tiempo Promedio</p>
                <p className="text-2xl font-bold">{times.average.toFixed(2)}s</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tiempo Normal</p>
                <p className="text-2xl font-bold">{times.normal.toFixed(2)}s</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tiempo Estándar</p>
                <p className="text-2xl font-bold text-primary">{times.standard.toFixed(2)}s</p>
              </div>
            </div>

            {/* Resumen por ciclo */}
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Resumen por ciclo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cycles.map((c, idx) => {
                  const t = calculateTimes(c.observations);
                  return (
                    <div key={idx} className="p-4 rounded-lg border bg-card">
                      <p className="font-medium mb-1">{c.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">Observaciones: {c.observations.length}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span>Promedio</span>
                        <span className="font-mono">{t.average.toFixed(2)}s</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Normal</span>
                        <span className="font-mono">{t.normal.toFixed(2)}s</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Estándar</span>
                        <span className="font-mono text-primary">{t.standard.toFixed(2)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} size="lg" disabled={currentObservations.length === 0 && cycles.every(c => c.observations.length === 0)}>
                <Save className="mr-2 h-5 w-5" />
                Guardar Estudio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
