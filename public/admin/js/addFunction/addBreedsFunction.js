// fonction pour supprimer une race 

let breedToDelete = null;

function deleteBreed(id) {
    breedToDelete = id;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (breedToDelete !== null) {
            fetch('addBreeds/deleteBreed/' + breedToDelete, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    // Supprimer la ligne de la table correspondante
                    document.getElementById('breed-' + breedToDelete).remove();
                    breedToDelete = null;
                    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                    deleteModal.hide();
                } else {
                    response.text().then(text => {
                        alert('Erreur lors de la suppression de la race : ' + text);
                    });
                }
            }).catch(error => {
                console.error('Error:', error);
                alert('Erreur lors de la suppression de la race');
            });
        }
    });
});




// function for display the form to add a breed
function toggleAddForm() {
    var addForm = document.getElementById('addForm');
    if (addForm.style.display === 'none' || addForm.style.display === '') {
        addForm.style.display = 'block';
    } else {
        addForm.style.display = 'none';
    }
}

// function for display the form to edit a breed
function showEditForm(id, name) {
    document.getElementById('editBreedId').value = id;
    document.getElementById('editBreedName').value = name;
    document.getElementById('editForm').style.display = 'block';
}


// function for submit the form to edit a breed (corrected)
function submitEditForm() {
    var form = document.getElementById('editBreedForm');
    var id = form.elements['id'].value;
    var name = form.elements['name'].value;

    // Fonction pour générer le slug
    function generateSlug(name) {
        const accentsMap = new Map([
            ['a', 'á|à|ã|â|ä'],
            ['e', 'é|è|ê|ë'],
            ['i', 'í|ì|î|ï'],
            ['o', 'ó|ò|ô|õ|ö'],
            ['u', 'ú|ù|û|ü'],
            ['c', 'ç'],
            ['n', 'ñ']
        ]);

        let slug = name.toLowerCase();
        accentsMap.forEach((pattern, replacement) => {
            slug = slug.replace(new RegExp(pattern, 'g'), replacement);
        });

        return slug.replace(/'/g, '-') // Remplace les apostrophes par des tirets
                   .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
                   .replace(/\s+/g, '-') // Remplace les espaces par des tirets
                   .replace(/-+/g, '-'); // Remplace les multiples tirets par un seul
    }

    var slug = generateSlug(name);

    fetch('addBreeds/editBreed/' + id, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name, slug: slug })
    }).then(response => {
        if (response.ok) {
            location.reload();
        } else {
            alert('Erreur lors de la mise à jour de la race');
        }
    });
}




// function for add a breed in the database by fetch
// function addBreed(event) {
//     event.preventDefault();
//     var form = document.getElementById('addBreedForm');
//     var name = form.elements['name'].value;

//     fetch('/addBreeds', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ name: name })
//     }).then(response => response.json())
//     .then(data => {
//         if (data.success) {
//             var breed = data.breed;
//             var newRow = `
//                 <tr id="breed-${breed.id}">
//                     <td></td>
//                     <td>${breed.name}</td>
//                     <td class="text-end">
//                         <button type="button" class="btn btn-warning btn-sm" onclick="showEditForm('${breed.id}', '${breed.name}')">Modifier</button>
//                         <button type="button" class="btn btn-danger btn-sm" onclick="deleteBreed('${breed.id}')">Supprimer</button>
//                     </td>
//                 </tr>
//             `;
//             document.getElementById('breedTableBody').insertAdjacentHTML('beforeend', newRow);
//             toggleAddForm();
//             form.reset();
//         } else {
//             alert('Erreur lors de l\'ajout de la race');
//         }
//     });
// }


// function for add a breed in the database by fetch
function addBreed(event) {
    event.preventDefault();
    var form = document.getElementById('addBreedForm');
    var name = form.elements['name'].value;

    // Fonction pour générer le slug
    function generateSlug(name) {
        const accentsMap = new Map([
            ['a', 'á|à|ã|â|ä'],
            ['e', 'é|è|ê|ë'],
            ['i', 'í|ì|î|ï'],
            ['o', 'ó|ò|ô|õ|ö'],
            ['u', 'ú|ù|û|ü'],
            ['c', 'ç'],
            ['n', 'ñ']
        ]);
    
        let slug = name.toLowerCase();
        accentsMap.forEach((pattern, replacement) => {
            slug = slug.replace(new RegExp(pattern, 'g'), replacement);
        });
    
        slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Supprimer les accents restants
        return slug.replace(/'/g, '-') // Remplace les apostrophes par des tirets
                   .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
                   .replace(/\s+/g, '-') // Remplace les espaces par des tirets
                   .replace(/-+/g, '-'); // Remplace les multiples tirets par un seul
    }

    var slug = generateSlug(name);

    fetch('/addBreeds', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name, slug: slug })
        
    }).then(response => {
        console.log('name:', name);
        if (response.ok) {
            location.reload(); // Recharger la page après l'ajout réussi
        } else {
            alert('Erreur lors de l\'ajout de la race');
        }
    });
}
