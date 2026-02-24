// // fonction pour ajouter les photos générales de l'animal
// document.getElementById('uploadBtn').addEventListener('click', function() {
//     document.getElementById('photoInput').click();
// });

// document.getElementById('photoInput').addEventListener('change', async function() {
//     const form = new FormData(document.getElementById('uploadForm'));

//     try {
//         const response = await fetch(`/admin/animalProfile/${animalSlug}/uploadPhotos`, {
//             method: 'POST',
//             body: form
//         });

//         if (response.ok) {
//             const data = await response.json();
//             displayPhotosGradually(data.photos);
//         } else {
//             const errorText = await response.text();
//             console.error('Erreur lors du téléchargement des photos:', errorText);
//             alert('Erreur lors du téléchargement des photos.');
//         }
//     } catch (error) {
//         console.error('Erreur:', error);
//     }
// });

// document.addEventListener('DOMContentLoaded', function() {
//     const activeTab = sessionStorage.getItem('activeTab');
//     if (activeTab) {
//         const tab = document.querySelector(`[data-bs-target="${activeTab}"]`);
//         if (tab) {
//             const tabInstance = new bootstrap.Tab(tab);
//             tabInstance.show();
//         }
//         sessionStorage.removeItem('activeTab');
//     }
// });

// function displayPhotosGradually(photos) {
//     const photoContainer = document.getElementById('photoContainer');
//     photos.forEach((photo, index) => {
//         setTimeout(() => {
//             const col = document.createElement('div');
//             col.className = 'col';
//             col.id = `photo-${photo.id}`;
//             col.innerHTML = `
//                 <div class="card shadow-sm position-relative">
//                     <img src="/uploads/${photo.image_path}" class="bd-placeholder-img card-img-top" width="400" height="400" alt="Photo">
//                     <button class="btn btn-danger position-absolute top-0 end-0 m-2" data-photo-id="${photo.id}" data-photo-path="${photo.image_path}" onclick="confirmDelete(this)">
//                         <i class="bi bi-trash"></i>
//                     </button>
//                 </div>
//             `;
//             photoContainer.appendChild(col);
//         }, index * 1000);
//     });
// }



// Code du cropper avec validation
document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let cropper = null;
    let currentFiles = [];

    // Configuration des limites
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const CROP_SIZE = 400; // 400x400 pixels

    // Vérifier que les éléments existent
    const uploadBtn = document.getElementById('uploadBtn');
    const photoInput = document.getElementById('photoInput');
    const cropAndUploadBtn = document.getElementById('cropAndUploadBtn');
    const cropModal = document.getElementById('cropModal');

    if (!uploadBtn || !photoInput || !cropAndUploadBtn || !cropModal) {
        console.log('Éléments du cropper non trouvés sur cette page');
        return; // Sortir si les éléments n'existent pas
    }

    // Bouton pour ouvrir le sélecteur de fichiers
    uploadBtn.addEventListener('click', function() {
        photoInput.click();
    });

// Événement lorsque des fichiers sont sélectionnés
document.getElementById('photoInput').addEventListener('change', function(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    // Validation des fichiers
    const validationResult = validateFiles(files);
    
    if (!validationResult.valid) {
        alert(validationResult.message);
        event.target.value = ''; // Reset input
        return;
    }
    
    // Stocker les fichiers valides
    currentFiles = validationResult.validFiles;
    
    // Si un seul fichier, ouvrir directement le crop
    if (currentFiles.length === 1) {
        openCropModal(currentFiles[0]);
    } else {
        // Si plusieurs fichiers, traiter le premier
        alert(`${currentFiles.length} photos sélectionnées. Vous allez les recadrer une par une.`);
        openCropModal(currentFiles[0]);
    }
});

