# Migración a Stack Profesional (React + TypeScript + Vite + Bootstrap + Supabase)

Este documento explica el diseño actual, el stack destino y los pasos concretos para migrar la app "Control de Gastos" desde HTML/CSS/JS vanilla hacia una SPA moderna usando React + TypeScript, manteniendo Bootstrap y Supabase.

---

**Resumen del estado actual (diseño actual)**

- Frontend estático: `index.html`, `css/style.css`, `js/app.js` (toda la lógica centralizada en un único archivo `app.js`).
- Backend/DB: Supabase (Postgres). Esquema: `supabase_schema.sql`.
- Deploy: Vercel (`vercel.json`).
- Librerías en uso: Bootstrap (CDN), Plotly, Picmo, Supabase JS.

Problemas observados a resolver:

- `app.js` monolítico: difícil de mantener y probar.
- Cargas lentas al traer todo el historial (N+1 y filtrado cliente).
- Bugs de UI (modales/backdrop) por lógica DOM manual.
- Seguridad: claves en código y falta de políticas RLS visibles.

---

## Stack destino (único y definitivo)

- Frontend: React + TypeScript
- Build & Dev: Vite
- UI: Bootstrap 5 (mantener clases y estilos actuales)
- Fetching / cache: TanStack Query (react-query)
- Formularios: React Hook Form
- Validación: Zod
- Charts: Chart.js + react-chartjs-2
- Emoji picker: picmo (react-picmo o wrapper simple)
- Supabase: `@supabase/supabase-js` (mismo servicio)
- Lint & formatting: ESLint + Prettier + Husky + lint-staged
- Testing: Vitest + @testing-library/react; E2E opcional Playwright/Cypress
- CI: GitHub Actions, Dependabot
- Observabilidad: Sentry
- Seguridad: RLS en Postgres; Serverless Functions en Vercel para operaciones con `service_role`

---

## Mapeo (cómo se transforma lo actual → nuevo)

- `src/lib/supabase.ts` (instancia supabase y helpers)
- `src/api/transactions.ts` (funciones CRUD equivalentes a `Store`)
- `src/hooks/useTransactions.ts` (react-query hooks)
- `src/components/*` (FormGasto, ListaGastos, ModalRecurrente, Charts)
- `src/pages/Dashboard.tsx` (vistas principales)

---

## Diseño actual (detallado) — mantener exactamente al migrar

Para evitar pérdida visual al migrar, acá se documenta el diseño/DOM actual — IDs, modales, formularios, contenedores y librerías usadas. Mantener estas piezas (o mapearlas 1:1 a componentes) asegura que el aspecto no cambie.

- Estructura general:

  - `nav.navbar` superior con `#userEmail` y `#btnLogout`.
  - Filtro de periodo: `<input type="month" id="filtroMes">` en la parte superior derecha.
  - Pestañas principales (Bootstrap `nav-tabs`) con IDs: `dashboard-tab`, `gastos-tab`, `ingresos-tab`, `presupuesto-tab`, `planificacion-tab`.

- Dashboard (tab `#dashboard`):

  - Cards resumen con `#dashIngresos`, `#dashGastos`, `#dashBalance`.
  - Zona de gráficos: `#chartGastos` y otros contenedores de Plotly.

- Gasto / Ingreso (formularios):

  - Gasto: form con `id="gastoForm"` y campos:
    - `#gastoConcepto`, `#gastoMonto`, `#gastoFecha`, `#gastoHora`, `#gastoCategoria`, `#gastoMetodo`, `#gastoRecurrente` (checkbox), `#gastoDeuda`, `#gastoPlantilla`.
    - Botones: `#btnGastoSubmit`, `#btnGastoCancel`.
  - Ingreso: form `id="ingresoForm"` con campos análogos (`#ingresoCategoria`, `#ingresoMonto`, etc.) y botones `#btnIngresoSubmit`, `#btnIngresoCancel`.

