// animation pour le points d'interrogation
document.addEventListener("DOMContentLoaded", function() {
  const icon = document.querySelector('.bi-question-circle');
  icon.classList.add('move-up-down');

  setTimeout(() => {
    icon.classList.remove('move-up-down');
    icon.classList.add('stop-move-up-down');
  }, 10000);
});

// Fonction pour afficher un message de succès flottant
function showFloatingSuccessMessage(message) {
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

//fonction pour mettre à jour le statut du chiot en fonction de son âge
function updatePuppySaleStatus() {
    const query = `
        UPDATE puppies 
        SET sale_status = CASE 
            WHEN DATEDIFF(CURRENT_DATE, puppy_birth_date) < 60 AND sale_status != 'reserved' THEN 'available_for_reservation'
            WHEN DATEDIFF(CURRENT_DATE, puppy_birth_date) >= 60 AND sale_status != 'reserved' THEN 'for_sale'
            ELSE sale_status
        END
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour des statuts des chiots:', err);
        } else {
            console.log('Statuts des chiots mis à jour:', result.affectedRows);
        }
    });
}


document.addEventListener("DOMContentLoaded", function() {
    
    (function() {
        let currentCropperProfile = null;
        let currentProfilePuppyId = null;
        let currentProfileMarriageId = null;
        
        document.querySelectorAll('.uploadProfileForm').forEach(function(form) {
            const puppyId = form.getAttribute('data-puppy-id');
            const marriageId = form.getAttribute('data-marriage-id');
            const fileInput = form.querySelector(`#profileImageInput-${puppyId}`);

            form.addEventListener('submit', function(event) {
                event.preventDefault();
            });
            
            fileInput.addEventListener('change', function(event) {
                const file = event.target.files[0];
                
                if (!file) {
                    return;
                }
                
                if (!file.type.startsWith('image/')) {
                    alert('Veuillez sélectionner une image valide');
                    return;
                }
                
                currentProfilePuppyId = puppyId;
                currentProfileMarriageId = marriageId;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const cropImage = document.getElementById('cropProfileImage');
                    cropImage.src = e.target.result;
                    
                    const cropModal = new bootstrap.Modal(document.getElementById('cropProfileModal'));
                    cropModal.show();
                    
                    const modalElement = document.getElementById('cropProfileModal');
                    modalElement.addEventListener('shown.bs.modal', function initCropper() {
                        if (currentCropperProfile) {
                            currentCropperProfile.destroy();
                            currentCropperProfile = null;
                        }
                        
                        setTimeout(() => {
                            currentCropperProfile = new Cropper(cropImage, {
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
                            });
                        }, 100);
                        
                        modalElement.removeEventListener('shown.bs.modal', initCropper);
                    }, { once: true });
                };
                
                reader.readAsDataURL(file);
            });
        });
        
        const saveCropProfileBtn = document.getElementById('saveCropProfileBtn');
        if (saveCropProfileBtn) {
            saveCropProfileBtn.addEventListener('click', async function() {
                if (!currentCropperProfile || !currentProfilePuppyId || !currentProfileMarriageId) {
                    return;
                }
                
                const saveCropBtn = this;
                const originalText = saveCropBtn.innerHTML;
                saveCropBtn.disabled = true;
                saveCropBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enregistrement...';
                
                try {
                    const canvas = currentCropperProfile.getCroppedCanvas({
                        width: 400,
                        height: 400,
                        imageSmoothingQuality: 'high'
                    });
                    
                    canvas.toBlob(async function(blob) {
                        const formData = new FormData();
                        formData.append('profileImage', blob, `profile_${currentProfilePuppyId}.jpg`);
                        
                        try {
                            const response = await fetch(`/admin/puppies/${currentProfileMarriageId}/upload-profile-image/${currentProfilePuppyId}`, {
                                method: 'POST',
                                body: formData
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                
                                const imageProfile = document.querySelector(`#image-puppy-profile-${currentProfilePuppyId} img`);
                                if (imageProfile) {
                                    const imagePath = data.imagePath.startsWith('/uploads/') ? data.imagePath : '/uploads/' + data.imagePath;
                                    imageProfile.src = `${imagePath}?t=${Date.now()}`;
                                }
                                const cropModal = bootstrap.Modal.getInstance(document.getElementById('cropProfileModal'));
                                cropModal.hide();
                                
                                if (currentCropperProfile) {
                                    currentCropperProfile.destroy();
                                    currentCropperProfile = null;
                                }
                                
                                const uploadModal = bootstrap.Modal.getInstance(document.getElementById(`uploadPuppiesProfileModal-${currentProfilePuppyId}`));
                                if (uploadModal) {
                                    uploadModal.hide();
                                }
                                
                                const fileInput = document.getElementById(`profileImageInput-${currentProfilePuppyId}`);
                                if (fileInput) {
                                    fileInput.value = '';
                                }
                                
                                showFloatingSuccessMessage('✅ Photo de profil mise à jour avec succès !');
                                
                            } else {
                                const errorText = await response.text();
                                console.error('Erreur:', errorText);
                                alert('Erreur lors du téléchargement de la photo de profil.');
                            }
                        } catch (error) {
                            console.error('Erreur:', error);
                            alert('Erreur lors du téléchargement.');
                        } finally {
                            saveCropBtn.disabled = false;
                            saveCropBtn.innerHTML = originalText;
                        }
                    }, 'image/jpeg', 0.95);
                    
                } catch (error) {
                    console.error('Erreur:', error);
                    // alert('Erreur lors du recadrage.');
                    saveCropBtn.disabled = false;
                    saveCropBtn.innerHTML = originalText;
                }
            });
        }
        
        // Nettoyer le cropper
        const cropProfileModal = document.getElementById('cropProfileModal');
        if (cropProfileModal) {
            cropProfileModal.addEventListener('hidden.bs.modal', function() {
                if (currentCropperProfile) {
                    currentCropperProfile.destroy();
                    currentCropperProfile = null;
                }
            });
        }
    })();
    
});

