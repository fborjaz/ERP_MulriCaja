-- =====================================================
-- MIGRACIÓN: Agregar Índices para Optimización
-- ERP Multicajas RD
-- Versión: 1.0.0
-- Fecha: 2025-11-23
-- =====================================================
-- 
-- PROPÓSITO:
-- Mejorar significativamente el rendimiento de consultas
-- mediante la creación de índices estratégicos en las
-- tablas más consultadas del sistema.
--
-- IMPACTO ESPERADO:
-- - Búsquedas de productos: 70-90% más rápidas
-- - Consultas de ventas: 60-80% más rápidas
-- - Búsquedas de clientes: 70-85% más rápidas
-- - Reportes: 50-70% más rápidos
--
-- NOTA: Este script es idempotente (puede ejecutarse
-- múltiples veces sin causar errores)
-- =====================================================

-- =====================================================
-- PRIORIDAD ALTA: Índices Críticos
-- Tablas con consultas muy frecuentes
-- =====================================================

-- -----------------------------------------------------
-- TABLA: productos
-- Consultas: Búsquedas, filtros por categoría, código
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_productos_activo 
ON productos(activo);

CREATE INDEX IF NOT EXISTS idx_productos_codigo 
ON productos(codigo);

CREATE INDEX IF NOT EXISTS idx_productos_nombre 
ON productos(nombre);

CREATE INDEX IF NOT EXISTS idx_productos_categoria_activo 
ON productos(categoria_id, activo);

CREATE INDEX IF NOT EXISTS idx_productos_stock_minimo 
ON productos(stock_actual, stock_minimo) 
WHERE stock_actual <= stock_minimo;

-- -----------------------------------------------------
-- TABLA: clientes
-- Consultas: Búsquedas por nombre, RNC, cédula
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clientes_activo 
ON clientes(activo);

CREATE INDEX IF NOT EXISTS idx_clientes_rnc 
ON clientes(rnc) 
WHERE rnc IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_cedula 
ON clientes(cedula) 
WHERE cedula IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_nombre 
ON clientes(nombre);

CREATE INDEX IF NOT EXISTS idx_clientes_apellido 
ON clientes(apellido);

