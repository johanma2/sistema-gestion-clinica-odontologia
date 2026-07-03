/**
 * SMILETRACK — ODONTOGRAMA DIGITAL (odontograma.js)
 * Lógica original preservada + Accesibilidad + Persistencia
 * ⚠️ LÓGICA DE DIBUJO CANVAS: SIN MODIFICAR
 */

// ═══════════════════════════════════════════════════════════════════
//  UTILIDADES GLOBALES
// ═══════════════════════════════════════════════════════════════════

// Obtiene elemento del DOM con manejo seguro
const safeGetElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
  return el;
};

// Reduce llamadas a función en eventos frecuentes
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

// Muestra notificación temporal con auto-cierre
const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;

  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ═══════════════════════════════════════════════════════════════════
//  PERSISTENCIA CON LOCALSTORAGE
// ═══════════════════════════════════════════════════════════════════

const odoStorage = {
  key: 'smiletrack_odo_pedro_garcia',
  
  // Carga datos desde localStorage o usa datos de ejemplo
  load: () => {
    const stored = localStorage.getItem(odoStorage.key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error al cargar odontograma, usando datos de ejemplo');
      }
    }
    // Datos de ejemplo iniciales (estructura compatible con OdontogramaController)
    return {
      estados: {
        17: { estado: 'caries', fechaISO: '2026-03-20' },
        16: { estado: 'caries', fechaISO: '2026-03-20' },
        22: { estado: 'sellante', fechaISO: '2026-02-15' },
        23: { estado: 'sellante', fechaISO: '2026-02-15' },
        24: { estado: 'sellante', fechaISO: '2026-02-15' },
        25: { estado: 'restauracion', fechaISO: '2026-01-10' },
        26: { estado: 'endodoncia', fechaISO: '2025-12-05' },
        27: { estado: 'corona', fechaISO: '2025-11-20' },
        28: { estado: 'corona', fechaISO: '2025-11-20' },
        31: { estado: 'sano', fechaISO: '2026-03-01' },
        46: { estado: 'extraido', fechaISO: '2025-10-15' },
        47: { estado: 'restauracion', fechaISO: '2026-02-28' },
      },
      historial: {
        12: [
          { fecha: '20 Mar 2025', fechaISO: '2025-03-20T10:00:00', estado: 'caries', doctor: 'Dr. Carlos Méndez', obs: 'cara vestibular' },
        ],
        25: [
          { fecha: '02 Nov 2024', fechaISO: '2024-11-02T14:00:00', estado: 'restauracion', doctor: 'Dr. Méndez', obs: '' },
        ],
        23: [
          { fecha: '15 Dic 2024', fechaISO: '2024-12-15T11:00:00', estado: 'endodoncia', doctor: 'Dr. Torres', obs: '' },
        ],
      },
      ultimasMods: [
        { num: 12, estado: 'Caries', fecha: '20 Mar 2025', fechaISO: '2025-03-20T10:00:00', doctor: 'Dr. Méndez' },
        { num: 25, estado: 'Restauración', fecha: '02 Nov 2024', fechaISO: '2024-11-02T14:00:00', doctor: 'Dr. Méndez' },
        { num: 23, estado: 'Endodoncia', fecha: '15 Dic 2024', fechaISO: '2024-12-15T11:00:00', doctor: 'Dr. Torres' },
      ],
      nextMod: 3
    };
  },
  
  // Guarda datos en localStorage
  save: (data) => {
    try {
      localStorage.setItem(odoStorage.key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error al guardar odontograma:', e);
      return false;
    }
  },
  
  // Actualiza estado de un diente
  updateTooth: (num, estado, doctor = 'Dr. Andrés Torres', obs = '') => {
    const data = odoStorage.load();
    const now = new Date();
    const fechaISO = now.toISOString();
    const fechaStr = now.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    
    // Actualiza estado actual
    data.estados[num] = { estado, fechaISO };
    
    // Agrega al historial del diente
    if (!data.historial[num]) data.historial[num] = [];
    data.historial[num].unshift({ fecha: fechaStr, fechaISO, estado, doctor, obs });
    
    // Agrega a últimas modificaciones
    const label = ESTADOS_CONFIG.find(e => e.key === estado)?.label || estado;
    data.ultimasMods.unshift({ num, estado: label, fecha: fechaStr, fechaISO, doctor });
    if (data.ultimasMods.length > 8) data.ultimasMods.pop();
    data.nextMod = (data.nextMod || 0) + 1;
    
    odoStorage.save(data);
    return { num, estado, fecha: fechaStr };
  }
};

