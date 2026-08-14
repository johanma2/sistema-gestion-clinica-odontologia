// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════════════════════════

const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`Elemento no encontrado: #${id}`);
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
  toast.className = `toast${type === 'error' ? ' error' : type === 'warning' ? ' warning' : ''} show`;
  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ✅ NUEVA: Animar los números de los tableros (stats)
const animateCounters = () => {
  document.querySelectorAll('.stat-number[data-target]').forEach(el => {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 30));
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current;
    }, 30);
  });
};

// ═══════════════════════════════════════════════════════════════════
//  VARIABLES GLOBALES Y FORMATO
// ═══════════════════════════════════════════════════════════════════

let searchQuery = '';
let filterAlergias = '';
let filterCita = '';
let filterHistorial = '';
let currentPage = 1;
const itemsPerPage = 5;

const fmtDate = (iso) => {
  if (!iso) return 'N/A';
  try {
    const dObj = new Date(iso);
    if (isNaN(dObj.getTime())) return 'N/A';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dObj.getDate()} ${meses[dObj.getMonth()]} ${dObj.getFullYear()}`;
  } catch {
    return 'N/A';
  }
};

const getPatients = () => Array.isArray(window.RAZOR_PATIENTS) ? window.RAZOR_PATIENTS : [];

const getFilteredPatients = () => {
  const query = searchQuery.trim().toLowerCase();
  const patients = getPatients();

  return patients.filter((patient) => {
    // Búsqueda por texto
    if (query) {
      const haystack = [patient.Name, patient.Doc, patient.Diagnosis, patient.Allergies?.join(' ')].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    // Filtro por alergias
    if (filterAlergias === 'con' && !(Array.isArray(patient.Allergies) && patient.Allergies.length > 0)) return false;
    if (filterAlergias === 'sin' && (Array.isArray(patient.Allergies) && patient.Allergies.length > 0)) return false;

    // Filtro por próxima cita
    if (filterCita === 'con' && !patient.NextVisit) return false;
    if (filterCita === 'sin' && patient.NextVisit) return false;

    // Filtro por historial clínico
    if (filterHistorial === 'con' && !(Array.isArray(patient.History) && patient.History.length > 0)) return false;
    if (filterHistorial === 'sin' && (Array.isArray(patient.History) && patient.History.length > 0)) return false;

    return true;
  });
};

// ═══════════════════════════════════════════════════════════════════
//  PAGINACIÓN DINÁMICA
// ═══════════════════════════════════════════════════════════════════

const renderPaginationButtons = (total) => {
  const paginationNav = document.querySelector('.pagination');
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');
  if (!paginationNav) return;

  const maxPage = Math.max(1, Math.ceil(total / itemsPerPage));

  // Limpiar botones de página previos (conservar prev/next)
  const existingPages = paginationNav.querySelectorAll('.page-num-btn');
  existingPages.forEach(b => b.remove());

  // Insertar botones de página antes del btn-next
  for (let i = 1; i <= maxPage; i++) {
    const btn = document.createElement('button');
    btn.className = `pagination-btn page-num-btn${i === currentPage ? ' active' : ''}`;
    btn.setAttribute('aria-label', `Página ${i}`);
    if (i === currentPage) btn.setAttribute('aria-current', 'page');
    btn.textContent = String(i);
    btn.addEventListener('click', () => {
      currentPage = i;
      renderPatients();
    });
    paginationNav.insertBefore(btn, btnNext);
  }

  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = currentPage >= maxPage;
};

// ═══════════════════════════════════════════════════════════════════
//  RENDERIZADO
// ═══════════════════════════════════════════════════════════════════

const renderPatients = () => {
  const container = safeGetElement('patientsBody');
  const empty = safeGetElement('emptyState');
  const pageShowing = safeGetElement('pageShowing');
  const pageTotal = safeGetElement('pageTotal');
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');

  const filtered = getFilteredPatients();
  const total = filtered.length;
  const start = (currentPage - 1) * itemsPerPage;
  const pagePatients = filtered.slice(start, start + itemsPerPage);

  if (container) {
    container.innerHTML = pagePatients.map((patient) => {
      const initials = patient.Initials || '??';
      const color = patient.Color === 'green' ? '#22c55e' : 
                    patient.Color === 'purple' ? '#9333ea' : 
                    patient.Color === 'yellow' ? '#f59e0b' : '#2563eb';
      const allergies = Array.isArray(patient.Allergies) && patient.Allergies.length
        ? patient.Allergies.map((item) => `<span class="allergy-badge">${item}</span>`).join('')
        : '<span class="patient-id">Sin alergias</span>';

      return `
        <div class="table-row patient-row" data-name="${(patient.Name || '').toLowerCase()}" data-doc="${(patient.Doc || '').toLowerCase()}">
          <div class="table-col col-paciente" data-label="Paciente">
            <div class="patient-info">
              <div class="patient-avatar" style="background:${color}">${initials}</div>
              <div>
                <span class="patient-name">${patient.Name || 'Sin nombre'}</span>
                <span class="patient-id">${patient.Doc || 'Sin documento'}</span>
              </div>
            </div>
          </div>
          <div class="table-col col-fecha" data-label="Última consulta">${fmtDate(patient.LastVisit)}</div>
          <div class="table-col col-diagnostico" data-label="Diagnóstico">${patient.Diagnosis || 'N/A'}</div>
          <div class="table-col col-cita" data-label="Próxima cita">${fmtDate(patient.NextVisit)}</div>
          <div class="table-col col-alergias" data-label="Alergias">${allergies}</div>
          <div class="table-col col-acciones" data-label="Acciones">
            <div class="actions-cell">
              <button class="action-btn btn-view" data-id="${patient.Id}" aria-label="Ver detalle de ${patient.Name}" title="Ver detalle del paciente">
                <span class="action-icon" aria-hidden="true">👁️</span>
                <span class="action-label">Detalle</span>
              </button>
              <button class="action-btn btn-history" data-id="${patient.Id}" aria-label="Ver historial clínico de ${patient.Name}" title="Historial clínico">
                <span class="action-icon" aria-hidden="true">📋</span>
                <span class="action-label">Historial</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  if (empty) {
    empty.style.display = pagePatients.length === 0 ? 'block' : 'none';
    empty.setAttribute('aria-hidden', pagePatients.length === 0 ? 'false' : 'true');
  }

  if (pageShowing) pageShowing.textContent = total === 0 ? '0' : `${Math.min(start + pagePatients.length, total)}`;
  if (pageTotal) pageTotal.textContent = String(total);
  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = start + pagePatients.length >= total;

  // Generar botones de página dinámicamente
  renderPaginationButtons(total);

  // Actualizar contador de resultados del filtro
  const filterResults = safeGetElement('filterResults');
  const hasActiveFilters = searchQuery || filterAlergias || filterCita || filterHistorial;
  if (filterResults) {
    filterResults.textContent = hasActiveFilters
      ? `${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
      : '';
  }

  document.querySelectorAll('.btn-view').forEach((btn) => {
    btn.addEventListener('click', (event) => openPatientModal(Number(event.currentTarget.dataset.id), 'detail'));
  });

  document.querySelectorAll('.btn-history').forEach((btn) => {
    btn.addEventListener('click', (event) => openPatientModal(Number(event.currentTarget.dataset.id), 'history'));
  });
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════════════

const openPatientModal = (id, type) => {
  const patients = getPatients();
  const patient = patients.find((item) => Number(item.Id) === Number(id));
  if (!patient) return;

  const modal = safeGetElement('modalPatient');
  const content = safeGetElement('modalPatientContent');
  const title = safeGetElement('modalPatientTitle');

  if (!modal || !content || !title) return;

  if (type === 'detail') {
    title.textContent = `Detalle de ${patient.Name}`;
    content.innerHTML = `
      <div class="modal-detail">
        <p><strong>Documento:</strong> ${patient.Doc || 'N/A'}</p>
        <p><strong>Última consulta:</strong> <time>${fmtDate(patient.LastVisit)}</time></p>
        <p><strong>Diagnóstico:</strong> ${patient.Diagnosis || 'N/A'}</p>
        <p><strong>Próxima cita:</strong> <time>${fmtDate(patient.NextVisit)}</time></p>
        <p><strong>Alergias:</strong> ${Array.isArray(patient.Allergies) && patient.Allergies.length ? patient.Allergies.join(', ') : 'Ninguna'}</p>
      </div>
    `;
  } else {
    title.textContent = `Historial Clínico de ${patient.Name}`;
    if (patient.History?.length) {
      content.innerHTML = `
        <ul style="list-style:none;padding:0;margin:0;">
          ${patient.History.map((entry) => `
            <li style="padding:12px 0;border-bottom:1px solid var(--border)">
              <time style="color:var(--text-muted);font-size:.85rem">${fmtDate(entry.Date)}</time>
              <div style="margin-top:4px;"><strong>${entry.Procedure}</strong></div>
              <div style="font-size:.85rem;color:var(--text-muted)">Dr. ${entry.Doctor}</div>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      content.innerHTML = '<p style="color:var(--text-muted);font-style:italic;text-align:center;padding:20px">Sin historial registrado</p>';
    }
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modal.removeAttribute('inert');
  document.body.style.overflow = 'hidden';
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
    hamburger.setAttribute('aria-expanded', String(show));
    overlay.setAttribute('aria-hidden', String(!show));
  };

  hamburger.addEventListener('click', () => toggleMenu(!sidebar.classList.contains('open')));
  overlay.addEventListener('click', () => toggleMenu(false));
};

// ✅ NUEVA: Controla los menús desplegables del sidebar
const initNavGroups = () => {
  const groupHeaders = document.querySelectorAll('.nav-group-header');
  if (!groupHeaders.length) return;
  
  groupHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const group = this.closest('.nav-group');
      group.classList.toggle('open');
      const isOpen = group.classList.contains('open');
      this.setAttribute('aria-expanded', isOpen);
    });
    
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });
};

const initSearch = () => {
  const searchInput = safeGetElement('searchPatients');
  searchInput?.addEventListener('input', debounce((event) => {
    searchQuery = event.target.value.toLowerCase();
    currentPage = 1;
    renderPatients();
  }, 250));
};

const initPagination = () => {
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');

  btnPrev?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderPatients();
    }
  });

  btnNext?.addEventListener('click', () => {
    const filtered = getFilteredPatients();
    const maxPage = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage < maxPage) {
      currentPage += 1;
      renderPatients();
    }
  });
};

const initModal = () => {
  const modalClose = safeGetElement('modalPatientClose');
  const modalCancel = safeGetElement('modalPatientCancel');
  const modal = safeGetElement('modalPatient');

  modalClose?.addEventListener('click', closePatientModal);
  modalCancel?.addEventListener('click', closePatientModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closePatientModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePatientModal();
  });
};

const initFilters = () => {
  const applyFilters = () => {
    currentPage = 1;
    renderPatients();

    // Indicar visualmente si hay filtros activos
    const hasActive = filterAlergias || filterCita || filterHistorial;
    const clearBtn = safeGetElement('btnClearFilters');
    if (clearBtn) clearBtn.classList.toggle('active', !!hasActive);
  };

  safeGetElement('filterAlergias')?.addEventListener('change', (e) => {
    filterAlergias = e.target.value;
    applyFilters();
  });

  safeGetElement('filterCita')?.addEventListener('change', (e) => {
    filterCita = e.target.value;
    applyFilters();
  });

  safeGetElement('filterHistorial')?.addEventListener('change', (e) => {
    filterHistorial = e.target.value;
    applyFilters();
  });

  safeGetElement('btnClearFilters')?.addEventListener('click', () => {
    filterAlergias = '';
    filterCita = '';
    filterHistorial = '';
    const sel1 = safeGetElement('filterAlergias');
    const sel2 = safeGetElement('filterCita');
    const sel3 = safeGetElement('filterHistorial');
    if (sel1) sel1.value = '';
    if (sel2) sel2.value = '';
    if (sel3) sel3.value = '';
    applyFilters();
  });
};

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

const init = () => {
  initSidebar();
  initNavGroups();
  initSearch();
  initPagination();
  initModal();
  initFilters();

  animateCounters();
  renderPatients();
};

document.addEventListener('DOMContentLoaded', init);