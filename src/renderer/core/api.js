/**
 * API Bridge - Centraliza todas las llamadas IPC
 * @module renderer/core/api
 *
 * Este módulo actúa como un proxy directo al API expuesto por el preload script.
 */

// El objeto 'api' es inyectado en el scope global (window) por el preload script.
const api = window.api;

// Verificación de seguridad: si el preload script falló o no se cargó a tiempo,
// el objeto 'api' no existirá. Lanzamos un error claro para detener la ejecución
// y facilitar la depuración, ya que la app no puede funcionar sin él.
if (!api) {
  throw new Error("Error Crítico: El API del preload (window.api) no se ha cargado. La comunicación con el backend es imposible.");
}

// Exportamos la referencia directa para que el resto de la app la utilice.
export { api };
export default api;
