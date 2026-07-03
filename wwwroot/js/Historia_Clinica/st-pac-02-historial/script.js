// =============================================
// SMILETRACK — MI HISTORIAL CLÍNICO (historial.js)
// Lógica de filtrado, renderizado de registros, modales y odontograma del historial
// =============================================

/**
 * Obtiene un elemento del DOM por su ID, logueando un aviso si no existe
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
 * Retrasa la ejecución de una función para optimizar eventos frecuentes como inputs
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
 * Cierra un modal genérico, actualizando sus atributos de accesibilidad
 * @param {string} modalId - ID del modal a cerrar
 */
const closeModalGeneric = (modalId) => {
  const modal = safeGetElement(modalId);
  if (!modal) return;
  
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('inert', '');
  
  // Restaurar foco al elemento que abrió el modal (si existe)
  const opener = modal.dataset.opener;
  if (opener) {
    const openerEl = safeGetElement(opener);
    if (openerEl) openerEl.focus();
  }
};

/**
 * Muestra un mensaje temporal tipo toast y lo oculta automáticamente
 * @param {string} msg - Mensaje a mostrar
 */
const showToast = (msg) => {
  const t = safeGetElement('toast');
  if (!t) return;
  
  t.textContent = msg;
  t.classList.add('show');
  
  // Limpiar timeout anterior si existe
  if (t._timeoutId) clearTimeout(t._timeoutId);
  t._timeoutId = setTimeout(() => t.classList.remove('show'), 3000);
};

// —— DATOS DE EJEMPLO ——
const SAMPLE_REGISTROS = [
  { id:1, fecha:'10 Feb 2026', tipo:'limpieza', titulo:'Limpieza Dental Completa', doctor:'Dra. Laura Gómez', estado:'Completada' },
  { id:2, fecha:'05 Ene 2026', tipo:'tratamiento', titulo:'Obturación Resina — Pieza 12', doctor:'Dr. Carlos Méndez', estado:'Completada' },
  { id:3, fecha:'15 Dic 2025', tipo:'radiografia', titulo:'Radiografía Panorámica', doctor:'Dr. Andrés Torres', estado:'Completada' },
  { id:4, fecha:'20 Nov 2025', tipo:'consulta', titulo:'Consulta de Urgencia', doctor:'Dra. Laura Gómez', estado:'Completada' },
  { id:5, fecha:'10 Oct 2025', tipo:'limpieza', titulo:'Profilaxis y Fluorización', doctor:'Dr. Carlos Méndez', estado:'Completada' },
];

let registros = [...SAMPLE_REGISTROS];

// Mapa de metadatos visuales (icono y clase CSS) según el tipo de registro clínico
const TIPO_META = {
  limpieza: { icon: '🧼', colorClass: 'limpieza' },
  tratamiento: { icon: '🦷', colorClass: 'tratamiento' },
  radiografia: { icon: '🖼️', colorClass: 'radiografia' },
  consulta: { icon: '🩺', colorClass: 'consulta' },
};

// Devuelve los metadatos visuales del tipo de registro; si el tipo no existe, usa un icono genérico
const tipoMeta = (tipo) => TIPO_META[tipo] || { icon: '📄', colorClass: '' };

// Devuelve la clase CSS del badge según el estado del registro
const badgeClass = (estado) => {
  const map = { 
    'Agendada':'badge-agendada', 
    'Confirmada':'badge-confirmada', 
    'Completada':'badge-completada', 
    'Cancelada':'badge-cancelada' 
  };
  return map[estado] || 'badge-completada';
};

// Filtra los registros combinando búsqueda por texto libre y selección de tipo
const getFiltered = () => {
  const searchInput = safeGetElement('searchInput');
  const filterTipo = safeGetElement('filterTipo');
  
  if (!searchInput || !filterTipo) return registros;
  
  const q = searchInput.value.toLowerCase().trim();
  const tp = filterTipo.value;
  
  return registros.filter(r => {
    const matchQ = !q || (
      r.titulo.toLowerCase().includes(q) || 
      r.doctor.toLowerCase().includes(q) || 
      r.fecha.toLowerCase().includes(q) || 
      r.tipo.toLowerCase().includes(q)
    );
    const matchTp = !tp || r.tipo === tp;
    return matchQ && matchTp;
  });
};

