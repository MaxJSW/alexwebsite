// Fonction pour normaliser les noms
const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
               .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
               .replace(/[^a-z0-9 ]/g, '') 
               .replace(/\s+/g, '-') 
               .replace(/--+/g, '-');
};

// Fonction pour formater les dates
const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0]; 
};

// Fonction pour ajuster les dates reçues du serveur
const adjustDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};


///////////////////////////////////////////////CREATION//////////////////////////////////////////////////////////////////////////////


// fonction (création de mariage) qui affiche et récupére le nom du père et de la mère dans le bouton modifier le création du slug fonctionne test pour enlever les accents et les espaces (ok)
document.addEventListener('DOMContentLoaded', function() {
    const maleInput = document.getElementById('male_id');
    const femaleInput = document.getElementById('female_id');
    const submitButton = document.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('error-message');
    const form = document.getElementById('marriage-form');

    function checkInputs() {
        const maleId = maleInput.getAttribute('data-id');
        const femaleId = femaleInput.getAttribute('data-id');

        if (maleId && femaleId) {
            submitButton.style.display = 'block';
            errorMessage.style.display = 'none';
        } else {
            submitButton.style.display = 'none';
            errorMessage.style.display = 'block';
        }
    }

    // Fonction pour formater les dates
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    };

    // Fonction pour définir les valeurs des éléments
        const setValue = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.value = value || '';
                
                // Ajouter le cas pour edit_marriages_slug
                if (elementId === 'edit_marriages_slug') {
                    const slug = `(${createSlug(maleName)}-x-${createSlug(femaleName)})`;
                    element.value = slug;
                }
            } else {
                console.error(`Element with ID ${elementId} not found.`);
            }
        };

        // Fonction pour créer un slug à partir du nom
        const removeAccents = (str) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const createSlug = (str) => {
            return removeAccents(str).toLowerCase().replace(/\s+/g, '-');
        };

    // Recherche pour les mâles
    document.getElementById('search-male').addEventListener('input', function() {
        const searchValue = this.value.toLowerCase();
        const maleItems = document.querySelectorAll('#male-list .animal-item');
        maleItems.forEach(item => {
            const name = item.getAttribute('data-name');
            item.style.display = searchValue === '' ? 'none' : (name.includes(searchValue) ? 'block' : 'none');
        });
    });

    // Recherche pour les femelles
    document.getElementById('search-female').addEventListener('input', function() {
        const searchValue = this.value.toLowerCase();
        const femaleItems = document.querySelectorAll('#female-list .animal-item');
        femaleItems.forEach(item => {
            const name = item.getAttribute('data-name');
            item.style.display = searchValue === '' ? 'none' : (name.includes(searchValue) ? 'block' : 'none');
        });
    });

    // Sélectionner un mâle
    document.querySelectorAll('#male-list .animal-item').forEach(item => {
        item.addEventListener('click', function() {
            const maleName = this.getAttribute('data-name');
            const maleId = this.getAttribute('data-id');
            maleInput.value = maleName;
            maleInput.setAttribute('data-id', maleId);
            document.getElementById('edit_male_name').value = maleName;
            document.getElementById('edit_male_id').value = maleId;

            // Ajouter une bordure bleue au bloc sélectionné
            document.querySelectorAll('#male-list .animal-item').forEach(el => el.classList.remove('male-border'));
            this.classList.add('male-border');
            checkInputs();
        });
    });

    // Sélectionner une femelle
    document.querySelectorAll('#female-list .animal-item').forEach(item => {
        item.addEventListener('click', function() {
            const femaleName = this.getAttribute('data-name');
            const femaleId = this.getAttribute('data-id');
            femaleInput.value = femaleName;
            femaleInput.setAttribute('data-id', femaleId);
            document.getElementById('edit_female_name').value = femaleName;
            document.getElementById('edit_female_id').value = femaleId;

            // Ajouter une bordure rose au bloc sélectionné
            document.querySelectorAll('#female-list .animal-item').forEach(el => el.classList.remove('female-border'));
            this.classList.add('female-border');
            checkInputs();
        });
    });





    // Soumission du formulaire
    document.getElementById('marriage-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const maleId = maleInput.getAttribute('data-id');
    const femaleId = femaleInput.getAttribute('data-id');

    if (maleId && femaleId) {
        const actualBirthDate = document.getElementById('actual_birth_date').value;
        const formattedActualBirthDate = actualBirthDate ? formatDate(new Date(actualBirthDate)) : null;

        const expectedBirthDate = document.getElementById('expected_birth_date').value;
        const formattedExpectedBirthDate = expectedBirthDate ? formatDate(new Date(expectedBirthDate)) : null;

        const maleName = maleInput.value;
        const femaleName = femaleInput.value;

        // Fonction pour créer un slug à partir du nom
        const removeAccents = (str) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const createSlug = (str) => {
            return removeAccents(str).toLowerCase().replace(/\s+/g, '-');
        };

        const maleNameSlug = createSlug(maleName);
        const femaleNameSlug = createSlug(femaleName);
        const marriageSlug = `${maleNameSlug}-x-${femaleNameSlug}`;

        const formData = {
            male_id: maleId,
            female_id: femaleId,
            expected_puppies: document.getElementById('expected_puppies').value,
            expected_birth_date: formattedExpectedBirthDate,
            actual_birth_date: formattedActualBirthDate,
            actual_male_puppies: document.getElementById('actual_male_puppies').value,
            actual_female_puppies: document.getElementById('actual_female_puppies').value,
            get_banner: document.getElementById('get_banner').value, 
            marriages_slug: marriageSlug, 
            user_id: document.getElementById('user_id').value // ajout de l'id utilisateur
        };

        fetch('/admin/addMarriages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        }).then(response => response.json())
          .then(data => {
              if (data.success) {
                  // Afficher la modale de succès
                  var successModal = new bootstrap.Modal(document.getElementById('successLitterModal'));
                  successModal.show();

                  // Masquer la modale après 3 secondes
                  setTimeout(function() {
                      successModal.hide();
                      updateMarriagesTable();
                      resetFields();
                  }, 3000);
              } else {
                  alert('Erreur lors de l\'enregistrement du mariage');
              }
          })
          .catch(error => {
              console.error('Erreur:', error);
              alert('Erreur lors de l\'enregistrement du mariage');
          });
    } else {
        errorMessage.style.display = 'block';
    }
});


    

    // Fonction pour mettre à jour la table des mariages
    async function updateMarriagesTable() {
        const response = await fetch('/admin/addMarriages/getMarriages');
        const data = await response.json();

        const marriagesTableBody = document.querySelector('#marriages-table tbody');
        marriagesTableBody.innerHTML = ''; // Clear the table body
        data.marriages.forEach((marriage, index) => {
            marriagesTableBody.innerHTML += `
                <tr id="marriage-row-${marriage.id}">
                  <td>${index + 1}</td>
                  <td>${marriage.father_name}</td>
                  <td>${marriage.mother_name}</td>
                  <td>${marriage.actual_male_puppies}</td>
                  <td>${marriage.actual_female_puppies}</td>
                  <td>${marriage.marriages_status}</td>
                  <td class="text-center">
                    ${marriage.is_online ? '<i class="bi bi-check-circle text-success"></i>' : '<i class="bi bi-ban-fill text-danger"></i>'}
                  </td>
                  <td><button class="btn btn-primary w-100 edit-marriage" id="edit-marriage-${marriage.id}" data-id="${marriage.id}" data-male-id="${marriage.male_id}" data-male-name="${marriage.father_name}" data-female-id="${marriage.female_id}" data-female-name="${marriage.mother_name}">Modifier</button></td>
                </tr>
            `;
        });

        // Ré-attacher les événements click pour les nouveaux boutons "Modifier"
        document.querySelectorAll('.edit-marriage').forEach(button => {
            button.addEventListener('click', async function() {
                const marriageId = this.getAttribute('data-id');
                const maleId = this.getAttribute('data-male-id');  // Récupérer l'ID du père
                const maleName = this.getAttribute('data-male-name'); // Récupérer le nom du père
                const femaleId = this.getAttribute('data-female-id'); // Récupérer l'ID de la mère
                const femaleName = this.getAttribute('data-female-name'); // Récupérer le nom de la mère
                const setValue = (elementId, value) => {
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.value = value || '';
                
                        // Ajouter le cas pour edit_marriages_slug
                        if (elementId === 'edit_marriages_slug') {
                            const slug = createSlug(`${maleName}-x-${femaleName}`);
                            element.value = slug;
                        }
                    } else {
                        console.error(`Element with ID ${elementId} not found.`);
                    }
                };

                

                const marriage = data.marriages.find(m => m.id == marriageId);
                if (marriage) {
                    setValue('edit_marriage_id', marriageId); // Attacher l'ID du mariage
                    setValue('edit_male_name', maleName); // Définir le nom du mâle
                    setValue('edit_male_id', maleId); // Définir l'ID du mâle (champ caché)
                    setValue('edit_female_name', femaleName); // Définir le nom de la femelle
                    setValue('edit_female_id', femaleId); // Définir l'ID de la femelle (champ caché)
                    setValue('edit_expected_puppies', marriage.expected_puppies);
                    setValue('edit_expected_birth_date', formatDate(marriage.expected_birth_date));
                    setValue('edit_actual_birth_date', formatDate(marriage.actual_birth_date));
                    setValue('edit_actual_male_puppies', marriage.actual_male_puppies);
                    setValue('edit_actual_female_puppies', marriage.actual_female_puppies);
                    setValue('edit_marriages_status', marriage.marriages_status);
                    setValue('edit_is_online', marriage.is_online ? '1' : '0');
                    setValue('edit_get_banner', marriage.get_banner); // Attacher la valeur de get_banner
                    setValue('edit_get_banner_label', marriage.get_banner_label); // Ajouter la valeur de get_banner à l'étiquette (label)
                    setValue('edit_marriages_description', marriage.marriages_description);
                    setValue('edit_marriages_slug', marriage.marriages_slug);

                    // Mettre à jour l'état du bouton switch et afficher/masquer le bloc de téléchargement
                    const getBannerSwitch = document.getElementById('edit_get_banner');
                    const bannerUploadSection = document.getElementById('bannerUploadSection');
                    const bannerLabel = document.getElementById('edit_get_banner_label');

                    if (getBannerSwitch && bannerUploadSection) {
                        getBannerSwitch.checked = marriage.get_banner === '1';
                        bannerLabel.style.display = getBannerSwitch.checked ? 'inline' : 'none';
                        bannerUploadSection.style.display = getBannerSwitch.checked ? 'block' : 'none';
                    }

                    // Mettre à jour les images des bannières
                    const bannerImages = await fetchBannerImages(marriageId);
                    const photoContainer = document.getElementById('bannerPhotoContainer');
                    photoContainer.innerHTML = ''; // Clear existing images
                    bannerImages.forEach(image => {
                        const imgSrc = `/uploads/${image.image_path}`;
                        photoContainer.innerHTML += `
                            <div class="col d-flex justify-content-center">
                                <div class="card shadow-sm position-relative">
                                    <img src="${imgSrc}" data-id="${image.marriage_id}" class="small-banner bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                                </div>
                            </div>
                        `;
                    });

                    // Afficher la modale
                    var editMarriageModal = new bootstrap.Modal(document.getElementById('editMarriageModal'));
                    editMarriageModal.show();
                } else {
                    console.error('Mariage non trouvé pour l\'ID:', marriageId);
                }
            });
        });

        // Récupérer l'ID du dernier mariage ajouté
        const lastMarriageId = data.marriages.length > 0 ? data.marriages[data.marriages.length - 1].id : null;

        if (lastMarriageId) {
            const newRowButton = document.getElementById(`edit-marriage-${lastMarriageId}`);
            if (newRowButton) {
                newRowButton.classList.add('blink-green-button');
                setTimeout(() => {
                    newRowButton.classList.remove('blink-green-button');
                }, 10000); // Stop blinking after 10 seconds
            }
        }
    }

    // Fonction pour réinitialiser les champs de recherche et le formulaire
    function resetFields() {
        // Réinitialiser les champs de recherche
        document.getElementById('search-male').value = '';
        document.getElementById('search-female').value = '';

        // Masquer tous les items de la liste de recherche
        document.querySelectorAll('#male-list .animal-item, #female-list .animal-item').forEach(item => {
            item.style.display = 'none';
        });

        // Réinitialiser les champs du formulaire
        form.reset();

        // Supprimer les attributs data-id des champs mâle et femelle
        maleInput.removeAttribute('data-id');
        femaleInput.removeAttribute('data-id');

        // Supprimer les classes ajoutées
        maleInput.classList.remove('male-selected');
        femaleInput.classList.remove('female-selected');
        document.querySelectorAll('.animal-item').forEach(item => {
            item.classList.remove('male-border', 'female-border');
        });

        // Réinitialiser le conteneur d'images de bannière
        document.getElementById('bannerPhotoContainer').innerHTML = '';
        document.getElementById('bannerPhotoInput').value = '';

        // Masquer le bouton de soumission et afficher le message d'erreur
        submitButton.style.display = 'none';
        errorMessage.style.display = 'block';
    }

    // Fonction pour récupérer les images des bannières
    async function fetchBannerImages(marriageId) {
        try {
            const response = await fetch(`/admin/addMarriages/getBannerMarriages/${marriageId}`);
            const data = await response.json();
            return data.images;
        } catch (error) {
            console.error('Erreur lors de la récupération des bannières:', error);
            return [];
        }
    }

    // Initial check
    checkInputs();
