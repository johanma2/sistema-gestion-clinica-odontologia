/**
 * ============================================
 * SmileTrack — Gestión Integral de Citas (st-adm-09-citas)
 * ============================================
 * Autor: Johan Santamaria
 * Fecha: 29/07/2026
 *
 * PROPÓSITO:
 * Gestiona la interactividad de la tabla de citas del administrador:
 * búsqueda debounced, filtrado local dinámico, control de modales,
 * y delega el guardado/cancelación al backend MVC en lugar de consumir
 * directamente un API REST PUT/DELETE en /api/citas.
 *
 * DECISIONES TÉCNICAS:
 * - Predomina SSR en la vista de citas del administrador
 * - Guardado / cancelación se realizan mediante formularios MVC existentes
 * - LocalStorage se usa solo como fallback de datos para el cliente
 * - Debounce en búsqueda para evitar recargas innecesarias
 * - Notificaciones no bloqueantes (toasts) para mejor UX
 *
 * NOTAS DE MANTENIMIENTO:
 * - Esta página no expone un endpoint genérico GET /api/citas para listado
 * - Los formularios deben publicar a /gestion-de-citas/guardar-cita y
 *   /gestion-de-citas/eliminar-cita según la implementación del backend
 * - El código cliente debe funcionar tanto con SSR como con datos locales
 * ============================================
 */

// ════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN API Y AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════

/**
 * Base URL de la API REST.
 * Se mantiene como '/api' según la configuración del proyecto.
 */
const API_BASE = '/api';

/**
 * Tamaño de página para paginación de API.
 */
const API_PAGE_SIZE = 100;

/**
 * Centraliza los headers de autenticación.
 * Primero intenta JWT (sessionStorage st_jwt),
 * si no existe el backend acepta Cookie Authentication
 * (política ApiOrCookie).
 *
 * @returns {Object} Headers con Content-Type, Accept y opcionalmente Authorization
 */
const getAuthHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        const jwt = sessionStorage.getItem('st_jwt');
        if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`;
        }
    } catch (error) {
        // sessionStorage deshabilitado (modo privado), se ignora silenciosamente
    }

    return headers;
};

// ════════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ════════════════════════════════════════════════════════════════════

/**
 * Obtiene un elemento del DOM de forma segura.
 * Previene excepciones fatales en la inicialización si un elemento no existe.
 *
 * @param {string} elementId - ID del elemento a buscar
 * @returns {HTMLElement|null} Elemento encontrado o null
 */
const safeGetElement = (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`[SmileTrack] Elemento no encontrado: #${elementId}`);
    }
    return element;
};

/**
 * Debounce para evitar saturar la API con peticiones redundantes
 * ante cambios veloces del usuario (ej: typing en búsqueda).
 *
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Milisegundos de espera
 * @returns {Function} Función debounced
 */
const debounce = (callback, delay) => {
    let timeoutId;

    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback.apply(this, args), delay);
    };
};

/**
 * Muestra una notificación toast no bloqueante.
 * Brinda retroalimentación al usuario sin entorpecer el flujo de trabajo.
 *
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de toast: 'success', 'error', 'warning'
 */
const showToast = (message, type = 'success') => {
    const toastElement = safeGetElement('toast');
    if (!toastElement) return;

    toastElement.textContent = message;

    // Construir clases CSS según el tipo
    const toastClasses = ['toast'];
    if (type === 'error') toastClasses.push('error');
    if (type === 'warning') toastClasses.push('warning');
    toastClasses.push('show');
    toastElement.className = toastClasses.join(' ');

    // Limpiar timeout anterior si existe
    if (toastElement._timeoutId) {
        clearTimeout(toastElement._timeoutId);
    }

    // Programar ocultamiento después de 3.5 segundos
    toastElement._timeoutId = setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3500);
};

/**
 * Abre el modal de Crear/Editar Cita y gestiona el cierre por click fuera.
 * Se asigna a window directamente para que esté disponible ANTES de que el
 * inline script de la vista se registre en DOMContentLoaded (evita problema
 * de orden de carga: JS carga primero, luego inline script lo sobrescribe).
 */
window.openModalCita = () => {
    const modal = document.getElementById('modalCita');
    if (!modal) return;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('inert');
    document.body.style.overflow = 'hidden';

    modal.addEventListener('click', function outsideHandler(e) {
        if (e.target === modal) {
            window.closeModalCita();
            modal.removeEventListener('click', outsideHandler);
        }
    });
};

/**
 * Cierra el modal de Crear/Editar Cita y restaura el scroll del body.
 */
