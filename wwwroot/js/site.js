/* ============================================================
 * site.js — Lógica JS GLOBAL compartida en TODAS las vistas
 * SmileTrack MVC 9.0 · UTF-8 sin BOM
 * Incluir SIEMPRE con <script src="~/js/site.js" defer></script>
 * ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY_COLLAPSED = 'smiletrack.sidebar.collapsed.';
  var STORAGE_KEY_SIDEBAR_OPEN = 'smiletrack.sidebar.mobileopen';

  function safeGetElement(id) {
    if (!id || typeof id !== 'string') return null;
    try {
      return document.getElementById(id);
    } catch (e) {
      console.error('[SmileTrack] safeGetElement error', e);
      return null;
    }
  }

  function slugify(str) {
    if (!str) return '' + Date.now();
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function guardarGrupoEstado(idGrupo, collapsed) {
    try {
      var k = STORAGE_KEY_COLLAPSED + idGrupo;
      if (collapsed) localStorage.setItem(k, '1');
      else localStorage.removeItem(k);
    } catch (e) { /* sin persistencia, sin problema */ }
  }

  function leerGrupoEstado(idGrupo) {
    try {
      return localStorage.getItem(STORAGE_KEY_COLLAPSED + idGrupo) === '1';
    } catch (e) {
      return false;
    }
  }

  /* ---------------------------------------------------------------
   *  SIDEBAR: Toggle de grupos colapsables (Accesible)
   * --------------------------------------------------------------- */
  function initSidebarGroups() {
    var sidebar = document.querySelector('.sidebar-nav');
    if (!sidebar) return 0;

    var headers = sidebar.querySelectorAll('.nav-group-header');
    if (!headers || headers.length === 0) return 0;

    var gruposInicializados = 0;

    headers.forEach(function (header) {
      var group = header.closest('.nav-group');
      if (!group) return;

      var titleText = (header.textContent || '').trim().split(/\s/)[0] || ('group-' + gruposInicializados);
      var idBase = 'nav-group-' + slugify(titleText);
      var idItems = idBase + '-items';

      var items = group.querySelector('.nav-group-items');
      if (!items) return;

      if (!items.id) items.id = idItems;
      if (!group.id) group.id = idBase;

      if (header.getAttribute('role') !== 'button') header.setAttribute('role', 'button');
      if (!header.hasAttribute('tabindex')) header.setAttribute('tabindex', '0');
      header.setAttribute('aria-controls', items.id);

      /* Busca link activo dentro de este grupo → debe estar ABIERTO por UX */
      var activo = group.querySelector('.nav-item.active');
      var collapsedDefault = activo ? false : leerGrupoEstado(group.id);
      group.classList.toggle('collapsed', !!collapsedDefault);
      header.setAttribute('aria-expanded', String(!collapsedDefault));

      function calcularAltura() {
        try {
          var h = items.scrollHeight || 2000;
          if (!group.classList.contains('collapsed')) {
            items.style.maxHeight = (h + 32) + 'px';
          } else {
            items.style.maxHeight = '0px';
          }
        } catch (e) { /* ignore */ }
      }

      calcularAltura();
      window.addEventListener('resize', calcularAltura, { passive: true });

      function toggleGroup() {
        try {
          var estaColapsado = group.classList.toggle('collapsed');
          header.setAttribute('aria-expanded', String(!estaColapsado));
          guardarGrupoEstado(group.id, estaColapsado);
          calcularAltura();
        } catch (e) {
          console.error('[SmileTrack] Error toggleando grupo sidebar', e);
        }
      }

      header.addEventListener('click', function (e) {
        e.preventDefault();
        toggleGroup();
      });

      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          toggleGroup();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          group.classList.remove('collapsed');
          header.setAttribute('aria-expanded', 'true');
          guardarGrupoEstado(group.id, false);
          calcularAltura();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          group.classList.add('collapsed');
          header.setAttribute('aria-expanded', 'false');
          guardarGrupoEstado(group.id, true);
          calcularAltura();
        }
      });

      gruposInicializados++;
    });

    /* Cerrar sidebar mobile al clickear un link navegable */
    try {
      sidebar.querySelectorAll('a.nav-item').forEach(function (link) {
        link.addEventListener('click', function () {
          if (window.innerWidth <= 900) {
            var sb = document.getElementById('sidebar');
            var ov = document.getElementById('overlay');
            var hb = document.getElementById('hamburger');
            if (sb) sb.classList.remove('open');
            if (ov) ov.classList.remove('open');
            if (hb) hb.setAttribute('aria-expanded', 'false');
          }
        });
      });
    } catch (e) { /* ignore */ }

    return gruposInicializados;
  }

  /* ---------------------------------------------------------------
   *  SIDEBAR: Menú hamburger móvil + overlay + Escape
   * --------------------------------------------------------------- */
  function initSidebarMobile() {
    var hamburger = safeGetElement('hamburger');
    var sidebar = safeGetElement('sidebar');
    var overlay = safeGetElement('overlay');

    if (!hamburger || !sidebar || !overlay) return false;

    var opened = false;

    function abrir() {
      opened = true;
      sidebar.classList.add('open');
      overlay.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      overlay.setAttribute('aria-hidden', 'false');
      try {
        var first = sidebar.querySelector('.nav-group-header, .nav-item, a, button');
        if (first && typeof first.focus === 'function') first.focus();
        localStorage.setItem(STORAGE_KEY_SIDEBAR_OPEN, '1');
      } catch (e) { /* ignore */ }
    }

    function cerrar() {
      opened = false;
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('aria-hidden', 'true');
      try {
        hamburger.focus();
        localStorage.removeItem(STORAGE_KEY_SIDEBAR_OPEN);
      } catch (e) { /* ignore */ }
    }

    hamburger.addEventListener('click', function () {
      if (opened) cerrar(); else abrir();
    });

    overlay.addEventListener('click', cerrar);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opened) {
        e.preventDefault();
        cerrar();
      }
    });

    /* Re-sincronizar cuando se agranda la pantalla (no deja sidebar abierta bloqueada) */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    }, { passive: true });

    return true;
  }

  /* ---------------------------------------------------------------
   *  TOAST GLOBAL (compartido)
   * --------------------------------------------------------------- */
  window.showToastGlobal = function (mensaje, variante, duracionMs) {
    try {
      var toast = safeGetElement('toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.cssText = [
          'position:fixed;bottom:24px;right:24px;z-index:99999;',
          'padding:12px 18px;border-radius:12px;font-family:inherit;font-weight:600;',
          'color:#fff;background:#16a34a;box-shadow:0 12px 28px -8px rgba(22,163,74,.6);',
          'min-width:200px;max-width:420px;transform:translateY(12px);opacity:0;',
          'transition:opacity 220ms ease,transform 220ms ease;'
        ].join('');
        document.body.appendChild(toast);
      }

      if (variante === 'error' || variante === 'danger') {
        toast.style.background = '#dc2626';
        toast.style.boxShadow = '0 12px 28px -8px rgba(220,38,38,.6)';
      } else if (variante === 'warning' || variante === 'warn') {
        toast.style.background = '#d97706';
        toast.style.boxShadow = '0 12px 28px -8px rgba(217,119,6,.6)';
      } else if (variante === 'info') {
        toast.style.background = '#2563eb';
        toast.style.boxShadow = '0 12px 28px -8px rgba(37,99,235,.6)';
      } else {
        toast.style.background = '#16a34a';
        toast.style.boxShadow = '0 12px 28px -8px rgba(22,163,74,.6)';
      }

      toast.textContent = mensaje || '';
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });
      window.clearTimeout(window.__st_toast_t);
      window.__st_toast_t = window.setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
      }, duracionMs || 3200);
    } catch (e) {
      console.error('[SmileTrack] showToastGlobal error', e);
    }
  };

  /* ---------------------------------------------------------------
   *  BANNER DE ERROR VISIBLE AL USUARIO
   * --------------------------------------------------------------- */
  window.mostrarErrorUsuario = function (mensaje) {
    try {
      var existente = document.getElementById('st-user-error');
      if (existente) existente.remove();
      var d = document.createElement('div');
      d.id = 'st-user-error';
      d.setAttribute('role', 'alert');
      var cerrar = document.createElement('button');
      cerrar.setAttribute('type', 'button');
      cerrar.setAttribute('aria-label', 'Cerrar mensaje');
      cerrar.textContent = '×';
      cerrar.style.cssText = 'float:right;margin:-2px 0 0 10px;color:#fff;font-size:22px;line-height:1;cursor:pointer;background:transparent;border:0;';
      cerrar.addEventListener('click', function () { d.remove(); });
      d.style.cssText = [
        'position:fixed;top:0;left:0;right:0;z-index:99999;',
        'background:#dc2626;color:#fff;padding:14px 22px 14px 22px;',
        'font-family:system-ui,"Segoe UI",sans-serif;font-weight:600;font-size:14px;',
        'box-shadow:0 10px 30px -10px rgba(220,38,38,.8);'
      ].join('');
      d.appendChild(cerrar);
      var t = document.createElement('span');
      t.textContent = mensaje || 'Error inesperado. Intente recargar la página.';
      d.appendChild(t);
      document.body.prepend(d);
    } catch (e) {
      console.error('[SmileTrack] mostrarErrorUsuario falló', e);
    }
  };

  /* ---------------------------------------------------------------
   *  INICIALIZACIÓN GLOBAL
   * --------------------------------------------------------------- */
  function initGlobal() {
    try {
      var numGroups = initSidebarGroups();
      initSidebarMobile();
      if (typeof console !== 'undefined' && console.info) {
        console.info('[SmileTrack] Sidebar inicializado — grupos colapsables:', numGroups);
      }
    } catch (e) {
      console.error('[SmileTrack] Error inicializando site.js global', e);
      try { window.mostrarErrorUsuario('Error cargando navegación: ' + (e && e.message ? e.message : 'Intente recargar.')); }
      catch (err) { /* ignore */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobal);
  } else {
    initGlobal();
  }
})();
