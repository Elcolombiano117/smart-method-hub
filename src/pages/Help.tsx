import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Help() {
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Ayuda</h1>
          <p className="text-muted-foreground">Preguntas frecuentes y soporte</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6" />
              Preguntas Frecuentes
            </CardTitle>
            <CardDescription>
              Encuentra respuestas a las preguntas más comunes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>¿Cómo crear un nuevo estudio?</AccordionTrigger>
                <AccordionContent>
                  Para crear un nuevo estudio, ve a "Nuevo Estudio" en el menú lateral, completa la información del proceso y utiliza el cronómetro para registrar tus mediciones.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>¿Cómo se calculan los tiempos estándar?</AccordionTrigger>
                <AccordionContent>
                  El tiempo estándar se calcula automáticamente usando la fórmula: Tiempo Normal × (1 + Suplemento%). El tiempo normal es el tiempo promedio observado multiplicado por la calificación del desempeño.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>¿Puedo exportar mis estudios?</AccordionTrigger>
                <AccordionContent>
                  Actualmente puedes ver y gestionar todos tus estudios desde la sección "Mis Estudios". La función de exportación a PDF estará disponible próximamente.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>¿Cómo cambio mi contraseña?</AccordionTrigger>
                <AccordionContent>
                  Ve a tu perfil (icono de usuario en la barra superior) y selecciona la pestaña "Seguridad" para cambiar tu contraseña.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Contacto
            </CardTitle>
            <CardDescription>
              ¿Necesitas más ayuda? Contáctanos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Si tienes alguna pregunta o necesitas asistencia técnica, no dudes en contactarnos.
            </p>
            <Button>
              <Mail className="mr-2 h-4 w-4" />
              Enviar Mensaje
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