// ═══════════════════════════════════════════════════════════════════
//  ODONTOGRAMA CONTROLLER (ESPEJO DEL BACKEND C# - SIN MODIFICAR LÓGICA)
// ═══════════════════════════════════════════════════════════════════

class OdontogramaController {
  constructor() {
    this._paciente = {
      id: 1,
      nombre: 'Pedro García',
      codigoHC: 'HC-2026-001',
      fechaNacimiento: '1991-03-15',
    };

    // Carga estados desde localStorage o usa datos de ejemplo
    const stored = odoStorage.load();
    this._estados = stored.estados || {};
    this._historial = stored.historial || {};
    this._ultimasMods = stored.ultimasMods || [];
    this._nextMod = stored.nextMod || this._ultimasMods.length;

    this._tipo = 'adulto';
    this.selDiente = null;
  }

  // Getter/Setter para selDiente
  getSelDiente() { return this.selDiente; }
  setSelDiente(num) { this.selDiente = num; }

  _calcEdad(iso) {
    const hoy = new Date(), nac = new Date(iso);
    let e = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
    return e;
  }

  getTipoDenticion() {
    return this._calcEdad(this._paciente.fechaNacimiento) < 13 ? 'nino' : 'adulto';
  }

  getEstado(num) {
    const data = this._estados[num];
    return data ? data.estado : null;
  }

  setEstado(num, estado, doctor = 'Dr. Andrés Torres', obs = '') {
    // Actualiza en localStorage
    odoStorage.updateTooth(num, estado, doctor, obs);
    
    // Actualiza en memoria
    const now = new Date();
    const fechaISO = now.toISOString();
    this._estados[num] = { estado, fechaISO };
    
    if (!this._historial[num]) this._historial[num] = [];
    const fechaStr = now.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    this._historial[num].unshift({ fecha: fechaStr, fechaISO, estado, doctor, obs });

    const label = ESTADOS_CONFIG.find(e => e.key === estado)?.label || estado;
    this._ultimasMods.unshift({ num, estado: label, fecha: fechaStr, fechaISO, doctor });
    if (this._ultimasMods.length > 8) this._ultimasMods.pop();

    return { num, prev: null, estado };
  }

  getHistorialDiente(num) { return this._historial[num] || []; }
  getUltimasMods() { return [...this._ultimasMods]; }

  // Fix bug en cálculo de "sanos"
  getResumen(tipo) {
    const nums = ODO_CONFIG[tipo].groups.flatMap(g => g.rows.flatMap(r => r.nums));
    const res = {};
    
    // Contar cada estado (excluyendo 'sano' inicialmente)
    nums.forEach(n => {
      const e = this.getEstado(n);
      if (e && e !== 'sano') {
        res[e] = (res[e] || 0) + 1;
      }
    });
    
    // Calcular sanos como el resto de piezas sin estado registrado
    const conEstadoNoSano = Object.values(res).reduce((a, b) => a + b, 0);
    res['sano'] = nums.length - conEstadoNoSano;
    
    return res;
  }
}

const odoCtrl = new OdontogramaController();


// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN DE ESTADOS Y COLORES (SIN MODIFICAR)
// ═══════════════════════════════════════════════════════════════════

const ESTADOS_CONFIG = [
  { key: 'sano', label: 'Sano', ico: '✅', color: '#22c55e', tipo: 'dot', cssClass: 'eb-sano' },
  { key: 'caries', label: 'Caries', ico: '⚠️', color: '#f59e0b', tipo: 'dot', cssClass: 'eb-caries' },
  { key: 'corona', label: 'Corona', ico: '👑', color: '#f59e0b', tipo: 'dot', cssClass: 'eb-corona' },
  { key: 'endodoncia', label: 'Endodoncia', ico: '🔬', color: '#9333ea', tipo: 'bar', cssClass: 'eb-endodoncia' },
  { key: 'restauracion', label: 'Restauración', ico: '🔵', color: '#2563eb', tipo: 'bar', cssClass: 'eb-restauracion' },
  { key: 'extraido', label: 'Extraído', ico: '✖', color: '#64748b', tipo: 'x', cssClass: 'eb-extraido' },
];

const ESTADO_COLOR = Object.fromEntries(ESTADOS_CONFIG.map(e => [e.key, e.color]));
const ESTADO_TIPO = Object.fromEntries(ESTADOS_CONFIG.map(e => [e.key, e.tipo]));


