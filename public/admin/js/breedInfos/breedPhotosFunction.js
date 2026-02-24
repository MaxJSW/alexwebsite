// fonction pour la gestion des photos
$(document).ready(function() {
    let cropper = null;
    let currentBreedId = null;
    let selectedFile = null;
    let photoToDelete = { photoId: null, breedId: null };

    function showSuccessToast(message) {
        $('#successToastMessage').text(message);
        const toast = new bootstrap.Toast($('#successToast')[0], { delay: 3000 });
        toast.show();
    }

    function showErrorToast(message) {
        $('#errorToastMessage').text(message);
        const toast = new bootstrap.Toast($('#errorToast')[0], { delay: 3000 });
        toast.show();
    }

    function showWarningToast(message) {
        $('#warningToastMessage').text(message);
        const toast = new bootstrap.Toast($('#warningToast')[0], { delay: 3000 });
        toast.show();
    }

    function loadBreedPhotos(breedId) {
        $.ajax({
            url: `/admin/breedInfos/${breedId}/photos`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    displayPhotos(breedId, response.photos);
                }
            },
            error: function(error) {
                console.error('Erreur lors du chargement des photos:', error);
                showErrorToast('Erreur lors du chargement des photos');
            }
        });
    }

    // Fonction pour afficher les photos dans la modal
    function displayPhotos(breedId, photos) {
        const container = $(`#photoContainer-${breedId}`);
        container.empty();

        if (photos.length === 0) {
            container.html('<p class="text-muted text-center">Aucune photo ajoutée pour le moment</p>');
            return;
        }

        photos.forEach(photo => {
            const photoCard = `
                <div class="card mb-3 photo-item" data-photo-id="${photo.id}">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="/uploads/${photo.image_path}" class="img-fluid rounded-start" alt="${photo.balise_alt}" style="height: 250px; object-fit: cover; width: 100%;">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <p class="card-text mb-2"><strong>Alt:</strong> ${photo.balise_alt || 'Non définie'}</p>
                                <button class="btn btn-danger btn-sm delete-photo-btn" data-photo-id="${photo.id}" data-breed-id="${breedId}">
                                    <i class="bi bi-trash"></i> Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.append(photoCard);
        });
    }

    $(document).on('click', '.add-photo-button', function(e) {
        e.preventDefault();
        const breedId = $(this).data('id');
        currentBreedId = breedId;
        
        loadBreedPhotos(breedId);
        
        $(`#addBreedPhotoModal-${breedId}`).modal('show');
    });

    $(document).on('click', '.upload-photo-button', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const breedId = $(this).data('breed-id');
        currentBreedId = breedId;
        $(`.photo-input[data-breed-id="${breedId}"]`).click();
    });

    $(document).on('change', '.photo-input', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.match('image.*')) {
                showWarningToast('Veuillez sélectionner une image valide');
                return;
            }

            selectedFile = file;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageToCrop = document.getElementById('imageToCrop');
                imageToCrop.src = event.target.result;
                
                $('#cropperModal').modal('show');
                
                $('#cropperModal').on('shown.bs.modal', function() {
                    if (cropper) {
                        cropper.destroy();
                    }
                    cropper = new Cropper(imageToCrop, {
                        aspectRatio: 1,
                        viewMode: 2,
                        autoCropArea: 1,
                        responsive: true,
                        background: false,
                        guides: true,
                        center: true,
                        highlight: true,
                        cropBoxResizable: true,
                        cropBoxMovable: true,
                        dragMode: 'move'
                    });
                });
            };
            reader.readAsDataURL(file);
        }
        
        $(this).val('');
    });

    // Valider et uploader l'image recadrée
    $(document).on('click', '#cropAndUploadBtn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const altText = $('#photoAltText').val().trim();
        
        if (!altText) {
            showWarningToast('Veuillez saisir une description pour l\'image (balise alt)');
            return;
        }

        if (!cropper) {
            showErrorToast('Erreur: aucune image à recadrer');
            return;
        }

        cropper.getCroppedCanvas({
            width: 800,
            height: 800,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        }).toBlob(function(blob) {
            const formData = new FormData();
            formData.append('photos', blob, selectedFile.name);
            formData.append('breedId', currentBreedId);
            formData.append(`balise_alt_${encodeURIComponent(selectedFile.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\W]/g, '_'))}`, altText);

            $.ajax({
                url: '/admin/breedInfos/add-photo',
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.success) {
                        $('#cropperModal').modal('hide');
                        
                        $('#photoAltText').val('');
                        
                        if (cropper) {
                            cropper.destroy();
                            cropper = null;
                        }
                        
                        loadBreedPhotos(currentBreedId);
                        
                        showSuccessToast('Photo ajoutée avec succès !');
                    } else {
                        showErrorToast('Erreur lors de l\'ajout de la photo: ' + response.message);
                    }
                },
                error: function(error) {
                    console.error('Erreur:', error);
                    showErrorToast('Erreur lors de l\'ajout de la photo');
                }
            });
        }, 'image/jpeg', 0.9);
    });

    // Nettoyer le cropper quand on ferme la modal
    $('#cropperModal').on('hidden.bs.modal', function() {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        $('#photoAltText').val('');
    });

    // Ouvrir la modal de confirmation de suppression
    $(document).on('click', '.delete-photo-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        photoToDelete.photoId = $(this).data('photo-id');
        photoToDelete.breedId = $(this).data('breed-id');
        
        $('#confirmDeletePhotoModal').modal('show');
    });

    // Confirmer la suppression de la photo
    $(document).on('click', '#confirmDeletePhotoBtn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const photoId = photoToDelete.photoId;
        const breedId = photoToDelete.breedId;
        
        $.ajax({
            url: `/admin/breedInfos/delete-photo/${photoId}`,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    $('#confirmDeletePhotoModal').modal('hide');
                    
                    loadBreedPhotos(breedId);
                    
                    showSuccessToast('Photo supprimée avec succès !');
                } else {
                    showErrorToast('Erreur lors de la suppression: ' + response.message);
                }
            },
            error: function(error) {
                console.error('Erreur:', error);
                showErrorToast('Erreur lors de la suppression de la photo');
            }
        });
    });
});










