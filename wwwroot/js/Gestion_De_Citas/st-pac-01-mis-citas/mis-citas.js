// =============================================
// SMILETRACK — MIS CITAS PACIENTE (mis-citas.js)
// Gestión de citas del paciente: filtrado, modales, estadísticas y accesibilidad
// =============================================

/**
 * Obtiene un elemento del DOM por su ID de forma segura.
 * Si el elemento no existe, emite una advertencia en consola y retorna null
 * en lugar de lanzar un error en tiempo de ejecución.
 */
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  }
  return el;
};

/**
 * Envuelve una función con debounce: retrasa su ejecución hasta que el usuario
 * deje de llamarla por 'delay' ms. Se usa para evitar renders excesivos al escribir.
 * @param {Function} fn - Función a ejecutar
 * @param {number} delay - Tiempo de espera en ms
 */
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * Cierra cualquier modal por su ID. Elimina la clase 'open', actualiza los
 * atributos ARIA y restaura el foco al elemento que abrió el modal.
 * @param {string} modalId - ID del modal a cerrar
 */
const closeModalGeneric = (modalId) => {
  const modal = safeGetElement(modalId);
  if (!modal) return;
  
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('inert', '');
  
  // Restaura el foco al elemento que activó el modal para mantener la navegación por teclado
  const opener = modal.dataset.opener;
  if (opener) {
    const openerEl = safeGetElement(opener);
    if (openerEl) openerEl.focus();
  }
};

/**
 * Anima el conteo de un número desde 0 hasta 'target' usando requestAnimationFrame
 * con easing cúbico para una transición suave. Garantiza el valor final exacto.
 * @param {HTMLElement} el - Elemento donde se mostrará el número animado
 * @param {number} target - Valor numérico final al que llegar
 */
const animateCounter = (el, target) => {
  if (!el) return;
  
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const duration = 900; // 30 frames * 30ms
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Aplica curva de easing cúbica inversa para desacelerar la animación al final
    const eased = 1 - Math.pow(1 - progress, 3);
    cur = Math.floor(eased * target);
    
    el.textContent = cur;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      el.textContent = target; // Fuerza el valor exacto al terminar la animación
    }
  };
  
  requestAnimationFrame(animate);
};

// —— DATOS DE EJEMPLO ——
const SAMPLE_CITAS = [
  { id:1, fecha:'Vie 20 Mar', hora:'10:00 AM', doctor:'Dr. Carlos Méndez',  servicio:'Control general',   estado:'Agendada',   active:true  },
  { id:2, fecha:'Vie 27 Mar', hora:'03:30 PM', doctor:'Dra. Laura Gómez',   servicio:'Ortodoncia',        estado:'Agendada',   active:true  },
  { id:3, fecha:'Mar 10 Mar', hora:'09:00 AM', doctor:'Dr. Carlos Méndez',  servicio:'Limpieza dental',   estado:'Completada', active:false },
  { id:4, fecha:'Lun 03 Feb', hora:'11:30 AM', doctor:'Dra. Laura Gómez',   servicio:'Resina dental',     estado:'Completada', active:false },
  { id:5, fecha:'Jue 15 Ene', hora:'08:00 AM', doctor:'Dr. Andrés Torres',  servicio:'Consulta general',  estado:'Completada', active:false },
  { id:6, fecha:'Mar 18 Nov', hora:'09:00 AM', doctor:'Dr. Andrés Torres',  servicio:'Extracción',        estado:'Completada', active:false },
  { id:7, fecha:'Jue 12 Dic', hora:'11:00 AM', doctor:'Dra. Laura Gómez',   servicio:'Blanqueamiento',    estado:'Completada', active:false },
  { id:8, fecha:'Mié 10 Ene', hora:'10:00 AM', doctor:'Dr. Carlos Méndez',  servicio:'Ortodoncia',        estado:'Cancelada',  active:false },
];

let citas = [...SAMPLE_CITAS];
let cancelId = null;

// ── Badge class por estado ──
/**
 * Devuelve la clase CSS correspondiente al badge de estado de la cita.
 * Si el estado no existe en el mapa, retorna 'badge-agendada' como valor seguro por defecto.
 * @param {string} estado - Estado de la cita (Agendada, Confirmada, Completada, Cancelada)
 * @returns {string} Clase CSS del badge
 */
const badgeClass = (estado) => {
  const map = {
    'Agendada':   'badge-agendada',
    'Confirmada': 'badge-confirmada',
    'Completada': 'badge-completada',
    'Cancelada':  'badge-cancelada',
  };
  return map[estado] || 'badge-agendada'; // Fallback: si el estado es desconocido, usa el estilo de agendada
};