// ═══════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN FDI (adulto / niño) - SIN MODIFICAR
// ═══════════════════════════════════════════════════════════════════

const ODO_CONFIG = {
  adulto: {
    TW: 30, TH: 38,
    groups: [
      { rows: [
        { label: 'MAXILAR SUPERIOR DERECHO (18 al 11)', nums: [18,17,16,15,14,13,12,11] },
        { label: 'MAXILAR SUPERIOR IZQUIERDO (21 al 28)', nums: [21,22,23,24,25,26,27,28] },
      ]},
      { rows: [
        { label: 'MAXILAR INFERIOR IZQUIERDO (31 al 38)', nums: [31,32,33,34,35,36,37,38] },
        { label: 'MAXILAR INFERIOR DERECHO (41 al 48)', nums: [41,42,43,44,45,46,47,48] },
      ]},
    ],
  },
  nino: {
    TW: 36, TH: 44,
    groups: [
      { rows: [
        { label: 'SUPERIOR DERECHO (55 al 51)', nums: [55,54,53,52,51] },
        { label: 'SUPERIOR IZQUIERDO (61 al 65)', nums: [61,62,63,64,65] },
      ]},
      { rows: [
        { label: 'INFERIOR IZQUIERDO (85 al 81)', nums: [85,84,83,82,81] },
        { label: 'INFERIOR DERECHO (71 al 75)', nums: [71,72,73,74,75] },
      ]},
    ],
  },
};


// ═══════════════════════════════════════════════════════════════════
//  DIBUJO CANVAS - LÓGICA ORIGINAL PRESERVADA (NO MODIFICAR)
// ═══════════════════════════════════════════════════════════════════

function isMolar(n) { const d = n%10; return d>=6 && d<=8; }
function isPremolar(n) { const d = n%10; return d===4 || d===5; }
function isCanine(n) { return n%10===3; }

function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

function applyTooth(ctx, fill, border, lw = 1) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = lw; ctx.stroke();
}

function drawShape(ctx, num, ox, oy, tw, th, fill, border, lw) {
  if (isMolar(num)) {
    rrPath(ctx, ox, oy, tw, th, 4); applyTooth(ctx, fill, border, lw);
    ctx.strokeStyle = 'rgba(0,180,255,.2)'; ctx.lineWidth = .5;
    const cx = ox+tw/2, cy = oy+th/2-2;
    ctx.beginPath(); ctx.moveTo(cx-4, cy-2); ctx.lineTo(cx+4, cy-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-5); ctx.lineTo(cx, cy+3); ctx.stroke();
  } else if (isPremolar(num)) {
    rrPath(ctx, ox, oy, tw, th, 4); applyTooth(ctx, fill, border, lw);
    ctx.strokeStyle = 'rgba(0,180,255,.15)'; ctx.lineWidth = .5;
    const cx = ox+tw/2, cy = oy+th/2-2;
    ctx.beginPath(); ctx.moveTo(cx, cy-4); ctx.lineTo(cx, cy+3); ctx.stroke();
  } else if (isCanine(num)) {
    const cx = ox+tw/2;
    ctx.beginPath();
    ctx.moveTo(ox+3, oy); ctx.lineTo(ox+tw-3, oy);
    ctx.quadraticCurveTo(ox+tw, oy, ox+tw, oy+3);
    ctx.lineTo(ox+tw, oy+th-8);
    ctx.quadraticCurveTo(ox+tw-1, oy+th+2, cx, oy+th+2);
    ctx.quadraticCurveTo(ox+1, oy+th+2, ox, oy+th-8);
    ctx.lineTo(ox, oy+3); ctx.quadraticCurveTo(ox, oy, ox+3, oy); ctx.closePath();
    applyTooth(ctx, fill, border, lw);
  } else {
    const cx = ox+tw/2;
    ctx.beginPath();
    ctx.moveTo(ox+2, oy); ctx.lineTo(ox+tw-2, oy);
    ctx.quadraticCurveTo(ox+tw, oy, ox+tw, oy+2);
    ctx.lineTo(ox+tw, oy+th-4);
    ctx.quadraticCurveTo(ox+tw-.5, oy+th, cx, oy+th);
    ctx.quadraticCurveTo(ox+.5, oy+th, ox, oy+th-4);
    ctx.lineTo(ox, oy+2); ctx.quadraticCurveTo(ox, oy, ox+2, oy); ctx.closePath();
    applyTooth(ctx, fill, border, lw);
  }
}

