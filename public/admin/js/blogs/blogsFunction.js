// fonction pour la création d'article avec la gestion de la validation du titre + génération du slug + sauvegarde de l'article avec message de succès + rafraîchissement de la page pour montrer le nouvel article
$(document).ready(function() {
    $('#createArticleModale').click(function() {
        $('#createArticleModal').modal('show');
        const today = moment().format('DD/MM/YYYY HH:mm'); 
        $('#date').val(today);
    });

    $('#titre').on('input', function() {
        const titreLength = $(this).val().length;
        if (titreLength <= 55) {
            $(this).removeClass('border-danger').addClass('border-success');
            $('#titreFeedback').text(`Caractères restants: ${55 - titreLength}`).removeClass('text-danger').addClass('text-success');
            $('#saveArticleButton').prop('disabled', false);
        } else {
            $(this).removeClass('border-success').addClass('border-danger');
            $('#titreFeedback').text(`Trop long de ${titreLength - 55} caractères`).removeClass('text-success').addClass('text-danger');
            $('#saveArticleButton').prop('disabled', true);
        }
    });

    function generateSlug(titre) {
        const accentsMap = new Map([
            ['á|à|ã|â|ä', 'a'],
            ['é|è|ê|ë', 'e'],
            ['í|ì|î|ï', 'i'],
            ['ó|ò|ô|õ|ö', 'o'],
            ['ú|ù|û|ü', 'u'],
            ['ç', 'c'],
            ['ñ', 'n']
        ]);
    
        let slug = titre.toLowerCase();
    
        accentsMap.forEach((replacement, pattern) => {
            slug = slug.replace(new RegExp(pattern, 'g'), replacement);
        });
    
        return slug
            .replace(/'/g, '-') 
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/-+$/g, '');
    }

    $('#saveArticleButton').click(async function() {
        if ($('#titre').val().length <= 55) {
            const titre = $('#titre').val();
            const formData = {
                titre: titre,
                preview: $('#preview').val(),
                date_creation: $('#date').val(),
                slug: generateSlug(titre),
                categories: $('#cat').val()
            };

            try {
                const response = await fetch('/admin/adminBlogs/create-article', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                if (response.ok) {
                    $('#successMessage').show();
                    $('.modal-content').addClass('border-success');
                    setTimeout(() => {
                        $('#successMessage').hide();
                        $('#createArticleModal').modal('hide');
                        location.reload();
                    }, 3000);
                } else {
                    throw new Error('Erreur lors de la création de l\'article');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur lors de la création de l\'article.');
            }
        }
    });

    // Gestionnaire d'événement pour les boutons Modifier
    $(document).on('click', '.edit-button', function() {
        const blogId = $(this).data('id');
        const isOnline = $(this).data('is-online');
        editBlog(blogId, isOnline);
    });

    // Fonction pour ouvrir la modale de modification
    function editBlog(blogId, isOnline) {
        $.ajax({
            url: `/admin/adminBlogs/${blogId}`,
            method: 'GET',
            success: function(response) {
                $('#editArticleModal .modal-title').text(response.titre);
                $('#editTitre').val(response.titre);
                $('#editPreview').val(response.preview);
                $('#editDateModification').val(moment().format('DD/MM/YYYY HH:mm'));
                $('#editArticleId').val(response.id);

                $('#paragraphContainer').html('');
                response.paragraphs.forEach((paragraph, index) => {
                    addParagraph(paragraph.title, paragraph.content, index + 1);
                });

                if (isOnline) {
                    $('#editTitre').prop('readonly', true);
                } else {
                    $('#editTitre').prop('readonly', false);
                }

                $('#editArticleModal').modal('show');
            },
            error: function() {
                console.error('Erreur lors de la récupération de l\'article');
            }
        });
    }
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

    // Enregistrer les modifications de l'article
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
            preview: $('#editPreview').val(),
            date_modification: $('#editDateModification').val(),
            id: $('#editArticleId').val(),
            slug: generateSlug(titre),
            paragraphs: paragraphs
        };

        try {
            const response = await fetch('/admin/adminBlogs/edit-article', {
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
                    $('#editArticleModal').modal('hide');
                    location.reload(); // Rafraîchir la page pour montrer les modifications
                }, 3000);
            } else {
                throw new Error('Erreur lors de la mise à jour de l\'article');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la mise à jour de l\'article.');
        }
    });

    // Associe la fonction addNewCategory au bouton "Ajouter" de la catégorie
    $(document).on('click', '#addCategoryButton', function() {
        addNewCategory();
    });
});


