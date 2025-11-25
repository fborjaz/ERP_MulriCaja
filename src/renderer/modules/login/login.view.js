import { authService } from '../../services/auth.service.js';
import { toast } from '../../components/notifications/toast.js';

export const LoginView = {
  async init() {
    this.loginForm = document.getElementById('login-form');
    this.loginError = document.getElementById('login-error');

    this.loginForm.addEventListener('submit', this.handleSubmit.bind(this));
  },

  async handleSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      await authService.login(username, password);
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
