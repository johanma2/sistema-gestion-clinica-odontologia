// ===== CHROME COMPARTIDO (sidebar / hamburger / toast) =====
const safeGetElement = (id) => document.getElementById(id);

const showToast = (message, type = 'success') => {
  const toast = safeGetElement('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast${type === 'error' ? ' error' : type === 'warning' ? ' warning' : ''} show`;
  if (toast._timeoutId) clearTimeout(toast._timeoutId);
  toast._timeoutId = setTimeout(() => toast.classList.remove('show'), 3000);
};

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

  hamburger.addEventListener('click', () => toggleMenu(!sidebar.classList.contains('open')));
  overlay.addEventListener('click', () => toggleMenu(false));
};

document.addEventListener('DOMContentLoaded', initSidebar);


// ===== LOGICA PROPIA DEL FORMULARIO PQR =====
// Select Request Type
function selectRequestType(element, type) {
    // Remove selected class from all cards
    document.querySelectorAll('.request-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selected class to clicked card
    element.classList.add('selected');

    // Store selected type
    console.log('Selected request type:', type);
}

// Form Submission
document.getElementById('pqrForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Show loading state
    const submitBtn = this.querySelector('.btn-submit');
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    submitBtn.disabled = true;

    // Simulate form submission
    setTimeout(() => {
        alert('¡Solicitud radicada exitosamente!\n\nNúmero de radicado: PQR-2024-' + Math.floor(Math.random() * 10000));
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
        this.reset();

        // Remove selected class from request cards
        document.querySelectorAll('.request-card').forEach(card => {
            card.classList.remove('selected');
        });
    }, 2000);
});

// File Upload Preview
document.getElementById('fileInput').addEventListener('change', function (e) {
    if (this.files && this.files[0]) {
        const fileName = this.files[0].name;
        const fileSize = (this.files[0].size / 1024 / 1024).toFixed(2);

        if (fileSize > 5) {
            alert('El archivo excede el tamaño máximo permitido (5 MB)');
            this.value = '';
            return;
        }

        const uploadDiv = this.parentElement;
        uploadDiv.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--success-green);"></i>
            <div><strong>${fileName}</strong></div>
            <div style="font-size: 12px; color: var(--text-light);">${fileSize} MB</div>
            <div style="margin-top: 10px; color: var(--primary-blue); cursor: pointer;" onclick="resetFileUpload()">
                <i class="fas fa-trash"></i> Eliminar archivo
            </div>
        `;
    }
});

function resetFileUpload() {
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    fileInput.parentElement.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <div>Haz clic para adjuntar un archivo (PDF, JPG, PNG — máx. 5 MB)</div>
    `;
}

// Character Counter for Textarea
const textarea = document.querySelector('textarea');
textarea.addEventListener('input', function () {
    const maxLength = 1000;
    const currentLength = this.value.length;
    const counter = this.parentElement.querySelector('div[style*="text-align: right"]');
    counter.textContent = `${currentLength} / ${maxLength}`;

    if (currentLength > maxLength) {
        counter.style.color = 'var(--danger-red)';
    } else {
        counter.style.color = 'var(--text-light)';
    }
});
