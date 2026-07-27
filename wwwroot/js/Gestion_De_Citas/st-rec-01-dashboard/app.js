// =============================================
// SMILETRACK — DASHBOARD RECEPCIÓN (app.js)
// [MEJORA]: Código refactorizado con patrones reutilizables de SmileTrack
// =============================================

/**
 * [MEJORA]: Utilidad reutilizable para obtener elementos con null check seguro
 * Consistente con st-pac-XX - evita errores si el elemento no existe
 * @param {string} id - ID del elemento a buscar
 * @returns {HTMLElement|null} Elemento o null si no existe
 */
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  }
  return el;
};

/**
 * [MEJORA]: Función debounce reutilizable para optimizar eventos de input
 * Consistente con módulos anteriores - reduce renders innecesarios al tipear
 * @param {Function} fn - Función a ejecutar
 * @param {number} delay - Tiempo de espera en ms
 * @returns {Function} Función debounceada
 */
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * [MEJORA]: Toast con cleanup de timeout para evitar solapamientos
 * Consistente con módulos anteriores - mejora robustez en notificaciones rápidas
 * @param {string} msg - Mensaje a mostrar
 */
const showToast = (msg) => {
  const t = safeGetElement('toast');
  if (!t) return;
  
  t.textContent = msg;
  t.classList.add('show');
  
  // [MEJORA]: Limpiar timeout anterior si existe
  if (t._timeoutId) clearTimeout(t._timeoutId);
  t._timeoutId = setTimeout(() => t.classList.remove('show'), 3000);
};

// ═══ DATOS DE CITAS ═══
const appointments = [
  {
    time: '08:00',
    patient: 'María López',
    doctor: 'Dr. Méndez',
    service: 'Consulta',
    status: 'Atendida',
    statusClass: 'status-atendida',
    highlight: false,
    actions: ['eye']
  },
  {
    time: '10:00',
    patient: 'Pedro García',
    doctor: 'Dr. Méndez',
    service: 'Control',
    status: 'En consulta',
    statusClass: 'status-consulta',
    highlight: true,
    actions: ['pencil']
  },
  {
    time: '11:30',
    patient: 'Ana Ruiz',
    doctor: 'Dra. Gómez',
    service: 'Resina',
    status: 'Pendiente',
    statusClass: 'status-pendiente',
    highlight: false,
    actions: ['pencil', 'file-invoice']
  },
  {
    time: '14:00',
    patient: 'Luis Herrera',
    doctor: 'Dr. Torres',
    service: 'Consulta',
    status: 'Atendida',
    statusClass: 'status-atendida',
    highlight: false,
    actions: ['eye']
  }
];

// ═══ UTILIDADES DE RENDERIZADO ═══

/**
 * Mapeo de iconos para acciones de tabla
 * @param {string} action - Tipo de acción
 * @returns {Object} Objeto con icono, título y clase danger
 */
const getActionMeta = (action) => {
  const map = {
    'pencil': { icon: '✏️', title: 'Editar', danger: true },
    'file-invoice': { icon: '🧾', title: 'Facturar', danger: true },
    'eye': { icon: '👁️', title: 'Ver', danger: false }
  };
  return map[action] || { icon: '👁️', title: 'Ver', danger: false };
};

/**
 * Crea el elemento de fila para una cita individual
 * @param {Object} appt - Datos de la cita
 * @returns {HTMLTableRowElement} Elemento tr con la cita
 */
const createAppointmentRow = (appt) => {
  const tr = document.createElement('tr');
  if (appt.highlight) tr.classList.add('row-highlight');
  
  // [MEJORA]: Atributos ARIA para accesibilidad de fila interactiva
  tr.setAttribute('role', 'row');
  
  tr.innerHTML = `
    <td class="col-hora">${appt.time}</td>
    <td class="col-paciente">${appt.patient}</td>
    <td class="col-profesional">${appt.doctor}</td>
    <td class="col-servicio">${appt.service}</td>
    <td><span class="status-badge ${appt.statusClass}" role="status" aria-label="Estado: ${appt.status}">${appt.status}</span></td>
    <td>
      <div class="actions-cell" role="group" aria-label="Acciones para ${appt.patient}">
        ${appt.actions.map(action => {
          const meta = getActionMeta(action);
          return `<button class="action-icon${meta.danger ? ' danger' : ''}" 
            title="${meta.title}" 
            data-action="${action}"
            aria-label="${meta.title} cita de ${appt.patient}">${meta.icon}</button>`;
        }).join('')}
      </div>
    </td>
  `;
  
  return tr;
};

/**
 * Renderiza la tabla de citas con los datos actuales
 * [MEJORA]: Separación de lógica de creación de elementos para mejor mantenibilidad
 */
