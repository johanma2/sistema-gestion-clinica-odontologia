/**
 * SMILETRACK — MIS PACIENTES ODONTÓLOGO (pacientes.js)
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
//  DATOS DE EJEMPLO (Fallback si API falla)
// ═══════════════════════════════════════════════════════════════════
const SAMPLE_PACIENTES = [
  { id: 1, nombre: 'María López', cedula: '1.045.678.901', ultima: '15/03/2026', ultimaISO: '2026-03-15', servicio: 'Consulta General', proxima: '20/04/2026', proximaISO: '2026-04-20', estado: 'activo', alergias: ['Penicilina'], telefono: '300 123 4567', email: 'maria@email.com' },
  { id: 2, nombre: 'Carlos Ruiz', cedula: '1.098.765.432', ultima: '18/03/2026', ultimaISO: '2026-03-18', servicio: 'Limpieza Dental', proxima: '18/06/2026', proximaISO: '2026-06-18', estado: 'alta', alergias: [], telefono: '310 987 6543', email: 'carlos@email.com' },
  { id: 3, nombre: 'Pedro García', cedula: '1.234.567.890', ultima: '20/03/2026', ultimaISO: '2026-03-20', servicio: 'Control', proxima: '05/04/2026', proximaISO: '2026-04-05', estado: 'seguimiento', alergias: [], telefono: '315 555 1234', email: 'pedro@email.com' },
  { id: 4, nombre: 'Ana Martínez', cedula: '1.876.543.210', ultima: '10/03/2026', ultimaISO: '2026-03-10', servicio: 'Resina Dental', proxima: '10/04/2026', proximaISO: '2026-04-10', estado: 'activo', alergias: ['Látex'], telefono: '320 444 5678', email: 'ana@email.com' },
  { id: 5, nombre: 'Luis Herrera', cedula: '1.345.678.902', ultima: '12/02/2026', ultimaISO: '2026-02-12', servicio: 'Extracción', proxima: '—', proximaISO: null, estado: 'alta', alergias: [], telefono: '311 222 3344', email: 'luis@email.com' },
  { id: 6, nombre: 'Sara Gómez', cedula: '1.456.789.013', ultima: '05/03/2026', ultimaISO: '2026-03-05', servicio: 'Blanqueamiento', proxima: '05/06/2026', proximaISO: '2026-06-05', estado: 'activo', alergias: [], telefono: '318 777 8899', email: 'sara@email.com' },
];

let pacientes = [...SAMPLE_PACIENTES];

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════

// Determina clase CSS para badge de estado
const badgeClass = (estado) => {
  const map = {
    'activo': 'badge-activo',
    'seguimiento': 'badge-seguimiento',
    'alta': 'badge-alta',
  };
  return map[estado] || 'badge-activo';
};

// Obtiene etiqueta legible del estado
const estadoLabel = (estado) => {
  const map = {
    'activo': 'Activo',
    'seguimiento': 'En seguimiento',
    'alta': 'Alta médica',
  };
  return map[estado] || estado;
};

// Obtiene color de avatar basado en nombre
const getAvatarColor = (nombre) => {
  const colors = [
    'var(--avatar-bg-1)', 'var(--avatar-bg-2)', 'var(--avatar-bg-3)',
    'var(--avatar-bg-4)', 'var(--avatar-bg-5)'
  ];
  const index = nombre.charCodeAt(0) % colors.length;
  return colors[index];
};

// Obtiene iniciales del nombre
const getInitials = (nombre) => {
  return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Renderiza tabla de pacientes con accesibilidad
const renderTable = (data) => {
  const tbody = safeGetElement('pacientesTbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No se encontraron pacientes con los filtros aplicados.</td></tr>`;
    return;
  }
  
  data.forEach(p => {
    const tr = document.createElement('tr');
    tr.setAttribute('role', 'row');
    
    const proximaClase = p.proxima === '—' ? 'sin-cita' : '';
    const avatarColor = getAvatarColor(p.nombre);
    const initials = getInitials(p.nombre);
    
    tr.innerHTML = `
      <td class="td-paciente">
        <div class="p-avatar" style="background:${avatarColor}" aria-hidden="true">${initials}</div>
        <div>
          <div class="p-name">${p.nombre}</div>
          <div class="p-cedula">${p.cedula}</div>
        </div>
      </td>
      <td class="td-fecha"><time datetime="${p.ultimaISO}">${p.ultima}</time></td>
      <td>${p.servicio}</td>
      <td class="td-cita ${proximaClase}">
        ${p.proxima === '—' ? 'Sin cita' : `<time datetime="${p.proximaISO}">${p.proxima}</time>`}
      </td>
      <td><span class="badge ${badgeClass(p.estado)}" role="status" aria-label="Estado: ${estadoLabel(p.estado)}">${estadoLabel(p.estado)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Ver detalle" aria-label="Ver detalle de ${p.nombre}" onclick="openModal(${p.id})">👁️</button>
          <a href="../st-odo-03-historial/index.html" class="btn-icon" title="Historia clínica" aria-label="Ver historia clínica de ${p.nombre}">📋</a>
        </div>
      </td>
    `;
    
    // Click en fila para ver detalle (excepto en botones de acción)
    tr.style.cursor = 'pointer';
    tr.setAttribute('tabindex', '0');
    tr.setAttribute('aria-label', `Ver detalle de paciente ${p.nombre}`);
    
    tr.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-icon') && !e.target.closest('a')) openModal(p.id);
    });
    
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!e.target.closest('.btn-icon') && !e.target.closest('a')) openModal(p.id);
      }
    });
    
    tbody.appendChild(tr);
  });
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL DE DETALLE
// ═══════════════════════════════════════════════════════════════════

// Abre modal con información del paciente
const openModal = (id) => {
  const p = pacientes.find(a => a.id === id);
  if (!p) return;
  
  const content = safeGetElement('modalContent');
  if (content) {
    const avatarColor = getAvatarColor(p.nombre);
    const initials = getInitials(p.nombre);
    const alergiasHtml = p.alergias.length 
      ? `<span class="modal-val danger">${p.alergias.join(', ')}</span>`
      : '<span class="modal-val">Ninguna</span>';
    
    content.innerHTML = `
      <div class="modal-avatar-wrap">
        <div class="modal-avatar" style="background:${avatarColor}" aria-hidden="true">${initials}</div>
      </div>
      <h3 class="modal-name">${p.nombre}</h3>
      <p class="modal-cedula">${p.cedula}</p>
      <div class="modal-grid">
        <div class="modal-item">
          <div class="modal-key">Última consulta</div>
          <div class="modal-val"><time datetime="${p.ultimaISO}">${p.ultima}</time></div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Próxima cita</div>
          <div class="modal-val ${p.proxima === '—' ? 'danger' : ''}">
            ${p.proxima === '—' ? 'Sin cita' : `<time datetime="${p.proximaISO}">${p.proxima}</time>`}
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Servicio</div>
          <div class="modal-val">${p.servicio}</div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Estado</div>
          <div class="modal-val"><span class="badge ${badgeClass(p.estado)}">${estadoLabel(p.estado)}</span></div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Teléfono</div>
          <div class="modal-val">${p.telefono}</div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Email</div>
          <div class="modal-val">${p.email}</div>
        </div>
        <div class="modal-item" style="grid-column: span 2;">
          <div class="modal-key">Alergias</div>
          ${alergiasHtml}
        </div>
      </div>
    `;
  }
  
  const modalOverlay = safeGetElement('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    modalOverlay.removeAttribute('inert');
    
    // Enfocar botón de cerrar al abrir modal
    const closeBtn = safeGetElement('modalClose');
    if (closeBtn) closeBtn.focus();
    
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
  }
};

// Cierra modal y restaura estado
const closeModal = () => {
  const modalOverlay = safeGetElement('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    modalOverlay.setAttribute('inert', '');
    
    // Restaurar scroll
    document.body.style.overflow = '';
  }
};

// ═══════════════════════════════════════════════════════════════════
//  CONTADORES ANIMADOS
// ═══════════════════════════════════════════════════════════════════

// Anima contador numérico
const animateCounter = (el, target) => {
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 30);
};

// Actualiza contadores de estadísticas
const updateCounts = () => {
  const total = pacientes.length;
  const activos = pacientes.filter(p => p.estado === 'activo').length;
  const seguimiento = pacientes.filter(p => p.estado === 'seguimiento').length;
  const altas = pacientes.filter(p => p.estado === 'alta').length;
  
  animateCounter(safeGetElement('statTotal'), total);
  animateCounter(safeGetElement('statActivos'), activos);
  animateCounter(safeGetElement('statSeguimiento'), seguimiento);
  animateCounter(safeGetElement('statAltas'), altas);
};

// ═══════════════════════════════════════════════════════════════════
//  FILTROS Y BÚSQUEDA
// ═══════════════════════════════════════════════════════════════════

// Aplica filtros de búsqueda y estado
const applyFilters = () => {
  const searchInput = safeGetElement('searchInput');
  const filterSelect = safeGetElement('filterEstado');
  
  const q = searchInput?.value.toLowerCase() || '';
  const f = filterSelect?.value || '';
  
  const filtered = pacientes.filter(p =>
    (!q || p.nombre.toLowerCase().includes(q) || p.cedula.includes(q)) &&
    (!f || p.estado === f)
  );
  
  renderTable(filtered);
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS (Listas para conectar al backend C#)
// ═══════════════════════════════════════════════════════════════════

// Obtiene lista de pacientes desde API
async function fetchPacientes() {
  try {
    // En producción: fetch real a API
    // const res = await fetch(`${API_BASE}/pacientes`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    
    // Simulación
    return SAMPLE_PACIENTES;
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return SAMPLE_PACIENTES;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN DE COMPONENTES
// ═══════════════════════════════════════════════════════════════════

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

  hamburger.addEventListener('click', () => toggleMenu(true));
  overlay.addEventListener('click', () => toggleMenu(false));

  // Navegación: cerrar menú en móvil al hacer click
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 680) {
        toggleMenu(false);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });
};

// Inicializa modal con gestión de foco y teclado
const initModal = () => {
  const modalOverlay = safeGetElement('modalOverlay');
  const modalClose = safeGetElement('modalClose');
  
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  }
  
  // Soporte para teclado en modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay?.classList.contains('open')) {
      e.preventDefault();
      closeModal();
    }
  });
};

// Inicializa filtros y búsqueda con debounce
const initFilters = () => {
  const searchInput = safeGetElement('searchInput');
  const filterSelect = safeGetElement('filterEstado');
  
  searchInput?.addEventListener('input', debounce(applyFilters, 250));
  filterSelect?.addEventListener('change', applyFilters);
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  // Inicializar componentes de UI
  initSidebar();
  initModal();
  initFilters();
  
  // Cargar datos iniciales
  pacientes = await fetchPacientes();
  
  // Renderizar tabla y contadores
  renderTable(pacientes);
  updateCounts();
  
  // Limpieza al unload
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);