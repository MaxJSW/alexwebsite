// function for delete country on the page addCountry.ejs

let breedToDelete = null;

function deleteCountry(id) {
    breedToDelete = id;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (breedToDelete !== null) {
            fetch('/admin/addCountry/deleteCountry/' + breedToDelete, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    // Supprimer la ligne de la table correspondante
                    document.getElementById('country-' + breedToDelete).remove();
                    breedToDelete = null;
                    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                    deleteModal.hide();
                } else {
                    response.text().then(text => {
                        alert('Erreur lors de la suppression du pays : ' + text);
                    });
                }
            }).catch(error => {
                console.error('Error:', error);
                alert('Erreur lors de la suppression du pays');
            });
        }
    });
});


// function for display the form to add a country
function toggleAddForm() {
    var addForm = document.getElementById('addForm');
    if (addForm.style.display === 'none' || addForm.style.display === '') {
        addForm.style.display = 'block';
    } else {
        addForm.style.display = 'none';
    }
}

// function for display the form to edit a country
function showEditForm(id, name) {
    document.getElementById('editCountryId').value = id;
    document.getElementById('editCountryName').value = name;
    document.getElementById('editForm').style.display = 'block';
}

// function for submit the form to edit a country
function submitEditForm() {
    var form = document.getElementById('editCountryForm');
    var id = form.elements['id'].value;
    var name = form.elements['name'].value;

    fetch('/admin/addCountry/editCountry/' + id, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name })
    }).then(response => {
        if (response.ok) {
            location.reload();
        } else {
            alert('Erreur lors de la mise à jour du pays');
        }
    });
}

// function for add a country in the database by fetch
function addCountry(event) {
    event.preventDefault();
    var form = document.getElementById('addCountryForm');
    var name = form.elements['name'].value;

    fetch('/addCountry', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name })
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            var country = data.country;
            var newRow = `
                <tr id="country-${country.id}">
                    <td></td>
                    <td>${country.name}</td>
                    <td>${new Date(country.created_at).toLocaleDateString('fr-FR')}</td>
                    <td class="text-end">
                        <button type="button" class="btn btn-warning btn-sm" onclick="showEditForm('${country.id}', '${country.name}')">Modifier</button>
                        <button type="button" class="btn btn-danger btn-sm" onclick="deleteCountry('${country.id}')">Supprimer</button>
                    </td>
                </tr>
            `;
            document.getElementById('countryTableBody').insertAdjacentHTML('beforeend', newRow);
            toggleAddForm();
            form.reset();
        } else {
            alert('Erreur lors de l\'ajout du pays');
        }
    });
}
