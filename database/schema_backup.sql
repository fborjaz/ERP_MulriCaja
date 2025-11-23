-- Esquema principal de la base de datos para ERP Multicajas RD

-- Tabla de ConfiguraciÃ³n
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

-- Tabla de CategorÃ­as de Productos
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

-- Inserts iniciales (Datos bÃ¡sicos para empezar)
INSERT OR IGNORE INTO configuracion (clave, valor, descripcion, tipo) VALUES 
('ITBIS_PORCENTAJE', '18.00', 'Porcentaje de ITBIS', 'decimal'),
('MONEDA', 'DOP', 'Moneda principal', 'text'),
('NOMBRE_EMPRESA', 'Mi Empresa', 'Nombre de la empresa', 'text');

INSERT OR IGNORE INTO usuarios (codigo, nombre, apellido, username, password, rol) VALUES 
('ADMIN001', 'Administrador', 'Sistema', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador'); -- La contraseÃ±a es 'password'

INSERT OR IGNORE INTO cajas (codigo, nombre) VALUES 
('CAJA01', 'Caja Principal');

INSERT OR IGNORE INTO clientes (codigo, nombre, apellido) VALUES 
('CLI-GENERICO', 'Cliente', 'GenÃ©rico');

INSERT OR IGNORE INTO categorias (nombre, descripcion) VALUES 
('General', 'CategorÃ­a por defecto para todos los productos');

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
    numero TEXT UNIQUE NOT NULL, -- Número de factura del proveedor
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
    numero TEXT UNIQUE NOT NULL, -- Número de apartado
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
    numero TEXT UNIQUE NOT NULL, -- Número de cotización
    cliente_id INTEGER,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME,
    total REAL NOT NULL,
    estado TEXT DEFAULT 'Pendiente', -- e.g., 'Pendiente', 'Aceptada', 'Rechazada', 'Convertida'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
);

-- Tabla de Detalles de Cotización
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

-- Tabla de Notas de Crédito
CREATE TABLE IF NOT EXISTS notas_credito (


-- Tabla de Notas de CrÃ©dito
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

