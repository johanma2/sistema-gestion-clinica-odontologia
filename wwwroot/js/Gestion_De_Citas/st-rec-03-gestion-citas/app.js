// =============================================
// SMILETRACK — GESTIÓN DE CITAS RECEPCIÓN (app.js)
// =============================================

// ── Utilidades ────────────────────────────────────────────────────
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const formatTime12h = (timeISO) => {
  if (!timeISO) return '';
  const [hStr, mStr] = timeISO.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
};

// ── Estado en memoria (fuente de verdad) ─────────────────────────
let _appointments = [];

const appointmentStorage = {
  key: 'smiletrack_appointments',

  init: () => {
    const stored = localStorage.getItem(appointmentStorage.key);
    if (stored) {
      try {
        _appointments = JSON.parse(stored);
        return;
      } catch {
        console.warn('Error al parsear localStorage, usando datos de ejemplo');
      }
    }
    _appointments = [...appointmentsData];
    appointmentStorage._persist();
  },

  _persist: () => {
    try {
      localStorage.setItem(appointmentStorage.key, JSON.stringify(_appointments));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  },

  getAll: () => [..._appointments],

  findById: (id) => _appointments.find(a => a.id === parseInt(id, 10)) || null,

  add: (appointment) => {
    const newId = _appointments.length > 0
      ? Math.max(..._appointments.map(a => a.id)) + 1
      : 1;
    const newAppointment = { ...appointment, id: newId };
    _appointments.push(newAppointment);
    appointmentStorage._persist();
    return newAppointment;
  },

  update: (id, updates) => {
    const index = _appointments.findIndex(a => a.id === parseInt(id, 10));
    if (index === -1) return null;
    _appointments[index] = { ..._appointments[index], ...updates };
    appointmentStorage._persist();
    return _appointments[index];
  },

  delete: (id) => {
    const before = _appointments.length;
    _appointments = _appointments.filter(a => a.id !== parseInt(id, 10));
    if (_appointments.length < before) appointmentStorage._persist();
  }
};

// ── Toast ─────────────────────────────────────────────────────────
const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;
  if (toast._tid) clearTimeout(toast._tid);
  toast._tid = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ── Modal manager ─────────────────────────────────────────────────
const modalManager = {
  open: (modalId) => {
    const modal = safeGetElement(modalId);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    const focusable = modal.querySelector('input, select, textarea, button:not(.modal-close)');
    if (focusable) focusable.focus();
    document.body.style.overflow = 'hidden';
  },

  close: (modalId) => {
    const modal = safeGetElement(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
};

// ── Validación ────────────────────────────────────────────────────
const validateField = (input) => {
  const group = input.closest('.form-group');
  if (!group) return true;
  const errorSpan = group.querySelector('.error-message');
  let valid = true;

  if (input.required && !input.value.trim()) {
    valid = false;
  } else if (input.type === 'email' && input.value.trim()) {
    valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
  } else if (input.type === 'date' && input.value) {
    const selected = new Date(input.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    valid = selected >= today;
  }

  input.classList.toggle('error', !valid);
  if (errorSpan) errorSpan.classList.toggle('visible', !valid);
  input.toggleAttribute('aria-invalid', !valid);
  return valid;
};

const validateForm = (form) => {
  let allValid = true;
  form.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
    if (!validateField(input)) allValid = false;
  });
  return allValid;
};

// ── Render ────────────────────────────────────────────────────────
const createAppointmentRow = (appt) => {
  const tr = document.createElement('tr');
  tr.dataset.id = appt.id;
  if (appt.highlight) tr.classList.add('row-highlight');
  if (appt.noShow) tr.classList.add('row-no-show');

  tr.innerHTML = `
    <td class="col-fecha">${appt.date}</td>
    <td class="col-hora"><span class="pill-hora" aria-label="Hora: ${appt.time}">${appt.time}</span></td>
    <td class="col-paciente${appt.highlight ? ' highlight' : ''}">${appt.patient}</td>
    <td class="col-profesional">${appt.doctor}</td>
    <td class="col-servicio">${appt.service}</td>
    <td class="col-consultorio">${appt.office}</td>
    <td>
      <span class="status-badge ${appt.statusClass}" role="status" aria-label="Estado: ${appt.status}">
        ${appt.status}
      </span>
    </td>
    <td>
      <div class="actions-cell" role="group" aria-label="Acciones para ${appt.patient}">
        <button class="action-icon" data-action="view" data-id="${appt.id}" aria-label="Ver detalles de ${appt.patient}">👁️</button>
        <button class="action-icon" data-action="edit" data-id="${appt.id}" aria-label="Editar cita de ${appt.patient}">✏️</button>
        <button class="action-icon" data-action="sync" data-id="${appt.id}" aria-label="Sincronizar cita de ${appt.patient}">🔄</button>
        <button class="action-icon danger" data-action="cancel" data-id="${appt.id}" aria-label="Cancelar cita de ${appt.patient}">✕</button>
      </div>
    </td>
  `;
  return tr;
};

const renderAppointments = (data) => {
  const tbody = safeGetElement('appointmentsTable');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">
          <span aria-hidden="true">📅</span><br>No hay citas que coincidan con los filtros.
        </td>
      </tr>`;
    updatePaginationInfo(0, 0, 0);
    return;
  }

  const fragment = document.createDocumentFragment();
  data.forEach(appt => fragment.appendChild(createAppointmentRow(appt)));
  tbody.innerHTML = '';
  tbody.appendChild(fragment);

  updatePaginationInfo(1, Math.min(5, data.length), data.length);
};

// ── Filtros ───────────────────────────────────────────────────────
const filterAppointments = () => {
  const query = safeGetElement('searchPatient')?.value.toLowerCase().trim() || '';
  const professional = safeGetElement('filterProfessional')?.value || '';
  const date = safeGetElement('filterDate')?.value || '';
  const status = safeGetElement('filterStatus')?.value || '';

  const filtered = appointmentStorage.getAll().filter(appt => {
    const matchQuery = !query ||
      appt.patient.toLowerCase().includes(query) ||
      appt.doctor.toLowerCase().includes(query) ||
      appt.service.toLowerCase().includes(query);
    const matchProfessional = !professional || appt.doctor === professional;
    const matchDate =
      !date ||
      (date === 'today' && appt.dateISO === '2026-03-20') ||
      (date === 'tomorrow' && appt.dateISO === '2026-03-21');
    const matchStatus = !status || appt.status === status;
    return matchQuery && matchProfessional && matchDate && matchStatus;
  });

  renderAppointments(filtered);
};

// ── Métricas ──────────────────────────────────────────────────────
const updateMetrics = () => {
  const all = appointmentStorage.getAll();
  const today = all.filter(a => a.dateISO === '2026-03-20').length;
  const confirmed = all.filter(a => a.status === 'Confirmada' || a.status === 'En consulta').length;
  const pending = all.filter(a => a.status === 'Agendada').length;
  const cancelled = all.filter(a => a.status === 'Cancelada' || a.status === 'No asistió').length;

  [
    ['metricToday', today],
    ['metricConfirmed', confirmed],
    ['metricPending', pending],
    ['metricCancelled', cancelled]
  ].forEach(([id, val]) => {
    const el = safeGetElement(id);
    if (el) el.textContent = val;
  });
};

const updatePaginationInfo = (start, end, total) => {
  const el = safeGetElement('paginationInfo');
  if (el) el.textContent = total > 0
    ? `Mostrando ${start}-${end} de ${total} citas`
    : 'Sin resultados';
};

// ── Acciones de tabla ─────────────────────────────────────────────
const handleTableAction = (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'view') openViewModal(id);
  if (action === 'edit') openEditModal(id);
  if (action === 'sync') openSyncModal(id);
  if (action === 'cancel') {
    if (confirm('¿Estás seguro de cancelar esta cita?')) {
      appointmentStorage.delete(id);
      updateMetrics();
      filterAppointments();
      showToast('Cita cancelada');
    }
  }
};

// ── Modales ───────────────────────────────────────────────────────
const openViewModal = (id) => {
  const appt = appointmentStorage.findById(id);
  if (!appt) return;

  const content = safeGetElement('modalViewContent');
  if (content) {
    content.innerHTML = `
      <div class="modal-row"><span class="modal-key">Paciente</span><span class="modal-val">${appt.patient}</span></div>
      <div class="modal-row"><span class="modal-key">Fecha</span><span class="modal-val"><time datetime="${appt.dateISO}">${appt.date}</time></span></div>
      <div class="modal-row"><span class="modal-key">Hora</span><span class="modal-val">${appt.time}</span></div>
      <div class="modal-row"><span class="modal-key">Profesional</span><span class="modal-val">${appt.doctor}</span></div>
      <div class="modal-row"><span class="modal-key">Servicio</span><span class="modal-val">${appt.service}</span></div>
      <div class="modal-row"><span class="modal-key">Consultorio</span><span class="modal-val">${appt.office}</span></div>
      <div class="modal-row"><span class="modal-key">Estado</span><span class="modal-val"><span class="status-badge ${appt.statusClass}">${appt.status}</span></span></div>
      ${appt.notes ? `<div class="modal-row"><span class="modal-key">Notas</span><span class="modal-val">${appt.notes}</span></div>` : ''}
    `;
  }

  const editBtn = safeGetElement('modalViewEdit');
  if (editBtn) {
    const fresh = editBtn.cloneNode(true);
    editBtn.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      modalManager.close('modalViewAppointment');
      openEditModal(id);
    });
  }

  modalManager.open('modalViewAppointment');
};

const openEditModal = (id) => {
  const appt = appointmentStorage.findById(id);
  if (!appt) return;

  const fields = {
    editAppointmentId: appt.id,
    editPatient: appt.patient,
    editDate: appt.dateISO,
    editTime: appt.timeISO,
    editDoctor: appt.doctor,
    editService: appt.service,
    editOffice: appt.office,
    editStatus: appt.status,
    editNotes: appt.notes || ''
  };

  Object.entries(fields).forEach(([fieldId, value]) => {
    const el = safeGetElement(fieldId);
    if (el) el.value = value;
  });

  document.querySelectorAll('#modalEditAppointment .error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('#modalEditAppointment .error-message.visible').forEach(el => el.classList.remove('visible'));

  modalManager.open('modalEditAppointment');
};

const openSyncModal = (id) => {
  const appt = appointmentStorage.findById(id);
  if (!appt) return;

  ['syncGoogle', 'syncOutlook', 'syncApple'].forEach(btnId => {
    const btn = safeGetElement(btnId);
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      showToast(`Sincronizando con ${fresh.dataset.platform}…`, 'info');
      setTimeout(() => {
        showToast(`Cita sincronizada con ${fresh.dataset.platform}`);
        modalManager.close('modalSyncCalendar');
      }, 1500);
    });
  });

  modalManager.open('modalSyncCalendar');
};

const initModalHandlers = () => {
  const closeMap = {
    modalNewClose: 'modalNewAppointment',
    modalViewClose: 'modalViewAppointment',
    modalEditClose: 'modalEditAppointment',
    modalSyncClose: 'modalSyncCalendar',
    modalNewCancel: 'modalNewAppointment',
    modalViewCancel: 'modalViewAppointment',
    modalEditCancel: 'modalEditAppointment',
    modalSyncCancel: 'modalSyncCalendar',
  };

  Object.entries(closeMap).forEach(([btnId, modalId]) => {
    const btn = safeGetElement(btnId);
    if (btn) btn.addEventListener('click', () => modalManager.close(modalId));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) modalManager.close(overlay.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay.open').forEach(m => modalManager.close(m.id));
  });
};

// ── Formulario nueva cita ─────────────────────────────────────────
const initNewAppointmentForm = () => {
  const form = safeGetElement('formNewAppointment');
  if (!form) return;

  const dateInput = safeGetElement('newDate');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  form.querySelectorAll('input[required], select[required]').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(input);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(form)) {
      showToast('Por favor completa los campos requeridos', 'error');
      return;
    }

    const dateVal = safeGetElement('newDate').value;
    const timeVal = safeGetElement('newTime').value;
    const timeFormatted = formatTime12h(timeVal);
    const dateFormatted = new Date(dateVal + 'T12:00:00')
      .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    appointmentStorage.add({
      patient: safeGetElement('newPatient').value.trim(),
      date: dateFormatted,
      dateISO: dateVal,
      time: timeFormatted,
      timeISO: timeVal,
      doctor: safeGetElement('newDoctor').value,
      service: safeGetElement('newService').value,
      office: safeGetElement('newOffice').value,
      status: 'Agendada',
      statusClass: 'status-agendada',
      highlight: false,
      noShow: false,
      notes: safeGetElement('newNotes').value.trim(),
    });

    updateMetrics();
    filterAppointments();
    modalManager.close('modalNewAppointment');
    form.reset();
    showToast('Cita creada exitosamente');
  });
};

// ── Formulario editar cita ────────────────────────────────────────
const initEditAppointmentForm = () => {
  const form = safeGetElement('formEditAppointment');
  if (!form) return;

  form.querySelectorAll('input[required], select[required]').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(input);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(form)) {
      showToast('Por favor completa los campos requeridos', 'error');
      return;
    }

    const id = safeGetElement('editAppointmentId').value;
    const dateVal = safeGetElement('editDate').value;
    const timeVal = safeGetElement('editTime').value;
    const newStatus = safeGetElement('editStatus').value;

    const statusClassMap = {
      'Atendida': 'status-atendida',
      'En consulta': 'status-consulta',
      'Agendada': 'status-agendada',
      'Confirmada': 'status-agendada',
      'Cancelada': 'status-no-asistio',
      'No asistió': 'status-no-asistio',
    };

    const dateFormatted = new Date(dateVal + 'T12:00:00')
      .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    const updated = appointmentStorage.update(id, {
      patient: safeGetElement('editPatient').value.trim(),
      date: dateFormatted,
      dateISO: dateVal,
      time: formatTime12h(timeVal),
      timeISO: timeVal,
      doctor: safeGetElement('editDoctor').value,
      service: safeGetElement('editService').value,
      office: safeGetElement('editOffice').value,
      status: newStatus,
      statusClass: statusClassMap[newStatus] || 'status-agendada',
      notes: safeGetElement('editNotes').value.trim(),
    });

    if (updated) {
      updateMetrics();
      filterAppointments();
      modalManager.close('modalEditAppointment');
      showToast('Cita actualizada exitosamente');
    }
  });
};

// ── Menú móvil ────────────────────────────────────────────────────
const initMobileMenu = () => {
  const sidebar = safeGetElement('sidebar');
  const overlay = safeGetElement('overlay');
  const hamburger = safeGetElement('hamburger');
  if (!sidebar || !overlay || !hamburger) return;

  const toggle = (show) => {
    sidebar.classList.toggle('open', show);
    overlay.classList.toggle('open', show);
    hamburger.setAttribute('aria-expanded', String(show));
    overlay.setAttribute('aria-hidden', String(!show));
    if (show) sidebar.querySelector('.nav-item')?.focus();
    else hamburger.focus();
  };

  hamburger.addEventListener('click', () => toggle(true));
  overlay.addEventListener('click', () => toggle(false));
  sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 680) toggle(false);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      e.preventDefault();
      toggle(false);
    }
  });
};

// ── View toggles ──────────────────────────────────────────────────
const handleViewToggle = (btn) => {
  document.querySelectorAll('.view-toggle').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('tabindex', '-1');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  btn.setAttribute('tabindex', '0');

  const view = btn.dataset.view;
  if (view === 'calendar') showToast('Vista de calendario próximamente disponible', 'info');
  if (view === 'paused') showToast('Mostrando citas pausadas', 'info');
};

// ── Paginación ────────────────────────────────────────────────────
const initPagination = () => {
  safeGetElement('prevPage')?.addEventListener('click', (e) => {
    if (!e.currentTarget.disabled) showToast('Página anterior', 'info');
  });
  safeGetElement('nextPage')?.addEventListener('click', () => showToast('Página siguiente', 'info'));

  document.querySelectorAll('.pagination-number').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pagination-number').forEach(b => {
        b.classList.remove('active');
        b.removeAttribute('aria-current');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
      showToast(`Mostrando página ${btn.textContent}`, 'info');
    });
  });
};

// ── Botones nueva cita ────────────────────────────────────────────
const initNewAppointmentButtons = () => {
  const open = () => {
    const form = safeGetElement('formNewAppointment');
    if (form) form.reset();
    document.querySelectorAll('#modalNewAppointment .error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('#modalNewAppointment .error-message.visible').forEach(el => el.classList.remove('visible'));
    modalManager.open('modalNewAppointment');
  };
  safeGetElement('btnNuevaCita')?.addEventListener('click', open);
  safeGetElement('fabNuevaCita')?.addEventListener('click', open);
};

// ── Init ──────────────────────────────────────────────────────────
const init = () => {
  appointmentStorage.init();

  initMobileMenu();
  initModalHandlers();
  initNewAppointmentForm();
  initEditAppointmentForm();
  initPagination();
  initNewAppointmentButtons();

  updateMetrics();
  renderAppointments(appointmentStorage.getAll());

  document.querySelectorAll('.view-toggle').forEach(btn => {
    btn.addEventListener('click', () => handleViewToggle(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewToggle(btn); }
    });
  });

  const searchInput = safeGetElement('searchPatient');
  if (searchInput) searchInput.addEventListener('input', debounce(filterAppointments, 180));

  ['filterProfessional', 'filterDate', 'filterStatus'].forEach(id => {
    safeGetElement(id)?.addEventListener('change', filterAppointments);
  });

  const tableBody = safeGetElement('appointmentsTable');
  if (tableBody) {
    tableBody.addEventListener('click', handleTableAction);
    tableBody.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-action]')) {
        e.preventDefault();
        e.target.click();
      }
    });
  }
};

// ── Datos de ejemplo ──────────────────────────────────────────────
const appointmentsData = [
  { id:1, date:'20 mar', dateISO:'2026-03-20', time:'08:00 AM', timeISO:'08:00', patient:'María López', doctor:'Dr. Méndez', service:'Consulta', office:'C1', status:'Atendida', statusClass:'status-atendida', highlight:false, noShow:false },
  { id:2, date:'20 mar', dateISO:'2026-03-20', time:'10:00 AM', timeISO:'10:00', patient:'Pedro García', doctor:'Dr. Méndez', service:'Control', office:'C1', status:'En consulta', statusClass:'status-consulta', highlight:true, noShow:false },
  { id:3, date:'20 mar', dateISO:'2026-03-20', time:'11:00 AM', timeISO:'11:00', patient:'Ana Martínez', doctor:'Dr. Méndez', service:'Resina', office:'C1', status:'Agendada', statusClass:'status-agendada', highlight:false, noShow:false },
  { id:4, date:'21 mar', dateISO:'2026-03-21', time:'09:00 AM', timeISO:'09:00', patient:'Sandra Pérez', doctor:'Dr. Méndez', service:'Control', office:'C1', status:'Agendada', statusClass:'status-agendada', highlight:false, noShow:false },
  { id:5, date:'22 mar', dateISO:'2026-03-22', time:'08:00 AM', timeISO:'08:00', patient:'Roberto Silva', doctor:'Dra. Gómez', service:'Extracción', office:'C3', status:'No asistió', statusClass:'status-no-asistio', highlight:false, noShow:true },
];

document.addEventListener('DOMContentLoaded', init);