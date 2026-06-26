/**
 * SMILETRACK — GESTIÓN DE PACIENTES (script.js)
 * API-ready + Accesibilidad + Persistencia fallback
 * CORRECCIÓN: Lógica completa de acciones + modales accesibles
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

const patientsStorage = {
  key: 'smiletrack_pacientes_admin',
  
  load: () => {
    const stored = localStorage.getItem(patientsStorage.key);
    if (stored) {
      try { return JSON.parse(stored); }
      catch (e) { console.warn('Error al cargar pacientes, usando datos de ejemplo'); }
    }
    return [
      { id: 1, initials: 'PG', name: 'Pedro Garcia', doc: 'CC 1045678901', lastVisit: '2026-03-20', diagnosis: 'Caries pieza 12', nextVisit: '2025-05-01', allergies: ['Penicilina'], color: 'blue', history: [
        { date: '2026-03-20', procedure: 'Resina clase II', doctor: 'Dr. Méndez' },
        { date: '2026-01-15', procedure: 'Limpieza', doctor: 'Dra. López' }
      ]},
      { id: 2, initials: 'ML', name: 'Maria López', doc: 'CC 1023456789', lastVisit: '2026-03-17', diagnosis: 'Limpieza dental', nextVisit: '2026-06-20', allergies: [], color: 'green', history: [
        { date: '2026-03-17', procedure: 'Profilaxis', doctor: 'Dr. Méndez' }
      ]},
      { id: 3, initials: 'CR', name: 'Carlos Ruiz', doc: 'CC 1034567890', lastVisit: '2026-03-17', diagnosis: 'Control ortodoncia', nextVisit: '2026-03-24', allergies: [], color: 'yellow', history: []},
      { id: 4, initials: 'AM', name: 'Ana Martínez', doc: 'CC 1056789012', lastVisit: '2026-03-16', diagnosis: 'Endodoncia pieza 23', nextVisit: '2025-05-10', allergies: [], color: 'purple', history: []},
      { id: 5, initials: 'LH', name: 'Luis Herrera', doc: 'CC 1067890123', lastVisit: null, diagnosis: null, nextVisit: null, allergies: [], color: 'slate', history: []}
    ];
  },
  
  save: (data) => {
    try { localStorage.setItem(patientsStorage.key, JSON.stringify(data)); return true; }
    catch (e) { console.error('Error al guardar pacientes:', e); return false; }
  },
  
  addPatient: (patient) => {
    const data = patientsStorage.load();
    patient.id = data.length > 0 ? Math.max(...data.map(p => p.id)) + 1 : 1;
    patient.history = patient.history || [];
    data.unshift(patient);
    patientsStorage.save(data);
    return patient;
  },
  
  getPatient: (id) => patientsStorage.load().find(p => p.id === id)
};

// ═══════════════════════════════════════════════════════════════════
//  DATOS Y ESTADO
// ═══════════════════════════════════════════════════════════════════

let patients = patientsStorage.load();
let searchQuery = '';
let currentPage = 1;
const itemsPerPage = 5;
const avatarColors = {
  blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600', purple: 'bg-purple-100 text-purple-600', slate: 'bg-slate-100 text-slate-600'
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

// ═══════════════════════════════════════════════════════════════════
//  RENDER: TABLA DE PACIENTES — CORREGIDO
// ═══════════════════════════════════════════════════════════════════

const renderPatients = () => {
  const body = safeGetElement('patientsBody');
  const empty = safeGetElement('emptyState');
  if (!body) return;
  
  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.doc.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (!filtered.length) {
    body.innerHTML = '';
    if (empty) { empty.style.display = 'block'; empty.setAttribute('aria-hidden', 'false'); }
    return;
  }
  if (empty) { empty.style.display = 'none'; empty.setAttribute('aria-hidden', 'true'); }
  
  const start = (currentPage - 1) * itemsPerPage;
  const pageData = filtered.slice(start, start + itemsPerPage);
  
  body.innerHTML = pageData.map(p => {
    const allergyBadge = p.allergies?.length 
      ? `<span class="allergy-badge" role="status" aria-label="Alergia: ${p.allergies.join(', ')}">⚠️ ${p.allergies[0]}</span>`
      : '<span class="text-muted">—</span>';
    
    return `
      <div class="table-row" role="row" tabindex="0" aria-label="Paciente ${p.name}">
        <div class="table-col col-paciente" role="cell" data-label="Profesional">
          <div class="patient-info">
            <div class="patient-avatar ${avatarColors[p.color] || avatarColors.blue}" aria-hidden="true">${p.initials}</div>
            <div>
              <span class="patient-name">${p.name}</span>
              <span class="patient-id">${p.doc}</span>
            </div>
          </div>
        </div>
        <div class="table-col col-fecha" role="cell" data-label="Última consulta"><time datetime="${p.lastVisit || ''}">${fmtDate(p.lastVisit)}</time></div>
        <div class="table-col col-diagnostico" role="cell" data-label="Diagnóstico">${p.diagnosis || '—'}</div>
        <div class="table-col col-cita" role="cell" data-label="Próxima cita"><time datetime="${p.nextVisit || ''}">${fmtDate(p.nextVisit)}</time></div>
        <div class="table-col col-alergias" role="cell" data-label="Alergias">${allergyBadge}</div>
        <div class="table-col col-acciones" role="cell" data-label="Acciones">
          <div class="actions-cell">
            <button class="action-btn btn-view" aria-label="Ver detalle de ${p.name}" data-id="${p.id}" title="Ver detalle">👁️</button>
            <button class="action-btn btn-history" aria-label="Historial de ${p.name}" data-id="${p.id}" title="Ver historial">📋</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners para acciones - CORREGIDO: delegación de eventos
  body.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => openPatientModal(parseInt(e.currentTarget.dataset.id), 'detail'));
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPatientModal(parseInt(e.currentTarget.dataset.id), 'detail'); }});
  });
  body.querySelectorAll('.btn-history').forEach(btn => {
    btn.addEventListener('click', (e) => openPatientModal(parseInt(e.currentTarget.dataset.id), 'history'));
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPatientModal(parseInt(e.currentTarget.dataset.id), 'history'); }});
  });
  
  updatePagination(filtered.length);
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL DE DETALLE DE PACIENTE — NUEVO
// ═══════════════════════════════════════════════════════════════════

const openPatientModal = (id, type) => {
  const patient = patientsStorage.getPatient(id);
  if (!patient) return;
  
  const modal = safeGetElement('modalPatient');
  const content = safeGetElement('modalPatientContent');
  const title = safeGetElement('modalPatientTitle');
  
  if (!modal || !content || !title) return;
  
  if (type === 'detail') {
    title.textContent = `Detalle: ${patient.name}`;
    content.innerHTML = `
      <p><strong>Documento:</strong> ${patient.doc}</p>
      <p><strong>Última consulta:</strong> <time datetime="${patient.lastVisit || ''}">${fmtDate(patient.lastVisit)}</time></p>
      <p><strong>Diagnóstico:</strong> ${patient.diagnosis || '—'}</p>
      <p><strong>Próxima cita:</strong> <time datetime="${patient.nextVisit || ''}">${fmtDate(patient.nextVisit)}</time></p>
      <p><strong>Alergias:</strong> ${patient.allergies?.length ? patient.allergies.join(', ') : 'Ninguna'}</p>
    `;
  } else {
    title.textContent = `Historial: ${patient.name}`;
    if (patient.history?.length) {
      content.innerHTML = `<ul style="list-style:none;padding:0;margin:0;">${patient.history.map(h => 
        `<li style="padding:8px 0;border-bottom:1px solid var(--border)">
          <time datetime="${h.date}">${fmtDate(h.date)}</time> · <strong>${h.procedure}</strong> · ${h.doctor}
        </li>`).join('')}</ul>`;
    } else {
      content.innerHTML = '<p style="color:var(--text-muted);font-style:italic">Sin historial registrado</p>';
    }
  }
  
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modal.removeAttribute('inert');
  document.body.style.overflow = 'hidden';
  
  const closeBtn = safeGetElement('modalPatientClose');
  if (closeBtn) closeBtn.focus();
};

const closePatientModal = () => {
  const modal = safeGetElement('modalPatient');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
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
  const active = patients.filter(p => p.lastVisit).length;
  const now = new Date();
  const month = patients.filter(p => {
    if (!p.lastVisit) return false;
    const d = new Date(p.lastVisit);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const week = patients.filter(p => {
    if (!p.lastVisit) return false;
    const d = new Date(p.lastVisit);
    return d >= weekAgo;
  }).length;
  const newPatients = patients.filter(p => !p.lastVisit || new Date(p.lastVisit).getMonth() === now.getMonth()).length;
  
  animateCounter(safeGetElement('statActive'), active);
  animateCounter(safeGetElement('statMonth'), month);
  animateCounter(safeGetElement('statWeek'), week);
  animateCounter(safeGetElement('statNew'), newPatients);
};

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN DE COMPONENTES
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

const initSearch = () => {
  const searchInput = safeGetElement('searchPatients');
  searchInput?.addEventListener('input', debounce((e) => { searchQuery = e.target.value.toLowerCase(); currentPage = 1; renderPatients(); }, 250));
};

const initPagination = () => {
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');
  btnPrev?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPatients(); }});
  btnNext?.addEventListener('click', () => {
    const filtered = patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.doc.toLowerCase().includes(searchQuery.toLowerCase()));
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage < totalPages) { currentPage++; renderPatients(); }
  });
};

const initNewPatient = () => {
  const btn = safeGetElement('btnNewPatient');
  btn?.addEventListener('click', () => showToast('📝 Funcionalidad de nuevo paciente en desarrollo', 'warning'));
};

const initModal = () => {
  const modalClose = safeGetElement('modalPatientClose');
  const modalCancel = safeGetElement('modalPatientCancel');
  const modal = safeGetElement('modalPatient');
  
  modalClose?.addEventListener('click', closePatientModal);
  modalCancel?.addEventListener('click', closePatientModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closePatientModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal?.classList.contains('open')) { e.preventDefault(); closePatientModal(); }});
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS
// ═══════════════════════════════════════════════════════════════════

async function fetchPatients() {
  try {
    // const res = await fetch(`${API_BASE}/admin/patients`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    return patientsStorage.load();
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return patientsStorage.load();
  }
}

async function addPatientAPI(patient) {
  try {
    // const res = await fetch(`${API_BASE}/admin/patients`, {
    //   method: 'POST', headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(patient),
    // });
    // if (!res.ok) throw new Error('Add failed');
    // return await res.json();
    return patientsStorage.addPatient(patient);
  } catch (error) {
    console.warn('Error al agregar paciente en API:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  initSidebar();
  initSearch();
  initPagination();
  initNewPatient();
  initModal();
  
  patients = await fetchPatients();
  updateStats();
  renderPatients();
  
  window.addEventListener('beforeunload', () => { /* Cleanup en SPA real */ });
};

document.addEventListener('DOMContentLoaded', init);