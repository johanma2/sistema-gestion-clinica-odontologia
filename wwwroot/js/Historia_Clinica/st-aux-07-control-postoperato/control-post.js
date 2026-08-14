/**
 * SMILETRACK — CONTROL POSTOPERATORIO (app.js)
 * Lógica con persistencia, accesibilidad y validaciones
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

// Gestiona persistencia del control postoperatorio con localStorage
const postopStorage = {
  key: 'smiletrack_postop_pedro_garcia_20260320',
  
  // Carga estado guardado o usa valores por defecto
  load: () => {
    const stored = localStorage.getItem(postopStorage.key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error al cargar control postoperatorio, usando valores por defecto');
      }
    }
    return {
      status: 'stable',
      instructions: [
        { text: 'No comer próximas 2h', checked: true },
        { text: 'Medicamento cada 8h', checked: true },
        { text: 'Evitar T° extremas', checked: false },
        { text: 'Control en 7 días', checked: false }
      ],
      observations: ''
    };
  },
  
  // Guarda estado en localStorage
  save: (state) => {
    try {
      localStorage.setItem(postopStorage.key, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Error al guardar control postoperatorio:', e);
      return false;
    }
  },
  
  // Actualiza estado del paciente
  updateStatus: (status) => {
    const state = postopStorage.load();
    state.status = status;
    postopStorage.save(state);
  },
  
  // Agrega nueva instrucción
  addInstruction: (text) => {
    const state = postopStorage.load();
    state.instructions.push({ text, checked: false });
    postopStorage.save(state);
  },
  
  // Actualiza estado de una instrucción específica
  updateInstruction: (index, checked) => {
    const state = postopStorage.load();
    if (state.instructions[index]) {
      state.instructions[index].checked = checked;
      postopStorage.save(state);
    }
  },
  
  // Actualiza observaciones
  updateObservations: (text) => {
    const state = postopStorage.load();
    state.observations = text;
    postopStorage.save(state);
  }
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

// Inicializa botones de estado con persistencia y accesibilidad
const initStatusButtons = () => {
  const buttons = document.querySelectorAll('.status-btn');
  
  // Carga estado guardado
  const savedStatus = postopStorage.load().status;
  
  buttons.forEach(btn => {
    // Aplica estado guardado
    const statusId = btn.id.replace('status', '').toLowerCase();
    const isActive = statusId === savedStatus;
    
    if (isActive) {
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
    }
    
    // Maneja click para cambio de estado
    btn.addEventListener('click', () => {
      // Remueve active de todos los botones
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      
      // Activa el botón clickeado
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      
      // Guarda en localStorage
      const newStatus = btn.id.replace('status', '').toLowerCase();
      postopStorage.updateStatus(newStatus);
      
      // Feedback visual
      showToast(`Estado actualizado: ${btn.querySelector('strong')?.textContent}`, 'info');
    });
    
    // Soporte para teclado en botones de estado
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
};

// Inicializa lista de instrucciones con persistencia y animaciones
const initInstructions = () => {
  const list = safeGetElement('instructionsList');
  const input = safeGetElement('newInstructionInput');
  const addBtn = safeGetElement('btnAddInstruction');
  
  if (!list || !input || !addBtn) return;
  
  // Carga instrucciones guardadas
  const savedInstructions = postopStorage.load().instructions;
  
  // Limpia lista actual y renderiza desde estado guardado
  list.innerHTML = '';
  savedInstructions.forEach((item, index) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');
    
    li.innerHTML = `
      <label class="custom-checkbox">
        <input type="checkbox" ${item.checked ? 'checked' : ''} aria-label="${item.text}${item.checked ? ' - completado' : ''}" />
        <span class="checkmark" aria-hidden="true"></span>
        <span class="text">${item.text}</span>
      </label>
    `;
    
    // Maneja cambio de checkbox
    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', () => {
      postopStorage.updateInstruction(index, checkbox.checked);
      checkbox.setAttribute('aria-label', `${item.text}${checkbox.checked ? ' - completado' : ''}`);
    });
    
    list.appendChild(li);
  });
  
  // Maneja agregar nueva instrucción
  const addInstruction = () => {
    const text = input.value.trim();
    if (!text) {
      showToast('Por favor escribe una instrucción', 'warning');
      input.focus();
      return;
    }
    
    // Agrega a localStorage
    postopStorage.addInstruction(text);
    
    // Crea nuevo elemento en la lista
    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');
    
    li.innerHTML = `
      <label class="custom-checkbox">
        <input type="checkbox" aria-label="${text}" />
        <span class="checkmark" aria-hidden="true"></span>
        <span class="text">${text}</span>
      </label>
    `;
    
    // Animación de entrada
    li.style.opacity = '0';
    li.style.transform = 'translateY(-8px)';
    li.style.transition = 'opacity .2s, transform .2s';
    
    list.appendChild(li);
    
    // Trigger reflow y animar
    requestAnimationFrame(() => {
      li.style.opacity = '1';
      li.style.transform = 'translateY(0)';
    });
    
    // Maneja cambio del nuevo checkbox
    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', () => {
      const newIndex = postopStorage.load().instructions.length - 1;
      postopStorage.updateInstruction(newIndex, checkbox.checked);
      checkbox.setAttribute('aria-label', `${text}${checkbox.checked ? ' - completado' : ''}`);
    });
    
    // Limpia input y enfoca
    input.value = '';
    input.focus();
    
    showToast('Instrucción agregada', 'success');
  };
  
  // Event listeners para agregar instrucción
  addBtn.addEventListener('click', addInstruction);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInstruction();
    }
  });
  
  // Auto-guarda de observaciones con debounce
  const obsTextarea = safeGetElement('obsTextarea');
  if (obsTextarea) {
    // Carga observaciones guardadas
    obsTextarea.value = postopStorage.load().observations;
    
    // Auto-guarda mientras el usuario escribe
    const debouncedSave = debounce(() => {
      postopStorage.updateObservations(obsTextarea.value);
    }, 500);
    
    obsTextarea.addEventListener('input', debouncedSave);
  }
};

// Inicializa botón de guardar registro
const initSaveButton = () => {
  const btnSave = safeGetElement('btnSaveRecord');
  if (!btnSave) return;
  
  btnSave.addEventListener('click', () => {
    // Recopila datos actuales
    const state = postopStorage.load();
    const record = {
      status: state.status,
      instructions: state.instructions.filter(i => i.checked).map(i => i.text),
      observations: state.observations,
      timestamp: new Date().toISOString()
    };
    
    // En producción: enviar a API
    console.log('Registro guardado:', record);
    
    // Feedback visual
    showToast('✅ Registro guardado exitosamente', 'success');
    
    const original = btnSave.innerHTML;
    btnSave.innerHTML = '✓ Guardado';
    btnSave.disabled = true;
    
    setTimeout(() => {
      btnSave.innerHTML = original;
      btnSave.disabled = false;
    }, 2000);
  });
};

// Función principal de inicialización
const init = () => {
  // Inicializar componentes de UI
  initMobileMenu();
  initStatusButtons();
  initInstructions();
  initSaveButton();
  
  // Limpieza de listeners al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);