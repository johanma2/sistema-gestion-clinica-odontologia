/**
 * SMILETRACK — ESTADO DEL CONSULTORIO (app.js)
 * Lógica con persistencia, checklist accesible y validaciones
 */

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
  const toast = safeGetElement('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;

  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// Gestiona persistencia del estado del consultorio con localStorage
const consultorioStorage = {
  key: 'smiletrack_consultorio_1_20260320',
  
  // Carga estado guardado o usa valores por defecto
  load: () => {
    const stored = localStorage.getItem(consultorioStorage.key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error al cargar estado del consultorio, usando valores por defecto');
      }
    }
    return {
      checklist: [
        { text: 'Limpieza y desinfección de superficies', checked: true },
        { text: 'Instrumental esterilizado y empaquetado', checked: true },
        { text: 'Residuos biológicos eliminados', checked: true },
        { text: 'Guantes y tapabocas reabastecidos', checked: false },
        { text: 'Historia clínica lista para próximo', checked: false },
        { text: 'Equipos verificados y encendidos', checked: false },
        { text: 'Consultorio ventilado', checked: false }
      ],
      status: 'disponible',
      observations: '',
      history: [
        { time: '2026-03-20T11:00', user: 'Sara Jiménez', detail: 'Limpieza completada' },
        { time: '2026-03-20T09:30', user: 'Sara Jiménez', detail: 'Preparación iniciada' },
        { time: '2026-03-19T17:00', user: 'Carlos Pérez', detail: 'Fin de jornada' }
      ]
    };
  },
  
  // Guarda estado en localStorage
  save: (state) => {
    try {
      localStorage.setItem(consultorioStorage.key, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Error al guardar estado del consultorio:', e);
      return false;
    }
  },
  
  // Actualiza estado de un ítem del checklist
  updateChecklistItem: (index, checked) => {
    const state = consultorioStorage.load();
    if (state.checklist[index]) {
      state.checklist[index].checked = checked;
      consultorioStorage.save(state);
    }
  },
  
  // Agrega nuevo ítem al checklist
  addChecklistItem: (text) => {
    const state = consultorioStorage.load();
    state.checklist.push({ text, checked: false });
    consultorioStorage.save(state);
  },
  
  // Actualiza estado del consultorio
  updateStatus: (status) => {
    const state = consultorioStorage.load();
    state.status = status;
    consultorioStorage.save(state);
  },
  
  // Actualiza observaciones
  updateObservations: (text) => {
    const state = consultorioStorage.load();
    state.observations = text;
    consultorioStorage.save(state);
  },
  
  // Agrega entrada al historial
  addToHistory: (user, detail) => {
    const state = consultorioStorage.load();
    state.history.unshift({
      time: new Date().toISOString(),
      user,
      detail
    });
    // Limita historial a últimos 10 entries
    if (state.history.length > 10) state.history.pop();
    consultorioStorage.save(state);
  }
};

// Calcula progreso del checklist
const calculateProgress = () => {
  const state = consultorioStorage.load();
  const total = state.checklist.length;
  const checked = state.checklist.filter(i => i.checked).length;
  return {
    checked,
    total,
    percentage: total > 0 ? Math.round((checked / total) * 100) : 0
  };
};

// Inicializa menú móvil con gestión de foco y atributos ARIA
const initMobileMenu = () => {
  const sidebar = safeGetElement('sidebar');
  const overlay = safeGetElement('overlay');
  const hamburger = safeGetElement('hamburger');

  if (!sidebar || !overlay || !hamburger) return;

  const toggleMenu = (show) => {
    if (show) {
      sidebar.classList.add('open');
      overlay.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      overlay.setAttribute('aria-hidden', 'false');
      
      const firstLink = sidebar.querySelector('.nav-item');
      if (firstLink) firstLink.focus();
    } else {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('aria-hidden', 'true');
      hamburger.focus();
    }
  };

  hamburger.addEventListener('click', () => toggleMenu(true));
  overlay.addEventListener('click', () => toggleMenu(false));

  sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
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

// Inicializa checklist con persistencia y actualización de progreso
const initChecklist = () => {
  const checklist = safeGetElement('checklistItems');
  const progressBar = safeGetElement('progressBar');
  const progressInfo = safeGetElement('progressInfo');
  const progressText = safeGetElement('progressText');
  
  if (!checklist) return;
  
  // Carga estado guardado
  const state = consultorioStorage.load();
  
  // Limpia lista actual y renderiza desde estado guardado
  checklist.innerHTML = '';
  state.checklist.forEach((item, index) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');
    
    li.innerHTML = `
      <label class="check-item">
        <input type="checkbox" ${item.checked ? 'checked' : ''} aria-label="${item.text}${item.checked ? ' - completado' : ''}" />
        <span class="checkmark" aria-hidden="true"></span>
        <span class="text">${item.text}</span>
      </label>
    `;
    
    // Maneja cambio de checkbox
    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', () => {
      consultorioStorage.updateChecklistItem(index, checkbox.checked);
      checkbox.setAttribute('aria-label', `${item.text}${checkbox.checked ? ' - completado' : ''}`);
      updateProgressUI();
    });
    
    checklist.appendChild(li);
  });
  
  // Actualiza UI de progreso inicial
  updateProgressUI();
  
  // Función para actualizar UI de progreso
  function updateProgressUI() {
    const progress = calculateProgress();
    
    if (progressBar) {
      progressBar.style.width = `${progress.percentage}%`;
      progressBar.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', progress.percentage);
      progressBar.closest('[role="progressbar"]')?.setAttribute('aria-valuetext', `${progress.percentage}% completado`);
    }
    
    if (progressInfo) {
      progressInfo.textContent = `${progress.checked}/${progress.total} - ${progress.percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${progress.checked} de ${progress.total} ítems completados`;
    }
  }
};

