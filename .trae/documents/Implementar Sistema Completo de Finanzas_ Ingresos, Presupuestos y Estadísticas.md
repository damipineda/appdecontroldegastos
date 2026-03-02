Voy a realizar una actualización mayor para convertir la app en un Sistema de Gestión Financiera completo.

# Nuevas Estructuras de Datos
1.  **Ingresos**: Nueva clase y almacenamiento para gestionar entradas de dinero.
2.  **Campos Nuevos**:
    *   *Gastos*: Hora, Método de Pago, Recurrencia.
    *   *Ingresos*: Fuente, Categoría, Hora, Recurrencia.
3.  **Presupuestos**: Sistema para definir límites de gasto por categoría.

# Cambios en la Interfaz (UI)
1.  **Navegación por Pestañas**:
    *   **Dashboard/Estadísticas**: Gráficos (usando Chart.js) de Ingresos vs Gastos y distribución por categorías.
    *   **Movimientos**: Interfaz unificada o separada para registrar Ingresos y Gastos.
    *   **Configuración**: Gestión de Categorías y Presupuestos.
2.  **Formularios Mejorados**:
    *   Selectores para "Método de Pago" (Efectivo, Tarjeta, etc.).
    *   Inputs de Fecha y Hora.
    *   Opción "Es Recurrente" (Mensual).

# Lógica de Negocio (JavaScript)
1.  **Gestor de Recurrencia**: Al iniciar la app, el sistema verificará si hay transacciones recurrentes pendientes (ej: salario mensual) y las generará automáticamente.
2.  **Cálculo de Presupuestos**: Comparación en tiempo real de *Gasto Actual vs Presupuesto* con alertas visuales.
3.  **Gráficos**: Integración de **Chart.js** para visualizar la salud financiera.

# Pasos de Implementación
1.  **HTML**: Reestructurar el layout principal con pestañas y agregar CDN de Chart.js.
2.  **JS (Modelo)**: Actualizar clases `Gasto`, crear `Ingreso`, y lógica de `Store` para manejar múltiples tipos de datos.
3.  **JS (Controlador)**: Implementar lógica de recurrencia y generación de gráficos.
4.  **CSS**: Estilos para las nuevas pestañas, barras de progreso de presupuesto y gráficos.
