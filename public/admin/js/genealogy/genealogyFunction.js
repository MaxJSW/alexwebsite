//deuxième fonction qui envoie la photo du père avec son id
document.addEventListener('DOMContentLoaded', function() {
    

    // Elements for the father's photo upload
    const uploadBtnFather = document.getElementById('uploadBtnFather');
    const photoInputFather = document.getElementById('photoInputFather');
    const photoContainerFather = document.getElementById('photoContainerFather');
    const uploadFormFather = document.getElementById('uploadFatherForm');

    const fatherId = uploadBtnFather.getAttribute('data-father-id');

    uploadBtnFather.addEventListener('click', function() {
        photoInputFather.click();
    });

    photoInputFather.addEventListener('change', function() {
        const file = photoInputFather.files[0];
        
        if (file) {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('father_id', fatherId);

            fetch('/admin/animalProfile/uploadPhotoFather', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Clear the existing photos in the container
                    photoContainerFather.innerHTML = '';

                    const newPhoto = document.createElement('div');
                    newPhoto.classList.add('col');
                    newPhoto.id = `photo-${data.photo.id}`;
                    newPhoto.innerHTML = `
                        <div class="genealogy-block border d-flex flex-column align-items-center justify-content-center p-4 text-center">
                            <img src="/uploads/${data.photo.image_path}" class="bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                            
                        </div>
                    `;
                    photoContainerFather.appendChild(newPhoto);

                } else {
                    alert('Erreur lors du téléchargement de la photo du père');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors du téléchargement de la photo du père');
            });
        }
    });
});


// fonction pour ajouter le nom du père et de la mère dans la modale du père de l'animal
document.addEventListener('DOMContentLoaded', function() {
    

    // Fonction pour ajouter un nouveau grand-père paternel
    window.addNewPaternalFather = function() {
        const fatherId = document.getElementById('paternal_father_id').value;
        const grandfatherName = document.getElementById('new_Paternal_father').value;
        const inputField = document.getElementById('new_Paternal_father');
        const selectField = document.getElementById('paternal_father_id');

        if (grandfatherName) {
            fetch('/admin/animalProfile/addPaternalGrandfather', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ father_id: fatherId, grandfather_name: grandfatherName })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Ajouter le nouvel élément à la liste déroulante
                    const newOption = new Option(data.grandfather.grandfather_name, data.grandfather.id);
                    selectField.add(newOption);
                    newOption.selected = true;  // Sélectionner la nouvelle option

                    // Changer la couleur des bordures en vert
                    inputField.style.borderColor = 'lightgreen';
                    selectField.style.borderColor = 'lightgreen';
                    setTimeout(() => {
                        inputField.style.borderColor = '';
                        selectField.style.borderColor = '';
                    }, 3000);
                } else {
                    // Changer la couleur de l'input en rouge
                    inputField.style.borderColor = 'lightcoral';
                    setTimeout(() => {
                        inputField.style.borderColor = '';
                    }, 3000);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                inputField.style.borderColor = 'lightcoral';
                setTimeout(() => {
                    inputField.style.borderColor = '';
                }, 3000);
            });
        }
    };
});

    // Fonction pour ajouter le nom de la grand-mère paternelle dans la modal du père de l'animal
document.addEventListener('DOMContentLoaded', function() {
        
    
        // Fonction pour ajouter une nouvelle grand-mère paternelle
        window.addNewPaternalMother = function() {
            const fatherId = document.getElementById('paternal_father_id').value;
            const grandmotherName = document.getElementById('new_Paternal_mother').value;
            const inputField = document.getElementById('new_Paternal_mother');
            const selectField = document.getElementById('paternal_mother_id');
    
            if (grandmotherName) {
                fetch('/admin/animalProfile/addPaternalGrandmother', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ father_id: fatherId, grandmother_name: grandmotherName })
                })
                .then(response => response.json())
                .then(data => {

                    if (data.success) {
                        // Ajouter le nouvel élément à la liste déroulante
                        const newOption = new Option(data.grandmother.grandmother_name, data.grandmother.id);
                        selectField.add(newOption);
                        newOption.selected = true;  // Sélectionner la nouvelle option
    
                        // Changer la couleur des bordures en vert
                        inputField.style.borderColor = 'lightgreen';
                        selectField.style.borderColor = 'lightgreen';
                        setTimeout(() => {
                            inputField.style.borderColor = '';
                            selectField.style.borderColor = '';
                        }, 3000);
                    } else {
                        // Changer la couleur de l'input en rouge
                        inputField.style.borderColor = 'lightcoral';
                        setTimeout(() => {
                            inputField.style.borderColor = '';
                        }, 3000);
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    inputField.style.borderColor = 'lightcoral';
                    setTimeout(() => {
                        inputField.style.borderColor = '';
                    }, 3000);
                });
            }
        };
});
    

