const fs = require('fs');
const path = require('path');

// Función para obtener ruta de recursos (desarrollo vs compilado)
function getResourcePath(relativePath) {
  const { app } = require('electron');
  
  if (app && app.isPackaged) {
    // Aplicación compilada
    return path.join(process.resourcesPath, relativePath);
  } else {
    // Modo desarrollo: subir un nivel desde /database para llegar a la raíz del proyecto
    return path.join(__dirname, '..', relativePath);
  }
}

module.exports = function initDatabase(db) {
  console.log('Inicializando base de datos desde archivos SQL...');
  
  // Intentar cargar desde archivos SQL embebidos
  const schemaPath = getResourcePath('database/schema.sql');
  const tablasAdicionales = getResourcePath('database/tablas-adicionales.sql');
  const tablasCotizaciones = getResourcePath('database/tablas-cotizaciones.sql');
  const tablasContabilidad = getResourcePath('database/tablas-contabilidad-rd.sql');
  
  // Ejecutar schema principal
  if (fs.existsSync(schemaPath)) {
    try {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
      console.log('✅ Schema principal cargado desde schema.sql');
    } catch (error) {
      console.error('Error cargando schema:', error);
      createBasicSchema(db);
    }
  } else {
    console.warn('Schema SQL no encontrado, creando esquema básico...');
    createBasicSchema(db);
  }
  
  // Ejecutar tablas adicionales
  if (fs.existsSync(tablasAdicionales)) {
    try {
      const adicionales = fs.readFileSync(tablasAdicionales, 'utf8');
      db.exec(adicionales);
      console.log('✅ Tablas adicionales cargadas');
    } catch (error) {
      console.warn('Error cargando tablas adicionales:', error.message);
    }
  }
  
  // Ejecutar tablas de cotizaciones
  if (fs.existsSync(tablasCotizaciones)) {
    try {
      const cotizaciones = fs.readFileSync(tablasCotizaciones, 'utf8');
      db.exec(cotizaciones);
      console.log('✅ Tablas de cotizaciones cargadas');
    } catch (error) {
      console.warn('Error cargando tablas de cotizaciones:', error.message);
    }
  }
  
  // Ejecutar tablas de contabilidad
  if (fs.existsSync(tablasContabilidad)) {
    try {
      const contabilidad = fs.readFileSync(tablasContabilidad, 'utf8');
      db.exec(contabilidad);
      console.log('✅ Tablas de contabilidad cargadas');
    } catch (error) {
      console.warn('Error cargando tablas de contabilidad:', error.message);
    }
  }
  
  console.log('✅ Base de datos inicializada correctamente');
};

function createBasicSchema(db) {
  // Crear esquema básico si no se encuentran los archivos SQL
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT,
      descripcion TEXT,
      tipo TEXT DEFAULT 'text',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'Vendedor',
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cajas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      activa INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insertar datos básicos
  const insertConfig = db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor, descripcion, tipo) VALUES (?, ?, ?, ?)');
  insertConfig.run('ITBIS_PORCENTAJE', '18.00', 'Porcentaje de ITBIS', 'decimal');
  insertConfig.run('MONEDA', 'DOP', 'Moneda principal', 'text');
  insertConfig.run('NOMBRE_EMPRESA', 'Mi Empresa', 'Nombre de la empresa', 'text');

  const insertUser = db.prepare('INSERT OR IGNORE INTO usuarios (codigo, nombre, apellido, username, password, rol) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('ADMIN001', 'Administrador', 'Sistema', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador');

  const insertCaja = db.prepare('INSERT OR IGNORE INTO cajas (codigo, nombre) VALUES (?, ?)');
  insertCaja.run('CAJA01', 'Caja Principal');
}
