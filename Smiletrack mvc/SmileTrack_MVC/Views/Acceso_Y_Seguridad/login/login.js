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
    
    // ✅ CORREGIDO: Usar data-route directamente
    selectedRoute = btn.dataset.route;
    
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
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Ocultar error previo
      if (errorMsg) errorMsg.classList.add('hidden');

      // ✅ CORREGIDO: Validación suave (sin bordes rojos)
      const email = emailInput?.value.trim();
      const pass = passInput?.value.trim();
      
      if (!email || !pass) {
        if (errorText) errorText.textContent = 'Completa correo y contraseña';
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Estado de carga
      const originalHTML = loginBtn.innerHTML;
      loginBtn.disabled = true;
      loginBtn.setAttribute('aria-busy', 'true');
      loginBtn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> <span>Iniciando sesión...</span>';

      try {
        // ⚠️ MODO DEMO: Simular login exitoso
        await new Promise(resolve => setTimeout(resolve, 1200));

        // ✅ CORREGIDO: Redirigir usando data-route del rol seleccionado
        const target = selectedRoute || '../../Gestion_De_Profesionales/st-odo-01-dashboard/index.html';
        
        showToast('✅ Bienvenido, redirigiendo...');
        
        setTimeout(() => {
          window.location.href = target;
        }, 800);

      } catch (err) {
        if (errorText) errorText.textContent = 'Error inesperado';
        if (errorMsg) errorMsg.classList.remove('hidden');
        loginBtn.disabled = false;
        loginBtn.setAttribute('aria-busy', 'false');
        loginBtn.innerHTML = originalHTML;
      }
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