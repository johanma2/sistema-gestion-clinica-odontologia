console.log('historial-rec.js cargado');
const pacientes = [
  {
    id: 1,
    nombre: 'Pedro García',
    cedula: '1020345678',
    email: 'pedro.garcia@email.com',
    odontologo: 'Dr. Carlos Méndez',
    odontologoKey: 'mendez',
    ultimaConsulta: '20 Mar 2026',
    alerta: true,
    estado: 'activo',
    consultas: [
      { fecha: '20 Mar 2026', descripcion: 'Endodoncia pieza 23', observacion: 'Paciente estable, control en 7 días.' },
      { fecha: '05 Feb 2026', descripcion: 'Limpieza dental', observacion: 'Sin hallazgos relevantes.' }
    ],
    tratamientos: [
      { nombre: 'Endodoncia pieza 23', progreso: 80 },
      { nombre: 'Ortodoncia fase 1', progreso: 45 }
    ],
    documentos: [
      { nombre: 'Radiografía panorámica', tipo: 'img' },
      { nombre: 'Consentimiento endodoncia', tipo: 'pdf' }
    ]
  },
  {
    id: 2,
    nombre: 'Laura Martínez',
    cedula: '1015678901',
    email: 'laura.martinez@email.com',
    odontologo: 'Dra. Laura Torres',
    odontologoKey: 'torres',
    ultimaConsulta: '18 Mar 2026',
    alerta: false,
    estado: 'activo',
    consultas: [
      { fecha: '18 Mar 2026', descripcion: 'Blanqueamiento dental', observacion: 'Resultado satisfactorio.' },
      { fecha: '02 Ene 2026', descripcion: 'Revisión general', observacion: 'Sin novedades.' }
    ],
    tratamientos: [
      { nombre: 'Blanqueamiento dental', progreso: 100 }
    ],
    documentos: [
      { nombre: 'Ficha de ingreso', tipo: 'pdf' }
    ]
  },
  {
    id: 3,
    nombre: 'Carlos Ríos',
    cedula: '1098765432',
    email: 'carlos.rios@email.com',
    odontologo: 'Dr. Andrés Ruiz',
    odontologoKey: 'ruiz',
    ultimaConsulta: '15 Mar 2026',
    alerta: true,
    estado: 'activo',
    consultas: [
      { fecha: '15 Mar 2026', descripcion: 'Cirugía periodontal', observacion: 'Postoperatorio con buena evolución.' }
    ],
    tratamientos: [
      { nombre: 'Tratamiento periodontal', progreso: 60 }
    ],
    documentos: [
      { nombre: 'Examen de sangre', tipo: 'pdf' }
    ]
  },
  {
    id: 4,
    nombre: 'Sofía Vargas',
    cedula: '1032109876',
    email: 'sofia.vargas@email.com',
    odontologo: 'Dra. Patricia Mora',
    odontologoKey: 'mora',
    ultimaConsulta: '10 Mar 2026',
    alerta: false,
    estado: 'activo',
    consultas: [
      { fecha: '10 Mar 2026', descripcion: 'Ortodoncia control', observacion: 'Ajuste de brackets realizado.' }
    ],
    tratamientos: [
      { nombre: 'Ortodoncia completa', progreso: 35 }
    ],
    documentos: [
      { nombre: 'Fotografías iniciales', tipo: 'img' }
    ]
  },
  {
    id: 5,
    nombre: 'Andrés Medina',
    cedula: '1056789012',
    email: 'andres.medina@email.com',
    odontologo: 'Dr. Felipe Silva',
    odontologoKey: 'silva',
    ultimaConsulta: '08 Mar 2026',
    alerta: true,
    estado: 'inactivo',
    consultas: [
      { fecha: '08 Mar 2026', descripcion: 'Prótesis parcial removible', observacion: 'Adaptación inicial. Seguimiento en 2 semanas.' }
    ],
    tratamientos: [
      { nombre: 'Prótesis parcial removible', progreso: 90 }
    ],
    documentos: [
      { nombre: 'Impresiones dentales', tipo: 'img' }
    ]
  },
  {
    id: 6,
    nombre: 'María Ospina',
    cedula: '1067890123',
    email: 'maria.ospina@email.com',
    odontologo: 'Dr. Carlos Méndez',
    odontologoKey: 'mendez',
    ultimaConsulta: '05 Mar 2026',
    alerta: false,
    estado: 'activo',
    consultas: [
      { fecha: '05 Mar 2026', descripcion: 'Corona cerámica pieza 11', observacion: 'Colocación definitiva satisfactoria.' }
    ],
    tratamientos: [
      { nombre: 'Corona cerámica', progreso: 100 }
    ],
    documentos: [
      { nombre: 'Foto antes y después', tipo: 'img' }
    ]
  },
  {
    id: 7,
    nombre: 'Felipe Cano',
    cedula: '1078901234',
    email: 'felipe.cano@email.com',
    odontologo: 'Dra. Laura Torres',
    odontologoKey: 'torres',
    ultimaConsulta: '01 Mar 2026',
    alerta: false,
    estado: 'activo',
    consultas: [
      { fecha: '01 Mar 2026', descripcion: 'Sellantes preventivos', observacion: 'Aplicados con éxito.' }
    ],
    tratamientos: [
      { nombre: 'Odontología preventiva', progreso: 50 }
    ],
    documentos: [
      { nombre: 'Ficha pediátrica', tipo: 'pdf' }
    ]
  },
  {
    id: 8,
    nombre: 'Isabel Herrera',
    cedula: '1089012345',
    email: 'isabel.herrera@email.com',
    odontologo: 'Dr. Andrés Ruiz',
    odontologoKey: 'ruiz',
    ultimaConsulta: '25 Feb 2026',
    alerta: true,
    estado: 'inactivo',
    consultas: [
      { fecha: '25 Feb 2026', descripcion: 'Implante pieza 36', observacion: 'Fase 1 completada. Seguimiento necesario.' }
    ],
    tratamientos: [
      { nombre: 'Implante dental', progreso: 25 }
    ],
    documentos: [
      { nombre: 'TAC maxilofacial', tipo: 'img' }
    ]
  },
  {
    id: 9,
    nombre: 'Natalia Bravo',
    cedula: '1100123456',
    email: 'natalia.bravo@email.com',
    odontologo: 'Dra. Patricia Mora',
    odontologoKey: 'mora',
    ultimaConsulta: '18 Feb 2026',
    alerta: false,
    estado: 'activo',
    consultas: [
      { fecha: '18 Feb 2026', descripcion: 'Revisión general', observacion: 'Buena evolución.' }
    ],
    tratamientos: [
      { nombre: 'Control rutinario', progreso: 100 }
    ],
    documentos: [
      { nombre: 'Informe médico', tipo: 'pdf' }
    ]
  },
  {
    id: 10,
    nombre: 'Juan Pérez',
    cedula: '1132109876',
    email: 'juan.perez@email.com',
    odontologo: 'Dr. Felipe Silva',
    odontologoKey: 'silva',
    ultimaConsulta: '14 Feb 2026',
    alerta: true,
    estado: 'activo',
    consultas: [
      { fecha: '14 Feb 2026', descripcion: 'Extracción pieza 48', observacion: 'Cicatrización normal.' }
    ],
    tratamientos: [
      { nombre: 'Extracción dental', progreso: 100 }
    ],
    documentos: [
      { nombre: 'Consentimiento quirúrgico', tipo: 'pdf' }
    ]
  },
  { id: 11, nombre: 'Camila López', cedula: '1143210987', email: 'camila.lopez@email.com', odontologo: 'Dr. Carlos Méndez', odontologoKey: 'mendez', ultimaConsulta: '09 Feb 2026', alerta: false, estado: 'activo', consultas: [{ fecha: '09 Feb 2026', descripcion: 'Control de corona', observacion: 'Todo en orden.' }], tratamientos: [{ nombre: 'Control de corona', progreso: 100 }], documentos: [{ nombre: 'Informe de control', tipo: 'pdf' }] },
  { id: 12, nombre: 'Diego Toro', cedula: '1154321098', email: 'diego.toro@email.com', odontologo: 'Dra. Laura Torres', odontologoKey: 'torres', ultimaConsulta: '31 Jan 2026', alerta: false, estado: 'activo', consultas: [{ fecha: '31 Jan 2026', descripcion: 'Limpieza profunda', observacion: 'Recomendado higiene diaria.' }], tratamientos: [{ nombre: 'Limpieza profunda', progreso: 100 }], documentos: [{ nombre: 'Registro de tratamiento', tipo: 'pdf' }] },
  { id: 13, nombre: 'Valeria Suárez', cedula: '1165432109', email: 'valeria.suarez@email.com', odontologo: 'Dr. Andrés Ruiz', odontologoKey: 'ruiz', ultimaConsulta: '28 Jan 2026', alerta: true, estado: 'activo', consultas: [{ fecha: '28 Jan 2026', descripcion: 'Tratamiento periodontal', observacion: 'Necesita control semanal.' }], tratamientos: [{ nombre: 'Tratamiento periodontal', progreso: 50 }], documentos: [{ nombre: 'Plan periodontal', tipo: 'pdf' }] },
  { id: 14, nombre: 'Raúl Contreras', cedula: '1176543210', email: 'raul.contreras@email.com', odontologo: 'Dra. Patricia Mora', odontologoKey: 'mora', ultimaConsulta: '22 Jan 2026', alerta: false, estado: 'activo', consultas: [{ fecha: '22 Jan 2026', descripcion: 'Ajuste de prótesis', observacion: 'Paciente cómodo.' }], tratamientos: [{ nombre: 'Prótesis fija', progreso: 85 }], documentos: [{ nombre: 'Diseño de prótesis', tipo: 'pdf' }] },
  { id: 15, nombre: 'Lorena Paredes', cedula: '1187654321', email: 'lorena.paredes@email.com', odontologo: 'Dr. Felipe Silva', odontologoKey: 'silva', ultimaConsulta: '18 Jan 2026', alerta: false, estado: 'inactivo', consultas: [{ fecha: '18 Jan 2026', descripcion: 'Valoración inicial', observacion: 'Paciente inactivo hasta nuevo aviso.' }], tratamientos: [{ nombre: 'Valoración inicial', progreso: 100 }], documentos: [{ nombre: 'Historia clínica', tipo: 'pdf' }] },
  { id: 16, nombre: 'Mateo Gómez', cedula: '1198765432', email: 'mateo.gomez@email.com', odontologo: 'Dr. Carlos Méndez', odontologoKey: 'mendez', ultimaConsulta: '12 Jan 2026', alerta: false, estado: 'activo', consultas: [{ fecha: '12 Jan 2026', descripcion: 'Coronas temporales', observacion: 'Pendiente colocación final.' }], tratamientos: [{ nombre: 'Corona temporal', progreso: 70 }], documentos: [{ nombre: 'Plan de coronas', tipo: 'pdf' }] },
  { id: 17, nombre: 'Daniela Castillo', cedula: '1209876543', email: 'daniela.castillo@email.com', odontologo: 'Dra. Laura Torres', odontologoKey: 'torres', ultimaConsulta: '08 Jan 2026', alerta: true, estado: 'activo', consultas: [{ fecha: '08 Jan 2026', descripcion: 'Revisión ortodoncia', observacion: 'Fijación estable.' }], tratamientos: [{ nombre: 'Ortodoncia fase 2', progreso: 65 }], documentos: [{ nombre: 'Informe ortodóncico', tipo: 'pdf' }] },
  { id: 18, nombre: 'Samuel Rojas', cedula: '1210987654', email: 'samuel.rojas@email.com', odontologo: 'Dr. Andrés Ruiz', odontologoKey: 'ruiz', ultimaConsulta: '04 Jan 2026', alerta: false, estado: 'activo', consultas: [{ fecha: '04 Jan 2026', descripcion: 'Controles de implante', observacion: 'Evolución favorable.' }], tratamientos: [{ nombre: 'Implante pieza 36', progreso: 90 }], documentos: [{ nombre: 'Seguimiento implante', tipo: 'pdf' }] },
  { id: 19, nombre: 'Mariana Castaño', cedula: '1221098765', email: 'mariana.castano@email.com', odontologo: 'Dra. Patricia Mora', odontologoKey: 'mora', ultimaConsulta: '29 Dec 2025', alerta: false, estado: 'activo', consultas: [{ fecha: '29 Dec 2025', descripcion: 'Valoración de prótesis', observacion: 'Requiere ajuste.' }], tratamientos: [{ nombre: 'Prótesis removible', progreso: 50 }], documentos: [{ nombre: 'Informe de ajuste', tipo: 'pdf' }] },
  { id: 20, nombre: 'Sergio Varela', cedula: '1232109876', email: 'sergio.varela@email.com', odontologo: 'Dr. Felipe Silva', odontologoKey: 'silva', ultimaConsulta: '23 Dec 2025', alerta: true, estado: 'activo', consultas: [{ fecha: '23 Dec 2025', descripcion: 'Control período postoperatorio', observacion: 'Anticoagulante en tratamiento.' }], tratamientos: [{ nombre: 'Seguimiento postoperatorio', progreso: 80 }], documentos: [{ nombre: 'Examen de coagulación', tipo: 'pdf' }] }
];