window.closeModalCita = () => {
    const modal = document.getElementById('modalCita');
    if (!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    document.body.style.overflow = '';
};

// ════════════════════════════════════════════════════════════════════
//  MAPEO ENTRE FORMATOS: Server (JSON) ↔ Cliente (fila renderizada)
// ════════════════════════════════════════════════════════════════════

/**
 * Paleta de colores para avatares generados dinámicamente.
 */
const AVATAR_COLOR_PALETTE = ['blue', 'green', 'purple', 'red', 'slate'];

/**
 * Selecciona un color de la paleta basado en las iniciales del nombre.
 * Usa un hash simple para distribuir colores de manera consistente.
 *
 * @param {string} initials - Iniciales del nombre
 * @returns {string} Color de la paleta
 */
const pickColorByInitials = (initials) => {
    if (!initials) return 'blue';

    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
        hash = ((hash << 5) - hash) + initials.charCodeAt(i);
    }

    return AVATAR_COLOR_PALETTE[Math.abs(hash) % AVATAR_COLOR_PALETTE.length];
};

/**
 * Extrae las iniciales de un nombre completo.
 *
 * @param {string} fullName - Nombre completo
 * @returns {string} Iniciales en mayúsculas (2 caracteres)
 */
const getInitials = (fullName) => {
    if (!fullName) return 'XX';

    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return 'XX';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Genera un slug a partir de un nombre completo.
 * Útil para crear identificadores consistentes de profesionales.
 *
 * @param {string} fullName - Nombre completo
 * @returns {string} Slug en minúsculas sin caracteres especiales
 */
const slugFromName = (fullName) => {
    if (!fullName) return 'profesional';

    return fullName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9]+/g, '')      // Eliminar caracteres especiales
        .trim() || 'profesional';
};

/**
 * Mapea el formato del servidor al formato del cliente.
 *
 * Formato servidor: { IdCita, Paciente.NombreCompleto, Profesional.NombreCompleto, FechaHora ISO, Estado }
 * Formato cliente: { id, date, time, patient, doc, professional (slug), professionalName, service, status, avatar, color }
 *
 * @param {Object} serverData - Datos del servidor
 * @returns {Object} Datos formateados para el cliente
 */
const mapServerToClient = (serverData) => {
    const fechaHora = serverData.FechaHora ? new Date(serverData.FechaHora) : null;

    // Extraer componentes de fecha
    const year = fechaHora ? fechaHora.getFullYear() : 0;
    const month = fechaHora ? String(fechaHora.getMonth() + 1).padStart(2, '0') : '01';
    const day = fechaHora ? String(fechaHora.getDate()).padStart(2, '0') : '01';
    const hours = fechaHora ? String(fechaHora.getHours()).padStart(2, '0') : '09';
    const minutes = fechaHora ? String(fechaHora.getMinutes()).padStart(2, '0') : '00';

    // Datos del paciente
    const patientFullName = serverData.Paciente?.NombreCompleto || '—';
    const patientInitials = getInitials(patientFullName);
    const patientColor = pickColorByInitials(patientInitials);

    // El servidor no expone Documento/Paciente en listado;
    // usamos "Id" como identificación temporal.
    // Si se requiere cédula, ampliar ApiListarCitas con Paciente.Documento.
    const documentId = serverData.IdPaciente ? `#${serverData.IdPaciente}` : '—';

    return {
        id: serverData.IdCita,
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
        patient: patientFullName,
        doc: documentId,
        professional: slugFromName(serverData.Profesional?.NombreCompleto),
        professionalName: serverData.Profesional?.NombreCompleto || 'Sin asignar',
        service: serverData.Servicio?.Nombre || 'Sin servicio',
        status: mapEstadoServerToClient(serverData.Estado),
        avatar: patientInitials,
        color: patientColor,
        _raw: serverData
    };
};

/**
 * Mapea el estado del servidor al estado del cliente.
 *
 * @param {string} estado - Estado del servidor
 * @returns {string} Estado normalizado para el cliente
 */
const mapEstadoServerToClient = (estado) => {
    if (!estado) return 'programada';

    const estadoNormalized = estado.toLowerCase().trim();

    if (estadoNormalized === 'atendida' || estadoNormalized === 'finalizada' || estadoNormalized === 'en_proceso') {
        return 'atendida';
    }
    if (estadoNormalized === 'no_asistida') {
        return 'no-show';
    }
    if (['programada', 'confirmada', 'cancelada'].includes(estadoNormalized)) {
        return estadoNormalized;
    }

    return 'programada';
};

/**
 * Mapea el estado del cliente al estado del servidor.
 *
 * @param {string} estado - Estado del cliente
 * @returns {string} Estado normalizado para el servidor
 */
const mapEstadoClientToServer = (estado) => {
    if (estado === 'atendida') return 'finalizada';
    if (estado === 'no-show') return 'no_asistida';
    return estado || 'programada';
};