// Inicializa botón para agregar nuevo ítem al checklist
const initAddItem = () => {
  const input = safeGetElement('newItemInput');
  const btn = safeGetElement('btnAddItem');
  const checklist = safeGetElement('checklistItems');
  
  if (!input || !btn || !checklist) return;
  
  const addItem = () => {
    const text = input.value.trim();
    if (!text) {
      showToast('Por favor escribe un ítem', 'warning');
      input.focus();
      return;
    }
    
    // Agrega a localStorage
    consultorioStorage.addChecklistItem(text);
    
    // Crea nuevo elemento en la lista
    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');
    
    li.innerHTML = `
      <label class="check-item">
        <input type="checkbox" aria-label="${text}" />
        <span class="checkmark" aria-hidden="true"></span>
        <span class="text">${text}</span>
      </label>
    `;
    
    // Maneja cambio del nuevo checkbox
    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', () => {
      const newIndex = consultorioStorage.load().checklist.length - 1;
      consultorioStorage.updateChecklistItem(newIndex, checkbox.checked);
      checkbox.setAttribute('aria-label', `${text}${checkbox.checked ? ' - completado' : ''}`);
      updateProgressUI();
    });
    
    // Animación de entrada
    li.style.opacity = '0';
    li.style.transform = 'translateY(-8px)';
    li.style.transition = 'opacity .2s, transform .2s';
    
    checklist.appendChild(li);
    
    // Trigger reflow y animar
    requestAnimationFrame(() => {
      li.style.opacity = '1';
      li.style.transform = 'translateY(0)';
    });
    
    // Limpia input y enfoca
    input.value = '';
    input.focus();
    
    // Actualiza progreso
    updateProgressUI();
    
    showToast('Ítem agregado', 'success');
  };
  
  // Event listeners para agregar ítem
  btn.addEventListener('click', addItem);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  });
  
  // Expone addItem globalmente para compatibilidad con onclick del HTML original
  window.addItem = addItem;
};

// Inicializa selector de estado del consultorio con persistencia
const initStatusSelector = () => {
  const options = document.querySelectorAll('.status-option');
  
  // Carga estado guardado
  const savedStatus = consultorioStorage.load().status;
  
  options.forEach(option => {
    // Aplica estado guardado
    const value = option.dataset.value;
    const isActive = value === savedStatus;
    
    if (isActive) {
      option.classList.add('selected');
      option.setAttribute('aria-checked', 'true');
      option.setAttribute('tabindex', '0');
    } else {
      option.classList.remove('selected');
      option.setAttribute('aria-checked', 'false');
      option.setAttribute('tabindex', '-1');
    }
    
    // Maneja click para cambio de estado
    option.addEventListener('click', () => {
      // Remueve selected de todas las opciones
      options.forEach(opt => {
        opt.classList.remove('selected');
        opt.setAttribute('aria-checked', 'false');
        opt.setAttribute('tabindex', '-1');
      });
      
      // Activa la opción clickeada
      option.classList.add('selected');
      option.setAttribute('aria-checked', 'true');
      option.setAttribute('tabindex', '0');
      
      // Guarda en localStorage
      consultorioStorage.updateStatus(value);
      
      // Feedback visual
      showToast(`Estado actualizado: ${option.querySelector('strong')?.textContent}`, 'info');
    });
    
    // Soporte para teclado en opciones de estado
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        option.click();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = Array.from(options).indexOf(option);
        const nextIndex = e.key === 'ArrowDown' 
          ? (currentIndex + 1) % options.length 
          : (currentIndex - 1 + options.length) % options.length;
        options[nextIndex]?.focus();
      }
    });
  });
  
  // Expone selectStatus globalmente para compatibilidad con onclick del HTML original
  window.selectStatus = (element) => {
    // Remueve selected de todas las opciones
    options.forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-checked', 'false');
    });
    
    // Activa la opción clickeada
    element.classList.add('selected');
    element.setAttribute('aria-checked', 'true');
    
    // Guarda en localStorage
    const value = element.dataset.value;
    if (value) consultorioStorage.updateStatus(value);
  };
};

