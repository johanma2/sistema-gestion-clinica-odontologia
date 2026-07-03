/**
 * ════════════════════════════════════════════════════════
 * SMILETRACK — LÓGICA DE REGISTRO DE USUARIOS
 * Archivo: views/auth/register/register.js
 * Propósito: Validar formulario, mostrar fortaleza de contraseña y manejar envío
 * ════════════════════════════════════════════════════════
 */

/**
 * Clase principal que encapsula toda la funcionalidad del registro
 * Patrón: Clase con constructor para inicialización organizada y mantenible
 */
class DentalRegister {

    /**
     * Constructor: se ejecuta al crear la instancia de la clase
     * Aquí guardamos referencias a los elementos del DOM que usaremos frecuentemente
     */
    constructor() {
        // Referencia al formulario principal de registro
        this.form = document.getElementById('registerForm');
        // Campo de entrada para la contraseña
        this.passwordInput = document.getElementById('password');
        // Campo para confirmar la contraseña
        this.confirmPassword = document.getElementById('confirm-password');
        // Botón para mostrar/ocultar la contraseña
        this.passwordToggle = document.getElementById('togglePassword');
        // Barra visual que muestra la fortaleza de la contraseña
        this.passwordStrength = document.getElementById('passwordStrength');
        // Botón de envío del formulario
        this.registerBtn = document.getElementById('registerBtn');
        // Checkbox de aceptación de términos y condiciones
        this.termsCheckbox = document.getElementById('terms');

        // Iniciar la aplicación vinculando eventos y configurando estado inicial
        this.init();
    }

    /**
     * Método de inicialización: configura eventos y estado inicial de la interfaz
     */
    init() {
        // Vincular todos los eventos a sus funciones correspondientes
        this.bindEvents();
        // Enfocar automáticamente el primer campo para mejor experiencia de usuario
        this.autoFocus();
    }

