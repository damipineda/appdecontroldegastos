Voy a mejorar el diseño y las funcionalidades de la aplicación integrando las librerías solicitadas.

# Cambios Principales

1.  **Diseño y UI (CSS)**:
    *   Implementaré una paleta de colores más moderna y profesional (estilo Fintech).
    *   Mejoraré las tarjetas, sombras y tipografía (usando Google Fonts).
    *   Diseño responsivo refinado.

2.  **Gráficos con Plotly.js**:
    *   Reemplazaré **Chart.js** por **Plotly.js**.
    *   Crearé gráficos interactivos:
        *   **Dona**: Distribución de gastos por categoría.
        *   **Barras**: Comparativa Ingresos vs Gastos.

3.  **Selector de Emojis**:
    *   Nota: La librería `SimpleEmojisJs` no tiene un CDN público estable. Usaré **Picmo**, que es una alternativa moderna, robusta y muy similar, para asegurar que la app funcione correctamente sin descargar archivos manuales.
    *   Integraré el selector en el modal de creación de categorías.

4.  **Selector de Colores (Vanilla Picker)**:
    *   Integraré **vanilla-picker** para reemplazar el input de color nativo, permitiendo una selección más precisa y visual.

# Pasos de Implementación
1.  **HTML**:
    *   Agregar CDNs (Plotly, Vanilla Picker, Picmo, Google Fonts).
    *   Reemplazar `<canvas>` de Chart.js por `<div>` para Plotly.
    *   Preparar contenedores para los pickers en el modal.
2.  **JavaScript**:
    *   Reescribir la lógica de gráficos usando `Plotly.newPlot`.
    *   Inicializar `Picker` (color) y `createPicker` (emojis) en el modal de categorías.
    *   Conectar los selectores con los inputs ocultos del formulario.
3.  **CSS**:
    *   Aplicar el nuevo sistema de diseño (variables CSS, gradientes, espaciado).
