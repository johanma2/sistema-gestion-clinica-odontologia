/**
 * SMILETRACK — DASHBOARD ADMINISTRADOR (app.js)
 * Accesibilidad + Performance optimizada
 */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN GLOBALES
// ═══════════════════════════════════════════════════════════════════
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.ApiBase) ? window.APP_CONFIG.ApiBase : '/api';
const activeAnimations = new Set();
const toastQueue = [];
let isToastShowing = false;

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

// Obtiene elemento del DOM con manejo seguro de null
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack][UI] Elemento no encontrado: #${id}`);
  return el;
};

// Reduce llamadas a función en eventos frecuentes (con maxWait)
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

// Muestra notificación con cola y limpieza correcta
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

// Tracking de animaciones para limpieza
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

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE ANIMACIÓN (DOM ESTÁTICO)
// ═══════════════════════════════════════════════════════════════════

// Anima contador numérico
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
  // Animar números de stats
  document.querySelectorAll('.stat-number[data-target]').forEach(el => {
    animateCounter(el, el.dataset.target);
  });

  // Animar barras de estado y progreso generadas por Razor
  trackedRAF(() => {
    document.querySelectorAll('[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  });
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS 
// ═══════════════════════════════════════════════════════════════════

// Exporta reporte
async function exportReport() {
  try {
    // TODO: [2026-07-20] Integrar API real de exportación
    await new Promise((resolve, reject) => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    console.error('[SmileTrack][API] Error exportando reporte:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN DE COMPONENTES
// ═══════════════════════════════════════════════════════════════════

const cleanupHandlers = [];

// Inicializa sidebar móvil con gestión de foco y ARIA
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

  // Registro para limpieza
  cleanupHandlers.push(() => {
    hamburger.removeEventListener('click', handleHamburgerClick);
    overlay.removeEventListener('click', handleOverlayClick);
    document.removeEventListener('keydown', handleKeyDown);
  });

  // Navegación en móvil
  const navItems = sidebar.querySelectorAll('.nav-item');
  const handleNavClick = () => {
    if (window.innerWidth <= 680) toggleMenu(false);
  };
  navItems.forEach(item => item.addEventListener('click', handleNavClick));
  cleanupHandlers.push(() => {
    navItems.forEach(item => item.removeEventListener('click', handleNavClick));
  });
};

// Inicializa exportación de reportes
const initExport = () => {
  const btn = safeGetElement('btnExport');
  const progressBar = safeGetElement('topProgressBar');

  if (!btn || !progressBar) return;

  const handleExport = async () => {
    if (btn.disabled) return;

    btn.disabled = true;
    btn.innerHTML = '⏳ Generando...';

    progressBar.style.transition = 'width 2.5s cubic-bezier(.4,0,.2,1)';
    progressBar.style.width = '100%';

    try {
      await exportReport();
      showToast('✅ Reporte generado exitosamente');
    } catch (error) {
      showToast('❌ Error al generar reporte', 'error');
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '📊 Exportar reporte';
        const originalWidth = progressBar.closest('.progress-row').getAttribute('aria-valuenow');
        progressBar.style.width = (originalWidth || '75') + '%';
      }, 500);
    }
  };

  btn.addEventListener('click', handleExport);
  cleanupHandlers.push(() => btn.removeEventListener('click', handleExport));
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

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

  // Limpieza al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    activeAnimations.forEach(id => cancelAnimationFrame(id));
    activeAnimations.clear();
    cleanupHandlers.forEach(fn => fn());
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);