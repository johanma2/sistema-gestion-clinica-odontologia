/**
 * SMILETRACK — GESTIÓN DE CITAS (script.js)
 * API-ready + Accesibilidad + Persistencia fallback
 * CORRECCIÓN: Lógica de filtros completa + fechas actualizadas a mayo 2026
 */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN API
// ═══════════════════════════════════════════════════════════════════
const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

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

const appointmentsStorage = {
  key: 'smiletrack_citas_admin',
  
  load: () => {
    const stored = localStorage.getItem(appointmentsStorage.key);
    if (stored) {
      try { return JSON.parse(stored); }
      catch (e) { console.warn('Error al cargar citas, usando datos de ejemplo'); }
    }
    // ═══ DATOS DE EJEMPLO CON FECHAS ACTUALIZADAS A MAYO 2026 ═══
    return [
      { id: 1, date: '2026-05-24', time: '09:30', patient: 'Julián Restrepo', doc: '10239485', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Limpieza Dental', status: 'programada', avatar: 'JR', color: 'blue' },
      { id: 2, date: '2026-05-24', time: '11:00', patient: 'Lucía Torres', doc: '52109432', professional: 'sotelo', professionalName: 'Dra. Elena Sotelo', service: 'Ortodoncia', status: 'confirmada', avatar: 'LT', color: 'green' },
      { id: 3, date: '2026-05-24', time: '14:15', patient: 'Mariana Esparza', doc: '88764321', professional: 'ruiz', professionalName: 'Dr. Carlos Ruiz', service: 'Endodoncia', status: 'atendida', avatar: 'ME', color: 'purple' },
      { id: 4, date: '2026-05-24', time: '16:00', patient: 'Sebastián Correa', doc: '11098452', professional: 'sotelo', professionalName: 'Dra. Elena Sotelo', service: 'Extracción', status: 'cancelada', avatar: 'SC', color: 'red' },
      { id: 5, date: '2026-05-24', time: '17:30', patient: 'Mónica Giraldo', doc: '32109876', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Valoración', status: 'no-show', avatar: 'MG', color: 'slate' },
      { id: 6, date: '2026-05-25', time: '08:00', patient: 'Andrea López', doc: '10987654', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Consulta General', status: 'programada', avatar: 'AL', color: 'blue' },
      { id: 7, date: '2026-05-25', time: '10:30', patient: 'Carlos Vega', doc: '11223344', professional: 'ruiz', professionalName: 'Dr. Carlos Ruiz', service: 'Resina', status: 'confirmada', avatar: 'CV', color: 'green' },
      { id: 8, date: '2026-05-26', time: '09:00', patient: 'Sofía Ramírez', doc: '55667788', professional: 'sotelo', professionalName: 'Dra. Elena Sotelo', service: 'Blanqueamiento', status: 'programada', avatar: 'SR', color: 'blue' },
      { id: 9, date: '2026-05-26', time: '15:00', patient: 'Diego Morales', doc: '99887766', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Extracción', status: 'atendida', avatar: 'DM', color: 'purple' },
      { id: 10, date: '2026-05-27', time: '11:30', patient: 'Valeria Castro', doc: '44556677', professional: 'ruiz', professionalName: 'Dr. Carlos Ruiz', service: 'Ortodoncia', status: 'cancelada', avatar: 'VC', color: 'red' }
    ];
  },
  
  save: (data) => {
    try { localStorage.setItem(appointmentsStorage.key, JSON.stringify(data)); return true; }
    catch (e) { console.error('Error al guardar citas:', e); return false; }
  },
  
  addAppointment: (appt) => {
    const data = appointmentsStorage.load();
    appt.id = data.length > 0 ? Math.max(...data.map(a => a.id)) + 1 : 1;
    data.unshift(appt);
    appointmentsStorage.save(data);
    return appt;
  },
  
  getAppointment: (id) => appointmentsStorage.load().find(a => a.id === id)
};

// ═══════════════════════════════════════════════════════════════════
//  DATOS Y ESTADO — CORREGIDO PARA FILTROS
// ═══════════════════════════════════════════════════════════════════

let appointments = appointmentsStorage.load();
let searchQuery = '';
let filterStatus = '';        // ← NUEVO: estado seleccionado
let filterProfessional = '';  // ← NUEVO: profesional seleccionado
let filterDate = '';          // ← NUEVO: fecha seleccionada
let currentTab = 'all';
let currentPage = 1;
const itemsPerPage = 5;

const avatarColors = {
  blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600', red: 'bg-red-100 text-red-600', slate: 'bg-slate-100 text-slate-600'
};

const statusLabels = {
  programada: { label: 'Programada', class: 'programada' },
  confirmada: { label: 'Confirmada', class: 'confirmada' },
  atendida: { label: 'Atendida', class: 'atendida' },
  cancelada: { label: 'Cancelada', class: 'cancelada' },
  'no-show': { label: 'No asistió', class: 'cancelada' }
};

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════════════════════════

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

const fmtTime = (time) => {
  if (!time) return '—';
  const [h, min] = time.split(':');
  const hour = parseInt(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${displayHour}:${min} ${period}`;
};

// ═══════════════════════════════════════════════════════════════════
//  FILTRADO COMBINADO — CORREGIDO
// ═══════════════════════════════════════════════════════════════════

const getFilteredAppointments = () => {
  return appointments.filter(a => {
    // Filtro por tab (cancelaciones / no asistió)
    if (currentTab === 'cancelled' && a.status !== 'cancelada') return false;
    if (currentTab === 'no-show' && a.status !== 'no-show') return false;
    
    // Filtro por estado (dropdown)
    if (filterStatus && a.status !== filterStatus) return false;
    
    // Filtro por profesional (dropdown)
    if (filterProfessional && a.professional !== filterProfessional) return false;
    
    // Filtro por fecha (input date)
    if (filterDate && a.date !== filterDate) return false;
    
    // Filtro por búsqueda (paciente o documento)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!a.patient.toLowerCase().includes(query) && !a.doc.includes(query)) return false;
    }
    
    return true;
  });
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: TABLA DE CITAS — CORREGIDO
// ═══════════════════════════════════════════════════════════════════

const renderAppointments = () => {
  const body = safeGetElement('citasBody');
  if (!body) return;
  
  // Obtener datos filtrados con TODOS los filtros aplicados
  const filtered = getFilteredAppointments();
  
  if (!filtered.length) {
    body.innerHTML = '<div class="empty-state" role="status">No se encontraron citas con los criterios de búsqueda.</div>';
    return;
  }
  
  // Paginación
  const start = (currentPage - 1) * itemsPerPage;
  const pageData = filtered.slice(start, start + itemsPerPage);
  
  body.innerHTML = pageData.map(a => {
    const status = statusLabels[a.status] || statusLabels.programada;
    return `
      <div class="table-row" role="row" tabindex="0" aria-label="Cita de ${a.patient} el ${fmtDate(a.date)}">
        <div class="table-col col-fecha" role="cell" data-label="Fecha"><time datetime="${a.date}">${fmtDate(a.date)}</time></div>
        <div class="table-col col-hora" role="cell" data-label="Hora"><time datetime="${a.date}T${a.time}:00">${fmtTime(a.time)}</time></div>
        <div class="table-col col-paciente" role="cell" data-label="Paciente">
          <div class="patient-info">
            <div class="patient-avatar ${avatarColors[a.color] || avatarColors.blue}" aria-hidden="true">${a.avatar}</div>
            <div>
              <span class="patient-name">${a.patient}</span>
              <span class="patient-id">ID: ${a.doc}</span>
            </div>
          </div>
        </div>
        <div class="table-col col-profesional" role="cell" data-label="Profesional">${a.professionalName}</div>
        <div class="table-col col-servicio" role="cell" data-label="Servicio">${a.service}</div>
        <div class="table-col col-estado text-center" role="cell" data-label="Estado">
          <span class="status-badge ${status.class}" role="status" aria-label="Estado: ${status.label}">${status.label}</span>
        </div>
        <div class="table-col col-acciones text-right" role="cell" data-label="Acciones">
          <div class="actions-cell">
            <button class="action-btn btn-view" aria-label="Ver detalle de cita de ${a.patient}" data-id="${a.id}" title="Ver">👁️</button>
            <button class="action-btn btn-edit" aria-label="Editar cita de ${a.patient}" data-id="${a.id}" title="Editar">✏️</button>
            <button class="action-btn btn-delete" aria-label="Cancelar cita de ${a.patient}" data-id="${a.id}" title="Cancelar">❌</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners para acciones
  body.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => openAppointmentModal(parseInt(e.currentTarget.dataset.id), 'view'));
    btn.addEventListener('keydown', (e) => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); openAppointmentModal(parseInt(e.currentTarget.dataset.id), 'view'); }});
  });
  body.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => openAppointmentModal(parseInt(e.currentTarget.dataset.id), 'edit'));
    btn.addEventListener('keydown', (e) => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); openAppointmentModal(parseInt(e.currentTarget.dataset.id), 'edit'); }});
  });
  body.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => cancelAppointment(parseInt(e.currentTarget.dataset.id)));
    btn.addEventListener('keydown', (e) => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); cancelAppointment(parseInt(e.currentTarget.dataset.id)); }});
  });
  
  updatePagination(filtered.length);
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL DE CITA
// ═══════════════════════════════════════════════════════════════════

