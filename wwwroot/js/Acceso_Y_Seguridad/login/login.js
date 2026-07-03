/**
 * SMILETRACK — LOGIN (MODO DEMO)
 * ✅ CORREGIDO: Roles funcionando + validación visual desactivada
 */

document.addEventListener('DOMContentLoaded', function () {

  // Referencias
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');
  const errorMsg = document.getElementById('errorMsg');
  const errorText = document.getElementById('errorText');
  const toggleBtn = document.getElementById('togglePassword');
  const toggleIcon = document.getElementById('toggleIcon');
  const roleButtons = document.querySelectorAll('.role-btn');
  const selectedRoleInput = document.getElementById('selectedRole');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');

  let selectedRoute = null;

  // ═══════════════════════════════════════
  //  TOGGLE PASSWORD
  // ═══════════════════════════════════════
  if (toggleBtn && passInput && toggleIcon) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = passInput.type === 'password';
      passInput.type = isHidden ? 'text' : 'password';
      toggleIcon.textContent = isHidden ? 'visibility_off' : 'visibility';
      toggleBtn.setAttribute('aria-pressed', isHidden);
      toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
      passInput.focus();
    });
  }

  // ═══════════════════════════════════════
  //  SELECCIÓN DE ROL — ✅ CORREGIDO
  // ═══════════════════════════════════════
  const activateRole = (btn) => {
    roleButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    
    // Guardar la ruta y actualizar el rol que se enviará al servidor
    selectedRoute = btn.dataset.route;
    if (selectedRoleInput) {
      selectedRoleInput.value = btn.dataset.roleLabel || btn.dataset.role || 'Profesional';
    }
    
    // Efecto visual suave
    btn.style.transform = 'scale(1.02)';
    setTimeout(() => btn.style.transform = '', 150);
  };

  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => activateRole(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateRole(btn);
      }
    });
  });

  // Activar "Odontólogo" por defecto
  const defaultBtn = Array.from(roleButtons).find(b => b.dataset.role === 'profesional') || roleButtons[0];
  if (defaultBtn) activateRole(defaultBtn);

  // ═══════════════════════════════════════
  //  TOAST NOTIFICATION
  // ═══════════════════════════════════════
  const showToast = (msg) => {
    if (toastMsg) toastMsg.textContent = msg;
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    }
  };

  // ═══════════════════════════════════════
  //  SUBMIT FORM — MODO DEMO
  // ═══════════════════════════════════════
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      if (errorMsg) errorMsg.classList.add('hidden');

      const email = emailInput?.value.trim();
      const pass = passInput?.value.trim();
      
      if (!email || !pass) {
        e.preventDefault();
        if (errorText) errorText.textContent = 'Completa correo y contraseña';
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const originalHTML = loginBtn.innerHTML;
      loginBtn.disabled = true;
      loginBtn.setAttribute('aria-busy', 'true');
      loginBtn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> <span>Iniciando sesión...</span>';

      showToast('✅ Bienvenido, redirigiendo...');
      loginForm.submit();

      // Si por algún motivo el navegador no envía el formulario, se restablece el botón.
      setTimeout(() => {
        if (loginBtn.disabled) {
          loginBtn.disabled = false;
          loginBtn.setAttribute('aria-busy', 'false');
          loginBtn.innerHTML = originalHTML;
        }
      }, 5000);
    });
  }

  // ═══════════════════════════════════════
  //  KEYBOARD SUPPORT
  // ═══════════════════════════════════════
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && loginForm?.contains(e.target)) {
      if (!loginBtn?.disabled) loginForm?.requestSubmit();
    }
    if (e.key === 'Escape' && errorMsg && !errorMsg.classList.contains('hidden')) {
      errorMsg.classList.add('hidden');
      emailInput?.focus();
    }
  });

});