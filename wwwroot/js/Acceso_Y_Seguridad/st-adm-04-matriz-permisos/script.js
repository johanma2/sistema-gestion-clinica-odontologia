/**
 * SMILETRACK — MATRIZ DE PERMISOS (permisos.js)
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
const ROLES = {
  ADM: { name: 'Administrador', color: 'admin' },
  ODO: { name: 'Odontólogo', color: 'odo' },
  PAC: { name: 'Paciente', color: 'pac' },
  REC: { name: 'Recepción', color: 'rec' },
  AUX: { name: 'Auxiliar', color: 'aux' },
};

const PERMISSIONS = {
  'CRUD': { label: 'CRUD', desc: 'Acceso total: Crear, Leer, Actualizar, Eliminar', class: 'crud' },
  'CRU': { label: 'CRU', desc: 'Crear, Leer, Actualizar (sin eliminar)', class: 'cru' },
  'RU': { label: 'RU', desc: 'Leer y Actualizar (solo edición)', class: 'ru' },
  'R': { label: 'R', desc: 'Solo Lectura (consulta)', class: 'r' },
  'C': { label: 'C', desc: 'Solo Creación (registro)', class: 'c' },
  '-': { label: '—', desc: 'Sin acceso al módulo', class: 'none' },
};

const SAMPLE_MODULES = [
  { id: 'usuario', name: 'Usuario', permissions: { ADM: 'CRUD', ODO: 'R', PAC: 'R', REC: 'R', AUX: 'R' } },
  { id: 'pacientes', name: 'Pacientes', permissions: { ADM: 'CRUD', ODO: 'R', PAC: 'CRU', REC: 'CRU', AUX: 'R' } },
  { id: 'profesionales', name: 'Profesionales', permissions: { ADM: 'CRUD', ODO: 'R', PAC: 'R', REC: 'R', AUX: 'R' } },
  { id: 'citas', name: 'Citas', permissions: { ADM: 'CRUD', ODO: 'RU', PAC: 'CRU', REC: 'CRUD', AUX: 'R' } },
  { id: 'historia_clinica', name: 'Historia clínica', permissions: { ADM: 'CRUD', ODO: 'CRU', PAC: 'R', REC: 'R', AUX: 'C' } },
  { id: 'facturacion', name: 'Facturación', permissions: { ADM: 'CRUD', ODO: 'R', PAC: 'CRU', REC: 'CRU', AUX: 'R' } },
  { id: 'servicios', name: 'Servicios', permissions: { ADM: 'CRUD', ODO: 'R', PAC: 'R', REC: 'R', AUX: 'R' } },
  { id: 'agenda', name: 'Agenda', permissions: { ADM: 'CRUD', ODO: 'CRU', PAC: 'R', REC: 'CRU', AUX: 'R' } },
  { id: 'reportes', name: 'Reportes', permissions: { ADM: 'CRUD', ODO: 'R', PAC: 'R', REC: 'RU', AUX: 'R' } },
  { id: 'bitacora', name: 'Bitácora', permissions: { ADM: 'CRUD', ODO: 'R', PAC: 'R', REC: 'C', AUX: 'C' } },
];

let modules = [...SAMPLE_MODULES];
let searchQuery = '';
let activeEdit = { moduleId: null, roleId: null };

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════

// Renderiza matriz de permisos con accesibilidad
const renderMatrix = () => {
  const body = safeGetElement('matrixBody');
  const empty = safeGetElement('emptyState');
  if (!body) return;
  
  // Filtrar módulos
  const filtered = modules.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Mostrar estado vacío si no hay resultados
  if (!filtered.length) {
    body.innerHTML = '';
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
  
  body.innerHTML = filtered.map(mod => {
    const roleKeys = ['ADM', 'ODO', 'PAC', 'REC', 'AUX'];
    
    return `
      <div class="matrix-row" role="row" tabindex="0" aria-label="Módulo ${mod.name}">
        <div class="matrix-row-module" role="rowheader">${mod.name}</div>
        <div class="matrix-row-roles" role="row">
          ${roleKeys.map(role => {
            const perm = mod.permissions[role] || '-';
            const permDef = PERMISSIONS[perm] || PERMISSIONS['-'];
            return `
              <button class="perm-cell ${permDef.class}"
                      role="gridcell"
                      aria-label="${mod.name} - ${ROLES[role].name}: ${permDef.label}"
                      data-module="${mod.id}"
                      data-role="${role}"
                      tabindex="0">
                ${permDef.label}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Agregar event listeners a celdas
  body.querySelectorAll('.perm-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      openModal(cell.dataset.module, cell.dataset.role);
    });
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(cell.dataset.module, cell.dataset.role);
      }
    });
  });
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL: EDITAR PERMISO
// ═══════════════════════════════════════════════════════════════════

// Abre modal para editar permiso
const openModal = (moduleId, roleId) => {
  const mod = modules.find(m => m.id === moduleId);
  const role = ROLES[roleId];
  if (!mod || !role) return;
  
  activeEdit = { moduleId, roleId };
  
  // Actualizar títulos
  const modalModule = safeGetElement('modalModule');
  const modalRole = safeGetElement('modalRole');
  if (modalModule) modalModule.textContent = mod.name;
  if (modalRole) modalRole.textContent = role.name;
  
  // Renderizar opciones de radio
  const container = safeGetElement('permission-options-container');
  const form = safeGetElement('formPermission');
  if (container && form) {
    const currentPerm = mod.permissions[roleId] || '-';
    
    container.innerHTML = Object.entries(PERMISSIONS).map(([key, def]) => `
      <label class="permission-option">
        <input type="radio" name="permLevel" value="${key}" class="perm-radio" ${key === currentPerm ? 'checked' : ''}>
        <span class="perm-label">
          <span class="perm-badge ${def.class}">${def.label}</span>
          <span class="perm-desc">${def.desc}</span>
        </span>
      </label>
    `).join('');
  }
  
  // Mostrar modal
  const modal = safeGetElement('modalEdit');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    
    // Enfocar primer radio
    const firstRadio = modal.querySelector('.perm-radio');
    if (firstRadio) firstRadio.focus();
    
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
  }
};

// Cierra modal de edición
const closeModal = () => {
  const modal = safeGetElement('modalEdit');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    
    // Restaurar scroll
    document.body.style.overflow = '';
  }
  activeEdit = { moduleId: null, roleId: null };
};

// Aplica cambio de permiso
const applyPermission = (e) => {
  e.preventDefault();
  
  const { moduleId, roleId } = activeEdit;
  if (!moduleId || !roleId) return;
  
  const selected = document.querySelector('input[name="permLevel"]:checked');
  if (!selected) return;
  
  const newValue = selected.value;
  const mod = modules.find(m => m.id === moduleId);
  if (mod) {
    mod.permissions[roleId] = newValue;
    
    // Re-renderizar matriz
    renderMatrix();
    closeModal();
    
    // Mostrar feedback
    const roleLabel = ROLES[roleId]?.name || roleId;
    showToast(`✅ ${roleLabel} en "${mod.name}": ${PERMISSIONS[newValue]?.label || newValue}`);
    updateFooterStatus();
  }
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS (Listas para conectar al backend C#)
// ═══════════════════════════════════════════════════════════════════

// Obtiene matriz de permisos desde API
async function fetchPermissions() {
  try {
    // En producción: fetch real a API
    // const res = await fetch(`${API_BASE}/admin/permissions`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    
    // Simulación con fallback
    return SAMPLE_MODULES;
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return SAMPLE_MODULES;
  }
}

// Guarda matriz de permisos en API
async function savePermissions(data) {
  try {
    // En producción: POST real a API
    // const res = await fetch(`${API_BASE}/admin/permissions`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data),
    // });
    // if (!res.ok) throw new Error('Save failed');
    // return true;
    
    // Simulación
    await new Promise(resolve => setTimeout(resolve, 800));
    return true;
  } catch (error) {
    console.warn('Error guardando permisos:', error);
    return false;
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

  // ✅ Navegación: cerrar menú en móvil, SIN bloquear enlaces
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

// Inicializa búsqueda en tiempo real
const initSearch = () => {
  const searchInput = safeGetElement('searchModules');
  searchInput?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value;
    renderMatrix();
  }, 250));
};

// Inicializa modal de edición
const initModal = () => {
  const modalClose = safeGetElement('modalClose');
  const modalCancel = safeGetElement('modalCancel');
  const modal = safeGetElement('modalEdit');
  const form = safeGetElement('formPermission');
  
  // Cerrar modal
  modalClose?.addEventListener('click', closeModal);
  modalCancel?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  
  // Submit del formulario
  form?.addEventListener('submit', applyPermission);
  
  // Soporte para teclado en modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) {
      e.preventDefault();
      closeModal();
    }
  });
};

// Inicializa guardado global
const initSave = () => {
  const btnSave = safeGetElement('btnSaveConfig');
  btnSave?.addEventListener('click', async () => {
    btnSave.disabled = true;
    btnSave.textContent = '⏳ Guardando...';
    
    try {
      const success = await savePermissions(modules);
      if (success) {
        showToast('✅ Configuración guardada exitosamente');
        updateFooterStatus('Configuración guardada en el servidor');
      } else {
        showToast('❌ Error al guardar', 'error');
      }
    } catch (error) {
      console.warn('Error en guardado:', error);
      showToast('❌ Error de conexión', 'error');
    } finally {
      setTimeout(() => {
        btnSave.disabled = false;
        btnSave.textContent = '💾 Guardar configuración';
      }, 500);
    }
  });
};

// Actualiza estado del pie de página
const updateFooterStatus = (customMsg) => {
  const status = safeGetElement('footerStatus');
  if (!status) return;
  
  const now = new Date();
  const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  
  status.textContent = customMsg || `Permisos sincronizados · ${date} ${time}`;
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  // Inicializar componentes de UI
  initSidebar();
  initSearch();
  initModal();
  initSave();
  
  // Cargar datos iniciales
  modules = await fetchPermissions();
  
  // Renderizar matriz
  renderMatrix();
  
  // Actualizar estado inicial
  updateFooterStatus('Configuración inicial cargada');
  
  // Limpieza al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);