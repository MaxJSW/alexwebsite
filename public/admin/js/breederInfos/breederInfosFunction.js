// fonction gestion du logo
$(document).ready(function() {
    let logoCropper = null;
    let selectedLogoFile = null;
    let currentUserId = null;
    
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

    $(document).on('click', '.upload-photo-button', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentUserId = $(this).data('photos-user-id');
        $(`#photo-${currentUserId}`).click();
    });

// Quand un fichier est sélectionné
$(document).on('change', 'input[type="file"]', function(e) {
    const file = e.target.files[0];
    
    if (file) {
        const allowedTypes = ['image/png', 'image/svg+xml'];
        
        if (!allowedTypes.includes(file.type)) {
            showWarningToast('Format non autorisé ! Veuillez sélectionner un fichier PNG ou SVG uniquement.');
            $(this).val('');
            return;
        }

        selectedLogoFile = file;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const logoToCrop = document.getElementById('logoToCrop');
                logoToCrop.src = event.target.result;
                
                $('#cropperLogoModal').modal('show');
                
                $('#cropperLogoModal').on('shown.bs.modal', function() {
                    if (logoCropper) {
                        logoCropper.destroy();
                    }
                    logoCropper = new Cropper(logoToCrop, {
                        aspectRatio: NaN,
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

// Valider et uploader le logo recadré
$(document).on('click', '#cropAndUploadLogoBtn', function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!logoCropper) {
        showErrorToast('Erreur: aucune image à recadrer');
        return;
    }

    const canvas = logoCropper.getCroppedCanvas({
        maxWidth: 800,
        maxHeight: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    const base64Image = canvas.toDataURL(selectedLogoFile.type, 1.0);

    $.ajax({
        url: '/admin/breederInformations/upload-photo',
        method: 'POST',
        data: {
            photo: base64Image,
            userId: currentUserId,
            fileName: selectedLogoFile.name
        },
        success: function(response) {
            if (response.success) {
                $('#cropperLogoModal').modal('hide');
                
                $(`#userPhotoContainer-${currentUserId}`).html(
                    `<img src="${base64Image}" alt="Prévisualisation du logo" class="img-fluid preview-image">`
                );
                
                if (logoCropper) {
                    logoCropper.destroy();
                    logoCropper = null;
                }
                
                showSuccessToast('Logo téléchargé avec succès !');
            } else {
                showErrorToast('Erreur lors du téléchargement du logo');
            }
        },
        error: function(error) {
            console.error('Erreur:', error);
            showErrorToast('Erreur lors du téléchargement du logo');
        }
    });
});

    $('#cropperLogoModal').on('hidden.bs.modal', function() {
        if (logoCropper) {
            logoCropper.destroy();
            logoCropper = null;
        }
    });

    $('#userInfoForm').submit(async function(event) {
        event.preventDefault();
        const formData = new FormData(this);

        try {
            const response = await fetch('/admin/breederInformations/update', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                showSuccessToast('Informations mises à jour avec succès !');
            } else {
                showErrorToast('Erreur lors de la mise à jour des informations');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showErrorToast('Erreur lors de la mise à jour des informations');
        }
    });
});