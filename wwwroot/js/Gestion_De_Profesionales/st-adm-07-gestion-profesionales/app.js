/**
 * SMILETRACK — GESTIÓN PROFESIONALES
 *
 * NOTA: Este archivo contiene lógica de fallback.
 * La renderización principal es server-side (Razor),
 * el JS solo maneja: modales, sidebar móvil y animaciones de contadores.
 */

// Base URL para futuras migraciones a API REST (actualmente no se usa en producción)
const API_BASE = '/gestion-de-profesionales';

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene elemento del DOM con logging de errores.
 * WHY: Evita null reference errors silenciosos que rompen la UX sin mensaje claro.
 */
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

/**
 * Debounce para búsqueda en tiempo real.
 * WHY: Evita disparar el submit del form a cada tecla mientras el usuario escribe.
 */
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * Muestra notificación toast con auto-cierre.
 * WHY: Feedback visual sin bloquear la interfaz (mejor UX que alert() que paraliza todo).
 */
const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;

  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ═══════════════════════════════════════════════════════════════════
//  MAPEO DE COLORES (solo UI, no afecta lógica de negocio)
// ═══════════════════════════════════════════════════════════════════
// WHY: Centralizar el mapeo aquí evita repetirlo en Razor y en JS.
const SPEC_COLORS = {
  'Odontología General': 'general',
  'Ortodoncia': 'ortodoncia',
  'Endodoncia': 'endodoncia',
  'Odontopediatría': 'pediatria',
  'Cirugía Oral': 'cirugia',
  'Periodoncia': 'periodoncia',
  'Implantología': 'implante',
  'Rehabilitación Oral': 'rehab',
};

// Variables de estado solo para el modo fallback client-side
let professionals = [];
let searchQuery = '';
let selectedSpecialty = '';
let selectedStatus = '';
let currentPage = 1;
const itemsPerPage = 5;
let editingId = null;

/**
 * Detecta si la tabla ya viene renderizada desde el servidor (SSR).
 * WHY: Permite que el mismo archivo JS funcione en modo Razor/SSR (producción)
 *      y en modo client-side puro (fallback/demo), sin duplicar código.
 */
