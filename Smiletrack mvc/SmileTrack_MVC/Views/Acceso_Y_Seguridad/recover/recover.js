/**
 * ════════════════════════════════════════════════════════
 * SMILETRACK — LÓGICA DE RECUPERAR CONTRASEÑA
 * Archivo: views/auth/recover/recover.js
 * Propósito: Validar email, manejar envío y mostrar feedback al usuario
 * ════════════════════════════════════════════════════════
 */

/**
 * Clase principal que encapsula toda la funcionalidad de la vista
 * Patrón: Clase con constructor para inicialización limpia
 */
class PasswordRecovery {

    /**
     * Constructor: se ejecuta al crear la instancia
     * Aquí guardamos referencias a los elementos del DOM que usaremos
     */
    constructor() {
        // Referencia al formulario principal
        this.form = document.getElementById('recoverForm');
        // Campo de entrada de email
        this.emailInput = document.getElementById('email');
        // Botón de envío
        this.recoverBtn = document.getElementById('recoverBtn');
        // Contenedor para mensajes de feedback del email
        this.emailFeedback = document.getElementById('emailFeedback');
        // Enlace para volver al login
        this.backToLogin = document.getElementById('backToLogin');

        // Iniciar la aplicación
        this.init();
    }

    /**
     * Método de inicialización: configura eventos y estado inicial
     */
    init() {
        // Vincular los eventos a los elementos (click, input, submit, etc.)
        this.bindEvents();
        // Enfocar automáticamente el campo de email para mejor UX
        this.emailInput.focus();
    }

