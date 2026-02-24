        // Initialiser Fancybox avec les options
        Fancybox.bind('[data-fancybox]', {
            // Navigation avec flèches
            Toolbar: {
                display: {
                    left: ["infobar"],
                    middle: [],
                    right: ["slideshow", "thumbs", "close"]
                }
            },
            // Activer les boutons de navigation
            Carousel: {
                Navigation: true,
                infinite: true
            },
            // Animations
            animated: true,
            showClass: "fancybox-zoomIn",
            hideClass: "fancybox-fadeOut",
            // Activer le zoom
            Images: {
                zoom: true,
                protected: false
            },
            // Boutons de navigation visible
            Navigation: {
                prevTpl: '<button class="fancybox-button fancybox-button--arrow_left" title="Précédent"><i class="fas fa-chevron-left"></i></button>',
                nextTpl: '<button class="fancybox-button fancybox-button--arrow_right" title="Suivant"><i class="fas fa-chevron-right"></i></button>'
            }
        });