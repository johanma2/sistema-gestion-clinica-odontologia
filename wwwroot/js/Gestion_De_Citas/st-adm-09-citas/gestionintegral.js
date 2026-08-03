/* ============================================
SmileTrack — Gestión Integral de Citas (st-adm-09-citas)
============================================
Autor: Johan Santamaria
Fecha: 29/07/2026 (actualizado 2026-07-27)

DESCRIPCIÓN:
Maneja la lógica interactiva de la tabla de citas del administrador: búsqueda debounced,
filtrado local dinámico, control de modales, guardado y eliminación consumiendo la API
REST /api/citas con Authorization Bearer JWT (y Cookie como fallback — política "ApiOrCookie").
Si la API no responde, se usa LocalStorage como fallback offline.

FUNCIONALIDADES PRINCIPALES:
- Carga de citas desde GET /api/citas con paginación y filtros (fallback LocalStorage)
- Filtrado combinado y en tiempo real por término de búsqueda, profesional, consultorio, fecha y estado
- Apertura y cierre accesible de modales para creación, visualización y edición detallada de citas
- Actualización asíncrona vía PUT /api/citas/{id} y cancelación soft delete vía DELETE /api/citas/{id}
- Notificaciones instantáneas (Toasts) y banner error accesible para fallos

DEPENDENCIAS TÉCNICAS:
- Controller: GestionCitasController → ApiListarCitas / ApiObtenerCita / ApiActualizarCita / ApiEliminarCita
- Endpoints: GET/PUT/DELETE /api/citas [Authorize(Policy = "ApiOrCookie")]
- CSS: ~/css/Gestion_De_Citas/st-adm-09-citas/gestionintegral.css
- JS: ~/js/Gestion_De_Citas/st-adm-09-citas/gestionintegral.js
- Partial / Otros: index.cshtml

NOTAS DE MANTENIMIENTO:
- Los comentarios internos explican el "por qué" de las decisiones de diseño/negocio, no el "qué" hace el código básico.
- El mapeo server↔cliente se concentra en los helpers mapServerToClient() y mapClientToServerBody()
  para evitar inconsistencias entre el formato del ViewModel CitaViewModel y las filas renderizadas.
============================================ */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN API Y AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════════
const API_BASE = '/api';
const API_PAGE_SIZE = 100;

// WHY: Centraliza los headers de autenticación. Primero intenta JWT (sessionStorage st_jwt),
//      si no existe el backend acepta Cookie Authentication igualmente (política ApiOrCookie).
const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  try {
    const jwt = sessionStorage.getItem('st_jwt');
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  } catch (e) { /* sessionStorage deshabilitado (modo privado), se ignora */ }
  return headers;
};

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

// WHY: safeGetElement previene excepciones fatales en la inicialización si un elemento no existe en el DOM
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

// WHY: Debounce evita saturar la API con peticiones redundantes ante cambios veloces del usuario
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

// WHY: Las notificaciones no bloqueantes brindan retroalimentación al usuario sin entorpecer el flujo de trabajo
const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;
  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3500);
};

// ═══════════════════════════════════════════════════════════════════
//  MAPEO ENTRE FORMATOS: Server (JSON) ↔ Cliente (fila renderizada)
// ═══════════════════════════════════════════════════════════════════
const colorPalette = ['blue', 'green', 'purple', 'red', 'slate'];

const pickColorByInitials = (initials) => {
  if (!initials) return 'blue';
  let hash = 0;
  for (let i = 0; i < initials.length; i++) hash = ((hash << 5) - hash) + initials.charCodeAt(i);
  return colorPalette[Math.abs(hash) % colorPalette.length];
};

const getInitials = (fullName) => {
  if (!fullName) return 'XX';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'XX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const slugFromName = (fullName) => {
  if (!fullName) return 'profesional';
  return fullName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '').trim() || 'profesional';
};