// fonction pour mettre à jour les infos générales du père de l'animal (dans la modal du père)
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter un événement pour charger les informations du père lorsque la modale est ouverte
    $('#fatherUpdateModal').on('show.bs.modal', function (event) {
        const animalSlug = window.location.pathname.split('/').pop();

        fetch(`/admin/animalProfile/${animalSlug}/fatherInfo`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.father) {
                    // Mettre à jour les champs de la modale avec les informations du père
                    document.getElementById('fatherName').value = data.father.father_name;
                    document.getElementById('fatherBreed').value = data.father.father_breed_id;
                    document.getElementById('fatherColor').value = data.father.father_color;
                    document.getElementById('fatherGender').value = data.father.father_gender;
                    document.getElementById('fatherRegister').value = data.father.father_register_id;
                    document.getElementById('fatherCountry').value = data.father.father_country_id;
                    document.getElementById('fatherBreedType').value = data.father.father_breed_type;
                    document.getElementById('fatherCoatType').value = data.father.father_coat_type;
                    document.getElementById('fatherEyeColor').value = data.father.father_eye_color;
                    document.getElementById('fatherIsOnline').value = data.father.father_is_online;
                    document.getElementById('paternal_father_id').value = data.father.paternal_grandfather_id;
                    document.getElementById('paternal_mother_id').value = data.father.paternal_grandmother_id;
                    // Sélectionner la bonne option dans le select pour la race du père
                    const fatherBreedSelect = document.getElementById('fatherBreed');
                    fatherBreedSelect.value = data.father.breed_id;

                    const breedOptions = fatherBreedSelect.options;
                    for (let i = 0; i < breedOptions.length; i++) {
                        if (breedOptions[i].value == data.father.breed_id) {
                            breedOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le registre du père
                    const fatherRegisterSelect = document.getElementById('fatherRegister');
                    fatherRegisterSelect.value = data.father.register_id;

                    const registerOptions = fatherRegisterSelect.options;
                    for (let i = 0; i < registerOptions.length; i++) {
                        if (registerOptions[i].value == data.father.register_id) {
                            registerOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le pays de naissance du père
                    const fatherCountrySelect = document.getElementById('fatherCountry');
                    fatherCountrySelect.value = data.father.country_id;

                    const countryOptions = fatherCountrySelect.options;
                    for (let i = 0; i < countryOptions.length; i++) {
                        if (countryOptions[i].value == data.father.country_id) {
                            countryOptions[i].selected = true;
                            break;
                        }
                    }
                } else {
                    console.error('Erreur lors de la récupération des informations du père');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
    });

    // Code existant pour sauvegarder les modifications du père
    document.getElementById('saveFatherChanges').addEventListener('click', function(event) {
        event.preventDefault();

        const form = document.getElementById('addNewFather');
        const formData = {
            fatherName: document.getElementById('fatherName').value,
            fatherBreed: document.getElementById('fatherBreed').value,
            fatherColor: document.getElementById('fatherColor').value,
            fatherGender: document.getElementById('fatherGender').value,
            fatherRegister: document.getElementById('fatherRegister').value,
            fatherCountry: document.getElementById('fatherCountry').value,
            fatherBreedType: document.getElementById('fatherBreedType').value,
            fatherCoatType: document.getElementById('fatherCoatType').value,
            fatherEyeColor: document.getElementById('fatherEyeColor').value,
            fatherIsOnline: document.getElementById('fatherIsOnline').value,
            paternal_father_id: document.getElementById('paternal_father_id').value,
            paternal_mother_id: document.getElementById('paternal_mother_id').value
        };

        fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const successMessage = document.getElementById('updateFatherSuccess');
                successMessage.style.display = 'block';

                document.querySelector('.animal-name span').textContent = formData.fatherName;
                document.querySelector('.animal-breed').textContent = document.getElementById('fatherBreed').selectedOptions[0].text;
                document.querySelector('.animal-color').textContent = formData.fatherColor;

                const animalSlug = window.location.pathname.split('/').pop();
                fetch(`/admin/animalProfile/${animalSlug}/fatherImage`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.fatherImagePath) {
                            const fatherImageElement = document.querySelector('.genealogy-block img');
                            fatherImageElement.src = `/uploads/${data.fatherImagePath}`;
                        } else {
                            console.error('Erreur lors de la récupération de l\'image du père');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                    });

                setTimeout(() => {
                    window.location.href = window.location.href.split('?')[0] + '?section=genealogy';
                }, 1500);

                setTimeout(() => {
                    successMessage.style.display = 'none';
                    $('#fatherUpdateModal').modal('hide');
                }, 3000);
            } else {
                alert('Erreur lors de l\'enregistrement des informations');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'enregistrement des informations');
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'genealogy') {
        const genealogyTab = new bootstrap.Tab(document.querySelector('#email-tab'));
        genealogyTab.show();
    }
});



 // fonction pour ajouter la photo de la mère dans la modal
 document.addEventListener('DOMContentLoaded', function() {
    

    // Elements for the mother's photo upload
    const uploadBtnMother = document.getElementById('uploadBtnMother');
    const photoInputMother = document.getElementById('photoInputMother');
    const photoContainerMother = document.getElementById('photoContainerMother');
    const uploadFormMother = document.getElementById('uploadMotherForm');

    const motherId = uploadBtnMother.getAttribute('data-mother-id');

    uploadBtnMother.addEventListener('click', function() {
        photoInputMother.click();
    });

    photoInputMother.addEventListener('change', function() {
        const file = photoInputMother.files[0];

        if (file) {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('mother_id', motherId);

            fetch('/admin/animalProfile/uploadPhotoMother', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Clear the existing photos in the container
                    photoContainerMother.innerHTML = '';

                    const newPhoto = document.createElement('div');
                    newPhoto.classList.add('col');
                    newPhoto.id = `photo-${data.photo.id}`;
                    newPhoto.innerHTML = `
                        <div class="genealogy-block border d-flex flex-column align-items-center justify-content-center p-4 text-center">
                            <img src="/uploads/${data.photo.image_path}" class="bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                        </div>
                    `;
                    photoContainerMother.appendChild(newPhoto);

                } else {
                    alert('Erreur lors du téléchargement de la photo de la mère');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors du téléchargement de la photo de la mère');
            });
        }
    });
});


// Fonction pour ajouter le nom du père et de la mère dans la modale de la mère de l'animal
document.addEventListener('DOMContentLoaded', function() {
   
    // Fonction pour ajouter un nouveau grand-père maternel
    window.addNewMaternalFather = function() {
        const motherId = document.getElementById('maternal_father_id').value;
        const grandfatherName = document.getElementById('new_Maternal_father').value;
        const inputField = document.getElementById('new_Maternal_father');
        const selectField = document.getElementById('maternal_father_id');

        if (grandfatherName) {
            fetch('/admin/animalProfile/addMaternalGrandfather', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mother_id: motherId, grandfather_name: grandfatherName })
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Ajouter le nouvel élément à la liste déroulante
                    const newOption = new Option(data.grandfather.grandfather_name, data.grandfather.id);
                    selectField.add(newOption);
                    newOption.selected = true;  // Sélectionner la nouvelle option

                    // Changer la couleur des bordures en vert
                    inputField.style.borderColor = 'lightgreen';
                    selectField.style.borderColor = 'lightgreen';
                    setTimeout(() => {
                        inputField.style.borderColor = '';
                        selectField.style.borderColor = '';
                    }, 3000);
                } else {
                    // Changer la couleur de l'input en rouge
                    inputField.style.borderColor = 'lightcoral';
                    setTimeout(() => {
                        inputField.style.borderColor = '';
                    }, 3000);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                inputField.style.borderColor = 'lightcoral';
                setTimeout(() => {
                    inputField.style.borderColor = '';
                }, 3000);
            });
        }
    };

    // Fonction pour ajouter une nouvelle grand-mère maternelle
    window.addNewMaternalMother = function() {
        const motherId = document.getElementById('maternal_mother_id').value;
        const grandmotherName = document.getElementById('new_Maternal_mother').value;
        const inputField = document.getElementById('new_Maternal_mother');
        const selectField = document.getElementById('maternal_mother_id');

        if (grandmotherName) {
            fetch('/admin/animalProfile/addMaternalGrandmother', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mother_id: motherId, grandmother_name: grandmotherName })
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Ajouter le nouvel élément à la liste déroulante
                    const newOption = new Option(data.grandmother.grandmother_name, data.grandmother.id);
                    selectField.add(newOption);
                    newOption.selected = true;  // Sélectionner la nouvelle option

                    // Changer la couleur des bordures en vert
                    inputField.style.borderColor = 'lightgreen';
                    selectField.style.borderColor = 'lightgreen';
                    setTimeout(() => {
                        inputField.style.borderColor = '';
                        selectField.style.borderColor = '';
                    }, 3000);
                } else {
                    // Changer la couleur de l'input en rouge
                    inputField.style.borderColor = 'lightcoral';
                    setTimeout(() => {
                        inputField.style.borderColor = '';
                    }, 3000);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                inputField.style.borderColor = 'lightcoral';
                setTimeout(() => {
                    inputField.style.borderColor = '';
                }, 3000);
            });
        }
    };
});