const renderAppointments = () => {
  const tbody = safeGetElement('appointmentsTable');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (appointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:20px;">
          <div class="empty-state" role="status">
            <span class="empty-icon" aria-hidden="true">📅</span>
            <p>No hay citas programadas.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  // [MEJORA]: Usar DocumentFragment para mejor performance en inserciones múltiples
  const fragment = document.createDocumentFragment();
  appointments.forEach(appt => {
    const row = createAppointmentRow(appt);
    fragment.appendChild(row);
  });
  tbody.appendChild(fragment);
};

// ═══ MANEJADORES DE EVENTOS ═══

/**
 * [MEJORA]: Event delegation para manejar acciones en tabla dinámica
 * Evita attach de listeners individuales por fila (mejor performance)
 * @param {Event} e - Evento de click
 */
const handleTableAction = (e) => {
  const btn = e.target.closest('.action-icon');
  if (!btn) return;
  
  const action = btn.dataset.action;
  const row = btn.closest('tr');
  const patientName = row?.querySelector('.col-paciente')?.textContent || 'el paciente';
  
  // [MEJORA]: Feedback visual inmediato para acciones
  if (action === 'pencil') {
    showToast(`Editando cita de ${patientName}…`);
  } else if (action === 'file-invoice') {
    showToast(`Generando factura para ${patientName}…`);
  } else if (action === 'eye') {
    showToast(`Viendo detalles de ${patientName}`);
  }
};

/**
 * Maneja el toggle del menú móvil con gestión de accesibilidad
 * Consistente con módulos anteriores
 */
const initMobileMenu = () => {
  const ham = safeGetElement('hamburger');
  const sb = safeGetElement('sidebar');
  const ov = safeGetElement('overlay');
  
  if (!ham || !sb || !ov) return;
  
  // [MEJORA]: Sincronizar aria-expanded con estado visual
  const toggleMenu = () => {
    const isOpen = sb.classList.toggle('open');
    ov.classList.toggle('open');
    ham.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    ov.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    
    // [MEJORA]: Manejo de foco para accesibilidad
    if (isOpen) {
      sb.dataset.previousFocus = document.activeElement?.id || '';
      const firstLink = sb.querySelector('.nav-item');
      if (firstLink) firstLink.focus();
    } else {
      const prevFocus = sb.dataset.previousFocus;
      if (prevFocus) safeGetElement(prevFocus)?.focus();
    }
  };
  
  ham.addEventListener('click', toggleMenu);
  ov.addEventListener('click', () => {
    sb.classList.remove('open');
    ov.classList.remove('open');
    ham.setAttribute('aria-expanded', 'false');
    ov.setAttribute('aria-hidden', 'true');
    ham.focus();
  });
  
  // [MEJORA]: Cerrar menú al navegar (móvil)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 680) {
        sb.classList.remove('open');
        ov.classList.remove('open');
        ham.setAttribute('aria-expanded', 'false');
        ov.setAttribute('aria-hidden', 'true');
        ham.focus();
      }
    });
  });
  
  // [MEJORA]: Escape cierra menú con restauración de foco
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sb.classList.contains('open')) {
      e.preventDefault();
      sb.classList.remove('open');
      ov.classList.remove('open');
      ham.setAttribute('aria-expanded', 'false');
      ov.setAttribute('aria-hidden', 'true');
      ham.focus();
    }
  });
};

/**
 * Inicializa botones de acción principal
 */
const initActionButtons = () => {
  const btnNuevo = safeGetElement('btnNuevoPaciente');
  const btnFactura = safeGetElement('btnGenerarFactura');
  
  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => {
      showToast('Redirigiendo a registro de paciente…');
      // [MEJORA]: Aquí iría la navegación real
    });
  }
  
  if (btnFactura) {
    btnFactura.addEventListener('click', () => {
      showToast('Abriendo generador de facturas…');
      // [MEJORA]: Aquí iría la navegación real
    });
  }
};

/**
 * Inicializa botones de notificación de alertas
 * [MEJORA]: Validación de estado para evitar múltiples clicks
 */
const initAlertButtons = () => {
  document.querySelectorAll('.btn-notify').forEach(btn => {
    btn.addEventListener('click', () => {
      // [MEJORA]: Prevenir ejecución si ya está deshabilitado
      if (btn.disabled) return;
      
      const alertType = btn.dataset.alert;
      const msg = alertType === 'sin-confirmar' 
        ? 'Notificaciones de confirmación enviadas' 
        : 'Recordatorio de pago enviado';
      
      showToast(msg);
      
      // [MEJORA]: Deshabilitar botón con feedback visual
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    });
  });
};

// ═══ INIT PRINCIPAL ═══

/**
 * Función principal de inicialización del dashboard
 */
const init = () => {
  try {
    // Inicializar componentes de UI
    initMobileMenu();
    
    // Renderizado inicial de datos
    renderAppointments();
    
    // Inicializar interacciones
    initActionButtons();
    initAlertButtons();
    
    // [MEJORA]: Event delegation para tabla de citas (performance)
    const tableBody = safeGetElement('appointmentsTable');
    if (tableBody) {
      tableBody.addEventListener('click', handleTableAction);
      // [MEJORA]: Soporte para activación con teclado (Enter/Space)
      tableBody.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target.closest('.action-icon');
          if (target) {
            e.preventDefault();
            target.click();
          }
        }
      });
    }
    
    // [MEJORA]: Limpieza de listeners al unload (buena práctica para SPAs)
    window.addEventListener('beforeunload', () => {
      // En una SPA real, aquí se removerían listeners para evitar memory leaks
    });
  } catch (e) {
    console.error('[SmileTrack] Error inicializando modulo', e);
    mostrarErrorUsuario(e.message || 'Error cargando módulo. Intente recargar.');
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

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);