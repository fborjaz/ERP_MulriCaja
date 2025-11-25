<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Controlador de API de Sincronización
 * Endpoints para sincronización bidireccional Desktop <-> Nube
 * 
 * @package     IMAXPOS
 * @subpackage  Controllers
 * @category    API
 * @author      IMAXPOS Team
 * @version     1.0.0
 */
class Api_sync extends CI_Controller {

    public function __construct() {
        parent::__construct();
        
        // Headers CORS
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Content-Type: application/json');
        
        // Manejar preflight OPTIONS
        if ($this->input->method() === 'options') {
            $this->output->set_status_header(200);
            exit;
        }
        
        // Cargar modelo
        $this->load->model('Sync_model');
    }

    /**
     * Verificar estado de la API
     * GET /api/sync/status
     */
    public function status() {
        $this->output->set_output(json_encode([
            'status' => 'online',
            'message' => 'API de Sincronización IMAXPOS funcionando correctamente',
            'version' => '1.0.0',
            'server_time' => date('Y-m-d H:i:s'),
            'endpoints' => [
                'status' => 'GET /api/sync/status',
                'upload' => 'POST /api/sync/upload-changes',
                'download' => 'POST /api/sync/download-changes',
                'conflicts' => 'GET /api/sync/conflicts'
            ]
        ]));
    }

