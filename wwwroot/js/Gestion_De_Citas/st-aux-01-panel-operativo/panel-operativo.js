/**
 * SMILETRACK — PANEL OPERATIVO AUXILIAR (app.js)
 * Lógica con datos mockeados, persistencia y accesibilidad
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

// Gestiona apertura y cierre de modales con accesibilidad
const modalManager = {
  open: (modalId) => {
    const modal = safeGetElement(modalId);
    if (!modal) return;
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    
    // Enfocar primer elemento interactivo para accesibilidad
    const focusable = modal.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus();
    
    // Bloquear scroll del body mientras el modal está abierto
    document.body.style.overflow = 'hidden';
  },
  
  close: (modalId) => {
    const modal = safeGetElement(modalId);
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    
    // Restaurar scroll del body
    document.body.style.overflow = '';
  }
};

// ═══════════════════════════════════════════════════════════════════
//  PANEL CONTROLLER (datos mockeados para demostración)
// ═══════════════════════════════════════════════════════════════════
class PanelController {
  constructor() {
    this._fechaHoy = 'martes 24 de marzo 2026';

    this._proximaCita = {
      minutosRestantes: 15,
      hora: '10:00 AM',
      paciente: 'Pedro García',
      tipo: 'Control',
      profesional: 'Dr. Carlos Méndez',
      consultorio: 'Consultorio 1',
    };

    this._kpis = {
      citasHoy: 6,
      completadas: 2,
      pendientes: 3,
      consultoriosDisponibles: 2,
    };

    this._pacientes = [
      {
        id: 1, hora: '08:00', paciente: 'María López', profesional: 'Dr. Méndez',
        alergia: null, consultorio: 'Consultorio 1', estado: 'Atendida', highlight: false,
        telefono: '+57 310 456 7890', email: 'maria.lopez@email.com', sangre: 'A+', edad: '34 años',
        medicamentos: ['Ibuprofeno 400mg'],
        antecedentes: 'Sin antecedentes médicos relevantes.',
        servicio: 'Limpieza dental',
      },
      {
        id: 2, hora: '08:00', paciente: 'Carlos Ruiz', profesional: 'Dra. Gómez',
        alergia: null, consultorio: 'Consultorio 2', estado: 'Atendida', highlight: false,
        telefono: '+57 315 123 4567', email: 'carlos.ruiz@email.com', sangre: 'B+', edad: '45 años',
        medicamentos: [],
        antecedentes: 'Diabetes tipo 2 controlada.',
        servicio: 'Extracción muela del juicio',
      },
      {
        id: 3, hora: '10:00', paciente: 'Pedro García', profesional: 'Dr. Méndez',
        alergia: 'Penicilina', consultorio: 'Consultorio 1', estado: 'Pendiente', highlight: true,
        telefono: '+57 318 987 6543', email: 'pedro.garcia@email.com', sangre: 'O+', edad: '52 años',
        medicamentos: ['Enalapril 5mg'],
        antecedentes: 'Hipertensión arterial leve. Alérgico a penicilina.',
        servicio: 'Control de tratamiento',
      },
      {
        id: 4, hora: '11:00', paciente: 'Ana Martínez', profesional: 'Dr. Méndez',
        alergia: 'Látex', consultorio: 'Consultorio 1', estado: 'Pendiente', highlight: false,
        telefono: '+57 320 111 2233', email: 'ana.martinez@email.com', sangre: 'AB-', edad: '28 años',
        medicamentos: ['Ácido fólico'],
        antecedentes: 'Alergia al látex. Embarazada (12 semanas).',
        servicio: 'Control prenatal dental',
      },
      {
        id: 5, hora: '14:00', paciente: 'Luis Herrera', profesional: 'Dra. Ramírez',
        alergia: null, consultorio: 'Consultorio 2', estado: 'Pendiente', highlight: false,
        telefono: '+57 312 555 6677', email: 'luis.herrera@email.com', sangre: 'O-', edad: '19 años',
        medicamentos: [],
        antecedentes: 'Primera visita. Sin antecedentes médicos relevantes.',
        servicio: 'Valoración inicial',
      },
    ];

    this._alertas = [
      { tipo: 'warning', titulo: 'Paciente con alergia', desc: 'Pedro García — Alérgico a Penicilina' },
      { tipo: 'warning', titulo: 'Paciente con alergia', desc: 'Ana Martínez — Alérgica a Látex' },
      { tipo: 'info', titulo: 'Nuevo paciente', desc: 'Luis Herrera — Primera visita' },
    ];
  }

  // Devuelve resumen del panel con fecha, próxima cita y KPIs
  async getResumen() {
    return { fechaHoy: this._fechaHoy, proximaCita: { ...this._proximaCita }, kpis: { ...this._kpis } };
  }

  // Devuelve lista de citas para la tabla
  async getCitas() {
    return this._pacientes.map(p => ({
      id: p.id, hora: p.hora, paciente: p.paciente, profesional: p.profesional,
      alergia: p.alergia, consultorio: p.consultorio, estado: p.estado, highlight: p.highlight,
    }));
  }

  // Busca paciente por ID para mostrar en modal
  async getPaciente(id) {
    return this._pacientes.find(p => p.id === id) || null;
  }

  // Devuelve alertas del día para el panel lateral
  async getAlertas() {
    return [...this._alertas];
  }

  // Calcula progreso de citas completadas vs total
  async getProgreso() {
    const { completadas, citasHoy } = this._kpis;
    return { completadas, total: citasHoy, porcentaje: Math.round((completadas / citasHoy) * 100) };
  }

  // Simula generación de resumen PDF para descarga
  async descargarResumen() {
    return { ok: true, nombre: `panel_${this._fechaHoy.replace(/ /g, '_')}.pdf` };
  }
}

// Instancia única del controlador para toda la aplicación
const panelCtrl = new PanelController();

// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR MÓVIL CON GESTIÓN DE FOCO Y ARIA
// ═══════════════════════════════════════════════════════════════════
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
      
      // Enfocar primer enlace de navegación para accesibilidad
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

  // Cerrar menú al navegar en móvil
  sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 680) toggleMenu(false);
    });
  });

  // Cerrar menú con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: Header y alerta próxima cita
// ═══════════════════════════════════════════════════════════════════
const renderHeader = (resumen) => {
  const meta = safeGetElement('pageMeta');
  if (meta) meta.textContent = `Resumen en tiempo real · ${resumen.fechaHoy}`;

  const pc = resumen.proximaCita;
  const titulo = safeGetElement('apTitulo');
  const detalle = safeGetElement('apDetalle');
  
  if (titulo) titulo.textContent = `Próxima cita en ${pc.minutosRestantes} minutos`;
  if (detalle) detalle.textContent = `${pc.hora} · ${pc.paciente} · ${pc.tipo} · ${pc.profesional} · ${pc.consultorio}`;
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: KPI cards
// ═══════════════════════════════════════════════════════════════════
const renderKPIs = (kpis) => {
  const grid = safeGetElement('kpiGrid');
  if (!grid) return;

  const cards = [
    { num: kpis.citasHoy, label: 'Citas hoy', color: 'purple' },
    { num: kpis.completadas, label: 'Completadas', color: 'green' },
    { num: kpis.pendientes, label: 'Pendientes', color: 'orange' },
    { num: kpis.consultoriosDisponibles, label: 'Consultorios disponibles', color: 'blue' },
  ];

  grid.innerHTML = cards.map(c => `
    <div class="kpi-card" data-color="${c.color}">
      <span class="kpi-value">${c.num}</span>
      <span class="kpi-label">${c.label}</span>
    </div>
  `).join('');
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: Barra de progreso con accesibilidad ARIA
// ═══════════════════════════════════════════════════════════════════
const renderProgreso = (progreso) => {
  const barra = safeGetElement('progresoBarra');
  const label = safeGetElement('progresoLabel');
  const progressEl = barra?.closest('[role="progressbar"]');
  
  if (barra) barra.style.width = `${progreso.porcentaje}%`;
  if (label) label.textContent = `${progreso.completadas} de ${progreso.total} citas completadas hoy`;
  if (progressEl) {
    progressEl.setAttribute('aria-valuenow', progreso.porcentaje);
    progressEl.setAttribute('aria-valuetext', `${progreso.porcentaje}% completado`);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: Tabla de citas con atributos ARIA
// ═══════════════════════════════════════════════════════════════════
const renderCitas = (citas) => {
  const tbody = safeGetElement('citasBody');
  if (!tbody) return;

  tbody.innerHTML = citas.map(c => {
    const badgeEstado = c.estado === 'Atendida'
      ? `<span class="badge-estado badge-atendida" role="status" aria-label="Estado: Atendida">● ${c.estado}</span>`
      : c.estado === 'Pendiente'
      ? `<span class="badge-estado badge-pendiente" role="status" aria-label="Estado: Pendiente">● ${c.estado}</span>`
      : `<span class="badge-estado badge-cancelada" role="status" aria-label="Estado: Cancelada">● ${c.estado}</span>`;

    const badgeAlergia = c.alergia
      ? `<span class="badge-alergia" aria-label="Alergia: ${c.alergia}">🚨 ${c.alergia}</span>`
      : `<span style="color:var(--text-muted)" aria-label="Sin alergias">—</span>`;

    return `
      <tr class="${c.highlight ? 'row-highlight' : ''}" role="row">
        <td class="col-hora">${c.hora}</td>
        <td class="col-paciente">${c.paciente}</td>
        <td>${c.profesional}</td>
        <td class="col-alergia">${badgeAlergia}</td>
        <td>${c.consultorio}</td>
        <td class="col-estado">${badgeEstado}</td>
        <td>
          <button class="btn-icon" title="Ver paciente" data-action="view" data-id="${c.id}" aria-label="Ver detalles de ${c.paciente}">👁️</button>
        </td>
      </tr>
    `;
  }).join('');
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: Alertas del día con role list
// ═══════════════════════════════════════════════════════════════════
const renderAlertas = (alertas) => {
  const list = safeGetElement('alertasList');
  if (!list) return;

  list.innerHTML = alertas.map(a => {
    const icoClass = a.tipo === 'warning' ? 'warning' : 'info';
    const icoEmoji = a.tipo === 'warning' ? '⚠️' : 'ℹ️';
    return `
      <div class="alerta-item" role="listitem">
        <div class="alerta-icon ${icoClass}" aria-hidden="true">${icoEmoji}</div>
        <div class="alerta-content">
          <p class="alerta-title">${a.titulo}</p>
          <p class="alerta-desc">${a.desc}</p>
        </div>
      </div>
    `;
  }).join('');
};

// ═══════════════════════════════════════════════════════════════════
//  MODAL: Ver paciente con datos completos
// ═══════════════════════════════════════════════════════════════════
const verPaciente = async (id) => {
  const p = await panelCtrl.getPaciente(id);
  if (!p) return;

  const initials = p.paciente.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Llena campos del modal con datos del paciente
  const fields = {
    modalAvatar: initials,
    modalName: p.paciente,
    modalRole: `Paciente · ID #${String(p.id).padStart(3, '0')}`,
    modalTelefono: p.telefono,
    modalEmail: p.email,
    modalSangre: p.sangre,
    modalEdad: p.edad,
    modalServicio: p.servicio,
    modalProfesional: p.profesional,
    modalConsultorio: p.consultorio,
    modalHora: p.hora,
    modalAntecedentes: p.antecedentes
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = safeGetElement(id);
    if (el) el.textContent = value;
  });

  // Alergias con estado visual
  const alergiaEl = safeGetElement('modalAlergias');
  if (alergiaEl) {
    if (p.alergia) {
      alergiaEl.textContent = `🚨 ${p.alergia}`;
      alergiaEl.className = 'modal-alergia-tag';
      alergiaEl.setAttribute('aria-label', `Alergia: ${p.alergia}`);
    } else {
      alergiaEl.textContent = '✓ Sin alergias registradas';
      alergiaEl.className = 'modal-alergia-tag sin-alergia';
      alergiaEl.setAttribute('aria-label', 'Sin alergias registradas');
    }
  }

  // Medicamentos como lista de tags
  const mediEl = safeGetElement('modalMedicamentos');
  if (mediEl) {
    if (p.medicamentos?.length) {
      mediEl.innerHTML = p.medicamentos.map(m => 
        `<span class="modal-medi-tag" role="listitem">${m}</span>`
      ).join('');
      mediEl.setAttribute('role', 'list');
    } else {
      mediEl.innerHTML = '<span class="modal-medi-tag sin-medicamentos">Sin medicamentos actuales</span>';
      mediEl.removeAttribute('role');
    }
  }

  // Abre modal con gestión de accesibilidad
  modalManager.open('modalBackdrop');
};

// ═══════════════════════════════════════════════════════════════════
//  EVENTOS: Manejo de acciones en tabla y modal
// ═══════════════════════════════════════════════════════════════════
const initTableActions = () => {
  const tbody = safeGetElement('citasBody');
  if (!tbody) return;

  // Event delegation para botones de acción en tabla
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'view' && id) {
      verPaciente(parseInt(id));
    }
  });

  // Soporte para teclado en botones de acción
  tbody.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-action]')) {
      e.preventDefault();
      e.target.click();
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  EVENTOS: Manejo de modales con teclado y cierre
// ═══════════════════════════════════════════════════════════════════
const initModalHandlers = () => {
  const modal = safeGetElement('modalBackdrop');
  const closeBtn = safeGetElement('modalCloseBtn');
  const closeBtn2 = safeGetElement('modalCloseBtn2');
  const verHistoriaBtn = safeGetElement('modalVerHistoria');

  // Cerrar modal con botón X
  if (closeBtn) closeBtn.addEventListener('click', () => modalManager.close('modalBackdrop'));
  if (closeBtn2) closeBtn2.addEventListener('click', () => modalManager.close('modalBackdrop'));
  
  // Cerrar modal al hacer click en overlay
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modalManager.close('modalBackdrop');
    });
  }
  
  // Ver historia clínica (simulado)
  if (verHistoriaBtn) {
    verHistoriaBtn.addEventListener('click', () => {
      showToast('📋 Redirigiendo a Historia Parcial del Paciente…', 'info');
      modalManager.close('modalBackdrop');
    });
  }
  
  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modalManager.close('modalBackdrop');
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  EVENTOS: Descargar resumen con feedback visual
// ═══════════════════════════════════════════════════════════════════
const initDescargarResumen = () => {
  const btn = safeGetElement('btnDescargar');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const original = btn.textContent;
    btn.textContent = '⏳ Generando...';
    btn.disabled = true;

    try {
      const res = await panelCtrl.descargarResumen();
      btn.textContent = '✓ Descargado';
      btn.style.color = 'var(--green)';
      btn.style.borderColor = 'var(--green)';
      showToast(`Resumen generado: ${res.nombre}`, 'success');

      setTimeout(() => {
        btn.textContent = original;
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.disabled = false;
      }, 2000);
    } catch {
      btn.textContent = original;
      btn.disabled = false;
      showToast('Error al generar resumen', 'error');
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  INIT: Función principal de inicialización
// ═══════════════════════════════════════════════════════════════════
const init = async () => {
  // Inicializar componentes de UI
  initMobileMenu();
  initTableActions();
  initModalHandlers();
  initDescargarResumen();

  // Cargar y renderizar datos del panel
  const [resumen, citas, alertas, progreso] = await Promise.all([
    panelCtrl.getResumen(),
    panelCtrl.getCitas(),
    panelCtrl.getAlertas(),
    panelCtrl.getProgreso(),
  ]);

  renderHeader(resumen);
  renderKPIs(resumen.kpis);
  renderProgreso(progreso);
  renderCitas(citas);
  renderAlertas(alertas);
  
  // Limpieza de listeners al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);