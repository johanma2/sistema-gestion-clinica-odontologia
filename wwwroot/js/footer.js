// Inyecta el footer dinámicamente solo si no fue incluido en el HTML del layout
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dynamic-footer')) return;

    const footerHTML = `
    <footer id="dynamic-footer" class="site-footer" role="contentinfo">
      <p>© 2025 Smile Track. Todos los derechos reservados.</p>
      <p class="footer-sub">Proyecto Formativo ADSO – SENA</p>
    </footer>
  `;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
});