    // fonction pour garder l"input de recherche focus (garde l'écran sur l'input de recherche lors de la recherche d'animaux)
    document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();

            // Move cursor to the end of the input
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
        }
    });


    // recherche en ajax pour les blocs d'animaux (sans rechargement de la page = plus fluide!)
    
    $(document).ready(function() {
        $('#searchInput').on('keyup', function() {
            const query = $(this).val().trim().toLowerCase();
    
            $.ajax({
                url: '/admin/myAnimals/searchAnimals',
                method: 'GET',
                data: { search: query },
                success: function(response) {
                    $('#animal-list').html(response);
                },
                error: function() {
                    console.error('Erreur lors de la recherche d\'animaux');
                }
            });
        });
    });
    