    /**
     * Vincula todos los eventos de la interfaz con sus funciones handler
     * Separar eventos en un método propio hace el código más organizado y fácil de mantener
     */
    bindEvents() {
        // Toggle para mostrar/ocultar contraseña al hacer clic en el icono del ojo
        this.passwordToggle.addEventListener('click', () => this.togglePassword());

        // Actualizar barra de fortaleza mientras el usuario escribe la contraseña
        this.passwordInput.addEventListener('input', () => this.updatePasswordStrength());

        // Validar que la confirmación de contraseña coincida con la original
        this.confirmPassword.addEventListener('input', () => this.validateConfirmPassword());

        // Manejar el envío del formulario cuando el usuario hace clic en "Crear Cuenta"
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Validación en tiempo real para todos los campos requeridos del formulario
        this.form.querySelectorAll('input, select').forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.validateField(field));
        });

        // Habilitar/deshabilitar botón de registro según si se aceptan los términos
        this.termsCheckbox.addEventListener('change', () => this.toggleSubmitButton());
    }

    /**
     * Alterna la visibilidad de la contraseña entre texto plano y asteriscos
     * También cambia el icono del botón entre "ojo abierto" y "ojo tachado"
     */
    togglePassword() {
        // Cambiar el tipo de input entre password y text
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;

        // Actualizar el icono SVG según el estado de visibilidad
        const icon = this.passwordToggle.querySelector('svg');
        if (icon) {
            if (type === 'password') {
                // Icono de ojo abierto (contraseña oculta)
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
            } else {
                // Icono de ojo tachado (contraseña visible)
                icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>`;
            }
        }
    }

    /**
     * Calcula y muestra visualmente la fortaleza de la contraseña ingresada
     * Se ejecuta en cada tecla pulsada en el campo de contraseña
     */
    updatePasswordStrength() {
        const password = this.passwordInput.value;
        // Calcular nivel de fortaleza basado en criterios de seguridad
        const strength = this.calculateStrength(password);

        // Aplicar clase de color y ancho según el nivel calculado
        this.passwordStrength.className = `h-1 bg-gradient-to-r rounded-full overflow-hidden mt-1 ${strength.class}`;
        this.passwordStrength.style.width = `${strength.width}%`;
        // Mostrar u ocultar la barra según si hay texto en el campo
        this.passwordStrength.hidden = !password;

        // Validar el campo para actualizar estilos de borde según fortaleza
        this.validateField(this.passwordInput);
    }

    /**
     * Calcula un puntaje de fortaleza basado en criterios de seguridad estándar
     * @param {string} password - La contraseña a evaluar
     * @returns {object} Objeto con ancho porcentual y clase de color para la barra visual
     */
    calculateStrength(password) {
        let score = 0;
        // Criterios de evaluación: longitud, minúsculas, mayúsculas, números, caracteres especiales
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        // Retornar configuración visual según el puntaje obtenido
        if (score <= 2) return { width: 33, class: 'from-red-500 to-orange-500' };   /* Débil */
        if (score <= 4) return { width: 66, class: 'from-orange-500 to-yellow-500' }; /* Media */
        return { width: 100, class: 'from-green-500 to-emerald-500' };                /* Fuerte */
    }

    /**
     * Valida que la confirmación de contraseña coincida exactamente con la contraseña original
     * Aplica estilos visuales de éxito o error según el resultado
     */
    validateConfirmPassword() {
        const password = this.passwordInput.value;
        const confirm = this.confirmPassword.value;

        // Si hay texto y no coincide, aplicar estilo de error
        if (confirm && confirm !== password) {
            this.confirmPassword.classList.add('border-red-300', 'ring-2', 'ring-red-200');
            this.confirmPassword.classList.remove('border-green-300', 'ring-green-200');
        } else {
            // Si coincide o está vacío, aplicar estilo de éxito o neutro
            this.confirmPassword.classList.remove('border-red-300', 'ring-2', 'ring-red-200');
            this.confirmPassword.classList.add('border-green-300', 'ring-2', 'ring-green-200');
        }
    }

    /**
     * Valida un campo individual según reglas específicas para cada tipo de dato
     * @param {HTMLElement} field - El elemento input o select a validar
     */
    validateField(field) {
        const value = field.value.trim();
        // Limpiar clases de validación previas antes de aplicar nuevas
        field.classList.remove('border-red-300', 'ring-red-200', 'border-green-300', 'ring-green-200');

        let isValid = true;

        // Reglas de validación específicas según el nombre del campo
        switch (field.name) {
            case 'email':
                // Validar formato de correo electrónico con expresión regular
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                break;
            case 'phone':
                // Validar formato de teléfono internacional (E.164 simplificado)
                isValid = /^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s()-]/g, ''));
                break;
            case 'password':
                // Validar longitud mínima de 8 caracteres para contraseña
                isValid = value.length >= 8;
                break;
            case 'confirmPassword':
                // Validar que coincida con el campo de contraseña original
                isValid = value === this.passwordInput.value;
                break;
            default:
                // Validación genérica: al menos 2 caracteres para campos de texto
                isValid = value.length >= 2;
        }

        // Aplicar estilo visual según resultado de validación
        if (isValid && value) {
            field.classList.add('border-green-300', 'ring-2', 'ring-green-200/50');
        } else if (field.hasAttribute('required') && !value) {
            field.classList.add('border-red-300', 'ring-2', 'ring-red-200/50');
        }
    }

    /**
     * Habilita o deshabilita el botón de registro según el estado del checkbox de términos
     * También aplica estilos visuales de estado deshabilitado cuando corresponde
     */
    toggleSubmitButton() {
        this.registerBtn.disabled = !this.termsCheckbox.checked;
        this.registerBtn.classList.toggle('opacity-50', !this.termsCheckbox.checked);
        this.registerBtn.classList.toggle('cursor-not-allowed', !this.termsCheckbox.checked);
    }

    /**
     * Maneja el envío del formulario: valida, muestra carga y procesa el registro
     * @param {Event} e - Evento de submit del formulario
     */
    async handleSubmit(e) {
        // Prevenir comportamiento por defecto (recarga de página)
        e.preventDefault();

        // Validación final: verificar que todos los campos requeridos tengan valor
        let isValid = true;
        this.form.querySelectorAll('[required]').forEach(field => {
            if (!field.value.trim()) {
                this.validateField(field);
                isValid = false;
            }
        });

        // Si hay campos vacíos, mostrar mensaje de error y detener ejecución
        if (!isValid) {
            this.showNotification('Completa todos los campos requeridos', 'error');
            return;
        }

        // Verificar que las contraseñas coincidan antes de enviar
        if (this.passwordInput.value !== this.confirmPassword.value) {
            this.showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        // Activar estado de carga: mostrar spinner y deshabilitar botón
        this.setLoading(true);

        try {
            // Simular llamada a API de registro (reemplazar con fetch real en producción)
            await this.simulateApiCall();
            // Mostrar mensaje de éxito al usuario
            this.showNotification('¡Cuenta creada exitosamente!', 'success');

            // Redirigir al login después de 2 segundos para que el usuario vea el mensaje
            setTimeout(() => {
                window.location.href = "../login/index.html";
            }, 2000);
        } catch (error) {
            // Manejar errores de conexión o servidor
            this.showNotification('Error al crear cuenta. Inténtalo nuevamente.', 'error');
        } finally {
            // Restaurar botón a su estado normal independientemente del resultado
            this.setLoading(false);
        }
    }

    /**
     * Alterna el estado visual de carga del botón de registro
     * @param {boolean} loading - true para mostrar spinner, false para restaurar texto original
     */
    setLoading(loading) {
        const btn = this.registerBtn;
        if (loading) {
            // Guardar HTML original para poder restaurarlo después
            const original = btn.innerHTML;
            btn.dataset.original = original;
            // Reemplazar contenido con spinner animado y texto de carga
            btn.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Creando cuenta...
                </div>
            `;
            btn.disabled = true;
        } else {
            // Restaurar contenido y estado original del botón
            btn.innerHTML = btn.dataset.original || 'Crear Cuenta';
            btn.disabled = !this.termsCheckbox.checked;
        }
    }

    /**
     * Simula una llamada a API con tiempo de respuesta aleatorio
     * @returns {Promise} Resuelve si el email es válido, rechaza si no
     * NOTA: Reemplazar con fetch real a tu backend en producción
     */
    simulateApiCall() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const email = document.getElementById('email').value;
                // Simular éxito si el email tiene formato básico válido
                if (email.includes('@')) resolve();
                else reject();
            }, 2500);
        });
    }

    /**
     * Muestra una notificación temporal (toast) en la esquina superior derecha
     * @param {string} message - Texto del mensaje a mostrar
     * @param {string} type - Tipo de notificación: 'success', 'error' o 'info'
     */
    showNotification(message, type = 'info') {
        // Crear elemento de notificación dinámicamente
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl text-white font-medium transform translate-x-full transition-transform duration-300 ${type === 'success' ? 'bg-success' :
            type === 'error' ? 'bg-error' : 'bg-info'
            }`;
        notification.textContent = message;

        // Agregar al body para que flote sobre todo el contenido
        document.body.appendChild(notification);

        // Disparar animación de entrada: deslizarse desde la derecha
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full');
        });

        // Auto-ocultar después de 4 segundos con animación de salida
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Enfoca automáticamente el primer campo del formulario al cargar la página
     * Mejora la experiencia de usuario al permitir escribir inmediatamente sin hacer clic
     */
    autoFocus() {
        document.getElementById('first-name').focus();
    }
}

// ════════════════════════════════════════════════════════
// INICIALIZACIÓN DE LA APLICACIÓN
// Se ejecuta cuando el DOM está completamente cargado y listo para manipular
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    new DentalRegister();
});

// ════════════════════════════════════════════════════════
// SERVICE WORKER PARA PWA (OPCIONAL)
// Permite que la aplicación funcione offline en el futuro
// Se registra solo si el navegador lo soporta
// ════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}