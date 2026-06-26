/**
 * SMILETRACK — HOMEPAGE INTERACTIVITY
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── Header scroll effect ──
    const header = document.getElementById('site-header');
    const headerBg = document.getElementById('header-bg');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            header.classList.add('shadow-md');
            headerBg.style.opacity = '0.95';
        } else {
            header.classList.remove('shadow-md');
            headerBg.style.opacity = '0.8';
        }
    });

    // ── Form → WhatsApp ──
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const telefono = '573123627335';
            const mensaje = '¡Hola! Quiero agendar una cita dental en Smile Track.';
            window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
        });
    }

    // ── Smooth scroll para anclas internas ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ── Animación al hacer scroll (Intersection Observer) ──
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card, .trust-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
});