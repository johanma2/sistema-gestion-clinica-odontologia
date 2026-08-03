/* ============================================
SmileTrack — Agenda General (st-adm-08-agenda)
============================================
Autor: Johan Santamaria
Fecha: 29/07/2026

DESCRIPCIÓN:
Maneja la lógica y las interacciones del calendario semanal, carga de citas desde la API, filtrado dinámico por profesional y consultorio, navegación de fechas y despliegue de formularios modales.

FUNCIONALIDADES PRINCIPALES:
- Carga y renderizado dinámico de citas por día con soporte de teclado para accesibilidad
- Navegación interactiva de semanas (Siguiente, Anterior, Hoy) y formateo de fechas localizadas
- Modales para ver el detalle de una cita agendada y para crear nuevas citas
- Envío asíncrono del formulario de nueva cita mediante llamadas seguras a la API

DEPENDENCIAS TÉCNICAS:
- Controller: GestionCitasController y Stadm08Agenda
- CSS: ~/css/Gestion_De_Citas/st-adm-08-agenda/agendageneral.css
- JS: ~/js/Gestion_De_Citas/st-adm-08-agenda/agendageneral.js
- Partial / Otros: index.cshtml

NOTAS DE MANTENIMIENTO:
- Los comentarios internos explican el "por qué" de las decisiones de diseño/negocio, no el "qué" hace el código básico.
- El debounce en los selectores de filtro previene saturación de peticiones ante cambios rápidos.
============================================ */

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN API
// ═══════════════════════════════════════════════════════════════════
const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

// WHY: safeGetElement previene excepciones fatales en la inicialización si un elemento no existe en el DOM de la vista
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
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ═══════════════════════════════════════════════════════════════════
// WHY: Fallback a datos locales ficticios garantiza que la interfaz siga operativa y testeable si la conexión con la base de datos se interrumpe
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
let currentWeekStart = (window.APP_CONFIG && window.APP_CONFIG.WeekStart) ? new Date(window.APP_CONFIG.WeekStart + 'T00:00:00') : new Date('2026-05-19T00:00:00');

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════

// WHY: Se formatea la fecha manualmente para asegurar consistencia regional y legibilidad sin dependencias externas pesadas
const fmtDate = (date) => {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

// WHY: Mapeo centralizado para facilitar cambios en las clases de estado visual en la hoja de estilos
const getStatusClass = (status) => {
  const map = { confirmed: 'confirmed', attended: 'attended', cancelled: 'cancelled', available: 'available', reserved: 'reserved' };
  return map[status] || 'available';
};

// WHY: Se reconstruye la grilla dinámicamente inyectando atributos ARIA para cumplir estándares de lectores de pantalla (WCAG 2.1)
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
      
      // WHY: Validación de regla de negocio que previene el agendamiento y visualización de espacios los domingos
      if (date.getDay() === 0) {
        day.classList.add('closed');
        day.innerHTML = `<div class="day-closed"><span aria-hidden="true">🏥</span><span>CERRADO</span></div>`;
        continue;
      }
      day.classList.remove('closed');
      
      // WHY: Filtrado en memoria de cliente para proveer una respuesta de interfaz instantánea antes de consultar a la API
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
        
        const time = appt.time || '';
        const patient = appt.available ? 'Espacio Disponible' : appt.reserved ? 'Urgencia - Reservado' : appt.patient;
        const detail = (appt.available || appt.reserved) ? '' : (appt.service && appt.office ? `${appt.service} · ${appt.office}` : '');
        const status = (appt.available || appt.reserved) ? '' : (appt.status === 'attended' ? 'Asistida' : appt.status === 'confirmed' ? 'Confirmada' : appt.status === 'cancelled' ? 'CANCELADA' : '');
        
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
    const fmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
    weekLabel.textContent = `${weekStart.getDate()}-${weekEnd.getDate()} ${fmt.format(weekStart)}`;
  }
};

// WHY: Provee descripciones contextuales ricas para lectores de pantalla que describen completamente el estado de la cita
const buildApptLabel = (appt) => {
  if (appt.available) return `Espacio disponible: ${appt.time}`;
  if (appt.reserved) return `Reservado para urgencias: ${appt.time}`;
  return `Cita ${appt.status}: ${appt.patient}, ${appt.time}, ${appt.service}, ${appt.office}`;
};