// Ajuster les dates récupérées

    // Appeler updateMarriagesTable lorsque la page est chargée
    // updateMarriagesTable();
});


//  fonction à part pour récupérer les images de bannière et leur id spécifique
async function fetchBannerImages(marriageId) {
    try {
        const response = await fetch(`/admin/addMarriages/getBannerMarriages/${marriageId}`);
        const data = await response.json();
        if (data.success) {
            return data.images;
        } else {
            console.error('Erreur lors de la récupération des bannières:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des bannières:', error);
        return [];
    }
}


///////////////////////////////////////////////MODIFICATION//////////////////////////////////////////////////////////////////////////////



// nouvelle fonction (modification) (affiche le nom des parents dans l'input) avec la récupération de l'id des parents pour la création des chiots
document.addEventListener('DOMContentLoaded', function() {
    const marriagesData = JSON.parse(document.getElementById('marriages-data').textContent);
    const marriagesImagesData = JSON.parse(document.getElementById('marriages-images-data').textContent);

    window.marriages = marriagesData;
    window.marriagesImages = marriagesImagesData;

    // Fonction pour formater les dates
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    };

    // Fonction pour définir les valeurs des éléments
    const setValue = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value || '';
        } else {
            console.error(`Element with ID ${elementId} not found.`);
        }
    };

    // Fonction pour vérifier et mettre à jour l'état de la bannière
    const checkAndUpdateBannerState = async (marriageId) => {
        const getBannerElement = document.getElementById('edit_get_banner');
        const bannerUploadSection = document.getElementById('bannerUploadSection');
        const bannerLabel = document.getElementById('edit_get_banner_label');
        const photoContainer = document.getElementById('bannerPhotoContainer');

        const response = await fetch(`/admin/addMarriages/checkBanner/${marriageId}`);
        const data = await response.json();
        const bannerImages = data.images;
        const bannerExists = data.hasBanner;

        getBannerElement.checked = bannerExists;
        bannerLabel.style.display = bannerExists ? 'inline' : 'none';
        bannerUploadSection.style.display = bannerExists ? 'block' : 'none';

        photoContainer.innerHTML = ''; // Clear existing images
        if (bannerExists) {
            bannerImages.forEach(image => {
                const imgSrc = `/uploads/${image.image_path}`;
                photoContainer.innerHTML += `
                    <div class="col d-flex justify-content-center">
                        <div class="card shadow-sm position-relative">
                            <img src="${imgSrc}" data-id="${image.marriage_id}" class="small-banner bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                        </div>
                    </div>
                `;
            });
        }
    };

    // Fonction pour ouvrir la modale et remplir le formulaire
