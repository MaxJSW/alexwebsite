/**
 * Système de notifications Toast moderne
 * Types disponibles : success, error, warning, info
 */
class NotificationToast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
            this.container = container;
        } else {
            this.container = document.getElementById('toastContainer');
        }
    }

    /**
     * Afficher une notification
     @param {string} message 
     * @param {string} type 
     * @param {number} duration
     */
    show(message, type = 'info', duration = 3000) {
        const toastId = 'toast-' + Date.now();
        
        const config = {
            success: {
                icon: '<i class="fas fa-check-circle"></i>',
                bgClass: 'bg-success',
                title: 'Succès'
            },
            error: {
                icon: '<i class="fas fa-exclamation-circle"></i>',
                bgClass: 'bg-danger',
                title: 'Erreur'
            },
            warning: {
                icon: '<i class="fas fa-exclamation-triangle"></i>',
                bgClass: 'bg-warning',
                title: 'Attention'
            },
            info: {
                icon: '<i class="fas fa-info-circle"></i>',
                bgClass: 'bg-info',
                title: 'Information'
            }
        };

        const currentConfig = config[type] || config.info;

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white border-0 ${currentConfig.bgClass}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center">
                        <span class="me-2 fs-5">${currentConfig.icon}</span>
                        <span>${message}</span>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        this.container.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: duration
        });

        bsToast.show();

        toastElement.addEventListener('hidden.bs.toast', function() {
            toastElement.remove();
        });
    }

    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }

    warning(message, duration = 3500) {
        this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

window.toast = new NotificationToast();