// fonction pour la modale de la mère 
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter un événement pour charger les informations de la mère lorsque la modale est ouverte
    $('#motherUpdateModal').on('show.bs.modal', function (event) {
        const animalSlug = window.location.pathname.split('/').pop();

        fetch(`/admin/animalProfile/${animalSlug}/motherInfo`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.success && data.mother) {
                    // Mettre à jour les champs de la modale avec les informations de la mère
                    document.getElementById('motherName').value = data.mother.mother_name;
                    document.getElementById('motherBreed').value = data.mother.breed_id;
                    document.getElementById('motherColor').value = data.mother.mother_color;
                    document.getElementById('motherGender').value = data.mother.mother_gender || 'Femelle';
                    document.getElementById('motherRegister').value = data.mother.register_id;
                    document.getElementById('motherCountry').value = data.mother.country_id;
                    document.getElementById('motherBreedType').value = data.mother.mother_breed_type;
                    document.getElementById('motherCoatType').value = data.mother.mother_coat_type;
                    document.getElementById('motherEyeColor').value = data.mother.mother_eye_color;
                    document.getElementById('motherIsOnline').value = data.mother.mother_is_online;
                    document.getElementById('maternal_father_id').value = data.mother.maternal_grandfather_id;
                    document.getElementById('maternal_mother_id').value = data.mother.maternal_grandmother_id;

                    // Sélectionner la bonne option dans le select pour la race de la mère
                    const motherBreedSelect = document.getElementById('motherBreed');
                    motherBreedSelect.value = data.mother.breed_id;

                    const breedOptions = motherBreedSelect.options;
                    for (let i = 0; i < breedOptions.length; i++) {
                        if (breedOptions[i].value == data.mother.breed_id) {
                            breedOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le registre de la mère
                    const motherRegisterSelect = document.getElementById('motherRegister');
                    motherRegisterSelect.value = data.mother.register_id;

                    const registerOptions = motherRegisterSelect.options;
                    for (let i = 0; i < registerOptions.length; i++) {
                        if (registerOptions[i].value == data.mother.register_id) {
                            registerOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le pays de naissance de la mère
                    const motherCountrySelect = document.getElementById('motherCountry');
                    motherCountrySelect.value = data.mother.country_id;

                    const countryOptions = motherCountrySelect.options;
                    for (let i = 0; i < countryOptions.length; i++) {
                        if (countryOptions[i].value == data.mother.country_id) {
                            countryOptions[i].selected = true;
                            break;
                        }
                    }
                } else {
                    console.error('Erreur lors de la récupération des informations de la mère');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
    });

    // Code existant pour sauvegarder les modifications de la mère
    document.getElementById('saveMotherChanges').addEventListener('click', function(event) {
        event.preventDefault();

        const form = document.getElementById('addNewMother');
        const formData = {
            motherName: document.getElementById('motherName').value,
            motherBreed: document.getElementById('motherBreed').value,
            motherColor: document.getElementById('motherColor').value,
            motherGender: document.getElementById('motherGender').value,
            motherRegister: document.getElementById('motherRegister').value,
            motherCountry: document.getElementById('motherCountry').value,
            motherBreedType: document.getElementById('motherBreedType').value,
            motherCoatType: document.getElementById('motherCoatType').value,
            motherEyeColor: document.getElementById('motherEyeColor').value,
            motherIsOnline: document.getElementById('motherIsOnline').value,
            maternal_father_id: document.getElementById('maternal_father_id').value,
            maternal_mother_id: document.getElementById('maternal_mother_id').value
        };

        fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const successMessage = document.getElementById('updateMotherSuccess');
                successMessage.style.display = 'block';

                document.querySelector('.animal-name-mother span').textContent = formData.motherName;
                document.querySelector('.animal-breed-mother').textContent = document.getElementById('motherBreed').selectedOptions[0].text;
                document.querySelector('.animal-color-mother').textContent = formData.motherColor;

                const animalSlug = window.location.pathname.split('/').pop();
                fetch(`/admin/animalProfile/${animalSlug}/motherImage`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.motherImagePath) {
                            const motherImageElement = document.querySelector('.mother-image');
                            motherImageElement.src = `/uploads/${data.motherImagePath}`;
                        } else {
                            console.error('Erreur lors de la récupération de l\'image de la mère');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                    });

                setTimeout(() => {
                    window.location.href = window.location.href.split('?')[0] + '?section=genealogy';
                }, 1500);

                setTimeout(() => {
                    successMessage.style.display = 'none';
                    $('#motherUpdateModal').modal('hide');
                }, 3000);
            } else {
                alert('Erreur lors de l\'enregistrement des informations');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'enregistrement des informations');
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'genealogy') {
        const genealogyTab = new bootstrap.Tab(document.querySelector('#email-tab'));
        genealogyTab.show();
    }
});





// fonction pour l'ajout de la photo du grand père maternel dans la modal
document.addEventListener('DOMContentLoaded', function() {

    // Elements for the paternal grandfather's photo upload
    const uploadBtnPaternalGrandfather = document.getElementById('uploadBtnPaternalGrandfather');
    const photoInputPaternalGrandfather = document.getElementById('photoInputPaternalGrandfather');
    const photoContainerPaternalGrandfather = document.getElementById('photoContainerPaternalGrandfather');
    const uploadFormPaternalGrandfather = document.getElementById('uploadPaternalGrandfatherForm');

    const grandfatherId = uploadBtnPaternalGrandfather.getAttribute('data-grandfather-id');

    uploadBtnPaternalGrandfather.addEventListener('click', function() {

        photoInputPaternalGrandfather.click();
    });

    photoInputPaternalGrandfather.addEventListener('change', function() {
        const file = photoInputPaternalGrandfather.files[0];

        if (file) {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('grandfather_id', grandfatherId);
            
            fetch('/admin/animalProfile/uploadPhotoPaternalGrandfather', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Clear the existing photos in the container
                    photoContainerPaternalGrandfather.innerHTML = '';

                    const newPhoto = document.createElement('div');
                    newPhoto.classList.add('col');
                    newPhoto.id = `photo-${data.photo.id}`;
                    newPhoto.innerHTML = `
                        <div class="genealogy-block border d-flex flex-column align-items-center justify-content-center p-4 text-center">
                            <img src="/uploads/${data.photo.image_path}" class="bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                        </div>
                    `;
                    photoContainerPaternalGrandfather.appendChild(newPhoto);
                    // console.log('Paternal Grandfather photo added to the container');
                } else {
                    alert('Erreur lors du téléchargement de la photo du grand-père paternel');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors du téléchargement de la photo du grand-père paternel');
            });
        }
    });
});







// fonction pour l'ajout des infos pour le grand père parternel (dans la modale)
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter un événement pour charger les informations du grand-père paternel lorsque la modale est ouverte
    $('#paternalGrandfatherUpdateModal').on('show.bs.modal', function (event) {
        const animalSlug = window.location.pathname.split('/').pop();

        fetch(`/admin/animalProfile/${animalSlug}/paternalGrandfatherInfo`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.success && data.paternalGrandfather) {
                    // Mettre à jour les champs de la modale avec les informations du grand-père paternel
                    document.getElementById('paternalGrandfatherName').value = data.paternalGrandfather.grandfather_name;
                    document.getElementById('paternalGrandfatherBreed').value = data.paternalGrandfather.breed_id;
                    document.getElementById('paternalGrandfatherColor').value = data.paternalGrandfather.grandfather_color;
                    document.getElementById('paternalGrandfatherGender').value = data.paternalGrandfather.grandfather_gender || 'Mâle';
                    document.getElementById('paternalGrandfatherRegister').value = data.paternalGrandfather.register_id;
                    document.getElementById('paternalGrandfatherCountry').value = data.paternalGrandfather.country_id;
                    document.getElementById('paternalGrandfatherBreedType').value = data.paternalGrandfather.grandfather_breed_type;
                    document.getElementById('paternalGrandfatherCoatType').value = data.paternalGrandfather.grandfather_coat_type;
                    document.getElementById('paternalGrandfatherEyeColor').value = data.paternalGrandfather.grandfather_eye_color;
                    document.getElementById('paternalGrandfatherIsOnline').value = data.paternalGrandfather.grandfather_is_online;

                    // Sélectionner la bonne option dans le select pour la race du grand-père paternel
                    const grandfatherBreedSelect = document.getElementById('paternalGrandfatherBreed');
                    grandfatherBreedSelect.value = data.paternalGrandfather.breed_id;

                    const breedOptions = grandfatherBreedSelect.options;
                    for (let i = 0; i < breedOptions.length; i++) {
                        if (breedOptions[i].value == data.paternalGrandfather.breed_id) {
                            breedOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le registre du grand-père paternel
                    const grandfatherRegisterSelect = document.getElementById('paternalGrandfatherRegister');
                    grandfatherRegisterSelect.value = data.paternalGrandfather.register_id;

                    const registerOptions = grandfatherRegisterSelect.options;
                    for (let i = 0; i < registerOptions.length; i++) {
                        if (registerOptions[i].value == data.paternalGrandfather.register_id) {
                            registerOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le pays de naissance du grand-père paternel
                    const grandfatherCountrySelect = document.getElementById('paternalGrandfatherCountry');
                    grandfatherCountrySelect.value = data.paternalGrandfather.country_id;

                    const countryOptions = grandfatherCountrySelect.options;
                    for (let i = 0; i < countryOptions.length; i++) {
                        if (countryOptions[i].value == data.paternalGrandfather.country_id) {
                            countryOptions[i].selected = true;
                            break;
                        }
                    }
                } else {
                    console.error('Erreur lors de la récupération des informations du grand-père paternel');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
    });

    // Code existant pour sauvegarder les modifications du grand-père paternel
    document.getElementById('savePaternalGrandfatherChanges').addEventListener('click', function(event) {
        event.preventDefault();
    
        const form = document.getElementById('updatePaternalGrandfather');
        const formData = {
            grandfatherName: document.getElementById('paternalGrandfatherName').value,
            grandfatherBreed: document.getElementById('paternalGrandfatherBreed').value,
            grandfatherColor: document.getElementById('paternalGrandfatherColor').value,
            grandfatherGender: document.getElementById('paternalGrandfatherGender').value,
            grandfatherRegister: document.getElementById('paternalGrandfatherRegister').value,
            grandfatherCountry: document.getElementById('paternalGrandfatherCountry').value,
            grandfatherBreedType: document.getElementById('paternalGrandfatherBreedType').value,
            grandfatherCoatType: document.getElementById('paternalGrandfatherCoatType').value,
            grandfatherEyeColor: document.getElementById('paternalGrandfatherEyeColor').value,
            grandfatherIsOnline: document.getElementById('paternalGrandfatherIsOnline').value
        };
        console.log(formData);
    
        fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            
            if (data.success) {
                
                
                // Afficher le message de succès
                const successMessage = document.getElementById('updatePaternalGrandfatherSuccess');
                successMessage.style.display = 'block';
    
                // Mettre à jour les éléments HTML
                document.querySelector('.animal-name-paternal-grandfather span').textContent = formData.paternalGrandfatherName;
                
                // Vérification avant d'accéder à selectedOptions[0]
                const breedSelect = document.getElementById('paternalGrandfatherBreed');
                if (breedSelect && breedSelect.selectedOptions[0]) {
                    document.querySelector('.animal-breed-paternal-grandfather').textContent = breedSelect.selectedOptions[0].text;
                }
    
                document.querySelector('.animal-color-paternal-grandfather').textContent = formData.paternalGrandfatherColor;
    
                // Récupérer et mettre à jour l'image du grand-père paternel
                const animalSlug = window.location.pathname.split('/').pop();
                fetch(`/admin/animalProfile/${animalSlug}/paternalGrandfatherImage`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.paternalGrandfatherImagePath) {
                            const paternalGrandfatherImageElement = document.querySelector('.paternal-grandfather-image');
                            if (paternalGrandfatherImageElement) {
                                paternalGrandfatherImageElement.src = `/uploads/${data.paternalGrandfatherImagePath}`;
                            } else {
                                console.error('Element img for paternal grandfather not found');
                            }
                        } else {
                            console.error('Erreur lors de la récupération de l\'image du grand-père paternel');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                    });
    
                // Recharger la page en arrière-plan après 1,5 secondes avec un indicateur dans l'URL
                setTimeout(() => {
                    window.location.href = window.location.href.split('?')[0] + '?section=genealogy';
                }, 1500);
    
                // Cacher le message de succès et fermer la modal après 3 secondes
                setTimeout(() => {
                    successMessage.style.display = 'none';
                    $('#paternalGrandfatherUpdateModal').modal('hide');
                }, 3000);
            } else {
                alert('Erreur lors de l\'enregistrement des informations');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'enregistrement des informations');
        });
    });
    

    // Vérifier s'il y a un indicateur dans l'URL pour afficher la section "Généalogie"
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'genealogy') {
        // Afficher la section généalogie
        const genealogyTab = new bootstrap.Tab(document.querySelector('#email-tab'));
        genealogyTab.show();
    }
});






