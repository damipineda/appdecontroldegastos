# 💰 Control de Gastos Personales

Aplicación web para gestionar finanzas personales, controlar gastos, ingresos, deudas y presupuestos.

## ✨ Características

- 📊 **Dashboard** con gráficos interactivos
- 💵 **Registro de gastos e ingresos** por categoría
- 📈 **Análisis mensual** con comparativas
- 🎯 **Presupuestos** por categoría
- 🔄 **Pagos recurrentes** (plantillas)
- 💳 **Gestión de deudas** con seguimiento de cuotas
- 🔐 **Autenticación** con email o redes sociales
- ☁️ **Sincronización** en la nube con Supabase

## 🛠️ Tecnologías

- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5
- Plotly.js (gráficos)
- Supabase (backend y autenticación)
- Picmo (emoji picker)

## 🚀 Demo

https://appdecontroldegastos.vercel.app

## 📱 Google Sign-In nativo (Capacitor)

Para login de Google dentro de la app móvil (sin navegador externo):

1. Configura tu `Web client ID` de Google en [`index.html`](index.html) usando el meta:
   - `<meta name="google-web-client-id" content="TU_CLIENT_ID.apps.googleusercontent.com">`
2. Verifica que ese mismo cliente esté permitido en Supabase Auth (Google provider).
3. Ejecuta `npm run cap:sync` y recompila Android.

## 📄 Licencia

MIT
