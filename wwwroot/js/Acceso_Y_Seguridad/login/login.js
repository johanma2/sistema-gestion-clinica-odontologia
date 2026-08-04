/**
 * SMILETRACK — LOGIN
 * El usuario puede elegir el rol desde la interfaz y el backend valida que coincida con el rol del usuario.
 */

document.addEventListener('DOMContentLoaded', function () {
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const errorMsg = document.getElementById('errorMsg');
  const errorText = document.getElementById('errorText');
  const toggleBtn = document.getElementById('togglePassword');
  const toggleIcon = document.getElementById('toggleIcon');
  const roleButtons = document.querySelectorAll('.role-btn');
  const selectedRoleInput = document.getElementById('selectedRole');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const authModal = document.getElementById('authErrorModal');
  const authErrorClose = document.getElementById('authErrorClose');
  const authErrorCloseBtn = document.getElementById('authErrorCloseBtn');

  // ── Apertura del modal: el servidor controla si debe mostrarse (via clase 'hidden' en Razor).
  // Cuando el modal está visible al cargar la página, movemos el foco al botón de cierre.
  // Esto cumple los requisitos de accesibilidad: el usuario sabe inmediatamente que hay un modal abierto.
  const openAuthModal = () => {
    if (!authModal) return;
    authModal.classList.remove('hidden');
    authModal.setAttribute('aria-hidden', 'false');
    authModal.removeAttribute('inert');
    // Foco automático en el botón de cierre (WCAG 2.1 Focus Management)
    setTimeout(() => authErrorClose?.focus(), 60);
  };

  const closeAuthModal = () => {
    if (!authModal) return;
    authModal.classList.add('hidden');
    authModal.setAttribute('aria-hidden', 'true');
    authModal.setAttribute('inert', '');
    // Restaurar foco al campo de correo para que el usuario pueda reintentar
    emailInput?.focus();
  };

  // Si el servidor ya renderizó el modal abierto (errorStatus 401/403), aplicar foco automático
  if (authModal && !authModal.classList.contains('hidden')) {
    openAuthModal();
  }

  if (authErrorClose) authErrorClose.addEventListener('click', closeAuthModal);
  if (authErrorCloseBtn) authErrorCloseBtn.addEventListener('click', closeAuthModal);

  // Cerrar al hacer clic en el overlay (fuera de la caja del modal)
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  if (toggleBtn && passInput && toggleIcon) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = passInput.type === 'password';
      passInput.type = isHidden ? 'text' : 'password';
      toggleIcon.textContent = isHidden ? 'visibility' : 'visibility_off';
      toggleBtn.setAttribute('aria-pressed', String(isHidden));
      toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
      passInput.focus();
    });
  }

  const activateRole = (btn) => {
    roleButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');

    if (selectedRoleInput) {
      selectedRoleInput.value = btn.dataset.roleLabel || btn.dataset.role || 'Profesional';
    }
  };

  roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => activateRole(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateRole(btn);
      }
    });
  });

  const defaultBtn = Array.from(roleButtons).find((b) => b.dataset.role === 'profesional') || roleButtons[0];
  if (defaultBtn) activateRole(defaultBtn);

  const showToast = (msg) => {
    if (toastMsg) toastMsg.textContent = msg;
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    }
  };

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorMsg) errorMsg.classList.add('hidden');

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

      const originalHTML = loginBtn?.innerHTML || '';
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.setAttribute('aria-busy', 'true');
        loginBtn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> <span>Iniciando sesión...</span>';
      }

      // Intentar login AJAX para capturar token cuando la petición lo permita
      const formData = new FormData(loginForm);
      const body = new URLSearchParams();
      for (const pair of formData.entries()) body.append(pair[0], pair[1]);
      const csrfTokenMatch = document.cookie.match(/(^|; )XSRF-TOKEN=([^;]+)/);
      const csrfToken = csrfTokenMatch ? decodeURIComponent(csrfTokenMatch[2]) : null;

      // Usar el submit tradicional porque el backend maneja correctamente el antiforgery y la autenticación.
      // El login AJAX anterior estaba generando un 400 en el navegador en el flujo actual.
      loginForm.submit();

      setTimeout(() => {
        if (loginBtn && loginBtn.disabled) {
          loginBtn.disabled = false;
          loginBtn.setAttribute('aria-busy', 'false');
          loginBtn.innerHTML = originalHTML;
        }
      }, 5000);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && loginForm?.contains(e.target)) {
      if (!loginBtn?.disabled) loginForm?.requestSubmit();
    }
    // Escape: cierra el modal de autenticación si está abierto (prioridad sobre el error-box);
    // si no hay modal abierto, cierra el error-box inline.
    if (e.key === 'Escape') {
      if (authModal && !authModal.classList.contains('hidden')) {
        closeAuthModal();
      } else if (errorMsg && !errorMsg.classList.contains('hidden')) {
        errorMsg.classList.add('hidden');
        emailInput?.focus();
      }
    }
  });
});