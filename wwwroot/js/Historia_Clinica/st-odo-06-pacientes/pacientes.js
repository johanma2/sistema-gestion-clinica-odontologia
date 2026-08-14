/**
 * SMILETRACK — MIS PACIENTES ODONTÓLOGO (pacientes.js)
 * Paginación + Filtros múltiples + Modal detalle + Modal historial
 */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES
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
//  DATOS DE EJEMPLO
// ═══════════════════════════════════════════════════════════════════
const SAMPLE_PACIENTES = [
  {
    id: 1, nombre: 'María López', cedula: '1.045.678.901',
    ultima: '15/03/2026', ultimaISO: '2026-03-15',
    servicio: 'Consulta General',
    proxima: '20/04/2026', proximaISO: '2026-04-20',
    estado: 'activo', alergias: ['Penicilina'],
    telefono: '300 123 4567', email: 'maria@email.com',
    historial: [
      { fecha: '15 Mar 2026', fechaISO: '2026-03-15', procedimiento: 'Consulta general + revisión', doctor: 'Dr. Andrés Ruiz', notas: 'Paciente estable, sin hallazgos relevantes.' },
      { fecha: '10 Ene 2026', fechaISO: '2026-01-10', procedimiento: 'Limpieza profunda', doctor: 'Dr. Andrés Ruiz', notas: 'Se recomienda control en 3 meses.' }
    ]
  },
  {
    id: 2, nombre: 'Carlos Ruiz', cedula: '1.098.765.432',
    ultima: '18/03/2026', ultimaISO: '2026-03-18',
    servicio: 'Limpieza Dental',
    proxima: '18/06/2026', proximaISO: '2026-06-18',
    estado: 'alta', alergias: [],
    telefono: '310 987 6543', email: 'carlos@email.com',
    historial: [
      { fecha: '18 Mar 2026', fechaISO: '2026-03-18', procedimiento: 'Limpieza dental completa', doctor: 'Dr. Andrés Ruiz', notas: 'Alta médica. Sin necesidad de seguimiento inmediato.' }
    ]
  },
  {
    id: 3, nombre: 'Pedro García', cedula: '1.234.567.890',
    ultima: '20/03/2026', ultimaISO: '2026-03-20',
    servicio: 'Control',
    proxima: '05/04/2026', proximaISO: '2026-04-05',
    estado: 'seguimiento', alergias: [],
    telefono: '315 555 1234', email: 'pedro@email.com',
    historial: [
      { fecha: '20 Mar 2026', fechaISO: '2026-03-20', procedimiento: 'Control periodontal', doctor: 'Dr. Andrés Ruiz', notas: 'Seguimiento necesario. Próxima cita en 2 semanas.' },
      { fecha: '20 Feb 2026', fechaISO: '2026-02-20', procedimiento: 'Tratamiento periodontal fase 1', doctor: 'Dr. Andrés Ruiz', notas: 'Se inicia tratamiento. Buena respuesta.' }
    ]
  },
  {
    id: 4, nombre: 'Ana Martínez', cedula: '1.876.543.210',
    ultima: '10/03/2026', ultimaISO: '2026-03-10',
    servicio: 'Resina Dental',
    proxima: '10/04/2026', proximaISO: '2026-04-10',
    estado: 'activo', alergias: ['Látex'],
    telefono: '320 444 5678', email: 'ana@email.com',
    historial: [
      { fecha: '10 Mar 2026', fechaISO: '2026-03-10', procedimiento: 'Resina compuesta pieza 14', doctor: 'Dr. Andrés Ruiz', notas: 'Colocación satisfactoria. Se indica no ingerir alimentos duros por 24h.' }
    ]
  },
  {
    id: 5, nombre: 'Luis Herrera', cedula: '1.345.678.902',
    ultima: '12/02/2026', ultimaISO: '2026-02-12',
    servicio: 'Extracción',
    proxima: '—', proximaISO: null,
    estado: 'alta', alergias: [],
    telefono: '311 222 3344', email: 'luis@email.com',
    historial: [
      { fecha: '12 Feb 2026', fechaISO: '2026-02-12', procedimiento: 'Extracción pieza 28', doctor: 'Dr. Andrés Ruiz', notas: 'Sin complicaciones. Alta médica.' }
    ]
  },
  {
    id: 6, nombre: 'Sara Gómez', cedula: '1.456.789.013',
    ultima: '05/03/2026', ultimaISO: '2026-03-05',
    servicio: 'Blanqueamiento',
    proxima: '05/06/2026', proximaISO: '2026-06-06',
    estado: 'activo', alergias: [],
    telefono: '318 777 8899', email: 'sara@email.com',
    historial: [
      { fecha: '05 Mar 2026', fechaISO: '2026-03-05', procedimiento: 'Blanqueamiento dental', doctor: 'Dr. Andrés Ruiz', notas: 'Resultado excelente. Recomendar mantenimiento semestral.' }
    ]
  },
  {
    id: 7, nombre: 'Valentina Ríos', cedula: '1.567.890.124',
    ultima: '22/02/2026', ultimaISO: '2026-02-22',
    servicio: 'Ortodoncia',
    proxima: '22/03/2026', proximaISO: '2026-03-22',
    estado: 'seguimiento', alergias: ['Penicilina', 'Ibuprofeno'],
    telefono: '312 333 4455', email: 'valentina@email.com',
    historial: [
      { fecha: '22 Feb 2026', fechaISO: '2026-02-22', procedimiento: 'Ajuste de brackets', doctor: 'Dr. Andrés Ruiz', notas: 'Buen progreso. Seguimiento mensual.' },
      { fecha: '22 Ene 2026', fechaISO: '2026-01-22', procedimiento: 'Colocación de aparato ortodoncia', doctor: 'Dr. Andrés Ruiz', notas: 'Inicio de tratamiento. Paciente con alergias documentadas.' }
    ]
  },
  {
    id: 8, nombre: 'Diego Vargas', cedula: '1.678.901.235',
    ultima: '01/03/2026', ultimaISO: '2026-03-01',
    servicio: 'Consulta General',
    proxima: '—', proximaISO: null,
    estado: 'activo', alergias: [],
    telefono: '316 444 5566', email: 'diego@email.com',
    historial: [
      { fecha: '01 Mar 2026', fechaISO: '2026-03-01', procedimiento: 'Consulta de valoración', doctor: 'Dr. Andrés Ruiz', notas: 'Paciente asintomático. Sin tratamiento requerido por el momento.' }
    ]
  },
  {
    id: 9, nombre: 'Camila Torres', cedula: '1.789.012.346',
    ultima: '08/03/2026', ultimaISO: '2026-03-08',
    servicio: 'Limpieza Dental',
    proxima: '08/09/2026', proximaISO: '2026-09-08',
    estado: 'activo', alergias: [],
    telefono: '317 555 6677', email: 'camila@email.com',
    historial: [
      { fecha: '08 Mar 2026', fechaISO: '2026-03-08', procedimiento: 'Limpieza dental + fluorización', doctor: 'Dr. Andrés Ruiz', notas: 'Excelente higiene oral. Próxima cita en 6 meses.' }
    ]
  },
  {
    id: 10, nombre: 'Sebastián Mora', cedula: '1.890.123.457',
    ultima: '25/02/2026', ultimaISO: '2026-02-25',
    servicio: 'Extracción',
    proxima: '25/03/2026', proximaISO: '2026-03-25',
    estado: 'seguimiento', alergias: ['Látex'],
    telefono: '319 666 7788', email: 'sebastian@email.com',
    historial: [
      { fecha: '25 Feb 2026', fechaISO: '2026-02-25', procedimiento: 'Extracción pieza 38 (cordal)', doctor: 'Dr. Andrés Ruiz', notas: 'Cirugía compleja. Control post-operatorio en 7 días. Alergia al látex documentada.' }
    ]
  },
  {
    id: 11, nombre: 'Isabella Castillo', cedula: '1.901.234.568',
    ultima: '14/02/2026', ultimaISO: '2026-02-14',
    servicio: 'Resina Dental',
    proxima: '14/05/2026', proximaISO: '2026-05-14',
    estado: 'activo', alergias: [],
    telefono: '321 777 8899', email: 'isabella@email.com',
    historial: [
      { fecha: '14 Feb 2026', fechaISO: '2026-02-14', procedimiento: 'Resinas piezas 21 y 22', doctor: 'Dr. Andrés Ruiz', notas: 'Restauración estética completa. Buen resultado.' }
    ]
  },
  {
    id: 12, nombre: 'Mateo Salcedo', cedula: '1.012.345.679',
    ultima: '18/01/2026', ultimaISO: '2026-01-18',
    servicio: 'Ortodoncia',
    proxima: '18/04/2026', proximaISO: '2026-04-18',
    estado: 'seguimiento', alergias: [],
    telefono: '322 888 9900', email: 'mateo@email.com',
    historial: [
      { fecha: '18 Ene 2026', fechaISO: '2026-01-18', procedimiento: 'Control de ortodoncia', doctor: 'Dr. Andrés Ruiz', notas: 'Evolución favorable. Aproximadamente 8 meses más de tratamiento.' }
    ]
  },
];