const shouldUseServerRenderedTable = () => {
  const tbody = safeGetElement('professionalsTbody');
  // Si el tbody tiene filas renderizadas por Razor, usamos SSR y saltamos el JS de tabla
  return !!(tbody && tbody.children.length > 0);
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIONES DE RENDERIZADO
// ═══════════════════════════════════════════════════════════════════

/**
 * Anima contador numérico de 0 al valor objetivo.
 * WHY: Mejora visual al cargar estadísticas — indica que el número es dinámico (efecto "wow").
 */
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

/**
 * Obtiene clase CSS para badge de especialidad.
 * TODO: Mover a constante centralizada para evitar duplicación con el CSS.
 */
const getSpecBadgeClass = (specialty) => {
  return SPEC_COLORS[specialty] || 'general';
};

/**
 * Obtiene clase CSS para badge de estado.
 * WHY: Centraliza el mapeo para no hardcodear strings en múltiples lugares del template.
 */
const getStatusBadgeClass = (status) => {
  const map = { 'Activo': 'activo', 'Vacaciones': 'vacaciones', 'Inactivo': 'inactivo' };
  return map[status] || 'inactivo';
};

/**
 * Obtiene color de avatar por especialidad.
 * WHY: Colores deterministas (siempre el mismo por especialidad) mejoran
 *      el reconocimiento visual rápido al escanear la tabla.
 */
const getAvatarColor = (specialty) => {
  const colors = {
    'general': 'var(--spec-general)',
    'ortodoncia': 'var(--spec-ortodoncia)',
    'endodoncia': 'var(--spec-endodoncia)',
    'pediatria': 'var(--spec-pediatria)',
    'cirugia': 'var(--spec-cirugia)',
    'periodoncia': 'var(--spec-periodoncia)',
    'implante': 'var(--spec-implante)',
    'rehab': 'var(--spec-rehab)',
  };
  return colors[getSpecBadgeClass(specialty)] || 'var(--spec-general)';
};

/**
 * Renderiza tabla de profesionales (solo para modo fallback client-side).
 * NOTE: Esta función NO se ejecuta si hay SSR — ver shouldUseServerRenderedTable().
 *       En producción la tabla viene de Razor; esta función es backup por si el servidor falla.
 */
const renderTable = () => {
  const tbody = safeGetElement('professionalsTbody');
  if (!tbody || shouldUseServerRenderedTable()) return;
  
  // Filtrar datos
  const filtered = professionals.filter(p =>
    (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.specialty.toLowerCase().includes(searchQuery.toLowerCase()) || p.registry.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!selectedSpecialty || p.specialty === selectedSpecialty) &&
    (!selectedStatus || p.status === selectedStatus)
  );
  
  // Paginar
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);
  
  tbody.innerHTML = '';
  
  if (!paginated.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No se encontraron profesionales con los filtros aplicados.</td></tr>`;
    updatePagination(0, 0);
    return;
  }
  
  paginated.forEach(p => {
    const tr = document.createElement('tr');
    tr.setAttribute('role', 'row');
    
    const specClass = getSpecBadgeClass(p.specialty);
    const statusClass = getStatusBadgeClass(p.status);
    const avatarColor = getAvatarColor(p.specialty);
    
    tr.innerHTML = `
      <td class="td-profesional">
        <div class="p-avatar" style="background:${avatarColor}" aria-hidden="true">${p.initials}</div>
        <span class="p-name">${p.name}</span>
      </td>
      <td><span class="badge-spec ${specClass}">${p.specialty}</span></td>
      <td>${p.registry}</td>
      <td>${p.phone}</td>
      <td><span class="badge-status ${statusClass}" role="status" aria-label="Estado: ${p.status}">${p.status}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon view" title="Ver detalles" aria-label="Ver detalles de ${p.name}" onclick="viewProfessional(${p.id})">👁️</button>
          <button class="btn-icon edit" title="Editar profesional" aria-label="Editar ${p.name}" onclick="editProfessional(${p.id})">✏️</button>
          <button class="btn-icon toggle" title="Cambiar estado" aria-label="Cambiar estado de ${p.name}" onclick="toggleStatus(${p.id})">⚡</button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Actualizar paginación
  updatePagination(filtered.length, paginated.length);
};

/**
 * Actualiza contadores de estadísticas (solo modo fallback client-side).
 * WHY: Solo se ejecuta si no hay SSR para evitar duplicar lógica que ya hizo el servidor.
 */
const updateStats = () => {
  if (shouldUseServerRenderedTable()) return;
  const total = professionals.length;
  const actives = professionals.filter(p => p.status === 'Activo').length;
  const vacations = professionals.filter(p => p.status === 'Vacaciones').length;
  const inactives = professionals.filter(p => p.status === 'Inactivo').length;
  
  animateCounter(safeGetElement('metricTotal'), total);
  animateCounter(safeGetElement('metricActives'), actives);
  animateCounter(safeGetElement('metricVacations'), vacations);
  animateCounter(safeGetElement('metricInactives'), inactives);
};

/**
 * Actualiza botones de paginación (solo modo fallback client-side).
 * WHY: Solo se ejecuta si no hay SSR; en producción la paginación viene renderizada de Razor.
 */
const updatePagination = (total, count) => {
  if (shouldUseServerRenderedTable()) return;
  const info = safeGetElement('paginationInfo');
  const buttons = safeGetElement('paginationButtons');
  if (!info || !buttons) return;
  
  const totalPages = Math.ceil(total / itemsPerPage) || 1;
  const start = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, total);
  
  info.textContent = `Mostrando ${start}-${end} de ${total} profesionales`;
  
  buttons.innerHTML = '';
  
  // Botón anterior
  const btnPrev = document.createElement('button');
  btnPrev.textContent = '«';
  btnPrev.setAttribute('aria-label', 'Página anterior');
  btnPrev.disabled = currentPage === 1;
  btnPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  buttons.appendChild(btnPrev);
  
  // Botones numéricos
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.setAttribute('aria-label', `Ir a página ${i}`);
    btn.setAttribute('aria-current', i === currentPage ? 'page' : 'false');
    if (i === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => { currentPage = i; renderTable(); });
    buttons.appendChild(btn);
  }
  
  // Botón siguiente
  const btnNext = document.createElement('button');
  btnNext.textContent = '»';
  btnNext.setAttribute('aria-label', 'Página siguiente');
  btnNext.disabled = currentPage === totalPages;
  btnNext.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderTable(); } });
  buttons.appendChild(btnNext);
};