// ════════════════════════════════════════════════════════════════════
//  PERSISTENCIA CON LOCALSTORAGE (FALLBACK OFFLINE)
// ════════════════════════════════════════════════════════════════════

/**
 * Módulo de almacenamiento local para citas.
 * Permite simular persistencia de datos en modo offline.
 */
const appointmentsStorage = {
    key: 'smiletrack_citas_admin',

    /**
     * Carga las citas desde LocalStorage.
     * Si no hay datos, retorna datos de ejemplo para desarrollo.
     *
     * @returns {Array} Array de citas
     */
    load: () => {
        const stored = localStorage.getItem(appointmentsStorage.key);

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.warn('Error al cargar citas locales, usando datos de ejemplo');
            }
        }

        // ═══ DATOS DE EJEMPLO ÚNICAMENTE CUANDO LA API ESTÁ INALCANZABLE ═══
        return [
            { id: 1, date: '2026-05-24', time: '09:30', patient: 'Julián Restrepo', doc: '10239485', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Limpieza Dental', status: 'programada', avatar: 'JR', color: 'blue' },
            { id: 2, date: '2026-05-24', time: '11:00', patient: 'Lucía Torres', doc: '52109432', professional: 'sotelo', professionalName: 'Dra. Elena Sotelo', service: 'Ortodoncia', status: 'confirmada', avatar: 'LT', color: 'green' },
            { id: 3, date: '2026-05-24', time: '14:15', patient: 'Mariana Esparza', doc: '88764321', professional: 'ruiz', professionalName: 'Dr. Carlos Ruiz', service: 'Endodoncia', status: 'atendida', avatar: 'ME', color: 'purple' },
            { id: 4, date: '2026-05-24', time: '16:00', patient: 'Sebastián Correa', doc: '11098452', professional: 'sotelo', professionalName: 'Dra. Elena Sotelo', service: 'Extracción', status: 'cancelada', avatar: 'SC', color: 'red' },
            { id: 5, date: '2026-05-24', time: '17:30', patient: 'Mónica Giraldo', doc: '32109876', professional: 'mendez', professionalName: 'Dr. Ricardo Méndez', service: 'Valoración', status: 'no-show', avatar: 'MG', color: 'slate' }
        ];
    },

    /**
     * Guarda las citas en LocalStorage.
     *
     * @param {Array} data - Array de citas a guardar
     * @returns {boolean} True si se guardó exitosamente
     */
    save: (data) => {
        try {
            localStorage.setItem(appointmentsStorage.key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error al guardar citas locales:', error);
            return false;
        }
    },

    /**
     * Agrega una nueva cita al almacenamiento local.
     *
     * @param {Object} appointment - Cita a agregar
     * @returns {Object} Cita agregada con ID asignado
     */
    addAppointment: (appointment) => {
        const data = appointmentsStorage.load();
        appointment.id = data.length > 0 ? Math.max(...data.map(a => a.id)) + 1 : 1;
        data.unshift(appointment);
        appointmentsStorage.save(data);
        return appointment;
    },

    /**
     * Obtiene una cita por su ID desde el almacenamiento local.
     *
     * @param {number} id - ID de la cita
     * @returns {Object|undefined} Cita encontrada o undefined
     */
    getAppointment: (id) => {
        return appointmentsStorage.load().find(appointment => appointment.id === id);
    }
};

// ════════════════════════════════════════════════════════════════════
//  DATOS Y ESTADO DE LA APLICACIÓN
// ════════════════════════════════════════════════════════════════════

/**
 * Estado global de la aplicación.
 * Se inicializa con datos del almacenamiento local.
 */
let appointments = appointmentsStorage.load();
let searchQuery = '';
let filterStatus = '';
let filterProfessional = '';
let filterDate = '';
let currentTab = 'all';
let currentPage = 1;
const itemsPerPage = 5;

/**
 * Mapeo de colores para avatares de pacientes.
 */
const avatarColors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600'
};

/**
 * Determina si se debe usar la lista renderizada en servidor (Razor).
 * Actualmente retorna false para activar renderizado cliente con API.
 *
 * @returns {boolean} True para usar renderizado servidor
 */
const shouldUseServerRenderedList = () => {
    const tbody = document.getElementById('citasBody');
    return !!(tbody && tbody.children.length > 0 && tbody.querySelector('.table-row'));
};

/**
 * Configuración de labels y clases CSS para cada estado de cita.
 */
const statusLabels = {
    programada: { label: 'Programada', class: 'programada' },
    confirmada: { label: 'Confirmada', class: 'confirmada' },
    atendida: { label: 'Atendida', class: 'atendida' },
    cancelada: { label: 'Cancelada', class: 'cancelada' },
    'no-show': { label: 'No asistió', class: 'cancelada' }
};

