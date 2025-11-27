-- =====================================================
-- SCHEMA IMAXPOS COMPLETO - COMPATIBLE CON SQLITE
-- Adaptado desde: u910646980_imaxpos-VACIA.sql
-- Total de tablas: 154
-- Motor: SQLite 3
-- Versión: 1.0.0
-- Fecha: 2025-11-24
-- =====================================================
-- 
-- NOTAS DE CONVERSIÓN MySQL → SQLite:
-- - BIGINT → INTEGER
-- - DECIMAL(18,2) → REAL
-- - DATETIME → DATETIME (texto ISO8601)
-- - ENUM → TEXT con CHECK constraint
-- - AUTO_INCREMENT → AUTOINCREMENT
-- - TINYINT(1) → INTEGER (0 o 1)
-- - DEFAULT CURRENT_TIMESTAMP → DEFAULT CURRENT_TIMESTAMP
-- - ON UPDATE CURRENT_TIMESTAMP → Se maneja con triggers
-- 
-- =====================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- =====================================================
-- TABLAS DE CONTROL DE SINCRONIZACIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL UNIQUE,
  last_sync DATETIME,
  sync_status TEXT DEFAULT 'pending',
  total_records INTEGER DEFAULT 0,
  synced_records INTEGER DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL, -- 'pull', 'push', 'full'
  table_name TEXT,
  operation TEXT, -- 'insert', 'update', 'delete'
  record_id INTEGER,
  status TEXT, -- 'success', 'error', 'conflict'
  error_message TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  local_data TEXT, -- JSON
  remote_data TEXT, -- JSON
  resolution TEXT, -- 'local', 'remote', 'manual'
  resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS sync_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_url TEXT NOT NULL,
  empresa_id INTEGER,
  auth_token TEXT,
  auto_sync INTEGER DEFAULT 1,
  sync_interval INTEGER DEFAULT 300, -- segundos
  last_successful_sync DATETIME,
  enabled INTEGER DEFAULT 1
);