- Planificación (tab `#planificacion`): diseño en dos columnas:

  - Izquierda: `Plantillas / Recurrentes`
    - Lista contenedor `#listaRecurrentes` con items que incluyen botones con clases `btn-edit-rec` y `btn-del-rec` (atributo `data-id`).
    - Botón nuevo: `#btnAddRecurrente` (abre `#modalRecurrente`).
  - Derecha: `Control de Deudas`
    - Lista contenedor `#listaDeudas` con botones `btn-edit-deuda`, `btn-del-deuda`.
    - Botón nuevo: `#btnAddDeuda` (abre `#modalDeuda`).

- Modales importantes (mantener `id` y estructura):

  - `#modalRecurrente` (data-bs-backdrop="static"). Form `#formRecurrente` con campos: `#recIdEdit`, `#recConcepto`, `#recMonto`, `#recCategoria`, `#recDia`, botón emoji `#btnEmojiRec`, y `#btnGuardarRecurrente`.
  - `#modalDeuda` con `#formDeuda`, `#btnGuardarDeuda`.
  - `#modalCategoria` (gestión de categorías) con `#formCategoria`, `#btnGuardarCategoria`.
  - `#modalPresupuesto` con `#formPresupuesto`, `#btnGuardarPresupuesto`.
  - `#modalLogin` (bloqueante) con `#formLogin`, botones `#btnLogin`, `#btnRegister`, `#btnLoginGoogle`, `#btnLoginFacebook`.

- Pickers y widgets:

  - Emoji picker invocado por `#btnEmojiRec` y `#btnEmojiDeuda` (se usa `picmo`).
  - Plots: Plotly se usa actualmente en `#chartGastos`, `#chartCompBalance`, `#chartCompGastos`.

- Tablas / listas:

  - Tabla de gastos `#listaGastos` (tbody) y tabla de ingresos `#listaIngresos`.
  - Mensajes vacíos: `#noGastos`, `#noIngresos`, `#noRecurrentes`, `#noDeudas`.

- Clase y estilo:

  - Bootstrap 5 (CDN) + `css/style.css` con overrides.
  - Uso intensivo de utilidades de Bootstrap (cards, badges, progress, btn-groups).

- Eventos & comportamiento a preservar:
  - Al guardar un gasto/ingreso se mantiene el `filtroMes` y la lista debe refrescar solo el mes actual.
  - Los modales usan `data-bs-backdrop="static"` en varios casos; al migrar, el comportamiento de cierre (escape/click fuera) debe conservarse.
  - Los botones de editar muestran el modal correspondiente y rellenan los campos (`data-id` → API `obtenerDatoPorId`).
  - `UI.setLoadingButton(btnId, true)` se usa para mostrar spinner en los submits; conservar UX.

---

### Cómo mapear a React (recomendación 1:1)

- Mantener los mismos `id` y `data-id` en los componentes que correspondan (ej. `FormGasto` puede renderizar `input` con `id="gastoConcepto"` temporalmente) durante la transición para facilitar QA visual.
- Renderizar modales Bootstrap usando el markup oficial y controlar apertura/cierre vía React refs y `bootstrap.Modal.getOrCreateInstance`.
- Conservar clases Bootstrap y la jerarquía HTML (cards, badges, progress) para que `css/style.css` siga aplicando.

---

Con esto la migración podrá ser incremental sin cambios visuales indeseados: primero migrás la lógica, luego reemplazás `app.js` y, por último, limpias los IDs temporales si querés.

## Plan de migración (pasos concretos, sin cortar producción)

1. Crear rama de trabajo: `feat/migracion-react`

2. Scaffolding inicial (en tu máquina):

```bash
# Crear proyecto Vite con React + TS
npm create vite@latest appdecontroldegastos-frontend -- --template react-ts
cd appdecontroldegastos-frontend

# Instalar dependencias principales
npm install @supabase/supabase-js @tanstack/react-query react-hook-form zod picmo chart.js react-chartjs-2 bootstrap

# Dev
npm run dev
```

3. Copiar estilos y assets: copiar `css/style.css` y assets (íconos) a `public/` o `src/styles/` y añadir Bootstrap en `index.html` o importarlo desde `src/main.tsx`.