// Recalcula y actualiza los contadores de las tarjetas de estadísticas del historial
const updateStats = () => {
  const total = registros.length;
  const atendidas = registros.filter(r => r.estado === 'Completada').length;
  const pendientes = registros.filter(r => r.estado === 'Agendada').length;
  
  const elTotal = safeGetElement('cnt-total');
  const elAtendidas = safeGetElement('cnt-atendidas');
  const elPendientes = safeGetElement('cnt-pendientes');
  const elAlertas = safeGetElement('cnt-alertas');
  
  if (elTotal) elTotal.textContent = total;
  if (elAtendidas) elAtendidas.textContent = atendidas;
  if (elPendientes) elPendientes.textContent = pendientes;
  if (elAlertas) elAlertas.textContent = 1;
};

// Anima el número de un elemento desde 0 hasta el valor objetivo usando requestAnimationFrame
const animateCounter = (el, target) => {
  if (!el) return;
  
  let cur = 0;
  const duration = 900;
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    cur = Math.floor(eased * target);
    
    el.textContent = cur;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      el.textContent = target;
    }
  };
  
  requestAnimationFrame(animate);
};

// Ejecuta la animación en todos los contadores de estadísticas
const animateCounters = () => {
  animateCounter(safeGetElement('cnt-total'), registros.length);
  animateCounter(safeGetElement('cnt-atendidas'), registros.filter(r => r.estado === 'Completada').length);
  animateCounter(safeGetElement('cnt-pendientes'), registros.filter(r => r.estado === 'Agendada').length);
  animateCounter(safeGetElement('cnt-alertas'), 1);
};

// Crea el elemento DOM para representar un registro en la lista
const createRecordItem = (item) => {
  const meta = tipoMeta(item.tipo);
  const div = document.createElement('div');
  div.className = 'record-item';
  div.setAttribute('role', 'listitem');
  div.setAttribute('tabindex', '0');
  div.setAttribute('aria-label', `${item.titulo}, ${item.fecha}, ${item.doctor}`);
  
  div.innerHTML = `
    <div class="record-icon ${meta.colorClass}" aria-hidden="true">${meta.icon}</div>
    <div class="record-info">
      <div class="record-title">${item.titulo}</div>
      <div class="record-meta">${item.fecha} · ${item.doctor}</div>
    </div>
    <div class="record-actions">
      <button class="btn-icon" title="Ver detalle" data-action="ver" data-id="${item.id}" aria-label="Ver detalle de ${item.titulo}">👁️</button>
      <button class="btn-icon" title="Descargar" data-action="descargar" data-id="${item.id}" aria-label="Descargar ${item.titulo}">📥</button>
    </div>
  `;
  
  return div;
};

// Limpia y vuelve a pintar la lista de registros con los resultados de los filtros activos
const renderRecords = () => {
  const data = getFiltered();
  const container = safeGetElement('recordsList');
  
  if (!container) return;
  
  container.innerHTML = '';
  
  const countLabel = safeGetElement('countLabel');
  if (countLabel) countLabel.textContent = `${data.length} resultado${data.length !== 1 ? 's' : ''}`;
  
  if (!data.length) {
    container.innerHTML = `
      <div class="empty-state" role="status">
        <span class="empty-icon" aria-hidden="true">📭</span>
        <p>No hay registros que coincidan con los filtros.</p>
      </div>`;
    return;
  }
  
  data.forEach(item => {
    const recordEl = createRecordItem(item);
    container.appendChild(recordEl);
  });
};

// Manejador centralizado para delegación de eventos en los botones de acción de cada registro
const handleRecordAction = (e) => {
  const btn = e.target.closest('.btn-icon');
  if (!btn) return;
  
  const action = btn.dataset.action;
  const id = parseInt(btn.dataset.id, 10);
  
  if (isNaN(id)) return;
  
  if (action === 'ver') {
    openModal(id);
  } else if (action === 'descargar') {
    descargarRegistro(id);
  }
};

// Busca el registro por ID, llena el modal con sus datos y lo muestra al usuario
const openModal = (id) => {
  const item = registros.find(r => r.id === id);
  if (!item) return;
  
  const modalContent = safeGetElement('modalContent');
  if (modalContent) {
    modalContent.innerHTML = `
      <div class="modal-row"><span class="modal-key">Fecha</span><span class="modal-val">${item.fecha}</span></div>
      <div class="modal-row"><span class="modal-key">Tipo</span><span class="modal-val">${item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}</span></div>
      <div class="modal-row"><span class="modal-key">Título</span><span class="modal-val">${item.titulo}</span></div>
      <div class="modal-row"><span class="modal-key">Profesional</span><span class="modal-val">${item.doctor}</span></div>
      <div class="modal-row"><span class="modal-key">Estado</span>
        <span class="modal-val"><span class="badge ${badgeClass(item.estado)}">${item.estado}</span></span>
      </div>`;
  }
  
  const modal = safeGetElement('modalOverlay');
  if (modal) {
    modal.dataset.opener = 'btnDescargar';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    
    const closeBtn = safeGetElement('modalClose');
    if (closeBtn) closeBtn.focus();
  }
};

