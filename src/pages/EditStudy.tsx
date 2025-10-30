import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

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
    }
  }, [study]);

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

        <Card>
          <CardHeader>
            <CardTitle>Observaciones y ciclos</CardTitle>
            <CardDescription>Edición de tiempos llegará pronto. Por ahora se mantiene la info existente.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Este editor se enfoca en los metadatos del estudio. Si necesitas cambiar tiempos, podemos habilitar un editor avanzado en un siguiente paso.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
