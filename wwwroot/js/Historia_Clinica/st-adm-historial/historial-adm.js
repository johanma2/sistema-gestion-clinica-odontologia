// ── DATOS DE MUESTRA ──────────────────────────────────────────────────────
const pacientes = [
{
id: 1, nombre: 'Pedro García', cedula: '1020345678',
email: 'pedro.garcia@email.com', telefono: '310 234 5678',
fechaNac: '12 Mar 1985', odontologo: 'Dr. Carlos Méndez', odontologoKey: 'mendez',
ultimaConsulta: '20 Mar 2026', estado: 'activo',
alerta: true, alertaTexto: 'Alérgico a la penicilina. Informar antes de cualquier prescripción.',
consultas: [
{ fecha: '20 Mar 2026', proc: 'Endodoncia pieza 23', odo: 'Dr. Carlos Méndez', nota: 'Paciente toleró bien el procedimiento. Se recomienda control en 7 días.' },
{ fecha: '05 Feb 2026', proc: 'Limpieza dental', odo: 'Dr. Carlos Méndez', nota: 'Sin hallazgos relevantes.' },
{ fecha: '10 Oct 2025', proc: 'Extracción pieza 48', odo: 'Dr. Carlos Méndez', nota: 'Cicatrización normal.' }
],
tratamientos: [
{ nombre: 'Endodoncia pieza 23', progreso: 80, sesiones: '4/5' },
{ nombre: 'Ortodoncia fase 1', progreso: 45, sesiones: '9/20' }
],
documentos: [
{ nombre: 'Radiografía panorámica', fecha: '20 Mar 2026', tipo: 'img' },
{ nombre: 'Consentimiento endodoncia', fecha: '19 Mar 2026', tipo: 'pdf' }
]
},
{
id: 2, nombre: 'Laura Martínez', cedula: '1015678901',
email: 'laura.martinez@email.com', telefono: '320 456 7890',
fechaNac: '07 Jun 1992', odontologo: 'Dra. Laura Torres', odontologoKey: 'torres',
ultimaConsulta: '18 Mar 2026', estado: 'activo',
alerta: false, alertaTexto: '',
consultas: [
{ fecha: '18 Mar 2026', proc: 'Blanqueamiento dental', odo: 'Dra. Laura Torres', nota: 'Resultado satisfactorio. Cita de mantenimiento en 6 meses.' },
{ fecha: '02 Ene 2026', proc: 'Revisión general', odo: 'Dra. Laura Torres', nota: 'Sin novedad.' }
],
tratamientos: [
{ nombre: 'Blanqueamiento dental', progreso: 100, sesiones: '3/3' }
],
documentos: [
{ nombre: 'Ficha de ingreso', fecha: '15 Ene 2025', tipo: 'pdf' }
]
},
{
id: 3, nombre: 'Carlos Ríos', cedula: '1098765432',
email: 'carlos.rios@email.com', telefono: '315 678 9012',
fechaNac: '23 Nov 1978', odontologo: 'Dr. Andrés Ruiz', odontologoKey: 'ruiz',
ultimaConsulta: '15 Mar 2026', estado: 'activo',
alerta: true, alertaTexto: 'Hipertensión controlada. Tomar presión antes de cada procedimiento.',
consultas: [
{ fecha: '15 Mar 2026', proc: 'Cirugía periodontal', odo: 'Dr. Andrés Ruiz', nota: 'Postoperatorio sin complicaciones.' }
],
tratamientos: [
{ nombre: 'Tratamiento periodontal', progreso: 60, sesiones: '3/5' }
],
documentos: [
{ nombre: 'Examen de sangre', fecha: '10 Mar 2026', tipo: 'pdf' },
{ nombre: 'Radiografía periapical', fecha: '15 Mar 2026', tipo: 'img' }
]
},
{
id: 4, nombre: 'Sofía Vargas', cedula: '1032109876',
email: 'sofia.vargas@email.com', telefono: '300 890 1234',
fechaNac: '14 Abr 2000', odontologo: 'Dra. Patricia Mora', odontologoKey: 'mora',
ultimaConsulta: '10 Mar 2026', estado: 'activo',
alerta: false, alertaTexto: '',
consultas: [
{ fecha: '10 Mar 2026', proc: 'Ortodoncia control', odo: 'Dra. Patricia Mora', nota: 'Ajuste de brackets. Próxima cita en 4 semanas.' },
{ fecha: '10 Feb 2026', proc: 'Ortodoncia control', odo: 'Dra. Patricia Mora', nota: 'Avance adecuado.' }
],
tratamientos: [
{ nombre: 'Ortodoncia completa', progreso: 35, sesiones: '7/20' }
],
documentos: [
{ nombre: 'Fotografías iniciales', fecha: '05 Ene 2025', tipo: 'img' },
{ nombre: 'Consentimiento ortodoncia', fecha: '05 Ene 2025', tipo: 'pdf' }
]
},
{
id: 5, nombre: 'Andrés Medina', cedula: '1056789012',
email: 'andres.medina@email.com', telefono: '312 012 3456',
fechaNac: '30 Sep 1965', odontologo: 'Dr. Felipe Silva', odontologoKey: 'silva',
ultimaConsulta: '08 Mar 2026', estado: 'inactivo',
alerta: true, alertaTexto: 'Diabético tipo 2. Cicatrización lenta. Coordinación con médico tratante requerida.',
consultas: [
{ fecha: '08 Mar 2026', proc: 'Prótesis parcial removible', odo: 'Dr. Felipe Silva', nota: 'Adaptación inicial. Seguimiento en 2 semanas.' }
],
tratamientos: [
{ nombre: 'Prótesis parcial removible', progreso: 90, sesiones: '9/10' }
],
documentos: [
{ nombre: 'Impresiones dentales', fecha: '01 Mar 2026', tipo: 'img' }
]
},
{
id: 6, nombre: 'María Ospina', cedula: '1067890123',
email: 'maria.ospina@email.com', telefono: '318 123 4567',
fechaNac: '19 Jul 1988', odontologo: 'Dr. Carlos Méndez', odontologoKey: 'mendez',
ultimaConsulta: '05 Mar 2026', estado: 'activo',
alerta: false, alertaTexto: '',
consultas: [
{ fecha: '05 Mar 2026', proc: 'Corona cerámica pieza 11', odo: 'Dr. Carlos Méndez', nota: 'Colocación definitiva. Paciente conforme.' }
],
tratamientos: [
{ nombre: 'Corona cerámica', progreso: 100, sesiones: '3/3' }
],
documentos: [
{ nombre: 'Foto antes y después', fecha: '05 Mar 2026', tipo: 'img' }
]
},
{
id: 7, nombre: 'Felipe Cano', cedula: '1078901234',
email: 'felipe.cano@email.com', telefono: '321 234 5678',
fechaNac: '02 Feb 2010', odontologo: 'Dra. Laura Torres', odontologoKey: 'torres',
ultimaConsulta: '01 Mar 2026', estado: 'activo',
alerta: false, alertaTexto: '',
consultas: [
{ fecha: '01 Mar 2026', proc: 'Sellantes preventivos', odo: 'Dra. Laura Torres', nota: 'Aplicados en molares permanentes.' }
],
tratamientos: [
{ nombre: 'Odontología preventiva', progreso: 50, sesiones: '1/2' }
],
documentos: [
{ nombre: 'Ficha pediátrica', fecha: '01 Mar 2026', tipo: 'pdf' }
]
},
{
id: 8, nombre: 'Isabel Herrera', cedula: '1089012345',
email: 'isabel.herrera@email.com', telefono: '314 345 6789',
fechaNac: '11 Dic 1972', odontologo: 'Dr. Andrés Ruiz', odontologoKey: 'ruiz',
ultimaConsulta: '25 Feb 2026', estado: 'inactivo',
alerta: true, alertaTexto: 'Anticoagulante (warfarina). Consultar INR antes de procedimientos invasivos.',
consultas: [
{ fecha: '25 Feb 2026', proc: 'Implante pieza 36', odo: 'Dr. Andrés Ruiz', nota: 'Fase 1 completada. Espera de osteointegración.' }
],
tratamientos: [
{ nombre: 'Implante dental pieza 36', progreso: 25, sesiones: '1/4' }
],
documentos: [
{ nombre: 'Examen de coagulación', fecha: '20 Feb 2026', tipo: 'pdf' },
{ nombre: 'TAC maxilofacial', fecha: '22 Feb 2026', tipo: 'img' }
]
}
];

