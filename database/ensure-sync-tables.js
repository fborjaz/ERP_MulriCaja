/**
 * Script para asegurar que las tablas de sincronización existan
 * Se ejecuta automáticamente al inicializar la BD
 */

module.exports = function ensureSyncTables(db) {
  console.log('🔍 Verificando tablas de sincronización...');
  
  try {
    // Verificar si existe sync_config
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('sync_config', 'sync_metadata', 'sync_log', 'sync_conflicts')
    `).all();
    
    const existingTables = tables.map(t => t.name);
    const requiredTables = ['sync_config', 'sync_metadata', 'sync_log', 'sync_conflicts'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`⚠️ Faltan tablas de sincronización: ${missingTables.join(', ')}`);
      console.log('📦 Creando tablas de sincronización...');
      
      // Crear sync_config
      if (!existingTables.includes('sync_config')) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS sync_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            api_url TEXT NOT NULL,
            empresa_id INTEGER,
            auth_token TEXT,
            auto_sync INTEGER DEFAULT 1,
            sync_interval INTEGER DEFAULT 300,
            last_successful_sync DATETIME,
            enabled INTEGER DEFAULT 1
          )
        `);
        console.log('✅ Tabla sync_config creada');
      }
      
      // Crear sync_metadata
      if (!existingTables.includes('sync_metadata')) {
        db.exec(`
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
          )
        `);
        console.log('✅ Tabla sync_metadata creada');
      }
      
      // Crear sync_log
      if (!existingTables.includes('sync_log')) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sync_type TEXT NOT NULL,
            table_name TEXT,
            operation TEXT,
            record_id INTEGER,
            status TEXT,
            error_message TEXT,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
          )
        `);
        console.log('✅ Tabla sync_log creada');
      }
      
      // Crear sync_conflicts
      if (!existingTables.includes('sync_conflicts')) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS sync_conflicts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            local_data TEXT,
            remote_data TEXT,
            resolution TEXT,
            resolved INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME
          )
        `);
        console.log('✅ Tabla sync_conflicts creada');
      }
      
      // Crear índices
      try {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_sync_config_enabled ON sync_config(enabled);
          CREATE INDEX IF NOT EXISTS idx_sync_log_type ON sync_log(sync_type, started_at);
          CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resolved ON sync_conflicts(resolved, created_at);
          CREATE INDEX IF NOT EXISTS idx_sync_metadata_table ON sync_metadata(table_name);
        `);
        console.log('✅ Índices de sincronización creados');
      } catch (error) {
        console.log('⚠️ Algunos índices pueden ya existir:', error.message);
      }
      
      console.log('✅ Todas las tablas de sincronización creadas');
    } else {
      console.log('✅ Todas las tablas de sincronización existen');
    }
  } catch (error) {
    console.error('❌ Error verificando/creando tablas de sincronización:', error);
  }
};

