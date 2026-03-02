Voy a actualizar la aplicación para incluir soporte para Guaraníes, gestión de categorías personalizadas y filtrado mensual.

# Cambios Principales

1.  **Moneda Guaraní (PYG)**:
    *   Actualizaré el formato de moneda a `Gs.` y eliminaré los decimales (común en Guaraníes).
    *   Usaré el formato local de Paraguay (miles separados por puntos).

2.  **Gestión de Categorías con Color y Emojis**:
    *   Crearé un sistema para guardar categorías en `localStorage` (como JSON).
    *   Añadiré una funcionalidad para **crear nuevas categorías**, eligiendo nombre, color y un emoji.
    *   Las categorías predeterminadas tendrán emojis y colores asignados.

3.  **Filtrado por Meses**:
    *   Agregaré un selector de mes (tipo `input type="month"`) en la interfaz.
    *   La tabla de gastos solo mostrará los registros del mes seleccionado.
    *   El total se recalculará según el mes visible.

4.  **Persistencia y Datos**:
    *   Actualizaré la estructura de datos para guardar fechas en un formato estándar (ISO) que facilite el filtrado.
    *   Aseguraré que tanto gastos como categorías se guarden en JSON dentro del navegador.

# Pasos de Implementación
1.  **Modificar HTML**: Agregar el selector de fecha (mes) y un modal/formulario para crear categorías.
2.  **Actualizar Lógica (JS)**:
    *   Implementar formateador de moneda PYG.
    *   Crear lógica para administrar categorías (Guardar/Cargar/Crear).
    *   Modificar el guardado de gastos para incluir la fecha completa.
    *   Implementar el filtro de visualización por mes.
3.  **Estilos (CSS)**: Ajustar el diseño para los nuevos elementos (filtros, etiquetas de categorías con color).
