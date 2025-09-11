/**
 * EcoRide - JavaScript Principal
 * Fonctionnalités communes à toutes les pages
 */

// ========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les composants
    initDateInputs();
    initSearchForm();
    initSmoothScrolling();
    initFilters();
    initTooltips();
    
    console.log('✅ EcoRide JavaScript initialized');
});

// ========================================
// GESTION DES DATES
// ========================================
function initDateInputs() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    
    dateInputs.forEach(input => {
        // Définir la date minimum à aujourd'hui
        input.min = today;
        
        // Si pas de valeur, définir à aujourd'hui
        if (!input.value) {
            input.value = today;
        }
    });
}

// ========================================
// FORMULAIRE DE RECHERCHE
// ========================================
function initSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (!searchForm) return;
    
    searchForm.addEventListener('submit', handleSearchSubmit);
}

function handleSearchSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const departure = document.getElementById('departure')?.value || '';
    const arrival = document.getElementById('arrival')?.value || '';
    const date = document.getElementById('date')?.value || '';
    
    // Validation des champs
    if (!validateSearchForm(departure, arrival, date)) {
        return;
    }
    
    // Animation du bouton
    const submitBtn = event.target.querySelector('button[type="submit"]');
    showLoadingButton(submitBtn);
    
    // Simulation de recherche (en réalité, redirection vers la page de résultats)
    setTimeout(() => {
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            // Redirection vers la page de covoiturages avec paramètres
            const params = new URLSearchParams({
                depart: departure,
                arrivee: arrival,
                date: date
            });
            window.location.href = `covoiturages.html?${params.toString()}`;
        } else {
            // On est déjà sur la page de covoiturages, effectuer la recherche
            performSearch(departure, arrival, date);
            resetLoadingButton(submitBtn);
        }
    }, 1500);
}

function validateSearchForm(departure, arrival, date) {
    const errors = [];
    
    if (!departure.trim()) {
        errors.push('Veuillez saisir une ville de départ');
        highlightError('departure');
    }
    
    if (!arrival.trim()) {
        errors.push('Veuillez saisir une ville d\'arrivée');
        highlightError('arrival');
    }
    
    if (!date) {
        errors.push('Veuillez sélectionner une date');
        highlightError('date');
    }
    
    if (departure.toLowerCase() === arrival.toLowerCase()) {
        errors.push('Les villes de départ et d\'arrivée doivent être différentes');
        highlightError('departure');
        highlightError('arrival');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join('\n'), 'error');
        return false;
    }
    
    return true;
}

function highlightError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        setTimeout(() => field.classList.remove('is-invalid'), 3000);
    }
}

// ========================================
// GESTION DES FILTRES (PAGE COVOITURAGES)
// ========================================
function initFilters() {
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = this.value + '€';
            applyFilters();
        });
    }
    
    // Filter checkboxes and selects
    const filterInputs = document.querySelectorAll('.filters-sidebar input, .filters-sidebar select');
    filterInputs.forEach(input => {
        input.addEventListener('change', applyFilters);
    });
    
    // Clear filters button
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
    
    // Sort dropdown
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortRides(this.value);
        });
    }
}

function applyFilters() {
    const rides = document.querySelectorAll('.ride-card');
    if (rides.length === 0) return;
    
    // Récupérer les valeurs des filtres
    const filters = getFilterValues();
    let visibleCount = 0;

    rides.forEach(ride => {
        const rideData = getRideData(ride);
        const isVisible = matchesAllFilters(rideData, filters);
        
        ride.style.display = isVisible ? 'block' : 'none';
        if (isVisible) visibleCount++;
    });

    // Mettre à jour le compteur de résultats
    updateResultsCount(visibleCount);
    
    // Afficher/masquer le message "aucun résultat"
    toggleNoResults(visibleCount === 0);
}

function getFilterValues() {
    return {
        ecoOnly: document.getElementById('ecoOnly')?.checked || false,
        maxPrice: parseInt(document.getElementById('priceRange')?.value) || 100,
        maxDuration: parseInt(document.getElementById('durationFilter')?.value) || 999999,
        minRating: parseFloat(document.getElementById('ratingFilter')?.value) || 0,
        petsAllowed: document.getElementById('petsAllowed')?.checked || false,
        nonSmoking: document.getElementById('smokingAllowed')?.checked || false
    };
}

