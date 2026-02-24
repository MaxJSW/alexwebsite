// fonction pour l'envoi des données du formulaire et la mise à jour de la balise alt et du badge
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.update-alt-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);

            fetch(this.action, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Change the color of the input to green
                    const input = document.getElementById('balise_alt_' + data.imageId);
                    input.classList.replace('border-danger', 'border-success');

                    // Show the badge "Modifié"
                    const badge = document.getElementById('badge-' + data.imageId);
                    badge.classList.remove('d-none');
                }
            })
            .catch(() => {
                console.error('Erreur lors de la mise à jour de la balise alt');
            });
        });
    });
});