const openAppointmentModal = (id, mode) => {
  const appt = appointmentsStorage.getAppointment(id);
  if (!appt) return;
  
  const modal = safeGetElement('modalAppointment');
  const content = safeGetElement('modalAppointmentContent');
  const title = safeGetElement('modalAppointmentTitle');
  const editBtn = safeGetElement('modalAppointmentEdit');
  
  if (!modal || !content || !title) return;
  
  if (mode === 'view') {
    title.textContent = `Detalle: ${appt.patient}`;
    editBtn.style.display = 'none';
    content.innerHTML = `
      <p><strong>Fecha:</strong> <time datetime="${appt.date}">${fmtDate(appt.date)}</time></p>
      <p><strong>Hora:</strong> <time datetime="${appt.date}T${appt.time}:00">${fmtTime(appt.time)}</time></p>
      <p><strong>Documento:</strong> ${appt.doc}</p>
      <p><strong>Profesional:</strong> ${appt.professionalName}</p>
      <p><strong>Servicio:</strong> ${appt.service}</p>
      <p><strong>Estado:</strong> <span class="status-badge ${statusLabels[appt.status]?.class || 'programada'}">${statusLabels[appt.status]?.label || appt.status}</span></p>
    `;
  } else {
    title.textContent = `Editar: ${appt.patient}`;
    editBtn.style.display = 'inline-flex';
    editBtn.textContent = 'Guardar';
    content.innerHTML = `
      <p><strong>Fecha:</strong> <input type="date" value="${appt.date}" id="editDate" class="filter-date" style="margin-left:8px"></p>
      <p><strong>Hora:</strong> <input type="time" value="${appt.time}" id="editTime" class="filter-select" style="margin-left:8px"></p>
      <p><strong>Servicio:</strong> <input type="text" value="${appt.service}" id="editService" class="search-input" style="margin-left:8px;width:200px"></p>
      <p><strong>Estado:</strong> 
        <select id="editStatus" class="filter-select" style="margin-left:8px">
          <option value="programada" ${appt.status==='programada'?'selected':''}>Programada</option>
          <option value="confirmada" ${appt.status==='confirmada'?'selected':''}>Confirmada</option>
          <option value="atendida" ${appt.status==='atendida'?'selected':''}>Atendida</option>
          <option value="cancelada" ${appt.status==='cancelada'?'selected':''}>Cancelada</option>
        </select>
      </p>
    `;
    editBtn.onclick = () => saveAppointmentEdit(id);
  }
  
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modal.removeAttribute('inert');
  document.body.style.overflow = 'hidden';
  
  const closeBtn = safeGetElement('modalAppointmentClose');
  if (closeBtn) closeBtn.focus();
};

