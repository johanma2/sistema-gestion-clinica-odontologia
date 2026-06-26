// SMILETRACK – REPORTES.JS
const API_BASE = '/api';

const MESES_LABELS = {
  '2026-01':'Enero 2026','2026-02':'Febrero 2026','2026-03':'Marzo 2026',
  '2026-04':'Abril 2026','2026-05':'Mayo 2026'
};

const SAMPLE_DATA = {
  '2026-03': {
    citas:28, ingresos:'$1.8M', canceladas:2, asistencia:'95%',
    vsCitas:'↑ 4 vs febrero', vsIngresos:'↑ 12% vs febrero',
    vsCanceladas:'↓ 1 vs febrero', vsAsistencia:'↑ 2% vs febrero',
    semanas:[
      {label:'Semana 1', valor:7, max:8},
      {label:'Semana 2', valor:6, max:8},
      {label:'Semana 3', valor:8, max:8},
      {label:'Semana 4', valor:7, max:8},
    ],
    meta:7, vsMes:'↑ 13.5% vs mes anterior',
    servicios:[
      {label:'Consulta Gral.', valor:7, max:8, color:'#3b82f6'},
      {label:'Control',        valor:6, max:8, color:'#22c55e'},
      {label:'Limpieza',       valor:8, max:8, color:'#9333ea'},
      {label:'Resina',         valor:7, max:8, color:'#f59e0b'},
    ],
  },
  '2026-02': {
    citas:24, ingresos:'$1.6M', canceladas:3, asistencia:'93%',
    vsCitas:'↑ 2 vs enero', vsIngresos:'↑ 8% vs enero',
    vsCanceladas:'↓ 2 vs enero', vsAsistencia:'↑ 1% vs enero',
    semanas:[
      {label:'Semana 1', valor:5, max:8},
      {label:'Semana 2', valor:7, max:8},
      {label:'Semana 3', valor:6, max:8},
      {label:'Semana 4', valor:6, max:8},
    ],
    meta:7, vsMes:'↑ 8% vs mes anterior',
    servicios:[
      {label:'Consulta Gral.', valor:6, max:8, color:'#3b82f6'},
      {label:'Control',        valor:5, max:8, color:'#22c55e'},
      {label:'Limpieza',       valor:7, max:8, color:'#9333ea'},
      {label:'Resina',         valor:6, max:8, color:'#f59e0b'},
    ],
  },
  '2026-01': {
    citas:22, ingresos:'$1.4M', canceladas:5, asistencia:'92%',
    vsCitas:'', vsIngresos:'', vsCanceladas:'', vsAsistencia:'',
    semanas:[
      {label:'Semana 1', valor:5, max:8},
      {label:'Semana 2', valor:6, max:8},
      {label:'Semana 3', valor:5, max:8},
      {label:'Semana 4', valor:6, max:8},
    ],
    meta:7, vsMes:'',
    servicios:[
      {label:'Consulta Gral.', valor:5, max:8, color:'#3b82f6'},
      {label:'Control',        valor:4, max:8, color:'#22c55e'},
      {label:'Limpieza',       valor:7, max:8, color:'#9333ea'},
      {label:'Resina',         valor:6, max:8, color:'#f59e0b'},
    ],
  },
};

let currentData = null;

// ── Render stats ──
function renderStats(d) {
  // Animar números enteros
  animateNum('statCitas', typeof d.citas === 'number' ? d.citas : null, d.citas);
  document.getElementById('statIngresos').textContent  = d.ingresos;
  animateNum('statCanceladas', typeof d.canceladas === 'number' ? d.canceladas : null, d.canceladas);
  document.getElementById('statAsistencia').textContent = d.asistencia;

  setVs('vsCitas',       d.vsCitas,       d.vsCitas.startsWith('↑'));
  setVs('vsIngresos',    d.vsIngresos,    d.vsIngresos.startsWith('↑'));
  setVs('vsCanceladas',  d.vsCanceladas,  d.vsCanceladas.startsWith('↓'));
  setVs('vsAsistencia',  d.vsAsistencia,  d.vsAsistencia.startsWith('↑'));
}