function getRideData(rideElement) {
    return {
        price: parseInt(rideElement.dataset.price) || 0,
        rating: parseFloat(rideElement.dataset.rating) || 0,
        isEcological: rideElement.dataset.ecological === 'true',
        duration: parseInt(rideElement.dataset.duration) || 0,
        allowsPets: rideElement.querySelector('.fa-paw') !== null,
        isNonSmoking: rideElement.querySelector('.fa-smoking-ban') !== null
    };
}

function matchesAllFilters(rideData, filters) {
    return (!filters.ecoOnly || rideData.isEcological) &&
           (rideData.price <= filters.maxPrice) &&
           (rideData.duration <= filters.maxDuration) &&
           (rideData.rating >= filters.minRating) &&
           (!filters.petsAllowed || rideData.allowsPets) &&
           (!filters.nonSmoking || rideData.isNonSmoking);
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        const text = count + ' covoiturage' + (count > 1 ? 's' : '') + ' trouvé' + (count > 1 ? 's' : '');
        resultsCount.textContent = text;
    }
}

function toggleNoResults(show) {
    const noResults = document.getElementById('noResults');
    const ridesList = document.getElementById('ridesList');
    
    if (noResults) noResults.style.display = show ? 'block' : 'none';
    if (ridesList) ridesList.style.display = show ? 'none' : 'block';
}

function clearAllFilters() {
    // Reset tous les filtres
    const checkboxes = document.querySelectorAll('.filters-sidebar input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    const selects = document.querySelectorAll('.filters-sidebar select');
    selects.forEach(select => select.selectedIndex = 0);
    
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange && priceValue) {
        priceRange.value = 50;
        priceValue.textContent = '50€';
    }
    
    // Réappliquer les filtres
    applyFilters();
    
    showNotification('Filtres effacés', 'success');
}

// ========================================
// TRI DES RÉSULTATS
// ========================================
function sortRides(criteria) {
    const ridesList = document.getElementById('ridesList');
    if (!ridesList) return;
    
    const rides = Array.from(ridesList.children);
    
    rides.sort((a, b) => {
        switch(criteria) {
            case 'price':
                return parseInt(a.dataset.price) - parseInt(b.dataset.price);
            case 'rating':
                return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
            case 'ecological':
                const aEco = a.dataset.ecological === 'true';
                const bEco = b.dataset.ecological === 'true';
                return bEco - aEco;
            case 'duration':
                return parseInt(a.dataset.duration) - parseInt(b.dataset.duration);
            default: // datetime
                return 0; // Garder l'ordre original
        }
    });

    // Réorganiser les éléments
    rides.forEach(ride => ridesList.appendChild(ride));
    
    showNotification('Résultats triés', 'info');
}

// ========================================
// RECHERCHE ET CHARGEMENT
// ========================================
function performSearch(departure, arrival, date) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const ridesList = document.getElementById('ridesList');
    
    // Afficher le spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (ridesList) ridesList.style.display = 'none';
    
    // Simulation d'appel API
    setTimeout(() => {
        // Masquer le spinner
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (ridesList) ridesList.style.display = 'block';
        
        // Réappliquer les filtres sur les nouveaux résultats
        applyFilters();
        
        showNotification(`Recherche effectuée pour ${departure} → ${arrival}`, 'success');
    }, 1500);
}

// ========================================
// NAVIGATION ET UX
// ========================================
function initSmoothScrolling() {
    // Smooth scrolling pour les liens d'ancrage
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initTooltips() {
    // Initialiser les tooltips Bootstrap si présents
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => 
            new bootstrap.Tooltip(tooltipTriggerEl)
        );
    }
}

// ========================================
// UTILITAIRES UI
// ========================================
function showLoadingButton(button) {
    if (!button) return;
    
    const originalText = button.innerHTML;
    button.dataset.originalText = originalText;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Recherche...';
    button.disabled = true;
}

function resetLoadingButton(button) {
    if (!button) return;
    
    const originalText = button.dataset.originalText;
    if (originalText) {
        button.innerHTML = originalText;
    }
    button.disabled = false;
}

