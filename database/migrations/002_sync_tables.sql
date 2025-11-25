-- Migración 002: Tablas de Sincronización
-- Crea las tablas necesarias para la sincronización si no existen

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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sync_config_enabled ON sync_config(enabled);
CREATE INDEX IF NOT EXISTS idx_sync_log_type ON sync_log(sync_type, started_at);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resolved ON sync_conflicts(resolved, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_table ON sync_metadata(table_name);