// ════════════════════════════════════════════════════════════════════
//  UTILIDADES DE FORMATO
// ════════════════════════════════════════════════════════════════════

/**
 * Formatea una fecha ISO a formato legible en español.
 *
 * @param {string} isoDate - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {string} Fecha formateada (ej: "24 May 2026")
 */
const fmtDate = (isoDate) => {
    if (!isoDate) return '—';

    const [year, month, day] = isoDate.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return `${parseInt(day)} ${meses[parseInt(month) - 1]} ${year}`;
};

/**
 * Formatea una hora de 24h a formato 12h con AM/PM.
 *
 * @param {string} time - Hora en formato HH:MM
 * @returns {string} Hora formateada (ej: "2:30 PM")
 */
const fmtTime = (time) => {
    if (!time) return '—';

    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

    return `${displayHour}:${minutes} ${period}`;
};

// ════════════════════════════════════════════════════════════════════
//  FILTRADO COMBINADO
// ════════════════════════════════════════════════════════════════════

/**
 * Filtra las citas según todos los criterios activos.
 * Combina búsqueda, filtros de estado, profesional, fecha y tab actual.
 *
 * @returns {Array} Array de citas filtradas
 */
const getFilteredAppointments = () => {
    return appointments.filter(appointment => {
        // Filtrar por tab actual
        if (currentTab === 'cancelled' && appointment.status !== 'cancelada') return false;
        if (currentTab === 'no-show' && appointment.status !== 'no-show') return false;

        // Filtrar por estado
        if (filterStatus && appointment.status !== filterStatus) return false;

        // Filtrar por profesional
        if (filterProfessional && appointment.professional !== filterProfessional) return false;

        // Filtrar por fecha
        if (filterDate && appointment.date !== filterDate) return false;

        // Filtrar por búsqueda de texto
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const patientMatch = appointment.patient.toLowerCase().includes(query);
            const docMatch = String(appointment.doc).toLowerCase().includes(query);

            if (!patientMatch && !docMatch) return false;
        }

        return true;
    });
};

// ════════════════════════════════════════════════════════════════════
//  RENDER: TABLA DE CITAS
// ════════════════════════════════════════════════════════════════════

/**
 * Renderiza la tabla de citas con los datos filtrados y paginados.
 * Incluye event listeners para botones de acción.
 */