let pacientesFiltrados = [...pacientes];
let pacienteActivo = null;
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;

function obtenerPagina(lista) {
    pageSize = document.getElementById('pageSizeSelect')?.value === 'all' ? lista.length : Number(document.getElementById('pageSizeSelect')?.value) || 10;
    totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(lista.length / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    if (pageSize === lista.length) return lista;
    const start = (currentPage - 1) * pageSize;
    return lista.slice(start, start + pageSize);
}

function actualizarPaginacion(totalRegistros) {
    const pageControls = document.getElementById('paginationControls');
    const pageShowing = document.getElementById('pageShowing');
    const pageTotal = document.getElementById('pageTotal');
    const pageInfo = document.getElementById('pageInfo');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    if (!pageControls || totalRegistros <= pageSize) {
        pageControls?.style.setProperty('display', 'none');
        return;
    }

    pageControls.style.display = 'flex';
    pageShowing.textContent = String(Math.min(pageSize, totalRegistros));
    pageTotal.textContent = String(totalRegistros);
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    if (btnPrev) {
        btnPrev.disabled = currentPage <= 1;
        btnPrev.setAttribute('aria-disabled', String(currentPage <= 1));
    }
    if (btnNext) {
        btnNext.disabled = currentPage >= totalPages;
        btnNext.setAttribute('aria-disabled', String(currentPage >= totalPages));
    }
}

// ── RENDER TABLA ──────────────────────────────────────────────────────────
function renderTabla(lista) {
    const tbody = document.getElementById('tablaBody');
    const count = document.getElementById('resultsCount');
    const noRes = document.getElementById('noResults');
    tbody.innerHTML = '';
    const pagina = obtenerPagina(lista);
    count.textContent = `Mostrando ${pagina.length} de ${lista.length} paciente${lista.length !== 1 ? 's' : ''}`;
    if (lista.length === 0) {
        noRes.style.display = 'block';
        actualizarPaginacion(0);
        return;
    }
    noRes.style.display = 'none';
    pagina.forEach(p => {
const iniciales = p.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
const tr = document.createElement('tr');
if (pacienteActivo?.id === p.id) tr.classList.add('activa');
tr.innerHTML = `
   <td>
     <div class="td-paciente">
       <div class="pac-avatar">${iniciales}</div>
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
   <td><button class="btn-ver" onclick="abrirPanel(${p.id})">📋 Historial</button></td>
`;

tbody.appendChild(tr);
    });
    actualizarPaginacion(lista.length);
}

// ── FILTRAR ───────────────────────────────────────────────────────────────
function filtrarPacientes() {
    currentPage = 1;
    const q        = document.getElementById('searchInput').value.toLowerCase().trim();
    const odo      = document.getElementById('filterOdontologo').value;
    const alerta   = document.getElementById('filterAlerta').value;
    const estado   = document.getElementById('filterEstado').value;
    pacientesFiltrados = pacientes.filter(p => {
        const matchQ      = !q || p.nombre.toLowerCase().includes(q) || p.cedula.includes(q) || p.email.toLowerCase().includes(q);
        const matchOdo    = !odo || p.odontologoKey === odo;
        const matchAlerta = !alerta || (alerta === 'si' ? p.alerta : !p.alerta);
        const matchEstado = !estado || p.estado === estado;
        return matchQ && matchOdo && matchAlerta && matchEstado;
    });
    renderTabla(pacientesFiltrados);
}

// ── PANEL LATERAL ─────────────────────────────────────────────────────────
function abrirPanel(id) {
const p = pacientes.find(x => x.id === id);
if (!p) return;
pacienteActivo = p;
renderTabla(pacientesFiltrados); // resaltar fila activa
// Header
document.getElementById('panelNombre').textContent  = p.nombre;
document.getElementById('panelCedula').textContent  = `CC ${p.cedula}`;
// Info grid
document.getElementById('panelInfoGrid').innerHTML = `<div class="info-item"><div class="info-label">Fecha nacimiento</div><div class="info-val">${p.fechaNac}</div></div><div class="info-item"><div class="info-label">Teléfono</div><div class="info-val">${p.telefono}</div></div><div class="info-item"><div class="info-label">Odontólogo</div><div class="info-val">${p.odontologo}</div></div><div class="info-item"><div class="info-label">Estado</div><div class="info-val">${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</div></div>`;
// Alerta
const alertaEl = document.getElementById('panelAlerta');
if (p.alerta) {
alertaEl.style.display = 'flex';
document.getElementById('panelAlertaTexto').textContent = p.alertaTexto;
} else {
alertaEl.style.display = 'none';
}
// Consultas
const cList = document.getElementById('consultasList');
cList.innerHTML = p.consultas.map(c => `<div class="consulta-item"><div class="consulta-fecha">${c.fecha}</div><div class="consulta-proc">${c.proc}</div><div class="consulta-odo">👨‍️ ${c.odo}</div><div class="consulta-nota">${c.nota}</div></div>`).join('');
// Tratamientos
const tList = document.getElementById('tratamientosList');
tList.innerHTML = p.tratamientos.map(t => `<div class="trat-item"><div class="trat-nombre">${t.nombre}</div><div class="trat-bar-wrap"><div class="trat-bar" style="width:${t.progreso}%"></div></div><div class="trat-meta"><span>${t.progreso}% completado</span><span>${t.sesiones} sesiones</span></div></div>`).join('');
// Documentos
const dList = document.getElementById('documentosList');
dList.innerHTML = p.documentos.map(d => `<div class="doc-item"><div class="doc-icon">${d.tipo === 'pdf' ? '📄' : '️'}</div><div><div class="doc-nombre">${d.nombre}</div><div class="doc-fecha">${d.fecha}</div></div><span class="doc-badge ${d.tipo}">${d.tipo.toUpperCase()}</span></div>`).join('');
// Activar primera tab
switchTab('consultas', document.querySelector('.tab-btn'));
// Abrir panel
document.getElementById('panelLateral').classList.add('open');
document.getElementById('panelOverlay').classList.add('open');
const mainElement = document.querySelector('.main');
if (mainElement) mainElement.classList.add('panel-open');
}

function cerrarPanel() {
    pacienteActivo = null;
    document.getElementById('panelLateral').classList.remove('open');
    document.getElementById('panelOverlay').classList.remove('open');
    const mainElement = document.querySelector('.main');
    if (mainElement) mainElement.classList.remove('panel-open');
    renderTabla(pacientesFiltrados);
}

function toggleMenu(show) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const hamburger = document.getElementById('hamburger');
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('open', show);
    overlay.classList.toggle('open', show);
    if (hamburger) hamburger.setAttribute('aria-expanded', String(show));
    overlay.setAttribute('aria-hidden', String(!show));
}