// ── Obtener citas filtradas ──
/**
 * Lee los valores del campo de búsqueda y el selector de estado,
 * y retorna únicamente las citas que coincidan con ambos criterios.
 * @returns {Array} Array de citas que pasan los filtros activos
 */
const getFiltered = () => {
  const searchInput = safeGetElement('searchInput');
  const filterEstado = safeGetElement('filterEstado');
  
  // Verifica que los elementos del DOM existan antes de leer sus valores
  if (!searchInput || !filterEstado) return citas;
  
  const q = searchInput.value.toLowerCase().trim();
  const st = filterEstado.value;

  return citas.filter(c => {
    const matchQ = !q || (
      c.doctor.toLowerCase().includes(q) ||
      c.servicio.toLowerCase().includes(q) ||
      c.fecha.toLowerCase().includes(q)
    );
    const matchSt = !st || c.estado === st;
    return matchQ && matchSt;
  });
};

// ── Actualizar contadores y progress bar ──
/**
 * Recalcula y actualiza los contadores de tarjetas de estadísticas
 * (total, completadas, pendientes, canceladas) y el porcentaje de la barra de progreso.
 */
const updateStats = () => {
  const total = citas.length;
  const comp = citas.filter(c => c.estado === 'Completada').length;
  const pend = citas.filter(c => c.estado === 'Agendada' || c.estado === 'Confirmada').length;
  const canc = citas.filter(c => c.estado === 'Cancelada').length;

  // Obtiene referencias a todos los contadores del DOM de forma segura
  const elTotal = safeGetElement('cnt-total');
  const elComp = safeGetElement('cnt-completadas');
  const elPend = safeGetElement('cnt-pendientes');
  const elCanc = safeGetElement('cnt-canceladas');
  
  if (elTotal) elTotal.textContent = total;
  if (elComp) elComp.textContent = comp;
  if (elPend) elPend.textContent = pend;
  if (elCanc) elCanc.textContent = canc;

  const progressBar = safeGetElement('progressBar');
  const progressLabel = safeGetElement('progressLabel');
  const pct = total > 0 ? Math.round((comp / total) * 100) : 0;
  
  if (progressBar) {
    progressBar.style.width = pct + '%';
    // Sincroniza el atributo aria-valuenow para que lectores de pantalla anuncien el progreso
    progressBar.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', pct);
  }
  if (progressLabel) progressLabel.textContent = `${comp} de ${total} citas completadas`;
};

/**
 * Dispara la animación de conteo en todas las tarjetas de estadísticas
 * al cargar la página por primera vez.
 */
const animateCounters = () => {
  const total = citas.length;
  const comp = citas.filter(c => c.estado === 'Completada').length;
  const pend = citas.filter(c => c.estado === 'Agendada' || c.estado === 'Confirmada').length;
  const canc = citas.filter(c => c.estado === 'Cancelada').length;

  animateCounter(safeGetElement('cnt-total'), total);
  animateCounter(safeGetElement('cnt-completadas'), comp);
  animateCounter(safeGetElement('cnt-pendientes'), pend);
  animateCounter(safeGetElement('cnt-canceladas'), canc);
};

// ── Render tabla ──
/**
 * Limpia y repinta el cuerpo de la tabla con las citas que pasan
 * los filtros activos. Muestra un estado vacío si no hay resultados.
 */
