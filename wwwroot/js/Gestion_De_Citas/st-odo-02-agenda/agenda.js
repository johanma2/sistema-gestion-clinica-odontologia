/**
 * SMILETRACK — MI AGENDA ODONTÓLOGO (agenda.js)
 * API-ready + Accesibilidad + Persistencia fallback
 */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN API
// ═══════════════════════════════════════════════════════════════════
const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

// Obtiene elemento del DOM con manejo seguro
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
const SAMPLE_APPOINTMENTS = [
  { id:1, fecha:'Vie 20', fechaISO:'2026-03-20', hora:'08:00 AM', paciente:'María López',  servicio:'Consulta general', duracion:'30 min', estado:'Atendida',    active:false },
  { id:2, fecha:'Vie 20', fechaISO:'2026-03-20', hora:'09:00 AM', paciente:'Carlos Ruíz',  servicio:'Limpieza',          duracion:'45 min', estado:'Atendida',    active:false },
  { id:3, fecha:'Lun 24', fechaISO:'2026-03-24', hora:'10:00 AM', paciente:'Pedro García', servicio:'Control',           duracion:'30 min', estado:'En consulta', active:true  },
  { id:4, fecha:'Mar 25', fechaISO:'2026-03-25', hora:'11:00 AM', paciente:'Ana Martínez', servicio:'Resina',            duracion:'60 min', estado:'Agendada',    active:false },
  { id:5, fecha:'Mar 25', fechaISO:'2026-03-25', hora:'14:00 PM', paciente:'Luis Herrera', servicio:'Consulta',          duracion:'30 min', estado:'No asistió',  active:false },
  { id:6, fecha:'Mar 25', fechaISO:'2026-03-25', hora:'15:00 PM', paciente:'Sandra Pérez', servicio:'Control',           duracion:'20 min', estado:'Cancelada',   active:false },
  { id:7, fecha:'Mié 26', fechaISO:'2026-03-26', hora:'09:00 AM', paciente:'Laura Sánchez', servicio:'Ortodoncia',  duracion:'45 min', estado:'Agendada', active:false },
  { id:8, fecha:'Mié 26', fechaISO:'2026-03-26', hora:'10:30 AM', paciente:'Miguel Torres', servicio:'Limpieza',    duracion:'30 min', estado:'Agendada', active:false },
];

// Estado local
let appointments = [...SAMPLE_APPOINTMENTS];
let weekOffset = 0;

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════

// Determina clase CSS para badge de estado
const badgeClass = (estado) => {
  const map = {
    'Atendida': 'badge-atendida',
    'En consulta': 'badge-en-consulta',
    'Agendada': 'badge-agendada',
    'No asistió': 'badge-no-asistio',
    'Cancelada': 'badge-cancelada',
  };
  return map[estado] || 'badge-agendada';
};

// Genera ícono de edición con estado visual
const editIcon = (id, estado) => {
  const isRed = ['Cancelada', 'No asistió'].includes(estado);
  return `<button class="btn-icon edit-icon${isRed ? ' red' : ''}" title="Editar estado" aria-label="Editar estado de cita" onclick="editAppointment(${id})">✏️</button>`;
};

// Convierte hora AM/PM a formato ISO
const formatTimeISO = (horaAMPM) => {
  const [time, period] = horaAMPM.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
};

// Genera datetime ISO para atributos ARIA
const getDateTimeISO = (fechaISO, horaAMPM) => {
  return `${fechaISO}T${formatTimeISO(horaAMPM)}:00`;
};