let pacientes = [...SAMPLE_PACIENTES];
let filteredPacientes = [...SAMPLE_PACIENTES];
let currentPage = 1;
let pageSize = 10;

// Estado de filtros
let fEstado = '';
let fAlergias = '';
let fCita = '';
let fServicio = '';
let fSearch = '';

// ═══════════════════════════════════════════════════════════════════
//  HELPERS DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════
const badgeClass = (estado) => ({ activo: 'badge-activo', seguimiento: 'badge-seguimiento', alta: 'badge-alta' }[estado] || 'badge-activo');
const estadoLabel = (estado) => ({ activo: 'Activo', seguimiento: 'En seguimiento', alta: 'Alta médica' }[estado] || estado);
const getAvatarColor = (nombre) => {
  const colors = ['var(--avatar-bg-1)', 'var(--avatar-bg-2)', 'var(--avatar-bg-3)', 'var(--avatar-bg-4)', 'var(--avatar-bg-5)'];
  return colors[nombre.charCodeAt(0) % colors.length];
};
const getInitials = (nombre) => nombre.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2);

// ═══════════════════════════════════════════════════════════════════
//  PAGINACIÓN
// ═══════════════════════════════════════════════════════════════════
const updatePagination = (total) => {
  const controls = safeGetElement('paginationControls');
  const pageShowing = safeGetElement('pageShowing');
  const pageTotal = safeGetElement('pageTotal');
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');
  const pageNumBtns = safeGetElement('pageNumBtns');

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const showing = pageSize === 0 ? total : Math.min(pageSize, total - (currentPage - 1) * pageSize);

  if (pageShowing) pageShowing.textContent = String(showing);
  if (pageTotal) pageTotal.textContent = String(total);

  if (controls) controls.style.display = total === 0 ? 'none' : 'flex';

  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = currentPage >= totalPages;

  if (pageNumBtns) {
    pageNumBtns.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `pagination-btn${i === currentPage ? ' active' : ''}`;
      btn.setAttribute('aria-label', `Página ${i}`);
      if (i === currentPage) btn.setAttribute('aria-current', 'page');
      btn.textContent = String(i);
      btn.addEventListener('click', () => { currentPage = i; renderTable(filteredPacientes); });
      pageNumBtns.appendChild(btn);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
//  RENDERIZADO DE TABLA
// ═══════════════════════════════════════════════════════════════════
const renderTable = (data) => {
  const tbody = safeGetElement('pacientesTbody');
  if (!tbody) return;

  filteredPacientes = data;
  const total = data.length;

  const start = pageSize === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageData = pageSize === 0 ? data : data.slice(start, start + pageSize);

  tbody.innerHTML = '';

  if (!pageData.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No se encontraron pacientes con los filtros aplicados.</td></tr>`;
    updatePagination(0);
    return;
  }

  pageData.forEach(p => {
    const tr = document.createElement('tr');
    tr.setAttribute('role', 'row');
    tr.setAttribute('tabindex', '0');
    tr.setAttribute('aria-label', `Ver detalle de ${p.nombre}`);
    tr.style.cursor = 'pointer';

    const proximaClase = p.proxima === '—' ? 'sin-cita' : '';
    const avatarColor = getAvatarColor(p.nombre);
    const initials = getInitials(p.nombre);

    tr.innerHTML = `
      <td class="td-paciente">
        <div class="p-avatar" style="background:${avatarColor}" aria-hidden="true">${initials}</div>
        <div>
          <div class="p-name">${p.nombre}</div>
          <div class="p-cedula">${p.cedula}</div>
        </div>
      </td>
      <td class="td-fecha"><time datetime="${p.ultimaISO}">${p.ultima}</time></td>
      <td>${p.servicio}</td>
      <td class="td-cita ${proximaClase}">
        ${p.proxima === '—' ? 'Sin cita' : `<time datetime="${p.proximaISO}">${p.proxima}</time>`}
      </td>
      <td><span class="badge ${badgeClass(p.estado)}" role="status" aria-label="Estado: ${estadoLabel(p.estado)}">${estadoLabel(p.estado)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-action btn-detalle" data-id="${p.id}" aria-label="Ver detalle de ${p.nombre}" title="Ver detalle del paciente">
            <span aria-hidden="true">👁️</span> Detalle
          </button>
          <button class="btn-action btn-historial" data-id="${p.id}" aria-label="Ver historial clínico de ${p.nombre}" title="Historial clínico">
            <span aria-hidden="true">📋</span> Historial
          </button>
        </div>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-action')) openModal(p.id);
    });
    tr.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.btn-action')) {
        e.preventDefault();
        openModal(p.id);
      }
    });

    tbody.appendChild(tr);
  });

  // Eventos de botones
  tbody.querySelectorAll('.btn-detalle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(Number(btn.dataset.id));
    });
  });
  tbody.querySelectorAll('.btn-historial').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openHistorialModal(Number(btn.dataset.id));
    });
  });

  updatePagination(total);

  // Actualizar contador de resultados
  const filterResults = safeGetElement('filterResults');
  const hasFilters = fSearch || fEstado || fAlergias || fCita || fServicio;
  if (filterResults) {
    filterResults.textContent = hasFilters
      ? `${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
      : '';
  }
};

// ═══════════════════════════════════════════════════════════════════
//  FILTROS
// ═══════════════════════════════════════════════════════════════════
const applyFilters = () => {
  currentPage = 1;
  const q = fSearch.trim().toLowerCase();

  const filtered = pacientes.filter(p => {
    if (q && !p.nombre.toLowerCase().includes(q) && !p.cedula.includes(q) && !p.servicio.toLowerCase().includes(q)) return false;
    if (fEstado && p.estado !== fEstado) return false;
    if (fAlergias === 'con' && !(p.alergias && p.alergias.length > 0)) return false;
    if (fAlergias === 'sin' && (p.alergias && p.alergias.length > 0)) return false;
    if (fCita === 'con' && (!p.proximaISO)) return false;
    if (fCita === 'sin' && p.proximaISO) return false;
    if (fServicio && p.servicio !== fServicio) return false;
    return true;
  });

  // Indicar estado activo del botón limpiar
  const hasFilters = fSearch || fEstado || fAlergias || fCita || fServicio;
  const clearBtn = safeGetElement('btnClearFilters');
  if (clearBtn) clearBtn.classList.toggle('active', !!hasFilters);

  renderTable(filtered);
};

// Poblar select de servicios dinámicamente
const populateServicioSelect = () => {
  const select = safeGetElement('filterServicio');
  if (!select) return;
  const servicios = [...new Set(pacientes.map(p => p.servicio))].sort();
  servicios.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL DETALLE
// ═══════════════════════════════════════════════════════════════════
const openModal = (id) => {
  const p = pacientes.find(a => a.id === id);
  if (!p) return;

  const content = safeGetElement('modalContent');
  if (content) {
    const avatarColor = getAvatarColor(p.nombre);
    const initials = getInitials(p.nombre);
    const alergiasHtml = p.alergias && p.alergias.length
      ? `<span class="modal-val danger">${p.alergias.join(', ')}</span>`
      : '<span class="modal-val">Ninguna</span>';

    content.innerHTML = `
      <div class="modal-avatar-wrap">
        <div class="modal-avatar" style="background:${avatarColor}" aria-hidden="true">${initials}</div>
      </div>
      <h3 class="modal-name">${p.nombre}</h3>
      <p class="modal-cedula">${p.cedula}</p>
      <div class="modal-grid">
        <div class="modal-item">
          <div class="modal-key">Última consulta</div>
          <div class="modal-val"><time datetime="${p.ultimaISO}">${p.ultima}</time></div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Próxima cita</div>
          <div class="modal-val ${p.proxima === '—' ? 'danger' : ''}">
            ${p.proxima === '—' ? 'Sin cita' : `<time datetime="${p.proximaISO}">${p.proxima}</time>`}
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Servicio</div>
          <div class="modal-val">${p.servicio}</div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Estado</div>
          <div class="modal-val"><span class="badge ${badgeClass(p.estado)}">${estadoLabel(p.estado)}</span></div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Teléfono</div>
          <div class="modal-val">${p.telefono}</div>
        </div>
        <div class="modal-item">
          <div class="modal-key">Email</div>
          <div class="modal-val">${p.email}</div>
        </div>
        <div class="modal-item" style="grid-column: span 2;">
          <div class="modal-key">Alergias</div>
          ${alergiasHtml}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-modal-historial" onclick="openHistorialModal(${p.id}); closeModal();">📋 Ver historial clínico</button>
      </div>
    `;
  }

  const overlay = safeGetElement('modalOverlay');
  if (overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.removeAttribute('inert');
    document.body.style.overflow = 'hidden';
    safeGetElement('modalClose')?.focus();
  }
};

const closeModal = () => {
  const overlay = safeGetElement('modalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL HISTORIAL CLÍNICO
// ═══════════════════════════════════════════════════════════════════
const openHistorialModal = (id) => {
  const p = pacientes.find(a => a.id === id);
  if (!p) return;

  const title = safeGetElement('modalHistorialTitle');
  if (title) title.textContent = `Historial Clínico — ${p.nombre}`;

  const content = safeGetElement('modalHistorialContent');
  if (content) {
    const avatarColor = getAvatarColor(p.nombre);
    const initials = getInitials(p.nombre);
    const alergiasHtml = p.alergias && p.alergias.length
      ? p.alergias.map(a => `<span class="alerg-badge">⚠️ ${a}</span>`).join('')
      : '<span class="text-muted">Sin alergias registradas</span>';

    const historialHtml = p.historial && p.historial.length
      ? p.historial.map((h, i) => `
          <div class="hist-entry${i === 0 ? ' hist-entry--latest' : ''}">
            <div class="hist-entry-header">
              <div class="hist-date-wrap">
                <span class="hist-dot"></span>
                <time class="hist-date" datetime="${h.fechaISO}">${h.fecha}</time>
                ${i === 0 ? '<span class="hist-badge-reciente">Más reciente</span>' : ''}
              </div>
              <span class="hist-doctor">👨‍⚕️ ${h.doctor}</span>
            </div>
            <div class="hist-procedimiento">${h.procedimiento}</div>
            <div class="hist-notas">${h.notas}</div>
          </div>
        `).join('')
      : '<p class="text-muted" style="text-align:center;padding:20px;">Sin historial registrado.</p>';

    content.innerHTML = `
      <div class="hist-patient-header">
        <div class="modal-avatar" style="background:${avatarColor};width:48px;height:48px;font-size:1rem;" aria-hidden="true">${initials}</div>
        <div>
          <div class="hist-patient-name">${p.nombre}</div>
          <div class="hist-patient-cedula">${p.cedula} · ${p.telefono}</div>
        </div>
        <span class="badge ${badgeClass(p.estado)} hist-estado">${estadoLabel(p.estado)}</span>
      </div>

      <div class="hist-info-grid">
        <div class="hist-info-item">
          <div class="hist-info-label">Última consulta</div>
          <div class="hist-info-val">${p.ultima}</div>
        </div>
        <div class="hist-info-item">
          <div class="hist-info-label">Próxima cita</div>
          <div class="hist-info-val ${p.proxima === '—' ? 'danger' : ''}">${p.proxima === '—' ? 'Sin cita programada' : p.proxima}</div>
        </div>
        <div class="hist-info-item">
          <div class="hist-info-label">Servicio actual</div>
          <div class="hist-info-val">${p.servicio}</div>
        </div>
        <div class="hist-info-item">
          <div class="hist-info-label">Alergias</div>
          <div class="hist-alergias-wrap">${alergiasHtml}</div>
        </div>
      </div>

      <div class="hist-timeline-title">
        <span>📋</span> Registro de consultas
        <span class="hist-count">${p.historial ? p.historial.length : 0} registro${p.historial && p.historial.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="hist-timeline">
        ${historialHtml}
      </div>
    `;
  }

  const overlay = safeGetElement('modalHistorialOverlay');
  if (overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.removeAttribute('inert');
    document.body.style.overflow = 'hidden';
    safeGetElement('modalHistorialClose')?.focus();
  }
};

const closeHistorialModal = () => {
  const overlay = safeGetElement('modalHistorialOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
};

// ═══════════════════════════════════════════════════════════════════
//  CONTADORES ANIMADOS
// ═══════════════════════════════════════════════════════════════════
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

const updateCounts = () => {
  animateCounter(safeGetElement('statTotal'), pacientes.length);
  animateCounter(safeGetElement('statActivos'), pacientes.filter(p => p.estado === 'activo').length);
  animateCounter(safeGetElement('statSeguimiento'), pacientes.filter(p => p.estado === 'seguimiento').length);
  animateCounter(safeGetElement('statAltas'), pacientes.filter(p => p.estado === 'alta').length);
};

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
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
    if (show) { sidebar.querySelector('.nav-item')?.focus(); } else { hamburger.focus(); }
  };

  hamburger.addEventListener('click', () => toggleMenu(true));
  overlay.addEventListener('click', () => toggleMenu(false));
  sidebar.querySelectorAll('.nav-item').forEach(item =>
    item.addEventListener('click', () => { if (window.innerWidth <= 680) toggleMenu(false); })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) { e.preventDefault(); toggleMenu(false); }
  });
};

const initModals = () => {
  // Modal detalle
  safeGetElement('modalClose')?.addEventListener('click', closeModal);
  safeGetElement('modalOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

  // Modal historial
  safeGetElement('modalHistorialClose')?.addEventListener('click', closeHistorialModal);
  safeGetElement('modalHistorialOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeHistorialModal(); });

  // Escape cierra cualquier modal abierto
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (safeGetElement('modalHistorialOverlay')?.classList.contains('open')) { e.preventDefault(); closeHistorialModal(); }
      else if (safeGetElement('modalOverlay')?.classList.contains('open')) { e.preventDefault(); closeModal(); }
    }
  });
};

const initFilters = () => {
  safeGetElement('searchInput')?.addEventListener('input', debounce((e) => {
    fSearch = e.target.value;
    applyFilters();
  }, 250));

  safeGetElement('filterEstado')?.addEventListener('change', (e) => { fEstado = e.target.value; applyFilters(); });
  safeGetElement('filterAlergias')?.addEventListener('change', (e) => { fAlergias = e.target.value; applyFilters(); });
  safeGetElement('filterCita')?.addEventListener('change', (e) => { fCita = e.target.value; applyFilters(); });
  safeGetElement('filterServicio')?.addEventListener('change', (e) => { fServicio = e.target.value; applyFilters(); });

  safeGetElement('pageSizeSelect')?.addEventListener('change', (e) => {
    pageSize = e.target.value === 'all' ? 0 : Number(e.target.value);
    currentPage = 1;
    renderTable(filteredPacientes);
  });

  safeGetElement('btnClearFilters')?.addEventListener('click', () => {
    fSearch = ''; fEstado = ''; fAlergias = ''; fCita = ''; fServicio = '';
    const ids = ['searchInput', 'filterEstado', 'filterAlergias', 'filterCita', 'filterServicio'];
    ids.forEach(id => { const el = safeGetElement(id); if (el) el.value = ''; });
    safeGetElement('btnClearFilters')?.classList.remove('active');
    applyFilters();
  });

  safeGetElement('btnPrev')?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage -= 1; renderTable(filteredPacientes); }
  });
  safeGetElement('btnNext')?.addEventListener('click', () => {
    const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredPacientes.length / pageSize);
    if (currentPage < totalPages) { currentPage += 1; renderTable(filteredPacientes); }
  });
};

async function fetchPacientes() {
  try {
    return SAMPLE_PACIENTES;
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return SAMPLE_PACIENTES;
  }
}

const init = async () => {
  initSidebar();
  initModals();

  pacientes = await fetchPacientes();
  filteredPacientes = [...pacientes];

  populateServicioSelect();
  initFilters();
  renderTable(pacientes);
  updateCounts();
};

document.addEventListener('DOMContentLoaded', init);