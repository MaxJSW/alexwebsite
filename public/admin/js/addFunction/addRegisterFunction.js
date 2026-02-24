// function for addRegister on the page addRegister.ejs
function deleteRegister(id) {
    breedToDelete = id;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (breedToDelete !== null) {
            fetch('/admin/addRegister/deleteRegister/' + breedToDelete, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    document.getElementById('register-' + breedToDelete).remove();
                    breedToDelete = null;
                    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                    deleteModal.hide();
                } else {
                    alert('Erreur lors de la suppression du registre');
                }
            }).catch(error => {
                console.error('Error:', error);
                alert('Erreur lors de la suppression du registre');
            });
        }
    });
});

// function for display the form to add a register
function toggleAddForm() {
    var addForm = document.getElementById('addForm');
    if (addForm.style.display === 'none' || addForm.style.display === '') {
        addForm.style.display = 'block';
    } else {
        addForm.style.display = 'none';
    }
}

// function for display the form to edit a register
function showEditForm(id, name) {
    document.getElementById('editRegisterId').value = id;
    document.getElementById('editRegisterName').value = name;
    document.getElementById('editForm').style.display = 'block';
}

// function for submit the form to edit a register
function submitEditForm() {
    var form = document.getElementById('editRegisterForm');
    var id = form.elements['id'].value;
    var name = form.elements['name'].value;

    fetch('/admin/addRegister/editRegister/' + id, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name })
    }).then(response => {
        if (response.ok) {
            location.reload();
        } else {
            alert('Erreur lors de la mise à jour du registre');
        }
    });
}

// function for add a register in the database by fetch
function addRegister(event) {
    event.preventDefault();
    var form = document.getElementById('addRegisterForm');
    var name = form.elements['name'].value;

    fetch('/addRegister', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name })
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            var register = data.register;
            var newRow = `
                <tr id="register-${register.id}">
                    <td></td>
                    <td>${register.name}</td>
                    <td>${new Date(register.created_at).toLocaleDateString('fr-FR')}</td>
                    <td class="text-end">
                        <button type="button" class="btn btn-warning btn-sm" onclick="showEditForm('${register.id}', '${register.name}')">Modifier</button>
                        <button type="button" class="btn btn-danger btn-sm" onclick="deleteRegister('${register.id}')">Supprimer</button>
                    </td>
                </tr>
            `;
            document.getElementById('registerTableBody').insertAdjacentHTML('beforeend', newRow);
            toggleAddForm();
            form.reset();
        } else {
            alert('Erreur lors de l\'ajout du registre');
        }
    });
}