// Fonction de validation des fichiers
function validateFiles(files) {
    const validFiles = [];
    const errors = [];
    
    for (let file of files) {
        // Vérifier le format
        if (!ALLOWED_FORMATS.includes(file.type)) {
            errors.push(`${file.name} : Format non autorisé. Formats acceptés : JPG, JPEG, PNG, WEBP`);
            continue;
        }
        
        // Vérifier le poids
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name} : Fichier trop lourd (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum : 5MB`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    if (errors.length > 0) {
        return {
            valid: false,
            message: errors.join('\n')
        };
    }
    
    return {
        valid: true,
        validFiles: validFiles
    };
}

// Ouvrir la modale de crop
function openCropModal(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const image = document.getElementById('cropImage');
        image.src = e.target.result;
        
        // Ouvrir la modale
        const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));
        cropModal.show();
        
        // Initialiser Cropper après l'ouverture de la modale
        document.getElementById('cropModal').addEventListener('shown.bs.modal', function() {
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(image, {
                aspectRatio: 1, // Ratio 1:1 pour un carré
                viewMode: 2,
                autoCropArea: 1,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        }, { once: true });
    };
    
    reader.readAsDataURL(file);
}

// Bouton "Valider et envoyer" dans la modale
document.getElementById('cropAndUploadBtn').addEventListener('click', async function() {
    if (!cropper) return;
    
    // Récupérer le canvas croppé en 400x400
    const canvas = cropper.getCroppedCanvas({
        width: CROP_SIZE,
        height: CROP_SIZE,
        imageSmoothingQuality: 'high'
    });
    
    // Convertir le canvas en Blob
    canvas.toBlob(async function(blob) {
        // Créer un FormData avec l'image croppée
        const formData = new FormData();
        formData.append('photos', blob, 'cropped-photo.jpg');
        formData.append('animal_id', '<%= animal.id %>'); // Assure-toi que cette variable est définie
        
        // Afficher un loader sur le bouton
        const btn = document.getElementById('cropAndUploadBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Envoi en cours...';
        
        try {
            const response = await fetch(`/admin/animalProfile/${animalSlug}/uploadPhotos`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Fermer la modale
                bootstrap.Modal.getInstance(document.getElementById('cropModal')).hide();
                
                // Détruire le cropper
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                
                // Afficher les photos
                displayPhotosGradually(data.photos);
                
                // Reset le bouton
                btn.disabled = false;
                btn.innerHTML = originalText;
                
                // Reset l'input
                document.getElementById('photoInput').value = '';
                
            } else {
                const errorText = await response.text();
                console.error('Erreur lors du téléchargement:', errorText);
                alert('Erreur lors du téléchargement de la photo.');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du téléchargement de la photo.');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, 'image/jpeg', 0.95);
});

// Nettoyer le cropper quand la modale se ferme
document.getElementById('cropModal').addEventListener('hidden.bs.modal', function() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
});

// Fonction pour afficher les photos graduellement (ton code existant)
function displayPhotosGradually(photos) {
    const photoContainer = document.getElementById('photoContainer');
    photos.forEach((photo, index) => {
        setTimeout(() => {
            const col = document.createElement('div');
            col.className = 'col';
            col.id = `photo-${photo.id}`;
            col.innerHTML = `
                <div class="card shadow-sm position-relative">
                    <img src="/uploads/${photo.image_path}" class="bd-placeholder-img card-img-top" alt="Photo">
                    <button class="btn btn-danger position-absolute top-0 end-0 m-2" data-photo-id="${photo.id}" data-photo-path="${photo.image_path}" onclick="confirmDelete(this)">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            photoContainer.appendChild(col);
        }, index * 300);
    });
}

// Gestion de l'onglet actif (ton code existant)
document.addEventListener('DOMContentLoaded', function() {
    const activeTab = sessionStorage.getItem('activeTab');
    if (activeTab) {
        const tab = document.querySelector(`[data-bs-target="${activeTab}"]`);
        if (tab) {
            const tabInstance = new bootstrap.Tab(tab);
            tabInstance.show();
        }
        sessionStorage.removeItem('activeTab');
    }
});
});






