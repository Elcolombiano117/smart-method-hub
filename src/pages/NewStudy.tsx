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
  const [observedTimes, setObservedTimes] = useState<number[]>([]);
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
      setObservedTimes([...observedTimes, time]);
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
    setObservedTimes(prev => [...prev, ms]);
    setManualMin("");
    setManualSec("");
    setManualCs("");
    toast.success("Tiempo agregado");
  };

  const handleRemoveObserved = (index: number) => {
    setObservedTimes(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTimes = () => {
    if (observedTimes.length === 0) return { average: 0, normal: 0, standard: 0 };
    
    const average = observedTimes.reduce((a, b) => a + b, 0) / observedTimes.length / 1000;
    const normal = average * (formData.performanceRating / 100);
    const standard = normal * (1 + formData.supplementPercentage / 100);
    
    return { average, normal, standard };
  };

  const handleSave = async () => {
    if (!user || !formData.processName) {
      toast.error('Por favor completa el nombre del proceso');
      return;
    }

    const times = calculateTimes();
    
    try {
      const { error } = await supabase.from('studies').insert({
        user_id: user.id,
        process_name: formData.processName,
        description: formData.description,
        cycles_count: observedTimes.length,
        performance_rating: formData.performanceRating,
        supplement_percentage: formData.supplementPercentage,
        observed_times: observedTimes,
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

  const times = calculateTimes();

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Nuevo Estudio de Tiempos</h1>
          <p className="text-muted-foreground">Registra y analiza tus mediciones</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                Cronómetro
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
                <h3 className="font-semibold mb-2">Tiempos Observados ({observedTimes.length})</h3>
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
                  {observedTimes.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center">No hay mediciones aún</p>
                  ) : (
                    <div className="space-y-1">
                      {observedTimes.map((t, i) => (
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
            <CardDescription>Cálculos automáticos basados en tus mediciones</CardDescription>
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

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} size="lg" disabled={observedTimes.length === 0}>
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