// WHY: Formato server = { IdCita, Paciente.NombreCompleto, Profesional.NombreCompleto, FechaHora ISO, Estado }
//      Formato cliente (render fila) = { id, date, time, patient, doc, professional (slug), professionalName, service, status, avatar, color }
const mapServerToClient = (srv) => {
  const fh = srv.FechaHora ? new Date(srv.FechaHora) : null;
  const y = fh ? fh.getFullYear() : 0;
  const m = fh ? String(fh.getMonth() + 1).padStart(2, '0') : '01';
  const d = fh ? String(fh.getDate()).padStart(2, '0') : '01';
  const hh = fh ? String(fh.getHours()).padStart(2, '0') : '09';
  const mm = fh ? String(fh.getMinutes()).padStart(2, '0') : '00';
  const patientFull = srv.Paciente?.NombreCompleto || '—';
  const initials = getInitials(patientFull);
  const color = pickColorByInitials(initials);

  // El server no expone Documento/Paciente en listado; usamos "Id" como identificación temporal.
  // Si se requiere cédula, ampliar ApiListarCitas con Paciente.Documento sin costo.
  const doc = srv.IdPaciente ? `#${srv.IdPaciente}` : '—';

  return {
    id: srv.IdCita,
    date: `${y}-${m}-${d}`,
    time: `${hh}:${mm}`,
    patient: patientFull,
    doc,
    professional: slugFromName(srv.Profesional?.NombreCompleto),
    professionalName: srv.Profesional?.NombreCompleto || 'Sin asignar',
    service: srv.Servicio?.Nombre || 'Sin servicio',
    status: mapEstadoServerToClient(srv.Estado),
    avatar: initials,
    color,
    _raw: srv
  };
};

const mapEstadoServerToClient = (estado) => {
  if (!estado) return 'programada';
  const e = estado.toLowerCase().trim();
  if (e === 'atendida' || e === 'finalizada' || e === 'en_proceso') return 'atendida';
  if (e === 'no_asistida') return 'no-show';
  if (['programada', 'confirmada', 'cancelada'].includes(e)) return e;
  return 'programada';
};

const mapEstadoClientToServer = (estado) => {
  if (estado === 'atendida') return 'finalizada';
  if (estado === 'no-show') return 'no_asistida';
  return estado || 'programada';
};

// ═══════════════════════════════════════════════════════════════════
//  PERSISTENCIA CON LOCALSTORAGE (FALLBACK OFFLINE)
// ═══════════════════════════════════════════════════════════════════