// fonction pour supprimer une photo
function confirmDelete(button) {
    const photoId = button.getAttribute('data-photo-id');
    const photoPath = button.getAttribute('data-photo-path');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    confirmDeleteBtn.setAttribute('data-photo-id', photoId);
    confirmDeleteBtn.setAttribute('data-photo-path', photoPath);
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

document.addEventListener("DOMContentLoaded", function() {
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    confirmDeleteBtn.removeEventListener('click', handleDeleteClick);
    confirmDeleteBtn.addEventListener('click', handleDeleteClick);
});

async function handleDeleteClick() {
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
            document.getElementById(`photo-${photoId}`).remove();
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            deleteModal.hide();
        } else {
            console.error(await response.text());
            alert('Erreur lors de la suppression de la photo.');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}


// fonction pour mettre à jour le statut en ligne/hors ligne de l'animal
function toggleOnlineStatus(animalId) {
    const checkbox = document.getElementById('is_online');
    const label = document.getElementById('onlineStatusLabel');
    const isOnline = checkbox.checked ? 1 : 0;
    const statusText = isOnline ? 'En ligne' : 'Hors ligne';
    const statusColor = isOnline ? 'green' : 'red';
    label.textContent = statusText;
    label.style.color = statusColor;
    fetch('/admin/animalProfile/updateAnimalStatus', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ animalId, isOnline }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Statut mis à jour avec succès');
        } else {
            console.error('Échec de la mise à jour du statut');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
    });
}


// version qui télécharge une seule photo mais qui n'apparait pas de suite sur la gauche(optmisé car une seule photo téléchargée)
document.addEventListener('DOMContentLoaded', function() {
    const uploadProfileForm = document.getElementById('uploadProfileForm');
    if (uploadProfileForm) {
        uploadProfileForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const form = new FormData(uploadProfileForm);
            try {
                const response = await fetch('/admin/animalProfile/uploadProfileImage', {
                    method: 'POST',
                    body: form
                });
                if (response.ok) {
                    const data = await response.json();
                    displayProfileImage(data);

                    // Fermer la modale après le téléchargement
                    const uploadProfileModal = bootstrap.Modal.getInstance(document.getElementById('uploadProfileModal'));
                    if (uploadProfileModal) {
                        uploadProfileModal.hide();
                    } else {
                        const newModal = new bootstrap.Modal(document.getElementById('uploadProfileModal'));
                        newModal.hide();
                    }
                } else {
                    const errorText = await response.text();
                    alert('Erreur lors du téléchargement de la photo de profil.');
                }
            } catch (error) {
                console.error('Erreur:', error);
            }
        });
    }

    function displayProfileImage(photo) {
        // Mettre à jour le contenu des deux éléments avec l'ID "image-profile"
        const imageProfile1 = document.querySelector('#image-profile-1 img');
        const imageProfile2 = document.querySelector('#image-profile-2 img');

        if (imageProfile1) {
            imageProfile1.src = '/uploads/' + photo.image_path_profile;
        }

        if (imageProfile2) {
            imageProfile2.src = '/uploads/' + photo.image_path_profile;
        }
    }
});


// fonction pour supprimer la photo de profil
document.addEventListener('DOMContentLoaded', function() {
    const deleteModal = document.getElementById('deleteProfileImageModal');
    const form = document.getElementById('deleteProfileImageForm');

    deleteModal.addEventListener('show.bs.modal', function(event) {
        const button = event.relatedTarget;
        const animalId = button.getAttribute('data-animal-id');
        this.querySelector('input[name="animalId"]').value = animalId;
    });

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const animalIdInput = this.querySelector('input[name="animalId"]');
            const animalId = animalIdInput.value;

            fetch('/admin/animalProfile/deleteProfileImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ animalId: animalId })
            })
            .then(response => response.json())
            .then(data => {
                
                if (data.success) {
                    const modal = bootstrap.Modal.getInstance(deleteModal);
                    modal.hide();
                    document.querySelector('#image-profile-2 img').src = 'https://img.freepik.com/vecteurs-premium/icone-compte-icone-utilisateur-graphiques-vectoriels_292645-552.jpg?w=740';
                    
                } else {
                    alert(`Erreur: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors de la suppression de la photo de profil.');
            });
        });
    }
});


/// fonction pour ajouter les mots clés
document.addEventListener('DOMContentLoaded', () => {
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const keywordInput = document.getElementById('keywords-input');
    const animalIdInput = document.getElementById('animal-id');
    const keywordsContainer = document.getElementById('keywords-container');
  
    addKeywordBtn.addEventListener('click', async () => {
      const keyword = `#${keywordInput.value.trim()}`;
      const animalId = animalIdInput.value;
  
      if (keyword.length > 1) {
        try {
          const response = await fetch('/admin/animalProfile/addKeywords', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keyword, animal_id: animalId })
          });
  
          if (response.ok) {
            keywordInput.value = '';
  
            const keywordBadge = document.createElement('span');
            keywordBadge.className = 'badge text-bg-primary mt-2';
            keywordBadge.textContent = keyword;
  
            keywordsContainer.appendChild(keywordBadge);
          } else {
            console.error('Failed to add keyword');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    });
  });


// fonction mettre à jour les textes
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('textForm');
    const animalId = form.querySelector('input[name="animalId"]').value;
    
    document.getElementById('saveTextsButton').addEventListener('click', async function() {
        const healthTests = document.getElementById('healthTestsTextarea').value.trim();
        const descriptionAnimals = document.getElementById('descriptionTextarea').value.trim();
 
        // console.log('Animal ID:', animalId);
        // console.log('Form animal ID:', form.querySelector('input[name="animalId"]').value);
 
        if (!animalId) {
            console.error('ID animal manquant');
            return;
        }
 
        try {
            const response = await fetch('/admin/animalProfile/updateTexts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    animalId: parseInt(animalId),
                    health_tests: healthTests, 
                    description_animals: descriptionAnimals
                })
            });
 
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const successMessage = document.getElementById('successMessageText');
                    successMessage.style.display = 'block';
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
 });