// ═══════════════════════════════════════════════════════════════════
//  ACCIONES DE PROFESIONAL
// ═══════════════════════════════════════════════════════════════════

// Ver detalles de profesional
window.viewProfessional = (id) => {
  const p = professionals.find(prof => prof.id === id);
  if (!p) return;
  
  // Actualizar modal detalle
  const avatar = safeGetElement('detailAvatar');
  const name = safeGetElement('detailName');
  const specialty = safeGetElement('detailSpecialty');
  const registry = safeGetElement('detailRegistry');
  const phone = safeGetElement('detailPhone');
  const status = safeGetElement('detailStatus');
  
  if (avatar) {
    avatar.textContent = p.initials;
    avatar.style.background = getAvatarColor(p.specialty);
  }
  if (name) name.textContent = p.name;
  if (specialty) specialty.textContent = p.specialty;
  if (registry) registry.textContent = p.registry;
  if (phone) phone.textContent = p.phone;
  if (status) {
    status.textContent = p.status;
    status.className = `badge-status ${getStatusBadgeClass(p.status)}`;
  }
  
  // Abrir modal
  const modal = safeGetElement('modalDetail');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    const closeBtn = safeGetElement('modalDetailClose');
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Edita profesional en modo SSR: navega vía GET con editId.
 * WHY: En SSR el array professionals[] siempre está vacío (la tabla la renderizó Razor).
 *      Buscar en el array y llenar el modal a mano NUNCA funcionaría.
 *      La edición correcta es un GET al Controller que carga el profesional desde BD
 *      y lo pasa en ViewData["EditingProfesional"] para pre-rellenar el modal en el servidor.
 */
window.editProfessional = (id) => {
  if (shouldUseServerRenderedTable()) {
    // SSR: navegar al mismo URL con editId → el Controller pre-rellena el modal desde BD
    window.location.href = `${window.location.pathname}?editId=${id}`;
    return;
  }
  // Fallback client-side (no activo en producción)
  const p = professionals.find(prof => prof.id === id);
  if (!p) return;
  editingId = id;
  const formNombres = safeGetElement('formNombres');
  const formStatus  = safeGetElement('formStatus');
  const modalTitle  = safeGetElement('modalFormTitle');
  if (formNombres)  formNombres.value = p.name;
  if (formStatus)   formStatus.value  = p.status;
  if (modalTitle)   modalTitle.textContent = 'Editar Profesional';
  openFormModal();
};

/**
 * Alterna estado de profesional vía redirect al endpoint de baja lógica.
 * WHY: Cambiar el estado solo en el array de memoria NO persiste a la BD.
 *      En SSR se redirige al servidor para que haga el cambio real.
 *      El endpoint EliminarProfesional ahora hace baja lógica (Estado = "inactivo"),
 *      pero para ciclar estados necesitaríamos un endpoint dedicado.
 *      Por ahora, se notifica al usuario que debe usar el formulario de edición.
 */
window.toggleStatus = (id) => {
  if (shouldUseServerRenderedTable()) {
    // En SSR no hay forma de cambiar el estado sin un POST al servidor;
    // redirigir a edición del profesional para que el admin cambie el estado.
    window.location.href = `${window.location.pathname}?editId=${id}`;
    return;
  }
  // Fallback client-side
  const p = professionals.find(prof => prof.id === id);
  if (!p) return;
  const states = ['Activo', 'Vacaciones', 'Inactivo'];
  const currentIndex = states.indexOf(p.status);
  p.status = states[(currentIndex + 1) % states.length];
  showToast(`✅ ${p.name}: estado cambiado a "${p.status}"`);
  updateStats();
  renderTable();
};

// ═══════════════════════════════════════════════════════════════════
//  MODALES
// ═══════════════════════════════════════════════════════════════════

// Rastrear el elemento que abrió el modal para devolver el foco al cerrarlo (WCAG 2.4.3)
let lastModalOpener = null;

/**
 * Abre modal de formulario y registra quién lo abrió.
 * WHY: WCAG 2.4.3 — al cerrar un modal el foco debe regresar al elemento
 *      que lo disparó. Sin esto el foco queda al principio del documento.
 */
const openFormModal = () => {
  // Registrar el botón que abre el modal para devolverle el foco al cerrar
  lastModalOpener = document.activeElement;

  editingId = null;

  const form = safeGetElement('formProfessional');
  if (form) form.reset();

  const modalTitle = safeGetElement('modalFormTitle');
  if (modalTitle) modalTitle.textContent = 'Nuevo Profesional';

  const modal = safeGetElement('modalForm');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    const firstInput = modal.querySelector('input:not([type="hidden"])');
    if (firstInput) firstInput.focus();
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Cierra modal de formulario y devuelve el foco al elemento que lo abrió.
 * WHY: WCAG 2.4.3 — el foco debe regresar al botón que disparó el modal
 *      ("+ Nuevo Profesional" o el botón editar ✏️ de la fila correspondiente).
 */
const closeFormModal = () => {
  const modal = safeGetElement('modalForm');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
  editingId = null;
  // Devolver el foco al elemento que abrió el modal (si sigue en el DOM)
  if (lastModalOpener && typeof lastModalOpener.focus === 'function') {
    lastModalOpener.focus();
  }
  lastModalOpener = null;
};

/**
 * Cierra modal de detalle y devuelve el foco al elemento que lo abrió.
 * WHY: Mismo principio WCAG 2.4.3 que closeFormModal.
 */
const closeDetailModal = () => {
  const modal = safeGetElement('modalDetail');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
  }
  if (lastModalOpener && typeof lastModalOpener.focus === 'function') {
    lastModalOpener.focus();
  }
  lastModalOpener = null;
};

// Crea o actualiza profesional — submit nativo para que el antiforgery token viaje correctamente
const saveProfessional = (e) => {
  const form = e.currentTarget;
  const nombres = safeGetElement('formNombres')?.value.trim() || '';
  const apellidos = safeGetElement('formApellidos')?.value.trim() || '';
  const registroMedico = safeGetElement('formRegistroMedico')?.value.trim() || '';

  // ── VALIDACIÓN CLIENTE ──────────────────────────────────────────────────────
  // Si los campos obligatorios están vacíos, mostramos el toast y BLOQUEAMOS el envío.
  // e.preventDefault() solo se llama aquí — nunca después de pasar la validación.
  if (!nombres || !apellidos || !registroMedico) {
    e.preventDefault();
    showToast('⚠️ Completa nombres, apellidos y registro médico', 'warning');
    return;
  }

  // ── PROTECCIÓN DOBLE CLIC ───────────────────────────────────────────────────
  // Una vez que la validación pasó, deshabilitamos el botón submit INMEDIATAMENTE.
  // Esto evita que el usuario haga clic dos veces y cree dos registros duplicados en BD.
  // No necesitamos volver a habilitarlo porque tras el POST el servidor redirige
  // a la misma página (recarga completa) y el botón renace en su estado original.
  const submitBtn = form.querySelector('[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Guardando...';
  }

  // Dejar que el formulario se envíe de forma nativa (POST real al servidor).
  // El antiforgery token ya está en el <input hidden> del form, no hace falta fetch.
};


// ═══════════════════════════════════════════════════════════════════
//  FILTROS Y BÚSQUEDA
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualiza selector de especialidades desde datos en memoria.
 * WHY: Solo se usa en modo fallback; en producción las opciones vienen del servidor.
 */
const populateSpecialties = () => {
  const select = safeGetElement('filterSpecialty');
  if (!select) return;
  
  const currentValue = select.value;
  const specialties = ['', ...new Set(professionals.map(p => p.specialty))];
  
  select.innerHTML = '<option value="">Todas las especialidades</option>' +
    specialties.filter(s => s).map(spec => `<option value="${spec}">${spec}</option>`).join('');
  
  if (currentValue) select.value = currentValue;
};

/**
 * Aplica filtros de búsqueda sobre datos en memoria.
 * WHY: Solo actúa en modo fallback; en producción los filtros son server-side via GET.
 */
const applyFilters = () => {
  searchQuery = safeGetElement('searchInput')?.value.toLowerCase() || '';
  selectedSpecialty = safeGetElement('filterSpecialty')?.value || '';
  selectedStatus = safeGetElement('filterStatus')?.value || '';
  
  currentPage = 1;
  renderTable();
};

// ═══════════════════════════════════════════════════════════════════
//  API CALLS (Listas para conectar al backend C#)
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene lista de profesionales desde el servidor.
 * TODO: Implementar fetch real cuando el backend tenga endpoint API REST.
 *       Por ahora retorna [] porque la tabla ya viene renderizada en Razor (SSR).
 */
async function fetchProfessionals() {
  return [];
}

// ═══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN DE COMPONENTES
// ═══════════════════════════════════════════════════════════════════

/**
 * Inicializa sidebar móvil con gestión de foco y ARIA.
 * WHY: Mejora accesibilidad — sin esto, el sidebar abierto en móvil no tiene gestión de foco
 *      y un usuario de lector de pantalla no sabe que el menú está abierto.
 */
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

/**
 * Inicializa filtros de búsqueda en modo fallback (client-side).
 * WHY: Solo actúa si no hay SSR; en producción los filtros se envían como GET al servidor.
 */
const initFilters = () => {
  if (shouldUseServerRenderedTable()) return;
  const searchInput    = safeGetElement('searchInput');
  const filterSpecialty = safeGetElement('filterSpecialty');
  const filterStatus   = safeGetElement('filterStatus');

  searchInput?.addEventListener('input', debounce(applyFilters, 250));
  filterSpecialty?.addEventListener('change', applyFilters);
  filterStatus?.addEventListener('change', applyFilters);
};

/**
 * Conecta el buscador de texto al submit del formulario GET de filtros en modo SSR.
 * WHY: En SSR applyFilters() opera sobre un array vacío y no hace nada.
 *      La búsqueda real debe llegar al Controller vía GET (?search=...) para que
 *      EF Core filtre en SQL Server.
 *      Esta función SOLO actúa cuando hay SSR y hay un form GET en la página.
 */
const initSearchDebounce = () => {
  if (!shouldUseServerRenderedTable()) return; // Solo en SSR

  const searchInput = safeGetElement('searchInput');
  if (!searchInput) return;

  // El formulario GET de filtros está en la sección .filters-section
  const filterForm = searchInput.closest('form') ?? document.querySelector('.filters-section form');
  if (!filterForm) return;

  // Debounce: esperar 400ms después de que el usuario deje de escribir antes de enviar
  // WHY: evitar disparar un request a cada tecla pulsada
  searchInput.addEventListener('input', debounce(() => {
    filterForm.submit();
  }, 400));
};

/**
 * Inicializa modales: eventos de apertura, cierre y teclado.
 * WHY: Centraliza toda la configuración de modales para que initSidebar/initFilters
 *      no necesiten conocer los detalles del modal (separación de responsabilidades).
 */
const initModals = () => {
  const btnNew = safeGetElement('btnNewProfessional');
  const modalFormClose = safeGetElement('modalFormClose');
  const modalFormCancel = safeGetElement('modalFormCancel');
  const modalDetailClose = safeGetElement('modalDetailClose');
  const modalDetailCloseBtn = safeGetElement('modalDetailCloseBtn');
  const modalForm = safeGetElement('modalForm');
  const modalDetail = safeGetElement('modalDetail');
  const form = safeGetElement('formProfessional');
  
  // Abrir modal crear
  btnNew?.addEventListener('click', openFormModal);
  
  // Cerrar modales
  modalFormClose?.addEventListener('click', closeFormModal);
  modalFormCancel?.addEventListener('click', closeFormModal);
  modalDetailClose?.addEventListener('click', closeDetailModal);
  modalDetailCloseBtn?.addEventListener('click', closeDetailModal);
  
  modalForm?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeFormModal();
  });
  modalDetail?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  
  // Submit del formulario
  form?.addEventListener('submit', saveProfessional);
  
  // Soporte para teclado en modales
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalForm?.classList.contains('open')) {
        e.preventDefault();
        closeFormModal();
      }
      if (modalDetail?.classList.contains('open')) {
        e.preventDefault();
        closeDetailModal();
      }
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * Anima los contadores de la sección Stats cuando la tabla viene de SSR.
 * WHY: updateStats() se saltea con SSR (correctamente), pero los data-target
 *      del HTML de Razor contienen los valores reales del servidor. Esta función
 *      los lee y activa la animación 0 → N para que los cards no queden en 0.
 *
 * Flujo:
 *   Razor escribe  <span data-target="42">0</span>
 *   Esta fn lee    data-target = 42
 *   animateCounter anima el span de 0 a 42
 */
