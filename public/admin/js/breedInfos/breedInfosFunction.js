
// fonction qui gère la modification de la fiche race, description et parapgraphes
$(document).ready(function() {
    $(document).on('click', '.edit-breed-button', function() {
        const breedId = $(this).data('id');

        $.ajax({
            url: `/admin/breedInfos/${breedId}`,
            method: 'GET',
            success: function(response) {
                $('#editBreedName').val(response.name);
                $('#editBreedDescription').val(response.description);
                $('#editDateModification').val(moment().format('DD/MM/YYYY HH:mm'));
                $('#editBreedId').val(response.id);

                $('#paragraphContainer').html('');
                response.paragraphs.forEach((paragraph, index) => {
                    addParagraph(paragraph.title, paragraph.content, index + 1);
                });

                $('#editBreedInfos').modal('show');
            },
            error: function() {
                console.error('Erreur lors de la récupération de la race');
            }
        });
    });

    $('#addParagraphButton').click(function() {
        addParagraph('', '', $('.paragraph-block').length + 1);
    });

    function addParagraph(title, content, index) {
        const paragraphHtml = `
            <div class="paragraph-block mb-3 border rounded p-3 bg-body-tertiary border rounded-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="flex-grow-1">
                        <div class="mb-3">
                            <label for="paragraphTitle${index}" class="form-label">Titre du paragraphe</label>
                            <input type="text" class="form-control" id="paragraphTitle${index}" name="paragraphs[${index}][title]" value="${title}" placeholder="Exemple : le standard, les origines, l'alimentation ou des questions/réponses sur la race">
                        </div>
                        <div class="mb-3">
                            <label for="paragraphContent${index}" class="form-label">Contenu du paragraphe</label>
                            <textarea class="form-control" id="paragraphContent${index}" name="paragraphs[${index}][content]" rows="4" >${content}</textarea>
                        </div>
                    </div>
                    <button type="button" class="btn btn-danger remove-paragraph-button ms-3 align-self-bottom">Supprimer</button>
                </div>
            </div>
        `;
        $('#paragraphContainer').append(paragraphHtml);
    }

    $(document).on('click', '.remove-paragraph-button', function() {
        $(this).closest('.paragraph-block').remove();
    });

    $('#saveEditButton').click(async function() {
        $('#editDateModification').val(moment().format('DD/MM/YYYY HH:mm'));

        const paragraphs = $('.paragraph-block').map(function() {
            return {
                title: $(this).find('input').val(),
                content: $(this).find('textarea').val()
            };
        }).get();

        const formData = {
            name: $('#editBreedName').val(),
            description: $('#editBreedDescription').val(),
            date_modification: $('#editDateModification').val(),
            id: $('#editBreedId').val(),
            paragraphs: paragraphs
        };

        try {
            const response = await fetch('/admin/breedInfos/edit', {
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
                }, 2000);
                setTimeout(() => {
                    $('#successMessage').hide();
                    $('#editBreedInfos').modal('hide');
                    location.reload();
                }, 3000);
            } else {
                alert('Erreur lors de la mise à jour de la race');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la mise à jour de la race.');
        }
    });
});


// fonction pour la mise du ligne de la race
$(document).ready(function() {
    function checkFormCompletion(breedId) {
        const allChecked = $(`#ConfirmOnlineBreed-${breedId} .form-check-input-confirm`).length === $(`#ConfirmOnlineBreed-${breedId} .form-check-input-confirm:checked`).length;
        $(`#ConfirmOnlineBreed-${breedId} .confirm-online-button-final`).prop('disabled', !allChecked);
    }

    $(document).on('change', '.form-check-input-confirm', function() {
        const modalId = $(this).closest('.modal').attr('id');
        if (modalId) {
            const breedId = modalId.replace('ConfirmOnlineBreed-', '');
            checkFormCompletion(breedId);
        } else {
            console.error('Modal ID is undefined');
        }
    });

    $(document).on('click', '.form-check-input', function() {
        const breedId = $(this).attr('id').replace('switchOnline', '');
        const isChecked = $(this).prop('checked');

        if (isChecked) {
            $(`#ConfirmOnlineBreed-${breedId}`).modal('show');
        } else {
            updateBreedStatus(breedId, 0);
        }
    });

    $(document).on('click', '.confirm-online-button-final', function() {
        const breedId = $(this).data('id');
        updateBreedStatus(breedId, 1);
    });

    $(document).on('click', '[id^="ConfirmOnlineBreed-"] .btn-secondary', function() {
        const breedId = $(this).closest('.modal').attr('id').replace('ConfirmOnlineBreed-', '');
        $(`#ConfirmOnlineBreed-${breedId}`).modal('hide');
        $(`#switchOnline${breedId}`).prop('checked', false);
    });

    function updateBreedStatus(breedId, isOnline) {
        $.ajax({
            url: `/admin/breedInfos/${breedId}/update-status`,
            type: 'POST',
            data: { isOnline },
            success: function(response) {
                if (response.success) {
                    const newStatusText = isOnline ? 'En Ligne' : 'Brouillon';
                    const newBadgeClass = isOnline ? 'bg-success' : 'bg-secondary';

                    $(`#badge-${breedId}`).removeClass('bg-secondary bg-success').addClass(newBadgeClass).text(newStatusText);
                    $(`#switchOnline${breedId}`).prop('checked', isOnline);

                    if (isOnline) {
                        $(`#switchOnline${breedId}`).prop('disabled', true);
                    }

                    $(`#successConfirmOnlineBreed${breedId}`).show();
                    $(`#ConfirmOnlineBreed-${breedId} .modal-content`).addClass('border-success');

                    setTimeout(function() {
                        $(`#successConfirmOnlineBreed${breedId}`).hide();
                        $(`#ConfirmOnlineBreed-${breedId} .modal-content`).removeClass('border-success');
                        $(`#ConfirmOnlineBreed-${breedId}`).modal('hide');
                    }, 2500);
                } else {
                    alert('Erreur lors de la mise à jour du statut de la race');
                }
            },
            error: function() {
                alert('Erreur lors de la mise à jour du statut de la race');
            }
        });
    }
});
