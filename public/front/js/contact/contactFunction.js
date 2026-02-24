
// ========================================
// GESTION DU FORMULAIRE DE CONTACT
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));

    // Validation du téléphone français
    function validatePhone(phone) {
        // Format accepté : 06 12 34 56 78 ou 0612345678 ou +33612345678
        const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    // Validation email
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Afficher un message d'erreur/succès
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';

        // Scroll vers le message
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Masquer le message d'erreur après 5 secondes
        if (type === 'error') {
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        }
    }

    // Soumission du formulaire
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Récupérer les valeurs
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const content = document.getElementById('content').value.trim();

            // Validation côté client
            if (!name || !email || !phone || !subject || !content) {
                showMessage('Veuillez remplir tous les champs obligatoires', 'error');
                return;
            }

            // Validation email
            if (!validateEmail(email)) {
                showMessage('Veuillez entrer une adresse email valide', 'error');
                document.getElementById('email').focus();
                return;
            }

            // Validation téléphone
            if (!validatePhone(phone)) {
                showMessage('Veuillez entrer un numéro de téléphone valide (ex: 06 12 34 56 78)', 'error');
                document.getElementById('phone').focus();
                return;
            }

            // Validation longueur du message
            if (content.length < 10) {
                showMessage('Votre message doit contenir au moins 10 caractères', 'error');
                document.getElementById('content').focus();
                return;
            }

            // Préparer les données
            const formData = {
                name: name,
                email: email,
                phone: phone,
                subject: subject,
                content: content
            };

            // Désactiver le bouton pendant l'envoi
            const submitBtn = contactForm.querySelector('.btn-submit-contact');
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
                    // Masquer le message d'erreur potentiel
                    formMessage.style.display = 'none';
                    
                    // Réinitialiser le formulaire
                    contactForm.reset();
                    
                    // Afficher la modale de succès
                    successModal.show();

                    // Optionnel : Scroll vers le haut après fermeture de la modale
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
                // Réactiver le bouton
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Validation en temps réel du téléphone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d+\s]/g, '');
            
            // Auto-formatage du numéro français
            if (value.startsWith('0') && value.length > 1) {
                value = value.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
            }
            
            e.target.value = value;
        });

        phoneInput.addEventListener('blur', function(e) {
            const phone = e.target.value.trim();
            if (phone && !validatePhone(phone)) {
                e.target.style.borderColor = '#ff4444';
            } else {
                e.target.style.borderColor = '';
            }
        });
    }

    // Validation en temps réel de l'email
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function(e) {
            const email = e.target.value.trim();
            if (email && !validateEmail(email)) {
                e.target.style.borderColor = '#ff4444';
            } else {
                e.target.style.borderColor = '';
            }
        });
    }

    // Compteur de caractères pour le message (optionnel)
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