// Inicializa observaciones con auto-guardado
const initObservations = () => {
  const textarea = safeGetElement('obsTextarea');
  if (!textarea) return;
  
  // Carga observaciones guardadas
  const saved = consultorioStorage.load().observations;
  if (saved) textarea.value = saved;
  
  // Auto-guarda mientras el usuario escribe (con debounce)
  const debouncedSave = debounce(() => {
    consultorioStorage.updateObservations(textarea.value);
  }, 500);
  
  textarea.addEventListener('input', debouncedSave);
};

// Inicializa botones de confirmación
const initConfirmButtons = () => {
  const btnPreparation = safeGetElement('btnConfirmPreparation');
  const btnStatus = safeGetElement('btnConfirmStatus');
  
  // Confirmar preparación completa
  if (btnPreparation) {
    btnPreparation.addEventListener('click', () => {
      const progress = calculateProgress();
      
      if (progress.checked < progress.total) {
        showToast(`Completa ${progress.total - progress.checked} ítem(s) pendiente(s)`, 'warning');
        return;
      }
      
      // Agrega entrada al historial
      consultorioStorage.addToHistory('Auxiliar', 'Preparación del consultorio confirmada');
      
      // Feedback visual
      showToast('✅ Preparación del consultorio confirmada', 'success');
      
      // Deshabilita botón temporalmente
      btnPreparation.disabled = true;
      btnPreparation.textContent = '✓ Confirmado';
      
      setTimeout(() => {
        btnPreparation.disabled = false;
        btnPreparation.textContent = 'Confirmar preparación completa';
      }, 3000);
    });
  }
  
  // Confirmar estado actual
  if (btnStatus) {
    btnStatus.addEventListener('click', () => {
      const selectedOption = document.querySelector('.status-option.selected');
      const status = selectedOption?.querySelector('strong')?.textContent || 'Desconocido';
      
      // Agrega entrada al historial
      consultorioStorage.addToHistory('Auxiliar', `Estado actualizado a: ${status}`);
      
      // Feedback visual
      showToast(`✅ Estado actualizado: ${status}`, 'success');
      
      // Deshabilita botón temporalmente
      btnStatus.disabled = true;
      btnStatus.textContent = '✓ Confirmado';
      
      setTimeout(() => {
        btnStatus.disabled = false;
        btnStatus.textContent = 'Confirmar estado';
      }, 3000);
    });
  }
  
  // Expone funciones globalmente para compatibilidad con onclick del HTML original
  window.confirmPreparation = () => btnPreparation?.click();
  window.confirmStatus = () => btnStatus?.click();
};

// Inicializa renderizado del historial
const initHistoryList = () => {
  const list = safeGetElement('history-list');
  if (!list) return;
  
  const state = consultorioStorage.load();
  
  // Formatea fecha para mostrar
  const formatDate = (iso) => {
    const d = new Date(iso);
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  
  // Renderiza historial
  list.innerHTML = state.history.map(entry => `
    <li role="listitem">
      <p class="history-time"><time datetime="${entry.time}">${formatDate(entry.time)}</time></p>
      <p class="history-detail">${entry.user} · ${entry.detail}</p>
    </li>
  `).join('');
};

// Función principal de inicialización
const init = () => {
    // Inicializar componentes de UI
    initMobileMenu();
    initChecklist();
    initAddItem();
    initStatusSelector();
    initObservations();
    initConfirmButtons();
    initHistoryList();
    
    // Limpieza de listeners al unload para evitar memory leaks
    window.addEventListener('beforeunload', () => {
      // Remover listeners en implementación SPA real
    });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);