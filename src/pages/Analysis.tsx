import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Analysis() {
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Análisis</h1>
          <p className="text-muted-foreground">Visualiza estadísticas y tendencias de tus estudios</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Panel de Análisis
            </CardTitle>
            <CardDescription>
              Aquí podrás ver gráficos y estadísticas detalladas de tus estudios
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              Módulo de análisis en desarrollo
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