// fonction pour le bouton de redirection "gérer les photos" sur myanimals
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier s'il y a un indicateur dans l'URL pour afficher la section "Généalogie"
    const hash = window.location.hash;
  
    if (hash === '#password-tab-pane') {
      // Activer l'onglet correspondant
      const uploadPhotosTab = new bootstrap.Tab(document.querySelector('#password-tab'));
      uploadPhotosTab.show();
  
      // Désactiver la mise en surbrillance de l'ancre
      setTimeout(() => {
        window.location.hash = '';
        window.history.replaceState(null, null, ' '); // Ceci efface l'ancre de l'URL sans rafraîchir la page
      }, 1000);
    }
  });


  //   fonction pour ajouter les résultats des concours avec redirection vers l'onglet (à conserver)
  document.addEventListener('DOMContentLoaded', function () {
    const resultsModal = document.getElementById('resultsModal');
    
    resultsModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget; // Bouton qui a déclenché la modale
        const animalId = button.getAttribute('data-animal-id'); // Extraire l'ID de l'animal
        document.getElementById('animalId').value = animalId;
        document.getElementById('animalName').textContent = button.getAttribute('data-animal-name');
    });
  
    // Handle form submission
    document.getElementById('resultsForm').addEventListener('submit', function (e) {
        e.preventDefault();
  
        const animalId = document.getElementById('animalId').value;
        const year = document.getElementById('year').value;
        const awardName = document.getElementById('awardName').value;
        const awardDescription = document.getElementById('awardDescription').value;
  
        const data = {
            animal_id: animalId,
            year: year,
            award_name: awardName,
            award_description: awardDescription
        };
  
        console.log('Data:', data);
  
        fetch('/admin/animalProfile/awards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Afficher le message de succès
                const successMessage = document.getElementById('successMessage');
                successMessage.style.display = 'block';
  
                // Ajouter une bordure verte à la modale
                resultsModal.querySelector('.modal-content').style.border = '2px solid green';
  
                // Enregistrer l'ID de l'onglet à ouvrir dans le localStorage
                localStorage.setItem('scrollToResultsTab', true);
  
                // Masquer la bordure verte et le message après 3 secondes
                setTimeout(() => {
                    successMessage.style.display = 'none';
                    resultsModal.querySelector('.modal-content').style.border = '';
                    $('#resultsModal').modal('hide');
                    location.reload(); // Rafraîchir la page
                }, 3000);
            } else {
                alert('Erreur lors de l\'enregistrement des résultats');
            }
        })
        .catch(error => console.error('Erreur:', error));
    });

    // Après le chargement de la page, vérifiez si l'utilisateur doit être redirigé vers l'onglet
    if (localStorage.getItem('scrollToResultsTab')) {
        localStorage.removeItem('scrollToResultsTab');
        // Activer l'onglet et faire défiler vers l'élément
        const tab = new bootstrap.Tab(document.querySelector('#results-tab'));
        tab.show();
        document.getElementById('results-tab-pane').scrollIntoView({ behavior: 'smooth' });
    }
});