const renderTable = () => {
  const data = getFiltered();
  const tbody = safeGetElement('citasTbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  const label = safeGetElement('countLabel');
  if (label) label.textContent = `${data.length} resultado${data.length !== 1 ? 's' : ''}`;

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <span class="empty-icon" aria-hidden="true">📭</span>
            <p>No hay citas que coincidan con los filtros.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement('tr');
    if (item.active) tr.classList.add('row-active');
    if (item.estado === 'Cancelada') tr.classList.add('row-cancelada');

    const canCancel = item.estado === 'Agendada' || item.estado === 'Confirmada';

    // Construye la fila HTML con los botones de acción (ver detalle y cancelar si aplica)
    tr.innerHTML = `
      <td class="td-fecha">${item.fecha}</td>
      <td><span class="pill-hora">${item.hora}</span></td>
      <td class="td-doctor">${item.doctor}</td>
      <td>${item.servicio}</td>
      <td><span class="badge ${badgeClass(item.estado)}">${item.estado}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Ver detalle" data-action="ver" data-id="${item.id}" aria-label="Ver detalle de cita">👁️</button>
          ${canCancel ? `<button class="btn-icon danger" title="Cancelar cita" data-action="cancelar" data-id="${item.id}" aria-label="Cancelar cita">✕</button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
};

// ── Modal detalle de cita ──
/**
 * Busca la cita por ID, rellena el contenido del modal con sus datos
 * (fecha, hora, doctor, servicio, estado) y lo abre enfocando el botón de cierre.
 * @param {number} id - ID de la cita a mostrar
 */
const openModal = (id) => {
  const item = citas.find(c => c.id === id);
  if (!item) return;

  const modalContent = safeGetElement('modalContent');
  if (modalContent) {
    modalContent.innerHTML = `
      <div class="modal-row"><span class="modal-key">Fecha</span>   <span class="modal-val">${item.fecha}</span></div>
      <div class="modal-row"><span class="modal-key">Hora</span>    <span class="modal-val">${item.hora}</span></div>
      <div class="modal-row"><span class="modal-key">Doctor</span>  <span class="modal-val">${item.doctor}</span></div>
      <div class="modal-row"><span class="modal-key">Servicio</span><span class="modal-val">${item.servicio}</span></div>
      <div class="modal-row"><span class="modal-key">Estado</span>
        <span class="modal-val"><span class="badge ${badgeClass(item.estado)}">${item.estado}</span></span>
      </div>`;
  }

  const modal = safeGetElement('modalOverlay');
  if (modal) {
    // Guarda qué elemento activó el modal para poder restaurar el foco al cerrarlo
    modal.dataset.opener = 'btnNuevaCita';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    
    // Mueve el foco al botón de cerrar para que el usuario de teclado pueda salir del modal
    const closeBtn = safeGetElement('modalClose');
    if (closeBtn) closeBtn.focus();
  }
};

/**
 * Cierra el modal principal de detalle
 */
const closeModal = () => closeModalGeneric('modalOverlay');

// ── Modal de confirmación de cancelación ──
/**
 * Muestra el modal de confirmación con el resumen de la cita que se
 * desea cancelar, y espera que el usuario confirme o rechace la acción.
 * @param {number} id - ID de la cita que se quiere cancelar
 */
const abrirModalCancelar = (id) => {
  const item = citas.find(c => c.id === id);
  if (!item) return;

  cancelId = id;
  const desc = safeGetElement('cancelarDesc');
  if (desc) desc.textContent = `Cita del ${item.fecha} a las ${item.hora} — ${item.servicio}`;
  
  const modal = safeGetElement('modalCancelar');
  if (modal) {
    modal.dataset.opener = `btn-cancelar-${id}`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    
    // Lleva el foco al botón de confirmación para facilitar la acción con teclado
    const btnSi = safeGetElement('cancelarSi');
    if (btnSi) btnSi.focus();
  }
};

/**
 * Cierra el modal de cancelación y reinicia la variable que guarda
 * el ID de la cita pendiente de cancelar.
 */
const cerrarModalCancelar = () => {
  closeModalGeneric('modalCancelar');
  cancelId = null;
};

/**
 * Aplica la cancelación de la cita guardada en 'cancelId': actualiza su estado
 * a 'Cancelada', refresca la tabla y los contadores, y muestra un toast de confirmación.
 */
const confirmarCancelacion = () => {
  if (!cancelId) return;
  
  const item = citas.find(c => c.id === cancelId);
  if (item) {
    item.estado = 'Cancelada';
    item.active = false;
    updateStats();
    renderTable();
    showToast('Cita cancelada correctamente');
  }
  cerrarModalCancelar();
};

// ── Toast ──
/**
 * Muestra un mensaje flotante en la parte inferior de la pantalla por 3 segundos.
 * Si ya hay un toast visible, cancela su temporizador antes de mostrar el nuevo.
 * @param {string} msg - Texto del mensaje a mostrar
 */
const showToast = (msg) => {
  const t = safeGetElement('toast');
  if (!t) return;
  
  t.textContent = msg;
  t.classList.add('show');
  
  // Cancela el ocultado anterior si el toast se llama varias veces seguidas
  if (t._timeoutId) clearTimeout(t._timeoutId);
  t._timeoutId = setTimeout(() => t.classList.remove('show'), 3000);
};

// ── Modal nueva cita ──
/**
 * Registra todos los eventos del modal de solicitud de nueva cita:
 * abrir al pulsar el botón principal, cerrar con los botones secundarios,
 * validar el campo de fecha y resetear el formulario tras el envío.
 */
const initNuevaCitaModal = () => {
  const modal = safeGetElement('modalNuevaCita');
  if (!modal) return;

  const btnNueva = safeGetElement('btnNuevaCita');
  if (btnNueva) {
    btnNueva.addEventListener('click', () => {
      modal.dataset.opener = 'btnNuevaCita';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      modal.removeAttribute('inert');
      
      // Lleva el foco al primer campo del formulario para mejorar la experiencia de usuario
      const firstInput = modal.querySelector('.form-input');
      if (firstInput) firstInput.focus();
    });
  }

  const closeBtn = safeGetElement('closeNuevaCita');
  const cancelBtn = safeGetElement('cancelarNuevaCita');
  if (closeBtn) closeBtn.addEventListener('click', () => closeModalGeneric('modalNuevaCita'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModalGeneric('modalNuevaCita'));

  const confirmBtn = safeGetElement('confirmarNuevaCita');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const fechaInput = safeGetElement('citaFecha');
      const fecha = fechaInput?.value;
      
      // Si no se eligió fecha, marca el campo visualmente y regresa el foco a él
      if (!fecha) {
        if (fechaInput) {
          fechaInput.focus();
          fechaInput.style.borderColor = 'var(--orange)';
          setTimeout(() => fechaInput.style.borderColor = '', 2000);
        }
        return;
      }

      closeModalGeneric('modalNuevaCita');
      showToast('Solicitud de cita enviada exitosamente');
      
      // Limpia todos los campos del formulario para dejarlo listo para la próxima solicitud
      const servicioSelect = safeGetElement('citaServicio');
      const notaTextarea = safeGetElement('citaNota');
      if (fechaInput) fechaInput.value = '';
      if (servicioSelect) servicioSelect.selectedIndex = 0;
      if (notaTextarea) notaTextarea.value = '';
    });
  }

  // Cierra el modal si el usuario hace clic directamente sobre el overlay oscuro
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModalGeneric('modalNuevaCita');
  });
};