function drawTooth(canvas, num, seleccionado) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const pad = 3;
  const tw = W - pad*2;
  const th = H - pad*2 - 8;
  const ox = pad, oy = pad + 2;

  const isSel = seleccionado === num;
  const fill = isSel ? 'rgba(0,45,88,.97)' : 'rgba(0,18,42,.9)';
  const border = isSel ? '#00d4ff' : 'rgba(0,160,220,.6)';
  const lw = isSel ? 1.8 : 1;

  if (isSel) { ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 14; }
  drawShape(ctx, num, ox, oy, tw, th, fill, border, lw);
  ctx.shadowBlur = 0;

  const estadoKey = odoCtrl.getEstado(num);
  if (estadoKey) {
    const color = ESTADO_COLOR[estadoKey] || '#00d4ff';
    const tipo = ESTADO_TIPO[estadoKey] || 'dot';
    const cx = W/2, cy = oy + 6;
    ctx.shadowColor = color; ctx.shadowBlur = 9;

    if (tipo === 'dot') {
      ctx.beginPath(); ctx.arc(cx, cy, 3.8, 0, 2*Math.PI);
      ctx.fillStyle = color; ctx.fill();
    } else if (tipo === 'bar') {
      ctx.fillStyle = color;
      ctx.beginPath(); rrPath(ctx, cx-5, cy-2, 10, 3, 1.5); ctx.fill();
    } else {
      ctx.strokeStyle = color; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx-4, cy-4); ctx.lineTo(cx+4, cy+4);
      ctx.moveTo(cx+4, cy-4); ctx.lineTo(cx-4, cy+4);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  ctx.font = `bold 7px sans-serif`;
  ctx.fillStyle = isSel ? '#00eeff' : 'rgba(0,200,255,.75)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(num, W/2, oy + th - 4);
}


// ═══════════════════════════════════════════════════════════════════
//  RENDER ODONTOGRAMA HOLOGRÁFICO - LÓGICA ORIGINAL PRESERVADA
// ═══════════════════════════════════════════════════════════════════

let _canvases = {};

function renderOdontograma(tipo) {
  const host = safeGetElement('odontogramaHost');
  if (!host) return;
  _canvases = {};

  const cfg = ODO_CONFIG[tipo];

  if (!document.getElementById('_scan_kf')) {
    const st = document.createElement('style');
    st.id = '_scan_kf';
    st.textContent = '@keyframes scan{0%{transform:translateY(0)}100%{transform:translateY(600px)}}';
    document.head.appendChild(st);
  }

  const hw = document.createElement('div');
  hw.style.cssText = `
    background:#030d1a; border-radius:12px; padding:14px 10px;
    font-family:sans-serif; position:relative; overflow:hidden; width:100%;
  `;

  const sl = document.createElement('div');
  sl.style.cssText = `
    position:absolute;left:0;right:0;height:1px;top:0;z-index:1;pointer-events:none;
    background:linear-gradient(90deg,transparent,rgba(0,200,255,.22),transparent);
    animation:scan 3s linear infinite;
  `;
  hw.appendChild(sl);

  cfg.groups.forEach((g, gi) => {
    const labRow = document.createElement('div');
    labRow.style.cssText = 'display:flex;justify-content:center;gap:4px;margin-bottom:3px;position:relative;z-index:2;';
    g.rows.forEach(r => {
      const sp = document.createElement('span');
      sp.style.cssText = 'font-size:7px;color:rgba(0,212,255,.38);letter-spacing:.04em;text-transform:uppercase;flex:1;text-align:center;';
      sp.textContent = r.label;
      labRow.appendChild(sp);
    });
    hw.appendChild(labRow);

    const rowDiv = document.createElement('div');
    rowDiv.style.cssText = 'display:flex;justify-content:center;align-items:stretch;gap:2px;position:relative;z-index:2;margin-bottom:8px;flex-wrap:nowrap;';

    g.rows.forEach((r, ri) => {
      const half = document.createElement('div');
      half.style.cssText = 'display:flex;gap:2px;';

      r.nums.forEach(num => {
        const cv = document.createElement('canvas');
        cv.width = cfg.TW; cv.height = cfg.TH;
        cv.style.cssText = 'display:block;border-radius:3px;cursor:pointer;';
        // Atributos de accesibilidad para canvas
        cv.setAttribute('role', 'button');
        cv.setAttribute('tabindex', '0');
        cv.setAttribute('aria-label', `Diente ${num}: ${odoCtrl.getEstado(num) || 'Sin estado registrado'}. Haz clic o presiona Enter para seleccionar`);
        
        const est = odoCtrl.getEstado(num);
        const lbl = est ? (ESTADOS_CONFIG.find(e => e.key === est)?.label || est) : '';
        cv.title = `Diente ${num}${lbl ? ' — ' + lbl : ''}`;
        drawTooth(cv, num, odoCtrl.getSelDiente());
        
        // Event listeners para accesibilidad
        cv.addEventListener('click', () => onDienteClick(num));
        cv.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDienteClick(num);
          }
        });
        
        _canvases[num] = cv;
        half.appendChild(cv);
      });

      rowDiv.appendChild(half);
      if (ri === 0) {
        const mid = document.createElement('div');
        mid.style.cssText = 'width:1px;background:rgba(0,212,255,.22);align-self:stretch;flex-shrink:0;margin:0 3px;border-radius:1px;';
        rowDiv.appendChild(mid);
      }
    });

    hw.appendChild(rowDiv);

    if (gi === 0) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:7px;border-top:1px dashed rgba(0,212,255,.12);margin:0 0 10px;position:relative;z-index:2;';
      hw.appendChild(sep);
    }
  });

  const leg = document.createElement('div');
  leg.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px;position:relative;z-index:2;';
  ESTADOS_CONFIG.forEach(e => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:9px;color:rgba(180,220,255,.6);';
    const ic = e.tipo === 'dot'
      ? `<span style="width:7px;height:7px;border-radius:50%;background:${e.color};display:inline-block;"></span>`
      : e.tipo === 'bar'
        ? `<span style="width:11px;height:3px;border-radius:2px;background:${e.color};display:inline-block;"></span>`
        : `<span style="font-size:10px;color:${e.color};">✕</span>`;
    item.innerHTML = `${ic} ${e.label}`;
    leg.appendChild(item);
  });
  hw.appendChild(leg);

  host.innerHTML = '';
  host.appendChild(hw);
}

