import { authService } from '../../services/auth.service.js';
import { toast } from '../../components/notifications/toast.js';

export const LoginView = {
  async init() {
    this.cajaSelect = document.getElementById('caja');
    this.loginForm = document.getElementById('login-form');
    this.loginError = document.getElementById('login-error');

    await this.populateCajas();
    this.loginForm.addEventListener('submit', this.handleSubmit.bind(this));
  },

  async populateCajas() {
    try {
      const cajas = await authService.loadCajas();
      this.cajaSelect.innerHTML = '<option value="">Seleccione una caja</option>';
      cajas.forEach(caja => {
        const option = document.createElement('option');
        option.value = caja.id;
        option.textContent = caja.nombre;
        this.cajaSelect.appendChild(option);
      });
    } catch (error) {
      toast.error('No se pudieron cargar las cajas.');
      console.error('Error loading cajas:', error);
    }
  },

  async handleSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const cajaId = this.cajaSelect.value;

    if (!cajaId) {
      toast.error('Por favor, seleccione una caja.');
      return;
    }

    try {
      await authService.login(username, password, parseInt(cajaId, 10));
      // En un login exitoso, recargamos la app. La lógica de inicialización
      // se encargará de mostrar la pantalla principal.
      location.reload();
    } catch (error) {
      this.loginError.textContent = 'Error: ' + error.message;
      this.loginError.classList.remove('hidden');
      toast.error('Fallo el inicio de sesión: ' + error.message);
    }
  }
};