let pacientesFiltrados = [...pacientes];
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;

const safeGetElement = (id) => document.getElementById(id);

const initSidebar = () => {
  const hamburger = safeGetElement('hamburger');
  const sidebar = safeGetElement('sidebar');
  const overlay = safeGetElement('overlay');

  if (!hamburger || !sidebar || !overlay) return;

  const toggleMenu = (show) => {
    sidebar.classList.toggle('open', show);
    overlay.classList.toggle('open', show);
    hamburger.setAttribute('aria-expanded', String(show));
    overlay.setAttribute('aria-hidden', String(!show));
  };

  hamburger.addEventListener('click', () => toggleMenu(true));
  overlay.addEventListener('click', () => toggleMenu(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      e.preventDefault();
      toggleMenu(false);
    }
  });
};

const getPageData = (list) => {
  const sizeValue = safeGetElement('pageSizeSelect')?.value;
  pageSize = sizeValue === 'all' ? list.length : Number(sizeValue) || 10;
  totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(list.length / pageSize));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  if (pageSize === list.length) return list;
  const start = (currentPage - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const updatePagination = (totalRecords) => {
  const controls = safeGetElement('paginationControls');
  const pageShowing = safeGetElement('pageShowing');
  const pageTotal = safeGetElement('pageTotal');
  const pageInfo = safeGetElement('pageSummary');
  const btnPrev = safeGetElement('btnPrev');
  const btnNext = safeGetElement('btnNext');

  if (!controls || totalRecords <= pageSize) {
    if (controls) controls.style.display = 'none';
  } else {
    controls.style.display = 'flex';
    if (pageShowing) pageShowing.textContent = String(Math.min(pageSize, totalRecords));
    if (pageTotal) pageTotal.textContent = String(totalRecords);
    if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    if (btnPrev) btnPrev.disabled = currentPage <= 1;
    if (btnNext) btnNext.disabled = currentPage >= totalPages;
  }
};

const updateStats = () => {
  const total = pacientes.length;
  const today = pacientes.filter((p) => {
    const fecha = new Date(p.ultimaConsulta);
    const now = new Date();
    return fecha.getDate() === now.getDate() && fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
  }).length;
  const alerta = pacientes.filter((p) => p.alerta).length;
  const odontologos = new Set(pacientes.filter((p) => p.estado === 'activo').map((p) => p.odontologo)).size;

  const mapping = {
    statTotal: total,
    statHoy: today,
    statAlerta: alerta,
    statOdo: odontologos
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const el = safeGetElement(id);
    if (el) el.textContent = String(value);
  });
};