-- =====================================================
-- MÓDULO: AJUSTES DE INVENTARIO (4 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS ajuste (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  local_id INTEGER NOT NULL,
  moneda_id INTEGER NOT NULL,
  fecha DATETIME NOT NULL,
  operacion VARCHAR(5) NOT NULL,
  io VARCHAR(2) NOT NULL,
  documento VARCHAR(5) NOT NULL,
  serie VARCHAR(45),
  numero VARCHAR(45),
  estado VARCHAR(45) NOT NULL,
  total_importe REAL DEFAULT 0.00,
  tasa_cambio REAL DEFAULT 0,
  operacion_otros VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ajustedetalle (
  id_ajustedetalle INTEGER PRIMARY KEY AUTOINCREMENT,
  id_ajusteinventario INTEGER,
  cantidad_detalle REAL,
  fraccion_detalle REAL,
  old_cantidad REAL,
  old_fraccion REAL,
  id_producto_almacen INTEGER,
  id_unidad INTEGER
);

CREATE TABLE IF NOT EXISTS ajusteinventario (
  id_ajusteinventario INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha DATETIME,
  descripcion VARCHAR(45),
  local_id INTEGER,
  usuario_encargado INTEGER
);

CREATE TABLE IF NOT EXISTS ajuste_detalle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ajuste_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  unidad_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  costo_unitario REAL
);

-- =====================================================
-- MÓDULO: APERTURA Y CIERRE DE CAJA (1 tabla)
-- =====================================================

CREATE TABLE IF NOT EXISTS apertura (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  local_id INTEGER NOT NULL,
  moneda_id INTEGER NOT NULL,
  monto REAL NOT NULL DEFAULT 0.00,
  fecha INTEGER NOT NULL,
  estado INTEGER NOT NULL
);

-- =====================================================
-- MÓDULO: CONTABILIDAD (7 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS asientos_contables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  fecha DATETIME NOT NULL,
  modulo VARCHAR(20) NOT NULL,
  tipo_id INTEGER NOT NULL,
  referencia_id INTEGER NOT NULL,
  total REAL NOT NULL,
  estado INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS asientos_contables_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  asiento_id INTEGER NOT NULL,
  cuenta_id INTEGER NOT NULL,
  debito REAL NOT NULL,
  credito REAL NOT NULL,
  fecha DATETIME NOT NULL,
  estado INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS balances_iniciales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  fecha DATETIME NOT NULL,
  estado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS periodos_contables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  cerrado INTEGER DEFAULT 0,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS periodos_contables_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  periodo_id INTEGER NOT NULL,
  cuenta_id INTEGER NOT NULL,
  balance_inicial REAL DEFAULT 0,
  debitos REAL DEFAULT 0,
  creditos REAL DEFAULT 0,
  balance_final REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS entrada_diario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  tipo_id INTEGER NOT NULL,
  fecha DATETIME NOT NULL,
  descripcion TEXT,
  total REAL NOT NULL,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS entrada_diario_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  entrada_id INTEGER NOT NULL,
  cuenta_id INTEGER NOT NULL,
  debito REAL DEFAULT 0,
  credito REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS entrada_diario_tipos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  estado INTEGER DEFAULT 1
);

-- =====================================================
-- MÓDULO: BANCOS (5 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS banco (
  banco_id INTEGER PRIMARY KEY AUTOINCREMENT,
  banco_nombre VARCHAR(255),
  banco_numero_cuenta VARCHAR(255),
  banco_saldo REAL,
  banco_cuenta_contable VARCHAR(255),
  banco_titular VARCHAR(255),
  banco_status INTEGER DEFAULT 1,
  cuenta_id INTEGER NOT NULL,
  tipo_cuenta INTEGER NOT NULL
);

INSERT OR IGNORE INTO banco (banco_id, banco_nombre, banco_numero_cuenta, banco_saldo, banco_cuenta_contable, banco_titular, banco_status, cuenta_id, tipo_cuenta) VALUES
(1, 'PESOS EFECTIVO', '', 0.00, '107', '', 1, 1, 1),
(2, 'BANCO POPULAR DOMINICANO', '0108', 0.00, '101', '', 1, 2, 2),
(3, 'BANCO BHD LEON', '0114', 0.00, '102', '', 1, 3, 2),
(4, 'BANCO DE RESERVAS', '0102', 0.00, '103', '', 1, 4, 2),
(5, 'BANCO SANTA CRUZ', '0175', 0.00, '104', '', 1, 5, 2),
(6, 'BANCO LOPEZ DE HARO', '0116', 0.00, '105', '', 1, 6, 2),
(7, 'BANCO BANESCO', '0134', 0.00, '106', '', 1, 7, 2),
(8, 'DOLARES EFECTIVO', '', 0.00, '108', '', 1, 8, 1);

CREATE TABLE IF NOT EXISTS cuenta (
  cuenta_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuenta_nombre VARCHAR(255),
  cuenta_numero_cuenta VARCHAR(255),
  cuenta_saldo REAL,
  cuenta_cuenta_contable VARCHAR(255),
  cuenta_titular VARCHAR(255),
  cuenta_status INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cuentas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  cuenta_id INTEGER,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  codigo VARCHAR(50),
  balance REAL DEFAULT 0,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cuentas_contables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  naturaleza_id INTEGER NOT NULL,
  tipo_id INTEGER NOT NULL,
  cuenta_control INTEGER,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  slug VARCHAR(255),
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cuentas_contables_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  cuenta_id INTEGER NOT NULL,
  balance_inicial REAL DEFAULT 0,
  acumulado REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  fecha DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS tarjeta_pago (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  comision REAL DEFAULT 0,
  tipo VARCHAR(50),
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS metodos_pago (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(50),
  comision REAL DEFAULT 0,
  cuenta_id INTEGER,
  estado INTEGER DEFAULT 1
);

-- =====================================================
-- MÓDULO: CAJA (5 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  moneda_id INTEGER NOT NULL,
  responsable_id INTEGER NOT NULL,
  estado INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO caja (id, local_id, moneda_id, responsable_id, estado) VALUES
(1, 1, 1029, 1, 1),
(2, 1, 1030, 1, 1),
(3, 1, 1031, 1, 1);

CREATE TABLE IF NOT EXISTS caja_desglose (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_id INTEGER NOT NULL,
  responsable_id INTEGER NOT NULL,
  descripcion VARCHAR(45) NOT NULL,
  saldo REAL NOT NULL DEFAULT 0.00,
  principal INTEGER NOT NULL DEFAULT 0,
  retencion INTEGER NOT NULL DEFAULT 0,
  estado INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO caja_desglose (id, caja_id, responsable_id, descripcion, saldo, principal, retencion, estado) VALUES
(1, 1, 2, 'PESOS EFECTIVO', 0.00, 1, 0, 1),
(2, 1, 2, 'BANCO POPULAR', 0.00, 0, 0, 1),
(3, 1, 2, 'BANCO BHD', 0.00, 0, 0, 1),
(4, 1, 2, 'BANCO RESERVAS', 0.00, 0, 0, 1),
(5, 1, 2, 'BANCO SANTA CRUZ', 0.00, 0, 0, 1),
(6, 1, 2, 'BANCO LOPEZ DE HARO', 0.00, 0, 0, 1),
(7, 1, 2, 'BANCO BANESCO', 0.00, 0, 0, 1),
(8, 2, 2, 'DOLARES EFECTIVO', 0.00, 1, 0, 1),
(9, 3, 2, 'EUROS EFECTIVO', 0.00, 1, 0, 1);

CREATE TABLE IF NOT EXISTS caja_movimiento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_desglose_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  fecha_mov DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  movimiento VARCHAR(45) NOT NULL,
  operacion VARCHAR(45) NOT NULL,
  medio_pago VARCHAR(45) NOT NULL,
  saldo REAL NOT NULL,
  saldo_old REAL NOT NULL,
  ref_id VARCHAR(50),
  ref_val VARCHAR(255),
  inicial REAL,
  id_moneda INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS caja_pendiente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_desglose_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  tipo VARCHAR(45) NOT NULL,
  IO INTEGER NOT NULL,
  monto REAL NOT NULL,
  estado INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ref_id VARCHAR(45),
  ref_val VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS corte_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario INTEGER NOT NULL,
  local_id INTEGER NOT NULL,
  billetes1 INTEGER DEFAULT 0,
  billetes5 INTEGER DEFAULT 0,
  billetes10 INTEGER DEFAULT 0,
  billetes25 INTEGER DEFAULT 0,
  billetes50 INTEGER DEFAULT 0,
  billetes100 INTEGER DEFAULT 0,
  billetes200 INTEGER DEFAULT 0,
  billetes500 INTEGER DEFAULT 0,
  billetes1000 INTEGER DEFAULT 0,
  billetes2000 INTEGER DEFAULT 0,
  total REAL DEFAULT 0,
  fecha DATETIME,
  date DATE
);

-- =====================================================
-- SCHEMA IMAXPOS COMPLETO - PARTE 2
-- Continuación de las tablas restantes (aproximadamente 130 tablas más)
-- =====================================================

-- =====================================================
-- MÓDULO: CLIENTES (7 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS cliente (
  id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
  identificacion VARCHAR(45),
  razon_social VARCHAR(255),
  nombre_comercial VARCHAR(255) NOT NULL,
  grupo_id INTEGER,
  email VARCHAR(250),
  telefono1 VARCHAR(45),
  direccion TEXT,
  dni VARCHAR(225),
  representante VARCHAR(255) NOT NULL,
  provincia INTEGER,
  ciudad INTEGER,
  distrito INTEGER,
  estado_id INTEGER,
  ciudad_id INTEGER,
  pagina_web VARCHAR(255),
  telefono2 VARCHAR(45),
  nota TEXT,
  categoria_precio INTEGER,
  tipo_cliente VARCHAR(20),
  nombres VARCHAR(255),
  apellido_materno VARCHAR(255),
  apellido_paterno VARCHAR(255),
  genero VARCHAR(1),
  direccion_maps TEXT,
  latitud VARCHAR(255),
  longitud VARCHAR(255),
  ruc VARCHAR(45),
  representante_apellido_pat VARCHAR(255),
  representante_apellido_mat VARCHAR(255),
  representante_genero VARCHAR(255),
  representante_nombre VARCHAR(255),
  representante_dni VARCHAR(255),
  descuento REAL,
  agente_retension INTEGER,
  agente_retension_valor REAL,
  linea_credito REAL,
  tipo_pago INTEGER NOT NULL DEFAULT 1,
  cliente_status INTEGER DEFAULT 1,
  codigo VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cliente genérico
INSERT OR IGNORE INTO cliente (id_cliente, identificacion, razon_social, nombre_comercial, codigo, tipo_cliente, cliente_status) VALUES
(1, '00000000000', 'CLIENTE GENERICO', 'CONTADO', 'CLI-001', 'Persona Fisica', 1);

CREATE TABLE IF NOT EXISTS cliente_campo_valor (
  id_campo_valor INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  tipo_campo_id INTEGER NOT NULL,
  valor TEXT,
  FOREIGN KEY (cliente_id) REFERENCES cliente(id_cliente)
);

CREATE TABLE IF NOT EXISTS cliente_cuotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  periodo INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_final DATE NOT NULL,
  fecha DATE NOT NULL,
  fecha_pago DATETIME,
  tipo_pago VARCHAR(50),
  referencia VARCHAR(100),
  monto REAL NOT NULL,
  estado INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cliente_tipo_campo (
  id_tipo INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  padre_id INTEGER,
  input_type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS cliente_tipo_campo_padre (
  tipo_campo_padre_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_campo_padre_nombre VARCHAR(100) NOT NULL,
  tipo_campo_padre_slug VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS grupos_cliente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  descuento REAL DEFAULT 0,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS garante (
  id_garante INTEGER PRIMARY KEY AUTOINCREMENT,
  credito_id INTEGER NOT NULL,
  nombre_garante VARCHAR(255),
  dni_garante VARCHAR(50),
  direccion_garante TEXT,
  telefono_garante VARCHAR(50),
  FOREIGN KEY (credito_id) REFERENCES credito(id_venta)
);

-- =====================================================
-- MÓDULO: PRODUCTOS (20 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_categoria VARCHAR(50),
  estatus_categoria INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO categoria (id_categoria, nombre_categoria) VALUES
(1, 'GENERAL');

CREATE TABLE IF NOT EXISTS producto (
  producto_id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_codigo_interno VARCHAR(50),
  producto_codigo_barra VARCHAR(255),
  producto_nombre VARCHAR(100),
  producto_descripcion VARCHAR(500),
  producto_elaboracion DATE,
  producto_vencimiento DATE,
  producto_marca INTEGER,
  producto_linea INTEGER,
  producto_familia INTEGER,
  produto_grupo INTEGER,
  producto_proveedor INTEGER,
  producto_stockminimo REAL,
  producto_impuesto INTEGER,
  producto_estatus INTEGER DEFAULT 1,
  producto_largo REAL,
  producto_ancho REAL,
  producto_alto REAL,
  producto_peso REAL,
  producto_nota TEXT,
  producto_cualidad VARCHAR(255),
  producto_estado INTEGER DEFAULT 1,
  producto_costo_unitario REAL,
  producto_modelo VARCHAR(100),
  producto_titulo_imagen VARCHAR(100),
  producto_descripcion_img TEXT,
  producto_tipo VARCHAR(25) NOT NULL DEFAULT 'PRODUCTO',
  producto_venta INTEGER NOT NULL DEFAULT 1,
  formula INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS producto_almacen (
  id_local INTEGER NOT NULL,
  id_producto INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  fraccion INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id_local, id_producto)
);

CREATE TABLE IF NOT EXISTS producto_costo_unitario (
  producto_id INTEGER NOT NULL,
  moneda_id INTEGER NOT NULL,
  costo REAL,
  activo INTEGER DEFAULT 1,
  contable_costo REAL,
  contable_activo INTEGER DEFAULT 0,
  PRIMARY KEY (producto_id, moneda_id)
);

CREATE TABLE IF NOT EXISTS producto_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  serie VARCHAR(255),
  local_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS marcas (
  id_marca INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_marca VARCHAR(50),
  estatus_marca INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lineas (
  id_linea INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_linea VARCHAR(50),
  estatus_linea INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS familia (
  id_familia INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_familia VARCHAR(50),
  estatus_familia INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS grupos (
  id_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_grupo VARCHAR(50),
  descripcion_grupo TEXT,
  estatus_grupo INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO grupos (id_grupo, nombre_grupo) VALUES
(1, 'ADMINISTRADORES'),
(2, 'VENDEDORES'),
(3, 'CONTADORES'),
(4, 'TECNICOS'),
(10, 'CAJEROS');

CREATE TABLE IF NOT EXISTS unidades (
  id_unidad INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_unidad VARCHAR(45),
  descripcion_unidad VARCHAR(45),
  sunat VARCHAR(20)
);

INSERT OR IGNORE INTO unidades (id_unidad, codigo_unidad, descripcion_unidad, sunat) VALUES
(1, 'UND', 'UNIDAD', 'NIU');

CREATE TABLE IF NOT EXISTS unidades_has_precio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_precio INTEGER NOT NULL,
  id_unidad INTEGER NOT NULL,
  id_producto INTEGER NOT NULL,
  precio REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS unidades_has_producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_unidad INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  unidades INTEGER NOT NULL,
  orden INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS precios (
  id_precio INTEGER PRIMARY KEY AUTOINCREMENT,
  descripcion VARCHAR(45),
  estado INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO precios (id_precio, descripcion) VALUES
(1, 'PRECIO DE VENTA');

CREATE TABLE IF NOT EXISTS shadow_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  fraccion INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS combos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio REAL NOT NULL,
  estado INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Productos con propiedades
CREATE TABLE IF NOT EXISTS pl_producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  tipo_id INTEGER NOT NULL,
  serie_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pl_producto_propiedad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  propiedad_id INTEGER NOT NULL,
  valor VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pl_propiedad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pl_serie (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  serie VARCHAR(255) NOT NULL,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pl_tipo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  estado INTEGER DEFAULT 1
);

-- =====================================================
-- MÓDULO: VENTAS (25 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS venta (
  venta_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ncf VARCHAR(19),
  estado_dgii TEXT CHECK(estado_dgii IN ('PENDIENTE','ENVIADO','APROBADO','RECHAZADO')) DEFAULT 'PENDIENTE',
  fecha_envio_dgii DATETIME,
  local_id INTEGER NOT NULL,
  id_documento INTEGER NOT NULL,
  comprobante_id INTEGER DEFAULT 0,
  venta_status VARCHAR(45),
  id_cliente INTEGER NOT NULL,
  id_vendedor INTEGER,
  condicion_pago INTEGER,
  id_moneda INTEGER,
  serie VARCHAR(45),
  numero VARCHAR(45),
  subtotal REAL,
  servicio REAL,
  propina_legal REAL DEFAULT 0.00,
  total_impuesto REAL,
  descuento REAL,
  descuento_general REAL,
  tdescuento INTEGER NOT NULL DEFAULT 0,
  total REAL,
  pagado REAL DEFAULT 0.00,
  vuelto REAL DEFAULT 0.00,
  vuelto2 REAL DEFAULT 0.00,
  vuelto3 REAL DEFAULT 0.00,
  vuelto4 REAL DEFAULT 0.00,
  vuelto5 REAL DEFAULT 0.00,
  tasa_cambio REAL,
  inicial REAL DEFAULT 0.00,
  factura_impresa INTEGER DEFAULT 0,
  fecha DATETIME,
  fecha_facturacion DATETIME,
  NumeroOrdenCompra VARCHAR(255) NOT NULL,
  FechaEntrega DATE NOT NULL,
  FechaOrdenCompra DATE NOT NULL,
  created_at DATETIME,
  dni_garante VARCHAR(100),
  tipo_impuesto INTEGER,
  nota TEXT,
  venta_afectada INTEGER NOT NULL DEFAULT 0,
  id_logueado INTEGER,
  cajero_id INTEGER NOT NULL DEFAULT 0,
  delivery INTEGER NOT NULL DEFAULT 0,
  FechaEmbarque DATE,
  NumeroEmbarque VARCHAR(50),
  NumeroContenedor VARCHAR(50),
  NumeroReferencia VARCHAR(50),
  PesoBruto REAL,
  PesoNeto REAL,
  UnidadPesoBruto VARCHAR(10),
  UnidadPesoNeto VARCHAR(10),
  CantidadBulto REAL,
  UnidadBulto VARCHAR(10),
  VolumenBulto REAL,
  UnidadVolumen VARCHAR(10),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
  id_venta INTEGER NOT NULL,
  id_producto INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio REAL NOT NULL,
  precio_venta REAL NOT NULL,
  descuento REAL DEFAULT 0,
  descuento_total REAL DEFAULT 0,
  tdescuento VARCHAR(10),
  impuesto_porciento REAL DEFAULT 0,
  impuesto_total REAL DEFAULT 0,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  detalle_importe REAL DEFAULT 0,
  detalle_costo_promedio REAL DEFAULT 0,
  detalle_utilidad REAL DEFAULT 0,
  impuesto_id INTEGER,
  unidad_medida INTEGER,
  precio_unitario REAL,
  dias INTEGER DEFAULT 0,
  FOREIGN KEY (id_venta) REFERENCES venta(venta_id),
  FOREIGN KEY (id_producto) REFERENCES producto(producto_id)
);

-- Ventas hold (suspendidas)
CREATE TABLE IF NOT EXISTS venta_hold (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  id_cliente INTEGER NOT NULL,
  id_vendedor INTEGER,
  id_moneda INTEGER,
  subtotal REAL NOT NULL,
  impuesto REAL NOT NULL,
  descuento REAL DEFAULT 0,
  total REAL NOT NULL,
  tasa_cambio REAL,
  nota TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS detalle_venta_hold (
  id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
  id_venta INTEGER NOT NULL,
  id_producto INTEGER NOT NULL,
  unidad_medida INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio REAL NOT NULL,
  precio_venta REAL NOT NULL,
  descuento REAL DEFAULT 0,
  descuento_total REAL DEFAULT 0,
  detalle_importe REAL,
  detalle_costo_promedio REAL,
  detalle_utilidad REAL,
  impuesto_porciento REAL,
  impuesto_total REAL,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  impuesto_id INTEGER,
  FOREIGN KEY (id_venta) REFERENCES venta_hold(id)
);

CREATE TABLE IF NOT EXISTS venta_anular (
  nVenAnularCodigo INTEGER PRIMARY KEY AUTOINCREMENT,
  id_venta INTEGER NOT NULL,
  var_venanular_descripcion TEXT NOT NULL,
  nUsuCodigo INTEGER NOT NULL,
  dat_fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venta_contable_detalle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  unidad_id INTEGER NOT NULL,
  precio REAL DEFAULT 0,
  cantidad REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS venta_devolucion (
  id_devolucion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_venta INTEGER,
  id_producto INTEGER,
  precio REAL,
  cantidad REAL DEFAULT 0,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venta_documento (
  nVenDocCodigo INTEGER PRIMARY KEY AUTOINCREMENT,
  id_venta INTEGER NOT NULL,
  var_docventa_descripcion TEXT NOT NULL,
  nUsuCodigo INTEGER NOT NULL,
  dat_fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venta_tarjeta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  tarjeta_id INTEGER NOT NULL,
  monto REAL NOT NULL,
  referencia VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS venta_moneda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  moneda_id INTEGER NOT NULL,
  monto REAL NOT NULL,
  tasa_cambio REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS venta_nota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  nota TEXT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS venta_recurrente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  frecuencia VARCHAR(50) NOT NULL,
  proximo_cobro DATE NOT NULL,
  monto REAL NOT NULL,
  activo INTEGER DEFAULT 1
);

-- Tablas de créditos y cuotas
CREATE TABLE IF NOT EXISTS credito (
  id_venta INTEGER NOT NULL PRIMARY KEY,
  int_credito_nrocuota INTEGER NOT NULL,
  dec_credito_montocuota REAL NOT NULL,
  var_credito_estado VARCHAR(20) NOT NULL,
  dec_credito_montodebito REAL DEFAULT 0.00,
  num_corre VARCHAR(20),
  id_moneda INTEGER,
  tasa_cambio REAL,
  fec_emi_compro DATE,
  num_corre_gr VARCHAR(20),
  pago_anticipado INTEGER,
  fecha_cancelado DATETIME,
  periodo_gracia INTEGER DEFAULT 0,
  tasa_interes REAL DEFAULT 0,
  pago_periodo INTEGER NOT NULL DEFAULT 0,
  dia_pago INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS credito_cuotas (
  id_credito_cuota INTEGER PRIMARY KEY AUTOINCREMENT,
  nro_letra VARCHAR(20) NOT NULL,
  numero_unico VARCHAR(100),
  fecha_giro DATETIME,
  fecha_vencimiento DATETIME,
  monto REAL,
  isgiro INTEGER,
  id_venta INTEGER,
  ispagado INTEGER DEFAULT 0,
  ultimo_pago DATETIME
);

CREATE TABLE IF NOT EXISTS credito_cuotas_abono (
  abono_id INTEGER PRIMARY KEY AUTOINCREMENT,
  credito_cuota_id INTEGER,
  monto_abono REAL,
  fecha_abono DATETIME NOT NULL,
  tipo_pago INTEGER,
  monto_restante REAL,
  usuario_pago INTEGER,
  banco_id INTEGER,
  nro_operacion VARCHAR(45)
);

CREATE TABLE IF NOT EXISTS cronogramapago (
  nCPagoCodigo INTEGER PRIMARY KEY AUTOINCREMENT,
  int_cronpago_nrocuota INTEGER NOT NULL,
  dat_cronpago_fecinicio DATE NOT NULL,
  dat_cronpago_fecpago DATE NOT NULL,
  dec_cronpago_pagocuota REAL NOT NULL,
  dec_cronpago_pagorecibido REAL DEFAULT 0.00,
  nVenCodigo INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS historial_cronograma (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cronograma_id INTEGER NOT NULL,
  fecha_pago DATETIME NOT NULL,
  monto_pagado REAL NOT NULL,
  usuario_id INTEGER NOT NULL,
  metodo_pago VARCHAR(50)
);

-- =====================================================
-- MÓDULO: DOCUMENTOS Y COMPROBANTES (10 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS documentos (
  id_doc INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_doc VARCHAR(45) NOT NULL,
  valor_doc VARCHAR(10) NOT NULL,
  serie_doc VARCHAR(10),
  estado_doc INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS documento_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  documento_id INTEGER NOT NULL,
  serie VARCHAR(45),
  numero VARCHAR(45),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comprobantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  nombre VARCHAR(45) NOT NULL,
  serie VARCHAR(45) NOT NULL,
  desde INTEGER NOT NULL DEFAULT 1,
  hasta INTEGER NOT NULL DEFAULT 1,
  longitud INTEGER NOT NULL DEFAULT 8,
  estado INTEGER NOT NULL DEFAULT 1,
  num_actual INTEGER DEFAULT 1,
  fecha_venc VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS comprobante_sinuso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comprobante_id INTEGER NOT NULL,
  numero VARCHAR(45) NOT NULL,
  created_at DATE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comprobante_ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER,
  comprobante_id INTEGER NOT NULL,
  numero VARCHAR(45) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS correlativos (
  id_local INTEGER NOT NULL,
  id_documento INTEGER NOT NULL,
  serie VARCHAR(45) NOT NULL,
  correlativo INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (id_local, id_documento, serie)
);

CREATE TABLE IF NOT EXISTS condiciones_pago (
  id_condiciones INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_condiciones VARCHAR(255) NOT NULL,
  status_condiciones INTEGER DEFAULT 1,
  dias INTEGER
);

INSERT OR IGNORE INTO condiciones_pago (id_condiciones, nombre_condiciones, status_condiciones, dias) VALUES
(1, 'Contado', 1, 0),
(2, 'Credito', 1, 30);

CREATE TABLE IF NOT EXISTS contado (
  id_venta INTEGER NOT NULL PRIMARY KEY,
  status VARCHAR(13) NOT NULL,
  montopagado REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS cotizacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  documento_id INTEGER NOT NULL,
  estado VARCHAR(45) NOT NULL,
  cliente_id INTEGER NOT NULL,
  vendedor_id INTEGER NOT NULL,
  tipo_pago_id INTEGER NOT NULL,
  moneda_id INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  descuento REAL NOT NULL,
  impuesto REAL NOT NULL,
  total REAL NOT NULL,
  tasa_cambio REAL,
  credito_periodo VARCHAR(45),
  periodo_per INTEGER,
  fecha DATETIME NOT NULL,
  fecha_entrega DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lugar_entrega VARCHAR(200),
  tipo_impuesto INTEGER,
  nota TEXT
);

CREATE TABLE IF NOT EXISTS cotizacion_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cotizacion_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  unidad_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio REAL NOT NULL,
  precio_venta REAL DEFAULT 0.00,
  descuento REAL NOT NULL,
  descuento_total REAL NOT NULL,
  impuesto REAL NOT NULL DEFAULT 0.00,
  impuesto_total REAL NOT NULL,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  detalle_importe REAL NOT NULL,
  producto_detalle TEXT NOT NULL
);

-- =====================================================
-- MÓDULO: COMPRAS E INGRESOS (10 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS ingreso (
  id_ingreso INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  id_documento INTEGER NOT NULL,
  id_proveedor INTEGER NOT NULL,
  id_usuario INTEGER NOT NULL,
  condicion_pago INTEGER NOT NULL,
  id_moneda INTEGER NOT NULL,
  serie VARCHAR(45),
  numero VARCHAR(45),
  subtotal REAL,
  total_impuesto REAL,
  descuento REAL,
  descuento_general REAL,
  tdescuento INTEGER DEFAULT 0,
  total REAL,
  pagado REAL DEFAULT 0.00,
  tasa_cambio REAL,
  estado INTEGER,
  fecha DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tipo_impuesto INTEGER,
  nota TEXT
);

CREATE TABLE IF NOT EXISTS detalleingreso (
  iddetalle_ingreso INTEGER PRIMARY KEY AUTOINCREMENT,
  id_ingreso INTEGER NOT NULL,
  id_producto INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  fraccion REAL DEFAULT 0,
  precio REAL NOT NULL,
  precio_venta REAL NOT NULL,
  descuento REAL DEFAULT 0,
  descuento_total REAL DEFAULT 0,
  tdescuento VARCHAR(10),
  impuesto_porciento REAL DEFAULT 0,
  impuesto_total REAL DEFAULT 0,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  detalle_importe REAL DEFAULT 0,
  impuesto_id INTEGER,
  unidad_medida INTEGER,
  precio_unitario REAL
);

CREATE TABLE IF NOT EXISTS ingreso_contable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  id_proveedor INTEGER,
  id_usuario INTEGER NOT NULL,
  id_moneda INTEGER NOT NULL,
  subtotal REAL,
  total_impuesto REAL,
  descuento REAL,
  total REAL,
  pagado REAL DEFAULT 0.00,
  tasa_cambio REAL,
  fecha DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  nota TEXT,
  venta_id INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS detalleingreso_contable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingreso_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  unidad_id INTEGER NOT NULL,
  precio REAL DEFAULT 0,
  cantidad REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ingreso_credito (
  id_ingreso INTEGER NOT NULL PRIMARY KEY,
  nro_cuotas INTEGER NOT NULL,
  monto_cuota REAL NOT NULL,
  monto_debito REAL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS ingreso_credito_cuotas (
  id_cuota INTEGER PRIMARY KEY AUTOINCREMENT,
  ingreso_id INTEGER NOT NULL,
  nro_cuota INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto REAL NOT NULL,
  pagado INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pagos_ingreso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingreso_id INTEGER NOT NULL,
  monto REAL NOT NULL,
  fecha_pago DATETIME NOT NULL,
  metodo_pago VARCHAR(50),
  usuario_id INTEGER NOT NULL,
  banco_id INTEGER,
  referencia VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS compras_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL,
  compra_file_code VARCHAR(100) NOT NULL,
  compra_file_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proforma (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  total REAL NOT NULL,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS proveedor (
  id_proveedor INTEGER PRIMARY KEY AUTOINCREMENT,
  identificacion VARCHAR(50),
  razon_social VARCHAR(255),
  nombre_comercial VARCHAR(255),
  email VARCHAR(100),
  telefono VARCHAR(50),
  direccion TEXT,
  provincia VARCHAR(100),
  ciudad VARCHAR(100),
  pagina_web VARCHAR(255),
  nota TEXT,
  estado INTEGER DEFAULT 1,
  codigo VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: GASTOS (3 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS gastos (
  id_gastos INTEGER PRIMARY KEY AUTOINCREMENT,
  id_caja_desglose INTEGER NOT NULL,
  fecha_gastos DATETIME NOT NULL,
  descripcion_gasto VARCHAR(255) NOT NULL,
  monto_gasto REAL NOT NULL,
  motivo_gasto VARCHAR(255),
  documento VARCHAR(255),
  id_usuario INTEGER NOT NULL,
  id_proveedor INTEGER,
  id_tipo INTEGER,
  estado INTEGER DEFAULT 1,
  cuenta_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gastos_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gasto_id INTEGER NOT NULL,
  file_code VARCHAR(100) NOT NULL,
  file_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tipos_gasto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado INTEGER DEFAULT 1
);

-- =====================================================
-- MÓDULO: IMPUESTOS (1 tabla)
-- =====================================================

CREATE TABLE IF NOT EXISTS impuestos (
  id_impuesto INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_impuesto VARCHAR(100) NOT NULL,
  porcentaje_impuesto REAL NOT NULL,
  estado_impuesto INTEGER DEFAULT 1,
  cuenta_id INTEGER,
  codigo VARCHAR(20)
);

-- =====================================================
-- MÓDULO: LOCALES/SUCURSALES (1 tabla)
-- =====================================================

CREATE TABLE IF NOT EXISTS local (
  id_local INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_local VARCHAR(255) NOT NULL,
  direccion_local VARCHAR(255),
  telefono_local VARCHAR(50),
  email_local VARCHAR(100),
  responsable_id INTEGER,
  estado INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO local (id_local, nombre_local, estado) VALUES
(1, 'PRINCIPAL', 1);

-- =====================================================
-- MÓDULO: MONEDAS (1 tabla)
-- =====================================================

CREATE TABLE IF NOT EXISTS moneda (
  id_moneda INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_moneda VARCHAR(100) NOT NULL,
  simbolo_moneda VARCHAR(10) NOT NULL,
  codigo_moneda VARCHAR(10) NOT NULL,
  tasa_cambio REAL DEFAULT 1.00,
  principal INTEGER DEFAULT 0,
  estado INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO moneda (id_moneda, nombre_moneda, simbolo_moneda, codigo_moneda, tasa_cambio, principal, estado) VALUES
(1029, 'PESO DOMINICANO', 'RD$', 'DOP', 1.00, 1, 1),
(1030, 'DOLAR ESTADOUNIDENSE', '$', 'USD', 58.00, 0, 1),
(1031, 'EURO', '€', 'EUR', 65.00, 0, 1);

-- =====================================================
-- MÓDULO: USUARIOS Y PERMISOS (7 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS usuario (
  nUsuCodigo INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(255) NOT NULL,
  username VARCHAR(18) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  password VARCHAR(50) NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  nombre VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(100) NOT NULL,
  grupo INTEGER DEFAULT NULL,
  id_local INTEGER DEFAULT NULL,
  deleted INTEGER DEFAULT 0,
  identificacion VARCHAR(50) DEFAULT NULL,
  esSuper INTEGER DEFAULT NULL,
  porcentaje_comision REAL DEFAULT NULL,
  twosteps INTEGER NOT NULL DEFAULT 0,
  imagen TEXT NOT NULL,
  fingerprint TEXT DEFAULT NULL,
  deviceId VARCHAR(250) DEFAULT NULL,
  rawId VARCHAR(255) DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS usuario_almacen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  almacen_id INTEGER NOT NULL,
  principal INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grupos_usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS opcion (
  id_opcion INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_opcion VARCHAR(255) NOT NULL,
  padre_id INTEGER DEFAULT 0,
  url_opcion VARCHAR(255),
  icon_opcion VARCHAR(100),
  orden INTEGER DEFAULT 0,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS opcion_grupo (
  id_opcion_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
  opcion_id INTEGER NOT NULL,
  grupo_id INTEGER NOT NULL,
  ver INTEGER DEFAULT 0,
  crear INTEGER DEFAULT 0,
  editar INTEGER DEFAULT 0,
  eliminar INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS twosteps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  codigo VARCHAR(10) NOT NULL,
  fecha_expiracion DATETIME NOT NULL,
  usado INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  key_value TEXT NOT NULL,
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME
);

-- =====================================================
-- MÓDULO: CONFIGURACIÓN (6 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS configuraciones (
  config_id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key VARCHAR(255),
  config_value TEXT
);

CREATE TABLE IF NOT EXISTS conexion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip VARCHAR(45) NOT NULL
);

CREATE TABLE IF NOT EXISTS ciudades (
  ciudad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(255) NOT NULL,
  ciudad_nombre VARCHAR(45) NOT NULL,
  estado_id INTEGER NOT NULL,
  pais_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS estados (
  estado_id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(255) NOT NULL,
  estado_nombre VARCHAR(100) NOT NULL,
  pais_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(10) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  nombre_ingles VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS paises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(10) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  phone_code VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS distrito (
  distrito_id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(255) NOT NULL,
  distrito_nombre VARCHAR(100) NOT NULL,
  ciudad_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS columnas (
  nombre_columna VARCHAR(255) NOT NULL,
  nombre_join VARCHAR(45) NOT NULL,
  nombre_mostrar VARCHAR(255) NOT NULL,
  tabla VARCHAR(45),
  mostrar INTEGER DEFAULT 1,
  activo INTEGER DEFAULT 1,
  id_columna INTEGER PRIMARY KEY AUTOINCREMENT
);

CREATE TABLE IF NOT EXISTS diccionario_termino (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  llave VARCHAR(255) NOT NULL UNIQUE,
  valor TEXT,
  categoria VARCHAR(100),
  idioma VARCHAR(10) DEFAULT 'es'
);

-- =====================================================
-- MÓDULO: NOTAS DE CRÉDITO (1 tabla)
-- =====================================================

CREATE TABLE IF NOT EXISTS nota_credito (
  id_nota INTEGER PRIMARY KEY AUTOINCREMENT,
  ncf VARCHAR(19),
  local_id INTEGER NOT NULL,
  id_documento INTEGER NOT NULL,
  comprobante_id INTEGER DEFAULT 0,
  nota_status VARCHAR(45),
  id_cliente INTEGER NOT NULL,
  id_vendedor INTEGER,
  id_moneda INTEGER,
  serie VARCHAR(45),
  numero VARCHAR(45),
  subtotal REAL,
  total_impuesto REAL,
  descuento REAL,
  total REAL,
  tasa_cambio REAL,
  fecha DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tipo_impuesto INTEGER,
  nota TEXT,
  venta_afectada INTEGER DEFAULT 0,
  motivo VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS detalle_nota_credito (
  id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
  id_nota INTEGER NOT NULL,
  id_producto INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio REAL NOT NULL,
  precio_venta REAL NOT NULL,
  descuento REAL DEFAULT 0,
  descuento_total REAL DEFAULT 0,
  impuesto_porciento REAL DEFAULT 0,
  impuesto_total REAL DEFAULT 0,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  impuesto_id INTEGER,
  unidad_medida INTEGER
);

-- =====================================================
-- MÓDULO: INVENTARIO Y KARDEX (2 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  stock_inicial REAL,
  stock_final REAL,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS kardex (
  id_kardex INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  local_id INTEGER NOT NULL,
  tipo_operacion VARCHAR(50) NOT NULL,
  referencia_id INTEGER,
  entrada REAL DEFAULT 0,
  salida REAL DEFAULT 0,
  saldo REAL NOT NULL,
  costo_unitario REAL,
  fecha DATETIME NOT NULL,
  usuario_id INTEGER
);

-- =====================================================
-- MÓDULO: MANUFACTURA (4 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS manufactura (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  cantidad REAL NOT NULL,
  estado INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS manufactura_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufactura_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  costo REAL
);

CREATE TABLE IF NOT EXISTS manufactura_orden (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha DATE NOT NULL,
  producto_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  estado VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS manufactura_orden_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  cantidad REAL NOT NULL
);

-- =====================================================
-- MÓDULO: SERVICIOS Y REPARACIONES (5 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS reparacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  local_id INTEGER NOT NULL,
  fecha_ingreso DATETIME NOT NULL,
  fecha_entrega DATETIME,
  equipo VARCHAR(255),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  serie VARCHAR(100),
  problema TEXT,
  diagnostico TEXT,
  solucion TEXT,
  costo REAL,
  abono REAL DEFAULT 0,
  estado VARCHAR(50),
  tecnico_id INTEGER,
  usuario_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reparacion_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reparacion_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio REAL NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS reparacion_complementos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reparacion_id INTEGER NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  valor VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS reparacion_orden_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  unidad_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio REAL NOT NULL,
  descuento REAL DEFAULT 0,
  impuesto REAL DEFAULT 0,
  total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS recarga (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  monto REAL NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  operadora VARCHAR(50),
  fecha DATETIME NOT NULL,
  usuario_id INTEGER NOT NULL
);

-- =====================================================
-- MÓDULO: CONSUMO Y DELIVERY (2 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS consumo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  anterior REAL NOT NULL DEFAULT 0.000,
  actual REAL NOT NULL DEFAULT 0.000,
  consumo REAL NOT NULL DEFAULT 0.000,
  galones REAL NOT NULL DEFAULT 0.000,
  fecha DATETIME,
  date DATE,
  usuario INTEGER
);

CREATE TABLE IF NOT EXISTS listapedidosya (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id VARCHAR(100) NOT NULL,
  datos TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: FACTURACIÓN ELECTRÓNICA (2 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS facturacion_electronica_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  ncf VARCHAR(19),
  fecha_envio DATETIME,
  estado VARCHAR(50),
  respuesta_dgii TEXT,
  codigo_respuesta VARCHAR(10),
  mensaje_error TEXT,
  intentos INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reporte606 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id INTEGER NOT NULL,
  periodo VARCHAR(10) NOT NULL,
  rnc_proveedor VARCHAR(50),
  tipo_identificacion VARCHAR(10),
  tipo_bienes_servicios VARCHAR(10),
  ncf VARCHAR(19),
  ncf_modificado VARCHAR(19),
  fecha_comprobante DATE,
  fecha_pago DATE,
  monto_facturado REAL,
  itbis_facturado REAL,
  itbis_retenido REAL,
  monto_propina REAL,
  retencion_renta REAL,
  isr_percibido REAL,
  impuesto_selectivo REAL,
  otros_impuestos REAL,
  monto_propina_itbis REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MÓDULO: TASAS (1 tabla)
-- =====================================================

CREATE TABLE IF NOT EXISTS tasas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  moneda_origen_id INTEGER NOT NULL,
  moneda_destino_id INTEGER NOT NULL,
  tasa REAL NOT NULL,
  fecha DATE NOT NULL,
  usuario_id INTEGER
);

-- =====================================================
-- MÓDULO: MOVIMIENTOS Y LOGS (3 tablas)
-- =====================================================

CREATE TABLE IF NOT EXISTS movimientos_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_id INTEGER NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  monto REAL NOT NULL,
  descripcion TEXT,
  fecha DATETIME NOT NULL,
  usuario_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS movimiento_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabla VARCHAR(100) NOT NULL,
  registro_id INTEGER NOT NULL,
  accion VARCHAR(50) NOT NULL,
  usuario_id INTEGER NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  datos_anteriores TEXT,
  datos_nuevos TEXT
);

CREATE TABLE IF NOT EXISTS logs (
  id_log INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  accion VARCHAR(255) NOT NULL,
  tabla VARCHAR(100),
  registro_id INTEGER,
  ip VARCHAR(50),
  user_agent TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER,
  ip VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ci_sessions (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT 0,
  data BLOB NOT NULL
);

-- =====================================================
-- MÓDULO: CURRENCY (Compatibilidad) (1 tabla)
-- =====================================================

CREATE TABLE IF NOT EXISTS currency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  rate REAL DEFAULT 1.00
);

-- =====================================================
-- VISTAS VIRTUALES (10 tablas/vistas de solo lectura)
-- =====================================================

CREATE VIEW IF NOT EXISTS v_lista_precios AS
SELECT 
  p.producto_id,
  p.producto_nombre,
  p.producto_codigo_barra,
  u.id_unidad,
  u.codigo_unidad,
  pr.id_precio,
  pr.descripcion AS precio_desc,
  uhp.precio
FROM producto p
JOIN unidades_has_producto uhp ON p.producto_id = uhp.producto_id
JOIN unidades u ON uhp.id_unidad = u.id_unidad
JOIN unidades_has_precio uhpr ON uhp.id = uhpr.id_unidad
JOIN precios pr ON uhpr.id_precio = pr.id_precio;

CREATE VIEW IF NOT EXISTS v_producto_stock AS
SELECT 
  p.producto_id,
  p.producto_nombre,
  p.producto_codigo_barra,
  pa.id_local,
  pa.cantidad,
  pa.fraccion
FROM producto p
LEFT JOIN producto_almacen pa ON p.producto_id = pa.id_producto;

CREATE VIEW IF NOT EXISTS v_ventas_diarias AS
SELECT 
  DATE(v.fecha) AS fecha,
  v.local_id,
  COUNT(*) AS total_ventas,
  SUM(v.total) AS monto_total
FROM venta v
WHERE v.venta_status != 'ANULADO'
GROUP BY DATE(v.fecha), v.local_id;

CREATE VIEW IF NOT EXISTS vw_monedas_cajas AS
SELECT 
  c.id AS caja_id,
  c.local_id,
  m.id_moneda,
  m.nombre_moneda,
  m.simbolo_moneda
FROM caja c
JOIN moneda m ON c.moneda_id = m.id_moneda;

-- =====================================================
-- TABLAS ADICIONALES (15 tablas más)
-- =====================================================

CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100),
  password VARCHAR(100),
  usuario VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS vw_rep_mov_cajas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_id INTEGER,
  fecha DATETIME,
  tipo VARCHAR(50),
  monto REAL
);

CREATE TABLE IF NOT EXISTS v_consulta_pagospendientes_venta (
  venta_id INTEGER,
  cliente_id INTEGER,
  total REAL,
  pagado REAL,
  pendiente REAL
);

CREATE TABLE IF NOT EXISTS v_cronogramapago (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER,
  cuota_numero INTEGER,
  monto REAL,
  fecha_pago DATE,
  estado VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS v_gasto_tipos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_id INTEGER,
  nombre VARCHAR(255),
  total_gastos REAL
);

CREATE TABLE IF NOT EXISTS v_lista_precios_cero (
  producto_id INTEGER,
  producto_nombre VARCHAR(255),
  precio REAL
);

CREATE TABLE IF NOT EXISTS v_lista_precios_hanheld (
  producto_id INTEGER,
  producto_nombre VARCHAR(255),
  producto_codigo_barra VARCHAR(255),
  precio REAL,
  cantidad REAL
);

CREATE TABLE IF NOT EXISTS v_lista_productos_principal (
  producto_id INTEGER,
  producto_nombre VARCHAR(255),
  producto_codigo_interno VARCHAR(50),
  producto_codigo_barra VARCHAR(255),
  cantidad REAL,
  costo_unitario REAL,
  precio_venta REAL,
  local_id INTEGER
);

CREATE TABLE IF NOT EXISTS v_masvendidos (
  producto_id INTEGER,
  producto_nombre VARCHAR(255),
  total_vendido REAL,
  ingresos_totales REAL
);

CREATE TABLE IF NOT EXISTS v_usuario_almacen (
  usuario_id INTEGER,
  usuario_nombre VARCHAR(255),
  almacen_id INTEGER,
  almacen_nombre VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS tblproduct_expirados_view (
  producto_id INTEGER,
  producto_vencimiento DATE,
  producto_nombre VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tblproduct_next_exp_view (
  producto_id INTEGER,
  producto_vencimiento DATE,
  producto_nombre VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tblproduct_view (
  ID INTEGER,
  ID_INT VARCHAR(50),
  BARCODE VARCHAR(255),
  DESCRIPCION VARCHAR(100),
  CANTIDAD REAL,
  UNIDAD VARCHAR(45),
  COSTO REAL,
  PRECIO REAL,
  LOCALIDAD VARCHAR(50),
  LINEA VARCHAR(50),
  GRUPO VARCHAR(45),
  VENCIMIENTO DATE,
  ESTADO INTEGER
);

CREATE TABLE IF NOT EXISTS tbl_cero_cantidad (
  producto_id INTEGER,
  producto_codigo_barra VARCHAR(255),
  producto_nombre VARCHAR(100),
  producto_stockminimo REAL,
  cantidad REAL
);

CREATE TABLE IF NOT EXISTS lst_producto_view (
  producto_id INTEGER,
  producto_nombre VARCHAR(255),
  producto_codigo_barra VARCHAR(255),
  stock REAL,
  precio REAL
);

-- =====================================================
-- TRIGGERS PARA UPDATE AUTOMÁTICO (updated_at)
-- =====================================================

-- Trigger para actualizar updated_at en cliente
CREATE TRIGGER IF NOT EXISTS update_cliente_timestamp 
AFTER UPDATE ON cliente
BEGIN
  UPDATE cliente SET updated_at = CURRENT_TIMESTAMP WHERE id_cliente = NEW.id_cliente;
END;

-- Trigger para actualizar updated_at en producto
CREATE TRIGGER IF NOT EXISTS update_producto_timestamp 
AFTER UPDATE ON producto
BEGIN
  UPDATE producto SET updated_at = CURRENT_TIMESTAMP WHERE producto_id = NEW.producto_id;
END;

-- Trigger para actualizar updated_at en usuario
CREATE TRIGGER IF NOT EXISTS update_usuario_timestamp 
AFTER UPDATE ON usuario
BEGIN
  UPDATE usuario SET updated_at = CURRENT_TIMESTAMP WHERE id_usuario = NEW.id_usuario;
END;

-- Trigger para actualizar updated_at en venta
CREATE TRIGGER IF NOT EXISTS update_venta_timestamp 
AFTER UPDATE ON venta
BEGIN
  UPDATE venta SET updated_at = CURRENT_TIMESTAMP WHERE venta_id = NEW.venta_id;
END;

-- Trigger para actualizar updated_at en proveedor
CREATE TRIGGER IF NOT EXISTS update_proveedor_timestamp 
AFTER UPDATE ON proveedor
BEGIN
  UPDATE proveedor SET updated_at = CURRENT_TIMESTAMP WHERE id_proveedor = NEW.id_proveedor;
END;

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_venta_cliente ON venta(id_cliente);
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON venta(fecha);
CREATE INDEX IF NOT EXISTS idx_venta_local ON venta(local_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto ON detalle_venta(id_producto);
CREATE INDEX IF NOT EXISTS idx_producto_almacen_local ON producto_almacen(id_local);
CREATE INDEX IF NOT EXISTS idx_producto_codigo ON producto(producto_codigo_barra);
CREATE INDEX IF NOT EXISTS idx_cliente_identificacion ON cliente(identificacion);
CREATE INDEX IF NOT EXISTS idx_caja_movimiento_fecha ON caja_movimiento(fecha_mov);
CREATE INDEX IF NOT EXISTS idx_kardex_producto ON kardex(producto_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_proveedor ON ingreso(id_proveedor);

-- =====================================================
-- FIN DEL SCHEMA COMPLETO
-- Total de tablas: 154+
-- Incluye: tablas de datos, vistas, triggers e índices
-- =====================================================