// fonction pour ajouter la photo de la grand-mère paternelle dans la modale
document.addEventListener('DOMContentLoaded', function() {

    // Elements for the paternal grandmother's photo upload
    const uploadBtnPaternalGrandmother = document.getElementById('uploadBtnPaternalGrandmother');
    const photoInputPaternalGrandmother = document.getElementById('photoInputPaternalGrandmother');
    const photoContainerPaternalGrandmother = document.getElementById('photoContainerPaternalGrandmother');
    const uploadFormPaternalGrandmother = document.getElementById('uploadPaternalGrandmotherForm');

    const grandmotherId = uploadBtnPaternalGrandmother.getAttribute('data-grandmother-id');

    uploadBtnPaternalGrandmother.addEventListener('click', function() {
        photoInputPaternalGrandmother.click();
    });

    photoInputPaternalGrandmother.addEventListener('change', function() {
        const file = photoInputPaternalGrandmother.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('grandmother_id', grandmotherId);
            
            fetch('/admin/animalProfile/uploadPhotoPaternalGrandmother', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Clear the existing photos in the container
                    photoContainerPaternalGrandmother.innerHTML = '';

                    const newPhoto = document.createElement('div');
                    newPhoto.classList.add('col');
                    newPhoto.id = `photo-${data.photo.id}`;
                    newPhoto.innerHTML = `
                        <div class="genealogy-block border d-flex flex-column align-items-center justify-content-center p-4 text-center">
                            <img src="/uploads/${data.photo.image_path}" class="bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                        </div>
                    `;
                    photoContainerPaternalGrandmother.appendChild(newPhoto);
                } else {
                    alert('Erreur lors du téléchargement de la photo de la grand-mère paternelle');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors du téléchargement de la photo de la grand-mère paternelle');
            });
        }
    });
});