function rebuildAllCanvases() {
  Object.entries(_canvases).forEach(([num, cv]) => {
    drawTooth(cv, parseInt(num), odoCtrl.getSelDiente());
    // Actualiza aria-label después de redibujar
    const est = odoCtrl.getEstado(parseInt(num));
    const lbl = est ? (ESTADOS_CONFIG.find(e => e.key === est)?.label || est) : '';
    cv.setAttribute('aria-label', `Diente ${num}: ${lbl || 'Sin estado registrado'}. Haz clic o presiona Enter para seleccionar`);
  });
}


// ═══════════════════════════════════════════════════════════════════
//  RENDER RESUMEN - LÓGICA ORIGINAL PRESERVADA
// ═══════════════════════════════════════════════════════════════════

function renderResumen(tipo) {
  const el = safeGetElement('odoResumen');
  if (!el) return;
  const res = odoCtrl.getResumen(tipo);

  const colores = {
    sano: { bg: '#dcfce7', color: '#16a34a', ico: '✅' },
    caries: { bg: '#ffedd5', color: '#92400e', ico: '⚠️' },
    corona: { bg: '#ffedd5', color: '#92400e', ico: '👑' },
    endodoncia: { bg: '#f3e8ff', color: '#9333ea', ico: '🔬' },
    restauracion: { bg: '#dbeafe', color: '#2563eb', ico: '🔵' },
    extraido: { bg: '#f1f5f9', color: '#64748b', ico: '✖' },
  };

  el.innerHTML = Object.entries(res)
    .filter(([, cnt]) => cnt > 0)
    .map(([key, cnt]) => {
      const c = colores[key] || { bg: '#f1f5f9', color: '#64748b', ico: '·' };
      const lbl = ESTADOS_CONFIG.find(e => e.key === key)?.label || key;
      return `<span class="res-chip" style="background:${c.bg};color:${c.color};" role="status" aria-label="${cnt} ${lbl}${cnt !== 1 ? 's' : ''}">
        ${c.ico} ${cnt} ${lbl}${cnt !== 1 ? 's' : ''}
      </span>`;
    }).join('');
}


// ═══════════════════════════════════════════════════════════════════
//  INTERACCIÓN — clic en diente - LÓGICA ORIGINAL PRESERVADA
// ═══════════════════════════════════════════════════════════════════