const appointmentsStorage = {
  key: 'smiletrack_citas_admin',

  // WHY: Carga de LocalStorage para simular persistencia de datos en modo offline
  load: () => {
    const stored = localStorage.getItem(appointmentsStorage.key);
    if (stored) {
      try { return JSON.parse(stored); }
      catch (e) { console.warn('Error al cargar citas locales, usando datos de ejemplo'); }
    }
    // ═══ DATOS DE EJEMPLO ÚNICAMENTE CUANDO LA API ESTÁ INALCANZABLE ═══
    return [
      { id: 1, date: '2026-05-24', time: '09:30', patient: 'Julián Restrepo', doc: '10239485', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Limpieza Dental', status: 'programada', avatar: 'JR', color: 'blue' },
      { id: 2, date: '2026-05-24', time: '11:00', patient: 'Lucía Torres', doc: '52109432', professional: 'sotelo', professionalName: 'Dra. Elena Sotelo', service: 'Ortodoncia', status: 'confirmada', avatar: 'LT', color: 'green' },
      { id: 3, date: '2026-05-24', time: '14:15', patient: 'Mariana Esparza', doc: '88764321', professional: 'ruiz', professionalName: 'Dr. Carlos Ruiz', service: 'Endodoncia', status: 'atendida', avatar: 'ME', color: 'purple' },
      { id: 4, date: '2026-05-24', time: '16:00', patient: 'Sebastián Correa', doc: '11098452', professional: 'sotelo', professionalName: 'Dra. Elena Sotelo', service: 'Extracción', status: 'cancelada', avatar: 'SC', color: 'red' },
      { id: 5, date: '2026-05-24', time: '17:30', patient: 'Mónica Giraldo', doc: '32109876', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Valoración', status: 'no-show', avatar: 'MG', color: 'slate' }
    ];
  },

  save: (data) => {
    try { localStorage.setItem(appointmentsStorage.key, JSON.stringify(data)); return true; }
    catch (e) { console.error('Error al guardar citas locales:', e); return false; }
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
//  DATOS Y ESTADO
// ═══════════════════════════════════════════════════════════════════

let appointments = appointmentsStorage.load();
let searchQuery = '';
let filterStatus = '';
let filterProfessional = '';
let filterDate = '';
let currentTab = 'all';
let currentPage = 1;
const itemsPerPage = 5;

const avatarColors = {
  blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600', red: 'bg-red-100 text-red-600', slate: 'bg-slate-100 text-slate-600'
};

// WHY: Activamos el renderizado cliente para consumir datos frescos de la API.
//      Setear a true para regresar a la lista renderizada en servidor (Razor).
const shouldUseServerRenderedList = () => {
  return false;
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
//  FILTRADO COMBINADO
// ═══════════════════════════════════════════════════════════════════

const getFilteredAppointments = () => {
  return appointments.filter(a => {
    if (currentTab === 'cancelled' && a.status !== 'cancelada') return false;
    if (currentTab === 'no-show' && a.status !== 'no-show') return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterProfessional && a.professional !== filterProfessional) return false;
    if (filterDate && a.date !== filterDate) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!a.patient.toLowerCase().includes(query) && !String(a.doc).toLowerCase().includes(query)) return false;
    }
    return true;
  });
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: TABLA DE CITAS
// ═══════════════════════════════════════════════════════════════════

const renderAppointments = () => {
  const body = safeGetElement('citasBody');
  if (!body || shouldUseServerRenderedList()) return;

  const filtered = getFilteredAppointments();
  if (!filtered.length) {
    body.innerHTML = '<div class="empty-state" role="status">No se encontraron citas con los criterios de búsqueda.</div>';
    updatePagination(0);
    return;
  }

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

const getAppointmentById = (id) => {
  const inMemory = appointments.find(a => a.id === id);
  if (inMemory) return inMemory;
  return appointmentsStorage.getAppointment(id);
};

const openAppointmentModal = (id, mode) => {
  const appt = getAppointmentById(id);
  if (!appt) {
    showToast('Cita no encontrada', 'warning');
    return;
  }

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
      <p><strong>Documento / ID:</strong> ${appt.doc}</p>
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
      <p><strong>Servicio:</strong> <input type="text" value="${appt.service}" id="editService" class="search-input" style="margin-left:8px;width:200px" placeholder="Nombre servicio"></p>
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

// WHY: Guarda los cambios vía PUT /api/citas/{id} y actualiza la fila en memoria
const saveAppointmentEdit = async (id) => {
  const appt = getAppointmentById(id);
  if (!appt) return;

  const newDate = safeGetElement('editDate')?.value || appt.date;
  const newTime = safeGetElement('editTime')?.value || appt.time;
  const newService = safeGetElement('editService')?.value || appt.service;
  const newStatus = safeGetElement('editStatus')?.value || appt.status;

  const updatedLocal = {
    ...appt,
    date: newDate,
    time: newTime,
    service: newService,
    status: newStatus
  };

  // Prepara cuerpo para el ViewModel CitaViewModel
  const raw = appt._raw || {};
  const fechaHoraIso = newDate && newTime ? `${newDate}T${newTime}:00`
    : raw.FechaHora ? raw.FechaHora : new Date().toISOString();

  const body = {
    IdCita: id,
    IdPaciente: raw.IdPaciente || appt.id || 0,
    IdProfesional: raw.IdProfesional || null,
    IdServicio: raw.IdServicio || 0,
    FechaHora: fechaHoraIso,
    Estado: mapEstadoClientToServer(newStatus),
    Notas: raw.Notas || ''
  };

  const editBtn = safeGetElement('modalAppointmentEdit');
  const btnOriginal = editBtn?.textContent;
  if (editBtn) { editBtn.disabled = true; editBtn.textContent = 'Guardando...'; }

  let saveOk = false;
  try {
    const res = await fetch(`${API_BASE}/citas/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    let payload;
    try { payload = await res.json(); } catch { payload = { success: res.ok }; }
    if (res.ok && payload.success) {
      const idx = appointments.findIndex(a => a.id === id);
      if (idx !== -1) {
        appointments[idx] = { ...updatedLocal, _raw: { ...(appt._raw || {}), Estado: body.Estado, FechaHora: body.FechaHora } };
      } else {
        appointments.unshift(updatedLocal);
      }
      appointmentsStorage.save(appointments);
      saveOk = true;
      renderAppointments();
      updateStats();
      closeAppointmentModal();
      showToast(`✅ Cita de ${appt.patient} actualizada`);
    } else {
      showToast(`❌ ${payload.message || 'No fue posible actualizar la cita'}`, 'error');
    }
  } catch (netErr) {
    console.error('[SmileTrack] Actualizar cita error red:', netErr);
    // Offline fallback: guardamos localmente para no perder el cambio
    const idx = appointments.findIndex(a => a.id === id);
    if (idx !== -1) appointments[idx] = updatedLocal;
    appointmentsStorage.save(appointments);
    renderAppointments();
    updateStats();
    closeAppointmentModal();
    saveOk = true;
    showToast('⚠️ Cita guardada localmente (sin conexión)', 'warning');
  } finally {
    if (editBtn) { editBtn.disabled = false; editBtn.textContent = btnOriginal || 'Guardar'; }
  }
};

// WHY: Cancela la cita con confirmación y DELETE soft (server: Estado=cancelada)
const cancelAppointment = async (id) => {
  if (!confirm('¿Estás seguro de cancelar esta cita?')) return;

  let ok = false;
  let serverMsg = null;

  try {
    const res = await fetch(`${API_BASE}/citas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    let payload;
    try { payload = await res.json(); } catch { payload = { success: res.ok }; }
    if (res.ok && payload.success) {
      ok = true;
      serverMsg = payload.message;
    } else {
      serverMsg = payload.message || (res.status === 403 ? 'No tienes permiso para cancelar citas' : 'No fue posible cancelar');
    }
  } catch (netErr) {
    console.warn('[SmileTrack] Cancelar offline:', netErr);
  }

  // Aplicamos el cambio localmente tanto si API respondió como si caímos en offline
  // (en offline el cambio queda marcado para sincronizar, en un escenario real con sync manager)
  const idx = appointments.findIndex(a => a.id === id);
  if (idx !== -1) {
    appointments[idx].status = 'cancelada';
    if (appointments[idx]._raw) appointments[idx]._raw.Estado = 'cancelada';
  }
  appointmentsStorage.save(appointments);
  renderAppointments();
  updateStats();

  if (ok) {
    showToast(serverMsg || '🗑️ Cita cancelada en servidor');
  } else if (idx !== -1) {
    showToast(`⚠️ Cancelada localmente (sin conexión): ${serverMsg || ''}`, 'warning');
  } else if (serverMsg) {
    showToast('❌ ' + serverMsg, 'error');
  }
};

// ═══════════════════════════════════════════════════════════════════
//  PAGINACIÓN Y CONTADORES
// ═══════════════════════════════════════════════════════════════════

const updatePagination = (totalItems) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const showing = Math.min(itemsPerPage, Math.max(0, totalItems - (currentPage - 1) * itemsPerPage));

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
  if (shouldUseServerRenderedList()) return;
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

const initTabs = () => {
  if (shouldUseServerRenderedList()) return;
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentTab = tab.dataset.tab;
      currentPage = 1;
      renderAppointments();
    });
  });
};

const initSearch = () => {
  if (shouldUseServerRenderedList()) return;
  const searchInput = safeGetElement('searchAppointments');
  searchInput?.addEventListener('input', debounce((e) => {
    searchQuery = (e.target.value || '').toLowerCase();
    currentPage = 1;
    renderAppointments();
  }, 250));
};

const initFilters = () => {
  if (shouldUseServerRenderedList()) return;
  const filterStatusEl = safeGetElement('filterStatus');
  const filterProfessionalEl = safeGetElement('filterProfessional');
  const filterDateEl = safeGetElement('filterDate');

  filterStatusEl?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    currentPage = 1;
    renderAppointments();
  });

  filterProfessionalEl?.addEventListener('change', (e) => {
    filterProfessional = e.target.value;
    currentPage = 1;
    renderAppointments();
  });

  filterDateEl?.addEventListener('change', (e) => {
    filterDate = e.target.value;
    currentPage = 1;
    renderAppointments();
  });
};