// fonction pour envoyer les informations générales de la grand-mère paternelle dans la modale
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter un événement pour charger les informations de la grand-mère paternelle lorsque la modale est ouverte
    $('#paternalGrandmotherUpdateModal').on('show.bs.modal', function (event) {
        const animalSlug = window.location.pathname.split('/').pop();

        fetch(`/admin/animalProfile/${animalSlug}/paternalGrandmotherInfo`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.success && data.paternalGrandmother) {
                    // Mettre à jour les champs de la modale avec les informations de la grand-mère paternelle
                    document.getElementById('paternalGrandmotherName').value = data.paternalGrandmother.grandmother_name;
                    document.getElementById('paternalGrandmotherBreed').value = data.paternalGrandmother.breed_id;
                    document.getElementById('paternalGrandmotherColor').value = data.paternalGrandmother.grandmother_color;
                    document.getElementById('paternalGrandmotherGender').value = data.paternalGrandmother.grandmother_gender || 'Femelle';
                    document.getElementById('paternalGrandmotherRegister').value = data.paternalGrandmother.register_id;
                    document.getElementById('paternalGrandmotherCountry').value = data.paternalGrandmother.country_id;
                    document.getElementById('paternalGrandmotherBreedType').value = data.paternalGrandmother.grandmother_breed_type;
                    document.getElementById('paternalGrandmotherCoatType').value = data.paternalGrandmother.grandmother_coat_type;
                    document.getElementById('paternalGrandmotherEyeColor').value = data.paternalGrandmother.grandmother_eye_color;
                    document.getElementById('paternalGrandmotherIsOnline').value = data.paternalGrandmother.grandmother_is_online;

                    // Sélectionner la bonne option dans le select pour la race de la grand-mère paternelle
                    const grandmotherBreedSelect = document.getElementById('paternalGrandmotherBreed');
                    grandmotherBreedSelect.value = data.paternalGrandmother.breed_id;

                    const breedOptions = grandmotherBreedSelect.options;
                    for (let i = 0; i < breedOptions.length; i++) {
                        if (breedOptions[i].value == data.paternalGrandmother.breed_id) {
                            breedOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le registre de la grand-mère paternelle
                    const grandmotherRegisterSelect = document.getElementById('paternalGrandmotherRegister');
                    grandmotherRegisterSelect.value = data.paternalGrandmother.register_id;

                    const registerOptions = grandmotherRegisterSelect.options;
                    for (let i = 0; i < registerOptions.length; i++) {
                        if (registerOptions[i].value == data.paternalGrandmother.register_id) {
                            registerOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le pays de naissance de la grand-mère paternelle
                    const grandmotherCountrySelect = document.getElementById('paternalGrandmotherCountry');
                    grandmotherCountrySelect.value = data.paternalGrandmother.country_id;

                    const countryOptions = grandmotherCountrySelect.options;
                    for (let i = 0; i < countryOptions.length; i++) {
                        if (countryOptions[i].value == data.paternalGrandmother.country_id) {
                            countryOptions[i].selected = true;
                            break;
                        }
                    }
                } else {
                    console.error('Erreur lors de la récupération des informations de la grand-mère paternelle');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
    });

    // Code existant pour sauvegarder les modifications de la grand-mère paternelle
    document.getElementById('savePaternalGrandmotherChanges').addEventListener('click', function(event) {
        event.preventDefault();

        const form = document.getElementById('updatePaternalGrandmother');
        const formData = {
            grandmotherName: document.getElementById('paternalGrandmotherName').value,
            grandmotherBreed: document.getElementById('paternalGrandmotherBreed').value,
            grandmotherColor: document.getElementById('paternalGrandmotherColor').value,
            grandmotherGender: document.getElementById('paternalGrandmotherGender').value,
            grandmotherRegister: document.getElementById('paternalGrandmotherRegister').value,
            grandmotherCountry: document.getElementById('paternalGrandmotherCountry').value,
            grandmotherBreedType: document.getElementById('paternalGrandmotherBreedType').value,
            grandmotherCoatType: document.getElementById('paternalGrandmotherCoatType').value,
            grandmotherEyeColor: document.getElementById('paternalGrandmotherEyeColor').value,
            grandmotherIsOnline: document.getElementById('paternalGrandmotherIsOnline').value
        };

        fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {

                // Afficher le message de succès
                const successMessage = document.getElementById('updatePaternalGrandmotherSuccess');
                successMessage.style.display = 'block';

                // Mettre à jour les éléments HTML
                document.querySelector('.animal-name-paternal-grandmother span').textContent = formData.grandmotherName;
                
                // Vérification avant d'accéder à selectedOptions[0]
                const breedSelect = document.getElementById('paternalGrandmotherBreed');
                if (breedSelect && breedSelect.selectedOptions[0]) {
                    document.querySelector('.animal-breed-paternal-grandmother').textContent = breedSelect.selectedOptions[0].text;
                }

                document.querySelector('.animal-color-paternal-grandmother').textContent = formData.grandmotherColor;

                // Récupérer et mettre à jour l'image de la grand-mère paternelle
                const animalSlug = window.location.pathname.split('/').pop();
                fetch(`/admin/animalProfile/${animalSlug}/paternalGrandmotherImage`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.paternalGrandmotherImagePath) {
                            const paternalGrandmotherImageElement = document.querySelector('.paternal-grandmother-image');
                            if (paternalGrandmotherImageElement) {
                                paternalGrandmotherImageElement.src = `/uploads/${data.paternalGrandmotherImagePath}`;
                            } else {
                                console.error('Element img for paternal grandmother not found');
                            }
                        } else {
                            console.error('Erreur lors de la récupération de l\'image de la grand-mère paternelle');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                    });

                // Recharger la page en arrière-plan après 1,5 secondes avec un indicateur dans l'URL
                setTimeout(() => {
                    window.location.href = window.location.href.split('?')[0] + '?section=genealogy';
                }, 1500);

                // Cacher le message de succès et fermer la modal après 3 secondes
                setTimeout(() => {
                    successMessage.style.display = 'none';
                    $('#paternalGrandmotherUpdateModal').modal('hide');
                }, 3000);
            } else {
                alert('Erreur lors de l\'enregistrement des informations');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'enregistrement des informations');
        });
    });

    // Vérifier s'il y a un indicateur dans l'URL pour afficher la section "Généalogie"
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'genealogy') {
        // Afficher la section généalogie
        const genealogyTab = new bootstrap.Tab(document.querySelector('#email-tab'));
        genealogyTab.show();
    }
});