function onDienteClick(num) {
  odoCtrl.setSelDiente(num);
  rebuildAllCanvases();
  renderPiezaPanel(num);
  renderEstadosBtns(num);
  
  // Enfoca el panel de pieza para usuarios de teclado
  const card = safeGetElement('cardPieza');
  if (card) card.focus?.();
}

function renderPiezaPanel(num) {
  const card = safeGetElement('cardPieza');
  const titulo = safeGetElement('piezaTitulo');
  const estado = safeGetElement('piezaEstado');
  const hist = safeGetElement('piezaHist');
  if (!card) return;

  card.style.display = 'block';

  const estadoKey = odoCtrl.getEstado(num);
  const eCfg = ESTADOS_CONFIG.find(e => e.key === estadoKey);

  titulo.textContent = `Pieza ${num} seleccionada`;

  if (estadoKey) {
    estado.innerHTML = `<strong>Estado actual:</strong> ${eCfg?.label || estadoKey}`;
    estado.style.cssText = '';
    estado.style.display = 'inline-flex';
    const colors = {
      sano: 'var(--estado-sano-bg)/var(--green)/var(--estado-sano-text)',
      caries: 'var(--estado-caries-bg)/var(--orange)/var(--estado-caries-text)',
      corona: 'var(--estado-corona-bg)/var(--orange)/var(--estado-corona-text)',
      endodoncia: 'var(--estado-endodoncia-bg)/var(--purple)/var(--estado-endodoncia-text)',
      restauracion: 'var(--estado-restauracion-bg)/var(--primary)/var(--estado-restauracion-text)',
      extraido: 'var(--estado-extraido-bg)/var(--border)/var(--estado-extraido-text)'
    };
    const parts = (colors[estadoKey] || 'var(--estado-caries-bg)/var(--orange)/var(--estado-caries-text)').split('/');
    estado.style.background = parts[0];
    estado.style.border = `1.5px solid ${parts[1]}`;
    estado.style.color = parts[2];
    estado.style.padding = '6px 14px';
    estado.style.borderRadius = 'var(--radius-sm)';
    estado.style.fontSize = '.85rem';
    estado.style.fontWeight = '600';
    estado.style.marginBottom = '16px';
  } else {
    estado.innerHTML = '<strong>Estado actual:</strong> Sin registrar';
    estado.style.color = 'var(--text-muted)';
  }

  const entradas = odoCtrl.getHistorialDiente(num);
  if (!entradas.length) {
    hist.innerHTML = '<div style="font-size:.8rem;color:var(--text-muted);padding:8px 0;">Sin historial registrado</div>';
  } else {
    hist.innerHTML = entradas.map((h, i) => {
      const cls = i % 2 === 0 ? 'hist-entry-red' : 'hist-entry-green';
      const eCfgH = ESTADOS_CONFIG.find(e => e.key === h.estado);
      const isoTime = h.fechaISO || `2025-01-01T10:00:00`;
      return `<div class="hist-entry ${cls}" role="listitem">
        <div><time class="hist-entry-date" datetime="${isoTime}">${h.fecha}</time> → <strong>${eCfgH?.label || h.estado}</strong>${h.obs ? ' · ' + h.obs : ''}</div>
        <div class="hist-entry-doc">${h.doctor}</div>
      </div>`;
    }).join('');
  }
}


// ═══════════════════════════════════════════════════════════════════
//  PANEL DERECHO — botones de estado - LÓGICA ORIGINAL PRESERVADA
// ═══════════════════════════════════════════════════════════════════

function renderEstadosBtns(selNum = null) {
  const list = safeGetElement('estadosList');
  if (!list) return;
  const estadoActual = selNum ? odoCtrl.getEstado(selNum) : null;

  // Generar botones sin onclick inline
  list.innerHTML = ESTADOS_CONFIG.map(e => {
    const isSelected = estadoActual === e.key;
    return `
    <button class="estado-btn ${e.cssClass}${isSelected ? ' sel' : ''}"
      data-estado="${e.key}"
      role="radio"
      aria-checked="${isSelected}"
      aria-label="Establecer estado: ${e.label}">
      <span class="estado-ico" aria-hidden="true">${e.ico}</span>
      ${e.label}
    </button>
  `;
  }).join('');
  
  // Agregar event listeners después de renderizar
  list.querySelectorAll('.estado-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const estadoKey = btn.dataset.estado;
      aplicarEstado(estadoKey);
    });
    
    // Soporte para teclado
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const estadoKey = btn.dataset.estado;
        aplicarEstado(estadoKey);
      }
    });
  });
}