const closeAppointmentModal = () => {
  const modal = safeGetElement('modalAppointment');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
};

const saveAppointmentEdit = (id) => {
  const appt = appointmentsStorage.getAppointment(id);
  if (!appt) return;
  
  const newDate = safeGetElement('editDate')?.value || appt.date;
  const newTime = safeGetElement('editTime')?.value || appt.time;
  const newService = safeGetElement('editService')?.value || appt.service;
  const newStatus = safeGetElement('editStatus')?.value || appt.status;
  
  const updated = { ...appt, date: newDate, time: newTime, service: newService, status: newStatus };
  const data = appointmentsStorage.load();
  const idx = data.findIndex(a => a.id === id);
  if (idx !== -1) {
    data[idx] = updated;
    appointmentsStorage.save(data);
    appointments = data;
    renderAppointments();
    updateStats();
    closeAppointmentModal();
    showToast(`✅ Cita de ${appt.patient} actualizada`);
  }
};

const cancelAppointment = (id) => {
  if (!confirm('¿Estás seguro de cancelar esta cita?')) return;
  
  const data = appointmentsStorage.load();
  const idx = data.findIndex(a => a.id === id);
  if (idx !== -1) {
    data[idx].status = 'cancelada';
    appointmentsStorage.save(data);
    appointments = data;
    renderAppointments();
    updateStats();
    showToast(`🗑️ Cita cancelada`);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  PAGINACIÓN Y CONTADORES
// ═══════════════════════════════════════════════════════════════════

const updatePagination = (totalItems) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const showing = Math.min(itemsPerPage, totalItems - (currentPage - 1) * itemsPerPage);
  
  const pageShowing = safeGetElement('pageShowing');
  const pageTotal = safeGetElement('pageTotal');
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');
  
  if (pageShowing) pageShowing.textContent = showing;
  if (pageTotal) pageTotal.textContent = totalItems;
  if (btnPrev) btnPrev.disabled = currentPage === 1;
  if (btnNext) btnNext.disabled = currentPage >= totalPages;
};

const animateCounter = (el, target) => {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
};

const updateStats = () => {
  const total = appointments.length;
  const scheduled = appointments.filter(a => a.status === 'programada' || a.status === 'confirmada').length;
  const cancelled = appointments.filter(a => a.status === 'cancelada').length;
  const attended = appointments.filter(a => a.status === 'atendida').length;
  
  animateCounter(safeGetElement('statTotal'), total);
  animateCounter(safeGetElement('statScheduled'), scheduled);
  animateCounter(safeGetElement('statCancelled'), cancelled);
  animateCounter(safeGetElement('statAttended'), attended);
};

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN DE COMPONENTES — CORREGIDO PARA FILTROS
// ═══════════════════════════════════════════════════════════════════

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
    if (show) { const firstLink = sidebar.querySelector('.nav-item'); if (firstLink) firstLink.focus(); }
    else { hamburger.focus(); }
  };
  
  hamburger.addEventListener('click', () => toggleMenu(true));
  overlay.addEventListener('click', () => toggleMenu(false));
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => { if (window.innerWidth <= 680) toggleMenu(false); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar.classList.contains('open')) { e.preventDefault(); toggleMenu(false); }});
};