// Renderiza tabla de citas con accesibilidad
const renderTable = (data) => {
  const tbody = safeGetElement('agendaTbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No hay citas para esta semana.</td></tr>`;
    return;
  }
  
  data.forEach(item => {
    const tr = document.createElement('tr');
    if (item.active) tr.classList.add('row-active');
    if (item.estado === 'Cancelada') tr.classList.add('row-cancelada');
    tr.setAttribute('role', 'row');
    
    const dateTimeISO = getDateTimeISO(item.fechaISO, item.hora);
    
    tr.innerHTML = `
      <td class="td-fecha"><time datetime="${item.fechaISO}T00:00:00">${item.fecha}</time></td>
      <td><span class="pill-hora"><time datetime="${dateTimeISO}">${item.hora}</time></span></td>
      <td class="td-paciente">${item.paciente}</td>
      <td>${item.servicio}</td>
      <td>${item.duracion}</td>
      <td><span class="badge ${badgeClass(item.estado)}" role="status" aria-label="Estado: ${item.estado}">${item.estado}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Ver detalle" aria-label="Ver detalle de cita de ${item.paciente}" onclick="openModal(${item.id})">👁️</button>
          ${editIcon(item.id, item.estado)}
        </div>
      </td>
    `;
    
    // Click en fila para ver detalle (excepto en botones de acción)
    tr.style.cursor = 'pointer';
    tr.setAttribute('tabindex', '0');
    tr.setAttribute('aria-label', `Ver detalle de cita de ${item.paciente} el ${item.fecha} a las ${item.hora}`);
    
    tr.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-icon')) openModal(item.id);
    });
    
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!e.target.closest('.btn-icon')) openModal(item.id);
      }
    });
    
    tbody.appendChild(tr);
  });
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL DE DETALLE ACCESSIBLE
// ═══════════════════════════════════════════════════════════════════

const openModal = (id) => {
  const item = appointments.find(a => a.id === id);
  if (!item) return;
  
  const dateTimeISO = getDateTimeISO(item.fechaISO, item.hora);
  
  const content = safeGetElement('modalContent');
  if (content) {
    content.innerHTML = `
      <div class="modal-row"><span class="modal-key">Fecha</span><span class="modal-val"><time datetime="${item.fechaISO}T00:00:00">${item.fecha}</time></span></div>
      <div class="modal-row"><span class="modal-key">Hora</span><span class="modal-val"><time datetime="${dateTimeISO}">${item.hora}</time></span></div>
      <div class="modal-row"><span class="modal-key">Paciente</span><span class="modal-val">${item.paciente}</span></div>
      <div class="modal-row"><span class="modal-key">Servicio</span><span class="modal-val">${item.servicio}</span></div>
      <div class="modal-row"><span class="modal-key">Duración</span><span class="modal-val">${item.duracion}</span></div>
      <div class="modal-row"><span class="modal-key">Estado</span><span class="modal-val"><span class="badge ${badgeClass(item.estado)}" role="status">${item.estado}</span></span></div>
    `;
  }
  
  const modalOverlay = safeGetElement('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    modalOverlay.removeAttribute('inert');
    
    // Enfocar botón de cerrar al abrir modal
    const closeBtn = safeGetElement('modalClose');
    if (closeBtn) closeBtn.focus();
    
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
  }
};

const closeModal = () => {
  const modalOverlay = safeGetElement('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    modalOverlay.setAttribute('inert', '');
    
    // Restaurar scroll
    document.body.style.overflow = '';
  }
};

// ═══════════════════════════════════════════════════════════════════
//  EDITAR ESTADO DE CITA
// ═══════════════════════════════════════════════════════════════════

