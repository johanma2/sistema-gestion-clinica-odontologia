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

let searchQuery = '';
let currentPage = 1;
const itemsPerPage = 5;

const fmtDate = (iso) => {
  if (!iso) return '—';
  const dObj = new Date(iso);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dObj.getDate()} ${meses[dObj.getMonth()]} ${dObj.getFullYear()}`;
};

const getPatients = () => Array.isArray(window.RAZOR_PATIENTS) ? window.RAZOR_PATIENTS : [];

const getFilteredPatients = () => {
  const query = searchQuery.trim().toLowerCase();
  const patients = getPatients();
  if (!query) return patients;

  return patients.filter((patient) => {
    const haystack = [patient.Name, patient.Doc, patient.Diagnosis, patient.Allergies?.join(' ')].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  });
};

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
      const initials = patient.Initials || '—';
      const color = patient.Color === 'green' ? '#22c55e' : patient.Color === 'purple' ? '#9333ea' : patient.Color === 'yellow' ? '#f59e0b' : '#2563eb';
      const allergies = Array.isArray(patient.Allergies) && patient.Allergies.length
        ? patient.Allergies.map((item) => `<span class="allergy-badge">${item}</span>`).join('')
        : '<span class="patient-id">Sin alergias</span>';

      return `
        <div class="table-row patient-row" data-name="${(patient.Name || '').toLowerCase()}" data-doc="${(patient.Doc || '').toLowerCase()}">
          <div class="table-col col-paciente" data-label="Profesional">
            <div class="patient-info">
              <div class="patient-avatar" style="background:${color}">${initials}</div>
              <div>
                <span class="patient-name">${patient.Name}</span>
                <span class="patient-id">${patient.Doc}</span>
              </div>
            </div>
          </div>
          <div class="table-col col-fecha" data-label="Última consulta">${fmtDate(patient.LastVisit)}</div>
          <div class="table-col col-diagnostico" data-label="Diagnóstico">${patient.Diagnosis || '—'}</div>
          <div class="table-col col-cita" data-label="Próxima cita">${fmtDate(patient.NextVisit)}</div>
          <div class="table-col col-alergias" data-label="Alergias">${allergies}</div>
          <div class="table-col col-acciones" data-label="Acciones">
            <div class="actions-cell">
              <button class="action-btn btn-view" data-id="${patient.Id}" aria-label="Ver detalle de ${patient.Name}" title="Ver detalle">???</button>
              <button class="action-btn btn-history" data-id="${patient.Id}" aria-label="Ver historial de ${patient.Name}" title="Ver historial">???</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  if (empty) {
    empty.style.display = pagePatients.length === 0 ? 'block' : 'none';
  }

  if (pageShowing) pageShowing.textContent = total === 0 ? '0' : `${Math.min(pagePatients.length, total)} `;
  if (pageTotal) pageTotal.textContent = String(total);
  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = start + pagePatients.length >= total;

  document.querySelectorAll('.btn-view').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      openPatientModal(Number(event.currentTarget.dataset.id), 'detail');
    });
  });

  document.querySelectorAll('.btn-history').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      openPatientModal(Number(event.currentTarget.dataset.id), 'history');
    });
  });
};

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
      <p><strong>Documento:</strong> ${patient.Doc}</p>
      <p><strong>Última consulta:</strong> <time>${fmtDate(patient.LastVisit)}</time></p>
      <p><strong>Diagnóstico:</strong> ${patient.Diagnosis || '—'}</p>
      <p><strong>Próxima cita:</strong> <time>${fmtDate(patient.NextVisit)}</time></p>
      <p><strong>Alergias:</strong> ${Array.isArray(patient.Allergies) && patient.Allergies.length ? patient.Allergies.join(', ') : 'Ninguna'}</p>
    `;
  } else {
    title.textContent = `Historial de ${patient.Name}`;
    if (patient.History?.length) {
      content.innerHTML = `
        <ul style="list-style:none;padding:0;margin:0;">
          ${patient.History.map((entry) => `
            <li style="padding:8px 0;border-bottom:1px solid var(--border)">
              <time>${fmtDate(entry.Date)}</time> · <strong>${entry.Procedure}</strong> · ${entry.Doctor}
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      content.innerHTML = '<p style="color:var(--text-muted);font-style:italic">Sin historial registrado</p>';
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

const initNewPatient = () => {
  const btn = safeGetElement('btnNewPatient');
  btn?.addEventListener('click', () => showToast('?? Funcionalidad de nuevo paciente en desarrollo (Razor)', 'warning'));
};

const init = () => {
  initSidebar();
  initSearch();
  initPagination();
  initModal();
  initNewPatient();
  renderPatients();
};

document.addEventListener('DOMContentLoaded', init);