// ── Delegación de eventos para tabla dinámica ──
/**
 * Registra un único listener en el tbody de la tabla para manejar
 * los clicks en los botones de acción de cada fila (ver detalle y cancelar).
 * Usar event delegation evita re-asignar listeners al re-renderizar la tabla.
 */
const initTableEvents = () => {
  const tbody = safeGetElement('citasTbody');
  if (!tbody) return;

  // Un solo listener en el contenedor capta los clicks de todos los botones generados dinámicamente
  tbody.addEventListener('click', e => {
    const btn = e.target.closest('.btn-icon');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);
    
    // Descarta el evento si el data-id no puede convertirse a un número entero válido
    if (isNaN(id)) return;

    if (action === 'ver') {
      openModal(id);
    } else if (action === 'cancelar') {
      abrirModalCancelar(id);
    }
  });
};

// ── Init principal ──
/**
 * Punto de entrada de la página. Ejecuta el render inicial, anima los contadores,
 * registra los eventos de filtros, modales, teclado y el menú móvil.
 */
const init = () => {
  try {
    // Anima los contadores y pinta la tabla al cargar la página por primera vez
    animateCounters();
    updateStats();
    renderTable();
    
    // Inicializa el modal de nueva cita y la delegación de eventos de la tabla
    initNuevaCitaModal();
    initTableEvents();

    // Re-renderiza la tabla cada vez que cambia el selector de estado
    const filterEl = safeGetElement('filterEstado');
    if (filterEl) filterEl.addEventListener('change', renderTable);

    // Aplica debounce al campo de búsqueda para no re-renderizar en cada pulsación de tecla
    const searchEl = safeGetElement('searchInput');
    if (searchEl) {
      const debouncedRender = debounce(renderTable, 180);
      searchEl.addEventListener('input', debouncedRender);
    }

    // Registra el cierre del modal de detalle al pulsar la X o hacer clic fuera
    const modalClose = safeGetElement('modalClose');
    const modalOverlay = safeGetElement('modalOverlay');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // Registra los botones 'Volver' y 'Sí, cancelar' del modal de confirmación
    const cancelarNo = safeGetElement('cancelarNo');
    const cancelarSi = safeGetElement('cancelarSi');
    const modalCancelar = safeGetElement('modalCancelar');
    
    if (cancelarNo) cancelarNo.addEventListener('click', cerrarModalCancelar);
    if (cancelarSi) cancelarSi.addEventListener('click', confirmarCancelacion);
    if (modalCancelar) {
      modalCancelar.addEventListener('click', e => {
        if (e.target === modalCancelar) cerrarModalCancelar();
      });
    }

    // La tecla Escape cierra el modal más reciente según el orden de apilamiento
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      
      // Cierra primero el modal de nueva cita, luego el de cancelación, luego el de detalle
      const modalNueva = safeGetElement('modalNuevaCita');
      const modalCancel = safeGetElement('modalCancelar');
      const modalDetail = safeGetElement('modalOverlay');
      
      if (modalNueva?.classList.contains('open')) {
        closeModalGeneric('modalNuevaCita');
      } else if (modalCancel?.classList.contains('open')) {
        cerrarModalCancelar();
      } else if (modalDetail?.classList.contains('open')) {
        closeModal();
      }
    });
    
    // En una SPA se deben remover listeners aquí para evitar memory leaks al cambiar de página
    window.addEventListener('beforeunload', () => {
      // Ej: modalOverlay?.removeEventListener('click', closeModalHandler);
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