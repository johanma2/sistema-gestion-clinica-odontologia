/**
 * ════════════════════════════════════════════════════════
 * SMILETRACK — RECUPERAR CONTRASEÑA (3 PASOS)
 * recover.js
 * ════════════════════════════════════════════════════════
 */

class PasswordRecovery {
    constructor() {
        // Referencias DOM
        this.steps = {
            1: document.getElementById('step1'),
            2: document.getElementById('step2'),
            3: document.getElementById('step3'),
            success: document.getElementById('successStep')
        };
        this.indicators = document.querySelectorAll('.step-indicator');
        this.stepDesc = document.getElementById('stepDescription');
        
        // Formularios
        this.form1 = document.getElementById('step1');
        this.form2 = document.getElementById('step2');
        this.form3 = document.getElementById('step3');
        
        // Inputs
        this.emailInput = document.getElementById('email');
        this.codeInput = document.getElementById('code');
        this.newPassInput = document.getElementById('newPassword');
        this.confirmPassInput = document.getElementById('confirmPassword');
        
        // Feedback
        this.emailError = document.getElementById('emailError');
        this.codeError = document.getElementById('codeError');
        this.passMatch = document.getElementById('passMatch');
        this.maskedEmail = document.getElementById('maskedEmail');
        
        // Botones
        this.resendBtn = document.getElementById('resendCode');
        this.back1 = document.getElementById('backToStep1');
        this.back2 = document.getElementById('backToStep2');
        this.resetBtn = document.getElementById('resetBtn');
        
        // Estado
        this.currentStep = 1;
        this.verificationCode = null;
        this.userEmail = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupPasswordValidation();
        setTimeout(() => this.emailInput?.focus(), 300);
    }

