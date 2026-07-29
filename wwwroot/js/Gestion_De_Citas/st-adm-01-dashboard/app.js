/**
 * SMILETRACK — DASHBOARD ADMINISTRADOR (app.js)
 * Accesibilidad + Performance optimizada
 */

// ════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN GLOBAL
// ════════════════════════════════════════════════════════════════════
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.ApiBase) ? window.APP_CONFIG.ApiBase : '/api';
const activeAnimations = new Set();
const toastQueue = [];
let isToastShowing = false;

// ════════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ════════════════════════════════════════════════════════════════════

const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack][UI] Elemento no encontrado: #${id}`);
  return el;
};

const debounce = (fn, delay, maxWait = null) => {
  let timeoutId;
  let lastInvokeTime = 0;
  return (...args) => {
    const now = Date.now();
    clearTimeout(timeoutId);
    if (maxWait && lastInvokeTime && (now - lastInvokeTime >= maxWait)) {
      lastInvokeTime = now;
      fn.apply(this, args);
    } else {
      if (!lastInvokeTime) lastInvokeTime = now;
      timeoutId = setTimeout(() => {
        lastInvokeTime = 0;
        fn.apply(this, args);
      }, delay);
    }
  };
};

const showToast = (message, type = 'success') => {
  toastQueue.push({ message, type });
  processToastQueue();
};

const processToastQueue = () => {
  if (isToastShowing || toastQueue.length === 0) return;

  const toast = safeGetElement('toast');
  if (!toast) return;

  isToastShowing = true;
  const current = toastQueue.shift();

  toast.textContent = current.message;
  toast.className = `toast ${current.type === 'error' ? 'error' : current.type === 'warning' ? 'warning' : ''} show`;

  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      isToastShowing = false;
      processToastQueue();
    }, 300); // Wait for transition
  }, 3000);
};

const trackedRAF = (callback) => {
  let id;
  const wrapper = (timestamp) => {
    callback(timestamp);
    activeAnimations.delete(id);
  };
  id = requestAnimationFrame(wrapper);
  activeAnimations.add(id);
  return id;
};

// ════════════════════════════════════════════════════════════════════
//  FUNCIONES DE ANIMACIÓN
// ════════════════════════════════════════════════════════════════════

const animateCounter = (el, targetStr) => {
  if (!el) return;
  const target = parseInt(targetStr, 10);
  if (isNaN(target) || target <= 0) return;

  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 30);
};

const initNativeAnimations = () => {
  document.querySelectorAll('.stat-number[data-target]').forEach(el => {
    animateCounter(el, el.dataset.target);
  });

  trackedRAF(() => {
    document.querySelectorAll('[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  });
};

// ════════════════════════════════════════════════════════════════════
//  EXPORTAR REPORTE PDF
// ════════════════════════════════════════════════════════════════════

async function exportReport() {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const blob = new Blob(['Reporte de Dashboard SmileTrack'], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('[SmileTrack][API] Error exportando reporte:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN DE COMPONENTES
// ════════════════════════════════════════════════════════════════════

const cleanupHandlers = [];

const initSidebar = () => {
  const hamburger = safeGetElement('hamburger');
  const sidebar = safeGetElement('sidebar');
  const overlay = safeGetElement('overlay');

  if (!hamburger || !sidebar || !overlay) return;

  const toggleMenu = (show) => {
    sidebar.classList.toggle('open', show);
    overlay.classList.toggle('open', show);
    hamburger.setAttribute('aria-expanded', show);
    overlay.setAttribute('aria-hidden', !show);

    if (show) {
      const firstLink = sidebar.querySelector('.nav-item');
      if (firstLink) firstLink.focus();
    } else {
      hamburger.focus();
    }
  };

  const handleHamburgerClick = () => toggleMenu(true);
  const handleOverlayClick = () => toggleMenu(false);
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  };

  hamburger.addEventListener('click', handleHamburgerClick);
  overlay.addEventListener('click', handleOverlayClick);
  document.addEventListener('keydown', handleKeyDown);

  cleanupHandlers.push(() => {
    hamburger.removeEventListener('click', handleHamburgerClick);
    overlay.removeEventListener('click', handleOverlayClick);
    document.removeEventListener('keydown', handleKeyDown);
  });

  const navItems = sidebar.querySelectorAll('.nav-item');
  const handleNavClick = () => {
    if (window.innerWidth <= 680) toggleMenu(false);
  };
  navItems.forEach(item => item.addEventListener('click', handleNavClick));
  cleanupHandlers.push(() => {
    navItems.forEach(item => item.removeEventListener('click', handleNavClick));
  });
};

const initExport = () => {
  const btn = safeGetElement('btnExport');
  const progressBar = safeGetElement('topProgressBar');

  if (!btn || !progressBar) return;

  const handleExport = async () => {
    if (btn.disabled) return;

    btn.disabled = true;
    btn.innerHTML = '⏳ Generando...';

    progressBar.style.transition = 'width 1s cubic-bezier(.4,0,.2,1)';
    progressBar.style.width = '100%';

    try {
      await exportReport();
      showToast('✅ Reporte PDF generado exitosamente');
    } catch (error) {
      showToast('❌ Error al generar reporte', 'error');
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '� Exportar PDF';
        const originalWidth = progressBar.closest('.progress-row').getAttribute('aria-valuenow');
        progressBar.style.width = (originalWidth || '75') + '%';
      }, 500);
    }
  };

  btn.addEventListener('click', handleExport);
  cleanupHandlers.push(() => btn.removeEventListener('click', handleExport));
};

// ════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════════

const init = async () => {
  try {
    initSidebar();
    initExport();
    initNativeAnimations();

    setTimeout(() => {
      showToast('✅ Panel administrativo cargado');
    }, 500);
 } catch (error) {
    console.error('[SmileTrack][Init] Falla crítica durante la inicialización:', error);
  }

  window.addEventListener('beforeunload', () => {
    activeAnimations.forEach(id => cancelAnimationFrame(id));
    activeAnimations.clear();
    cleanupHandlers.forEach(fn => fn());
  });
};
document.addEventListener('DOMContentLoaded', init);