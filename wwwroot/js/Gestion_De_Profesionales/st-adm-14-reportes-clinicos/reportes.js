/**
 * SMILETRACK — REPORTES CLÍNICOS (script.js)
 * API-ready + Accesibilidad + Persistencia fallback
 * Filtros funcionales + Exportación PDF simulada
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

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

// ═══════════════════════════════════════════════════════════════════
//  PERSISTENCIA CON LOCALSTORAGE
// ═══════════════════════════════════════════════════════════════════

const reportsStorage = {
  key: 'smiletrack_reportes_clinicos',
  
  load: () => {
    const stored = localStorage.getItem(reportsStorage.key);
    if (stored) {
      try { return JSON.parse(stored); }
      catch (e) { console.warn('Error al cargar reportes, usando datos de ejemplo'); }
    }
    // Datos de ejemplo con fechas actualizadas a mayo 2026
    return [
      { id: 1, name: 'Julián Restrepo', doc: '10239485', age: 34, lastVisit: '2026-05-15', diagnosis: 'Gingivitis moderada', professional: 'mendez', professionalName: 'Dr. R. Méndez', nextVisit: '2026-06-28', alert: null, avatar: 'JR', color: 'blue' },
      { id: 2, name: 'Lucía Torres', doc: '52109432', age: 28, lastVisit: '2026-05-20', diagnosis: 'Ortodoncia fase 2', professional: 'sotelo', professionalName: 'Dra. E. Sotelo', nextVisit: '2026-06-25', alert: 'alergia', avatar: 'LT', color: 'green' },
      { id: 3, name: 'Mariana Esparza', doc: '88764321', age: 45, lastVisit: '2026-05-02', diagnosis: 'Endodoncia completa', professional: 'ruiz', professionalName: 'Dr. C. Ruiz', nextVisit: null, alert: null, avatar: 'ME', color: 'purple' },
      { id: 4, name: 'Sebastián Correa', doc: '11098452', age: 22, lastVisit: '2026-05-10', diagnosis: 'Extracción molar', professional: 'sotelo', professionalName: 'Dra. E. Sotelo', nextVisit: '2026-07-15', alert: 'diabetico', avatar: 'SC', color: 'orange' },
      { id: 5, name: 'Mónica Giraldo', doc: '32109876', age: 39, lastVisit: '2026-04-28', diagnosis: 'Valoración inicial', professional: 'mendez', professionalName: 'Dr. R. Méndez', nextVisit: null, alert: null, avatar: 'MG', color: 'slate' }
    ];
  },
  
  save: (data) => {
    try { localStorage.setItem(reportsStorage.key, JSON.stringify(data)); return true; }
    catch (e) { console.error('Error al guardar reportes:', e); return false; }
  }
};

// ═══════════════════════════════════════════════════════════════════
//  DATOS Y ESTADO
// ═══════════════════════════════════════════════════════════════════

let patients = reportsStorage.load();
let searchQuery = '';
let filterProfessional = '';
let filterMonth = '';
let currentPage = 1;
const itemsPerPage = 5;

const avatarColors = {
  blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600', orange: 'bg-orange-100 text-orange-600', slate: 'bg-slate-100 text-slate-600'
};

const alertLabels = {
  alergia: { label: '⚠ Alergia', class: 'alergia' },
  diabetico: { label: '⚠ Diabético', class: 'diabetico' }
};

// ═══════════════════════════════════════════════════════════════════
//  FILTRADO COMBINADO
// ═══════════════════════════════════════════════════════════════════

const getFilteredPatients = () => {
  return patients.filter(p => {
    // Filtro por búsqueda
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.doc.includes(searchQuery)) return false;
    
    // Filtro por profesional
    if (filterProfessional && p.professional !== filterProfessional) return false;
    
    // Filtro por mes
    if (filterMonth && !p.lastVisit.startsWith(filterMonth)) return false;
    
    return true;
  });
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: TABLA DE PACIENTES
// ═══════════════════════════════════════════════════════════════════

const renderPatients = () => {
  const body = safeGetElement('patientsBody');
  if (!body) return;
  
  const filtered = getFilteredPatients();
  
  if (!filtered.length) {
    body.innerHTML = '<div class="empty-state" role="status">No se encontraron pacientes con los criterios de búsqueda.</div>';
    return;
  }
  
  // Paginación
  const start = (currentPage - 1) * itemsPerPage;
  const pageData = filtered.slice(start, start + itemsPerPage);
  
  body.innerHTML = pageData.map(p => {
    const nextVisitDisplay = p.nextVisit ? `<time datetime="${p.nextVisit}">${fmtDate(p.nextVisit)}</time>` : '<span class="text-[var(--red)] font-semibold">Sin cita programada</span>';
    const alertBadge = p.alert ? `<span class="alert-badge ${alertLabels[p.alert]?.class || ''}" role="status" aria-label="Alerta: ${alertLabels[p.alert]?.label || ''}">${alertLabels[p.alert]?.label || ''}</span>` : '—';
    
    return `
      <div class="table-row" role="row" tabindex="0" aria-label="Paciente ${p.name}">
        <div class="table-col col-paciente" role="cell" data-label="Paciente">
          <div class="patient-info">
            <div class="patient-avatar ${avatarColors[p.color] || avatarColors.blue}" aria-hidden="true">${p.avatar}</div>
            <div>
              <span class="patient-name">${p.name}</span>
              <span class="patient-id">ID: ${p.doc} · ${p.age} años</span>
            </div>
          </div>
        </div>
        <div class="table-col col-consulta" role="cell" data-label="Última Consulta"><time datetime="${p.lastVisit}">${fmtDate(p.lastVisit)}</time></div>
        <div class="table-col col-diagnostico" role="cell" data-label="Diagnóstico">${p.diagnosis}</div>
        <div class="table-col col-profesional" role="cell" data-label="Profesional">${p.professionalName}</div>
        <div class="table-col col-cita" role="cell" data-label="Próxima Cita">${nextVisitDisplay}</div>
        <div class="table-col col-alertas text-center" role="cell" data-label="Alertas">${alertBadge}</div>
        <div class="table-col col-accion text-right" role="cell" data-label="Acción">
          <button class="action-btn btn-view" aria-label="Ver reporte clínico de ${p.name}" data-id="${p.id}" title="Ver">🔍</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners para acciones
  body.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => viewPatientReport(parseInt(e.currentTarget.dataset.id)));
    btn.addEventListener('keydown', (e) => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); viewPatientReport(parseInt(e.currentTarget.dataset.id)); }});
  });
  
  updatePagination(filtered.length);
};

// Ver reporte clínico de paciente (simulado)
const viewPatientReport = (id) => {
  const patient = patients.find(p => p.id === id);
  if (!patient) return;
  showToast(`📋 Abriendo reporte clínico de ${patient.name}...`, 'success');
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

const animateCounter = (el, target, isPercent = false) => {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = isPercent ? `${current}%` : current;
    if (current >= target) clearInterval(timer);
  }, 30);
};

const updateStats = () => {
  const totalPatients = patients.length;
  const consultsThisMonth = patients.filter(p => {
    if (!p.lastVisit) return false;
    const now = new Date();
    const lastVisit = new Date(p.lastVisit);
    return lastVisit.getMonth() === now.getMonth() && lastVisit.getFullYear() === now.getFullYear();
  }).length;
  const satisfaction = 96; // Valor fijo de ejemplo
  
  animateCounter(safeGetElement('statPatients'), totalPatients);
  animateCounter(safeGetElement('statConsults'), consultsThisMonth);
  animateCounter(safeGetElement('statSatisfaction'), satisfaction, true);
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
  searchInput?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.toLowerCase();
    currentPage = 1;
    renderPatients();
  }, 250));
};

const initFilters = () => {
  const filterProfessionalEl = safeGetElement('filterProfessional');
  const filterMonthEl = safeGetElement('filterMonth');
  
  filterProfessionalEl?.addEventListener('change', (e) => {
    filterProfessional = e.target.value;
    currentPage = 1;
    renderPatients();
  });
  
  filterMonthEl?.addEventListener('change', (e) => {
    filterMonth = e.target.value;
    currentPage = 1;
    renderPatients();
  });
};

const initPagination = () => {
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');
  
  btnPrev?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderPatients(); }
  });
  
  btnNext?.addEventListener('click', () => {
    const filtered = getFilteredPatients();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage < totalPages) { currentPage++; renderPatients(); }
  });
};

const initExport = () => {
  const btn = safeGetElement('btnExport');
  btn?.addEventListener('click', () => {
    showToast('📥 Generando PDF... (simulado)', 'success');
    // En producción: window.print() o librería de PDF
  });
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS
// ═══════════════════════════════════════════════════════════════════

async function fetchClinicalReports() {
  try {
    // const res = await fetch(`${API_BASE}/admin/reports/clinical`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    return reportsStorage.load();
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return reportsStorage.load();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  initSidebar();
  initSearch();
  initFilters();
  initPagination();
  initExport();
  
  patients = await fetchClinicalReports();
  updateStats();
  renderPatients();
  
  window.addEventListener('beforeunload', () => { /* Cleanup en SPA real */ });
};

document.addEventListener('DOMContentLoaded', init);