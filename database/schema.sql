-- Esquema principal de la base de datos para ERP Multicajas RD

-- Tabla de Configuración
CREATE TABLE IF NOT EXISTS configuracion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  tipo TEXT DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rol TEXT DEFAULT 'Vendedor', -- e.g., 'Vendedor', 'Supervisor', 'Administrador'
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Cajas
CREATE TABLE IF NOT EXISTS cajas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  activa INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    tipo_cliente TEXT NOT NULL DEFAULT 'Persona Fisica', -- 'Persona Fisica' o 'Empresa'
    cedula TEXT UNIQUE,
    rnc TEXT UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Categorías de Productos
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    activa INTEGER DEFAULT 1
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    codigo_barras TEXT UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER NOT NULL,
    precio_costo REAL NOT NULL,
    precio_venta REAL NOT NULL,
    stock_actual REAL DEFAULT 0,
    stock_minimo REAL DEFAULT 5,
    aplica_itbis INTEGER DEFAULT 1, -- 1 si aplica, 0 si no
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
);

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_factura TEXT UNIQUE NOT NULL,
    caja_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal REAL NOT NULL,
    itbis REAL NOT NULL,
    total REAL NOT NULL,
    metodo_pago TEXT NOT NULL, -- e.g., 'Efectivo', 'Tarjeta', 'Transferencia'
    efectivo_recibido REAL,
    cambio REAL,
    estado TEXT DEFAULT 'Completada', -- e.g., 'Completada', 'Anulada'
    ncf TEXT,
    FOREIGN KEY (caja_id) REFERENCES cajas (id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
);

-- Tabla de Detalles de Venta
CREATE TABLE IF NOT EXISTS ventas_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    itbis REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas (id),
    FOREIGN KEY (producto_id) REFERENCES productos (id)
);

-- Inserts iniciales (Datos básicos para empezar)
INSERT OR IGNORE INTO configuracion (clave, valor, descripcion, tipo) VALUES 
('ITBIS_PORCENTAJE', '18.00', 'Porcentaje de ITBIS', 'decimal'),
('MONEDA', 'DOP', 'Moneda principal', 'text'),
('NOMBRE_EMPRESA', 'Mi Empresa', 'Nombre de la empresa', 'text');

INSERT OR IGNORE INTO usuarios (codigo, nombre, apellido, username, password, rol) VALUES 
('ADMIN001', 'Administrador', 'Sistema', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador'); -- La contraseña es 'password'

INSERT OR IGNORE INTO cajas (codigo, nombre) VALUES 
('CAJA01', 'Caja Principal');

INSERT OR IGNORE INTO clientes (codigo, nombre, apellido) VALUES 
('CLI-GENERICO', 'Cliente', 'Genérico');

INSERT OR IGNORE INTO categorias (nombre, descripcion) VALUES 
('General', 'Categoría por defecto para todos los productos');

-- Tablas adicionales para completar el esquema --

-- Tabla de Proveedores (para Compras)
CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rnc TEXT UNIQUE,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Compras
CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL, -- N�mero de factura del proveedor
    proveedor_id INTEGER,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal REAL NOT NULL DEFAULT 0,
    itbis REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente', -- e.g., 'Pendiente', 'Pagada', 'Anulada'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores (id)
);

-- Tabla de Detalles de Compra
CREATE TABLE IF NOT EXISTS compras_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_costo_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    itbis REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (compra_id) REFERENCES compras (id),
    FOREIGN KEY (producto_id) REFERENCES productos (id)
);

-- Tabla de Conductores (para Despachos)
CREATE TABLE IF NOT EXISTS conductores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT,
    licencia TEXT UNIQUE,
    telefono TEXT,
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Despachos
CREATE TABLE IF NOT EXISTS despachos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    conductor_id INTEGER NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    direccion TEXT NOT NULL,
    estado TEXT DEFAULT 'Pendiente', -- e.g., 'Pendiente', 'En Ruta', 'Entregado', 'Cancelado'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas (id),
    FOREIGN KEY (conductor_id) REFERENCES conductores (id)
);

-- Tabla de Apartados
CREATE TABLE IF NOT EXISTS apartados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL, -- N�mero de apartado
    cliente_id INTEGER NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME,
    total REAL NOT NULL,
    abonado REAL DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente', -- e.g., 'Pendiente', 'Completado', 'Cancelado'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
);

-- Tabla de Detalles de Apartado
CREATE TABLE IF NOT EXISTS apartados_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apartado_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    itbis REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (apartado_id) REFERENCES apartados (id),
    FOREIGN KEY (producto_id) REFERENCES productos (id)
);

-- Tabla de Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL, -- N�mero de cotizaci�n
    cliente_id INTEGER,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME,
    total REAL NOT NULL,
    estado TEXT DEFAULT 'Pendiente', -- e.g., 'Pendiente', 'Aceptada', 'Rechazada', 'Convertida'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
);

-- Tabla de Detalles de Cotizaci�n
CREATE TABLE IF NOT EXISTS cotizaciones_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotizacion_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    itbis REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones (id),
    FOREIGN KEY (producto_id) REFERENCES productos (id)
);

-- Tabla de Asientos Contables (generalizada)
CREATE TABLE IF NOT EXISTS asientos_contables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    monto REAL NOT NULL,
    tipo TEXT, -- 'Debe' o 'Haber'
    cuenta_id INTEGER, -- Referencia a una tabla de cuentas (si existe)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Notas de Cr�dito
CREATE TABLE IF NOT EXISTS notas_credito (


-- Tabla de Notas de Crédito
CREATE TABLE IF NOT EXISTS notas_credito (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  cliente_id INTEGER,
  monto REAL NOT NULL,
  razon TEXT,
  fecha TEXT NOT NULL,
  estado TEXT DEFAULT 'Emitida',
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);



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

