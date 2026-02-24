document.addEventListener('DOMContentLoaded', function() {
    const header = document.getElementById('mainHeader');
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const body = document.body;
    const offcanvasNavbar = document.getElementById('offcanvasNavbar');
    let lastScroll = 0;
    
    // Animation du header au scroll
    if (header || navbar) {
        const nav = header || navbar;
        
        window.addEventListener('scroll', function() {
            // Ne pas modifier la navbar si le menu est ouvert
            if (body.classList.contains('offcanvas-open')) {
                return;
            }
            
            const currentScroll = window.pageYOffset;
            
            // Effet "scrolled" (réduction navbar)
            if (currentScroll > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            
            // TEST 1 : Seulement scroll-down (disparition)
            if (currentScroll > lastScroll && currentScroll > 150) {
                nav.classList.add('scroll-down');
            } else {
                nav.classList.remove('scroll-down');
            }
            
            lastScroll = currentScroll;
        });
    }
    
    // Marquer le lien actif
    const currentPath = window.location.pathname;
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        }
    });
    
    // Gestion de l'offcanvas
    if (offcanvasNavbar) {
        const nav = header || navbar;
        
        offcanvasNavbar.addEventListener('show.bs.offcanvas', function () {
            body.classList.add('offcanvas-open');
            if (nav) {
                nav.classList.remove('scroll-down');
            }
        });
        
        offcanvasNavbar.addEventListener('hidden.bs.offcanvas', function () {
            body.classList.remove('offcanvas-open');
        });
        
        // Fermer le menu après clic
        const mobileNavLinks = offcanvasNavbar.querySelectorAll('.nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                setTimeout(() => {
                    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasNavbar);
                    if (bsOffcanvas) {
                        bsOffcanvas.hide();
                    }
                }, 100);
            });
        });
    }
});





