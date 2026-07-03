// =============================================
// SMILETRACK — RECORDATORIOS (app.js)
// =============================================

// Obtiene elemento del DOM con manejo seguro de null
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

// Reduce llamadas a función en eventos frecuentes de input
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

// Muestra notificación temporal con auto-cierre y cleanup de timeout
const showToast = (message, type = 'success') => {
  const toastContainer = safeGetElement('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  toast.setAttribute('role', 'alert');

  const icon = type === 'error' ? '⚠️' : type === 'warning' ? 'ℹ️' : '✅';
  const title = type === 'error' ? 'Error' : type === 'warning' ? 'Atención' : 'Éxito';

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <div class="toast-content">
      <p class="toast-title">${title}</p>
      <p class="toast-desc">${message}</p>
    </div>
    <button class="toast-close" aria-label="Cerrar notificación">×</button>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    });
  }

  const autoCloseTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 4500);
  
  toast._autoCloseTimeout = autoCloseTimeout;
};

// Actualiza contadores de estadísticas con animación suave
const updateStats = (sent, pending) => {
  const sentEl = safeGetElement('statsSentCount');
  const pendingEl = safeGetElement('statsPendingCount');
  
  if (sentEl) sentEl.textContent = sent;
  if (pendingEl) pendingEl.textContent = pending;
};

// Obtiene lista de pacientes seleccionados para envío
const getSelectedPatients = () => {
  const container = safeGetElement('patientListContainer');
  if (!container) return [];
  
  return Array.from(container.querySelectorAll('.patient-row'))
    .filter(row => {
      const checkbox = row.querySelector('.custom-checkbox');
      return checkbox?.checked;
    })
    .map(row => ({
      id: row.dataset.id,
      name: row.querySelector('.patient-name')?.textContent || ''
    }));
};

// Envía recordatorios a pacientes seleccionados
const sendReminders = (patients) => {
  if (patients.length === 0) {
    showToast('Selecciona al menos un paciente para enviar', 'warning');
    return;
  }

  // Simula envío de recordatorios
  setTimeout(() => {
    const names = patients.map(p => p.name).join(', ');
    showToast(`Recordatorios enviados a: ${names}`, 'success');
    
    // Actualiza estadísticas
    const currentSent = parseInt(safeGetElement('statsSentCount')?.textContent || '0');
    const currentPending = parseInt(safeGetElement('statsPendingCount')?.textContent || '0');
    updateStats(currentSent + patients.length, Math.max(0, currentPending - patients.length));
    
    // Marca filas como enviadas
    patients.forEach(p => {
      const row = safeGetElement('patientListContainer')?.querySelector(`[data-id="${p.id}"]`);
      if (row) {
        row.classList.add('dimmed');
        row.querySelector('.custom-checkbox')?.setAttribute('disabled', 'true');
      }
    });
  }, 800);
};

// Maneja cambio de estado en checkboxes de pacientes
const handleCheckboxChange = (checkbox) => {
  const row = checkbox.closest('.patient-row');
  if (!row) return;
  
  if (checkbox.checked) {
    row.classList.add('selected');
  } else {
    row.classList.remove('selected');
  }
};

// Inicializa eventos de checkboxes en lista de pacientes
const initPatientCheckboxes = () => {
  const container = safeGetElement('patientListContainer');
  if (!container) return;

  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('custom-checkbox')) {
      handleCheckboxChange(e.target);
    }
  });

  // Soporte para teclado en filas de paciente
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const row = e.target.closest('.patient-row');
      if (row) {
        e.preventDefault();
        const checkbox = row.querySelector('.custom-checkbox');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          handleCheckboxChange(checkbox);
        }
      }
    }
  });
};

// Inicializa botón de enviar seleccionados
const initSendSelected = () => {
  const btn = safeGetElement('btnSendSelected');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const selected = getSelectedPatients();
    sendReminders(selected);
  });
};

// Inicializa botón móvil de enviar a todos
const initSendAllMobile = () => {
  const btn = safeGetElement('btnSendAllMobile');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Selecciona todos los pacientes programados para mañana
    const container = safeGetElement('patientListContainer');
    if (!container) return;
    
    container.querySelectorAll('.patient-row:not(.dimmed)').forEach(row => {
      const checkbox = row.querySelector('.custom-checkbox');
      if (checkbox && !checkbox.disabled) {
        checkbox.checked = true;
        row.classList.add('selected');
      }
    });
    
    const selected = getSelectedPatients();
    sendReminders(selected);
  });
};

// Inicializa botones de alertas laterales
const initAlertButtons = () => {
  const btnUnconfirmed = safeGetElement('btnAlertUnconfirmed');
  const btnOverdue = safeGetElement('btnAlertOverdue');

  if (btnUnconfirmed) {
    btnUnconfirmed.addEventListener('click', () => {
      showToast('Notificaciones de confirmación enviadas a 3 pacientes', 'success');
      btnUnconfirmed.disabled = true;
      btnUnconfirmed.closest('.alert-item-card')?.classList.add('dimmed');
    });
  }

  if (btnOverdue) {
    btnOverdue.addEventListener('click', () => {
      showToast('Recordatorios de pago enviados a 2 pacientes', 'success');
      btnOverdue.disabled = true;
      btnOverdue.closest('.alert-item-card')?.classList.add('dimmed');
    });
  }
};

// Inicializa menú móvil con gestión de foco y atributos ARIA
const initMobileMenu = () => {
  const ham = safeGetElement('hamburger');
  const sb = safeGetElement('sidebar');
  const ov = safeGetElement('overlay');

  if (!ham || !sb || !ov) return;

  const toggleMenu = (show) => {
    if (show) {
      sb.classList.add('open');
      ov.classList.add('open');
      ham.setAttribute('aria-expanded', 'true');
      ov.setAttribute('aria-hidden', 'false');
      sb.dataset.previousFocus = document.activeElement?.id || '';
      const firstLink = sb.querySelector('.nav-item');
      if (firstLink) firstLink.focus();
    } else {
      sb.classList.remove('open');
      ov.classList.remove('open');
      ham.setAttribute('aria-expanded', 'false');
      ov.setAttribute('aria-hidden', 'true');
      const prevFocus = sb.dataset.previousFocus;
      if (prevFocus) safeGetElement(prevFocus)?.focus();
      else ham.focus();
    }
  };

  ham.addEventListener('click', () => toggleMenu(true));
  ov.addEventListener('click', () => toggleMenu(false));

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 680) toggleMenu(false);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sb.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });
};

// Función principal de inicialización
const init = () => {
  initMobileMenu();
  initPatientCheckboxes();
  initSendSelected();
  initSendAllMobile();
  initAlertButtons();

  // Limpieza de listeners al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

document.addEventListener('DOMContentLoaded', init);