const initPagination = () => {
  if (shouldUseServerRenderedList()) return;
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

// WHY: Petición principal de carga. Si la API responde usamos esos datos;
//      si falla (sin conexión / 5xx) caemos al cache LocalStorage.
async function fetchAppointments() {
  try {
    const res = await fetch(`${API_BASE}/citas?page=1&pageSize=${API_PAGE_SIZE}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        // Sesión expirada o sin rol: no caemos a localStorage para evitar datos viejos
        throw new Error(res.status === 403 ? 'No tienes permiso para ver citas' : 'Sesión expirada');
      }
      throw new Error(`API status ${res.status}`);
    }
    const payload = await res.json();
    if (payload && payload.success && Array.isArray(payload.data)) {
      const mapped = payload.data.map(mapServerToClient);
      appointmentsStorage.save(mapped);
      return mapped;
    }
    throw new Error('Respuesta API inválida');
  } catch (error) {
    console.warn('[SmileTrack] Fallback a datos locales:', error);
    return appointmentsStorage.load();
  }
}

async function addAppointmentAPI(appt) {
  try {
    const res = await fetch(`${API_BASE}/citas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(appt)
    });
    if (!res.ok) throw new Error('Add failed');
    return await res.json();
  } catch (error) {
    console.warn('[SmileTrack] Add offline:', error);
    return appointmentsStorage.addAppointment(appt);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  try {
    initSidebar();
    initTabs();
    initSearch();
    initFilters();
    initPagination();
    initNewAppointment();
    initModal();
    initBanner();

    appointments = await fetchAppointments();
    updateStats();
    renderAppointments();

    window.addEventListener('beforeunload', () => { /* Cleanup SPA real */ });
  } catch (e) {
    console.error('[SmileTrack] Error inicializando modulo citas:', e);
    mostrarErrorUsuario(e.message || 'Error cargando módulo de citas. Intente recargar.');
  }
};

function mostrarErrorUsuario(mensaje) {
  let div = document.getElementById('smiletrack-error-bar');
  if (!div) {
    div = document.createElement('div');
    div.id = 'smiletrack-error-bar';
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:white;padding:14px 20px;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,.15);border-bottom:3px solid #991b1b;';
    div.setAttribute('role', 'alert');
    document.body.appendChild(div);
  }
  div.innerHTML = '<strong>[SmileTrack]</strong> ' + mensaje + ' <button onclick="document.getElementById(\'smiletrack-error-bar\').style.display=\'none\'" style="margin-left:16px;background:white;color:#dc2626;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;">×</button>';
  div.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', init);