    bindEvents() {
        // Paso 1: Email
        this.form1?.addEventListener('submit', (e) => this.handleStep1(e));
        this.emailInput?.addEventListener('input', () => this.clearError(this.emailError));
        
        // Paso 2: Código
        this.form2?.addEventListener('submit', (e) => this.handleStep2(e));
        this.codeInput?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
            this.clearError(this.codeError);
        });
        this.back1?.addEventListener('click', () => this.goToStep(1));
        this.resendBtn?.addEventListener('click', () => this.resendCode());
        
        // Paso 3: Nueva contraseña
        this.form3?.addEventListener('submit', (e) => this.handleStep3(e));
        this.newPassInput?.addEventListener('input', () => this.validatePassword());
        this.confirmPassInput?.addEventListener('input', () => this.validatePasswordMatch());
        this.back2?.addEventListener('click', () => this.goToStep(2));
        
        // Toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePassword(e));
        });
    }

    // ── NAVEGACIÓN ENTRE PASOS ──────────────────────────
    goToStep(step) {
        // Ocultar todos los pasos
        Object.values(this.steps).forEach(s => s?.classList.add('hidden'));
        
        // Mostrar paso actual
        this.steps[step]?.classList.remove('hidden');
        this.currentStep = step;
        
        // Actualizar indicadores
        this.indicators.forEach((ind, i) => {
            ind.classList.toggle('active', i + 1 === step);
            ind.classList.toggle('completed', i + 1 < step);
        });
        
        // Actualizar descripción
        const descriptions = {
            1: 'Ingresa tu correo electrónico y te enviaremos un código de verificación.',
            2: 'Revisa tu correo e ingresa el código de 6 dígitos que recibiste.',
            3: 'Crea una nueva contraseña segura para tu cuenta.'
        };
        this.stepDesc.textContent = descriptions[step];
        
        // Enfocar primer input del paso
        const firstInput = this.steps[step]?.querySelector('input');
        setTimeout(() => firstInput?.focus(), 100);
    }

    // ── PASO 1: EMAIL ───────────────────────────────────
    async handleStep1(e) {
        e.preventDefault();
        const email = this.emailInput.value.trim();
        
        if (!this.isValidEmail(email)) {
            this.showError(this.emailError, 'Ingresa un correo electrónico válido');
            return;
        }
        
        this.setLoading(this.form1.querySelector('button'), true);
        
        try {
            const response = await this.sendRecoveryCode(email);
            if (!response.success) {
                this.showError(this.emailError, response.message || 'Error al enviar el código. Intenta de nuevo.');
                return;
            }

            this.userEmail = email;
            this.maskedEmail.textContent = this.maskEmail(email);
            this.showToast(response.message || 'Código enviado a tu correo', 'success');
            this.goToStep(2);
            this.codeInput.focus();
        } catch (error) {
            this.showError(this.emailError, 'Error al enviar código. Intenta de nuevo.');
        } finally {
            this.setLoading(this.form1.querySelector('button'), false);
        }
    }

    // ── PASO 2: CÓDIGO ──────────────────────────────────
    async handleStep2(e) {
        e.preventDefault();
        const code = this.codeInput.value.trim();
        
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            this.showError(this.codeError, 'Ingresa un código válido de 6 dígitos');
            return;
        }
        
        this.setLoading(this.form2.querySelector('button[type="submit"]'), true);
        
        try {
            // Simular verificación (acepta cualquier código de 6 dígitos)
            await this.verifyCode(code);
            
            this.showToast('Código verificado', 'success');
            this.goToStep(3);
            this.newPassInput.focus();
        } catch (error) {
            this.showError(this.codeError, 'Error de verificación. Intenta de nuevo.');
        } finally {
            this.setLoading(this.form2.querySelector('button[type="submit"]'), false);
        }
    }

    resendCode() {
        if (!this.userEmail) return;
        this.resendBtn.disabled = true;
        this.resendBtn.textContent = 'Enviando...';
        
        setTimeout(() => {
            this.verificationCode = this.generateCode();
            this.showToast('Nuevo código enviado', 'info');
            this.resendBtn.disabled = false;
            this.resendBtn.textContent = '¿No recibiste el código? Reenviar';
        }, 1500);
    }

    // ── PASO 3: NUEVA CONTRASEÑA ────────────────────────
    setupPasswordValidation() {
        const checks = {
            length: { el: document.getElementById('passLength'), test: v => v.length >= 8 },
            upper: { el: document.getElementById('passUpper'), test: v => /[A-Z]/.test(v) },
            number: { el: document.getElementById('passNumber'), test: v => /[0-9]/.test(v) }
        };
        
        this.newPassInput?.addEventListener('input', () => {
            const val = this.newPassInput.value;
            Object.entries(checks).forEach(([key, check]) => {
                check.el.classList.toggle('valid', check.test(val));
            });
            this.validatePasswordMatch();
        });
    }

    validatePasswordMatch() {
        const newPass = this.newPassInput.value;
        const confirm = this.confirmPassInput.value;
        
        if (confirm && newPass !== confirm) {
            this.passMatch.textContent = 'Las contraseñas no coinciden';
            this.passMatch.className = 'text-xs mt-2 text-error';
            this.passMatch.classList.remove('hidden');
            return false;
        } else if (confirm) {
            this.passMatch.textContent = '✓ Las contraseñas coinciden';
            this.passMatch.className = 'text-xs mt-2 text-success';
            this.passMatch.classList.remove('hidden');
            return true;
        }
        this.passMatch.classList.add('hidden');
        return false;
    }

    async handleStep3(e) {
        e.preventDefault();
        
        if (!this.validatePasswordRequirements()) {
            this.showToast('La contraseña no cumple los requisitos', 'error');
            return;
        }
        
        if (!this.validatePasswordMatch()) {
            this.showToast('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (!this.userEmail) {
            this.showToast('Ocurrió un error. Regresa al paso anterior.', 'error');
            return;
        }

        const codigo = this.codeInput.value.trim();
        if (codigo.length !== 6 || !/^[0-9]{6}$/.test(codigo)) {
            this.showError(this.codeError, 'Ingresa un código válido de 6 dígitos');
            this.goToStep(2);
            return;
        }
        
        this.setLoading(this.resetBtn, true);
        
        try {
            const response = await this.resetPassword(this.userEmail, codigo, this.newPassInput.value);
            if (!response.success) {
                this.showToast(response.message || 'Error al restablecer. Intenta de nuevo.', 'error');
                this.goToStep(2);
                return;
            }

            Object.values(this.steps).forEach(s => s?.classList.add('hidden'));
            this.steps.success?.classList.remove('hidden');
            this.stepDesc.textContent = 'Tu contraseña ha sido actualizada exitosamente.';
            this.showToast(response.message || '¡Contraseña restablecida!', 'success');
        } catch (error) {
            this.showToast('Error al restablecer. Intenta de nuevo.', 'error');
            this.goToStep(2);
        } finally {
            this.setLoading(this.resetBtn, false);
        }
    }

    // ── VALIDACIONES ────────────────────────────────────
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
    }

    validatePasswordRequirements() {
        const val = this.newPassInput.value;
        return val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val);
    }

    togglePassword(e) {
        const btn = e.currentTarget;
        const input = btn.closest('.relative').querySelector('input');
        const icon = btn.querySelector('.visibility-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility_off';
        }
    }

    // ── UTILIDADES ──────────────────────────────────────
    showError(el, msg) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    clearError(el) {
        el?.classList.add('hidden');
    }

    setLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        btn.classList.toggle('opacity-70', loading);
        btn.classList.toggle('cursor-wait', loading);
    }

    maskEmail(email) {
        const [user, domain] = email.split('@');
        return `${user.slice(0, 3)}***@${domain}`;
    }

    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    getCsrfToken() {
        const match = document.cookie.match(/(^|; )XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[2]) : null;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        
        const icons = { success: 'check_circle', error: 'error', info: 'info' };
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close" aria-label="Cerrar">&times;</button>
        `;
        
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // ── SIMULACIONES DE API (Reemplazar en producción) ─
    async sendRecoveryCode(email) {
        const response = await fetch('/acceso-y-seguridad/recover/send-code', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': this.getCsrfToken()
            },
            body: JSON.stringify({ correo: email })
        });

        if (!response.ok) {
            return { success: false, message: 'No se pudo enviar el código. Intenta más tarde.' };
        }

        return response.json();
    }

    async resetPassword(email, code, newPassword) {
        const response = await fetch('/acceso-y-seguridad/recover/reset-password', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': this.getCsrfToken()
            },
            body: JSON.stringify({ correo: email, codigo: code, nuevaContrasena: newPassword })
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            return { success: false, message: body?.message ?? 'No se pudo restablecer la contraseña.' };
        }

        return response.json();
    }
}


// ════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    new PasswordRecovery();
});