// fonction pour ajouter la photo du grand-père maternel
document.addEventListener('DOMContentLoaded', function() {

    // Elements for the maternal grandfather's photo upload
    const uploadBtnMaternalGrandfather = document.getElementById('uploadBtnMaternalGrandfather');
    const photoInputMaternalGrandfather = document.getElementById('photoInputMaternalGrandfather');
    const photoContainerMaternalGrandfather = document.getElementById('photoContainerMaternalGrandfather');
    const uploadFormMaternalGrandfather = document.getElementById('uploadMaternalGrandfatherForm');

    const grandfatherId = uploadBtnMaternalGrandfather.getAttribute('data-grandfather-id');

    uploadBtnMaternalGrandfather.addEventListener('click', function() {
        photoInputMaternalGrandfather.click();
    });

    photoInputMaternalGrandfather.addEventListener('change', function() {
        const file = photoInputMaternalGrandfather.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('grandfather_id', grandfatherId);

            fetch('/admin/animalProfile/uploadPhotoMaternalGrandfather', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Clear the existing photos in the container
                    photoContainerMaternalGrandfather.innerHTML = '';

                    const newPhoto = document.createElement('div');
                    newPhoto.classList.add('col');
                    newPhoto.id = `photo-${data.photo.id}`;
                    newPhoto.innerHTML = `
                        <div class="genealogy-block border d-flex flex-column align-items-center justify-content-center p-4 text-center">
                            <img src="/uploads/${data.photo.image_path}" class="bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                        </div>
                    `;
                    photoContainerMaternalGrandfather.appendChild(newPhoto);

                } else {
                    alert('Erreur lors du téléchargement de la photo du grand-père maternel');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors du téléchargement de la photo du grand-père maternel');
            });
        }
    });
});


// fonction pour ajouter les infos générales du grand-père maternel (modifié)
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter un événement pour charger les informations du grand-père maternel lorsque la modale est ouverte
    $('#maternalGrandfatherUpdateModal').on('show.bs.modal', function (event) {
        const animalSlug = window.location.pathname.split('/').pop();

        fetch(`/admin/animalProfile/${animalSlug}/maternalGrandfatherInfo`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.success && data.maternalGrandfather) {
                    // Mettre à jour les champs de la modale avec les informations du grand-père maternel
                    document.getElementById('maternalGrandfatherName').value = data.maternalGrandfather.grandfather_name;
                    document.getElementById('maternalGrandfatherBreed').value = data.maternalGrandfather.breed_id;
                    document.getElementById('maternalGrandfatherColor').value = data.maternalGrandfather.grandfather_color;
                    document.getElementById('maternalGrandfatherGender').value = data.maternalGrandfather.grandfather_gender || 'Mâle';
                    document.getElementById('maternalGrandfatherRegister').value = data.maternalGrandfather.register_id;
                    document.getElementById('maternalGrandfatherCountry').value = data.maternalGrandfather.country_id;
                    document.getElementById('maternalGrandfatherBreedType').value = data.maternalGrandfather.grandfather_breed_type;
                    document.getElementById('maternalGrandfatherCoatType').value = data.maternalGrandfather.grandfather_coat_type;
                    document.getElementById('maternalGrandfatherEyeColor').value = data.maternalGrandfather.grandfather_eye_color;
                    document.getElementById('maternalGrandfatherIsOnline').value = data.maternalGrandfather.grandfather_is_online;

                    // Sélectionner la bonne option dans le select pour la race du grand-père maternel
                    const grandfatherBreedSelect = document.getElementById('maternalGrandfatherBreed');
                    grandfatherBreedSelect.value = data.maternalGrandfather.breed_id;

                    const breedOptions = grandfatherBreedSelect.options;
                    for (let i = 0; i < breedOptions.length; i++) {
                        if (breedOptions[i].value == data.maternalGrandfather.breed_id) {
                            breedOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le registre du grand-père maternel
                    const grandfatherRegisterSelect = document.getElementById('maternalGrandfatherRegister');
                    grandfatherRegisterSelect.value = data.maternalGrandfather.register_id;

                    const registerOptions = grandfatherRegisterSelect.options;
                    for (let i = 0; i < registerOptions.length; i++) {
                        if (registerOptions[i].value == data.maternalGrandfather.register_id) {
                            registerOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le pays de naissance du grand-père maternel
                    const grandfatherCountrySelect = document.getElementById('maternalGrandfatherCountry');
                    grandfatherCountrySelect.value = data.maternalGrandfather.country_id;

                    const countryOptions = grandfatherCountrySelect.options;
                    for (let i = 0; i < countryOptions.length; i++) {
                        if (countryOptions[i].value == data.maternalGrandfather.country_id) {
                            countryOptions[i].selected = true;
                            break;
                        }
                    }
                } else {
                    console.error('Erreur lors de la récupération des informations du grand-père maternel');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
    });

    // Code existant pour sauvegarder les modifications du grand-père maternel
    document.getElementById('saveMaternalGrandfatherChanges').addEventListener('click', function(event) {
        event.preventDefault();
    
        const form = document.getElementById('updateMaternalGrandfather');
        const formData = {
            grandfatherName: document.getElementById('maternalGrandfatherName').value,
            grandfatherBreed: document.getElementById('maternalGrandfatherBreed').value,
            grandfatherColor: document.getElementById('maternalGrandfatherColor').value,
            grandfatherGender: document.getElementById('maternalGrandfatherGender').value,
            grandfatherRegister: document.getElementById('maternalGrandfatherRegister').value,
            grandfatherCountry: document.getElementById('maternalGrandfatherCountry').value,
            grandfatherBreedType: document.getElementById('maternalGrandfatherBreedType').value,
            grandfatherCoatType: document.getElementById('maternalGrandfatherCoatType').value,
            grandfatherEyeColor: document.getElementById('maternalGrandfatherEyeColor').value,
            grandfatherIsOnline: document.getElementById('maternalGrandfatherIsOnline').value
        };
        console.log(formData);
    
        fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            
            if (data.success) {
                // Afficher le message de succès
                const successMessage = document.getElementById('updateMaternalGrandfatherSuccess');
                successMessage.style.display = 'block';
    
                // Mettre à jour les éléments HTML
                document.querySelector('.animal-name-maternal-grandfather span').textContent = formData.grandfatherName;
                
                // Vérification avant d'accéder à selectedOptions[0]
                const breedSelect = document.getElementById('maternalGrandfatherBreed');
                if (breedSelect && breedSelect.selectedOptions[0]) {
                    document.querySelector('.animal-breed-maternal-grandfather').textContent = breedSelect.selectedOptions[0].text;
                }
    
                document.querySelector('.animal-color-maternal-grandfather').textContent = formData.grandfatherColor;
    
                // Récupérer et mettre à jour l'image du grand-père maternel
                const animalSlug = window.location.pathname.split('/').pop();
                fetch(`/admin/animalProfile/${animalSlug}/maternalGrandfatherImage`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.maternalGrandfatherImagePath) {
                            const maternalGrandfatherImageElement = document.querySelector('.maternal-grandfather-image');
                            if (maternalGrandfatherImageElement) {
                                maternalGrandfatherImageElement.src = `/uploads/${data.maternalGrandfatherImagePath}`;
                            } else {
                                console.error('Element img for maternal grandfather not found');
                            }
                        } else {
                            console.error('Erreur lors de la récupération de l\'image du grand-père maternel');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                    });
    
                // Recharger la page en arrière-plan après 1,5 secondes avec un indicateur dans l'URL
                setTimeout(() => {
                    window.location.href = window.location.href.split('?')[0] + '?section=genealogy';
                }, 1500);
    
                // Cacher le message de succès et fermer la modal après 3 secondes
                setTimeout(() => {
                    successMessage.style.display = 'none';
                    $('#maternalGrandfatherUpdateModal').modal('hide');
                }, 3000);
            } else {
                alert('Erreur lors de l\'enregistrement des informations');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'enregistrement des informations');
        });
    });
    
    // Vérifier s'il y a un indicateur dans l'URL pour afficher la section "Généalogie"
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'genealogy') {
        // Afficher la section généalogie
        const genealogyTab = new bootstrap.Tab(document.querySelector('#email-tab'));
        genealogyTab.show();
    }
});