window.editAppointment = (id) => {
  const item = appointments.find(a => a.id === id);
  if (!item) return;
  
  const validos = ['Atendida','En consulta','Agendada','No asistió','Cancelada'];
  const nuevo = prompt(`Estado actual: ${item.estado}\n\nEscribe nuevo estado:\n• Atendida\n• En consulta\n• Agendada\n• No asistió\n• Cancelada`);
  
  if (nuevo && validos.includes(nuevo)) {
    item.estado = nuevo;
    renderTable(appointments);
    updateCounts();
    showToast(`Estado actualizado a "${nuevo}"`, 'success');
  } else if (nuevo) {
    showToast('Estado no válido. Usa uno de los valores permitidos.', 'error');
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
  const weekStart = getWeekStart(new Date(), weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const weekAppts = appointments.filter(a => {
    const citaDate = new Date(a.fechaISO);
    return citaDate >= weekStart && citaDate <= weekEnd;
  });
  
  const hoy = new Date().toISOString().split('T')[0];
  const citasHoy = weekAppts.filter(a => a.fechaISO === hoy);
  
  const totalHoy = citasHoy.length;
  const atendidas = weekAppts.filter(a => a.estado === 'Atendida').length;
  const pendientes = weekAppts.filter(a => a.estado === 'Pendiente' || a.estado === 'Agendada').length;
  const mes = appointments.filter(a => {
    const d = new Date(a.fechaISO);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).filter(a => a.estado === 'Pendiente' || a.estado === 'Agendada').length;
  
  animateCounter(safeGetElement('statHoy'), totalHoy);
  animateCounter(safeGetElement('statAtendidas'), atendidas);
  animateCounter(safeGetElement('statPendientes'), pendientes);
  animateCounter(safeGetElement('statMes'), mes);
  
  const atendidasHoy = citasHoy.filter(a => a.estado === 'Atendida').length;
  const pct = totalHoy > 0 ? Math.round((atendidasHoy / totalHoy) * 100) : 0;
  const progressBar = safeGetElement('progressBar');
  const progressLabel = safeGetElement('progressLabel');
  const progressWrap = progressBar?.closest('[role="progressbar"]');
  
  if (progressBar) progressBar.style.width = pct + '%';
  if (progressWrap) {
    progressWrap.setAttribute('aria-valuenow', pct);
    progressWrap.setAttribute('aria-valuetext', `${pct}% de citas de hoy completadas`);
  }
  if (progressLabel) {
    progressLabel.textContent = `${atendidasHoy} de ${totalHoy} citas completadas hoy`;
    progressLabel.setAttribute('aria-label', `${atendidasHoy} de ${totalHoy} citas completadas hoy`);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  NAVEGACIÓN DE SEMANA
// ═══════════════════════════════════════════════════════════════════

const getWeekStart = (baseDate, offset) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const weekLabel = (offset) => {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const day = now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sat = new Date(mon); sat.setDate(mon.getDate() + 5);
  const mes = mon.toLocaleDateString('es-ES', { month:'long' });
  return `Semana ${mon.getDate()}-${sat.getDate()} de ${mes} ${mon.getFullYear()}`;
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS (Listas para conectar al backend C#)
// ═══════════════════════════════════════════════════════════════════

async function fetchAppointments() {
  try {
    // En producción: fetch real a API
    // const res = await fetch(`${API_BASE}/agenda/appointments?weekOffset=${weekOffset}`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    
    // Simulación: filtrar por semana
    const weekStart = getWeekStart(new Date(), weekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekData = SAMPLE_APPOINTMENTS.filter(a => {
      const citaDate = new Date(a.fechaISO);
      return citaDate >= weekStart && citaDate <= weekEnd;
    });
    
    appointments = weekData;
    return weekData;
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return SAMPLE_APPOINTMENTS;
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

  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (window.innerWidth <= 680) toggleMenu(false);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });
};

// Inicializa cambio global de estado
const initGlobalStatus = () => {
  const select = safeGetElement('globalStatus');
  if (!select) return;
  
  select.addEventListener('change', function() {
    const val = this.value;
    if (!val) return;
    
    if (confirm(`¿Cambiar todas las citas visibles a "${val}"?`)) {
      appointments.forEach(a => a.estado = val);
      renderTable(appointments);
      updateCounts();
      showToast('Estados actualizados', 'success');
    }
    this.value = '';
  });
};

// Inicializa modal con gestión de foco y teclado
const initModal = () => {
  const modalOverlay = safeGetElement('modalOverlay');
  const modalClose = safeGetElement('modalClose');
  
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  }
  
  // Soporte para teclado en modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay?.classList.contains('open')) {
      e.preventDefault();
      closeModal();
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  // Inicializar componentes de UI
  initSidebar();
  initGlobalStatus();
  initModal();
  
  // Actualizar fecha dinámica en header
  updateHeaderDate();
  
  // Label de semana inicial
  const weekTitle = safeGetElement('weekTitle');
  if (weekTitle) weekTitle.textContent = weekLabel(0);
  
  // Navegación de semana
  safeGetElement('btnPrev')?.addEventListener('click', () => {
    weekOffset--;
    if (weekTitle) weekTitle.textContent = weekLabel(weekOffset);
    fetchAppointments();
  });
  
  safeGetElement('btnNext')?.addEventListener('click', () => {
    weekOffset++;
    if (weekTitle) weekTitle.textContent = weekLabel(weekOffset);
    fetchAppointments();
  });
  
  // Cargar datos iniciales
  await fetchAppointments();
  updateCounts();
  
  // Limpieza al unload
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Actualiza fecha dinámica en header
const updateHeaderDate = () => {
  const now = new Date();
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  
  const dayName = days[now.getDay()];
  const dateStr = `${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`;
  const isoStr = now.toISOString().split('T')[0];
  
  const elDate = safeGetElement('headerDate');
  if (elDate) {
    elDate.textContent = `${dayName}, ${dateStr}`;
    elDate.setAttribute('datetime', isoStr);
  }
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);