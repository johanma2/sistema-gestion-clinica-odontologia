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

      const originalHTML = loginBtn?.innerHTML || '';
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.setAttribute('aria-busy', 'true');
        loginBtn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> <span>Iniciando sesión...</span>';
      }

      showToast('✅ Bienvenido, redirigiendo...');
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
    if (e.key === 'Escape' && errorMsg && !errorMsg.classList.contains('hidden')) {
      errorMsg.classList.add('hidden');
      emailInput?.focus();
    }
  });
});