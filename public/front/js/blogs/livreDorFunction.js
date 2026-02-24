
// ========================================
// GESTION DU FORMULAIRE DE TÉMOIGNAGE
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const openFormBtn = document.getElementById('openFormBtn');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const testimonialFormSection = document.getElementById('testimonialFormSection');
    const testimonialForm = document.getElementById('testimonialForm');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photoPreview');
    const formMessage = document.getElementById('formMessage');

    if (openFormBtn) {
        openFormBtn.addEventListener('click', function() {
            testimonialFormSection.style.display = 'block';
            testimonialFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    function closeForm() {
        testimonialFormSection.style.display = 'none';
        testimonialForm.reset();
        photoPreview.style.display = 'none';
        photoPreview.innerHTML = '';
        formMessage.style.display = 'none';
    }

    if (closeFormBtn) {
        closeFormBtn.addEventListener('click', closeForm);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeForm);
    }

    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showMessage('La photo ne doit pas dépasser 5Mo', 'error');
                    photoInput.value = '';
                    return;
                }

                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    showMessage('Format de fichier non supporté. Utilisez JPG, PNG ou WEBP', 'error');
                    photoInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    photoPreview.innerHTML = `<img src="${e.target.result}" alt="Prévisualisation" style="max-width: 200px; max-height: 200px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`;
                    photoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const starInputs = document.querySelectorAll('.star-rating input[type="radio"]');
    starInputs.forEach(input => {
        input.addEventListener('change', function() {
            const labels = document.querySelectorAll('.star-rating label');
            labels.forEach(label => {
                label.style.transform = 'scale(1)';
            });
            
            const selectedLabel = document.querySelector(`label[for="${this.id}"]`);
            if (selectedLabel) {
                selectedLabel.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    selectedLabel.style.transform = 'scale(1)';
                }, 300);
            }
        });
    });

    if (testimonialForm) {
        testimonialForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const userName = document.getElementById('user_name').value.trim();
            const userEmail = document.getElementById('user_email').value.trim();
            const dogName = document.getElementById('name_of_dog').value.trim();
            const rating = document.querySelector('input[name="reviews_star"]:checked');
            const comment = document.getElementById('comment_text').value.trim();

            if (!userName || !userEmail || !dogName || !rating || !comment) {
                showMessage('Veuillez remplir tous les champs obligatoires', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userEmail)) {
                showMessage('Veuillez entrer une adresse email valide', 'error');
                return;
            }

            const formData = new FormData(testimonialForm);

            const submitBtn = testimonialForm.querySelector('.btn-submit');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

            try {
                const response = await fetch('/livre-d-or/add-comment', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    showMessage(result.message, 'success');
                    testimonialForm.reset();
                    photoPreview.style.display = 'none';
                    photoPreview.innerHTML = '';

                    setTimeout(() => {
                        closeForm();
                    }, 3000);
                } else {
                    showMessage(result.message || 'Une erreur est survenue', 'error');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showMessage('Une erreur est survenue lors de l\'envoi', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
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
});