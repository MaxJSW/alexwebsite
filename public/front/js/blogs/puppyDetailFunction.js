
//fonction qui gère le like d'un article
document.querySelector('.btn-like').addEventListener('click', async () => {
    const likeButton = document.querySelector('.btn-like');
    const likeCountSpan = likeButton.querySelector('.badge');
  
    try {
        const response = await fetch(`/chiots/a-vendre/${encodeURIComponent(breedSlug)}/${encodeURIComponent(puppySlug)}/like`, {
        method: 'POST'
      });
  
      const result = await response.json();
  
      if (response.ok && result.success) {
        likeCountSpan.textContent = result.likes;
        likeButton.classList.add('liked');
        setTimeout(() => likeButton.classList.remove('liked'), 500); 
      } else {
        console.error('Erreur lors de l\'ajout du like:', result.message);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du like:', error);
    }
  });


  //   fonction qui gère le like d'un article
document.querySelector('.btn-like-mobile').addEventListener('click', async () => {
    const likeButton = document.querySelector('.btn-like-mobile');
    const likeCountSpan = likeButton.querySelector('.badge');
  
    try {
        const response = await fetch(`/chiots/a-vendre/${encodeURIComponent(breedSlug)}/${encodeURIComponent(puppySlug)}/like`, {
        method: 'POST'
      });
  
      const result = await response.json();
  
      if (response.ok && result.success) {
        likeCountSpan.textContent = result.likes;
        likeButton.classList.add('liked');
        setTimeout(() => likeButton.classList.remove('liked'), 500); 
      } else {
        console.error('Erreur lors de l\'ajout du like:', result.message);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du like:', error);
    }
  });



// fonction copier le lien de l'article
function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => {
      showAlert("Lien copié dans le presse-papier !");
  }).catch(err => {
      showAlert("Erreur lors de la copie du lien : " + err, true);
  });
}

function showAlert(message, isError = false) {
    const alertBox = document.getElementById("alert-message-mobile");
    alertBox.textContent = message;
    alertBox.className = `alert-message-mobile ${isError ? 'error' : 'success'}`;
    alertBox.classList.remove("d-none");
    setTimeout(() => {
        alertBox.classList.add("d-none");
    }, 3000);
  }


// function to handle the share of a puppy (refaire la fonction de partage)
document.querySelectorAll('.btn-share').forEach(button => {
  button.addEventListener('click', function() {
      const imageElement = document.querySelector('.img-fluid');
      const imageUrl = imageElement ? window.location.origin + imageElement.getAttribute('src') : '';
      
      const shareData = {
          title: document.title,
          text: 'Découvrez cet article de l Élevage de Bel Air',
          url: window.location.href,
          image: imageUrl
      };

      if (navigator.share) {
          navigator.share({
              title: shareData.title,
              text: shareData.text,
              url: shareData.url
          })
          .catch(error => console.log('Erreur de partage:', error));
      } else {
          const shareLinks = {
              facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}&picture=${encodeURIComponent(shareData.image)}`,
              twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.title)}`,
              whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareData.title}\n${shareData.url}`)}`
          };

          // Fermer tous les menus de partage existants
          document.querySelectorAll('.share-menu').forEach(menu => menu.remove());

          // Créer un menu de partage personnalisé
          const shareMenu = document.createElement('div');
          shareMenu.className = 'share-menu position-absolute bg-white shadow-sm rounded p-2';
          shareMenu.style.zIndex = '1000';

          Object.entries(shareLinks).forEach(([network, url]) => {
              const link = document.createElement('a');
              link.href = url;
              link.target = '_blank';
              link.className = 'btn btn-sm btn-link d-block text-brown-1';
              link.textContent = network.charAt(0).toUpperCase() + network.slice(1);
              shareMenu.appendChild(link);
          });

          this.appendChild(shareMenu);

          // Fermer le menu au clic ailleurs
          document.addEventListener('click', function closeMenu(e) {
              if (!shareMenu.contains(e.target) && !e.target.classList.contains('btn-share')) {
                  shareMenu.remove();
                  document.removeEventListener('click', closeMenu);
              }
          });
      }
  });
});