const renderAppointments = () => {
    const tableBody = safeGetElement('citasBody');
    if (!tableBody || shouldUseServerRenderedList()) return;

    const filteredAppointments = getFilteredAppointments();

    // Mostrar estado vacío si no hay resultados
    if (!filteredAppointments.length) {
        tableBody.innerHTML = '<div class="empty-state" role="status">No se encontraron citas con los criterios de búsqueda.</div>';
        updatePagination(0);
        return;
    }

    // Calcular paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageData = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);

    // Renderizar filas de la tabla
    tableBody.innerHTML = pageData.map(appointment => {
        const status = statusLabels[appointment.status] || statusLabels.programada;

        return `
            <div class="table-row" role="row" tabindex="0" aria-label="Cita de ${appointment.patient} el ${fmtDate(appointment.date)}">
                <div class="table-col col-fecha" role="cell" data-label="Fecha">
                    <time datetime="${appointment.date}">${fmtDate(appointment.date)}</time>
                </div>
                <div class="table-col col-hora" role="cell" data-label="Hora">
                    <time datetime="${appointment.date}T${appointment.time}:00">${fmtTime(appointment.time)}</time>
                </div>
                <div class="table-col col-paciente" role="cell" data-label="Paciente">
                    <div class="patient-info">
                        <div class="patient-avatar ${avatarColors[appointment.color] || avatarColors.blue}" aria-hidden="true">
                            ${appointment.avatar}
                        </div>
                        <div>
                            <span class="patient-name">${appointment.patient}</span>
                            <span class="patient-id">ID: ${appointment.doc}</span>
                        </div>
                    </div>
                </div>
                <div class="table-col col-profesional" role="cell" data-label="Profesional">
                    ${appointment.professionalName}
                </div>
                <div class="table-col col-servicio" role="cell" data-label="Servicio">
                    ${appointment.service}
                </div>
                <div class="table-col col-estado text-center" role="cell" data-label="Estado">
                    <span class="status-badge ${status.class}" role="status" aria-label="Estado: ${status.label}">
                        ${status.label}
                    </span>
                </div>
                <div class="table-col col-acciones text-right" role="cell" data-label="Acciones">
                    <div class="actions-cell">
                        <button class="action-btn btn-view" aria-label="Ver detalle de cita de ${appointment.patient}" data-id="${appointment.id}" title="Ver">👁️</button>
                        <button class="action-btn btn-edit" aria-label="Editar cita de ${appointment.patient}" data-id="${appointment.id}" title="Editar">✏️</button>
                        <button class="action-btn btn-delete" aria-label="Cancelar cita de ${appointment.patient}" data-id="${appointment.id}" title="Cancelar">❌</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Agregar event listeners a botones de ver
    tableBody.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', (event) => {
            openAppointmentModal(parseInt(event.currentTarget.dataset.id), 'view');
        });
        button.addEventListener('keydown', (event) => {
            if (['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                openAppointmentModal(parseInt(event.currentTarget.dataset.id), 'view');
            }
        });
    });

    // Agregar event listeners a botones de editar
    tableBody.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (event) => {
            openAppointmentModal(parseInt(event.currentTarget.dataset.id), 'edit');
        });
        button.addEventListener('keydown', (event) => {
            if (['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                openAppointmentModal(parseInt(event.currentTarget.dataset.id), 'edit');
            }
        });
    });

    // Agregar event listeners a botones de eliminar
    tableBody.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (event) => {
            cancelAppointment(parseInt(event.currentTarget.dataset.id));
        });
        button.addEventListener('keydown', (event) => {
            if (['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                cancelAppointment(parseInt(event.currentTarget.dataset.id));
            }
        });
    });

    updatePagination(filteredAppointments.length);
};

// ════════════════════════════════════════════════════════════════════
//  MODAL DE CITA
// ════════════════════════════════════════════════════════════════════

/**
 * Obtiene una cita por su ID, buscando primero en memoria y luego en storage.
 *
 * @param {number} id - ID de la cita
 * @returns {Object|undefined} Cita encontrada o undefined
 */
const getAppointmentById = (id) => {
    const inMemory = appointments.find(appointment => appointment.id === id);
    if (inMemory) return inMemory;
    return appointmentsStorage.getAppointment(id);
};

/**
 * Abre el modal de cita en modo vista o edición.
 *
 * @param {number} id - ID de la cita
 * @param {string} mode - Modo: 'view' o 'edit'
 */
const openAppointmentModal = (id, mode) => {
    const appointment = getAppointmentById(id);

    if (!appointment) {
        showToast('Cita no encontrada', 'warning');
        return;
    }

    const modalElement = safeGetElement('modalAppointment');
    const contentElement = safeGetElement('modalAppointmentContent');
    const titleElement = safeGetElement('modalAppointmentTitle');
    const editButton = safeGetElement('modalAppointmentEdit');

    if (!modalElement || !contentElement || !titleElement) return;

    if (mode === 'view') {
        // Modo visualización
        titleElement.textContent = `Detalle: ${appointment.patient}`;
        editButton.style.display = 'none';

        contentElement.innerHTML = `
            <p><strong>Fecha:</strong> <time datetime="${appointment.date}">${fmtDate(appointment.date)}</time></p>
            <p><strong>Hora:</strong> <time datetime="${appointment.date}T${appointment.time}:00">${fmtTime(appointment.time)}</time></p>
            <p><strong>Documento / ID:</strong> ${appointment.doc}</p>
            <p><strong>Profesional:</strong> ${appointment.professionalName}</p>
            <p><strong>Servicio:</strong> ${appointment.service}</p>
            <p><strong>Estado:</strong> 
                <span class="status-badge ${statusLabels[appointment.status]?.class || 'programada'}">
                    ${statusLabels[appointment.status]?.label || appointment.status}
                </span>
            </p>
        `;
    } else {
        // Modo edición
        titleElement.textContent = `Editar: ${appointment.patient}`;
        editButton.style.display = 'inline-flex';
        editButton.textContent = 'Guardar';

        contentElement.innerHTML = `
            <p>
                <strong>Fecha:</strong> 
                <input type="date" value="${appointment.date}" id="editDate" class="filter-date" style="margin-left:8px">
            </p>
            <p>
                <strong>Hora:</strong> 
                <input type="time" value="${appointment.time}" id="editTime" class="filter-select" style="margin-left:8px">
            </p>
            <p>
                <strong>Servicio:</strong> 
                <input type="text" value="${appointment.service}" id="editService" class="search-input" style="margin-left:8px;width:200px" placeholder="Nombre servicio">
            </p>
            <p>
                <strong>Estado:</strong> 
                <select id="editStatus" class="filter-select" style="margin-left:8px">
                    <option value="programada" ${appointment.status === 'programada' ? 'selected' : ''}>Programada</option>
                    <option value="confirmada" ${appointment.status === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                    <option value="atendida" ${appointment.status === 'atendida' ? 'selected' : ''}>Atendida</option>
                    <option value="cancelada" ${appointment.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                </select>
            </p>
        `;

        editButton.onclick = () => saveAppointmentEdit(id);
    }

    // Mostrar modal
    modalElement.classList.add('open');
    modalElement.setAttribute('aria-hidden', 'false');
    modalElement.removeAttribute('inert');
    document.body.style.overflow = 'hidden';

    // Focus en botón de cerrar para accesibilidad
    const closeButton = safeGetElement('modalAppointmentClose');
    if (closeButton) closeButton.focus();
};

/**
 * Cierra el modal de cita y restaura el scroll del body.
 */
const closeAppointmentModal = () => {
    const modalElement = safeGetElement('modalAppointment');

    if (modalElement) {
        modalElement.classList.remove('open');
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.setAttribute('inert', '');
        document.body.style.overflow = '';
    }
};

/**
 * Guarda los cambios de una cita mediante el formulario MVC existente.
 * No depende de un endpoint PUT /api/citas/{id} directo.
 *
 * @param {number} id - ID de la cita a actualizar
 */
const saveAppointmentEdit = (id) => {
    const appointment = getAppointmentById(id);
    if (!appointment) return;

    const rawData = appointment._raw || {};
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    if (!tokenInput) {
        showToast('No se pudo guardar la cita: token antiforgery no encontrado.', 'error');
        return;
    }

    const form = document.createElement('form');
    form.method = 'post';
    form.action = '/gestion-de-citas/guardar-cita';
    form.style.display = 'none';

    const fields = {
        __RequestVerificationToken: tokenInput.value,
        ReturnUrl: window.location.pathname + window.location.search,
        IdCita: id,
        IdPaciente: rawData.IdPaciente || appointment.id || 0,
        IdProfesional: rawData.IdProfesional || 0,
        IdConsultorio: rawData.IdConsultorio || 0,
        IdServicio: rawData.IdServicio || 0,
        IdEstado: rawData.IdEstado || 0,
        Fecha: safeGetElement('editDate')?.value || appointment.date,
        HoraInicio: safeGetElement('editTime')?.value || appointment.time,
        Estado: safeGetElement('editStatus')?.value || rawData.Estado || appointment.status,
        Notas: rawData.Notas || ''
    };

    Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value ?? '');
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
};

/**
 * Cancela una cita con confirmación y DELETE soft (server: Estado=cancelada).
 *
 * @param {number} id - ID de la cita a cancelar
 */
const cancelAppointment = (id) => {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) return;

    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    if (!tokenInput) {
        showToast('No se pudo cancelar la cita: token antiforgery no encontrado.', 'error');
        return;
    }

    const form = document.createElement('form');
    form.method = 'post';
    form.action = '/gestion-de-citas/eliminar-cita';
    form.style.display = 'none';

    const fields = {
        __RequestVerificationToken: tokenInput.value,
        ReturnUrl: window.location.pathname + window.location.search,
        IdCita: id
    };

    Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value ?? '');
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
};

// ════════════════════════════════════════════════════════════════════
//  PAGINACIÓN Y CONTADORES
// ════════════════════════════════════════════════════════════════════

/**
 * Actualiza la UI de paginación según el total de items filtrados.
 *
 * @param {number} totalItems - Total de items después del filtrado
 */
const updatePagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const showing = Math.min(itemsPerPage, Math.max(0, totalItems - (currentPage - 1) * itemsPerPage));

    const pageShowingElement = safeGetElement('pageShowing');
    const pageTotalElement = safeGetElement('pageTotal');
    const previousButton = safeGetElement('btnPrev');
    const nextButton = safeGetElement('btnNext');

    if (pageShowingElement) pageShowingElement.textContent = showing;
    if (pageTotalElement) pageTotalElement.textContent = totalItems;
    if (previousButton) previousButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = currentPage >= totalPages;
};

/**
 * Anima un contador numérico desde 0 hasta el valor objetivo.
 *
 * @param {HTMLElement} element - Elemento DOM a animar
 * @param {number} target - Valor objetivo
 */
const animateCounter = (element, target) => {
    if (!element) return;

    let currentValue = 0;
    const step = Math.max(1, Math.ceil(target / 30));

    const animationTimer = setInterval(() => {
        currentValue = Math.min(currentValue + step, target);
        element.textContent = currentValue;

        if (currentValue >= target) {
            clearInterval(animationTimer);
        }
    }, 30);
};

/**
 * Actualiza las estadísticas (KPIs) en la parte superior de la página.
 */
const updateStats = () => {
    if (shouldUseServerRenderedList()) return;

    const total = appointments.length;
    const scheduled = appointments.filter(appointment =>
        appointment.status === 'programada' || appointment.status === 'confirmada'
    ).length;
    const cancelled = appointments.filter(appointment => appointment.status === 'cancelada').length;
    const attended = appointments.filter(appointment => appointment.status === 'atendida').length;

    animateCounter(safeGetElement('statTotal'), total);
    animateCounter(safeGetElement('statScheduled'), scheduled);
    animateCounter(safeGetElement('statCancelled'), cancelled);
    animateCounter(safeGetElement('statAttended'), attended);
};

// ════════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN DE COMPONENTES
// ════════════════════════════════════════════════════════════════════

/**
 * Inicializa el menú hamburguesa y sidebar responsive.
 */
const initSidebar = () => {
    const hamburgerButton = safeGetElement('hamburger');
    const sidebarElement = safeGetElement('sidebar');
    const overlayElement = safeGetElement('overlay');

    if (!hamburgerButton || !sidebarElement || !overlayElement) return;

    const toggleMenu = (showMenu) => {
        sidebarElement.classList.toggle('open', showMenu);
        overlayElement.classList.toggle('open', showMenu);
        hamburgerButton.setAttribute('aria-expanded', showMenu);
        overlayElement.setAttribute('aria-hidden', !showMenu);

        // Gestionar foco para accesibilidad
        if (showMenu) {
            const firstNavigationLink = sidebarElement.querySelector('.nav-item');
            if (firstNavigationLink) firstNavigationLink.focus();
        } else {
            hamburgerButton.focus();
        }
    };

    // Event listeners
    hamburgerButton.addEventListener('click', () => toggleMenu(true));
    overlayElement.addEventListener('click', () => toggleMenu(false));

    // Cerrar menú en móvil al hacer clic en un enlace
    sidebarElement.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 680) toggleMenu(false);
        });
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sidebarElement.classList.contains('open')) {
            event.preventDefault();
            toggleMenu(false);
        }
    });
};

/**
 * Inicializa las tabs de filtrado rápido por estado.
 */
const initTabs = () => {
    if (shouldUseServerRenderedList()) return;

    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(tabButton => {
        tabButton.addEventListener('click', () => {
            // Actualizar estado visual
            tabButtons.forEach(button => {
                button.classList.remove('active');
                button.setAttribute('aria-selected', 'false');
            });

            tabButton.classList.add('active');
            tabButton.setAttribute('aria-selected', 'true');

            // Actualizar filtro y renderizar
            currentTab = tabButton.dataset.tab;
            currentPage = 1;
            renderAppointments();
        });
    });
};

/**
 * Inicializa la búsqueda con debounce.
 */
const initSearch = () => {
    if (shouldUseServerRenderedList()) return;

    const searchInput = safeGetElement('searchAppointments');

    searchInput?.addEventListener('input', debounce((event) => {
        searchQuery = (event.target.value || '').toLowerCase();
        currentPage = 1;
        renderAppointments();
    }, 250));
};

/**
 * Inicializa los filtros de estado, profesional y fecha.
 */
const initFilters = () => {
    if (shouldUseServerRenderedList()) return;

    const filterStatusElement = safeGetElement('filterStatus');
    const filterProfessionalElement = safeGetElement('filterProfessional');
    const filterDateElement = safeGetElement('filterDate');

    filterStatusElement?.addEventListener('change', (event) => {
        filterStatus = event.target.value;
        currentPage = 1;
        renderAppointments();
    });

    filterProfessionalElement?.addEventListener('change', (event) => {
        filterProfessional = event.target.value;
        currentPage = 1;
        renderAppointments();
    });

    filterDateElement?.addEventListener('change', (event) => {
        filterDate = event.target.value;
        currentPage = 1;
        renderAppointments();
    });
};

/**
 * Inicializa la paginación de la tabla.
 */
const initPagination = () => {
    if (shouldUseServerRenderedList()) return;

    const previousButton = safeGetElement('btnPrev');
    const nextButton = safeGetElement('btnNext');

    previousButton?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderAppointments();
        }
    });

    nextButton?.addEventListener('click', () => {
        const filteredAppointments = getFilteredAppointments();
        const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

        if (currentPage < totalPages) {
            currentPage++;
            renderAppointments();
        }
    });
};

/**
 * Inicializa el botón de nueva cita.
 * openModalCita y closeModalCita están en window al principio de este archivo,
 * garantizando disponibilidad antes de cualquier DOMContentLoaded (incluido el inline script).
 */
const initNewAppointment = () => {
    const newAppointmentButton = safeGetElement('btnNewCita') || safeGetElement('btnNewAppointment');
    if (!newAppointmentButton) return;
    if (newAppointmentButton.hasAttribute('onclick')) return;
    newAppointmentButton.addEventListener('click', () => {
        if (typeof window.openModalCita === 'function') window.openModalCita();
    });
};

/**
 * Inicializa el modal de cita (cerrar con botón, overlay y Escape).
 */
const initModal = () => {
    const modalCloseButton = safeGetElement('modalAppointmentClose');
    const modalCancelButton = safeGetElement('modalAppointmentCancel');
    const modalElement = safeGetElement('modalAppointment');

    modalCloseButton?.addEventListener('click', closeAppointmentModal);
    modalCancelButton?.addEventListener('click', closeAppointmentModal);

    // Cerrar al hacer clic fuera del modal
    modalElement?.addEventListener('click', (event) => {
        if (event.target === modalElement) closeAppointmentModal();
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modalElement?.classList.contains('open')) {
            event.preventDefault();
            closeAppointmentModal();
        }
    });
};

/**
 * Inicializa el botón de optimización del banner.
 */
const initBanner = () => {
    const optimizeButton = safeGetElement('btnOptimize');

    optimizeButton?.addEventListener('click', () => {
        showToast('⚙️ Optimizando agenda... (simulado)', 'success');
    });
};

// ════════════════════════════════════════════════════════════════════
//  LLAMADAS A LA API
// ════════════════════════════════════════════════════════════════════

/**
 * Petición principal de carga de citas.
 * Si la API responde usa esos datos; si falla cae al cache LocalStorage.
 *
 * @returns {Promise<Array>} Array de citas mapeadas
 */
async function fetchAppointments() {
    // No hay un endpoint GET /api/citas disponible en el backend actual para esta vista.
    // Usamos los datos locales / cache como fallback estable.
    console.warn('[SmileTrack] No existe GET /api/citas para esta vista. Usando datos locales/cache.');
    return appointmentsStorage.load();
}

/**
 * Genera una nueva cita usando el almacenamiento local cuando la API no está disponible.
 * En la vista actual no existe un endpoint POST /api/citas en el backend.
 *
 * @param {Object} appointment - Datos de la cita a crear
 * @returns {Promise<Object>} Resultado de la operación
 */
async function addAppointmentAPI(appointment) {
    console.warn('[SmileTrack] Endpoint POST /api/citas no disponible. Guardando localmente.');
    return appointmentsStorage.addAppointment(appointment);
}

// ════════════════════════════════════════════════════════════════════
//  MANEJO DE ERRORES
// ════════════════════════════════════════════════════════════════════

/**
 * Muestra un banner de error en la parte superior de la página.
 * Útil para errores críticos que el usuario debe conocer.
 *
 * @param {string} message - Mensaje de error a mostrar
 */
function mostrarErrorUsuario(message) {
    let errorBar = document.getElementById('smiletrack-error-bar');

    if (!errorBar) {
        errorBar = document.createElement('div');
        errorBar.id = 'smiletrack-error-bar';
        errorBar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:white;padding:14px 20px;text-align:center;font-family:system-ui,-apple-system,sans-serif;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,.15);border-bottom:3px solid #991b1b;';
        errorBar.setAttribute('role', 'alert');
        document.body.appendChild(errorBar);
    }

    errorBar.innerHTML = `<strong>[SmileTrack]</strong> ${message} <button onclick="document.getElementById('smiletrack-error-bar').style.display='none'" style="margin-left:16px;background:white;color:#dc2626;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;">×</button>`;
    errorBar.style.display = 'block';
}

// ════════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════════

/**
 * Punto de entrada principal de la aplicación.
 * Inicializa todos los componentes y carga los datos.
 */
const init = async () => {
    try {
        const useSSR = shouldUseServerRenderedList();

        // Inicializar componentes de UI
        initSidebar();
        if (!useSSR) initTabs();
        if (!useSSR) initSearch();
        if (!useSSR) initFilters();
        initPagination();
        initNewAppointment();
        initModal();
        initBanner();

        if (!useSSR) {
            // Cargar datos desde API o fallback local
            appointments = await fetchAppointments();

            // Actualizar UI con datos cargados
            updateStats();
            renderAppointments();
        } else {
            // Modo SSR: animar los KPI renderizados por Razor si tienen data-target
            document.querySelectorAll('[data-target]').forEach(el => {
                const target = parseInt(el.getAttribute('data-target'), 10);
                if (!isNaN(target) && target >= 0) animateCounter(el, target);
            });
        }

        // Cleanup al cerrar la página (para SPA o navegación frecuente)
        window.addEventListener('beforeunload', () => {
            // Cleanup SPA real si es necesario
        });

    } catch (error) {
        console.error('[SmileTrack] Error inicializando modulo citas:', error);
        mostrarErrorUsuario(error.message || 'Error cargando módulo de citas. Intente recargar.');
    }
};

// Inicializar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', init);