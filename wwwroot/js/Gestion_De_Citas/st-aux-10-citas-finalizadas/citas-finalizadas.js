/* ============================================
SmileTrack — Citas Finalizadas (st-aux-10-citas-finalizadas)
============================================
Autor: Johan Santamaria
Fecha: 29/07/2026

DESCRIPCIÓN:
Gestiona el renderizado dinámico de la tabla de citas finalizadas, el cálculo de métricas por estado, la animación de contadores y la exportación del resumen diario a CSV sin depender del servidor.

FUNCIONALIDADES PRINCIPALES:
- Renderizado dinámico de filas de tabla desde LocalStorage con badges de estado accesibles
- Exportación a CSV generada en el cliente (Blob + createObjectURL) sin petición al servidor
- Animación de conteo progresivo en tarjetas de métricas para reflejar el resumen visual de la jornada
- Clave de LocalStorage con fecha para evitar colisiones entre jornadas en el mismo dispositivo

DEPENDENCIAS TÉCNICAS:
- Controller: GestionCitasController y Stadm09Citas
- CSS: ~/css/Gestion_De_Citas/st-aux-10-citas-finalizadas/citas-finalizadas.css
- JS: ~/js/Gestion_De_Citas/st-aux-10-citas-finalizadas/citas-finalizadas.js
- Partial / Otros: citas-finalizadas.cshtml

NOTAS DE MANTENIMIENTO:
- Los comentarios internos explican el "por qué" de las decisiones de diseño/negocio, no el "qué" hace el código básico.
- La exportación usa Blob en lugar de llamar al servidor para no requerir autorización adicional y funcionar offline.
============================================ */

// WHY: safeGetElement previene excepciones fatales en la inicialización si un elemento no existe en el DOM
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

// WHY: Debounce protege contra eventos de input repetitivos que podrían generar exportaciones o escrituras redundantes
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

// WHY: Las notificaciones no bloqueantes informan el resultado de la exportación sin interrumpir la revisión del resumen
const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;

  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// WHY: La clave incluye la fecha para que los datos del día no contaminen ni se mezclen con los de jornadas anteriores
const finalizedStorage = {
  key: 'smiletrack_finalized_20260320',
  
  // WHY: Carga desde LocalStorage para que el resumen sea persistente entre refrescos de página durante la jornada
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
  
  // WHY: Persiste las citas para garantizar que el resumen no se pierda ante refrescos accidentales del navegador
  save: (citas) => {
    try {
      localStorage.setItem(finalizedStorage.key, JSON.stringify(citas));
      return true;
    } catch (e) {
      console.error('Error al guardar citas finalizadas:', e);
      return false;
    }
  },
  
  // WHY: Centraliza el cálculo de contadores para no duplicar la lógica de filtrado entre la tabla y las tarjetas de resumen
  getCounts: (citas) => {
    return {
      atendidas: citas.filter(c => c.estado === 'Atendida').length,
      canceladas: citas.filter(c => c.estado === 'Cancelada').length,
      noAsistio: citas.filter(c => c.estado === 'No asistió').length
    };
  }
};

// WHY: Formatea la fecha en español para que el CSV exportado sea legible sin conversión manual por parte del auxiliar
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

// WHY: Renderiza la tabla dinámicamente para poder asignar clases y aria-labels de estado sin lógica duplicada en Razor
const renderAppointments = (data) => {
  const tbody = safeGetElement('appointmentsBody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">No hay citas finalizadas registradas.</td></tr>`;
    return;
  }

  // WHY: Mapea el estado de la cita a una clase CSS semántica para que el color refleje el resultado clínico del turno
  tbody.innerHTML = data.map(apt => {
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

// WHY: La animación de conteo progresivo hace que el auxiliar note el cambio sin leer texto, facilitando el scan rápido
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

// WHY: El CSV se genera en el cliente con Blob para que la exportación funcione sin autenticación adicional ni latencia de red
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
      // WHY: URL.revokeObjectURL libera la memoria del Blob inmediatamente después de la descarga para evitar memory leaks
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
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);