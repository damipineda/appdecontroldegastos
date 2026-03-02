Voy a implementar la edición de transacciones y un módulo de comparativa mensual.

# Funcionalidades Nuevas

1.  **Edición de Transacciones (CRUD Completo)**:
    *   Agregaré un botón "Editar" (icono de lápiz) junto al de eliminar en las tablas.
    *   Al hacer clic, se cargarán los datos en el formulario correspondiente (Gasto o Ingreso).
    *   El formulario cambiará temporalmente a "Modo Edición" (el botón dirá "Actualizar" en vez de "Guardar").

2.  **Comparativa Mensual (Estadísticas Avanzadas)**:
    *   Crearé una nueva sección o pestaña "Comparativa".
    *   Permitirá seleccionar **dos periodos** diferentes (ej: Enero 2025 vs Febrero 2025).
    *   Mostrará gráficos comparativos de barras (Plotly) para ver la evolución de Ingresos y Gastos entre esos meses.

# Cambios Técnicos
1.  **JavaScript (Modelo)**:
    *   Agregar método `actualizarDato` en la clase `Store`.
2.  **JavaScript (UI)**:
    *   Lógica para rellenar formularios con datos existentes.
    *   Manejo del estado "Edición" (guardar el ID que se está editando).
    *   Lógica para generar gráficos comparativos con datos de múltiples meses.
3.  **HTML/CSS**:
    *   Nuevos botones de edición.
    *   Estructura para la nueva sección de comparativa.

# Pasos de Implementación
1.  **HTML**: Agregar modales o ajustar formularios para edición. Agregar pestaña "Comparativa".
2.  **JS (Store)**: Implementar función de actualización.
3.  **JS (UI)**: Implementar lógica de carga de datos y guardado de edición.
4.  **JS (Reportes)**: Crear lógica de gráficos comparativos.