function aplicarEstado(estadoKey) {
  const num = odoCtrl.getSelDiente();
  if (!num) { showToast('Primero selecciona un diente haciendo clic sobre él', 'warning'); return; }

  odoCtrl.setEstado(num, estadoKey);
  rebuildAllCanvases();
  renderPiezaPanel(num);
  renderEstadosBtns(num);
  renderUltimasMods();
  renderResumen(odoCtrl._tipo);
  updateCounts();
  showToast('Estado actualizado correctamente', 'success');
}


// ═══════════════════════════════════════════════════════════════════
//  RENDER ÚLTIMAS MODIFICACIONES - LÓGICA ORIGINAL PRESERVADA
// ═══════════════════════════════════════════════════════════════════

function renderUltimasMods() {
  const el = safeGetElement('ultimasMods');
  if (!el) return;
  const mods = odoCtrl.getUltimasMods();
  if (!mods.length) {
    el.innerHTML = '<div style="font-size:.8rem;color:var(--text-muted);padding:6px 0;">Sin modificaciones.</div>';
    return;
  }
  el.innerHTML = mods.map(m => {
    const isoTime = m.fechaISO || `2025-01-01T10:00:00`;
    return `
    <div class="mod-item" role="listitem">
      <span class="mod-num">Pieza ${m.num}</span> →
      <span class="mod-est">${m.estado}</span> ·
      <time datetime="${isoTime}">${m.fecha}</time> · ${m.doctor}
    </div>`;
  }).join('');
}


// ═══════════════════════════════════════════════════════════════════
//  CAMBIO DE TIPO (Adulto / Infantil) - LÓGICA ORIGINAL PRESERVADA
// ═══════════════════════════════════════════════════════════════════

function setTipo(tipo, btn) {
  odoCtrl._tipo = tipo;
  odoCtrl.setSelDiente(null);
  
  // Forzar ocultamiento del panel antes de cualquier render
  const card = safeGetElement('cardPieza');
  if (card) card.style.display = 'none';

  // Tabs
  document.querySelectorAll('.tipo-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  // Meta
  const metaEl = safeGetElement('dentitionType');
  if (metaEl) {
    metaEl.textContent = tipo === 'adulto' ? 'Dentición adulta' : 'Dentición infantil';
    metaEl.setAttribute('aria-label', `Tipo de dentición: ${tipo === 'adulto' ? 'adulta' : 'infantil'}`);
  }

  renderOdontograma(tipo);
  renderResumen(tipo);
  renderEstadosBtns(null);

  // Actualizar contadores tabs y aria-label
  const cfg = ODO_CONFIG[tipo];
  const total = cfg.groups.flatMap(g => g.rows.flatMap(r => r.nums)).length;
  
  if (tipo === 'adulto') {
    safeGetElement('cntAdulto').textContent = total;
    safeGetElement('btnAdulto').setAttribute('aria-label', `Ver dentición adulta, ${total} piezas`);
  } else {
    safeGetElement('cntInfantil').textContent = total;
    safeGetElement('btnInfantil').setAttribute('aria-label', `Ver dentición infantil, ${total} piezas`);
  }
  
  updateCounts();
}


// ═══════════════════════════════════════════════════════════════════
//  GUARDAR CAMBIOS - LÓGICA ORIGINAL PRESERVADA
// ═══════════════════════════════════════════════════════════════════

function guardarCambios() {
  const modal = safeGetElement('modalGuardar');
  if (modal) {
    openModal(modal);
  } else {
    showToast('Guardando cambios…', 'info');
    setTimeout(() => showToast('Cambios guardados exitosamente', 'success'), 1500);
  }
}

function confirmarGuardado() {
  const btn = safeGetElement('btnGuardar');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Guardado';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.disabled = false;
    }, 2000);
  }
  console.log('Guardando estados:', odoCtrl._estados);
  closeModal(safeGetElement('modalGuardar'));
  showToast('Cambios guardados exitosamente', 'success');
}


// ═══════════════════════════════════════════════════════════════════
//  ACTUALIZAR CONTADORES KPIs
// ═══════════════════════════════════════════════════════════════════

function updateCounts() {
  const tipo = odoCtrl._tipo;
  const resumen = odoCtrl.getResumen(tipo);
  
  updateStat('stat-sanos', resumen.sano || 0);
  updateStat('stat-caries', resumen.caries || 0);
  updateStat('stat-tratamientos', (resumen.corona || 0) + (resumen.endodoncia || 0) + (resumen.restauracion || 0));
  
  const total = Object.values(resumen).reduce((a, b) => a + b, 0);
  updateStat('stat-total', total);
}

