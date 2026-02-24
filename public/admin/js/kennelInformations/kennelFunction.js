// fonction globale pour créer une section et la modifier
$(document).ready(function() {
    // Ouvrir la modale de création de section
    $('#createArticleModale').click(function() {
        $('#createSectionModal').modal('show');
        const today = moment().format('DD/MM/YYYY HH:mm');  // Utilisation de moment.js pour formater la date
        $('#date').val(today);
    });

    // Gestion de la validation du titre
    $('#titre').on('input', function() {
        const titreLength = $(this).val().length;
        if (titreLength > 50) {
            $(this).removeClass('border-success').addClass('border-danger');
            $('#titreFeedback').text(`Trop long de ${titreLength - 50} caractères`).removeClass('text-success').addClass('text-danger');
            $('#saveSectionButton').prop('disabled', true);
        } else if (titreLength > 50) {
            $(this).removeClass('border-success').addClass('border-danger');
            $('#titreFeedback').text('Titre trop long').removeClass('text-success').addClass('text-danger');
            $('#saveSectionButton').prop('disabled', true);
        } else {
            $(this).removeClass('border-danger').addClass('border-success');
            $('#titreFeedback').text(`Caractères restants: ${50 - titreLength}`).removeClass('text-danger').addClass('text-success');
            $('#saveSectionButton').prop('disabled', false);
        }
    });
    

    // Fonction pour générer le slug
    function generateSlug(titre) {
        const accentsMap = new Map([
            ['a', 'á|à|ã|â|ä'],
            ['e', 'é|è|ê|ë'],
            ['i', 'í|ì|î|ï'],
            ['o', 'ó|ò|ô|õ|ö'],
            ['u', 'ú|ù|û|ü'],
            ['c', 'ç'],
            ['n', 'ñ']
        ]);

        let slug = titre.toLowerCase();
        accentsMap.forEach((pattern, replacement) => {
            slug = slug.replace(new RegExp(pattern, 'g'), replacement);
        });

        return slug.replace(/'/g, '-') // Remplace les apostrophes par des tirets
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    // Enregistrer la nouvelle section
    $('#saveSectionButton').click(async function() {
        if ($('#titre').val().length <= 70) {
            const titre = $('#titre').val();
            const formData = {
                titre: titre,
                description: $('#preview').val(),
                date_creation: $('#date').val(),
                slug: generateSlug(titre)
            };

            try {
                const response = await fetch('/admin/kennelInformations/create-section', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                if (response.ok) {
                    $('#successCreateSectionMessage').show();
                    $('.modal-content').addClass('border-success');
                    setTimeout(() => {
                        $('#successCreateSectionMessage').hide();
                        $('#createSectionModal').modal('hide');
                        location.reload(); // Rafraîchir la page pour montrer la nouvelle section
                    }, 3000); // Afficher le message pendant 3 secondes et fermer la modale
                } else {
                    throw new Error('Erreur lors de la création de la section');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur lors de la création de la section.');
            }
        }
    });

    // Gestionnaire d'événement pour les boutons Modifier
    $(document).on('click', '.edit-button', function() {
        const sectionId = $(this).data('id');
        const isOnline = $(this).data('is-online');
        editSection(sectionId, isOnline);
    });

    // Fonction pour ouvrir la modale de modification
    function editSection(sectionId, isOnline) {
        $.ajax({
            url: `/admin/kennelInformations/${sectionId}`,
            method: 'GET',
            success: function(response) {
                // Assurez-vous que la modale est configurée pour afficher les données de la section
                $('#editInformationsModal .modal-title').text(response.titre);
                $('#editTitre').val(response.titre);
                $('#editPreview').val(response.description);
                $('#editDateModification').val(moment().format('DD/MM/YYYY HH:mm'));
                $('#editSectionId').val(response.id);

                // Réinitialiser les paragraphes
                $('#paragraphContainer').html('');
                response.paragraphs.forEach((paragraph, index) => {
                    addParagraph(paragraph.title, paragraph.content, index + 1);
                });

                // Définir le champ de titre en lecture seule si la section est en ligne
                if (isOnline) {
                    $('#editTitre').prop('readonly', true);
                } else {
                    $('#editTitre').prop('readonly', false);
                }

                $('#editInformationsModal').modal('show');
            },
            error: function() {
                console.error('Erreur lors de la récupération de la section');
            }
        });
    }

    // Ajouter un paragraphe dynamique
    $('#addParagraphButton').click(function() {
        addParagraph('', '', $('.paragraph-block').length + 1);
    });

    // Fonction pour ajouter un paragraphe
    function addParagraph(title, content, index) {
        const paragraphHtml = `
            <div class="paragraph-block mb-3 border rounded p-3 bg-body-tertiary border rounded-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="flex-grow-1">
                        <div class="mb-3">
                            <label for="paragraphTitle${index}" class="form-label">Titre du paragraphe</label>
                            <input type="text" class="form-control" id="paragraphTitle${index}" name="paragraphs[${index}][title]" value="${title}">
                        </div>
                        <div class="mb-3">
                            <label for="paragraphContent${index}" class="form-label">Contenu du paragraphe</label>
                            <textarea class="form-control" id="paragraphContent${index}" name="paragraphs[${index}][content]" rows="4">${content}</textarea>
                        </div>
                    </div>
                    <button type="button" class="btn btn-danger remove-paragraph-button ms-3 align-self-bottom">Supprimer</button>
                </div>
            </div>
        `;
        $('#paragraphContainer').append(paragraphHtml);
    }

    // Supprimer un paragraphe spécifique
    $(document).on('click', '.remove-paragraph-button', function() {
        $(this).closest('.paragraph-block').remove();
    });

    // Enregistrer les modifications de la section
    $('#saveEditButton').click(async function() {
        // Mettre à jour la date de modification avant l'envoi
        $('#editDateModification').val(moment().format('DD/MM/YYYY HH:mm'));

        const paragraphs = $('.paragraph-block').map(function() {
            return {
                title: $(this).find('input').val(),
                content: $(this).find('textarea').val()
            };
        }).get();

        const titre = $('#editTitre').val();
        const formData = {
            titre: titre,
            description: $('#editPreview').val(),
            date_modification: $('#editDateModification').val(),
            id: $('#editSectionId').val(),
            slug: generateSlug(titre),
            paragraphs: paragraphs
        };

        try {
            const response = await fetch('/admin/kennelInformations/edit-section', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                $('#successMessage').show();
                $('.paragraph-block').addClass('border-success');
                setTimeout(() => {
                    $('.paragraph-block').removeClass('border-success');
                }, 2000); // Bordures vertes pendant 2 secondes
                setTimeout(() => {
                    $('#successMessage').hide();
                    $('#editInformationsModal').modal('hide');
                    location.reload(); // Rafraîchir la page pour montrer les modifications
                }, 3000);
            } else {
                throw new Error('Erreur lors de la mise à jour de la section');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la mise à jour de la section.');
        }
    });
});




// fonction pour ajouter une photo à une section
$(document).ready(function() {
    // Gestionnaire d'événements pour ouvrir la modale d'ajout de photo
    $(document).on('click', '.add-photo-button', function() {
        const sectionId = $(this).data('id');
        $(`#sectionId-${sectionId}`).val(sectionId);
        $(`#photo-${sectionId}`).data('photos-section-id', sectionId);

        // Vider le conteneur des photos avant de le remplir
        $(`#sectionPhotoContainer-${sectionId}`).html('');

        // Charger les photos existantes pour la section
        $.ajax({
            url: `/admin/kennelInformations/${sectionId}/photos`,
            method: 'GET',
            success: function(response) {
                response.photos.forEach(photo => {
                    const imgHtml = `<img src="/uploads/${photo.image_path}" alt="${photo.balise_alt}" class="img-fluid mb-2">`;
                    $(`#sectionPhotoContainer-${sectionId}`).append(imgHtml);

                    // Remplir les champs balise_title et balise_alt si les valeurs existent
                    $(`#balise_title-${sectionId}`).val(photo.balise_title);
                    $(`#balise_alt-${sectionId}`).val(photo.balise_alt);
                });
                $(`#addPhotoSectionModal-${sectionId}`).modal('show');
            },
            error: function() {
                console.error('Erreur lors de la récupération des photos');
                $(`#addPhotoSectionModal-${sectionId}`).modal('show');
            }
        });
    });

    // Gestionnaire d'événement pour le bouton de téléchargement des photos
    $(document).on('click', '.upload-photo-button', function() {
        const sectionId = $(this).data('photos-section-id');
        $(`#photo-${sectionId}`).click();
    });

    // Afficher l'image sélectionnée dans le conteneur
    $(document).on('change', 'input[type="file"]', function() {
        const sectionId = $(this).attr('id').split('-')[1];
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgHtml = `<img src="${e.target.result}" alt="Image de la section" class="img-fluid mb-2">`;
                $(`#sectionPhotoContainer-${sectionId}`).html(imgHtml);
            };
            reader.readAsDataURL(file);
        }
    });

    // Enregistrer les photos
    $(document).on('click', '.save-photo-button', function() {
        const sectionId = $(this).data('section-id');
        const formData = new FormData($(`#addPhotoForm-${sectionId}`)[0]);

        $.ajax({
            url: '/admin/kennelInformations/add-photo',
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                if (response.success) {
                    // Vérifier si une nouvelle image a été téléchargée ou non
                    if ($(`#sectionPhotoContainer-${sectionId} img`).length === 0) {
                        // Si aucune nouvelle image n'a été téléchargée, recharger la dernière image existante
                        $.ajax({
                            url: `/admin/kennelInformations/${sectionId}/photos`,
                            method: 'GET',
                            success: function(response) {
                                if (response.photos.length > 0) {
                                    const lastPhoto = response.photos[response.photos.length - 1];
                                    const imgHtml = `<img src="/uploads/${lastPhoto.image_path}" alt="${lastPhoto.balise_alt}" class="img-fluid mb-2">`;
                                    $(`#sectionPhotoContainer-${sectionId}`).html(imgHtml);
                                }
                            },
                            error: function() {
                                console.error('Erreur lors de la récupération des photos');
                            }
                        });
                    }

                    // Afficher le message de succès et changer les bordures de la modale en vert
                    $(`#successModalPhotoMessage-${sectionId}`).show();
                    $(`#addPhotoSectionModal-${sectionId} .modal-content`).addClass('border-success');

                    // Masquer le message de succès et fermer la modale après 3 secondes
                    setTimeout(() => {
                        $(`#successModalPhotoMessage-${sectionId}`).hide();
                        $(`#addPhotoSectionModal-${sectionId} .modal-content`).removeClass('border-success');
                        $(`#addPhotoSectionModal-${sectionId}`).modal('hide');
                    }, 3000);
                } else {
                    alert('Erreur lors de l\'ajout de la photo');
                }
            },
            error: function() {
                alert('Erreur lors de l\'ajout de la photo');
            }
        });
    });
});



// fonction pour mettre la section en ligne ou hors ligne
$(document).ready(function() {
    // Fonction pour vérifier l'état des cases à cocher
    function checkFormCompletion(sectionId) {
        const allChecked = $(`#confirmOnlineSection-${sectionId} .form-check-input`).length === $(`#confirmOnlineSection-${sectionId} .form-check-input:checked`).length;
        $(`#confirmOnlineSection-${sectionId} .confirm-online-button-final`).prop('disabled', !allChecked);
    }

    // Gestionnaire d'événement pour les cases à cocher
    $(document).on('change', '.form-check-input-confirm', function() {
        const sectionId = $(this).closest('.modal').attr('id').replace('confirmOnlineSection-', '');
        checkFormCompletion(sectionId);
    });

    // Gestionnaire d'événements pour ouvrir la modale de confirmation
    $(document).on('click', '.form-check-input', function() {
        const sectionId = $(this).attr('id').replace('switchOnline', '');
        const isChecked = $(this).prop('checked');

        if (isChecked) {
            $(`#confirmOnlineSection-${sectionId}`).modal('show');
        } else {
            updateSectionStatus(sectionId, 0);
        }
    });

    // Gestionnaire d'événements pour confirmer la mise en ligne après confirmation
    $(document).on('click', '.confirm-online-button-final', function() {
        const sectionId = $(this).data('id');
        updateSectionStatus(sectionId, 1);
    });

    // Gestionnaire d'événements pour fermer la modale et annuler la mise en ligne
    $(document).on('click', '.btn-secondary', function() {
        const sectionId = $(this).closest('.modal').attr('id').replace('confirmOnlineSection-', '');
        $(`#confirmOnlineSection-${sectionId}`).modal('hide');
        $(`#switchOnline${sectionId}`).prop('checked', false);
    });

    // Fonction pour mettre à jour le statut de la section via AJAX
    function updateSectionStatus(sectionId, isOnline) {
        $.ajax({
            url: `/admin/kennelInformations/${sectionId}/update-status`,
            type: 'POST',
            data: { isOnline },
            success: function(response) {
                if (response.success) {
                    const newStatusText = isOnline ? 'En Ligne' : 'Brouillon';
                    const newBadgeClass = isOnline ? 'bg-success' : 'bg-secondary';

                    // Mettre à jour le badge et le switch
                    $(`#badge-${sectionId}`).removeClass('bg-secondary bg-success').addClass(newBadgeClass).text(newStatusText);
                    $(`#switchOnline${sectionId}`).prop('checked', isOnline);

                    // Désactiver le switch si la section est en ligne
                    if (isOnline) {
                        $(`#switchOnline${sectionId}`).prop('disabled', true);
                    }

                    // Afficher le message de succès et ajouter une bordure verte
                    $(`#successConfirmOnlineSection${sectionId}`).show();
                    $(`#confirmOnlineSection-${sectionId} .modal-content`).addClass('border-success');

                    // Fermer la modale après 2 secondes
                    setTimeout(function() {
                        $(`#successConfirmOnlineSection${sectionId}`).hide();
                        $(`#confirmOnlineSection-${sectionId} .modal-content`).removeClass('border-success');
                        $(`#confirmOnlineSection-${sectionId}`).modal('hide');
                    }, 2500);
                } else {
                    alert('Erreur lors de la mise à jour du statut de la section');
                }
            },
            error: function() {
                alert('Erreur lors de la mise à jour du statut de la section');
            }
        });
    }
});