function closeMenu() {
    toggleMenu(false);
}

function initNavGroups() {
    const groupHeaders = document.querySelectorAll('.nav-group-header');
    if (!groupHeaders.length) return;

    groupHeaders.forEach(header => {
        header.setAttribute('aria-expanded', 'false');
        header.addEventListener('click', function () {
            const group = this.closest('.nav-group');
            if (!group) return;
            group.classList.toggle('open');
            this.setAttribute('aria-expanded', String(group.classList.contains('open')));
        });

        header.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    const activeLink = document.querySelector('.nav-item.active');
    if (activeLink) {
        const activeGroup = activeLink.closest('.nav-group');
        if (activeGroup) {
            activeGroup.classList.add('open');
            const header = activeGroup.querySelector('.nav-group-header');
            if (header) header.setAttribute('aria-expanded', 'true');
        }
    }
}

// ── TABS ──────────────────────────────────────────────────────────────────
function switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else document.querySelectorAll('.tab-btn')[0].classList.add('active');
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.classList.add('active');
}

// ── CONTADORES ─────────────────────────────────────────────────────────────
function actualizarContadores() {
    const total = pacientes.length;
    const hoy = pacientes.filter(p => {
        const fecha = new Date(p.ultimaConsulta);
        if (Number.isNaN(fecha.getTime())) return false;
        const now = new Date();
        return fecha.getDate() === now.getDate() && fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
    }).length;
    const alerta = pacientes.filter(p => p.alerta).length;
    const odoActivos = new Set(pacientes.filter(p => p.estado === 'activo').map(p => p.odontologo)).size;

    const valores = {
        statTotal: total,
        statHoy: hoy,
        statAlerta: alerta,
        statOdo: odoActivos
    };

    Object.entries(valores).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.dataset.target = String(value);
        el.textContent = '0';
    });
}

