/**
 * SMILETRACK — ASISTENCIA EN PROCEDIMIENTO (app.js)
 * Lógica con timer, persistencia de estado y accesibilidad
 */

// Obtiene elemento del DOM con manejo seguro de null
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

// Reduce llamadas a función en eventos frecuentes de input
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

// Muestra notificación temporal con auto-cierre y cleanup de timeout
const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;

  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// Gestiona persistencia del timer y estado de píldoras con localStorage
const procedureStorage = {
  key: 'smiletrack_procedure_20260320_1003',
  
  // Carga estado guardado o usa valores por defecto
  load: () => {
    const stored = localStorage.getItem(procedureStorage.key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error al cargar estado del procedimiento, usando valores por defecto');
      }
    }
    return {
      minutes: 24,
      startTime: '2026-03-20T10:03',
      pills: {
        limpieza: false,
        esterilizacion: false,
        equipos: false
      }
    };
  },
  
  // Guarda estado en localStorage
  save: (state) => {
    try {
      localStorage.setItem(procedureStorage.key, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Error al guardar estado del procedimiento:', e);
      return false;
    }
  },
  
  // Actualiza minutos transcurridos
  updateMinutes: (minutes) => {
    const state = procedureStorage.load();
    state.minutes = minutes;
    procedureStorage.save(state);
  },
  
  // Actualiza estado de una píldora específica
  updatePill: (pillId, completed) => {
    const state = procedureStorage.load();
    state.pills[pillId] = completed;
    procedureStorage.save(state);
  }
};

// Inicializa menú móvil con gestión de foco y atributos ARIA
const initMobileMenu = () => {
  const sidebar = safeGetElement('sidebar');
  const overlay = safeGetElement('overlay');
  const hamburger = safeGetElement('hamburger');

  if (!sidebar || !overlay || !hamburger) return;

  const toggleMenu = (show) => {
    if (show) {
      sidebar.classList.add('open');
      overlay.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      overlay.setAttribute('aria-hidden', 'false');
      
      const firstLink = sidebar.querySelector('.nav-item');
      if (firstLink) firstLink.focus();
    } else {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('aria-hidden', 'true');
      hamburger.focus();
    }
  };

  hamburger.addEventListener('click', () => toggleMenu(true));
  overlay.addEventListener('click', () => toggleMenu(false));

  sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 680) toggleMenu(false);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });
};

// Inicializa timer del procedimiento con persistencia
const initTimer = () => {
  const timerValue = safeGetElement('timerValue');
  if (!timerValue) return;
  
  // Carga minutos guardados
  const state = procedureStorage.load();
  let minutes = state.minutes;
  
  // Actualiza display inicial
  timerValue.textContent = minutes;
  
  // Inicia intervalo para incrementar cada minuto real
  const timerInterval = setInterval(() => {
    minutes++;
    timerValue.textContent = minutes;
    procedureStorage.updateMinutes(minutes);
  }, 60000);
  
  // Limpia intervalo al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
  });
};

// Inicializa píldoras de procedimiento con persistencia y feedback
const initProcedurePills = () => {
  const pills = [
    { el: safeGetElement('pillLimpieza'), id: 'limpieza', label: 'Limpieza' },
    { el: safeGetElement('pillEsterilizacion'), id: 'esterilizacion', label: 'Esterilización' },
    { el: safeGetElement('pillEquipos'), id: 'equipos', label: 'Equipos' }
  ];
  
  // Carga estado guardado y aplica a cada píldora
  const savedState = procedureStorage.load().pills;
  pills.forEach(({ el, id, label }) => {
    if (!el) return;
    
    // Aplica estado guardado
    const isCompleted = savedState[id] || false;
    if (isCompleted) {
      el.classList.add('completed');
      el.setAttribute('aria-pressed', 'true');
      el.setAttribute('aria-label', `${label} completada`);
    }
    
    // Maneja click para toggle de estado
    el.addEventListener('click', () => {
      const wasCompleted = el.classList.contains('completed');
      const isNowCompleted = !wasCompleted;
      
      // Actualiza estado visual
      el.classList.toggle('completed', isNowCompleted);
      el.setAttribute('aria-pressed', isNowCompleted);
      el.setAttribute('aria-label', isNowCompleted ? `${label} completada` : `Marcar ${label} como completada`);
      
      // Guarda en localStorage
      procedureStorage.updatePill(id, isNowCompleted);
      
      // Feedback visual con toast
      showToast(`${label} ${isNowCompleted ? 'completada ✓' : 'marcada como pendiente'}`, isNowCompleted ? 'success' : 'warning');
    });
    
    // Soporte para teclado en píldoras
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });
};

// Función principal de inicialización
const init = () => {
  try {
    // Inicializar componentes de UI
    initMobileMenu();
    initTimer();
    initProcedurePills();
    
    // Limpieza de listeners al unload para evitar memory leaks
    window.addEventListener('beforeunload', () => {
      // Remover listeners en implementación SPA real
    });
  } catch (e) {
    console.error('[SmileTrack] Error inicializando modulo', e);
    mostrarErrorUsuario(e.message || 'Error cargando módulo. Intente recargar.');
  }
};

function mostrarErrorUsuario(mensaje) {
  let div = document.getElementById('smiletrack-error-bar');
  if (!div) {
    div = document.createElement('div');
    div.id = 'smiletrack-error-bar';
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:white;padding:14px 20px;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,.15);border-bottom:3px solid #991b1b;';
    div.setAttribute('role', 'alert');
    document.body.appendChild(div);
  }
  div.innerHTML = '<strong>[SmileTrack]</strong> ' + mensaje + ' <button onclick="document.getElementById(\'smiletrack-error-bar\').style.display=\'none\'" style="margin-left:16px;background:white;color:#dc2626;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;">×</button>';
  div.style.display = 'block';
}

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);