/**
 * SMILETRACK — GESTIÓN PROFESIONALES (profesionales.js)
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

const SAMPLE_PROFESSIONALS = [
  { id: 1, name: 'Dr. Carlos Méndez', specialty: 'Odontología General', registry: 'RM-2026-001', phone: '300 123 4567', status: 'Activo', initials: 'CM' },
  { id: 2, name: 'Dra. Laura Gómez', specialty: 'Ortodoncia', registry: 'RM-2026-002', phone: '300 123 4568', status: 'Activo', initials: 'LG' },
  { id: 3, name: 'Dr. Andrés Torres', specialty: 'Endodoncia', registry: 'RM-2026-003', phone: '302 345 6789', status: 'Vacaciones', initials: 'AT' },
  { id: 4, name: 'Dr. Miguel Herrera', specialty: 'Odontopediatría', registry: 'RM-2026-004', phone: '304 567 8901', status: 'Inactivo', initials: 'MH' },
  { id: 5, name: 'Dra. Sofía Ramírez', specialty: 'Cirugía Oral', registry: 'RM-2026-005', phone: '304 567 8902', status: 'Activo', initials: 'SR' },
  { id: 6, name: 'Dra. Elena Beltrán', specialty: 'Periodoncia', registry: 'RM-2026-006', phone: '311 987 6543', status: 'Activo', initials: 'EB' },
  { id: 7, name: 'Dr. Hugo Valencia', specialty: 'Implantología', registry: 'RM-2026-007', phone: '312 456 7890', status: 'Vacaciones', initials: 'HV' },
  { id: 8, name: 'Dra. Patricia Ortiz', specialty: 'Rehabilitación Oral', registry: 'RM-2026-008', phone: '315 765 4321', status: 'Activo', initials: 'PO' },
];

let professionals = [...SAMPLE_PROFESSIONALS];
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

// Crea o actualiza profesional
const saveProfessional = (e) => {
  e.preventDefault();
  
  const name = safeGetElement('formName')?.value.trim();
  const specialty = safeGetElement('formSpecialty')?.value.trim();
  const registry = safeGetElement('formRegistry')?.value.trim();
  const phone = safeGetElement('formPhone')?.value.trim();
  const status = safeGetElement('formStatus')?.value;
  
  if (!name || !specialty || !registry || !phone) {
    showToast('⚠️ Completa todos los campos obligatorios', 'warning');
    return;
  }
  
  // Generar iniciales
  const nameParts = name.replace(/^(Dr\.|Dra\.)\s+/i, '').split(' ');
  const initials = nameParts.length >= 2 
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : nameParts[0].substring(0, 2).toUpperCase();
  
  if (editingId === null) {
    // Crear nuevo
    const newProf = {
      id: Date.now(),
      name,
      specialty,
      registry,
      phone,
      status,
      initials,
    };
    professionals.unshift(newProf);
    showToast(`✅ ${name} registrado exitosamente`);
  } else {
    // Actualizar existente
    const index = professionals.findIndex(p => p.id === editingId);
    if (index !== -1) {
      professionals[index] = { ...professionals[index], name, specialty, registry, phone, status, initials };
      showToast(`✅ ${name} actualizado exitosamente`);
    }
  }
  
  closeFormModal();
  updateStats();
  renderTable();
  populateSpecialties();
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

// Obtiene lista de profesionales desde API
async function fetchProfessionals() {
  try {
    // En producción: fetch real a API
    // const res = await fetch(`${API_BASE}/admin/professionals`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    
    // Simulación con fallback
    return SAMPLE_PROFESSIONALS;
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return SAMPLE_PROFESSIONALS;
  }
}

// Crea profesional en API
async function createProfessionalAPI(data) {
  try {
    // En producción: POST real a API
    // const res = await fetch(`${API_BASE}/admin/professionals`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data),
    // });
    // if (!res.ok) throw new Error('Create failed');
    // return await res.json();
    
    // Simulación
    return { success: true, id: Date.now() };
  } catch (error) {
    console.warn('Error creando profesional en API:', error);
    return null;
  }
}

// Actualiza profesional en API
async function updateProfessionalAPI(id, updates) {
  try {
    // En producción: PATCH real a API
    // await fetch(`${API_BASE}/admin/professionals/${id}`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(updates),
    // });
    
    // Simulación
    return true;
  } catch (error) {
    console.warn('Error actualizando profesional en API:', error);
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