function animarContadores() {
    document.querySelectorAll('.stat-number').forEach(el => {
        const target = parseInt(el.dataset.target);
        if (Number.isNaN(target)) return;
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 40));
        const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = current;
            if (current >= target) clearInterval(timer);
        }, 30);
    });
}

// ── TOAST ─────────────────────────────────────────────────────────────────
function showToast(msg) {
const t = document.getElementById('toast');
t.textContent = msg;
t.classList.add('show');
setTimeout(() => t.classList.remove('show'), 3000);
}

// ── SIDEBAR MÓVIL ─────────────────────────────────────────────────────────
function toggleSidebar() {
document.getElementById('sidebar').classList.toggle('open');
document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
}

function inicializarHistoricoAdmin() {
    const searchInput = document.getElementById('searchInput');
    const filterOdontologo = document.getElementById('filterOdontologo');
    const filterAlerta = document.getElementById('filterAlerta');
    const filterEstado = document.getElementById('filterEstado');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const hamburger = document.getElementById('hamburger');
    const overlay = document.getElementById('overlay');
    const panelOverlay = document.getElementById('panelOverlay');
    const panelClose = document.getElementById('panelClose');

    if (searchInput) searchInput.addEventListener('input', filtrarPacientes);
    if (filterOdontologo) filterOdontologo.addEventListener('change', filtrarPacientes);
    if (filterAlerta) filterAlerta.addEventListener('change', filtrarPacientes);
    if (filterEstado) filterEstado.addEventListener('change', filtrarPacientes);
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', () => {
        currentPage = 1;
        renderTabla(pacientesFiltrados);
    });
    if (btnPrev) btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderTabla(pacientesFiltrados);
        }
    });
    if (btnNext) btnNext.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            renderTabla(pacientesFiltrados);
        }
    });
    if (hamburger) hamburger.addEventListener('click', () => toggleMenu(!document.getElementById('sidebar')?.classList.contains('open')));
    if (overlay) overlay.addEventListener('click', closeMenu);
    if (panelOverlay) panelOverlay.addEventListener('click', cerrarPanel);
    if (panelClose) panelClose.addEventListener('click', cerrarPanel);
    initNavGroups();
}

// ── INIT ──────────────────────────────────────────────────────────────────
function iniciarHistorialAdmin() {
    console.log('historial-adm.js cargado');
    renderTabla(pacientes);
    actualizarContadores();
    animarContadores();
    inicializarHistoricoAdmin();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarHistorialAdmin);
} else {
    iniciarHistorialAdmin();
}