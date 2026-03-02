# Copilot Instructions for AI Coding Agents

## Visión General del Proyecto

Esta es una aplicación web para control de gastos personales. Utiliza HTML, CSS y JavaScript puro, con integración a Supabase para backend y despliegue en Vercel. No hay frameworks frontend ni herramientas de build complejas.

## Estructura Principal

- `index.html`: Punto de entrada de la app, incluye los scripts y estilos principales.
- `css/style.css`: Estilos globales de la aplicación.
- `js/app.js`: Toda la lógica de frontend, incluyendo interacción con Supabase.
- `supabase_schema.sql`: Esquema de la base de datos para Supabase.
- `vercel.json`: Configuración de despliegue para Vercel.

## Flujos y Patrones Clave

- **Persistencia de datos**: Toda la persistencia se realiza vía Supabase. Consulta y actualiza datos usando la API JS de Supabase desde `js/app.js`.
- **Despliegue**: El proyecto está preparado para desplegarse en Vercel. No requiere pasos de build, solo subir los archivos.
- **Estilos**: Usa un solo archivo CSS global. No hay preprocesadores ni utilidades CSS avanzadas.
- **Estructura JS**: Toda la lógica está centralizada en un solo archivo JS. No hay módulos ni separación avanzada.

## Convenciones Específicas

- Mantén la lógica de negocio y la manipulación del DOM en funciones separadas dentro de `js/app.js`.
- Usa nombres descriptivos en variables y funciones, en español.
- Los datos sensibles o claves API deben mantenerse fuera del código fuente y configurarse en el dashboard de Supabase/Vercel.
- Sigue el patrón de interacción directa con el DOM (no hay frameworks ni virtual DOM).

## Integraciones

- **Supabase**: Consulta el archivo `supabase_schema.sql` para entender la estructura de datos. Usa la librería oficial JS de Supabase para todas las operaciones CRUD.
- **Vercel**: El archivo `vercel.json` define rutas y configuración de despliegue. No modifiques sin revisar la documentación de Vercel.

## Ejemplo de flujo típico

1. Usuario ingresa un gasto en la UI.
2. JS captura el evento, valida datos y llama a Supabase para guardar el gasto.
3. Al guardar, se actualiza la lista de gastos en el DOM.

## Archivos clave para patrones

- Lógica de gastos: `js/app.js`
- Esquema de datos: `supabase_schema.sql`
- Configuración de despliegue: `vercel.json`

## Otros

- No hay tests automatizados ni scripts de build.
- No uses dependencias externas salvo Supabase JS.
- Documenta funciones complejas con comentarios en español.