    /**
     * Descargar cambios desde la nube
     * POST /api/sync/download-changes
     * 
     * Body:
     * {
     *   "apiKey": "sk_live_...",
     *   "companyId": "42",
     *   "lastSyncTime": "2025-11-24 00:00:00",
     *   "tables": ["cliente", "producto"] // opcional
     * }
     */
    public function download_changes() {
        try {
            // Obtener datos del request
            $raw_input = file_get_contents('php://input');
            $input = json_decode($raw_input, true);
            
            if (!$input && json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Datos JSON inválidos: ' . json_last_error_msg());
            }
            
            $api_key = isset($input['apiKey']) ? $input['apiKey'] : null;
            $company_id = isset($input['companyId']) ? (int)$input['companyId'] : null;
            $last_sync = isset($input['lastSyncTime']) ? $input['lastSyncTime'] : null;
            $tables = isset($input['tables']) ? $input['tables'] : null;
            
            // Validar parámetros requeridos
            if (!$api_key) {
                throw new Exception('API Key requerida');
            }
            
            if (!$company_id) {
                throw new Exception('Company ID requerido');
            }
            
            // Verificar API Key
            $api_key_data = $this->Sync_model->verify_api_key($api_key, $company_id);
            
            if (!$api_key_data) {
                $this->output->set_status_header(401);
                $this->output->set_output(json_encode([
                    'success' => false,
                    'error' => 'API Key inválida o expirada'
                ]));
                return;
            }
            
            // Actualizar último uso
            $this->Sync_model->update_last_used($api_key_data['id']);
            
            // Obtener cambios
            $changes = $this->Sync_model->get_changes_since($company_id, $last_sync, $tables);
            
            // Respuesta exitosa
            $this->output->set_output(json_encode([
                'success' => true,
                'changes' => $changes,
                'total' => count($changes),
                'last_sync_time' => date('Y-m-d H:i:s'),
                'company_id' => $company_id
            ]));
            
        } catch (Exception $e) {
            // Log del error
            log_message('error', 'Api_sync download_changes: ' . $e->getMessage());
            log_message('error', 'Api_sync download_changes trace: ' . $e->getTraceAsString());
            
            // Respuesta de error con detalles
            $this->output->set_status_header(500);
            $this->output->set_output(json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'error_type' => get_class($e),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
                'trace' => explode("\n", $e->getTraceAsString())
            ], JSON_PRETTY_PRINT));
        } catch (Error $e) {
            // Capturar errores fatales de PHP 7+
            log_message('error', 'Api_sync download_changes FATAL: ' . $e->getMessage());
            log_message('error', 'Api_sync download_changes FATAL trace: ' . $e->getTraceAsString());
            
            $this->output->set_status_header(500);
            $this->output->set_output(json_encode([
                'success' => false,
                'error' => 'Error fatal: ' . $e->getMessage(),
                'error_type' => get_class($e),
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ], JSON_PRETTY_PRINT));
        }
    }

    /**
     * Subir cambios desde el desktop
     * POST /api/sync/upload-changes
     * 
     * Body:
     * {
     *   "apiKey": "sk_live_...",
     *   "companyId": "42",
     *   "changes": [
     *     {
     *       "table": "cliente",
     *       "operation": "insert",
     *       "data": {...}
     *     }
     *   ]
     * }
     */
    public function upload_changes() {
        try {
            // Obtener datos del request
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                throw new Exception('Datos JSON inválidos');
            }
            
            $api_key = isset($input['apiKey']) ? $input['apiKey'] : null;
            $company_id = isset($input['companyId']) ? (int)$input['companyId'] : null;
            $changes = isset($input['changes']) ? $input['changes'] : [];
            
            // Validar parámetros requeridos
            if (!$api_key) {
                throw new Exception('API Key requerida');
            }
            
            if (!$company_id) {
                throw new Exception('Company ID requerido');
            }
            
            if (empty($changes) || !is_array($changes)) {
                throw new Exception('Lista de cambios requerida');
            }
            
            // Verificar API Key
            $api_key_data = $this->Sync_model->verify_api_key($api_key, $company_id);
            
            if (!$api_key_data) {
                $this->output->set_status_header(401);
                $this->output->set_output(json_encode([
                    'success' => false,
                    'error' => 'API Key inválida o expirada'
                ]));
                return;
            }
            
            // Verificar permisos de escritura
            $permissions = isset($api_key_data['permissions']) ? json_decode($api_key_data['permissions'], true) : [];
            if (!in_array('sync.write', $permissions)) {
                $this->output->set_status_header(403);
                $this->output->set_output(json_encode([
                    'success' => false,
                    'error' => 'API Key no tiene permisos de escritura'
                ]));
                return;
            }
            
            // Actualizar último uso
            $this->Sync_model->update_last_used($api_key_data['id']);
            
            // Aplicar cambios
            $result = $this->Sync_model->apply_changes($company_id, $changes);
            
            // Respuesta exitosa
            $this->output->set_output(json_encode([
                'success' => true,
                'applied' => $result['applied'],
                'conflicts' => $result['conflicts'],
                'errors' => $result['errors'],
                'error_details' => isset($result['error_details']) ? $result['error_details'] : []
            ]));
            
        } catch (Exception $e) {
            // Log del error
            log_message('error', 'Api_sync upload_changes: ' . $e->getMessage());
            log_message('error', 'Api_sync upload_changes trace: ' . $e->getTraceAsString());
            
            // Respuesta de error
            $this->output->set_status_header(500);
            $this->output->set_output(json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'error_type' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]));
        }
    }

    /**
     * Obtener conflictos pendientes
     * GET /api/sync/conflicts?apiKey=...&companyId=42
     */
    public function conflicts() {
        try {
            $api_key = $this->input->get('apiKey');
            $company_id = $this->input->get('companyId') ? (int)$this->input->get('companyId') : null;
            
            if (!$api_key || !$company_id) {
                throw new Exception('API Key y Company ID requeridos');
            }
            
            // Verificar API Key
            $api_key_data = $this->Sync_model->verify_api_key($api_key, $company_id);
            
            if (!$api_key_data) {
                $this->output->set_status_header(401);
                $this->output->set_output(json_encode([
                    'success' => false,
                    'error' => 'API Key inválida o expirada'
                ]));
                return;
            }
            
            // Obtener conflictos
            $conflicts = $this->Sync_model->get_pending_conflicts($company_id);
            
            $this->output->set_output(json_encode([
                'success' => true,
                'conflicts' => $conflicts,
                'total' => count($conflicts)
            ]));
            
        } catch (Exception $e) {
            log_message('error', 'Api_sync conflicts: ' . $e->getMessage());
            
            $this->output->set_status_header(500);
            $this->output->set_output(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));
        }
    }
}

