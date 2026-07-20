/**
 * SMILETRACK — GESTIÓN PROFESIONALES (profesionales.js)
 * API-ready + Accesibilidad + Persistencia fallback
 */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN API
// ═══════════════════════════════════════════════════════════════════
const API_BASE = '/gestion-de-profesionales';

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
//  DATOS DE EJEMPLO (ya no se necesitan para el flujo real)
// ═══════════════════════════════════════════════════════════════════
const SPEC_COLORS = {
  'Odontología General': 'general',
  'Ortodoncia': 'ortodoncia',
  'Endodoncia': 'endodoncia',
  'Odontopediatría': 'pediatria',
  'Cirugía Oral': 'cirugia',
  'Periodoncia': 'periodoncia',
  'Implantología': 'implante',
  'Rehabilitación Oral': 'rehab',
};

let professionals = [];
let searchQuery = '';

const shouldUseServerRenderedTable = () => {
  const tbody = safeGetElement('professionalsTbody');
  return !!(tbody && tbody.children.length > 0);
};
let selectedSpecialty = '';
let selectedStatus = '';
let currentPage = 1;
const itemsPerPage = 5;
let editingId = null;

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE RENDERIZADO
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

// Obtiene clase CSS para badge de especialidad
const getSpecBadgeClass = (specialty) => {
  return SPEC_COLORS[specialty] || 'general';
};

// Obtiene clase CSS para badge de estado
const getStatusBadgeClass = (status) => {
  const map = { 'Activo': 'activo', 'Vacaciones': 'vacaciones', 'Inactivo': 'inactivo' };
  return map[status] || 'inactivo';
};

// Obtiene color de avatar por especialidad
const getAvatarColor = (specialty) => {
  const colors = {
    'general': 'var(--spec-general)',
    'ortodoncia': 'var(--spec-ortodoncia)',
    'endodoncia': 'var(--spec-endodoncia)',
    'pediatria': 'var(--spec-pediatria)',
    'cirugia': 'var(--spec-cirugia)',
    'periodoncia': 'var(--spec-periodoncia)',
    'implante': 'var(--spec-implante)',
    'rehab': 'var(--spec-rehab)',
  };
  return colors[getSpecBadgeClass(specialty)] || 'var(--spec-general)';
};

// Renderiza tabla de profesionales con accesibilidad
const renderTable = () => {
  const tbody = safeGetElement('professionalsTbody');
  if (!tbody || shouldUseServerRenderedTable()) return;
  
  // Filtrar datos
  const filtered = professionals.filter(p =>
    (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.specialty.toLowerCase().includes(searchQuery.toLowerCase()) || p.registry.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!selectedSpecialty || p.specialty === selectedSpecialty) &&
    (!selectedStatus || p.status === selectedStatus)
  );
  
  // Paginar
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);
  
  tbody.innerHTML = '';
  
  if (!paginated.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No se encontraron profesionales con los filtros aplicados.</td></tr>`;
    updatePagination(0, 0);
    return;
  }
  
  paginated.forEach(p => {
    const tr = document.createElement('tr');
    tr.setAttribute('role', 'row');
    
    const specClass = getSpecBadgeClass(p.specialty);
    const statusClass = getStatusBadgeClass(p.status);
    const avatarColor = getAvatarColor(p.specialty);
    
    tr.innerHTML = `
      <td class="td-profesional">
        <div class="p-avatar" style="background:${avatarColor}" aria-hidden="true">${p.initials}</div>
        <span class="p-name">${p.name}</span>
      </td>
      <td><span class="badge-spec ${specClass}">${p.specialty}</span></td>
      <td>${p.registry}</td>
      <td>${p.phone}</td>
      <td><span class="badge-status ${statusClass}" role="status" aria-label="Estado: ${p.status}">${p.status}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon view" title="Ver detalles" aria-label="Ver detalles de ${p.name}" onclick="viewProfessional(${p.id})">👁️</button>
          <button class="btn-icon edit" title="Editar profesional" aria-label="Editar ${p.name}" onclick="editProfessional(${p.id})">✏️</button>
          <button class="btn-icon toggle" title="Cambiar estado" aria-label="Cambiar estado de ${p.name}" onclick="toggleStatus(${p.id})">⚡</button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Actualizar paginación
  updatePagination(filtered.length, paginated.length);
};

// Actualiza contadores de estadísticas
const updateStats = () => {
  if (shouldUseServerRenderedTable()) return;
  const total = professionals.length;
  const actives = professionals.filter(p => p.status === 'Activo').length;
  const vacations = professionals.filter(p => p.status === 'Vacaciones').length;
  const inactives = professionals.filter(p => p.status === 'Inactivo').length;
  
  animateCounter(safeGetElement('metricTotal'), total);
  animateCounter(safeGetElement('metricActives'), actives);
  animateCounter(safeGetElement('metricVacations'), vacations);
  animateCounter(safeGetElement('metricInactives'), inactives);
};

