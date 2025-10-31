# 📄 Guía de Exportación de Estudios a PDF y CSV

## 🎯 Funcionalidades Disponibles

### 1. Descargar PDF Individual (Desde "Mis Estudios")
- **Ubicación**: Tarjeta de cada estudio
- **Botón**: "PDF" (azul)
- **Contenido**:
  - Nombre y descripción del estudio
  - Información general (fecha, ciclos, calificación, suplemento)
  - Tiempos calculados (promedio, normal, estándar)
  - Detalle de todos los ciclos con sus observaciones

**Cómo usar:**
1. Ve a "Mis Estudios"
2. En cualquier tarjeta de estudio, haz clic en el botón "PDF"
3. El archivo se descargará automáticamente

---

### 2. Descargar PDF Completo (Desde Detalle del Estudio)
- **Ubicación**: Página de detalle de cada estudio
- **Botón**: "Descargar PDF" (azul, en la cabecera)
- **Contenido**:
  - Captura visual completa de todo el estudio
  - Incluye gráficos, tablas y diseño profesional
  - Formato multipágina si el contenido es extenso

**Cómo usar:**
1. Abre cualquier estudio (botón "Ver")
2. En la cabecera, haz clic en "Descargar PDF"
3. Espera a que se genere (verás un toast de progreso)
4. El PDF se descargará automáticamente

---

### 3. Descarga Masiva - Todos los Estudios en ZIP
- **Ubicación**: "Mis Estudios", cabecera superior
- **Botón**: "Descargar Todos (ZIP)"
- **Contenido**:
  - Un archivo ZIP con PDFs individuales de todos tus estudios
  - Cada PDF tiene el formato completo del estudio
  - Nombre del archivo: `estudios_YYYY-MM-DD.zip`

**Cómo usar:**
1. Ve a "Mis Estudios"
2. En la cabecera superior, haz clic en "Descargar Todos (ZIP)"
3. Espera a que se generen todos los PDFs (verás el progreso)
4. Se descargará un archivo ZIP con todos tus estudios

**Ideal para:**
- Hacer respaldo de todos tus estudios
- Compartir múltiples estudios a la vez
- Archivar proyectos completos

---

### 4. Exportar a CSV (Excel/Hojas de Cálculo)
- **Ubicación**: "Mis Estudios", cabecera superior
- **Botón**: "Exportar CSV"
- **Contenido**:
  - Tabla con todos los estudios y sus métricas principales
  - Compatible con Excel, Google Sheets, etc.
  - Columnas incluidas:
    - Nombre del Proceso
    - Descripción
    - Estado
    - Fecha de Creación
    - Ciclos
    - Calificación (%)
    - Suplemento (%)
    - Tiempo Promedio (s)
    - Tiempo Normal (s)
    - Tiempo Estándar (s)

**Cómo usar:**
1. Ve a "Mis Estudios"
2. En la cabecera superior, haz clic en "Exportar CSV"
3. Abre el archivo en Excel o Google Sheets
4. Podrás crear tablas dinámicas, gráficos personalizados, etc.

**Ideal para:**
- Análisis avanzado en Excel
- Generar reportes personalizados
- Integrar datos con otras herramientas
- Presentaciones y reportes ejecutivos

---

### 5. Análisis - Exportar Gráficos a PDF
- **Ubicación**: Página "Análisis"
- **Botones**: 
  - "Exportar PDF (Imprimir)": Abre ventana de impresión del navegador
  - "Descargar PDF": Genera PDF automático con gráficos
- **Contenido**:
  - Panel de análisis completo
  - Gráficos de tiempos observados
  - Gráficos por ciclo
  - Métricas y conclusiones

**Cómo usar:**
1. Ve a "Análisis"
2. Selecciona un estudio y rango de fechas
3. Ajusta los gráficos visibles con los switches
4. Haz clic en "Descargar PDF" para generar automáticamente
5. O usa "Exportar PDF (Imprimir)" para personalizar la impresión

---

## 💡 Consejos y Buenas Prácticas

### Para PDFs Individuales:
- Usa el botón rápido desde "Mis Estudios" para descargas rápidas
- Abre el detalle del estudio para PDFs con diseño completo

### Para Descarga Masiva:
- Ideal para hacer respaldos periódicos
- Si tienes muchos estudios, la generación puede tardar unos segundos
- El archivo ZIP mantiene nombres únicos para cada estudio

### Para Exportar CSV:
- Perfecto para análisis estadístico en Excel
- El formato incluye encabezados en español
- Compatible con UTF-8 (acentos y caracteres especiales)
- Puedes filtrar, ordenar y crear gráficos personalizados

### Para Análisis:
- Oculta las series que no necesites antes de exportar
- El PDF captura exactamente lo que ves en pantalla
- Usa "Exportar PDF (Imprimir)" si necesitas ajustar márgenes o tamaño

---

## 🔧 Solución de Problemas

### El PDF no se descarga:
1. Verifica que tu navegador no esté bloqueando descargas automáticas
2. Revisa la consola del navegador (F12) para ver errores
3. Intenta con otro navegador (Chrome, Firefox, Edge)

### El ZIP tarda mucho:
- Es normal si tienes muchos estudios (cada PDF se genera individualmente)
- Verás un toast con el progreso
- No cierres la pestaña hasta que termine

### El CSV no se abre correctamente en Excel:
- El archivo incluye BOM UTF-8 para compatibilidad con Excel
- Si ves caracteres raros, abre con "Importar datos" y selecciona UTF-8

### El PDF se ve cortado:
- En "Análisis", oculta algunos gráficos si el contenido es muy largo
- El sistema divide automáticamente en páginas múltiples

---

## 📱 Compatibilidad Móvil

Todas las funcionalidades funcionan en móvil:
- Los botones se adaptan al tamaño de pantalla
- Las descargas funcionan igual que en escritorio
- Los PDFs y CSV se guardan en la carpeta de descargas del dispositivo

---

## 🚀 Próximas Mejoras

Funcionalidades en desarrollo:
- [ ] Personalizar logo y pie de página en PDFs
- [ ] Programar exportaciones automáticas
- [ ] Enviar PDFs por correo directamente desde la app
- [ ] Exportar a Excel (.xlsx) con múltiples hojas
- [ ] Gráficos personalizables en PDFs

---

## 📞 Soporte

Si encuentras algún problema:
1. Verifica que hayas aplicado todas las migraciones en Supabase
2. Asegúrate de tener estudios creados
3. Revisa la consola del navegador para errores técnicos
4. Reporta cualquier bug con el mensaje de error exacto