const initTabs = () => {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentTab = tab.dataset.tab;
      currentPage = 1;
      renderAppointments(); // ← Re-renderiza con filtros aplicados
    });
  });
};

// ═══ CORRECCIÓN: BÚSQUEDA CON DEBOUNCE ═══
const initSearch = () => {
  const searchInput = safeGetElement('searchAppointments');
  searchInput?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.toLowerCase();
    currentPage = 1;
    renderAppointments(); // ← Re-renderiza con filtros aplicados
  }, 250));
};

// ═══ CORRECCIÓN: FILTROS FUNCIONALES ═══
const initFilters = () => {
  const filterStatusEl = safeGetElement('filterStatus');
  const filterProfessionalEl = safeGetElement('filterProfessional');
  const filterDateEl = safeGetElement('filterDate');
  
  // Filtro por estado
  filterStatusEl?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    currentPage = 1;
    renderAppointments();
  });
  
  // Filtro por profesional
  filterProfessionalEl?.addEventListener('change', (e) => {
    filterProfessional = e.target.value;
    currentPage = 1;
    renderAppointments();
  });
  
  // Filtro por fecha
  filterDateEl?.addEventListener('change', (e) => {
    filterDate = e.target.value;
    currentPage = 1;
    renderAppointments();
  });
};

const initPagination = () => {
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');
  
  btnPrev?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderAppointments();
    }
  });
  
  btnNext?.addEventListener('click', () => {
    const filtered = getFilteredAppointments();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderAppointments();
    }
  });
};

const initNewAppointment = () => {
  const btn = safeGetElement('btnNewAppointment');
  btn?.addEventListener('click', () => showToast('📝 Funcionalidad de nueva cita en desarrollo', 'warning'));
};

const initModal = () => {
  const modalClose = safeGetElement('modalAppointmentClose');
  const modalCancel = safeGetElement('modalAppointmentCancel');
  const modal = safeGetElement('modalAppointment');
  
  modalClose?.addEventListener('click', closeAppointmentModal);
  modalCancel?.addEventListener('click', closeAppointmentModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeAppointmentModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal?.classList.contains('open')) { e.preventDefault(); closeAppointmentModal(); }});
};

const initBanner = () => {
  const btn = safeGetElement('btnOptimize');
  btn?.addEventListener('click', () => showToast('⚙️ Optimizando agenda... (simulado)', 'success'));
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS
// ═══════════════════════════════════════════════════════════════════

async function fetchAppointments() {
  try {
    // const res = await fetch(`${API_BASE}/admin/appointments`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    return appointmentsStorage.load();
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return appointmentsStorage.load();
  }
}

async function addAppointmentAPI(appt) {
  try {
    // const res = await fetch(`${API_BASE}/admin/appointments`, {
    //   method: 'POST', headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(appt),
    // });
    // if (!res.ok) throw new Error('Add failed');
    // return await res.json();
    return appointmentsStorage.addAppointment(appt);
  } catch (error) {
    console.warn('Error al agregar cita en API:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  initSidebar();
  initTabs();
  initSearch();
  initFilters();    // ← Inicializa filtros funcionales
  initPagination();
  initNewAppointment();
  initModal();
  initBanner();
  
  appointments = await fetchAppointments();
  updateStats();
  renderAppointments();
  
  window.addEventListener('beforeunload', () => { /* Cleanup en SPA real */ });
};

document.addEventListener('DOMContentLoaded', init);