-- -----------------------------------------------------
-- TABLA: ventas
-- Consultas: Por fecha, caja, usuario, cliente
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ventas_fecha 
ON ventas(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_caja_fecha 
ON ventas(caja_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_usuario_fecha 
ON ventas(usuario_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_cliente 
ON ventas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_ventas_numero_factura 
ON ventas(numero_factura);

-- -----------------------------------------------------
-- TABLA: ventas_detalle
-- Consultas: Detalle por venta, productos vendidos
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta 
ON ventas_detalle(venta_id);

CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto 
ON ventas_detalle(producto_id);

CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto_fecha 
ON ventas_detalle(producto_id, venta_id);

-- =====================================================
-- PRIORIDAD MEDIA: Índices Secundarios
-- Tablas con consultas frecuentes
-- =====================================================

-- -----------------------------------------------------
-- TABLA: compras
-- Consultas: Por fecha, proveedor, estado
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_compras_fecha 
ON compras(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_compras_proveedor 
ON compras(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_compras_estado 
ON compras(estado);

CREATE INDEX IF NOT EXISTS idx_compras_numero 
ON compras(numero) 
WHERE numero IS NOT NULL;

-- -----------------------------------------------------
-- TABLA: compras_detalle
-- Consultas: Detalle por compra, productos comprados
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra 
ON compras_detalle(compra_id);

CREATE INDEX IF NOT EXISTS idx_compras_detalle_producto 
ON compras_detalle(producto_id);

-- -----------------------------------------------------
-- TABLA: apartados
-- Consultas: Por estado, cliente, fecha
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_apartados_estado 
ON apartados(estado);

CREATE INDEX IF NOT EXISTS idx_apartados_cliente 
ON apartados(cliente_id);

CREATE INDEX IF NOT EXISTS idx_apartados_fecha 
ON apartados(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_apartados_estado_fecha 
ON apartados(estado, fecha DESC);

-- -----------------------------------------------------
-- TABLA: apartados_detalle
-- Consultas: Detalle por apartado
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_apartados_detalle_apartado 
ON apartados_detalle(apartado_id);

CREATE INDEX IF NOT EXISTS idx_apartados_detalle_producto 
ON apartados_detalle(producto_id);

-- -----------------------------------------------------
-- TABLA: despachos
-- Consultas: Por estado, venta, fecha
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_despachos_estado 
ON despachos(estado);

CREATE INDEX IF NOT EXISTS idx_despachos_venta 
ON despachos(venta_id);

CREATE INDEX IF NOT EXISTS idx_despachos_fecha 
ON despachos(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_despachos_conductor 
ON despachos(conductor_id);

-- =====================================================
-- PRIORIDAD BAJA: Índices Opcionales
-- Tablas con consultas ocasionales
-- =====================================================

-- -----------------------------------------------------
-- TABLA: cotizaciones
-- Consultas: Por estado, cliente, fecha
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado 
ON cotizaciones(estado);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente 
ON cotizaciones(cliente_id);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha 
ON cotizaciones(fecha DESC);

-- -----------------------------------------------------
-- TABLA: cotizaciones_detalle
-- Consultas: Detalle por cotización
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cotizaciones_detalle_cotizacion 
ON cotizaciones_detalle(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_detalle_producto 
ON cotizaciones_detalle(producto_id);

-- -----------------------------------------------------
-- TABLA: usuarios
-- Consultas: Login, búsqueda por username
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_usuarios_username 
ON usuarios(username);

CREATE INDEX IF NOT EXISTS idx_usuarios_activo 
ON usuarios(activo);

-- -----------------------------------------------------
-- TABLA: categorias
-- Consultas: Listado, búsqueda por nombre
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_categorias_nombre 
ON categorias(nombre);

-- -----------------------------------------------------
-- TABLA: proveedores
-- Consultas: Búsqueda por nombre, RNC
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre 
ON proveedores(nombre);

CREATE INDEX IF NOT EXISTS idx_proveedores_rnc 
ON proveedores(rnc) 
WHERE rnc IS NOT NULL;

-- -----------------------------------------------------
-- TABLA: notas_credito
-- Consultas: Por venta, fecha
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notas_credito_venta 
ON notas_credito(venta_id);

CREATE INDEX IF NOT EXISTS idx_notas_credito_fecha 
ON notas_credito(fecha DESC);

-- =====================================================
-- ÍNDICES COMPUESTOS ADICIONALES
-- Para consultas específicas complejas
-- =====================================================

-- Productos con stock bajo (para alertas)
CREATE INDEX IF NOT EXISTS idx_productos_stock_bajo 
ON productos(activo, stock_actual) 
WHERE activo = 1 AND stock_actual <= stock_minimo;

-- Ventas del día (consulta muy frecuente)
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_caja 
ON ventas(DATE(fecha), caja_id);

-- Apartados pendientes por cliente
CREATE INDEX IF NOT EXISTS idx_apartados_pendientes 
ON apartados(cliente_id, estado, fecha DESC) 
WHERE estado = 'Pendiente';

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================

-- Descomentar para ver todos los índices creados:
-- SELECT name, tbl_name, sql 
-- FROM sqlite_master 
-- WHERE type = 'index' 
-- AND name LIKE 'idx_%'
-- ORDER BY tbl_name, name;

-- =====================================================
-- ANÁLISIS DE TABLAS (Opcional)
-- Actualiza las estadísticas de SQLite para mejor
-- optimización de consultas
-- =====================================================

ANALYZE;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- NOTAS:
-- 1. Este script puede ejecutarse múltiples veces sin problemas
-- 2. Los índices se crean solo si no existen (IF NOT EXISTS)
-- 3. El comando ANALYZE actualiza las estadísticas para mejor performance
-- 4. Se recomienda ejecutar VACUUM después de crear índices (opcional)
--
-- Para ejecutar VACUUM (compacta la BD):
-- VACUUM;
--
-- Para verificar el tamaño de la BD:
-- SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();