// fonction de recherche d'article + activitation du bouton modifier (ok)
$(document).ready(function() {
    $('#searchInput').on('keyup', function() {
        const query = $(this).val().trim().toLowerCase();
        $.ajax({
            url: '/admin/adminBlogs/search',
            method: 'GET',
            data: { search: query },
            success: function(response) {
                let blogsHtml = '';
                response.blogs.forEach(blog => {
                    blogsHtml += `
                        <div class="col-xs-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 mb-4">
                            <div class="h-100 p-4 bg-body-tertiary border rounded-3 position-relative shadow-sm">
                                <span id="badge-${blog.id}" class="badge ${blog.is_online ? 'bg-success' : 'bg-secondary'} position-absolute top-0 end-0 m-2">
                                    ${blog.is_online ? 'En Ligne' : 'Brouillon'}
                                </span>
                                <h5 class="text-primary-blog"><i class="bi bi-file-earmark-text me-2"></i>Titre de l'article:</h5>
                                <h5 class="mb-3">${blog.titre}</h5>
                                <h6 class="text-secondary"><i class="bi bi-card-text me-2"></i>Description</h6>
                                <p class="mb-3">${blog.preview.substring(0, 150)}...</p>
                                <div class="d-flex flex-column">
                                    <div class="mb-3">
                                        <small class="text-primary-blog"><i class="bi bi-pencil-square me-2"></i>Dernière modification : ${blog.formatted_date_modification}</small><br>
                                        <small class="text-muted"><i class="bi bi-calendar-event me-2"></i>Date de création : ${blog.formatted_date_creation}</small>
                                        <div class="form-check form-switch mt-1">
                                            <input class="form-check-input" type="checkbox" id="switchOnline${blog.id}" ${blog.is_online === 1 ? 'checked disabled' : ''}>
                                            <label class="form-check-label" for="switchOnline${blog.id}">Mettre en ligne</label>
                                        </div>
                                        <div>
                                            <button class="btn btn-primary faq-button w-100 mt-2" data-id="${blog.id}" data-is-online="${blog.is_online}">FAQ</button>
                                        </div>
                                    </div>
                                    <div class="d-flex flex-column gap-2 flex-md-row">
                                        <button class="btn btn-primary edit-button w-100" data-id="${blog.id}" data-is-online="${blog.is_online}">Modifier</button>
                                        <button class="btn btn-primary add-photo-button w-100" data-id="${blog.id}">Ajouter une photo</button>
                                        <button class="btn btn-primary add-keywords-button w-100" data-id="${blog.id}">Ajouter des mots clefs</button>
                                        <button class="btn btn-primary add-photo-supp-button w-100" data-id="${blog.id}">Ajouter une photo</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });

                $('#blog-list').html(blogsHtml);

                let paginationHtml = '';
                if (response.totalPages > 1) {
                    paginationHtml = `
                        <nav aria-label="Page navigation example">
                            <ul class="pagination justify-content-center">
                                ${response.currentPage > 1 ? `<li class="page-item"><a class="page-link" href="?search=${response.searchQuery}&page=${response.currentPage - 1}">Précédent</a></li>` : ''}
                                ${Array.from({ length: response.totalPages }, (_, i) => i + 1).map(i => `
                                    <li class="page-item ${i === response.currentPage ? 'active' : ''}">
                                        <a class="page-link" href="?search=${response.searchQuery}&page=${i}">${i}</a>
                                    </li>
                                `).join('')}
                                ${response.currentPage < response.totalPages ? `<li class="page-item"><a class="page-link" href="?search=${response.searchQuery}&page=${response.currentPage + 1}">Suivant</a></li>` : ''}
                            </ul>
                        </nav>
                    `;
                }
                $('#paginationContainer').html(paginationHtml);
            },
            error: function() {
                console.error('Erreur lors de la recherche des blogs');
            }
        });
    });
    // Gestionnaire d'événement pour les boutons Modifier
    $(document).on('click', '.edit-button', function() {
        const blogId = $(this).data('id');
        editBlog(blogId);
    });
    // Fonction pour ouvrir la modale de modification
    function editBlog(blogId) {
        $.ajax({
            url: `/admin/adminBlogs/${blogId}`,
            method: 'GET',
            success: function(response) {
                $('#editArticleModal .modal-title').text(response.titre);
                $('#editArticleModal #editTitre').val(response.titre);
                $('#editArticleModal #editPreview').val(response.preview);
                $('#editArticleModal #editDateCreation').val(response.formatted_date_creation);
                $('#editArticleModal #editDateModification').val(response.formatted_date_modification);
                $('#editArticleModal').modal('show');
            },
            error: function() {
                console.error('Erreur lors de la récupération de l\'article');
            }
        });
    }
});


// fonction pour l'ajout de la photo pour bordure verte + get de la photo
$(document).ready(function() {
    $(document).on('click', '.add-photo-button', function() {
        const blogId = $(this).data('id');
        $(`#blogId-${blogId}`).val(blogId);
        $(`#uploadPhotoBlog-${blogId}`).data('photos-blog-id', blogId);
        $(`#blogPhotoContainer-${blogId}`).html('');
        $.ajax({
            url: `/admin/adminBlogs/${blogId}/photos`,
            method: 'GET',
            success: function(response) {
                response.photos.forEach(photo => {
                    const imgHtml = `<img src="/uploads/${photo.image_path}" alt="${photo.balise_alt}" class="img-fluid mb-2">`;
                    $(`#blogPhotoContainer-${blogId}`).append(imgHtml);
                    $(`#balise_title-${blogId}`).val(photo.balise_title);
                    $(`#balise_alt-${blogId}`).val(photo.balise_alt);
                });
                $(`#addPhotoModal-${blogId}`).modal('show');
            },
            error: function() {
                console.error('Erreur lors de la récupération des photos');
                $(`#addPhotoModal-${blogId}`).modal('show');
            }
        });
    });
    $(document).on('click', '.upload-photo-button', function() {
        const blogId = $(this).data('photos-blog-id');
        $(`#photo-${blogId}`).click();
    });

    $(document).on('change', '.main-photo-input', function() {
        const blogId = $(this).attr('id').split('-')[1];
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgHtml = `<img src="${e.target.result}" alt="Image du blog" class="img-fluid mb-2">`;
                $(`#blogPhotoContainer-${blogId}`).html(imgHtml);
            };
            reader.readAsDataURL(file);
        }
    });
    $(document).on('click', '.save-photo-button', function() {
        const blogId = $(this).data('blog-id');
        const formData = new FormData($(`#addPhotoForm-${blogId}`)[0]);

        $.ajax({
            url: '/admin/adminBlogs/add-photo',
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                if (response.success) {
                    if ($(`#blogPhotoContainer-${blogId} img`).length === 0) {
                        $.ajax({
                            url: `/admin/blogs/${blogId}/photos`,
                            method: 'GET',
                            success: function(response) {
                                if (response.photos.length > 0) {
                                    const lastPhoto = response.photos[response.photos.length - 1];
                                    const imgHtml = `<img src="/uploads/${lastPhoto.image_path}" alt="${lastPhoto.balise_alt}" class="img-fluid mb-2">`;
                                    $(`#blogPhotoContainer-${blogId}`).html(imgHtml);
                                }
                            },
                            error: function() {
                                console.error('Erreur lors de la récupération des photos');
                            }
                        });
                    }
                    $(`#successModalPhotoMessage-${blogId}`).show();
                    $(`#addPhotoModal-${blogId} .modal-content`).addClass('border-success');
                    setTimeout(() => {
                        $(`#successModalPhotoMessage-${blogId}`).hide();
                        $(`#addPhotoModal-${blogId} .modal-content`).removeClass('border-success');
                        $(`#addPhotoModal-${blogId}`).modal('hide');
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


//  fonction pour mettre à jour le statut en ligne ou brouillon avec le disabled pour le switch 
$(document).ready(function() {
    function checkFormCompletion(blogId) {
        const allChecked = $(`#ConfirmOnlineArticle-${blogId} .form-check-input`).length === $(`#ConfirmOnlineArticle-${blogId} .form-check-input:checked`).length;
        $(`#ConfirmOnlineArticle-${blogId} .confirm-online-button-final`).prop('disabled', !allChecked);
    }

    $(document).on('change', '.form-check-input-confirm', function() {
        const blogId = $(this).closest('.modal').attr('id').replace('ConfirmOnlineArticle-', '');
        checkFormCompletion(blogId);
    });

    $(document).on('click', '.form-check-input', function() {
        const blogId = $(this).attr('id').replace('switchOnline', '');
        const isChecked = $(this).prop('checked');

        if (isChecked) {
            $(`#ConfirmOnlineArticle-${blogId}`).modal('show');
        } else {
            updateBlogStatus(blogId, 0);
        }
    });

    $(document).on('click', '.confirm-online-button-final', function() {
        const blogId = $(this).data('id');
        updateBlogStatus(blogId, 1);
    });

        $(document).on('click', '.btn-secondary', function() {
            const modalElement = $(this).closest('.modal');
            const modalId = modalElement.attr('id');

            if (modalId && modalId.startsWith('ConfirmOnlineArticle-')) {
                const blogId = modalId.replace('ConfirmOnlineArticle-', '');
                $(`#ConfirmOnlineArticle-${blogId}`).modal('hide');
                $(`#switchOnline${blogId}`).prop('checked', false);
            }
        });

    // Fonction pour mettre à jour le statut de l'article via AJAX
    function updateBlogStatus(blogId, isOnline) {
        $.ajax({
            url: `/admin/adminBlogs/${blogId}/update-status`,
            type: 'POST',
            data: { isOnline },
            success: function(response) {
                if (response.success) {
                    const newStatusText = isOnline ? 'En Ligne' : 'Brouillon';
                    const newBadgeClass = isOnline ? 'bg-success' : 'bg-secondary';

                    $(`#badge-${blogId}`).removeClass('bg-secondary bg-success').addClass(newBadgeClass).text(newStatusText);
                    $(`#switchOnline${blogId}`).prop('checked', isOnline);

                    if (isOnline) {
                        $(`#switchOnline${blogId}`).prop('disabled', true);
                    }

                    $(`#successConfirmOnlineArticle${blogId}`).show();
                    $(`#ConfirmOnlineArticle-${blogId} .modal-content`).addClass('border-success');

                    setTimeout(function() {
                        $(`#successConfirmOnlineArticle${blogId}`).hide();
                        $(`#ConfirmOnlineArticle-${blogId} .modal-content`).removeClass('border-success');
                        $(`#ConfirmOnlineArticle-${blogId}`).modal('hide');
                    }, 2500);
                } else {
                    alert('Erreur lors de la mise à jour du statut de l\'article');
                }
            },
            error: function() {
                alert('Erreur lors de la mise à jour du statut de l\'article');
            }
        });
    }
});

// fonction pour l'ajout de mots clés test avec message de succès + camel case
$(document).ready(function() {
    function createKeywordBadge(blogId, keyword) {
        return `
            <span class="badge bg-primary me-2 mb-2 keyword-badge">
                ${keyword} <i class="bi bi-x-circle-fill remove-keyword" data-blog-id="${blogId}" data-keyword="${keyword}"></i>
            </span>
        `;
    }

    function toCamelCase(input) {
        return input
            .normalize('NFD')  
            .replace(/[\u0300-\u036f]/g, '') 
            .replace(/[^a-zA-Z0-9 ]/g, '') 
            .split(' ')                    
            .map((word, index) => {
                if (index === 0) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(''); 
    }
    
    $(document).on('input', 'input[id^="keywordsInput-"]', function() {
        const blogId = $(this).attr('id').replace('keywordsInput-', '');
        const searchTerm = $(this).val().trim();

        if (searchTerm.length > 1) {
            $.ajax({
                url: `/admin/adminBlogs/keywords/search?q=${searchTerm}`,
                method: 'GET',
                success: function(response) {
                    const suggestionsContainer = $(`#keywordsSuggestions-${blogId}`);
                    suggestionsContainer.html(''); 

                    if (response.success && response.keywords.length > 0) {
                        suggestionsContainer.show(); 
                        response.keywords.forEach(keyword => {
                            suggestionsContainer.append(`<li class="list-group-item keyword-suggestion" data-blog-id="${blogId}" data-keyword="${keyword.content}">${keyword.content}</li>`);
                        });
                    } else {
                        suggestionsContainer.hide();
                    }
                },
                error: function() {
                    console.error('Erreur lors de la récupération des mots-clés');
                }
            });
        } else {
            $(`#keywordsSuggestions-${blogId}`).hide();
        }
    });
    $(document).on('click', '.keyword-suggestion', function() {
        const blogId = $(this).data('blog-id');
        const keyword = $(this).data('keyword');

        const keywordsContainer = $(`#keywordsContainer-${blogId}`);
        keywordsContainer.append(createKeywordBadge(blogId, keyword));

        $(`#keywordsSuggestions-${blogId}`).hide();
        $(`#keywordsInput-${blogId}`).val('');
    });

    // Gestionnaire d'événements pour ajouter un mot clef avec la touche Entrée
    $(document).on('keypress', 'input[id^="keywordsInput-"]', function(event) {
            if (event.which === 13) {
                event.preventDefault();
                const blogId = $(this).attr('id').replace('keywordsInput-', '');
                const keyword = toCamelCase($(this).val().trim());

                if (keyword) {
                    const keywordsContainer = $(`#keywordsContainer-${blogId}`);
                    const keywordWithHash = `#${keyword}`;
                    keywordsContainer.append(createKeywordBadge(blogId, keywordWithHash));
                    $(this).val('');
                }
            }
    });


    // Gestionnaire d'événements pour supprimer un mot clef
    $(document).on('click', '.remove-keyword', function() {
        $(this).closest('.keyword-badge').remove();
    });

    // Gestionnaire d'événements pour ouvrir la modale d'ajout de mots clefs
    $(document).on('click', '.add-keywords-button', function() {
        const blogId = $(this).data('id');
        $(`#addKeywordsModal-${blogId}`).modal('show');

        $.ajax({
            url: `/admin/adminBlogs/${blogId}/keywords`,
            method: 'GET',
            success: function(response) {
                const keywordsContainer = $(`#keywordsContainer-${blogId}`);
                keywordsContainer.html(''); 
                if (response.success) {
                    response.keywords.forEach(keyword => {
                        keywordsContainer.append(createKeywordBadge(blogId, keyword.content));
                    });
                }
            },
            error: function() {
                console.error('Erreur lors de la récupération des mots clefs');
            }
        });
    });

    // Gestionnaire d'événements pour enregistrer les mots clefs
    $(document).on('click', '.save-keywords-button', function() {
        const blogId = $(this).data('blog-id');
        const keywords = $(`#keywordsContainer-${blogId} .keyword-badge`).map(function() {
            return $(this).text().trim().replace(/\s+x$/, '');
        }).get();
        
        if (keywords.length > 0) {
            const formData = {
            blogId: blogId,
            keywords: keywords
            };
        
            $.ajax({
            url: `/admin/adminBlogs/add-keywords/${blogId}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                $(`#addKeywordsModal-${blogId} .alert-success`).show();
                        $(`#addKeywordsModal-${blogId} .modal-content`).addClass('border-success');

                        setTimeout(() => {
                            $(`#addKeywordsModal-${blogId} .alert-success`).hide();
                            $(`#addKeywordsModal-${blogId} .modal-content`).removeClass('border-success');
                            $(`#addKeywordsModal-${blogId}`).modal('hide');
                        }, 2000);
                    } else {
                        alert('Erreur lors de l\'ajout des mots clefs');
                    }
                },
                error: function() {
                    alert('Erreur lors de l\'ajout des mots clefs');
                }
            });
        } else {
            alert('Veuillez ajouter des mots clefs');
        }
    });
});

// fonction pour l'ajout de photos supplémentaires avec message de succès
$(document).ready(function () {
    let photoFiles = {};
    function resetPhotoFiles() {
        photoFiles = {};
    }
    function loadExistingPhotos(blogId) {
        $.ajax({
            url: `/admin/adminBlogs/${blogId}/supp-photos`,
            method: 'GET',
            success: function (response) {
                const photoContainer = $(`#photoContainer-${blogId}`);
                photoContainer.empty();

                response.photos.forEach((photo, index) => {
                    const photoHtml = `
                        <div class="photo-item mb-3 border p-2 rounded">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <strong>Photo ${index + 1}</strong>
                            </div>
                            <img src="/uploads/${photo.image_path}" alt="${photo.balise_alt}" class="img-fluid mb-2">
                            <input type="text" class="form-control mb-2" value="${photo.balise_alt}" disabled>
                        </div>`;
                    photoContainer.append(photoHtml);
                });
            },
            error: function () {
                console.error('Erreur lors de la récupération des photos');
            }
        });
    }
    $(document).on('click', '.add-photo-supp-button', function () {
        const blogId = $(this).data('id');
        resetPhotoFiles();
        loadExistingPhotos(blogId);
        $(`#addSuppPhotoModal-${blogId}`).modal('show');
    });

    $(document).on('click', '.upload-photo-button', function () {
        const blogId = $(this).data('blog-id');
        $(`.photo-input[data-blog-id="${blogId}"]`).click();
    });

    $(document).on('change', '.supp-photo-input', function () {
        const blogId = $(this).data('blog-id');
        const files = this.files;
        const photoContainer = $(`#photoContainer-${blogId}`);
        Array.from(files).forEach(file => {
            const uniqueId = Date.now() + Math.random().toString(36).substring(7);
            photoFiles[uniqueId] = { file: file, alt: '' };
            const reader = new FileReader();
            reader.onload = function (e) {
                const photoHtml = `
                    <div class="photo-item mb-3 border p-2 rounded">
                        <img src="${e.target.result}" class="img-fluid mb-2" style="max-width: 100%;">
                        <div class="form-group mb-2">
                            <label>Texte alternatif (obligatoire)</label>
                            <input type="text" 
                                class="form-control photo-alt-input" 
                                data-index="${uniqueId}" 
                                placeholder="Description de l'image">
                        </div>
                        <button type="button" 
                            class="btn btn-success w-100 upload-single-photo" 
                            data-blog-id="${blogId}" 
                            data-index="${uniqueId}">
                            Télécharger cette photo
                        </button>
                        <div class="progress mt-2" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                        </div>
                    </div>`;
                photoContainer.prepend(photoHtml);
            };
            reader.readAsDataURL(file);
        });
        $(this).val('');
    });
    
    $(document).on('input', '.photo-alt-input', function () {
        const index = $(this).data('index');
        if (photoFiles[index]) {
            photoFiles[index].alt = $(this).val();
        }
    });

    $(document).on('click', '.upload-single-photo', function () {
        const blogId = $(this).data('blog-id');
        const index = $(this).data('index');
        const fileData = photoFiles[index];
        const photoItem = $(this).closest('.photo-item');
        const progressBar = photoItem.find('.progress-bar');

        if (!fileData || !fileData.alt.trim()) {
            alert('Veuillez ajouter un texte alternatif pour l\'image');
            return;
        }

        const formData = new FormData();
        formData.append('blogId', blogId);
        formData.append('photo', fileData.file);
        formData.append('balise_alt', fileData.alt);

        $(this).prop('disabled', true);

        $.ajax({
            url: '/admin/adminBlogs/add-supp-photo',
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            xhr: function () {
                const xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener('progress', function (e) {
                    if (e.lengthComputable) {
                        const percent = (e.loaded / e.total) * 100;
                        progressBar.css('width', percent + '%');
                    }
                });
                return xhr;
            },
            success: function (response) {
                if (response.success) {
                    photoItem.fadeOut(500, function() {
                        $(this).remove();
                        loadExistingPhotos(blogId);
                    });
                } else {
                    alert('Erreur lors du téléchargement de la photo');
                }
            },
            error: function () {
                alert('Erreur lors du téléchargement de la photo');
            }
        });
    });

    $(document).on('hidden.bs.modal', '[id^=addSuppPhotoModal-]', function () {
        resetPhotoFiles();
    });
});

// fonction pour l'ajout des questions/réponses dans le faq
$(document).ready(function() {
    let temporaryFaqs = {};

    $(document).on('click', '.faq-button', function() {
        const blogId = $(this).data('id');
        temporaryFaqs[blogId] = [];
        loadFaqs(blogId);
        const modal = new bootstrap.Modal(document.getElementById(`faqModal-${blogId}`));
        modal.show();
    });
    function loadFaqs(blogId) {
        fetch(`/admin/adminBlogs/${blogId}/get-faqs`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayFaqs(blogId, data.faqs);
                } else {
                    document.getElementById(`faqList-${blogId}`).innerHTML = 
                        '<p class="text-muted">Aucune FAQ pour cet article</p>';
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                document.getElementById(`faqList-${blogId}`).innerHTML = 
                    '<p class="text-danger">Erreur lors du chargement des FAQs</p>';
            });
    }

    function displayFaqs(blogId, faqs) {
        const faqList = document.getElementById(`faqList-${blogId}`);
        if (faqs && faqs.length > 0) {
            faqList.innerHTML = faqs.map((faq, index) => `
                <div class="card mb-2">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <!-- Suppression du titre en double -->
                            <p class="card-subtitle mb-2 text-primary fs-5">${faq.question}</p>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary edit-faq" 
                                        data-id="${faq.id}" 
                                        data-blog-id="${blogId}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger ms-2 delete-faq" 
                                        data-id="${faq.id}" 
                                        data-blog-id="${blogId}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                        <p class="card-text">${faq.reponse}</p>
                    </div>
                </div>
            `).join('');
            attachFaqEventListeners(blogId);
        } else {
            faqList.innerHTML = '<p class="text-muted">Aucune FAQ pour cet article</p>';
        }
    }

document.querySelectorAll('.add-faq-button').forEach(button => {
    button.addEventListener('click', function() {
        const blogId = this.dataset.blogId;
        const question = document.getElementById(`question-${blogId}`).value.trim();
        const reponse = document.getElementById(`reponse-${blogId}`).value.trim();
        const currentFaqId = document.getElementById(`currentFaqId-${blogId}`).value;

        if (!question || !reponse) {
            alert('Veuillez remplir tous les champs');
            return;
        }

        if (currentFaqId) {
            fetch(`/admin/adminBlogs/faq/${currentFaqId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question, reponse })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadFaqs(blogId);
                    resetForm(blogId);
                    showSuccessMessage(blogId, 'FAQ modifiée avec succès');
                }
            })
            .catch(error => console.error('Erreur:', error));
        } else {
            temporaryFaqs[blogId] = temporaryFaqs[blogId] || [];
            temporaryFaqs[blogId].push({ question, reponse });
            const faqList = document.getElementById(`faqList-${blogId}`);
            const newFaqHtml = `
                <div class="card mb-2">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <p class="card-subtitle mb-2 text-primary fs-5">${question}</p>
                        </div>
                        <p class="card-text">${reponse}</p>
                    </div>
                </div>
            `;
            faqList.insertAdjacentHTML('afterbegin', newFaqHtml);
            resetForm(blogId);
            showSuccessMessage(blogId, 'FAQ ajoutée avec succès');
        }
    });
});

    function attachFaqEventListeners(blogId) {
        document.querySelectorAll(`.edit-faq[data-blog-id="${blogId}"]`).forEach(button => {
            button.addEventListener('click', function() {
                const faqId = this.dataset.id;
                fetch(`/admin/adminBlogs/faq/${faqId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            document.getElementById(`question-${blogId}`).value = data.faq.question;
                            document.getElementById(`reponse-${blogId}`).value = data.faq.reponse;
                            document.getElementById(`currentFaqId-${blogId}`).value = data.faq.id;
                        }
                    })
                    .catch(error => console.error('Erreur:', error));
            });
        });

        document.querySelectorAll(`.delete-faq[data-blog-id="${blogId}"]`).forEach(button => {
            button.addEventListener('click', function() {
                if (confirm('Êtes-vous sûr de vouloir supprimer cette FAQ ?')) {
                    const faqId = this.dataset.id;
                    fetch(`/admin/adminBlogs/faq/${faqId}`, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            loadFaqs(blogId);
                            showSuccessMessage(blogId, 'FAQ supprimée avec succès');
                        }
                    })
                    .catch(error => console.error('Erreur:', error));
                }
            });
        });
    }

    document.querySelectorAll('.modal-footer').forEach(footer => {
        const saveFinalButton = document.createElement('button');
        saveFinalButton.type = 'button';
        saveFinalButton.className = 'btn btn-primary save-all-faqs';
        saveFinalButton.textContent = 'Tout sauvegarder';
        saveFinalButton.dataset.blogId = footer.closest('.modal').id.split('-')[1];
        footer.insertBefore(saveFinalButton, footer.firstChild);
    });

    document.querySelectorAll('.save-all-faqs').forEach(button => {
        button.addEventListener('click', function() {
            const blogId = this.dataset.blogId;
            const faqs = temporaryFaqs[blogId] || [];

            if (faqs.length === 0) {
                showSuccessMessage(blogId, 'Aucune nouvelle FAQ à sauvegarder');
                return;
            }

            fetch(`/admin/adminBlogs/faqs/${blogId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ faqs: faqs })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    temporaryFaqs[blogId] = [];
                    loadFaqs(blogId);
                    showSuccessMessage(blogId, 'Toutes les FAQs ont été sauvegardées');
                }
            })
            .catch(error => console.error('Erreur:', error));
        });
    });

    function showSuccessMessage(blogId, message) {
        const alertElement = document.getElementById(`faqAlert-${blogId}`);
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 3000);
    }

    function resetForm(blogId) {
        document.getElementById(`question-${blogId}`).value = '';
        document.getElementById(`reponse-${blogId}`).value = '';
        document.getElementById(`currentFaqId-${blogId}`).value = '';
    }
});