/**
 * SMILETRACK — REPORTES CLÍNICOS
 * JS basado en st-adm-07
 */

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES GLOBALES (iguales a st-adm-07)
// ═══════════════════════════════════════════════════════════════════

const safeGetElement = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`[SmileTrack] Elemento no encontrado: #${id}`);
    return el;
};

const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
};

const showToast = (message, type = 'success') => {
    const toast = safeGetElement('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''} show`;

    if (toast._timeoutId) clearTimeout(toast._timeoutId);
    toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

// ═══════════════════════════════════════════════════════════════════
// ANIMACIÓN DE CONTADORES (igual a st-adm-07)
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DE COMPONENTES (iguales a st-adm-07)
// ═══════════════════════════════════════════════════════════════════

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
};

const initServerStats = () => {
    const statEls = [
        safeGetElement('metricTotal'),
        safeGetElement('metricActivos'),
        safeGetElement('metricVacaciones'),
    ];

    statEls.forEach(el => {
        if (!el) return;
        const target = parseInt(el.getAttribute('data-target') ?? '0', 10);
        if (!isNaN(target) && target > 0) {
            animateCounter(el, target);
        } else {
            el.textContent = '0';
        }
    });
};

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const init = async () => {
    initSidebar();
    initServerStats(); // Anima contadores desde data-target
};

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', init);