4. Crear `src/lib/supabase.ts` con la instancia del cliente. **Importante**: usar variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) y no escribir claves en el código.

5. Implementar `src/api/transactions.ts` con funciones equivalentes a `Store` (obtenerDatos, guardarDato, actualizarDato). Estas funciones no hacen cache; serán usadas por react-query.

6. Configurar `react-query` en `src/main.tsx` (QueryClient / QueryClientProvider). Crear hooks reutilizables `useTransactions(mes)` y `useCategories()`.

7. Migrar primero: historial (ListaGastos) y formularios (Gasto/Ingreso) — prioridad máxima:

   - Crear `FormGasto.tsx` con `react-hook-form` + `zod`.
   - Crear `ListaGastos.tsx` que use `useQuery(['transactions', mes, 'gasto'], ...)`.
   - Al insertar, usar `useMutation` y `onSuccess` invalidar la query del mes actual (refetch automático).

8. Migrar modales: reemplazar manipulación manual de DOM por componentes React (ModalRecurrente). Mantener markup Bootstrap para minimizar cambios CSS.

9. Migrar gráficos: reemplazar Plotly por `react-chartjs-2` y crear `ChartGastos.tsx`.

10. Seguridad y despliegue:

    - Mover claves a Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend). Guardar `SUPABASE_SERVICE_ROLE` como secret solo para funciones serverless.
    - Habilitar RLS en Supabase y añadir políticas por tabla: `user_id = auth.uid()` para SELECT/INSERT/UPDATE/DELETE.
    - Crear funciones serverless en Vercel para tareas privilegiadas (imports, procesos masivos).

11. Calidad: configurar ESLint/Prettier, Husky y Vitest; añadir pipeline básico en GitHub Actions (lint + tests).

12. Gradual cutover: mantener la app legacy (actual `index.html`) en una ruta o en la rama `main` hasta completar migración. Deploys en Vercel por rama permiten validar antes de cambiar a producción.

---

## Comandos y archivos que vas a crear (ejemplos)

- `src/lib/supabase.ts`
- `src/api/transactions.ts`
- `src/hooks/useTransactions.ts`
- `src/components/forms/FormGasto.tsx`
- `src/components/lists/ListaGastos.tsx`
- `src/pages/Dashboard.tsx`
- `src/main.tsx`
- `vite.config.ts`
- `tsconfig.json`
- `package.json` (con dependencias indicadas)

Ejemplo minimal `src/lib/supabase.ts` (estructural):

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Ejemplo de `useTransactions` hook (esqueleto):

```ts
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getTransactions, addTransaction } from "../api/transactions";

export function useTransactions(mes, tipo) {
  return useQuery(["transactions", mes, tipo], () =>
    getTransactions(tipo, mes)
  );
}
```

---

## Recomendaciones de seguridad (recordatorio rápido)

- Activar RLS en todas las tablas sensibles (transactions, categories, budgets, recurrent_templates, debts).
- No exponer `service_role` en frontend. Usar serverless functions para operaciones privilegiadas.
- En Vercel: configurar variables de entorno en Dashboard (no en código).
- Añadir CSP y headers seguros en `vercel.json`.

---

## Prioridad mínima para ver mejoras rápidas (2-4 días de trabajo estimado)

1. Extraer llamadas DB filtradas por mes (ya parcialmente corregido en `js/app.js`).
2. Mover claves a variables de entorno y revisar RLS.
3. Migrar historial a React + react-query y formularios críticos (Gasto/Ingreso).
4. Añadir ESLint/Prettier y pipeline CI básico.

---

## Qué entrego si querés que lo haga yo

- Plantilla base Vite + React + TS configurada con Bootstrap.
- `src/lib/supabase.ts` y `src/api/transactions.ts` iniciales.
- Migración de `FormGasto` y `ListaGastos` como ejemplo completo.
- Archivo `vercel.json` con headers de seguridad sugeridos.

---

Si querés que genere ahora la plantilla base (`package.json`, `vite` scaffold) o que implemente el primer formulario migrado como ejemplo, decime cuál prefieres y lo creo en la rama/archivos del workspace.