// fonction pour ajouter la photo de la grand-mère maternelle 
document.addEventListener('DOMContentLoaded', function() {

    // Elements for the maternal grandmother's photo upload
    const uploadBtnMaternalGrandmother = document.getElementById('uploadBtnMaternalGrandmother');
    const photoInputMaternalGrandmother = document.getElementById('photoInputMaternalGrandmother');
    const photoContainerMaternalGrandmother = document.getElementById('photoContainerMaternalGrandmother');
    const uploadFormMaternalGrandmother = document.getElementById('uploadMaternalGrandmotherForm');

    const grandmotherId = uploadBtnMaternalGrandmother.getAttribute('data-grandmother-id');

    uploadBtnMaternalGrandmother.addEventListener('click', function() {

        photoInputMaternalGrandmother.click();
    });

    photoInputMaternalGrandmother.addEventListener('change', function() {
        const file = photoInputMaternalGrandmother.files[0];

        if (file) {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('grandmother_id', grandmotherId);

            fetch('/admin/animalProfile/uploadPhotoMaternalGrandmother', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(data => {

                if (data.success) {
                    // Clear the existing photos in the container
                    photoContainerMaternalGrandmother.innerHTML = '';

                    const newPhoto = document.createElement('div');
                    newPhoto.classList.add('col');
                    newPhoto.id = `photo-${data.photo.id}`;
                    newPhoto.innerHTML = `
                        <div class="genealogy-block border d-flex flex-column align-items-center justify-content-center p-4 text-center">
                            <img src="/uploads/${data.photo.image_path}" class="bd-placeholder-img card-img-top img-fluid h-100" style="object-fit: cover;" alt="Photo">
                        </div>
                    `;
                    photoContainerMaternalGrandmother.appendChild(newPhoto);
                } else {
                    alert('Erreur lors du téléchargement de la photo de la grand-mère maternelle');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors du téléchargement de la photo de la grand-mère maternelle');
            });
        }
    });
});




// fonction pour les infos générales de la grand-mère maternelle 
// document.addEventListener('DOMContentLoaded', function() {
   
//     document.getElementById('saveMaternalGrandmotherChanges').addEventListener('click', function(event) {
//         event.preventDefault();

//         const form = document.getElementById('updateMaternalGrandmother');
//         const formData = {
//             maternalGrandmotherName: document.getElementById('maternalGrandmotherName').value,
//             maternalGrandmotherBreed: document.getElementById('maternalGrandmotherBreed').value,
//             maternalGrandmotherGender: document.getElementById('maternalGrandmotherGender').value,
//             maternalGrandmotherRegister: document.getElementById('maternalGrandmotherRegister').value,
//             maternalGrandmotherCountry: document.getElementById('maternalGrandmotherCountry').value,
//             maternalGrandmotherBreedType: document.getElementById('maternalGrandmotherBreedType').value,
//             maternalGrandmotherColor: document.getElementById('maternalGrandmotherColor').value,
//             maternalGrandmotherCoatType: document.getElementById('maternalGrandmotherCoatType').value,
//             maternalGrandmotherEyeColor: document.getElementById('maternalGrandmotherEyeColor').value,
//             maternalGrandmotherIsOnline: document.getElementById('maternalGrandmotherIsOnline').value
//         };


//         fetch(form.action, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(formData)
//         })
//         .then(response => response.json())
//         .then(data => {
//             if (data.success) {

//                 // Afficher le message de succès
//                 const successMessage = document.getElementById('updateMaternalGrandmotherSuccess');
//                 successMessage.style.display = 'block';

//                 // Mettre à jour les éléments HTML
//                 document.querySelector('.animal-name-maternal-grandmother span').textContent = formData.maternalGrandmotherName;
//                 document.querySelector('.animal-breed-maternal-grandmother').textContent = document.getElementById('maternalGrandmotherBreed').selectedOptions[0].text;
//                 document.querySelector('.animal-color-maternal-grandmother').textContent = formData.maternalGrandmotherColor;

//                 // Récupérer et mettre à jour l'image de la grand-mère maternelle
//                 const animalSlug = window.location.pathname.split('/').pop();
//                 fetch(`/admin/animalProfile/${animalSlug}/maternalGrandmotherImage`)
//                     .then(response => response.json())
//                     .then(data => {
//                         if (data.success && data.maternalGrandmotherImagePath) {
//                             const maternalGrandmotherImageElement = document.querySelector('.maternal-grandmother-image');
//                             if (maternalGrandmotherImageElement) {
//                                 maternalGrandmotherImageElement.src = `/uploads/${data.maternalGrandmotherImagePath}`;
//                             } else {
//                                 console.error('Element img for maternal grandmother not found');
//                             }
//                         } else {
//                             console.error('Erreur lors de la récupération de l\'image de la grand-mère maternelle');
//                         }
//                     })
//                     .catch(error => {
//                         console.error('Erreur:', error);
//                     });

//                 // Recharger la page en arrière-plan après 1,5 secondes avec un indicateur dans l'URL
//                 setTimeout(() => {
//                     window.location.href = window.location.href.split('?')[0] + '?section=genealogy';
//                 }, 1500);

//                 // Cacher le message de succès et fermer la modal après 3 secondes
//                 setTimeout(() => {
//                     successMessage.style.display = 'none';
//                     $('#maternalGrandmotherUpdateModal').modal('hide');
//                 }, 3000);
//             } else {
//                 alert('Erreur lors de l\'enregistrement des informations');
//             }
//         })
//         .catch(error => {
//             console.error('Erreur:', error);
//             alert('Erreur lors de l\'enregistrement des informations');
//         });
//     });

//     // Vérifier s'il y a un indicateur dans l'URL pour afficher la section "Généalogie"
//     const urlParams = new URLSearchParams(window.location.search);
//     if (urlParams.get('section') === 'genealogy') {
//         // Afficher la section généalogie
//         const genealogyTab = new bootstrap.Tab(document.querySelector('#email-tab'));
//         genealogyTab.show();
//     }
// });

// fonction pour les infos générales de la grand-mère maternelle (modifié)
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter un événement pour charger les informations de la grand-mère maternelle lorsque la modale est ouverte
    $('#maternalGrandmotherUpdateModal').on('show.bs.modal', function (event) {
        const animalSlug = window.location.pathname.split('/').pop();

        fetch(`/admin/animalProfile/${animalSlug}/maternalGrandmotherInfo`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.success && data.maternalGrandmother) {
                    // Mettre à jour les champs de la modale avec les informations de la grand-mère maternelle
                    document.getElementById('maternalGrandmotherName').value = data.maternalGrandmother.grandmother_name;
                    document.getElementById('maternalGrandmotherBreed').value = data.maternalGrandmother.breed_id;
                    document.getElementById('maternalGrandmotherColor').value = data.maternalGrandmother.grandmother_color;
                    document.getElementById('maternalGrandmotherGender').value = data.maternalGrandmother.grandmother_gender || 'Femelle';
                    document.getElementById('maternalGrandmotherRegister').value = data.maternalGrandmother.register_id;
                    document.getElementById('maternalGrandmotherCountry').value = data.maternalGrandmother.country_id;
                    document.getElementById('maternalGrandmotherBreedType').value = data.maternalGrandmother.grandmother_breed_type;
                    document.getElementById('maternalGrandmotherCoatType').value = data.maternalGrandmother.grandmother_coat_type;
                    document.getElementById('maternalGrandmotherEyeColor').value = data.maternalGrandmother.grandmother_eye_color;
                    document.getElementById('maternalGrandmotherIsOnline').value = data.maternalGrandmother.grandmother_is_online;

                    // Sélectionner la bonne option dans le select pour la race de la grand-mère maternelle
                    const grandmotherBreedSelect = document.getElementById('maternalGrandmotherBreed');
                    grandmotherBreedSelect.value = data.maternalGrandmother.breed_id;

                    const breedOptions = grandmotherBreedSelect.options;
                    for (let i = 0; i < breedOptions.length; i++) {
                        if (breedOptions[i].value == data.maternalGrandmother.breed_id) {
                            breedOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le registre de la grand-mère maternelle
                    const grandmotherRegisterSelect = document.getElementById('maternalGrandmotherRegister');
                    grandmotherRegisterSelect.value = data.maternalGrandmother.register_id;

                    const registerOptions = grandmotherRegisterSelect.options;
                    for (let i = 0; i < registerOptions.length; i++) {
                        if (registerOptions[i].value == data.maternalGrandmother.register_id) {
                            registerOptions[i].selected = true;
                            break;
                        }
                    }

                    // Sélectionner la bonne option dans le select pour le pays de naissance de la grand-mère maternelle
                    const grandmotherCountrySelect = document.getElementById('maternalGrandmotherCountry');
                    grandmotherCountrySelect.value = data.maternalGrandmother.country_id;

                    const countryOptions = grandmotherCountrySelect.options;
                    for (let i = 0; i < countryOptions.length; i++) {
                        if (countryOptions[i].value == data.maternalGrandmother.country_id) {
                            countryOptions[i].selected = true;
                            break;
                        }
                    }
                } else {
                    console.error('Erreur lors de la récupération des informations de la grand-mère maternelle');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
    });

    // Code existant pour sauvegarder les modifications de la grand-mère maternelle
    document.getElementById('saveMaternalGrandmotherChanges').addEventListener('click', function(event) {
        event.preventDefault();

        const form = document.getElementById('updateMaternalGrandmother');
        const formData = {
            grandmotherName: document.getElementById('maternalGrandmotherName').value,
            grandmotherBreed: document.getElementById('maternalGrandmotherBreed').value,
            grandmotherColor: document.getElementById('maternalGrandmotherColor').value,
            grandmotherGender: document.getElementById('maternalGrandmotherGender').value,
            grandmotherRegister: document.getElementById('maternalGrandmotherRegister').value,
            grandmotherCountry: document.getElementById('maternalGrandmotherCountry').value,
            grandmotherBreedType: document.getElementById('maternalGrandmotherBreedType').value,
            grandmotherCoatType: document.getElementById('maternalGrandmotherCoatType').value,
            grandmotherEyeColor: document.getElementById('maternalGrandmotherEyeColor').value,
            grandmotherIsOnline: document.getElementById('maternalGrandmotherIsOnline').value
        };

        fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {

                // Afficher le message de succès
                const successMessage = document.getElementById('updateMaternalGrandmotherSuccess');
                successMessage.style.display = 'block';

                // Mettre à jour les éléments HTML
                document.querySelector('.animal-name-maternal-grandmother span').textContent = formData.grandmotherName;
                
                // Vérification avant d'accéder à selectedOptions[0]
                const breedSelect = document.getElementById('maternalGrandmotherBreed');
                if (breedSelect && breedSelect.selectedOptions[0]) {
                    document.querySelector('.animal-breed-maternal-grandmother').textContent = breedSelect.selectedOptions[0].text;
                }

                document.querySelector('.animal-color-maternal-grandmother').textContent = formData.grandmotherColor;

                // Récupérer et mettre à jour l'image de la grand-mère maternelle
                const animalSlug = window.location.pathname.split('/').pop();
                fetch(`/admin/animalProfile/${animalSlug}/maternalGrandmotherImage`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.maternalGrandmotherImagePath) {
                            const maternalGrandmotherImageElement = document.querySelector('.maternal-grandmother-image');
                            if (maternalGrandmotherImageElement) {
                                maternalGrandmotherImageElement.src = `/uploads/${data.maternalGrandmotherImagePath}`;
                            } else {
                                console.error('Element img for maternal grandmother not found');
                            }
                        } else {
                            console.error('Erreur lors de la récupération de l\'image de la grand-mère maternelle');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                    });

                // Recharger la page en arrière-plan après 1,5 secondes avec un indicateur dans l'URL
                setTimeout(() => {
                    window.location.href = window.location.href.split('?')[0] + '?section=genealogy';
                }, 1500);

                // Cacher le message de succès et fermer la modal après 3 secondes
                setTimeout(() => {
                    successMessage.style.display = 'none';
                    $('#maternalGrandmotherUpdateModal').modal('hide');
                }, 3000);
            } else {
                alert('Erreur lors de l\'enregistrement des informations');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'enregistrement des informations');
        });
    });

    // Vérifier s'il y a un indicateur dans l'URL pour afficher la section "Généalogie"
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'genealogy') {
        // Afficher la section généalogie
        const genealogyTab = new bootstrap.Tab(document.querySelector('#email-tab'));
        genealogyTab.show();
    }
});