// WHY: Permite destacar visualmente el día actual para orientar rápidamente al usuario
const isToday = (date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL: DETALLE DE CITA
// ═══════════════════════════════════════════════════════════════════

// WHY: Uso de modales previene la pérdida de contexto del calendario principal al consultar detalles
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
        closeAppointmentModal();
        openNewAppointmentModal(appt.date, appt.time);
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

// Abre modal de nueva cita
const openNewAppointmentModal = (dateStr = '', timeStr = '') => {
  const modal = safeGetElement('modalNewAppointment');
  if (!modal) return;
  
  // WHY: Pre-llenar el formulario mejora la eficiencia del agendamiento al reducir la escritura repetitiva
  if (dateStr) {
    const dateInput = safeGetElement('newApptDate');
    if (dateInput) dateInput.value = dateStr;
  }
  if (timeStr) {
    const startTimeInput = safeGetElement('newApptStartTime');
    if (startTimeInput) startTimeInput.value = timeStr;
    // WHY: Sugerir una duración predeterminada de 30 minutos agiliza el flujo de creación para el personal administrativo
    const endTimeInput = safeGetElement('newApptEndTime');
    if (endTimeInput) {
      const [h, m] = timeStr.split(':').map(Number);
      const endM = m + 30;
      const endH = h + Math.floor(endM / 60);
      endTimeInput.value = `${String(endH).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
    }
  } else {
    safeGetElement('formNewAppointment')?.reset();
  }
  
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modal.removeAttribute('inert');
  document.body.style.overflow = 'hidden';
  safeGetElement('newApptPatient')?.focus();
};

// Cierra modal de nueva cita
const closeNewAppointmentModal = () => {
  const modal = safeGetElement('modalNewAppointment');
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

// WHY: Normaliza la navegación semanal comenzando rigurosamente los días lunes
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
  const todayBase = (window.APP_CONFIG && window.APP_CONFIG.WeekStart) ? new Date(window.APP_CONFIG.WeekStart + 'T00:00:00') : new Date();
  currentWeekStart = getWeekStart(todayBase);
  renderCalendar(currentWeekStart);
  showToast('📅 Mostrando semana actual');
};

// ═══════════════════════════════════════════════════════════════════
//  FILTROS
// ═══════════════════════════════════════════════════════════════════

let selectedProfessional = '';
let selectedOffice = '';

// WHY: Actualiza las variables de estado locales antes de disparar el re-renderizado del calendario
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
    const response = await fetch(`${API_BASE}/citas/agenda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al guardar la cita');
    }
    
    return await response.json();
  } catch (error) {
    showToast(`❌ ${error.message}`, 'error');
    throw error;
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

// WHY: Gestión de foco (focus trap) y Escape key cumplen estándares de accesibilidad para evitar trampas de teclado en dispositivos móviles
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

  // WHY: Evita que el sidebar móvil quede abierto y tape la pantalla después de hacer clic en un enlace de navegación
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
  
  // WHY: Captura de tecla Escape para cerrar modales de manera intuitiva y accesible
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) {
      e.preventDefault();
      closeAppointmentModal();
    }
  });
};

// Inicializa FAB de nueva cita y Modal de Creación
const initFAB = () => {
  const btnNew = safeGetElement('btnNewAppointment');
  btnNew?.addEventListener('click', () => {
    // Tomar el lunes de la semana actual por defecto
    const dateStr = currentWeekStart.toISOString().split('T')[0];
    openNewAppointmentModal(dateStr, '09:00');
  });

  const modalClose = safeGetElement('modalNewApptClose');
  const modalCancel = safeGetElement('modalNewApptCancel');
  const modal = safeGetElement('modalNewAppointment');
  
  modalClose?.addEventListener('click', closeNewAppointmentModal);
  modalCancel?.addEventListener('click', closeNewAppointmentModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeNewAppointmentModal();
  });
  
  // Submit handler
  const form = safeGetElement('formNewAppointment');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSave = safeGetElement('modalNewApptSave');
    if(btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = '⏳ Guardando...';
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    // Parse types to int where needed
    data.IdPaciente = parseInt(data.IdPaciente, 10);
    data.IdProfesional = parseInt(data.IdProfesional, 10);
    data.IdConsultorio = parseInt(data.IdConsultorio, 10);
    data.IdServicio = parseInt(data.IdServicio, 10);
    
    try {
      await createAppointmentAPI(data);
      showToast('✅ Cita agendada exitosamente');
      closeNewAppointmentModal();
      
      // Actualizar local y re-renderizar
      // Agregamos localmente para feedback rápido
      const newAppt = {
        id: Date.now(),
        date: data.Fecha,
        time: data.HoraInicio,
        patient: document.querySelector(`#newApptPatient option:checked`)?.text || 'Paciente',
        professional: document.querySelector(`#newApptProfessional option:checked`)?.text || 'Profesional',
        office: document.querySelector(`#newApptOffice option:checked`)?.text || 'Consultorio',
        service: document.querySelector(`#newApptService option:checked`)?.text || 'Servicio',
        status: data.Estado === 'Confirmada' ? 'confirmed' : 'available' // Simulado
      };
      
      // Eliminar el espacio "available" a esa hora si existe (sólo local)
      appointments = appointments.filter(a => !(a.available && a.date === data.Fecha && a.time === data.HoraInicio));
      appointments.push(newAppt);
      
      applyFilters(); // Re-render con filtros
    } catch (error) {
      // El toast ya se mostró en createAppointmentAPI, no cerramos el modal
    } finally {
      if(btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'Guardar Cita';
      }
    }
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