// Cierra el modal principal de detalle
const closeModal = () => closeModalGeneric('modalOverlay');

// Funciones de gestión de descargas: simulan la preparación de archivos y muestran un toast de confirmación
const descargarRegistro = (id) => {
  const item = registros.find(r => r.id === id);
  if (!item) return;
  showToast(`Preparando descarga: ${item.titulo}…`);
};

// Abre el modal de confirmación para descarga de PDF
const descargarPDF = () => {
  const modal = safeGetElement('modalDescargar');
  if (modal) {
    modal.dataset.opener = 'btnDescargar';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    
    const btnConfirmar = safeGetElement('confirmarDescarga');
    if (btnConfirmar) btnConfirmar.focus();
  }
};

// Confirma y ejecuta la descarga del PDF
const confirmarDescarga = () => {
  closeModalGeneric('modalDescargar');
  showToast('Generando PDF… Descarga iniciada');
};

// Cancela la descarga y cierra el modal
const cancelarDescarga = () => closeModalGeneric('modalDescargar');

// Prepara la descarga de radiografías en ZIP
const descargarRadiografias = () => {
  showToast('Preparando radiografías (ZIP)…');
};

// Inicializa el menú lateral móvil: toggles de apertura, cierre por overlay y marcado de ítem activo
const initMobileMenu = () => {
  const ham = safeGetElement('hamburger');
  const sb = safeGetElement('sidebar');
  const ov = safeGetElement('overlay');
  
  if (!ham || !sb || !ov) return;
  
  const toggleMenu = () => {
    const isOpen = sb.classList.toggle('open');
    ov.classList.toggle('open');
    ham.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    ov.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    
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
};

// Punto de entrada: inicializa el sidebar, contadores, registros y todos los eventos
const init = () => {
  initMobileMenu();
  
  animateCounters();
  updateStats();
  renderRecords();
  
  const recordsList = safeGetElement('recordsList');
  if (recordsList) {
    recordsList.addEventListener('click', handleRecordAction);
    recordsList.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target.closest('.record-item');
        if (target) {
          e.preventDefault();
          const firstBtn = target.querySelector('.btn-icon');
          if (firstBtn) firstBtn.click();
        }
      }
    });
  }
  
  // Filtro por tipo y búsqueda con debounce para evitar renders excesivos al escribir
  document.getElementById('filterTipo')?.addEventListener('change', renderRecords);
  
  const searchEl = safeGetElement('searchInput');
  if (searchEl) {
    const debouncedRender = debounce(renderRecords, 180);
    searchEl.addEventListener('input', debouncedRender);
  }
  
  // Conecta los botones del panel lateral con las funciones de descarga
  document.getElementById('btnDescargaPDF')?.addEventListener('click', descargarPDF);
  document.getElementById('btnDescargaZIP')?.addEventListener('click', descargarRadiografias);
  
  // Lleva al usuario a la vista de citas al hacer clic en el botón de cita sugerida
  document.getElementById('btnAgendarSugerida')?.addEventListener('click', () => {
      showToast('Redirigiendo a agenda…');
    });
  
  // Cierra los modales al pulsar la X, hacer clic fuera o confirmar/cancelar la descarga
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  const modalOverlay = safeGetElement('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }
  
  const confirmarBtn = safeGetElement('confirmarDescarga');
  const cancelarBtn = safeGetElement('cancelarDescarga');
  const modalDescargar = safeGetElement('modalDescargar');
  
  if (confirmarBtn) confirmarBtn.addEventListener('click', confirmarDescarga);
  if (cancelarBtn) cancelarBtn.addEventListener('click', cancelarDescarga);
  if (modalDescargar) {
    modalDescargar.addEventListener('click', e => {
      if (e.target === modalDescargar) cancelarDescarga();
    });
  }
  
  // La tecla Escape cierra cualquier modal abierto
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    
    const modalDesc = safeGetElement('modalDescargar');
    const modalDetail = safeGetElement('modalOverlay');
    
    if (modalDesc?.classList.contains('open')) {
      cancelarDescarga();
    } else if (modalDetail?.classList.contains('open')) {
      closeModal();
    }
  });
  
  // [MEJORA]: Limpieza de listeners al unload (buena práctica para SPAs)
  window.addEventListener('beforeunload', () => {
    // En una SPA real, aquí se removerían listeners para evitar memory leaks
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);