const renderTable = (list) => {
  const tbody = safeGetElement('tablaBody');
  const count = safeGetElement('resultsCount');
  const noResults = safeGetElement('noResults');
  if (!tbody || !count || !noResults) return;

  tbody.innerHTML = '';
  const pageData = getPageData(list);
  count.textContent = `Mostrando ${pageData.length} de ${list.length} paciente${list.length !== 1 ? 's' : ''}`;

  if (list.length === 0) {
    noResults.style.display = 'grid';
    updatePagination(0);
    return;
  }

  noResults.style.display = 'none';
  pageData.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="td-paciente">
          <div class="pac-avatar">${(p.nombre || '?').split(' ').filter(Boolean).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase() || '?'}</div>
          <div>
            <div class="pac-name">${p.nombre}</div>
            <div class="pac-email">${p.email}</div>
          </div>
        </div>
      </td>
      <td>${p.cedula}</td>
      <td>${p.odontologo}</td>
      <td>${p.ultimaConsulta}</td>
      <td><span class="badge-alerta ${p.alerta ? 'si' : 'no'}">${p.alerta ? '⚠️ Sí' : '— No'}</span></td>
      <td><span class="badge-estado ${p.estado}">${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</span></td>
      <td><button class="btn-view">📋 Historial</button></td>
    `;
    tbody.appendChild(tr);

    const actionButton = tr.querySelector('.btn-view');
    if (actionButton) {
      actionButton.addEventListener('click', () => renderHistoryDetails(p));
    }
  });
  updatePagination(list.length);
};

const renderHistoryList = (elementId, items, renderItem) => {
  const element = safeGetElement(elementId);
  if (!element) return;
  element.innerHTML = items.length
    ? items.map(renderItem).join('')
    : '<li>No hay registros disponibles.</li>';
};

const renderHistoryDetails = (paciente) => {
  const elName = safeGetElement('historyPatientName');
  if (elName) elName.textContent = paciente.nombre;
  const elCedula = safeGetElement('historyCedula');
  if (elCedula) elCedula.textContent = paciente.cedula;
  const elOdontologo = safeGetElement('historyOdontologo');
  if (elOdontologo) elOdontologo.textContent = paciente.odontologo;
  const elUltima = safeGetElement('historyUltimaConsulta');
  if (elUltima) elUltima.textContent = paciente.ultimaConsulta;
  const elAlerta = safeGetElement('historyAlerta');
  if (elAlerta) elAlerta.textContent = paciente.alerta ? '⚠️ Sí' : '— No';

  renderHistoryList('historyConsultations', paciente.consultas || [], (item) => `
      <li>
        <strong>${item.fecha}</strong> · ${item.descripcion}
        <span>${item.observacion}</span>
      </li>
    `);

  renderHistoryList('historyTreatments', paciente.tratamientos || [], (item) => `
      <li>
        <strong>${item.nombre}</strong>
        <span>Progreso: ${item.progreso}%</span>
      </li>
    `);

  renderHistoryList('historyDocuments', paciente.documentos || [], (item) => `
      <li>
        <strong>${item.nombre}</strong>
        <span>${item.tipo === 'pdf' ? 'PDF' : item.tipo.toUpperCase()}</span>
      </li>
    `);

  const panel = safeGetElement('historyPanel');
  if (panel) {
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const hideHistoryPanel = () => {
  const panel = safeGetElement('historyPanel');
  if (panel) panel.style.display = 'none';
};

const filterPatients = () => {
  currentPage = 1;
  const query = safeGetElement('searchInput')?.value.toLowerCase().trim() || '';
  const odontologo = safeGetElement('filterOdontologo')?.value || '';
  const alerta = safeGetElement('filterAlerta')?.value || '';
  const estado = safeGetElement('filterEstado')?.value || '';

  pacientesFiltrados = pacientes.filter((p) => {
    const matchesQuery = !query || p.nombre.toLowerCase().includes(query) || p.cedula.includes(query) || p.email.toLowerCase().includes(query);
    const matchesOdo = !odontologo || p.odontologoKey === odontologo;
    const matchesAlerta = !alerta || (alerta === 'si' ? p.alerta : !p.alerta);
    const matchesEstado = !estado || p.estado === estado;
    return matchesQuery && matchesOdo && matchesAlerta && matchesEstado;
  });

  renderTable(pacientesFiltrados);
};

const initFilters = () => {
  safeGetElement('searchInput')?.addEventListener('input', filterPatients);
  safeGetElement('filterOdontologo')?.addEventListener('change', filterPatients);
  safeGetElement('filterAlerta')?.addEventListener('change', filterPatients);
  safeGetElement('filterEstado')?.addEventListener('change', filterPatients);
  safeGetElement('pageSizeSelect')?.addEventListener('change', () => {
    currentPage = 1;
    renderTable(pacientesFiltrados);
  });
  safeGetElement('btnPrev')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable(pacientesFiltrados);
    }
  });
  safeGetElement('btnNext')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      renderTable(pacientesFiltrados);
    }
  });
  safeGetElement('closeHistoryPanel')?.addEventListener('click', hideHistoryPanel);
};

const initNavGroups = () => {
  document.querySelectorAll('.nav-group-header').forEach((header) => {
    const group = header.parentElement;
    const toggle = () => {
      const isOpen = group.classList.toggle('open');
      header.setAttribute('aria-expanded', String(isOpen));
    };
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
};

const init = () => {
  initSidebar();
  initNavGroups();
  initFilters();
  updateStats();
  renderTable(pacientes);
};

document.addEventListener('DOMContentLoaded', init);