const openEditMarriageModal = async (marriageId) => {
    const response = await fetch(`/admin/addMarriages/getEditMarriages/${marriageId}`);
    const data = await response.json();
    const marriage = data.marriage;

    if (!marriage) {
        console.error('Mariage non trouvé pour l\'ID:', marriageId);
        return;
    }

    // Remplir le formulaire avec les données du mariage
    setValue('edit_marriage_id', marriageId);
    setValue('edit_male_name', marriage.father_name); // Définir le nom du mâle
    setValue('edit_male_id', marriage.male_id); // Définir l'ID du mâle (champ caché)
    setValue('edit_female_name', marriage.mother_name); // Définir le nom de la femelle
    setValue('edit_female_id', marriage.female_id); // Définir l'ID de la femelle (champ caché)
    setValue('edit_expected_puppies', marriage.expected_puppies);
    setValue('edit_expected_birth_date', formatDate(marriage.expected_birth_date));
    setValue('edit_actual_birth_date', formatDate(marriage.actual_birth_date));
    setValue('edit_actual_male_puppies', marriage.actual_male_puppies);
    setValue('edit_actual_female_puppies', marriage.actual_female_puppies);
    setValue('edit_is_online', marriage.is_online ? '1' : '0');
    setValue('edit_marriages_description', marriage.marriages_description);
    setValue('edit_marriages_slug', marriage.marriages_slug);

    // Calculer le slug du mariage
    const maleNameSlug = normalizeName(marriage.father_name);
    const femaleNameSlug = normalizeName(marriage.mother_name);
    const marriageSlug = `${maleNameSlug}-x-${femaleNameSlug}`;

    // Mettre à jour la valeur de l'input pour le slug du mariage
    setValue('edit_marriages_slug', marriageSlug);
    // Appel de la nouvelle fonction pour vérifier et mettre à jour l'état de la bannière
    await checkAndUpdateBannerState(marriageId);

    // Afficher la modale
    var editMarriageModal = new bootstrap.Modal(document.getElementById('editMarriageModal'));
    editMarriageModal.show();
};

    // Fonction pour gérer la fermeture de la modale
    function closeModal() {
        var editMarriageModal = bootstrap.Modal.getInstance(document.getElementById('editMarriageModal'));
        if (editMarriageModal) {
            editMarriageModal.hide();
        }
        document.body.classList.remove('modal-open');
        const modalBackdrop = document.querySelector('.modal-backdrop');
        if (modalBackdrop) {
            modalBackdrop.remove();
        }
    }

    // Ajoutez un écouteur d'événements pour le bouton de fermeture de la modale
    document.getElementById('editMarriageModal').addEventListener('hidden.bs.modal', function() {
        closeModal();
    });

    // Fonction pour mettre à jour le tableau des mariages
    function updateMarriagesTable() {
        fetch('/admin/addMarriages/getMarriages')
            .then(response => response.json())
            .then(data => {
                const marriagesTableBody = document.getElementById('marriages-table-body');
                marriagesTableBody.innerHTML = ''; // Clear the table body
                data.marriages.forEach((marriage, index) => {
                    marriagesTableBody.innerHTML += `
                        <tr>
                          <td>${index + 1}</td>
                          <td>${marriage.father_name}</td>
                          <td>${marriage.mother_name}</td>
                          <td>${marriage.actual_male_puppies}</td>
                          <td>${marriage.actual_female_puppies}</td>
                          <td>${marriage.marriages_status}</td>
                          <td class="text-center">
                            ${marriage.is_online ? '<i class="bi bi-check-circle text-success"></i>' : '<i class="bi bi-ban-fill text-danger"></i>'}
                          </td>
                          <td><button class="btn btn-primary w-100 edit-marriage" id="edit-marriage-${marriage.id}" data-id="${marriage.id}" data-male-id="${marriage.male_id}" data-male-name="${marriage.father_name}" data-female-id="${marriage.female_id}" data-female-name="${marriage.mother_name}">Modifier</button></td>
                        </tr>
                    `;
                });

                // Ré-attacher les événements click pour les nouveaux boutons "Modifier"
                document.querySelectorAll('.edit-marriage').forEach(button => {
                    button.addEventListener('click', async function() {
                        const marriageId = this.getAttribute('data-id');
                        const maleId = this.getAttribute('data-male-id');  // Récupérer l'ID du père
                        const maleName = this.getAttribute('data-male-name'); // Récupérer le nom du père
                        const femaleId = this.getAttribute('data-female-id'); // Récupérer l'ID de la mère
                        const femaleName = this.getAttribute('data-female-name'); // Récupérer le nom de la mère

                        const marriage = data.marriages.find(m => m.id == marriageId);
                        if (marriage) {
                            setValue('edit_marriage_id', marriageId); // Attacher l'ID du mariage
                            setValue('edit_male_name', maleName); // Définir le nom du mâle
                            setValue('edit_male_id', maleId); // Définir l'ID du mâle (champ caché)
                            setValue('edit_female_name', femaleName); // Définir le nom de la femelle
                            setValue('edit_female_id', femaleId); // Définir l'ID de la femelle (champ caché)
                            setValue('edit_expected_puppies', marriage.expected_puppies);
                            setValue('edit_expected_birth_date', formatDate(marriage.expected_birth_date));
                            setValue('edit_actual_birth_date', formatDate(marriage.actual_birth_date));
                            setValue('edit_actual_male_puppies', marriage.actual_male_puppies);
                            setValue('edit_actual_female_puppies', marriage.actual_female_puppies);
                            setValue('edit_marriages_status', marriage.marriages_status);
                            setValue('edit_is_online', marriage.is_online ? '1' : '0');
                            setValue('edit_get_banner', marriage.get_banner); // Attacher la valeur de get_banner
                            setValue('edit_get_banner_label', marriage.get_banner_label); // Ajouter la valeur de get_banner à l'étiquette (label)
                            setValue('edit_marriages_description', marriage.marriages_description);
                            setValue('edit_marriages_slug', marriage.marriages_slug);
                            

                            // Mettre à jour l'état du bouton switch et afficher/masquer le bloc de téléchargement
                            const getBannerSwitch = document.getElementById('edit_get_banner');
                            const bannerUploadSection = document.getElementById('bannerUploadSection');
                            const bannerLabel = document.getElementById('edit_get_banner_label');

                            if (getBannerSwitch && bannerUploadSection) {
                                getBannerSwitch.checked = marriage.get_banner === '1';
                                bannerLabel.style.display = getBannerSwitch.checked ? 'inline' : 'none';
                                bannerUploadSection.style.display = getBannerSwitch.checked ? 'block' : 'none';
                            }

                            // Mettre à jour les images des bannières
                            const bannerImages = await fetchBannerImages(marriageId);
                            const photoContainer = document.getElementById('bannerPhotoContainer');
                            photoContainer.innerHTML = ''; // Clear existing images
                            bannerImages.forEach(image => {
                                const imgSrc = `/uploads/${image.image_path}`;
                                photoContainer.innerHTML += `
                                    <div class="col d-flex justify-content-center">
                                        <div class="card shadow-sm position-relative">
                                            <img src="${imgSrc}" data-id="${image.marriage_id}" class="small-banner bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                                        </div>
                                    </div>
                                `;
                            });

                            // Afficher la modale
                            var editMarriageModal = new bootstrap.Modal(document.getElementById('editMarriageModal'));
                            editMarriageModal.show();
                        } else {
                            console.error('Mariage non trouvé pour l\'ID:', marriageId);
                        }
                    });
                });

                // Récupérer l'ID du dernier mariage ajouté
                const lastMarriageId = data.marriages.length > 0 ? data.marriages[data.marriages.length - 1].id : null;

                if (lastMarriageId) {
                    const newRowButton = document.getElementById(`edit-marriage-${lastMarriageId}`);
                    if (newRowButton) {
                        newRowButton.classList.add('blink-green-button');
                        setTimeout(() => {
                            newRowButton.classList.remove('blink-green-button');
                        }, 10000); // Stop blinking after 10 seconds
                    }
                }
            })
            .catch(error => {
                console.error('Erreur lors de la mise à jour de la table des mariages:', error);
            });
    }

    // Appeler updateMarriagesTable au chargement de la page
    updateMarriagesTable();

    // Soumission du formulaire de modification
    document.getElementById('editMarriageForm').addEventListener('submit', function(event) {
        event.preventDefault();

        // Récupérer les valeurs du formulaire - ajouté
        let actual_male_puppies = document.getElementById('edit_actual_male_puppies').value;
        let actual_female_puppies = document.getElementById('edit_actual_female_puppies').value;
    
        // Remplacer les valeurs vides par 0  - ajouté
        actual_male_puppies = actual_male_puppies === '' ? 0 : actual_male_puppies;
        actual_female_puppies = actual_female_puppies === '' ? 0 : actual_female_puppies;
        
        const editFormData = {
        expected_puppies: document.getElementById('edit_expected_puppies').value,
        expected_birth_date: document.getElementById('edit_expected_birth_date').value || null,
        actual_birth_date: document.getElementById('edit_actual_birth_date').value || null,
        //ajouté
        actual_male_puppies: actual_male_puppies,
        actual_female_puppies: actual_female_puppies,
        
        marriages_status: document.getElementById('edit_marriages_status').value,
        is_online: document.getElementById('edit_is_online').value,
        marriages_description: document.getElementById('edit_marriages_description').value,
        get_banner: document.getElementById('edit_get_banner').checked ? 1 : 0,
        male_id: document.getElementById('edit_male_id').value,
        female_id: document.getElementById('edit_female_id').value,
        marriages_slug: document.getElementById('edit_marriages_slug').value
    };

    const marriageId = document.getElementById('edit_marriage_id').value;

        fetch(`/admin/addMarriages/editMarriage/${marriageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(editFormData)
        }).then(response => response.json())
          .then(data => {
              if (data.success) {
                  const successMessage = document.getElementById('successEditMarriageMessage');
                  if (successMessage) {
                      successMessage.style.display = 'block';
                  }

                  setTimeout(() => {
                      successMessage.classList.add('fade');
                      setTimeout(() => {
                          successMessage.classList.remove('fade');
                          closeModal();
                          if (successMessage) {
                              successMessage.style.display = 'none';
                          }
                          updateMarriagesTable(); // Mettre à jour le tableau au lieu de recharger la page
                      }, 500);
                  }, 2000);
              } else {
                  alert('Erreur lors de la modification du mariage');
              }
          })
          .catch(error => {
              console.error('Erreur lors de la modification du mariage:', error);
              alert('Erreur lors de la modification du mariage');
          });
    });

    // Initialiser les boutons de modification
    document.querySelectorAll('button[id^="edit-marriage-"]').forEach(button => {
        button.addEventListener('click', function() {
            const marriageId = this.id.replace('edit-marriage-', '');
            openEditMarriageModal(marriageId);
        });
    });

    // Fonction pour mettre à jour si une bannière est disponible ou non
    const getBannerSwitch = document.getElementById('edit_get_banner');
    const bannerUploadSection = document.getElementById('bannerUploadSection');
    const bannerLabel = document.getElementById('edit_get_banner_label');

    if (getBannerSwitch && bannerUploadSection) {
        getBannerSwitch.addEventListener('change', function() {
            const isChecked = getBannerSwitch.checked;
            bannerUploadSection.style.display = isChecked ? 'block' : 'none';
            bannerLabel.style.display = isChecked ? 'inline' : 'none';

            const marriageId = document.getElementById('edit_marriage_id').value; // Récupérez l'ID du mariage que vous modifiez ici
            const bannerFormData = { get_banner: isChecked ? 1 : 0 };

            fetch(`/admin/addMarriages/updateMarriage/${marriageId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bannerFormData)
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error('Erreur lors de la mise à jour de la bannière');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
        });
    }

    // Fonction pour gérer le téléchargement de la bannière
    document.getElementById('uploadBtnBanner').addEventListener('click', function() {
        document.getElementById('uploadBannerForm').style.display = 'block';
    });

    document.getElementById('bannerPhotoInput').addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('bannerPhoto', file);

        const marriageId = document.getElementById('edit_marriage_id').value;

        fetch(`/admin/addMarriages/uploadBanner/${marriageId}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const photoContainer = document.getElementById('bannerPhotoContainer');
                // Clear existing images
                photoContainer.innerHTML = '';
                // Add new image
                const imgSrc = `/uploads/${data.imagePath}`;
                photoContainer.innerHTML += `
                    <div class="col d-flex justify-content-center">
                        <div class="card shadow-sm position-relative">
                            <img src="${imgSrc}" data-id="${marriageId}" class="small-banner bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                        </div>
                    </div>
                `;
            } else {
                console.error('Erreur lors du téléchargement de la bannière');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
        });
    });
});