// fonction pour supprimer la photo de profil
function deleteProfileImage(puppyId) {
    const deleteConfirmationModal = new bootstrap.Modal(document.getElementById(`deletePuppiesProfileImageModal-${puppyId}`));
    deleteConfirmationModal.show();

    const confirmDeleteButton = document.getElementById(`confirmDeleteButton-${puppyId}`);
    confirmDeleteButton.addEventListener('click', function() {
        fetch(`/admin/puppies/${puppyId}/delete-profile-image`, {
            method: 'POST'
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Erreur lors de la suppression de la photo de profil.');
            }
        })
        .then(data => {
            const imageProfile = document.querySelector(`#image-puppy-profile-${puppyId} img`);
            imageProfile.src = 'https://img.freepik.com/vecteurs-premium/icone-compte-icone-utilisateur-graphiques-vectoriels_292645-552.jpg?w=740';
            deleteConfirmationModal.hide();
        })
        .catch(error => {
            console.error('Erreur:', error);
            deleteConfirmationModal.hide();
        });
    });
}

// Fonction pour récupérer l'état de désactivation du switch à partir de localStorage (ne fonctionne pas au rafraichissement de la page)
function getToggleStatusFromLocalStorage(puppyId) {
    const storedStatus = localStorage.getItem(`puppy_${puppyId}_online_status`);
    return storedStatus === 'disabled';
}

// Fonction pour définir l'état de désactivation du switch dans localStorage
function setToggleStatusInLocalStorage(puppyId) {
    localStorage.setItem(`puppy_${puppyId}_online_status`, 'disabled');
}