    /**
     * Vincula todos los eventos de la interfaz con sus funciones
     * Separar eventos en un método propio hace el código más mantenible
     */
    bindEvents() {
        // Validación en tiempo real mientras el usuario escribe
        this.emailInput.addEventListener('input', () => this.validateEmail());
        // Validación adicional al perder el foco (blur)
        this.emailInput.addEventListener('blur', () => this.validateEmail());

        // Manejar el envío del formulario
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Permitir enviar con la tecla Enter (UX estándar)
        this.emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.isEmailValid()) {
                this.handleSubmit(e);
            }
        });

        // Manejar clic en "Volver al inicio de sesión"
        this.backToLogin.addEventListener('click', (e) => {
            // Prevenir comportamiento por defecto del enlace
            e.preventDefault();
            // Navegar al login con transición suave
            this.goToLogin();
        });
    }

    /**
     * Valida el formato del email y muestra feedback visual
     * Se ejecuta en cada tecla pulsada y al perder el foco
     */
    validateEmail() {
        // Obtener valor y quitar espacios al inicio/final
        const email = this.emailInput.value.trim();
        // Verificar si cumple con el formato de email válido
        const isValid = this.isEmailValid(email);

        // === FEEDBACK VISUAL EN EL INPUT ===
        // Borde verde si es válido, rojo si es inválido y tiene contenido
        this.emailInput.classList.toggle('border-green-300', isValid);
        this.emailInput.classList.toggle('border-red-300', !isValid && email);

        // === FEEDBACK DE TEXTO ===
        if (email) {
            // Mostrar mensaje según validez
            this.emailFeedback.textContent = isValid
                ? '✓ Correo válido. Puedes continuar.'
                : '✗ Ingresa un correo electrónico válido.';
            // Aplicar clase de color correspondiente
            this.emailFeedback.classList.add(isValid ? 'text-success' : 'text-error');
            // Mostrar el mensaje (quitar clase 'hidden')
            this.emailFeedback.classList.remove('hidden');
        } else {
            // Ocultar mensaje si el campo está vacío
            this.emailFeedback.classList.add('hidden');
        }

        // === ESTADO DEL BOTÓN ===
        // Deshabilitar si el email no es válido o está vacío
        this.recoverBtn.disabled = !isValid || !email;
        // Reducir opacidad visual cuando está deshabilitado
        this.recoverBtn.classList.toggle('opacity-50', !isValid || !email);
    }

    /**
     * Verifica si un email tiene formato válido usando expresión regular
     * @param {string} email - El correo a validar (por defecto el del input)
     * @returns {boolean} - true si es válido, false si no
     */
    isEmailValid(email = this.emailInput.value.trim()) {
        // Regex simple pero efectivo para formato básico de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Maneja el envío del formulario
     * @param {Event} e - Evento de submit del formulario
     */
    async handleSubmit(e) {
        // Prevenir recarga de página por defecto
        e.preventDefault();

        // Validación final de seguridad antes de enviar
        if (!this.isEmailValid()) {
            this.showToast('Por favor ingresa un correo válido', 'error');
            this.emailInput.focus();
            return;
        }

        // === ESTADO DE CARGA ===
        // Mostrar spinner y deshabilitar botón para evitar doble envío
        this.setLoading(true);

        try {
            // Intentar enviar el correo de recuperación
            await this.sendRecoveryEmail();
            // Si tiene éxito, mostrar mensaje de confirmación
            this.showToast('¡Instrucciones enviadas! Revisa tu correo.', 'success');

            // Resetear formulario después de 3 segundos
            setTimeout(() => {
                this.emailInput.value = '';
                this.emailInput.classList.remove('border-green-300');
                this.emailFeedback.classList.add('hidden');
                this.setLoading(false);
            }, 3000);

        } catch (error) {
            // Manejar errores de conexión o servidor
            this.showToast('Error al enviar. Verifica tu conexión.', 'error');
            this.setLoading(false);
        }
    }

    /**
     * Simula el envío del email de recuperación (reemplazar con API real)
     * @returns {Promise} - Resuelve si tiene éxito, rechaza si falla
     */
    async sendRecoveryEmail() {
        return new Promise((resolve, reject) => {
            // Simular tiempo de respuesta de servidor (2-3 segundos)
            setTimeout(() => {
                const email = this.emailInput.value;
                // Simular éxito si el email contiene @ (validación básica)
                if (email.includes('@')) {
                    resolve({
                        message: 'Recovery email sent successfully',
                        email
                    });
                } else {
                    reject(new Error('Invalid email'));
                }
            }, 2000 + Math.random() * 1000);
        });
    }

    /**
     * Alterna el estado de carga del botón
     * @param {boolean} loading - true para mostrar spinner, false para restaurar
     */
    setLoading(loading) {
        if (loading) {
            // Guardar HTML original para restaurar después
            this.recoverBtn.disabled = true;
            const originalHTML = this.recoverBtn.innerHTML;
            this.recoverBtn.dataset.original = originalHTML;

            // Reemplazar contenido con spinner animado
            this.recoverBtn.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="loading-spinner"></div>
                    Enviando...
                </div>
            `;
        } else {
            // Restaurar botón a su estado original
            this.recoverBtn.innerHTML = this.recoverBtn.dataset.original || 'Enviar Instrucciones';
            this.recoverBtn.disabled = false;
        }
    }

    /**
     * Navega al login con transición suave de opacidad
     * Link corregido: ../auth/login/index.html
     */
    goToLogin() {
        // Efecto visual de desvanecimiento antes de cambiar de página
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '0';

        // Esperar la transición antes de redirigir
        setTimeout(() => {
            window.location.href = '../login/index.html';
        }, 300);
    }

    /**
     * Muestra una notificación toast temporal en pantalla
     * @param {string} message - Texto a mostrar
     * @param {string} type - Tipo: 'success', 'error' o 'info'
     */
    showToast(message, type = 'info') {
        // Eliminar toasts anteriores para evitar acumulación
        document.querySelectorAll('.toast').forEach(toast => toast.remove());

        // Crear nuevo elemento toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icono según el tipo de mensaje
        const iconName = type === 'success' ? '' : type === 'error' ? 'error' : 'info';

        // Estructura HTML del toast
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">
                    ${iconName}
                </span>
                <span>${message}</span>
            </div>
        `;

        // Agregar al body para que flote sobre todo
        document.body.appendChild(toast);

        // Disparar animación de entrada
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto-ocultar después de 4.5 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            // Esperar animación de salida antes de eliminar del DOM
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    }
}

// ════════════════════════════════════════════════════════
// INICIALIZACIÓN DE LA APLICACIÓN
// Se ejecuta cuando el DOM está completamente cargado
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    new PasswordRecovery();
});

// ════════════════════════════════════════════════════════
// SERVICE WORKER PARA PWA (OPCIONAL)
// Permite que la app funcione offline en el futuro
// ════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Ignorar errores de registro (no crítico para funcionalidad básica)
        });
    });
}