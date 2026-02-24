//fonction ajax pour controler le nom de l'animal
$(document).ready(function() {
    $('#name').on('keyup', function() {
        const name = $(this).val().trim();
        const nameFeedback = $('#nameFeedback');
        const nameInput = $(this);

        if (name === '') {
            nameInput.removeClass('is-valid is-invalid');
            nameFeedback.text('');
            return;
        }

        $.ajax({
            url: '/admin/addAnimal/checkAnimalName',
            method: 'GET',
            data: { name: name },
            success: function(response) {
                if (response.exists) {
                    nameInput.removeClass('is-valid').addClass('is-invalid');
                    nameFeedback.text('Ce nom existe déjà.').addClass('invalid-feedback').removeClass('valid-feedback');
                } else {
                    nameInput.removeClass('is-invalid').addClass('is-valid');
                    nameFeedback.text('Ce nom est disponible.').addClass('valid-feedback').removeClass('invalid-feedback');
                }
            },
            error: function() {
                console.error('Erreur lors de la vérification du nom de l\'animal');
            }
        });
    });
});

// fonction ajax controler le nom de l'animal
// document.getElementById('toggleTextarea').addEventListener('click', function() {
//   var textarea = document.getElementById('floatingTextarea2');
//   textarea.disabled = !textarea.disabled;
// });

  //fonction pour ajouter un pays dans le formulaire
    function addNewCountry() {
        const newCountryName = document.getElementById('new_country').value.trim();
        const userId = document.getElementById('userId').value.trim();

        if (newCountryName) {
            fetch('/admin/addAnimal/addCountry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newCountryName, user_id: userId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Ajouter le nouveau pays au select et le sélectionner
                    const select = document.getElementById('country_id');
                    // Vérifier si le pays existe déjà dans le select pour éviter les doublons
                    let optionExists = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value == data.country_id) {
                            optionExists = true;
                            select.options[i].selected = true; // Sélectionner l'option existante
                            break;
                        }
                    }
                    if (!optionExists) {
                        const option = document.createElement('option');
                        option.value = data.country_id;
                        option.text = newCountryName;
                        option.selected = true; // Sélectionner automatiquement le nouveau pays
                        select.add(option);
                    }

                    document.getElementById('new_country').value = '';
                } else {
                    alert('Erreur lors de l\'ajout du pays: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
        } else {
            alert('Veuillez saisir un nom de pays valide.');
        }
    }


  // fonction pour ajouter un nouveau registre et le soumettre au formulaire
    function addNewRegister() {
        const newRegisterName = document.getElementById('new_register').value.trim();
        const userId = document.getElementById('userId').value.trim();

        if (newRegisterName) {
            fetch('/admin/addAnimal/addRegister', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newRegisterName, user_id: userId })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Ajouter le nouveau registre au select et le sélectionner
                    const select = document.getElementById('register_id');
                    // Vérifier si le registre existe déjà dans le select pour éviter les doublons
                    let optionExists = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value == data.register_id) {
                            optionExists = true;
                            select.options[i].selected = true; // Sélectionner l'option existante
                            break;
                        }
                    }
                    if (!optionExists) {
                        const option = document.createElement('option');
                        option.value = data.register_id;
                        option.text = newRegisterName;
                        option.selected = true; // Sélectionner automatiquement le nouveau registre
                        select.add(option);
                    }

                    document.getElementById('new_register').value = '';
                } else {
                    alert('Erreur lors de l\'ajout du registre: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Une erreur est survenue lors de l\'ajout du registre.');
            });
        } else {
            alert('Veuillez saisir un nom de registre valide.');
        }
    }


  
// ajout d'une fonction test pour ajouter un nouveau père et le soumettre au formulaire ???
    function addNewFather() {
        const newFatherName = document.getElementById('new_father').value.trim();

        if (newFatherName) {
            fetch('/admin/addAnimal/addNewFather', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newFatherName })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Ajouter le nouveau père au select et le sélectionner
                    const select = document.getElementById('father_id');
                    // Vérifier si le père existe déjà dans le select pour éviter les doublons
                    let optionExists = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value == data.father_id) {
                            optionExists = true;
                            select.options[i].selected = true; // Sélectionner l'option existante
                            break;
                        }
                    }
                    if (!optionExists) {
                        const option = document.createElement('option');
                        option.value = data.father_id;
                        option.text = newFatherName;
                        option.selected = true; // Sélectionner automatiquement le nouveau père
                        select.add(option);
                    }

                    document.getElementById('new_father').value = '';
                } else {
                    alert('Erreur lors de l\'ajout du père: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Une erreur est survenue lors de l\'ajout du père.');
            });
        } else {
            alert('Veuillez saisir un nom de père valide.');
        }
    }


// ajout d'une fonction test pour ajouter une nouvelle mère et le soumettre au formulaire ???
function addNewMother() {
    const newMotherName = document.getElementById('new_mother').value.trim();

    if (newMotherName) {
        fetch('/admin/addAnimal/addNewMother', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newMotherName })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Ajouter la nouvelle mère au select et la sélectionner
                const select = document.getElementById('mother_id');
                // Vérifier si la mère existe déjà dans le select pour éviter les doublons
                let optionExists = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value == data.mother_id) {
                        optionExists = true;
                        select.options[i].selected = true; // Sélectionner l'option existante
                        break;
                    }
                }
                if (!optionExists) {
                    const option = document.createElement('option');
                    option.value = data.mother_id;
                    option.text = newMotherName;
                    option.selected = true; // Sélectionner automatiquement la nouvelle mère
                    select.add(option);
                }

                document.getElementById('new_mother').value = '';
            } else {
                alert('Erreur lors de l\'ajout de la mère: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Une erreur est survenue lors de l\'ajout de la mère.');
        });
    } else {
        alert('Veuillez saisir un nom de mère valide.');
    }
}


// fonction pour ajouter une nouvelle race et le soumettre au formulaire
function addNewBreed() {
    const newBreedName = document.getElementById('new_breed').value.trim();

    if (newBreedName) {
        fetch('/admin/addAnimal/addBreed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newBreedName })
        })
        .then(response => response.json())
        .then(data => {
            
            if (data.success) {
                // Ajouter la nouvelle race au select et la sélectionner
                const select = document.getElementById('breed_id');
                // Vérifier si la race existe déjà dans le select pour éviter les doublons
                let optionExists = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value == data.breed_id) {
                        optionExists = true;
                        select.options[i].selected = true; // Sélectionner l'option existante
                        break;
                    }
                }
                if (!optionExists) {
                    const option = document.createElement('option');
                    option.value = data.breed_id;
                    option.text = newBreedName;
                    option.selected = true; // Sélectionner automatiquement la nouvelle race
                    select.add(option);
                }

                document.getElementById('new_breed').value = '';
            } else {
                alert('Erreur lors de l\'ajout de la race: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
        });
    } else {
        alert('Veuillez saisir un nom de race valide.');
    }
}