// fonction pour modifier les résultats des concours
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.save-award').forEach(button => {
        button.addEventListener('click', function () {
            const awardId = button.getAttribute('data-award-id');
            const awardName = document.getElementById(`awardName-${awardId}`).value;
            const awardDescription = document.getElementById(`awardDescription-${awardId}`).value;

            const data = {
                award_id: awardId,
                award_name: awardName,
                award_description: awardDescription
            };
            console.log(data);

            // Envoi des données modifiées au serveur
            fetch(`/admin/animalProfile/updateAward/${awardId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Afficher le message d'alerte
                    const alertSuccess = document.getElementById(`alert-success-${awardId}`);
                    alertSuccess.textContent = "Modifications enregistrées avec succès";
                    alertSuccess.style.display = "block";
                    alertSuccess.style.opacity = "1"; // Pour les transitions en douceur

                    // Masquer le message d'alerte après 2 secondes avec un effet de fondu
                    setTimeout(() => {
                        alertSuccess.style.transition = "opacity 1s";
                        alertSuccess.style.opacity = "0";
                        setTimeout(() => {
                            alertSuccess.style.display = "none";
                        }, 1000); // Attendre que l'effet de transition se termine
                    }, 2000);
                } else {
                    alert('Erreur lors de la mise à jour du résultat: ' + data.message);
                }
            })
            .catch(error => console.error('Erreur:', error));
        });
    });
});



// fonction pour modifier la photo de couverture
document.addEventListener('DOMContentLoaded', function() {
    const coverModal = document.getElementById('coverModal');
    const coverImageForm = document.getElementById('coverImageForm');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = imagePreview.querySelector('img');
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    
    function showAlert(type, message) {
        if (type === 'success') {
            errorAlert.classList.add('d-none');
            successAlert.classList.remove('d-none');
            
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(coverModal);
                modal.hide();
                location.reload();
            }, 4000);
            
            setTimeout(() => {
                successAlert.classList.add('d-none');
            }, 3000);
        } else {
            successAlert.classList.add('d-none');
            errorAlert.classList.remove('d-none');
            errorMessage.textContent = message;
            setTimeout(() => {
                errorAlert.classList.add('d-none');
            }, 3000);
        }
    }
    async function loadCoverInfo(animalId) {
        try {
            const response = await fetch(`/admin/animalProfile/get-cover-info/${animalId}`);
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des informations');
            }
            
            const data = await response.json();
            if (data.success && data.coverInfo) {
                document.getElementById('baliseTitle').value = data.coverInfo.balise_title || '';
                document.getElementById('baliseAlt').value = data.coverInfo.balise_alt || '';
                
                if (data.coverInfo.image_path) {
                    previewImg.src = `/uploads/${data.coverInfo.image_path}`;
                    imagePreview.classList.remove('d-none');
                }
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('error', 'Erreur lors du chargement des informations');
        }
    }
    coverModal.addEventListener('show.bs.modal', function(event) {
        successAlert.classList.add('d-none');
        errorAlert.classList.add('d-none');
        
        const button = event.relatedTarget;
        const animalId = button.getAttribute('data-animal-id');
        const animalName = button.getAttribute('data-animal-name');
        
        document.getElementById('animalId').value = animalId;
        document.getElementById('animalName').value = animalName;
        
        coverImageForm.reset();
        imagePreview.classList.add('d-none');
        
        loadCoverInfo(animalId);
    });
    coverModal.addEventListener('hidden.bs.modal', function() {
        successAlert.classList.add('d-none');
        errorAlert.classList.add('d-none');
    });
    
    document.getElementById('coverImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                imagePreview.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('saveCoverImage').addEventListener('click', async function() {
        try {
            const animalId = document.getElementById('animalId').value;
            if (!animalId) {
                throw new Error('ID de l\'animal non trouvé');
            }
            
            const formData = new FormData(coverImageForm);
            
            if (!document.getElementById('coverImage').files[0]) {
                formData.delete('coverImage');
            }
            
            const response = await fetch(`/admin/animalProfile/cover-image/${animalId}`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Erreur lors de l\'upload');
            }
            
            if (result.success) {
                showAlert('success');
            } else {
                throw new Error(result.message || 'Erreur lors de l\'enregistrement');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('error', error.message);
        }
    });
});