// Actualiza botones de paginación
const updatePagination = (total, count) => {
  if (shouldUseServerRenderedTable()) return;
  const info = safeGetElement('paginationInfo');
  const buttons = safeGetElement('paginationButtons');
  if (!info || !buttons) return;
  
  const totalPages = Math.ceil(total / itemsPerPage) || 1;
  const start = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, total);
  
  info.textContent = `Mostrando ${start}-${end} de ${total} profesionales`;
  
  buttons.innerHTML = '';
  
  // Botón anterior
  const btnPrev = document.createElement('button');
  btnPrev.textContent = '«';
  btnPrev.setAttribute('aria-label', 'Página anterior');
  btnPrev.disabled = currentPage === 1;
  btnPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  buttons.appendChild(btnPrev);
  
  // Botones numéricos
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.setAttribute('aria-label', `Ir a página ${i}`);
    btn.setAttribute('aria-current', i === currentPage ? 'page' : 'false');
    if (i === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => { currentPage = i; renderTable(); });
    buttons.appendChild(btn);
  }
  
  // Botón siguiente
  const btnNext = document.createElement('button');
  btnNext.textContent = '»';
  btnNext.setAttribute('aria-label', 'Página siguiente');
  btnNext.disabled = currentPage === totalPages;
  btnNext.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderTable(); } });
  buttons.appendChild(btnNext);
};

// ═══════════════════════════════════════════════════════════════════
//  ACCIONES DE PROFESIONAL
// ═══════════════════════════════════════════════════════════════════

// Ver detalles de profesional
window.viewProfessional = (id) => {
  const p = professionals.find(prof => prof.id === id);
  if (!p) return;
  
  // Actualizar modal detalle
  const avatar = safeGetElement('detailAvatar');
  const name = safeGetElement('detailName');
  const specialty = safeGetElement('detailSpecialty');
  const registry = safeGetElement('detailRegistry');
  const phone = safeGetElement('detailPhone');
  const status = safeGetElement('detailStatus');
  
  if (avatar) {
    avatar.textContent = p.initials;
    avatar.style.background = getAvatarColor(p.specialty);
  }
  if (name) name.textContent = p.name;
  if (specialty) specialty.textContent = p.specialty;
  if (registry) registry.textContent = p.registry;
  if (phone) phone.textContent = p.phone;
  if (status) {
    status.textContent = p.status;
    status.className = `badge-status ${getStatusBadgeClass(p.status)}`;
  }
  
  // Abrir modal
  const modal = safeGetElement('modalDetail');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    const closeBtn = safeGetElement('modalDetailClose');
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }
};

// Editar profesional
window.editProfessional = (id) => {
  const p = professionals.find(prof => prof.id === id);
  if (!p) return;
  
  editingId = id;
  
  // Actualizar formulario
  const formName = safeGetElement('formName');
  const formSpecialty = safeGetElement('formSpecialty');
  const formRegistry = safeGetElement('formRegistry');
  const formPhone = safeGetElement('formPhone');
  const formStatus = safeGetElement('formStatus');
  const modalTitle = safeGetElement('modalFormTitle');
  
  if (formName) formName.value = p.name;
  if (formSpecialty) formSpecialty.value = p.specialty;
  if (formRegistry) formRegistry.value = p.registry;
  if (formPhone) formPhone.value = p.phone;
  if (formStatus) formStatus.value = p.status;
  if (modalTitle) modalTitle.textContent = 'Editar Profesional';
  
  // Abrir modal
  const modal = safeGetElement('modalForm');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    if (formName) formName.focus();
    document.body.style.overflow = 'hidden';
  }
};

// Alternar estado de profesional
window.toggleStatus = (id) => {
  const p = professionals.find(prof => prof.id === id);
  if (!p) return;
  
  // Ciclo: Activo → Vacaciones → Inactivo → Activo
  const states = ['Activo', 'Vacaciones', 'Inactivo'];
  const currentIndex = states.indexOf(p.status);
  p.status = states[(currentIndex + 1) % states.length];
  
  showToast(`✅ ${p.name}: estado cambiado a "${p.status}"`);
  
  updateStats();
  renderTable();
};

// ═══════════════════════════════════════════════════════════════════
//  MODALES
// ═══════════════════════════════════════════════════════════════════

