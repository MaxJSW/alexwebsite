
// ========================================
// GESTION DU FORMULAIRE DE CONTACT
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    function validatePhone(phone) {
        const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';

        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (type === 'error') {
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        }
    }
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const content = document.getElementById('content').value.trim();

            if (!name || !email || !phone || !subject || !content) {
                showMessage('Veuillez remplir tous les champs obligatoires', 'error');
                return;
            }
            if (!validateEmail(email)) {
                showMessage('Veuillez entrer une adresse email valide', 'error');
                document.getElementById('email').focus();
                return;
            }
            if (!validatePhone(phone)) {
                showMessage('Veuillez entrer un numéro de téléphone valide (ex: 06 12 34 56 78)', 'error');
                document.getElementById('phone').focus();
                return;
            }
            if (content.length < 10) {
                showMessage('Votre message doit contenir au moins 10 caractères', 'error');
                document.getElementById('content').focus();
                return;
            }
            const formData = {
                name: name,
                email: email,
                phone: phone,
                subject: subject,
                content: content
            };
            const submitBtn = contactForm.querySelector('.ct-submit-btn');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
            try {
                const response = await fetch('/contact/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.message) {
                    formMessage.style.display = 'none';
                    contactForm.reset();
                    successModal.show();
                    document.getElementById('successModal').addEventListener('hidden.bs.modal', function () {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                } else {
                    showMessage(result.error || 'Une erreur est survenue lors de l\'envoi', 'error');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showMessage('Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d+\s]/g, '');
            
            if (value.startsWith('0') && value.length > 1) {
                value = value.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
            }
            e.target.value = value;
        });
        phoneInput.addEventListener('blur', function(e) {
            const phone = e.target.value.trim();
            if (phone && !validatePhone(phone)) {
                e.target.style.borderColor = 'rgba(220,53,69,0.6)';
            } else {
                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
            }
        });
    }
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function(e) {
            const email = e.target.value.trim();
            if (email && !validateEmail(email)) {
                e.target.style.borderColor = 'rgba(220,53,69,0.6)';
            } else {
                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
            }
        });
    }
    const contentTextarea = document.getElementById('content');
    if (contentTextarea) {
        const charCounter = document.createElement('div');
        charCounter.style.cssText = 'text-align: right; font-size: 0.8rem; color: #888; margin-top: 0.25rem;';
        contentTextarea.parentNode.appendChild(charCounter);
        function updateCharCount() {
            const length = contentTextarea.value.length;
            charCounter.textContent = `${length} caractère${length > 1 ? 's' : ''}`;
            
            if (length < 10) {
                charCounter.style.color = '#ff4444';
            } else {
                charCounter.style.color = '#888';
            }
        }
        contentTextarea.addEventListener('input', updateCharCount);
        updateCharCount();
    }
});