import { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Play, Pause, RotateCcw, Save, Plus, Trash2, Pencil, Check, X, ClipboardPaste } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function NewStudy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Clave de borrador por usuario
  const DRAFT_KEY = useMemo(() => `newStudyDraft:${user?.id ?? 'anon'}`,[user?.id]);
  const DRAFT_ID_KEY = useMemo(() => `${DRAFT_KEY}:id`, [DRAFT_KEY]);
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
  const [bulkTimes, setBulkTimes] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const draftRestoredRef = useRef<boolean>(false);
  const [draftStudyId, setDraftStudyId] = useState<string | null>(null);
  // Edición de nombres de ciclo en línea
  const [editingCycleIndex, setEditingCycleIndex] = useState<number | null>(null);
  const [editingCycleName, setEditingCycleName] = useState<string>("");
  
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

  // Restaurar borrador al entrar
  useEffect(() => {
    if (draftRestoredRef.current) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const savedId = localStorage.getItem(DRAFT_ID_KEY);
      if (savedId) setDraftStudyId(savedId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.formData) setFormData((prev) => ({...prev, ...parsed.formData}));
        if (Array.isArray(parsed?.cycles)) setCycles(parsed.cycles);
        if (typeof parsed?.activeCycle === 'number') setActiveCycle(parsed.activeCycle);
        toast.success('Borrador cargado');
      }
    } catch {}
    draftRestoredRef.current = true;
  }, [DRAFT_KEY, DRAFT_ID_KEY]);

  // Guardar borrador automáticamente
  useEffect(() => {
    if (!draftRestoredRef.current) return;
    const payload = {
      formData,
      cycles,
      activeCycle,
      updatedAt: new Date().toISOString(),
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch {}
  }, [formData, cycles, activeCycle, DRAFT_KEY]);

  const clearDraft = () => {
    try { 
      localStorage.removeItem(DRAFT_KEY); 
      localStorage.removeItem(DRAFT_ID_KEY);
      setDraftStudyId(null);
      toast.success('Borrador descartado'); 
    } catch {}
  };

  const handleSaveDraft = async () => {
    if (!user) {
      toast.error('Necesitas iniciar sesión');
      return;
    }

    const generalTimes = calculateGeneralTimes();
    const name = formData.processName.trim() || `Borrador ${new Date().toLocaleString()}`;

    const payload = {
      user_id: user.id,
      process_name: name,
      description: formData.description || null,
      cycles_count: cycles.length,
      performance_rating: formData.performanceRating,
      supplement_percentage: formData.supplementPercentage,
      observed_times: { cycles: cycles.map(c => ({ name: c.name, observations: c.observations })) },
      average_time: generalTimes.average,
      normal_time: generalTimes.normal,
      standard_time: generalTimes.standard,
      status: 'draft' as const,
      updated_at: new Date().toISOString(),
    };

    try {
      if (draftStudyId) {
        const { error } = await supabase.from('studies').update(payload).eq('id', draftStudyId);
        if (error) throw error;
        toast.success('Borrador actualizado en la nube');
      } else {
        const { data, error } = await supabase.from('studies').insert(payload).select('id').single();
        if (error) throw error;
        if (data?.id) {
          setDraftStudyId(data.id);
          try { localStorage.setItem(DRAFT_ID_KEY, data.id); } catch {}
        }
        toast.success('Borrador guardado en la nube');
      }
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar el borrador');
    }
  };

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

  // Pegar múltiples tiempos desde portapapeles
  const handleBulkAddTimes = () => {
    if (!bulkTimes.trim()) {
      toast.error("Ingresa tiempos en el área de texto");
      return;
    }

    const lines = bulkTimes.split('\n').filter(line => line.trim());
    const validTimes: number[] = [];
    let errors = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Soporta formatos: mm:ss.cc, mm:ss, ss.cc, o solo segundos
      const timeMatch = trimmed.match(/^(\d+):(\d+)\.(\d+)$|^(\d+):(\d+)$|^(\d+)\.(\d+)$|^(\d+)$/);
      
      if (timeMatch) {
        let m = 0, s = 0, c = 0;
        
        if (timeMatch[1] !== undefined) { // mm:ss.cc
          m = parseInt(timeMatch[1], 10);
          s = parseInt(timeMatch[2], 10);
          c = parseInt(timeMatch[3], 10);
        } else if (timeMatch[4] !== undefined) { // mm:ss
          m = parseInt(timeMatch[4], 10);
          s = parseInt(timeMatch[5], 10);
        } else if (timeMatch[6] !== undefined) { // ss.cc
          s = parseInt(timeMatch[6], 10);
          c = parseInt(timeMatch[7], 10);
        } else if (timeMatch[8] !== undefined) { // solo segundos
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
      setCycles(prev => prev.map((cycle, idx) =>
        idx === activeCycle 
          ? { ...cycle, observations: [...cycle.observations, ...validTimes] }
          : cycle
      ));
      setBulkTimes("");
      toast.success(`${validTimes.length} tiempo(s) agregado(s)${errors > 0 ? `, ${errors} línea(s) ignorada(s)` : ''}`);
    } else {
      toast.error("No se encontraron tiempos válidos. Usa formatos: 01:30.50, 01:30, 45.30, o 45");
    }
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

  // Calcular tiempo estándar general de todos los ciclos
  const calculateGeneralTimes = () => {
    const allObservations = cycles.flatMap(c => c.observations);
    return calculateTimes(allObservations);
  };

  const handleSave = async () => {
    if (!user || !formData.processName) {
      toast.error('Por favor completa el nombre del proceso');
      return;
    }

    // Calcular tiempo estándar general (todas las observaciones de todos los ciclos)
    const generalTimes = calculateGeneralTimes();
    
    try {
      const finalPayload = {
        user_id: user.id,
        process_name: formData.processName,
        description: formData.description || null,
        cycles_count: cycles.length,
        performance_rating: formData.performanceRating,
        supplement_percentage: formData.supplementPercentage,
        observed_times: { cycles: cycles.map(c => ({ name: c.name, observations: c.observations })) },
        average_time: generalTimes.average,
        normal_time: generalTimes.normal,
        standard_time: generalTimes.standard,
        status: 'completed' as const,
        updated_at: new Date().toISOString(),
      };

      if (draftStudyId) {
        const { error } = await supabase.from('studies').update(finalPayload).eq('id', draftStudyId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('studies').insert(finalPayload);
        if (error) throw error;
      }

      toast.success('Estudio guardado exitosamente');
      // Limpiar borrador al guardar
      clearDraft();
      navigate('/mis-estudios');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el estudio');
    }
  };

  const currentObservations = cycles[activeCycle]?.observations ?? [];
  const times = calculateTimes(currentObservations);
  const generalTimes = calculateGeneralTimes();

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Nuevo Estudio de Tiempos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Registra y analiza tus mediciones</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Gestión de ciclos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Ciclos</CardTitle>
              <CardDescription className="text-sm sm:text-base">Administra ciclos y selecciona el activo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {cycles.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    {editingCycleIndex === idx ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingCycleName}
                          onChange={(e) => setEditingCycleName(e.target.value)}
                          className="h-9 w-32 sm:w-36 text-sm"
                          maxLength={40}
                        />
                        <Button
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            const newName = editingCycleName.trim();
                            if (!newName) {
                              setEditingCycleIndex(null);
                              setEditingCycleName("");
                              return;
                            }
                            setCycles(prev => prev.map((cyc, i) => i === idx ? { ...cyc, name: newName } : cyc));
                            setEditingCycleIndex(null);
                            setEditingCycleName("");
                          }}
                          title="Confirmar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          onClick={() => {
                            setEditingCycleIndex(null);
                            setEditingCycleName("");
                          }}
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant={idx === activeCycle ? 'default' : 'outline'}
                          onClick={() => setActiveCycle(idx)}
                          className="h-9 text-sm px-3"
                        >
                          {c.name}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          onClick={() => {
                            setEditingCycleIndex(idx);
                            setEditingCycleName(c.name);
                          }}
                          title="Renombrar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setCycles(prev => [...prev, { name: `Ciclo ${prev.length + 1}`, observations: [] }]);
                    setActiveCycle(cycles.length);
                  }}
                  className="w-full sm:flex-1 h-10"
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
                      const newActive = Math.max(0, activeCycle - 1);
                      setActiveCycle(newActive);
                      return newArr.map((c, i) => ({
                        ...c,
                        name: c.name.startsWith('Ciclo ')
                          ? `Ciclo ${i + 1}`
                          : c.name,
                      }));
                    });
                  }}
                  className="w-full sm:flex-1 h-10"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar ciclo
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycle-name" className="text-sm sm:text-base">Nombre del ciclo activo</Label>
                <Input
                  id="cycle-name"
                  value={cycles[activeCycle]?.name ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCycles(prev => prev.map((c, idx) => idx === activeCycle ? { ...c, name: val } : c));
                  }}
                  maxLength={40}
                  placeholder={`Ciclo ${activeCycle + 1}`}
                  className="h-10 text-base"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Información del Estudio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="processName" className="text-sm sm:text-base">Nombre del Proceso *</Label>
                <Input
                  id="processName"
                  value={formData.processName}
                  onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                  placeholder="Ej: Ensamblaje de componente A"
                  className="h-10 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm sm:text-base">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el proceso..."
                  rows={3}
                  className="text-base resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating" className="text-sm sm:text-base">Calificación (%)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="80"
                    max="120"
                    value={formData.performanceRating}
                    onChange={(e) => setFormData({ ...formData, performanceRating: parseFloat(e.target.value) })}
                    className="h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplement" className="text-sm sm:text-base">Suplemento (%)</Label>
                  <Input
                    id="supplement"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.supplementPercentage}
                    onChange={(e) => setFormData({ ...formData, supplementPercentage: parseFloat(e.target.value) })}
                    className="h-10 text-base"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Clock className="h-5 w-5" />
                Cronómetro — {cycles[activeCycle]?.name ?? `Ciclo ${activeCycle + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Display del cronómetro y botones */}
              <div className="flex flex-col items-center gap-4 sm:gap-6">
                {/* Display del tiempo */}
                <div className="w-full">
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-bold text-primary tracking-normal leading-tight text-center">
                    {formatTime(time)}
                  </div>
                </div>
                
                {/* Botones de control en grid para mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:max-w-md">
                  <Button
                    onClick={handleStart}
                    size="lg"
                    className={`w-full h-12 ${isRunning ? 'bg-green-600 hover:bg-green-700' : 'bg-primary'}`}
                  >
                    {isRunning ? (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Registrar
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Iniciar
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handlePause} 
                    variant="outline" 
                    size="lg"
                    className="w-full h-12"
                    disabled={!isRunning}
                  >
                    <Pause className="mr-2 h-4 w-4" /> Pausar
                  </Button>
                  <Button 
                    onClick={handleReset} 
                    variant="outline" 
                    size="lg"
                    className="w-full h-12"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
                  </Button>
                </div>
              </div>

              {/* Separador visual */}
              <div className="border-t pt-4 sm:pt-6">
                <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">
                  Tiempos Observados — {cycles[activeCycle]?.name} 
                  <span className="ml-2 text-xs sm:text-sm font-normal text-muted-foreground">
                    ({currentObservations.length} observaciones)
                  </span>
                </h3>
                
                {/* Formulario de entrada manual mejorado */}
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4">
                  <Label className="text-sm font-medium mb-3 block">Agregar tiempo manualmente</Label>
                  <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                    <div className="flex-1 min-w-[70px] sm:min-w-[80px]">
                      <Label htmlFor="mm" className="text-xs text-muted-foreground mb-1 block">Minutos</Label>
                      <Input
                        id="mm"
                        type="number"
                        min={0}
                        value={manualMin}
                        onChange={(e) => setManualMin(e.target.value)}
                        placeholder="00"
                        className="text-center font-mono h-11 text-base"
                      />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-muted-foreground pb-2">:</span>
                    <div className="flex-1 min-w-[70px] sm:min-w-[80px]">
                      <Label htmlFor="ss" className="text-xs text-muted-foreground mb-1 block">Segundos</Label>
                      <Input
                        id="ss"
                        type="number"
                        min={0}
                        max={59}
                        value={manualSec}
                        onChange={(e) => setManualSec(e.target.value)}
                        placeholder="00"
                        className="text-center font-mono h-11 text-base"
                      />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-muted-foreground pb-2">.</span>
                    <div className="flex-1 min-w-[70px] sm:min-w-[80px]">
                      <Label htmlFor="cc" className="text-xs text-muted-foreground mb-1 block">Centésimas</Label>
                      <Input
                        id="cc"
                        type="number"
                        min={0}
                        max={99}
                        value={manualCs}
                        onChange={(e) => setManualCs(e.target.value)}
                        placeholder="00"
                        className="text-center font-mono h-11 text-base"
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleAddManualTime}
                      size="lg"
                      className="w-full sm:w-auto sm:flex-shrink-0 h-11"
                    >
                      <Plus className="mr-2 h-5 w-5" /> Agregar
                    </Button>
                  </div>
                </div>

                {/* Pegar múltiples tiempos */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 sm:p-4 mb-4 border border-blue-200 dark:border-blue-800">
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <ClipboardPaste className="h-4 w-4" />
                    Pegar múltiples tiempos
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pega tiempos copiados, uno por línea. Formatos: <code className="bg-muted px-1 rounded">01:30.50</code>, <code className="bg-muted px-1 rounded">01:30</code>, <code className="bg-muted px-1 rounded">45.30</code>, o <code className="bg-muted px-1 rounded">45</code>
                  </p>
                  <Textarea
                    value={bulkTimes}
                    onChange={(e) => setBulkTimes(e.target.value)}
                    placeholder="Ejemplo:&#10;01:25.30&#10;01:28.45&#10;01:26.12&#10;45.50&#10;52"
                    rows={4}
                    className="font-mono text-sm mb-3 resize-none"
                  />
                  <Button 
                    type="button" 
                    onClick={handleBulkAddTimes}
                    variant="secondary"
                    className="w-full h-11"
                    disabled={!bulkTimes.trim()}
                  >
                    <ClipboardPaste className="mr-2 h-4 w-4" /> 
                    Agregar todos los tiempos
                  </Button>
                </div>

                {/* Lista de observaciones mejorada */}
                <div className="bg-muted/30 rounded-lg p-3 sm:p-4 max-h-64 overflow-y-auto border">
                  {currentObservations.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">No hay observaciones registradas</p>
                      <p className="text-muted-foreground text-xs mt-1">Usa el cronómetro o agrega tiempos manualmente</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentObservations.map((t, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-3 bg-background rounded-md hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-xs font-medium text-muted-foreground w-14 sm:w-16">
                              Obs #{i + 1}
                            </span>
                            <span className="font-mono text-base sm:text-lg font-semibold">{formatTime(t)}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-9 w-9 p-0 hover:bg-destructive/10" 
                            onClick={() => handleRemoveObserved(i)}
                            title="Eliminar observación"
                          >
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
            <CardTitle className="text-lg sm:text-xl">Resultados del Análisis</CardTitle>
            <CardDescription className="text-sm sm:text-base">Cálculos basados en el ciclo activo y resumen por ciclo</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tiempo estándar general de todos los ciclos */}
            <div className="mb-4 sm:mb-6 p-4 sm:p-6 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Tiempo Estándar General (Todos los Ciclos)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-background/80 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Tiempo Promedio</p>
                  <p className="text-lg sm:text-xl font-bold">{generalTimes.average.toFixed(2)}s</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-background/80 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Tiempo Normal</p>
                  <p className="text-lg sm:text-xl font-bold">{generalTimes.normal.toFixed(2)}s</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Tiempo Estándar</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary">{generalTimes.standard.toFixed(2)}s</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Basado en {cycles.flatMap(c => c.observations).length} observaciones totales de {cycles.length} ciclo(s)
              </p>
            </div>

            {/* Resultados del ciclo activo */}
            <div className="mb-4 sm:mb-6">
              <h4 className="font-semibold text-sm sm:text-base mb-3">Resultados del Ciclo Activo ({cycles[activeCycle]?.name})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tiempo Promedio</p>
                  <p className="text-xl sm:text-2xl font-bold">{times.average.toFixed(2)}s</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tiempo Normal</p>
                  <p className="text-xl sm:text-2xl font-bold">{times.normal.toFixed(2)}s</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-primary/10 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tiempo Estándar</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary">{times.standard.toFixed(2)}s</p>
                </div>
              </div>
            </div>

            {/* Resumen por ciclo */}
            <div className="mt-4 sm:mt-6">
              <h4 className="font-semibold text-sm sm:text-base mb-2">Resumen por ciclo</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {cycles.map((c, idx) => {
                  const t = calculateTimes(c.observations);
                  return (
                    <div key={idx} className="p-3 sm:p-4 rounded-lg border bg-card">
                      <p className="font-medium mb-1 text-sm sm:text-base">{c.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">Observaciones: {c.observations.length}</p>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span>Promedio</span>
                        <span className="font-mono">{t.average.toFixed(2)}s</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span>Normal</span>
                        <span className="font-mono">{t.normal.toFixed(2)}s</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span>Estándar</span>
                        <span className="font-mono text-primary">{t.standard.toFixed(2)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraft}
                className="w-full sm:w-auto h-12 order-3 sm:order-1"
              >
                Guardar como borrador
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={clearDraft}
                className="w-full sm:w-auto h-12 order-2 sm:order-2"
              >
                Descartar borrador
              </Button>
              <Button 
                onClick={handleSave} 
                size="lg" 
                disabled={currentObservations.length === 0 && cycles.every(c => c.observations.length === 0)}
                className="w-full sm:w-auto h-12 order-1 sm:order-3"
              >
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
