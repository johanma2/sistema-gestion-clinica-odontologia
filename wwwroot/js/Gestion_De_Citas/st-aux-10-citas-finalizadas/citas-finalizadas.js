/**
 * SMILETRACK — CITAS FINALIZADAS (app.js)
 * Lógica con persistencia, exportación y accesibilidad
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

// Gestiona persistencia de citas finalizadas con localStorage
const finalizedStorage = {
  key: 'smiletrack_finalized_20260320',
  
  // Carga citas desde localStorage o usa datos de ejemplo
  load: () => {
    const stored = localStorage.getItem(finalizedStorage.key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error al cargar citas finalizadas, usando datos de ejemplo');
      }
    }
    // Datos de ejemplo iniciales
    return [
      { id:1, hora:'08:00', paciente:'María López', profesional:'Dr. Méndez', servicio:'Consulta General', estado:'Atendida' },
      { id:2, hora:'09:00', paciente:'Pedro García', profesional:'Dr. Méndez', servicio:'Control', estado:'Atendida' },
      { id:3, hora:'10:00', paciente:'Ana Martínez', profesional:'Dr. Méndez', servicio:'Resina', estado:'Cancelada' },
      { id:4, hora:'11:00', paciente:'Luis Herrera', profesional:'Dra. Ramírez', servicio:'Consulta', estado:'Atendida' },
      { id:5, hora:'14:00', paciente:'Sandra Pérez', profesional:'Dr. Méndez', servicio:'Limpieza', estado:'Atendida' },
      { id:6, hora:'15:00', paciente:'Carlos Ruiz', profesional:'Dra. Gómez', servicio:'Extracción', estado:'No asistió' },
    ];
  },
  
  // Guarda citas en localStorage
  save: (citas) => {
    try {
      localStorage.setItem(finalizedStorage.key, JSON.stringify(citas));
      return true;
    } catch (e) {
      console.error('Error al guardar citas finalizadas:', e);
      return false;
    }
  },
  
  // Calcula contadores por estado
  getCounts: (citas) => {
    return {
      atendidas: citas.filter(c => c.estado === 'Atendida').length,
      canceladas: citas.filter(c => c.estado === 'Cancelada').length,
      noAsistio: citas.filter(c => c.estado === 'No asistió').length
    };
  }
};

// Formatea fecha para exportación
const formatDateForExport = () => {
  const now = new Date();
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`;
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

// Renderiza tabla de citas con atributos ARIA
const renderAppointments = (data) => {
  const tbody = safeGetElement('appointmentsBody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">No hay citas finalizadas registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(apt => {
    // Determina clase y label de estado para accesibilidad
    const statusClass = apt.estado === 'Atendida' ? 'atendida' : 
                       apt.estado === 'Cancelada' ? 'cancelada' : 'no-asistio';
    const statusLabel = `Estado: ${apt.estado}`;
    
    return `
      <tr role="row">
        <td class="td-hora">${apt.hora}</td>
        <td class="td-paciente">${apt.paciente}</td>
        <td class="td-profesional">${apt.profesional}</td>
        <td class="td-servicio">${apt.servicio}</td>
        <td><span class="status-badge ${statusClass}" role="status" aria-label="${statusLabel}">${apt.estado}</span></td>
      </tr>
    `;
  }).join('');
};

// Actualiza tarjetas de resumen con animación suave
const updateSummary = () => {
  const citas = finalizedStorage.load();
  const counts = finalizedStorage.getCounts(citas);
  
  const els = {
    atendidas: safeGetElement('countAtendidas'),
    canceladas: safeGetElement('countCanceladas'),
    noAsistio: safeGetElement('countNoAsistio')
  };
  
  // Actualiza contadores con transición numérica suave
  Object.entries(els).forEach(([key, el]) => {
    if (el) {
      const target = counts[key];
      const current = parseInt(el.textContent) || 0;
      
      if (current !== target) {
        // Animación simple de conteo
        let step = 0;
        const increment = target > current ? 1 : -1;
        const interval = setInterval(() => {
          step += increment;
          el.textContent = step;
          if (step === target) clearInterval(interval);
        }, 50);
      }
    }
  });
};

// Inicializa botón de exportación con generación de CSV
const initExportButton = () => {
  const btn = safeGetElement('btnExport');
  if (!btn) return;
  
  btn.addEventListener('click', async () => {
    const original = btn.innerHTML;
    btn.innerHTML = '⏳ Generando...';
    btn.disabled = true;
    
    try {
      // Carga citas desde storage
      const citas = finalizedStorage.load();
      const counts = finalizedStorage.getCounts(citas);
      
      // Genera contenido CSV
      const csvContent = [
        'Fecha de exportación,' + formatDateForExport(),
        '',
        'RESUMEN',
        'Estado,Cantidad',
        `Atendida,${counts.atendidas}`,
        `Cancelada,${counts.canceladas}`,
        `No asistió,${counts.noAsistio}`,
        `Total,${citas.length}`,
        '',
        'DETALLE DE CITAS',
        'Hora,Paciente,Profesional,Servicio,Estado',
        ...citas.map(c => `${c.hora},"${c.paciente}","${c.profesional}","${c.servicio}",${c.estado}`)
      ].join('\n');
      
      // Crea blob y descarga
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smiletrack_citas_finalizadas_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Feedback visual
      btn.innerHTML = '✓ Descargado';
      btn.style.background = '#dcfce7';
      btn.style.borderColor = '#22c55e';
      btn.style.color = '#166534';
      showToast('Resumen descargado exitosamente', 'success');
      
      // Restaura botón
      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
      
    } catch (error) {
      console.error('Error al exportar:', error);
      btn.innerHTML = original;
      btn.disabled = false;
      showToast('Error al generar resumen', 'error');
    }
  });
};

// Función principal de inicialización
const init = () => {
  try {
    // Inicializar componentes de UI
    initMobileMenu();
    initExportButton();
    
    // Cargar y renderizar datos
    const citas = finalizedStorage.load();
    renderAppointments(citas);
    updateSummary();
    
    // Limpieza de listeners al unload para evitar memory leaks
    window.addEventListener('beforeunload', () => {
      // Remover listeners en implementación SPA real
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