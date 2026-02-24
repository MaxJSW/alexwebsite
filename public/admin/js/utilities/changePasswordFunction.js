// Fonction pour gérer la visibilité des mots de passe
document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault(); // Empêcher la soumission du formulaire
        
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        const icon = this.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// Animation au survol des boutons
document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.querySelector('i').style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.querySelector('i').style.transform = 'scale(1)';
    });
});

// Validation des champs requis
(function() {
    'use strict'
    
    // Validation des champs requis
    const forms = document.querySelectorAll('.needs-validation');
    Array.prototype.slice.call(forms).forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Vérification en temps réel des mots de passe
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmNewPassword');

    function checkPasswords() {
        if (confirmPassword.value !== newPassword.value) {
            confirmPassword.setCustomValidity('Les mots de passe ne correspondent pas');
        } else {
            confirmPassword.setCustomValidity('');
        }
    }

    if (newPassword && confirmPassword) {
        newPassword.addEventListener('change', checkPasswords);
        confirmPassword.addEventListener('keyup', checkPasswords);
    }
})();

//  Gestion de la redirection et des animations
(function() {
    const redirectMessage = document.getElementById('redirectMessage');
    const alertMessage = document.getElementById('alertMessage');
    const form = document.querySelector('form');

    if (alertMessage) {
        alertMessage.style.transition = 'opacity 0.5s ease-in-out';
        
        if (alertMessage.classList.contains('alert-success')) {
            alertMessage.classList.add('animate__animated', 'animate__fadeIn');
        }
    }

    // Gestion de la redirection en cas de succès
    if (redirectMessage && form) {
        form.querySelectorAll(':not(#alertMessage):not(#redirectMessage):not(#countdown)').forEach(element => {
            element.style.opacity = '0.5';
            element.style.pointerEvents = 'none';
        });
        if (alertMessage) alertMessage.style.opacity = '1';
        if (redirectMessage) redirectMessage.style.opacity = '1';
        
        let timeLeft = 5;
        const countdownElement = document.getElementById('countdown');
        
        if (countdownElement) {
            countdownElement.style.opacity = '1';
            const countdownInterval = setInterval(() => {
                timeLeft--;
                countdownElement.textContent = timeLeft;
                
                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    window.location.href = redirectMessage.dataset.redirectUrl || '/admin/connect';
                }
            }, 1000);
        }
    }
})();

// Validation des critères du mot de passe
(function() {
    const newPassword = document.getElementById('newPassword');
    const strengthBar = document.querySelector('.password-strength-bar');
    
    function findCapitalizedWords(str) {
        return str.match(/[A-Z][a-z]+/g) || [];
    }

    function updateStrengthBar(validCriteria) {
        const strength = (validCriteria / 5) * 100;
        strengthBar.style.width = `${strength}%`;
        
        if (strength < 40) {
            strengthBar.className = 'password-strength-bar strength-weak';
        } else if (strength < 80) {
            strengthBar.className = 'password-strength-bar strength-medium';
        } else {
            strengthBar.className = 'password-strength-bar strength-strong';
        }
    }

    function validatePassword() {
        const password = newPassword.value;
        let validCriteria = 0;
        const requirements = document.querySelectorAll('.password-requirements li');
        const hasMinLength = password.length >= 8;
        updateCriteria(0, hasMinLength);
        if (hasMinLength) validCriteria++;

        const capitalizedWords = findCapitalizedWords(password);
        const hasThreeCapitalWords = capitalizedWords.length >= 3;
        updateCriteria(1, hasThreeCapitalWords);
        if (hasThreeCapitalWords) validCriteria++;

        const hasLowerCase = /[a-z]/.test(password);
        updateCriteria(2, hasLowerCase);
        if (hasLowerCase) validCriteria++;

        const hasThreeNumbers = (password.match(/\d/g) || []).length >= 3;
        updateCriteria(3, hasThreeNumbers);
        if (hasThreeNumbers) validCriteria++;

        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\/]/.test(password);
        updateCriteria(4, hasSpecialChar);
        if (hasSpecialChar) validCriteria++;
        updateStrengthBar(validCriteria);

        // Mettre à jour la validité du champ
        if (validCriteria < 5) {
            newPassword.setCustomValidity('Veuillez respecter tous les critères du mot de passe');
        } else {
            newPassword.setCustomValidity('');
        }
    }

    function updateCriteria(index, isValid) {
        const li = document.querySelectorAll('.password-requirements li')[index];
        const icon = li.querySelector('i');
    
        if (isValid) {
            icon.className = 'fas fa-check';
            li.style.color = '#28a745';
        } else {
            icon.className = 'fas fa-circle';
            li.style.color = '#6c757d';
        }
    }

    if (newPassword) {
        newPassword.addEventListener('input', validatePassword);
    }
})();