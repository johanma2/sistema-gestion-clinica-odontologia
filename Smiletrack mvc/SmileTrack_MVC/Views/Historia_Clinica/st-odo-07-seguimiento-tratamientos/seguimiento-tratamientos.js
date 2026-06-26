/**
 * SMILETRACK — SEGUIMIENTO TRATAMIENTOS (seguimiento.js)
 * API-ready + Accesibilidad + Persistencia fallback
 */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN API
// ═══════════════════════════════════════════════════════════════════
const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

// Obtiene elemento del DOM con manejo seguro de null
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

// Reduce llamadas a función en eventos frecuentes
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

// Muestra notificación temporal con auto-cierre
const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;

  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ═══════════════════════════════════════════════════════════════════
//  PERSISTENCIA CON LOCALSTORAGE
// ═══════════════════════════════════════════════════════════════════

const seguimientoStorage = {
  key: 'smiletrack_seguimiento_pedro_garcia',
  
  // Carga datos desde localStorage o usa datos de ejemplo
  load: () => {
    const stored = localStorage.getItem(seguimientoStorage.key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error al cargar seguimiento, usando datos de ejemplo');
      }
    }
    // Datos de ejemplo iniciales
    return [
      {
        id: 1,
        nombre: 'Ortodoncia',
        paciente: 'Pedro García',
        estado: 'en-curso',
        progreso: 38,
        inicio: '2026-02-15',
        estimado: '2026-05-15',
        sesiones: 3,
        totalSesiones: 8,
        nota: '',
      },
      {
        id: 2,
        nombre: 'Endodoncia pieza 23',
        paciente: 'María López',
        estado: 'completado',
        progreso: 100,
        inicio: null,
        finalizado: '2026-03-20',
        sesiones: 2,
        totalSesiones: 2,
        nota: '',
      },
      {
        id: 3,
        nombre: 'Blanqueamiento',
        paciente: 'Ana Martínez',
        estado: 'pausado',
        progreso: 0,
        inicio: null,
        sesiones: 3,
        totalSesiones: 8,
        nota: 'Pausado por paciente',
      },
    ];
  },
  
  // Guarda datos en localStorage
  save: (data) => {
    try {
      localStorage.setItem(seguimientoStorage.key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error al guardar seguimiento:', e);
      return false;
    }
  },
  
  // Actualiza estado de un tratamiento
  updateTratamiento: (id, updates) => {
    const data = seguimientoStorage.load();
    const idx = data.findIndex(t => t.id === id);
    if (idx !== -1) {
      data[idx] = { ...data[idx], ...updates };
      seguimientoStorage.save(data);
      return true;
    }
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════
//  DATOS Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════

// Colores avatar
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#9333ea','#ef4444','#0ea5e9','#ec4899'];

// Genera color consistente para avatar de paciente
const avatarColor = (n) => {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

// Genera iniciales para avatar
const getInitials = (n) => {
  const p = n.trim().split(' ');
  return (p[0]?.[0] || '') + (p[1]?.[0] || '');
};

// Estado local
let allTratamientos = [];
let filtroActivo = 'en-curso';

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES DE FECHA
// ═══════════════════════════════════════════════════════════════════

// Formatea fecha ISO a formato legible
const fmtFecha = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: LISTA DE TRATAMIENTOS
// ═══════════════════════════════════════════════════════════════════

// Renderiza lista de tratamientos con accesibilidad
const renderLista = (data) => {
  const list = safeGetElement('tratamientosList');
  const empty = safeGetElement('emptyState');
  if (!list) return;

  const filtrados = filtroActivo === 'todos'
    ? data
    : data.filter(t => t.estado === filtroActivo);

  if (!filtrados.length) {
    list.innerHTML = '';
    if (empty) {
      empty.style.display = 'block';
      empty.setAttribute('aria-hidden', 'false');
    }
    return;
  }
  
  if (empty) {
    empty.style.display = 'none';
    empty.setAttribute('aria-hidden', 'true');
  }

  list.innerHTML = filtrados.map(t => buildCard(t)).join('');

  // Animar barras después del render con requestAnimationFrame
  requestAnimationFrame(() => {
    document.querySelectorAll('.prog-bar[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  });
};

// Construye HTML de una card de tratamiento con accesibilidad
const buildCard = (t) => {
  const color = avatarColor(t.paciente);
  const inits = getInitials(t.paciente);

  // Badge
  const badgeMap = {
    'en-curso':   { cls: 'badge-en-curso', label: 'En curso' },
    'completado': { cls: 'badge-completado', label: 'Completado' },
    'pausado':    { cls: 'badge-pausado', label: 'Pausado' },
  };
  const badge = badgeMap[t.estado] || badgeMap['pausado'];

  // Barra de progreso
  let barClass = 'bar-orange', pctClass = 'pct-orange';
  if (t.estado === 'completado') { barClass = 'bar-green'; pctClass = 'pct-green'; }
  if (t.estado === 'pausado')    { barClass = 'bar-red'; pctClass = 'pct-red'; }

  // Footer según estado
  let footer = '';
  if (t.estado === 'en-curso') {
    footer = `
      <span class="trat-meta">Inicio: <strong><time datetime="${t.inicio}">${fmtFecha(t.inicio) || '—'}</time></strong></span>
      <span class="trat-meta">Estimado: <strong><time datetime="${t.estimado}">${fmtFecha(t.estimado) || '—'}</time></strong></span>
      <span class="trat-meta">Sesiones: <strong>${t.sesiones} de ${t.totalSesiones}</strong></span>
    `;
  } else if (t.estado === 'completado') {
    footer = `
      <span class="trat-meta">Finalizado: <strong><time datetime="${t.finalizado}">${fmtFecha(t.finalizado) || '—'}</time></strong></span>
      <span class="trat-meta">Sesiones: <strong>${t.sesiones} de ${t.totalSesiones}</strong></span>
    `;
  } else if (t.estado === 'pausado') {
    footer = `
      <span class="trat-meta pausado-note">${t.nota || 'Pausado'} · ${t.sesiones} de ${t.sesiones} sesiones</span>
      <span class="trat-meta" style="margin-left:auto">Sesiones: <strong>${t.sesiones} de ${t.totalSesiones}</strong></span>
    `;
  }

  return `
    <div class="trat-card estado-${t.estado}" role="listitem" aria-labelledby="trat-title-${t.id}" tabindex="0">
      <div class="trat-header">
        <span class="trat-nombre" id="trat-title-${t.id}">${t.nombre}</span>
        <span class="badge-estado ${badge.cls}" role="status" aria-label="Estado: ${badge.label}">${badge.label}</span>
      </div>
      <div class="trat-paciente">
        <div class="p-chip" style="background:${color}" aria-hidden="true">${inits}</div>
        <span class="p-chip-name">${t.paciente}</span>
      </div>
      <div class="trat-progress-row">
        <span class="prog-pct ${pctClass}" aria-label="Progreso: ${t.progreso}%">${t.progreso}%</span>
        <div class="prog-bar-bg" role="progressbar" aria-valuenow="${t.progreso}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso del tratamiento ${t.nombre}: ${t.progreso}% completado">
          <div class="prog-bar ${barClass}" data-width="${t.progreso}" style="width:0"></div>
        </div>
      </div>
      <div class="trat-footer">${footer}</div>
    </div>
  `;
};

// ═══════════════════════════════════════════════════════════════════
//  ACTUALIZAR CONTADORES DE FILTROS
// ═══════════════════════════════════════════════════════════════════

// Actualiza contadores de filtros
const updateCounts = (data) => {
  const cntCurso = safeGetElement('cntCurso');
  const cntCompletado = safeGetElement('cntCompletado');
  const cntPausado = safeGetElement('cntPausado');
  
  if (cntCurso) cntCurso.textContent = data.filter(t => t.estado === 'en-curso').length;
  if (cntCompletado) cntCompletado.textContent = data.filter(t => t.estado === 'completado').length;
  if (cntPausado) cntPausado.textContent = data.filter(t => t.estado === 'pausado').length;
};

// ═══════════════════════════════════════════════════════════════════
//  FILTROS DE ESTADO
// ═══════════════════════════════════════════════════════════════════

// Inicializa tabs de filtros con accesibilidad
const initFilterTabs = () => {
  const filterTabs = safeGetElement('filterTabs');
  if (!filterTabs) return;
  
  filterTabs.addEventListener('click', function(e) {
    const btn = e.target.closest('.ftab');
    if (!btn) return;
    
    // Actualizar estado visual de tabs
    document.querySelectorAll('.ftab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    
    // Actualizar filtro y renderizar
    filtroActivo = btn.dataset.filter;
    renderLista(allTratamientos);
  });
  
  // Soporte para teclado en tabs
  filterTabs.addEventListener('keydown', (e) => {
    const tabs = Array.from(filterTabs.querySelectorAll('.ftab'));
    const currentIndex = tabs.findIndex(t => t.classList.contains('active'));
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      tabs[nextIndex]?.click();
      tabs[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      tabs[prevIndex]?.click();
      tabs[prevIndex]?.focus();
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR MÓVIL CON GESTIÓN DE FOCO Y ARIA
// ═══════════════════════════════════════════════════════════════════

// Inicializa sidebar móvil con gestión de foco y ARIA
const initSidebar = () => {
  const ham = safeGetElement('hamburger');
  const sb = safeGetElement('sidebar');
  const ov = safeGetElement('overlay');
  
  if (!ham || !sb || !ov) return;

  const toggleMenu = (show) => {
    sb.classList.toggle('open', show);
    ov.classList.toggle('open', show);
    ham.setAttribute('aria-expanded', show);
    ov.setAttribute('aria-hidden', !show);
    
    if (show) {
      const firstLink = sb.querySelector('.nav-item');
      if (firstLink) firstLink.focus();
    } else {
      ham.focus();
    }
  };

  ham.addEventListener('click', () => toggleMenu(true));
  ov.addEventListener('click', () => toggleMenu(false));

  // ✅ Navegación: cerrar menú en móvil, SIN bloquear enlaces
  sb.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 680) {
        toggleMenu(false);
      }
    });
  });

  // Escape cierra sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sb.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS (Listas para conectar al backend C#)
// ═══════════════════════════════════════════════════════════════════

// Obtiene tratamientos desde API
async function fetchTratamientos() {
  try {
    // En producción: fetch real a API
    // const res = await fetch(`${API_BASE}/patients/1/tratamientos`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    
    // Simulación con fallback a localStorage
    return seguimientoStorage.load();
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return seguimientoStorage.load();
  }
}

// Actualiza tratamiento en API
async function updateTratamientoAPI(id, updates) {
  try {
    // En producción: PATCH real a API
    // await fetch(`${API_BASE}/patients/tratamientos/${id}`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(updates),
    // });
    
    // Simulación: actualizar localStorage
    seguimientoStorage.updateTratamiento(id, updates);
  } catch (error) {
    console.warn('Error al actualizar tratamiento en API:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  // Inicializar componentes de UI
  initSidebar();
  initFilterTabs();
  
  // Cargar datos (API con fallback a localStorage)
  allTratamientos = await fetchTratamientos();
  
  // Actualizar contadores y renderizar lista
  updateCounts(allTratamientos);
  renderLista(allTratamientos);
  
  // Limpieza al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);