// Fonction pour envoyer la requête POST au serveur et gérer le switch en ligne
async function toggleOnlineStatus(puppyId) {
    const checkbox = document.getElementById('is_online');
    const label = document.getElementById('onlineStatusLabel');

    if (checkbox.checked) {
        try {
            const response = await fetch(`/admin/puppies/${puppyId}/toggleOnline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isOnline: true })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la modification du statut en ligne du chiot');
            }

            checkbox.disabled = true; 
            label.textContent = 'En ligne';
            label.classList.remove('offline');
            label.classList.add('online');

            setToggleStatusInLocalStorage(puppyId);
        } catch (error) {
            console.error('Erreur:', error.message);
        }
    } else {
        console.log('Switch désactivé');
    }
}

// fonction pour la mise à jour des infos du chiots et des cartes chiots + Fonction pour normaliser le slug
function normalizeSlug(value) {
    return value.toLowerCase()
        .normalize('NFD') 
        .replace(/[\u0300-\u036f]/g, '') 
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');
}

//  fonction test pour la suppression des photos en live 2
function deletePhoto(puppyId, photoId, photoPath) {

    const deleteConfirmationModal = new bootstrap.Modal(document.getElementById(`deletePhotoModal-${puppyId}-${photoId}`));
    deleteConfirmationModal.show();

    const confirmDeleteButton = document.getElementById(`confirmDeleteButton-${puppyId}-${photoId}`);
    confirmDeleteButton.setAttribute('data-photo-id', photoId);
    confirmDeleteButton.setAttribute('data-photo-path', photoPath);
    confirmDeleteButton.setAttribute('data-puppy-id', puppyId);
}

// fonction pour réinitialiser le bouton supprimer sur les photos
function initializeDeletePhotoModals(puppyId) {
    const deleteButtons = document.querySelectorAll(`#PuppyPhotoContainer-${puppyId} .btn-danger`);
    deleteButtons.forEach(button => {
        const photoId = button.getAttribute('data-photo-id');
        const photoPath = button.getAttribute('data-photo-path');
        button.removeEventListener('click', handleDeleteClick);
        button.addEventListener('click', function() {
            deletePhoto(puppyId, photoId, photoPath);
        });
    });
}

//  fonction pour faire un reset sur la page après la fermeture de la modale
function resetPageState() {
    document.body.classList.remove('modal-open');
    
    const modalsBackdrop = document.querySelectorAll('.modal-backdrop');
    modalsBackdrop.forEach(backdrop => backdrop.remove());

    document.body.style.overflow = '';
}

//  fonction DOM globale :
document.addEventListener('DOMContentLoaded', function() {

    // Fonction globale pour supprimer les photos
    window.deletePhoto = function(puppyId, photoId, photoPath) {

        const modalId = `deletePhotoModal-${puppyId}-${photoId}`;
        const modalElement = document.getElementById(modalId);

        if (!modalElement) {
            console.error(`Modale de suppression introuvable: ${modalId}`);
            return;
        }

        const deleteConfirmationModal = new bootstrap.Modal(modalElement);
        deleteConfirmationModal.show();

        const confirmDeleteButton = document.getElementById(`confirmDeleteButton-${puppyId}-${photoId}`);
        confirmDeleteButton.setAttribute('data-photo-id', photoId);
        confirmDeleteButton.setAttribute('data-photo-path', photoPath);
        confirmDeleteButton.setAttribute('data-puppy-id', puppyId);
        confirmDeleteButton.removeEventListener('click', handleDeleteClick); 
        confirmDeleteButton.addEventListener('click', handleDeleteClick);
    }
    // fonction pour la suppression des photos en live
    async function handleDeleteClick() {
        const photoId = this.getAttribute('data-photo-id');
        const photoPath = this.getAttribute('data-photo-path');
        const puppyId = this.getAttribute('data-puppy-id');

        try {
            const response = await fetch(`/admin/puppies/${puppyId}/delete-photo/${photoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ photoId, imagePath: photoPath })
            });

            if (response.ok) {
                const photoElementId = `photo-${puppyId}-${photoId}`;
                const photoElement = document.getElementById(photoElementId);
                if (photoElement) {
                    photoElement.remove();
                } else {
                    console.error('Élément photo non trouvé:', photoElementId);
                }

                const descriptionContainer = document.getElementById(`DescriptionPuppyPhotoContainer-${puppyId}`);
                if (descriptionContainer) {
                    const allCards = descriptionContainer.querySelectorAll('.card');
                    allCards.forEach(card => {
                        const imgSrc = card.querySelector('img')?.src;
                        const photoPath = imgSrc?.split('/uploads/')[1];
                        const hiddenInput = card.querySelector('input[name="imageId"]');
                        const cardPhotoId = hiddenInput?.value;
                        
                        if (cardPhotoId == photoId) {
                            card.closest('.col-xl-6').remove();
                            console.log('Photo supprimée de l\'onglet Description:', photoId);
                        }
                    });
                    
                    if (descriptionContainer.children.length === 0) {
                        descriptionContainer.innerHTML = `
                            <div class="col-12 justify-content-center align-items-center" style="height: 100vh;">
                                <div class="alert alert-primary text-center" role="alert">
                                    Aucune image trouvée
                                </div>
                            </div>
                        `;
                    }
                }

                const modalElement = document.getElementById(`deletePhotoModal-${puppyId}-${photoId}`);
                const deleteModal = bootstrap.Modal.getInstance(modalElement);
                deleteModal.hide();

                modalElement.addEventListener('hidden.bs.modal', function () {
                    resetPageState();
                });

            } else {
                console.error(await response.text());
                alert('Erreur lors de la suppression de la photo.');
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    }

    // Fonction de réinitialisation des boutons + la modale
    async function initializeUploadFeature(puppyId) {
        const button = document.getElementById(`uploadPhotosPuppiesBtn-${puppyId}`);
        const input = document.getElementById(`PuppyPhotoInput-${puppyId}`);
        const form = document.getElementById(`updatePuppiesPhotosForm-${puppyId}`);
        const deleteButtons = document.querySelectorAll(`#PuppyPhotoContainer-${puppyId} .btn-danger`);

        deleteButtons.forEach(button => {
            const photoId = button.getAttribute('data-photo-id');
            const photoPath = button.getAttribute('data-photo-path');

            button.setAttribute('data-puppy-id', puppyId);
            button.setAttribute('data-photo-id', photoId);
            button.setAttribute('data-photo-path', photoPath);

            button.onclick = function() {
                deletePhoto(puppyId, photoId, photoPath);
            };
        });

        if (button && input && form) {
            if (!button.dataset.listenerAdded) {
                button.addEventListener('click', function() {
                    input.click();
                });
                button.dataset.listenerAdded = 'true';
            }



            // if (!input.dataset.listenerAdded) {
            //     input.addEventListener('change', async function() {
            //         const formData = new FormData(form);
            //         const marriageId = document.getElementById('marriage_id').value;

            //         if (!input.files || input.files.length === 0) {
            //             console.log('Aucun fichier sélectionné');
            //             return;
            //         }

            //         try {
            //             const response = await fetch(`/admin/puppies/${marriageId}/uploadPuppyPhotos/${puppyId}`, {
            //                 method: 'POST',
            //                 body: formData
            //             });

            //             if (!response.ok) {
            //                 throw new Error(`Erreur lors du téléchargement des photos (${response.status}): ${response.statusText}`);
            //             }

            //             const data = await response.json();

            //             if (Array.isArray(data.photos)) {
            //                 // addPhotos(data.photos, puppyId);
            //                 addPhotos(data.photos, puppyId, marriageId);
            //                 initializeDeletePhotoModals(puppyId);
            //             } else {
            //                 console.error('Les photos ne sont pas dans un format attendu:', data.photos);
            //             }
            //         } catch (error) {
            //             console.error('Erreur lors du téléchargement des photos:', error);
            //             alert('Erreur lors du téléchargement des photos.');
            //         }
            //     });
            //     input.dataset.listenerAdded = 'true';
            // }

            if (!input.dataset.listenerAdded) {
    let selectedFiles = [];
    let currentFileIndex = 0;
    let croppedBlobs = [];
    let currentCropperPuppy = null;

    input.addEventListener('change', function() {
        if (!input.files || input.files.length === 0) {
            console.log('Aucun fichier sélectionné');
            return;
        }

        selectedFiles = Array.from(input.files);
        currentFileIndex = 0;
        croppedBlobs = [];

        // Démarrer le processus de recadrage
        showCropModalForPuppy();
    });

    // Fonction pour afficher le modal de recadrage
    function showCropModalForPuppy() {
        if (currentFileIndex >= selectedFiles.length) {
            // Toutes les photos sont recadrées, uploader maintenant
            uploadCroppedPuppyPhotos();
            return;
        }

        const file = selectedFiles[currentFileIndex];
        const reader = new FileReader();

        reader.onload = function(e) {
            const cropImage = document.getElementById('cropPuppyPhotoImage');
            cropImage.src = e.target.result;

            const modal = new bootstrap.Modal(document.getElementById('cropPuppyPhotoModal'));
            modal.show();

            // Mettre à jour le titre
            const modalTitle = document.querySelector('#cropPuppyPhotoModal .modal-title');
            modalTitle.textContent = `✂️ Recadrer la photo ${currentFileIndex + 1}/${selectedFiles.length}`;

            // Initialiser Cropper
            document.getElementById('cropPuppyPhotoModal').addEventListener('shown.bs.modal', function initCropper() {
                if (currentCropperPuppy) {
                    currentCropperPuppy.destroy();
                }

                currentCropperPuppy = new Cropper(cropImage, {
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
                });

                document.getElementById('cropPuppyPhotoModal').removeEventListener('shown.bs.modal', initCropper);
            }, { once: true });
        };

        reader.readAsDataURL(file);
    }

    // Sauvegarder le recadrage
    document.getElementById('saveCropPuppyPhotoBtn').addEventListener('click', function() {
        if (!currentCropperPuppy) {
            // alert('Erreur lors du recadrage');
            return;
        }

        const saveCropBtn = this;
        const originalText = saveCropBtn.innerHTML;
        saveCropBtn.disabled = true;
        saveCropBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Traitement...';

        const canvas = currentCropperPuppy.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingQuality: 'high'
        });

        canvas.toBlob(function(blob) {
            croppedBlobs.push(blob);

            currentCropperPuppy.destroy();
            currentCropperPuppy = null;

            const modal = bootstrap.Modal.getInstance(document.getElementById('cropPuppyPhotoModal'));
            modal.hide();

            saveCropBtn.disabled = false;
            saveCropBtn.innerHTML = originalText;

            currentFileIndex++;

            setTimeout(() => {
                showCropModalForPuppy();
            }, 300);
        }, 'image/jpeg', 0.95);
    });

    // Uploader les photos recadrées
    async function uploadCroppedPuppyPhotos() {
        if (croppedBlobs.length === 0) {
            input.value = '';
            return;
        }

        try {
            const marriageId = document.getElementById('marriage_id').value;
            const formData = new FormData();

            croppedBlobs.forEach((blob, index) => {
                formData.append('photos', blob, `puppy_${puppyId}_${Date.now()}_${index}.jpg`);
            });
            formData.append('puppies_id', puppyId);
            formData.append('marriage_id', marriageId);

            const response = await fetch(`/admin/puppies/${marriageId}/uploadPuppyPhotos/${puppyId}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erreur lors du téléchargement (${response.status})`);
            }

            const data = await response.json();

            if (Array.isArray(data.photos)) {
                addPhotos(data.photos, puppyId, marriageId);
                initializeDeletePhotoModals(puppyId);
                showFloatingSuccessMessage('✅ Photos ajoutées avec succès !');
            }

            input.value = '';
            selectedFiles = [];
            croppedBlobs = [];
            currentFileIndex = 0;

        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du téléchargement des photos.');
        }
    }

    input.dataset.listenerAdded = 'true';
}



        } else {
            console.error('Les éléments de téléchargement des photos ne sont pas trouvés:', {
                button,
                input,
                form
            });
        }

        // Initialiser les modales de suppression après le téléchargement des photos
        initializeDeletePhotoModals(puppyId);
    }

   // fonction pour réinitialiser le bouton supprimer sur les photos   
    function initializeDeletePhotoModals(puppyId) {
        const deleteButtons = document.querySelectorAll(`#PuppyPhotoContainer-${puppyId} .btn-danger`);
        deleteButtons.forEach(button => {
            const photoId = button.getAttribute('data-photo-id');
            const photoPath = button.getAttribute('data-photo-path');
            button.removeEventListener('click', handleDeleteClick);
            button.addEventListener('click', function() {
                deletePhoto(puppyId, photoId, photoPath);
            });
        });
    }

    // fonction pour ajouter les photos
   function addPhotos(photos, puppyId, marriageId) {
        const photoContainer = document.getElementById(`PuppyPhotoContainer-${puppyId}`);
        const existingPhotoIds = new Set([...photoContainer.children].map(child => child.id));

        photos.forEach((photo, index) => {
            const photoId = `photo-${photo.id}`;

            if (!existingPhotoIds.has(photoId)) {
                setTimeout(() => {
                    const col = document.createElement('div');
                    col.className = 'col-12';
                    col.id = `photo-${puppyId}-${photo.id}`;
                    col.innerHTML = `
                        <div class="card shadow-sm position-relative">
                            <img src="/uploads/${photo.image_path}" class="bd-placeholder-img card-img-top" width="200" height="350" alt="Photo">
                            <button class="btn btn-danger position-absolute top-0 end-0 m-2" data-photo-id="${photo.id}" data-photo-path="${photo.image_path}" onclick="deletePhoto(${puppyId}, ${photo.id}, '${photo.image_path}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `;
                    photoContainer.appendChild(col);
                    existingPhotoIds.add(photoId);

                    const modalContainer = document.createElement('div');
                    modalContainer.innerHTML = `
                        <div class="modal fade" id="deletePhotoModal-${puppyId}-${photo.id}" tabindex="-1" aria-labelledby="deletePhotoModalLabel-${photo.id}" aria-hidden="true">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title" id="deletePhotoModalLabel-${photo.id}">Confirmation de suppression</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body">
                                        Êtes-vous sûr de vouloir supprimer cette photo ?
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                                        <button type="button" class="btn btn-danger" id="confirmDeleteButton-${puppyId}-${photo.id}" data-photo-id="${photo.id}" data-photo-path="${photo.image_path}" data-puppy-id="${puppyId}">Supprimer</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modalContainer);

                    initializeDeletePhotoModals(puppyId);
                }, index * 1000);
            } else {
                console.log('La photo existe déjà ID:', photo.id);
            }
            addPhotoToDescriptionTab(photo, puppyId, marriageId);
        });

        initializeUploadFeature(puppyId);
    }

    // Fonction pour ajouter une photo dans l'onglet Description
    function addPhotoToDescriptionTab(photo, puppyId, marriageId) {
        const descriptionContainer = document.getElementById(`DescriptionPuppyPhotoContainer-${puppyId}`);
        
        if (!descriptionContainer) {
            console.log('Container Description non trouvé pour puppyId:', puppyId);
            return;
        }
        
        const noImageAlert = descriptionContainer.querySelector('.alert-primary');
        if (noImageAlert) {
            noImageAlert.remove();
        }
        
        const col = document.createElement('div');
        col.className = 'col-xl-6 col-lg-6 col-md-12 col-sm-12 col-xs-12';
        col.innerHTML = `
            <div class="card mb-4 shadow-sm">
                <img src="/uploads/${photo.image_path}" class="card-img-top object-fit-cover" alt="${photo.balise_alt || ''}" width="200" height="350">
                <div class="card-body">
                    <form id="baliseForm" data-id="${photo.id}" class="update-alt-form" method="POST" action="/puppies/${marriageId}/imagesDescription/${puppyId}" data-marriage-id="${marriageId}" data-puppy-id="${puppyId}">
                        <div class="form-group">
                            <label for="balise_alt_${photo.id}" class="d-flex align-items-center mb-2">
                                <span>Balise alt</span>
                                <span id="badge-${photo.id}" class="badge text-bg-success mb-0 ms-2 d-none" style="margin-bottom: 10px;">Modifié</span>
                            </label>
                            <input type="text" class="form-control border-danger" id="balise_alt_${photo.id}" name="balise_alt" value="${photo.balise_alt || ''}" placeholder="Décrire l'action ou l'animal">
                            <input type="hidden" name="imageId" value="${photo.id}">
                            <input type="hidden" name="balise_title" value="Photos de ${photo.puppy_name || ''}">
                            <input type="hidden" name="puppiesId" value="${puppyId}">
                            <input type="hidden" name="marriagesId" value="${marriageId}">
                        </div>
                        <button type="submit" class="btn btn-primary mt-2">Mettre à jour</button>
                    </form>
                </div>
            </div>
        `;
        
        descriptionContainer.appendChild(col);
    }

    // fonction pour réinitialiser la page
    async function updateProfile(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const formObject = {};

        formData.forEach((value, key) => {
            formObject[key] = value;
        });

        if (formObject.puppy_name) {
            formObject.puppy_slug = normalizeSlug(formObject.puppy_name);
        }

        const action = form.getAttribute('action');
        const match = action.match(/\/puppies\/(\d+)\/puppyProfile\/(\d+)/);
        if (!match) {
            console.error('Impossible de récupérer les IDs de mariage et de chiot depuis l\'action du formulaire');
            return;
        }
        const marriageId = match[1];
        const puppyId = match[2];

        try {
            const response = await fetch(action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formObject)
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour du chiot');
            }

            const result = await response.text();
            updatePuppyCard(puppyId, formObject.puppy_name, formObject.puppy_color);
            
            document.getElementById('puppyProfileContainer').innerHTML = result;
            
            reinitializeFeatures(puppyId);

            showFloatingSuccessMessage('✅ Profil mis à jour avec succès !');

            reinitializeFeatures(puppyId);

            showFloatingSuccessMessage('✅ Profil mis à jour avec succès !');

            setTimeout(() => {
                const puppyCard = document.querySelector(`.puppy-card[data-puppy-id="${puppyId}"]`);
                if (puppyCard) {
                    puppyCard.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    
                    puppyCard.style.transition = 'transform 0.3s ease';
                    puppyCard.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        puppyCard.style.transform = 'scale(1)';
                    }, 300);
                }
            }, 500);

        } catch (error) {
            console.error('Erreur lors de la mise à jour du chiot:', error);
            showFloatingSuccessMessage('❌ Erreur : ' + error.message);
        }
    }

    // Fonction pour mettre à jour la carte du chiot
    function updatePuppyCard(puppyId, puppyName, puppyColor) {
        const puppyCard = document.querySelector(`.puppy-card[data-puppy-id="${puppyId}"]`);
        
        if (puppyCard) {
            const nameElement = puppyCard.querySelector('.puppy-name');
            if (nameElement) {
                nameElement.textContent = puppyName || 'En Attente';
            }
            const colorElement = puppyCard.querySelector('.puppy-color');
            if (colorElement) {
                colorElement.textContent = puppyColor || 'En Attente';
            }
            
            console.log('Carte du chiot mise à jour:', puppyId, puppyName, puppyColor);
        } else {
            console.error('Carte du chiot introuvable pour l\'ID:', puppyId);
        }
    }



    //  fonction pour afficher un message temporaire
    function showTemporaryMessage(elementId, message) {
        const messageElement = document.getElementById(elementId);
        if (message) {
            messageElement.innerText = message;
        }
        messageElement.style.display = 'block';
        setTimeout(function() {
            messageElement.style.display = 'none';
        }, 3000);
    }
    // fonction pour réinitialiser les fonctionnalités
    function reinitializeFeatures(puppyId) {
        initializeUploadFeature(puppyId);
        const triggerTabList = [].slice.call(document.querySelectorAll('#profileTab button'));
        triggerTabList.forEach(function(triggerEl) {
            const tabTrigger = new bootstrap.Tab(triggerEl);
            triggerEl.addEventListener('click', function(event) {
                event.preventDefault();
                tabTrigger.show();
            });
        });
        const overviewTabTrigger = new bootstrap.Tab(document.querySelector('#overview-tab'));
        overviewTabTrigger.show();
    }

    const puppyCards = document.querySelectorAll('.puppy-card');
    puppyCards.forEach(card => {
        card.addEventListener('click', function() {
            selectCard(this);
        });
    });

    if (puppyCards.length > 0) {
        selectCard(puppyCards[0]);
    }

    // fonction pour sélectionner une carte
    function selectCard(card) {
        puppyCards.forEach(card => {
            card.classList.remove('selected-male', 'selected-female');
        });

        const gender = card.getAttribute('data-puppy-gender');
        if (gender === 'male') {
            card.classList.add('selected-male');
        } else if (gender === 'female') {
            card.classList.add('selected-female');
        }

        const puppyId = card.getAttribute('data-puppy-id');
        const marriageId = card.getAttribute('data-marriage-id');

        fetch(`/admin/puppies/${marriageId}/puppyProfile/${puppyId}`)
            .then(response => response.text())
            .then(html => {
                document.getElementById('puppyProfileContainer').innerHTML = html;
                reinitializeFeatures(puppyId);
            })
            .catch(err => console.error('Erreur lors du chargement du profil du chiot:', err));
    }
    // Fonction de mise à jour des textes du chiot
    document.addEventListener('submit', async function(event) {
        if (event.target && event.target.id === 'updateProfileForm') {
            await updateProfile(event);
        }
    });

    // Fonction de mise à jour des textes du chiot
    document.addEventListener('submit', async function(event) {
        if (event.target && event.target.id === 'textForm') {
            event.preventDefault();

            const form = event.target;
            const formData = new FormData(form);
            const formObject = {};

            formData.forEach((value, key) => {
                formObject[key] = value;
            });

            const puppyId = form.querySelector('input[name="puppyId"]').value;
            const marriageId = form.querySelector('input[name="marriageId"]').value;
            const puppyName = form.querySelector('input[name="puppyName"]').value;

            const action = `/admin/puppies/${marriageId}/puppyDescription/${puppyId}`;

            try {
                const response = await fetch(action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formObject)
                });

                const result = await response.text();

                document.getElementById('puppyProfileContainer').innerHTML = result;

                const triggerTabList = [].slice.call(document.querySelectorAll('#profileTab button'))
                triggerTabList.forEach(function (triggerEl) {
                    const tabTrigger = new bootstrap.Tab(triggerEl)

                    triggerEl.addEventListener('click', function (event) {
                        event.preventDefault()
                        tabTrigger.show()
                    })
                })

                const textTabTrigger = new bootstrap.Tab(document.querySelector('#email-tab'))
                textTabTrigger.show()

                const successMessage = document.getElementById('successMessage');
                if (successMessage) {
                    successMessage.style.display = 'block';

                    setTimeout(function() {
                        successMessage.style.display = 'none';
                    }, 3000);
                }

            } catch (error) {
                console.error('Erreur lors de la mise à jour des textes du chiot:', error);
                const errorMessage = document.getElementById('errorMessage');
                if (errorMessage) {
                    errorMessage.innerText = error.message;
                    errorMessage.style.display = 'block';

                    setTimeout(function() {
                        errorMessage.style.display = 'none';
                    }, 3000);
                }
            }
            initializeUploadFeature(puppyId);
        }
    });

    // // Fonction de mise à jour des balises alt et title
    document.addEventListener('submit', async function(event) {
        if (event.target && event.target.id === 'baliseForm') {
            event.preventDefault();

            const form = event.target;
            const formData = new FormData(form);
            const formObject = {};

            formData.forEach((value, key) => {
                formObject[key] = value;
            });

            const puppyId = form.querySelector('input[name="puppiesId"]').value;
            const marriageId = form.querySelector('input[name="marriagesId"]').value;

            const action = `/admin/puppies/${marriageId}/imagesDescription/${puppyId}`;

            try {
                const response = await fetch(action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formObject)
                });

                const result = await response.text();

                const container = document.getElementById('puppyProfileContainer');
                container.classList.add('fade-exit');
                container.addEventListener('transitionend', () => {
                    container.innerHTML = result;
                    container.classList.remove('fade-exit');
                    container.classList.add('fade-enter');
                    container.addEventListener('transitionend', () => {
                        container.classList.remove('fade-enter');
                    }, { once: true });

                    const triggerTabList = [].slice.call(document.querySelectorAll('#profileTab button'));
                    triggerTabList.forEach(function (triggerEl) {
                        const tabTrigger = new bootstrap.Tab(triggerEl);
                        triggerEl.addEventListener('click', function (event) {
                            event.preventDefault();
                            tabTrigger.show();
                        });
                    });

                    const textTabTrigger = new bootstrap.Tab(document.querySelector('#description-tab'));
                    const descriptionTabPane = document.querySelector('#description-tab-pane');
                    descriptionTabPane.classList.add('fade-enter');
                    textTabTrigger.show();
                    descriptionTabPane.addEventListener('transitionend', () => {
                        descriptionTabPane.classList.remove('fade-enter');
                    }, { once: true });
                }, { once: true });
                initializeUploadFeature(puppyId);
            } catch (error) {
                console.error('Error:', error);
            }
        }
    });
});