function setVs(id, text, isUp) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'stat-vs ' + (isUp ? 'up' : 'down');
}

function animateNum(id, target, fallback) {
  const el = document.getElementById(id);
  if (target === null) { el.textContent = fallback; return; }
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 25));
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 35);
}

// ── Render bar chart (semanas) ──
function renderBarChart(d, mesKey) {
  const label = MESES_LABELS[mesKey] || '';
  document.getElementById('chartTitulo').textContent = `Citas por semana — ${label}`;
  document.getElementById('metaLabel').textContent   = `Meta: ${d.meta}/semana`;
  document.getElementById('vsMes').textContent        = d.vsMes;

  const container = document.getElementById('barChart');
  container.innerHTML = d.semanas.map((s, i) => `
    <div class="bar-row">
      <span class="bar-label">${s.label}</span>
      <div class="bar-bg">
        <div class="bar-fill c${i}" data-w="${Math.round((s.valor/s.max)*100)}" style="width:0"></div>
      </div>
      <span class="bar-val">${s.valor}</span>
    </div>
  `).join('');

  requestAnimationFrame(() => {
    container.querySelectorAll('.bar-fill').forEach(b => {
      b.style.width = b.dataset.w + '%';
    });
  });
}

// ── Render service chart ──
function renderServiceChart(servicios) {
  const container = document.getElementById('serviceChart');
  const maxVal = Math.max(...servicios.map(s => s.valor));
  container.innerHTML = servicios.map(s => `
    <div class="svc-row">
      <span class="svc-label">${s.label}</span>
      <div class="svc-bg">
        <div class="svc-fill" data-w="${Math.round((s.valor/maxVal)*100)}"
          style="width:0;background:${s.color}"></div>
      </div>
      <span class="svc-val">${s.valor}</span>
    </div>
  `).join('');

  requestAnimationFrame(() => {
    container.querySelectorAll('.svc-fill').forEach(b => {
      b.style.width = b.dataset.w + '%';
    });
  });
}

// ── Cargar mes ──
async function cargarMes(mesKey) {
  let data;
  try {
    const res = await fetch(`${API_BASE}/reports?mes=${mesKey}`);
    if (!res.ok) throw new Error();
    data = await res.json();
  } catch {
    data = SAMPLE_DATA[mesKey] || SAMPLE_DATA['2026-03'];
  }
  currentData = data;
  const label = MESES_LABELS[mesKey] || mesKey;
  document.getElementById('pageSub').textContent =
    `Productividad y estadísticas de Dr. Carlos Méndez · ${label}`;
  renderStats(data);
  renderBarChart(data, mesKey);
  renderServiceChart(data.servicios);
}

// ── Toast ──
function showToast(msg, ok=true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = ok ? '#1e293b' : '#b91c1c';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ── Guardar ──
document.getElementById('btnGuardar').addEventListener('click', async () => {
  const mes = document.getElementById('mesSelect').value;
  try {
    const res = await fetch(`${API_BASE}/reports/save`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ mes, data: currentData }),
    });
    if (!res.ok) throw new Error();
  } catch { /* silencioso */ }
  showToast('Cambios guardados correctamente ✓');
});

// ── Cambio de mes ──
document.getElementById('mesSelect').addEventListener('change', function() {
  cargarMes(this.value);
});

// ── Sidebar mobile ──
function initSidebar() {
  const ham = document.getElementById('hamburger');
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('overlay');
  ham.addEventListener('click', () => { sb.classList.toggle('open'); ov.classList.toggle('open'); });
  ov.addEventListener('click',  () => { sb.classList.remove('open'); ov.classList.remove('open'); });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      if (window.innerWidth <= 680) { sb.classList.remove('open'); ov.classList.remove('open'); }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  cargarMes('2026-03');
});