const initServerStats = () => {
  const statEls = [
    safeGetElement('metricTotal'),
    safeGetElement('metricActives'),
    safeGetElement('metricVacations'),
    safeGetElement('metricInactives'),
  ];

  statEls.forEach(el => {
    if (!el) return;
    const target = parseInt(el.getAttribute('data-target') ?? '0', 10);
    // Solo animar si el target es válido y mayor que 0
    if (!isNaN(target) && target > 0) {
      animateCounter(el, target);
    } else {
      // Si el target es 0, mostrar 0 directamente sin animar
      el.textContent = '0';
    }
  });
};

/**
 * Inicializa todos los componentes al cargar la página.
 * WHY: Punto de entrada único — facilita el debugging y el orden de inicialización.
 *
 * Orden de ejecución:
 *   1. initSidebar   — sidebar móvil y teclado
 *   2. initFilters   — filtros fallback (se saltea si hay SSR)
 *   3. initModals    — modales CRUD
 *   4. initServerStats — anima contadores desde data-target de Razor
 *   5. fetchProfessionals + renderTable — solo activos en modo fallback
 */
const init = async () => {
  initSidebar();
  initFilters();
  initModals();
  initSearchDebounce(); // Debounce del buscador → GET real al servidor en modo SSR

  // Animar contadores del Stats Grid con los valores que Razor ya escribió en data-target.
  // WHY: esto funciona en SSR y en fallback — siempre hay data-target en el HTML.
  initServerStats();

  // Modo fallback: cargar datos y renderizar tabla desde JS
  // (en SSR estos pasos producen un array vacío y la tabla ya tiene filas, así que no hacen nada)
  professionals = await fetchProfessionals();
  populateSpecialties();
  updateStats();   // no-op en SSR (return temprano), anima en fallback
  renderTable();   // no-op en SSR, renderiza en fallback

  // Limpieza al unload para evitar memory leaks en implementaciones SPA
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);