function updateStat(elementId, value) {
  const el = safeGetElement(elementId);
  if (!el) return;
  if (typeof animateCounter !== 'undefined') {
    animateCounter(el, value);
  } else {
    el.textContent = value;
  }
}

// Anima contador numérico con transición suave
function animateCounter(el, target) {
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 30);
}


// ═══════════════════════════════════════════════════════════════════
//  MODALES - ACCESIBILIDAD ARIA
// ═══════════════════════════════════════════════════════════════════

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');
  modalEl.removeAttribute('inert');
  
  // Enfocar botón de cerrar al abrir modal
  const closeBtn = modalEl.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();
  
  // Bloquear scroll del body
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.setAttribute('inert', '');
  
  // Restaurar scroll
  document.body.style.overflow = '';
}


// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR MÓVIL (INTEGRACIÓN MÍNIMA)
// ═══════════════════════════════════════════════════════════════════

const toggleSidebar = (show) => {
  const sb = safeGetElement('sidebar');
  const ov = safeGetElement('overlay');
  const hb = safeGetElement('hamburger');
  if (!sb || !ov) return;
  if (show) {
    sb.classList.add('open');
    ov.classList.add('open');
    hb?.classList.add('open');
  } else {
    sb.classList.remove('open');
    ov.classList.remove('open');
    hb?.classList.remove('open');
  }
};


// ═══════════════════════════════════════════════════════════════════
//  FECHA DINÁMICA DEL HEADER
// ═══════════════════════════════════════════════════════════════════

function updateHeaderDate() {
  const now = new Date();
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  
  const dayName = days[now.getDay()];
  const dateStr = `${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`;
  const isoStr = now.toISOString().split('T')[0];
  
  const elDate = safeGetElement('headerDate');
  if (elDate) {
    elDate.textContent = `${dayName}, ${dateStr}`;
    elDate.setAttribute('datetime', isoStr);
  }
}


// ═══════════════════════════════════════════════════════════════════
//  INIT - INTEGRACIÓN MÍNIMA
// ═══════════════════════════════════════════════════════════════════

function init() {
  // Inicializar componentes de UI
  const hb = safeGetElement('hamburger');
  const ov = safeGetElement('overlay');
  hb?.addEventListener('click', () => toggleSidebar(true));
  ov?.addEventListener('click', () => toggleSidebar(false));
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => { if (window.innerWidth <= 680) toggleSidebar(false); });
  });

  // Fecha dinámica
  updateHeaderDate();
  
  // Datos del paciente
  safeGetElement('patientName').textContent = odoCtrl._paciente.nombre;
  safeGetElement('patientHC').textContent = odoCtrl._paciente.codigoHC;
  
  const tipo = odoCtrl.getTipoDenticion();

  if (tipo === 'nino') {
    safeGetElement('btnAdulto')?.classList.remove('active');
    safeGetElement('btnInfantil')?.classList.add('active');
    safeGetElement('btnAdulto')?.setAttribute('aria-selected', 'false');
    safeGetElement('btnInfantil')?.setAttribute('aria-selected', 'true');
  }

  updateCounts();
  
  // Renderizar componentes del odontograma (LÓGICA ORIGINAL)
  renderOdontograma(tipo);
  renderResumen(tipo);
  renderEstadosBtns(null);
  renderUltimasMods();
  
  // Event listeners para tabs
  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tipo = e.currentTarget.dataset.tipo;
      setTipo(tipo, e.currentTarget);
    });
  });
  
  safeGetElement('btnGuardar')?.addEventListener('click', guardarCambios);
  
  // Modal guardar: acciones
  safeGetElement('modalGuardarClose')?.addEventListener('click', () => {
    closeModal(safeGetElement('modalGuardar'));
  });
  safeGetElement('modalGuardarCancel')?.addEventListener('click', () => {
    closeModal(safeGetElement('modalGuardar'));
  });
  safeGetElement('modalGuardarConfirm')?.addEventListener('click', confirmarGuardado);
  safeGetElement('modalGuardar')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalGuardar') {
      closeModal(e.target);
    }
  });
  
  // Escape cierra modal y sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(safeGetElement('modalGuardar'));
      toggleSidebar(false);
    }
  });
  
  // Limpieza al unload
  window.addEventListener('beforeunload', () => {
    // Remover listeners en implementación SPA real
  });
}

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);