// Abre modal de formulario
const openFormModal = () => {
  editingId = null;
  
  // Resetear formulario
  const form = safeGetElement('formProfessional');
  if (form) form.reset();
  
  const modalTitle = safeGetElement('modalFormTitle');
  if (modalTitle) modalTitle.textContent = 'Nuevo Profesional';
  
  const modal = safeGetElement('modalForm');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    const firstInput = modal.querySelector('input');
    if (firstInput) firstInput.focus();
    document.body.style.overflow = 'hidden';
  }
};

// Cierra modal de formulario
const closeFormModal = () => {
  const modal = safeGetElement('modalForm');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
  editingId = null;
};

// Cierra modal de detalle
const closeDetailModal = () => {
  const modal = safeGetElement('modalDetail');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
};

// Crea o actualiza profesional — submit nativo para que el antiforgery token viaje correctamente
const saveProfessional = (e) => {
  const form = e.currentTarget;
  const nombres = safeGetElement('formNombres')?.value.trim() || '';
  const apellidos = safeGetElement('formApellidos')?.value.trim() || '';
  const registroMedico = safeGetElement('formRegistroMedico')?.value.trim() || '';

  if (!nombres || !apellidos || !registroMedico) {
    e.preventDefault();
    showToast('⚠️ Completa nombres, apellidos y registro médico', 'warning');
    return;
  }

  // Dejar que el formulario se envíe de forma nativa (POST real al servidor)
  // El antiforgery token ya está en el <input hidden> del form, no hace falta fetch
};

// ═══════════════════════════════════════════════════════════════════
//  FILTROS Y BÚSQUEDA
// ═══════════════════════════════════════════════════════════════════

// Actualiza selector de especialidades
const populateSpecialties = () => {
  const select = safeGetElement('filterSpecialty');
  if (!select) return;
  
  const currentValue = select.value;
  const specialties = ['', ...new Set(professionals.map(p => p.specialty))];
  
  select.innerHTML = '<option value="">Todas las especialidades</option>' +
    specialties.filter(s => s).map(spec => `<option value="${spec}">${spec}</option>`).join('');
  
  if (currentValue) select.value = currentValue;
};

// Aplica filtros de búsqueda
const applyFilters = () => {
  searchQuery = safeGetElement('searchInput')?.value.toLowerCase() || '';
  selectedSpecialty = safeGetElement('filterSpecialty')?.value || '';
  selectedStatus = safeGetElement('filterStatus')?.value || '';
  
  currentPage = 1;
  renderTable();
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS (Listas para conectar al backend C#)
// ═══════════════════════════════════════════════════════════════════

// Obtiene lista de profesionales desde el servidor renderizado
async function fetchProfessionals() {
  return [];
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

// Inicializa filtros de búsqueda
const initFilters = () => {
  if (shouldUseServerRenderedTable()) return;
  const searchInput = safeGetElement('searchInput');
  const filterSpecialty = safeGetElement('filterSpecialty');
  const filterStatus = safeGetElement('filterStatus');
  
  searchInput?.addEventListener('input', debounce(applyFilters, 250));
  filterSpecialty?.addEventListener('change', applyFilters);
  filterStatus?.addEventListener('change', applyFilters);
};

// Inicializa modales
const initModals = () => {
  const btnNew = safeGetElement('btnNewProfessional');
  const modalFormClose = safeGetElement('modalFormClose');
  const modalFormCancel = safeGetElement('modalFormCancel');
  const modalDetailClose = safeGetElement('modalDetailClose');
  const modalDetailCloseBtn = safeGetElement('modalDetailCloseBtn');
  const modalForm = safeGetElement('modalForm');
  const modalDetail = safeGetElement('modalDetail');
  const form = safeGetElement('formProfessional');
  
  // Abrir modal crear
  btnNew?.addEventListener('click', openFormModal);
  
  // Cerrar modales
  modalFormClose?.addEventListener('click', closeFormModal);
  modalFormCancel?.addEventListener('click', closeFormModal);
  modalDetailClose?.addEventListener('click', closeDetailModal);
  modalDetailCloseBtn?.addEventListener('click', closeDetailModal);
  
  modalForm?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeFormModal();
  });
  modalDetail?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  
  // Submit del formulario
  form?.addEventListener('submit', saveProfessional);
  
  // Soporte para teclado en modales
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalForm?.classList.contains('open')) {
        e.preventDefault();
        closeFormModal();
      }
      if (modalDetail?.classList.contains('open')) {
        e.preventDefault();
        closeDetailModal();
      }
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  // Inicializar componentes de UI
  initSidebar();
  initFilters();
  initModals();
  
  // Cargar datos iniciales
  professionals = await fetchProfessionals();
  
  // Actualizar selector de especialidades
  populateSpecialties();
  
  // Renderizar tabla y estadísticas
  updateStats();
  renderTable();
  
  // Limpieza al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);