function showNotification(message, type = 'info') {
    // Créer une notification toast
    const toast = createToast(message, type);
    document.body.appendChild(toast);
    
    // Afficher avec animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Masquer et supprimer après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

function createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}" style="color: ${colors[type]}"></i>
        <span>${message}</span>
    `;
    
    // Styles inline pour le toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '9999',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        fontSize: '14px'
    });
    
    // Classe pour l'animation
    const style = document.createElement('style');
    style.textContent = `
        .toast-notification.show {
            transform: translateX(0) !important;
        }
    `;
    document.head.appendChild(style);
    
    return toast;
}

// ========================================
// GESTION DES DÉTAILS DE COVOITURAGE
// ========================================
function viewRideDetails(rideId) {
    // En production, rediriger vers la page de détails
    // Pour la démo, afficher une modal ou une notification
    showNotification(`Redirection vers les détails du covoiturage #${rideId}`, 'info');
    
    // Exemple de redirection (à activer en production)
    // window.location.href = `detail-covoiturage.html?id=${rideId}`;
}

// ========================================
// GESTION DES PARAMÈTRES URL
// ========================================
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function populateSearchFromUrl() {
    const departure = getUrlParameter('depart');
    const arrival = getUrlParameter('arrivee');
    const date = getUrlParameter('date');
    
    if (departure) {
        const departureField = document.getElementById('departure');
        if (departureField) departureField.value = departure;
    }
    
    if (arrival) {
        const arrivalField = document.getElementById('arrival');
        if (arrivalField) arrivalField.value = arrival;
    }
    
    if (date) {
        const dateField = document.getElementById('date');
        if (dateField) dateField.value = date;
    }
    
    // Si des paramètres sont présents, lancer automatiquement la recherche
    if (departure && arrival && date) {
        setTimeout(() => {
            performSearch(departure, arrival, date);
        }, 500);
    }
}

// ========================================
// VALIDATION TEMPS RÉEL
// ========================================
function initRealTimeValidation() {
    const inputs = document.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            // Supprimer l'indication d'erreur lors de la saisie
            this.classList.remove('is-invalid');
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const isValid = value.length > 0;
    
    if (!isValid) {
        field.classList.add('is-invalid');
        return false;
    } else {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        return true;
    }
}

// ========================================
// GESTION DE LA GÉOLOCALISATION (BONUS)
// ========================================
function initGeolocation() {
    const geoButton = document.getElementById('useLocation');
    if (!geoButton) return;
    
    geoButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    getCityFromCoords(latitude, longitude);
                },
                error => {
                    showNotification('Impossible d\'obtenir votre position', 'error');
                }
            );
        } else {
            showNotification('Géolocalisation non supportée', 'error');
        }
    });
}

function getCityFromCoords(lat, lon) {
    // En production, utiliser une API de géocodage inverse
    // Exemple avec OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const city = data.address.city || data.address.town || data.address.village;
            if (city) {
                const departureField = document.getElementById('departure');
                if (departureField) {
                    departureField.value = city;
                    showNotification(`Position détectée: ${city}`, 'success');
                }
            }
        })
        .catch(error => {
            showNotification('Erreur lors de la détection de la ville', 'error');
        });
}

// ========================================
// INITIALISATION SPÉCIFIQUE AUX PAGES
// ========================================
function initPageSpecificFeatures() {
    // Identifier la page actuelle
    const currentPage = window.location.pathname.split('/').pop();
    
    switch(currentPage) {
        case 'covoiturages.html':
            populateSearchFromUrl();
            initRealTimeValidation();
            break;
            
        case 'index.html':
        case '':
            initGeolocation();
            break;
    }
}

// Initialiser les fonctionnalités spécifiques après le DOM
document.addEventListener('DOMContentLoaded', function() {
    initPageSpecificFeatures();
});

// ========================================
// EXPORT POUR UTILISATION GLOBALE
// ========================================
// Rendre certaines fonctions accessibles globalement
window.EcoRide = {
    viewRideDetails,
    showNotification,
    applyFilters,
    sortRides,
    clearAllFilters
};