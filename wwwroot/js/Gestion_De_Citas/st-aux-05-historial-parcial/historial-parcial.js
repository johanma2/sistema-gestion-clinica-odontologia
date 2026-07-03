/**
 * SMILETRACK — HISTORIA PARCIAL DEL PACIENTE (app.js)
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

// ═══════════════════════════════════════════════════════════════════
//  HISTORIA PARCIAL CONTROLLER CON PERSISTENCIA
// ═══════════════════════════════════════════════════════════════════
class HistoriaParcialController {
  constructor() {
    this._paciente = {
      id: 1,
      nombre: 'Pedro García',
      tipoDoc: 'CC',
      documento: '1045678901',
      alergias: ['Penicilina'],
      medicamentos: ['Enalapril 5mg'],
      grupoSanguineo: 'O+',
      ultimaActualizacion: '20 Mar',
    };
    this._limite = 3;
    this._historial = [
      {
        id: 1,
        fecha: '10 Feb 2026',
        profesional: 'Dra. Laura Gómez',
        diagnostico: 'Sarro moderado supragingival. Gingivitis leve.',
        procedimiento: 'Detartraje supragingival completo con ultrasonido.',
      },
      {
        id: 2,
        fecha: '05 Ene 2026',
        profesional: 'Dr. Carlos Méndez',
        diagnostico: 'Caries incipiente en pieza 12.',
        procedimiento: 'Se realiza obturación con resina compuesta en cara vestibular.',
      },
      {
        id: 3,
        fecha: '20 Dic 2025',
        profesional: 'Dra. Laura Gómez',
        diagnostico: 'Caries incipiente en pieza 23.',
        procedimiento: 'Se realiza obturación con resina compuesta en cara vestibular.',
      },
    ];
  }

  // Devuelve datos del paciente para mostrar en header y alertas
  async getPaciente() {
    return { ...this._paciente };
  }

  // Devuelve alertas médicas formateadas para la UI
  async getAlertas() {
    return {
      alergias: [...this._paciente.alergias],
      medicamentos: [...this._paciente.medicamentos],
      grupoSanguineo: this._paciente.grupoSanguineo,
    };
  }

  // Devuelve consultas limitadas para la tabla de historial
  async getConsultas() {
    return this._historial.slice(0, this._limite);
  }

  // Genera string de metadatos para el header del paciente
  getMetaString() {
    const p = this._paciente;
    return `${p.nombre} · ${p.tipoDoc} ${p.documento} · Últimas ${this._limite} consultas · Acceso parcial · Actualizado: ${p.ultimaActualizacion}`;
  }
}

// Instancia única del controlador para toda la aplicación
const hpCtrl = new HistoriaParcialController();

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
//  RENDER: Alerta médica con actualización dinámica
// ═══════════════════════════════════════════════════════════════════
const renderAlerta = (alertas) => {
  // Función auxiliar para actualizar elementos por ID
  const updateElement = (id, value) => {
    const el = safeGetElement(id);
    if (el) {
      el.textContent = value || '—';
      // Actualiza aria-label para screen readers si el valor cambia
      el.setAttribute('aria-label', `${el.previousElementSibling?.textContent?.trim() || 'Valor'}: ${value || 'No disponible'}`);
    }
  };

  // Actualiza cada campo de alerta
  updateElement('alergia', alertas.alergias.join(', ') || 'Ninguna conocida');
  updateElement('medicamentos', alertas.medicamentos.join(', ') || 'Ninguno');
  updateElement('grupoSang', alertas.grupoSanguineo || '—');

  // Ajusta opacidad si no hay alertas relevantes
  const card = safeGetElement('alertaMedica');
  if (card && !alertas.alergias.length && !alertas.medicamentos.length) {
    card.style.opacity = '.6';
    card.setAttribute('aria-label', 'Sin alertas médicas registradas para este paciente');
  }
};

// ═══════════════════════════════════════════════════════════════════
//  RENDER: Tabla de historial con skeleton loader
// ═══════════════════════════════════════════════════════════════════
const renderTabla = (filas) => {
  const tbody = safeGetElement('histBody');
  const footer = safeGetElement('tableFooter');
  if (!tbody) return;

  // Muestra mensaje si no hay datos
  if (!filas.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:26px;color:var(--text-muted);font-size:.85rem;">Sin consultas registradas.</td></tr>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  // Remueve skeleton loader y renderiza filas reales
  tbody.innerHTML = filas.map(f => `
    <tr>
      <td class="td-fecha" data-label="Fecha">${f.fecha}</td>
      <td class="td-profesional" data-label="Profesional">${f.profesional}</td>
      <td data-label="Diagnóstico">${f.diagnostico}</td>
      <td data-label="Procedimiento">${f.procedimiento}</td>
    </tr>
  `).join('');
};

// ═══════════════════════════════════════════════════════════════════
//  INIT: Función principal de inicialización
// ═══════════════════════════════════════════════════════════════════
const init = async () => {
  // Inicializar componentes de UI
  initMobileMenu();

  // Cargar datos del paciente y historial en paralelo
  const [alertas, consultas] = await Promise.all([
    hpCtrl.getAlertas(),
    hpCtrl.getConsultas(),
  ]);

  // Actualiza metadatos del paciente en el header
  const metaEl = safeGetElement('patientMeta');
  if (metaEl) {
    metaEl.textContent = hpCtrl.getMetaString();
    metaEl.setAttribute('aria-label', `Información del paciente: ${hpCtrl.getMetaString()}`);
  }

  // Renderiza alerta médica y tabla de historial
  renderAlerta(alertas);
  renderTabla(consultas);

  // Limpieza de listeners al unload para evitar memory leaks
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);