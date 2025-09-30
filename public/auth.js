// Gestion de l'authentification
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Gestion du formulaire de connexion
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }

    // Gestion du formulaire d'inscription
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegister();
        });
    }

    // Vérifier la session au chargement
    checkSession();

    // Debug: Afficher l'état de session dans la console
    debugSessionState();
});

function handleLogin() {
    const form = document.getElementById('loginForm');
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    if (!email || !password) {
        showAlert('Veuillez remplir tous les champs', 'warning');
        return;
    }

    showLoadingButton('login', true);

    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Connexion réussie ! Redirection...', 'success');
            setTimeout(() => {
                window.location.href = 'covoiturages.html';
            }, 1500);
        } else {
            showAlert(data.error || 'Erreur de connexion', 'danger');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'danger');
    })
    .finally(() => {
        showLoadingButton('login', false);
    });
}

function handleRegister() {
    const form = document.getElementById('registerForm');
    const pseudo = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('#registerPassword').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;

    if (!pseudo || !email || !password || !confirmPassword) {
        showAlert('Veuillez remplir tous les champs', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Les mots de passe ne correspondent pas', 'danger');
        return;
    }

    if (password.length < 6) {
        showAlert('Le mot de passe doit contenir au moins 6 caractères', 'warning');
        return;
    }

    showLoadingButton('register', true);

    fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ pseudo, email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Compte créé avec succès ! Redirection...', 'success');
            setTimeout(() => {
                window.location.href = 'covoiturages.html';
            }, 1500);
        } else {
            showAlert(data.error || 'Erreur lors de la création du compte', 'danger');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'danger');
    })
    .finally(() => {
        showLoadingButton('register', false);
    });
}

function handleLogout() {
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Déconnexion réussie', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        // Rediriger quand même
        window.location.href = 'index.html';
    });
}

function checkSession() {
    console.log('Vérification de la session...');
    fetch('/api/auth/session', {
        credentials: 'include' // Important pour inclure les cookies de session
    })
    .then(response => {
        console.log('Réponse session:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Données session:', data);
        updateNavigationUI(data.isLoggedIn, data.user);
    })
    .catch(error => {
        console.error('Erreur lors de la vérification de la session:', error);
        updateNavigationUI(false);
    });
}

function updateNavigationUI(isLoggedIn, user = null) {
    console.log('Mise à jour navigation UI:', { isLoggedIn, user });
    const navLinks = document.querySelector('.navbar-nav');

    if (!navLinks) {
        console.error('Navigation non trouvée');
        return;
    }

    if (isLoggedIn && user) {
        // Utilisateur connecté - modifier la navigation
        let loginLink = navLinks.querySelector('a[href="connexion.html"], a[href="./connexion.html"]');
        if (loginLink) {
            const parentLi = loginLink.parentElement;

            // Remplacer le lien connexion par un dropdown utilisateur
            parentLi.innerHTML = `
                <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-user me-1"></i>${user.pseudo}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" onclick="showProfile()">
                            <i class="fas fa-user me-2"></i>Mon profil
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="showMyRides()">
                            <i class="fas fa-car me-2"></i>Mes trajets
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="handleLogout()">
                            <i class="fas fa-sign-out-alt me-2"></i>Déconnexion
                        </a></li>
                    </ul>
                </div>
            `;
            console.log('Navigation mise à jour pour utilisateur connecté');
        } else {
            console.log('Lien de connexion non trouvé');
        }
    } else {
        // Utilisateur non connecté - navigation par défaut
        const userDropdown = navLinks.querySelector('.dropdown');
        if (userDropdown) {
            const parentLi = userDropdown.parentElement;
            parentLi.innerHTML = `
                <a class="nav-link" href="connexion.html">Connexion</a>
            `;
            console.log('Navigation restaurée pour utilisateur non connecté');
        }
    }
}

function showProfile() {
    // Rediriger vers la page de profil
    window.location.href = 'profil.html';
}

function showMyRides() {
    // Rediriger vers la page de profil, onglet "Mes trajets"
    window.location.href = 'profil.html#my-rides';
}

function switchTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Retirer les classes actives
    loginTab.classList.remove('active');
    registerTab.classList.remove('active');
    tabBtns.forEach(btn => btn.classList.remove('active'));

    // Activer l'onglet sélectionné
    if (tab === 'login') {
        loginTab.classList.add('active');
        tabBtns[0].classList.add('active');
    } else {
        registerTab.classList.add('active');
        tabBtns[1].classList.add('active');
    }
}

function showForgotPassword() {
    showAlert('Fonctionnalité "Mot de passe oublié" à venir', 'info');
}

function showLoadingButton(type, loading) {
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    const registerBtn = document.querySelector('#registerForm button[type="submit"]');

    if (type === 'login' && loginBtn) {
        if (loading) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Connexion...';
            loginBtn.disabled = true;
        } else {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Se connecter';
            loginBtn.disabled = false;
        }
    } else if (type === 'register' && registerBtn) {
        if (loading) {
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';
            registerBtn.disabled = true;
        } else {
            registerBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Créer mon compte';
            registerBtn.disabled = false;
        }
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto-dismiss après 5 secondes
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function debugSessionState() {
    console.log('=== DEBUG SESSION STATE ===');

    // Vérifier les cookies dans le navigateur
    console.log('Cookies du navigateur:', document.cookie);

    // Tester l'API session
    fetch('/api/auth/session', {
        credentials: 'include'
    })
    .then(response => {
        console.log('Status API session:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Réponse API session:', data);
        if (data.isLoggedIn) {
            console.log('✅ Utilisateur connecté:', data.user.pseudo);
        } else {
            console.log('❌ Utilisateur NON connecté');
        }
    })
    .catch(error => {
        console.error('Erreur API session:', error);
    });

    console.log('=== FIN DEBUG SESSION ===');
}