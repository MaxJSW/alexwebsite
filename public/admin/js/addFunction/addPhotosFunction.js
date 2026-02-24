// Gestion des photos - Recadrage AVANT upload
document.addEventListener("DOMContentLoaded", function() {
    const uploadZone = document.getElementById('uploadZone');
    const photoInput = document.getElementById('photoInput');
    const photoContainer = document.getElementById('photoContainer');
    const uploadForm = document.getElementById('uploadForm');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const saveCropBtn = document.getElementById('saveCropBtn');
    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');

    let currentCropper = null;
    let selectedFiles = [];
    let currentFileIndex = 0;
    let croppedBlobs = [];

    // ========================================
    // 1. GESTION DU CLIC SUR LA ZONE DE TÉLÉCHARGEMENT
    // ========================================
    uploadZone.addEventListener('click', () => {
        photoInput.click();
    });

    // ========================================
    // 2. GESTION DU DRAG & DROP
    // ========================================
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#8b5cf6';
        uploadZone.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = '#6366f1';
        uploadZone.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#6366f1';
        uploadZone.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files);
        }
    });

    // ========================================
    // 3. GESTION DU CHANGEMENT DE FICHIER
    // ========================================
    photoInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFileSelection(this.files);
        }
    });

    // ========================================
    // 4. GESTION DE LA SÉLECTION DES FICHIERS
    // ========================================
    function handleFileSelection(files) {
        selectedFiles = Array.from(files);
        
        const currentPhotosCount = photoContainer.children.length;
        const totalPhotos = currentPhotosCount + selectedFiles.length;
        
        if (totalPhotos > 4) {
            alert(`Vous ne pouvez avoir que 4 photos maximum. Vous avez déjà ${currentPhotosCount} photo(s).`);
            photoInput.value = '';
            return;
        }

        if (selectedFiles.length === 0) {
            return;
        }

        currentFileIndex = 0;
        croppedBlobs = [];

        showCropModal();
    }

    // ========================================
    // 5. AFFICHER LE MODAL DE RECADRAGE
    // ========================================
    function showCropModal() {
        if (currentFileIndex >= selectedFiles.length) {
            uploadCroppedPhotos();
            return;
        }

        const file = selectedFiles[currentFileIndex];
        const reader = new FileReader();

        reader.onload = function(e) {
            cropImage.src = e.target.result;
            
            const modal = new bootstrap.Modal(cropModal);
            modal.show();

            const modalTitle = cropModal.querySelector('.modal-title');
            modalTitle.textContent = `✂️ Recadrer la photo ${currentFileIndex + 1}/${selectedFiles.length}`;

            cropModal.addEventListener('shown.bs.modal', function initCropper() {
                if (currentCropper) {
                    currentCropper.destroy();
                }

                currentCropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 2,
                    dragMode: 'move',
                    autoCropArea: 1,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                });

                cropModal.removeEventListener('shown.bs.modal', initCropper);
            }, { once: true });
        };

        reader.readAsDataURL(file);
    }

    // ========================================
    // 6. SAUVEGARDER LE RECADRAGE ET PASSER AU SUIVANT
    // ========================================
    saveCropBtn.addEventListener('click', function() {
        if (!currentCropper) {
            alert('Erreur lors du recadrage');
            return;
        }

        const originalText = saveCropBtn.innerHTML;
        saveCropBtn.disabled = true;
        saveCropBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Traitement...';

        const canvas = currentCropper.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingQuality: 'high'
        });

        canvas.toBlob(function(blob) {
            croppedBlobs.push(blob);

            currentCropper.destroy();
            currentCropper = null;

            const modal = bootstrap.Modal.getInstance(cropModal);
            modal.hide();

            saveCropBtn.disabled = false;
            saveCropBtn.innerHTML = originalText;

            currentFileIndex++;
            
            setTimeout(() => {
                showCropModal();
            }, 300);

        }, 'image/jpeg', 0.95);
    });

    // ========================================
    // 7. UPLOADER LES PHOTOS RECADRÉES
    // ========================================
    async function uploadCroppedPhotos() {
        if (croppedBlobs.length === 0) {
            photoInput.value = '';
            return;
        }

        uploadZone.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <p class="mt-2">Téléchargement de ${croppedBlobs.length} photo(s)...</p>
        `;

        try {
            const formData = new FormData();
            const animalId = document.querySelector('input[name="animal_id"]').value;
            
            croppedBlobs.forEach((blob, index) => {
                formData.append('photos', blob, `photo_${Date.now()}_${index}.jpg`);
            });
            formData.append('animal_id', animalId);

            const response = await fetch('/admin/addPhotos/uploadPhotos', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                
                uploadZone.innerHTML = `
                    <i class="bi bi-cloud-upload"></i>
                    <h4>Cliquez pour ajouter des photos</h4>
                    <p class="text-muted mb-0">ou glissez-déposez vos fichiers ici</p>
                `;

                displayPhotosGradually(data.photos);
                
                photoInput.value = '';
                selectedFiles = [];
                croppedBlobs = [];
                currentFileIndex = 0;

                showSuccessMessage('Photos ajoutées avec succès !');
            } else {
                const errorText = await response.text();
                console.error('Erreur:', errorText);
                alert('Erreur lors du téléchargement des photos.');
                
                uploadZone.innerHTML = `
                    <i class="bi bi-cloud-upload"></i>
                    <h4>Cliquez pour ajouter des photos</h4>
                    <p class="text-muted mb-0">ou glissez-déposez vos fichiers ici</p>
                `;
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du téléchargement.');
            
            uploadZone.innerHTML = `
                <i class="bi bi-cloud-upload"></i>
                <h4>Cliquez pour ajouter des photos</h4>
                <p class="text-muted mb-0">ou glissez-déposez vos fichiers ici</p>
            `;
        }
    }

    // ========================================
    // 8. AFFICHAGE PROGRESSIF DES PHOTOS
    // ========================================
    function displayPhotosGradually(photos) {
        let index = 0;

        function showNextPhoto() {
            if (index < photos.length) {
                const photo = photos[index];
                const col = document.createElement('div');
                col.className = 'col';
                col.id = `photo-${photo.id}`;
                col.innerHTML = `
                    <div class="card shadow-sm h-100">
                        <img src="/uploads/${photo.image_path}?t=${Date.now()}" class="card-img-top" style="height: 250px; object-fit: cover;" alt="Photo">
                        <div class="card-body p-2 d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-fill edit-photo-btn" 
                                    data-photo-id="${photo.id}" 
                                    data-photo-path="${photo.image_path}">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-photo-btn" 
                                    data-photo-id="${photo.id}" 
                                    data-photo-path="${photo.image_path}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                photoContainer.appendChild(col);
                
                const editBtn = col.querySelector('.edit-photo-btn');
                const deleteBtn = col.querySelector('.delete-photo-btn');
                
                editBtn.addEventListener('click', () => editExistingPhoto(photo.id, photo.image_path));
                deleteBtn.addEventListener('click', (e) => confirmDelete(e.target.closest('button')));
                
                index++;
                setTimeout(showNextPhoto, 300);
            }
        }

        showNextPhoto();
    }

    // ========================================
    // 9. MODIFIER UNE PHOTO EXISTANTE
    // ========================================
    function editExistingPhoto(photoId, photoPath) {
        alert('Fonction de modification de photo existante - à implémenter si besoin');
    }

    document.querySelectorAll('.edit-photo-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const photoId = this.getAttribute('data-photo-id');
            const photoPath = this.getAttribute('data-photo-path');
            editExistingPhoto(photoId, photoPath);
        });
    });

    // ========================================
    // 10. GESTION DE LA SUPPRESSION
    // ========================================
    function confirmDelete(button) {
        const photoId = button.getAttribute('data-photo-id');
        const photoPath = button.getAttribute('data-photo-path');
        confirmDeleteBtn.setAttribute('data-photo-id', photoId);
        confirmDeleteBtn.setAttribute('data-photo-path', photoPath);
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        deleteModal.show();
    }

    document.querySelectorAll('.delete-photo-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            confirmDelete(this);
        });
    });

    confirmDeleteBtn.addEventListener('click', async function() {
        const photoId = this.getAttribute('data-photo-id');
        const photoPath = this.getAttribute('data-photo-path');
        
        try {
            const response = await fetch('/admin/addPhotos/deletePhoto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ photoId, imagePath: photoPath })
            });
            
            if (response.ok) {
                const photoElement = document.getElementById(`photo-${photoId}`);
                photoElement.style.transition = 'opacity 0.3s ease';
                photoElement.style.opacity = '0';
                
                setTimeout(() => {
                    photoElement.remove();
                }, 300);
                
                const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                deleteModal.hide();
            } else {
                console.error(await response.text());
                alert('Erreur lors de la suppression de la photo.');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression de la photo.');
        }

    // ========================================
    // 11. FONCTION HELPER
    // ========================================
    function showSuccessMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    // ========================================
    // 12. GESTION DU BOUTON "TERMINER"
    // ========================================
    function toggleFinishButton() {
        const finishBtn = document.getElementById('finishButtonContainer');
        const photoCount = photoContainer.children.length;
        
        if (photoCount > 0) {
            finishBtn.style.display = 'flex';
        } else {
            finishBtn.style.display = 'none';
        }
    }

    toggleFinishButton();

    const observer = new MutationObserver(toggleFinishButton);
    observer.observe(photoContainer, { childList: true });

});

    // ========================================
    // 11. FONCTION HELPER
    // ========================================
    function showSuccessMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    
});