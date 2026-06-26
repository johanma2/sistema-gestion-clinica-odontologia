/**
 * SMILETRACK — AGENDA GENERAL (agenda.js)
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
const SAMPLE_APPOINTMENTS = [
  { id: 1, date: '2026-05-19', time: '09:00', patient: 'Carlos Ruiz', service: 'Limpieza', office: 'Box 01', status: 'confirmed', professional: 'Dr. Javier Méndez' },
  { id: 2, date: '2026-05-19', time: '11:30', patient: 'Elena Gómez', service: 'Revisión', office: 'Box 02', status: 'attended', professional: 'Dra. Lucía Torres' },
  { id: 3, date: '2026-05-20', time: '10:00', patient: 'Marc Vila', service: '—', office: '—', status: 'cancelled', professional: 'Dr. Roberto Sanz' },
  { id: 4, date: '2026-05-20', time: '16:00', patient: 'Sara Ortiz', service: 'Ortodoncia', office: 'Box 03', status: 'confirmed', professional: 'Dra. Lucía Torres' },
  { id: 5, date: '2026-05-21', time: '08:30', patient: 'Paula Jiménez', service: '—', office: '—', status: 'attended', professional: 'Dr. Javier Méndez' },
  { id: 6, date: '2026-05-21', time: '12:00', available: true },
  { id: 7, date: '2026-05-21', time: '17:45', patient: 'Daniel Castro', service: '—', office: '—', status: 'confirmed', professional: 'Dr. Roberto Sanz' },
  { id: 8, date: '2026-05-22', time: '10:00', patient: 'Marta Soler', service: 'Control', office: 'Box 01', status: 'confirmed', professional: 'Dr. Javier Méndez' },
  { id: 9, date: '2026-05-23', time: '09:00', patient: 'Luis Navarro', service: 'Limpieza', office: 'Box 01', status: 'confirmed', professional: 'Dr. Javier Méndez' },
  { id: 10, date: '2026-05-23', time: '11:00', patient: 'Ana Belén', service: '—', office: '—', status: 'attended', professional: 'Dra. Lucía Torres' },
  { id: 11, date: '2026-05-23', time: '15:30', patient: 'Pedro Páez', service: 'Consulta', office: 'Box 02', status: 'confirmed', professional: 'Dr. Roberto Sanz' },
  { id: 12, date: '2026-05-24', time: '10:00', reserved: true },
];

let appointments = [...SAMPLE_APPOINTMENTS];
let currentWeekStart = new Date('2026-05-19');

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════

// Formatea fecha para mostrar
const fmtDate = (date) => {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

// Obtiene clase CSS para estado de cita
const getStatusClass = (status) => {
  const map = { confirmed: 'confirmed', attended: 'attended', cancelled: 'cancelled', available: 'available', reserved: 'reserved' };
  return map[status] || 'available';
};

// Renderiza calendario con accesibilidad
const renderCalendar = (weekStart) => {
  const days = document.querySelectorAll('.calendar-day');
  const headers = document.querySelectorAll('.calendar-day-header');
  
  // Actualizar etiquetas de días
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    
    const header = headers[i];
    const day = days[i];
    
    if (header) {
      const dayName = header.querySelector('.day-name');
      const dayNumber = header.querySelector('.day-number');
      if (dayName) dayName.textContent = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][date.getDay()];
      if (dayNumber) {
        dayNumber.textContent = date.getDate();
        dayNumber.setAttribute('datetime', date.toISOString().split('T')[0]);
      }
      header.classList.toggle('current', isToday(date));
      header.classList.toggle('closed', date.getDay() === 0);
    }
    
    if (day) {
      day.innerHTML = '';
      day.setAttribute('aria-labelledby', `day-${i}`);
      
      // Mostrar estado cerrado para domingos
      if (date.getDay() === 0) {
        day.classList.add('closed');
        day.innerHTML = `<div class="day-closed"><span aria-hidden="true">🏥</span><span>CERRADO</span></div>`;
        continue;
      }
      day.classList.remove('closed');
      
      // Filtrar citas por fecha y filtros activos
      const dateStr = date.toISOString().split('T')[0];
      const filtered = appointments.filter(a => 
        a.date === dateStr && 
        (!selectedProfessional || a.professional === selectedProfessional) &&
        (!selectedOffice || a.office === selectedOffice)
      );
      
      if (!filtered.length) {
        day.innerHTML = '<div class="appointment available" tabindex="0"><span class="appt-time">—</span><span class="appt-patient">Sin citas</span></div>';
        continue;
      }
      
      // Renderizar citas
      filtered.forEach(appt => {
        const div = document.createElement('div');
        div.className = `appointment ${getStatusClass(appt.status || 'available')}`;
        div.tabIndex = 0;
        div.role = 'button';
        div.setAttribute('aria-label', buildApptLabel(appt));
        div.dataset.appointment = JSON.stringify(appt);
        
        const time = appt.available || appt.reserved ? '—' : appt.time;
        const patient = appt.available ? 'Espacio Disponible' : appt.reserved ? 'Urgencia - Reservado' : appt.patient;
        const detail = appt.service && appt.office ? `${appt.service} · ${appt.office}` : '';
        const status = appt.status === 'attended' ? 'Asistida' : appt.status === 'confirmed' ? 'Confirmada' : appt.status === 'cancelled' ? 'CANCELADA' : '';
        
        div.innerHTML = `
          <time datetime="${appt.date}T${appt.time || ''}:00" class="appt-time">${time}</time>
          <span class="appt-patient">${patient}</span>
          ${detail ? `<span class="appt-detail">${detail}</span>` : ''}
          ${status ? `<span class="appt-status">${status}</span>` : ''}
        `;
        
        div.addEventListener('click', () => openAppointmentModal(appt));
        div.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAppointmentModal(appt);
          }
        });
        
        day.appendChild(div);
      });
    }
  }
  
  // Actualizar etiqueta de semana
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = safeGetElement('weekLabel');
  if (weekLabel) {
    weekLabel.textContent = `${weekStart.getDate()}-${weekEnd.getDate()} mayo 2026`;
  }
};

// Construye etiqueta accesible para cita
const buildApptLabel = (appt) => {
  if (appt.available) return `Espacio disponible: ${appt.time}`;
  if (appt.reserved) return `Reservado para urgencias: ${appt.time}`;
  return `Cita ${appt.status}: ${appt.patient}, ${appt.time}, ${appt.service}, ${appt.office}`;
};

// Verifica si fecha es hoy
const isToday = (date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL: DETALLE DE CITA
// ═══════════════════════════════════════════════════════════════════

// Abre modal de detalle de cita
const openAppointmentModal = (appt) => {
  const content = safeGetElement('modalApptContent');
  const title = safeGetElement('modalApptTitle');
  const editBtn = safeGetElement('modalApptEdit');
  
  if (!content) return;
  
  if (appt.available) {
    if (title) title.textContent = 'Espacio Disponible';
    content.innerHTML = `
      <p><strong>Hora:</strong> <time datetime="${appt.date}T${appt.time}:00">${appt.time}</time></p>
      <p><strong>Estado:</strong> <span class="badge-status available">Disponible</span></p>
      <p class="mt-4">Este horario está libre para agendar una nueva cita.</p>
    `;
    if (editBtn) {
      editBtn.textContent = '📅 Agendar cita';
      editBtn.onclick = () => {
        showToast('📅 Abriendo formulario de nueva cita');
        closeAppointmentModal();
      };
    }
  } else if (appt.reserved) {
    if (title) title.textContent = 'Reservado para Urgencias';
    content.innerHTML = `
      <p><strong>Hora:</strong> <time datetime="${appt.date}T${appt.time}:00">${appt.time}</time></p>
      <p><strong>Estado:</strong> <span class="badge-status reserved">Reservado</span></p>
      <p class="mt-4">Este espacio está reservado para atenciones de urgencia.</p>
    `;
    if (editBtn) editBtn.style.display = 'none';
  } else {
    if (title) title.textContent = 'Detalle de Cita';
    content.innerHTML = `
      <div class="modal-detail-grid">
        <div><strong>Paciente</strong><p>${appt.patient}</p></div>
        <div><strong>Hora</strong><p><time datetime="${appt.date}T${appt.time}:00">${appt.time}</time></p></div>
        <div><strong>Servicio</strong><p>${appt.service}</p></div>
        <div><strong>Consultorio</strong><p>${appt.office}</p></div>
        <div><strong>Profesional</strong><p>${appt.professional}</p></div>
        <div><strong>Estado</strong><p><span class="badge-status ${getStatusClass(appt.status)}">${appt.status === 'confirmed' ? 'Confirmada' : appt.status === 'attended' ? 'Asistida' : 'Cancelada'}</span></p></div>
      </div>
    `;
    if (editBtn) {
      editBtn.style.display = '';
      editBtn.textContent = '✏️ Editar';
      editBtn.onclick = () => {
        showToast('✏️ Abriendo edición de cita');
        closeAppointmentModal();
      };
    }
  }
  
  // Mostrar modal
  const modal = safeGetElement('modalAppointment');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    const closeBtn = safeGetElement('modalApptClose');
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }
};

// Cierra modal de cita
const closeAppointmentModal = () => {
  const modal = safeGetElement('modalAppointment');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
};

// ═══════════════════════════════════════════════════════════════════
//  NAVEGACIÓN SEMANAL
// ═══════════════════════════════════════════════════════════════════

// Obtiene inicio de semana (lunes) para una fecha
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Navega a semana anterior
const prevWeek = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderCalendar(currentWeekStart);
};

// Navega a próxima semana
const nextWeek = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderCalendar(currentWeekStart);
};

// Navega a semana actual
const goToToday = () => {
  currentWeekStart = getWeekStart(new Date());
  renderCalendar(currentWeekStart);
  showToast('📅 Mostrando semana actual');
};

// ═══════════════════════════════════════════════════════════════════
//  FILTROS
// ═══════════════════════════════════════════════════════════════════

let selectedProfessional = '';
let selectedOffice = '';

// Aplica filtros
const applyFilters = () => {
  selectedProfessional = safeGetElement('filterProfessional')?.value || '';
  selectedOffice = safeGetElement('filterOffice')?.value || '';
  renderCalendar(currentWeekStart);
  showToast('🔍 Filtros aplicados');
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS (Listas para conectar al backend C#)
// ═══════════════════════════════════════════════════════════════════

// Obtiene agenda desde API
async function fetchAgenda(weekStart, filters = {}) {
  try {
    // En producción: fetch real a API
    // const params = new URLSearchParams({
    //   start: weekStart.toISOString().split('T')[0],
    //   ...filters
    // });
    // const res = await fetch(`${API_BASE}/admin/agenda?${params}`);
    // if (!res.ok) throw new Error('API error');
    // return await res.json();
    
    // Simulación con fallback
    return SAMPLE_APPOINTMENTS;
  } catch (error) {
    console.warn('Fallback a datos locales:', error);
    return SAMPLE_APPOINTMENTS;
  }
}

// Crea cita en API
async function createAppointmentAPI(data) {
  try {
    // En producción: POST real a API
    // const res = await fetch(`${API_BASE}/admin/appointments`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data),
    // });
    // if (!res.ok) throw new Error('Create failed');
    // return await res.json();
    
    // Simulación
    return { success: true, id: Date.now() };
  } catch (error) {
    console.warn('Error creando cita en API:', error);
    return null;
  }
}

// Actualiza cita en API
async function updateAppointmentAPI(id, updates) {
  try {
    // En producción: PATCH real a API
    // await fetch(`${API_BASE}/admin/appointments/${id}`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(updates),
    // });
    
    // Simulación
    return true;
  } catch (error) {
    console.warn('Error actualizando cita en API:', error);
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

// Inicializa navegación semanal
const initWeekNav = () => {
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');
  const btnToday = safeGetElement('btnToday');
  
  btnPrev?.addEventListener('click', prevWeek);
  btnNext?.addEventListener('click', nextWeek);
  btnToday?.addEventListener('click', goToToday);
};

// Inicializa filtros
const initFilters = () => {
  const btnFilter = safeGetElement('btnFilter');
  const filterProf = safeGetElement('filterProfessional');
  const filterOffice = safeGetElement('filterOffice');
  
  btnFilter?.addEventListener('click', applyFilters);
  filterProf?.addEventListener('change', debounce(applyFilters, 250));
  filterOffice?.addEventListener('change', debounce(applyFilters, 250));
};

// Inicializa modal de cita
const initAppointmentModal = () => {
  const modalClose = safeGetElement('modalApptClose');
  const modalCancel = safeGetElement('modalApptCancel');
  const modal = safeGetElement('modalAppointment');
  
  modalClose?.addEventListener('click', closeAppointmentModal);
  modalCancel?.addEventListener('click', closeAppointmentModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAppointmentModal();
  });
  
  // Soporte para teclado en modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) {
      e.preventDefault();
      closeAppointmentModal();
    }
  });
};

// Inicializa FAB de nueva cita
const initFAB = () => {
  const btnNew = safeGetElement('btnNewAppointment');
  btnNew?.addEventListener('click', () => {
    showToast('📅 Abriendo formulario de nueva cita');
    // En producción: abrir modal de creación
  });
};

// Inicializa descarga de agenda
const initDownload = () => {
  const btnDownload = safeGetElement('btnDownload');
  btnDownload?.addEventListener('click', () => {
    showToast('📥 Preparando descarga de agenda (PDF/Excel)');
    // En producción: trigger download
  });
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
  // Inicializar componentes de UI
  initSidebar();
  initWeekNav();
  initFilters();
  initAppointmentModal();
  initFAB();
  initDownload();
  
  // Cargar datos iniciales
  appointments = await fetchAgenda(currentWeekStart);
  
  // Renderizar calendario
  renderCalendar(currentWeekStart);
  
  // Limpieza al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);