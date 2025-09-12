/**
 * EcoRide - JavaScript Complet pour la Page Covoiturages
 * Toutes les fonctionnalités de recherche, filtres et interactions
 */

// Variables globales
let currentFilters = {
    ecoOnly: false,
    maxPrice: 100,
    maxDuration: 999999,
    minRating: 0,
    petsAllowed: false,
    nonSmoking: false
};

let currentSort = 'datetime';
let allRides = [];

// =====================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// =====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚗 Initialisation de la page Covoiturages...');
    
    // Initialiser tous les composants
    initDateInputs();
    initSearchForm();
    initFilters();
    initSorting();
    initRideCards();
    populateFromURL();
    
    // Sauvegarder la liste initiale des trajets
    saveInitialRides();
    
    console.log('✅ Page Covoiturages initialisée avec succès');
});

// =====================================
// INITIALISATION DES COMPOSANTS
// =====================================

function initDateInputs() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        
        if (!dateInput.value) {
            dateInput.value = today;
        }
    }
}

function initSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }
}

function initFilters() {
    console.log('🔧 Initialisation des filtres...');
    
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = this.value + '€';
            currentFilters.maxPrice = parseInt(this.value);
            applyFilters();
        });
        
        // Initialiser la valeur affichée
        priceValue.textContent = priceRange.value + '€';
        currentFilters.maxPrice = parseInt(priceRange.value);
    }
    
    // Checkbox filters
    const ecoOnly = document.getElementById('ecoOnly');
    if (ecoOnly) {
        ecoOnly.addEventListener('change', function() {
            currentFilters.ecoOnly = this.checked;
            applyFilters();
        });
    }
    
    const petsAllowed = document.getElementById('petsAllowed');
    if (petsAllowed) {
        petsAllowed.addEventListener('change', function() {
            currentFilters.petsAllowed = this.checked;
            applyFilters();
        });
    }
    
    const smokingAllowed = document.getElementById('smokingAllowed');
    if (smokingAllowed) {
        smokingAllowed.addEventListener('change', function() {
            currentFilters.nonSmoking = this.checked;
            applyFilters();
        });
    }
    
    // Select filters
    const durationFilter = document.getElementById('durationFilter');
    if (durationFilter) {
        durationFilter.addEventListener('change', function() {
            currentFilters.maxDuration = this.value ? parseInt(this.value) : 999999;
            applyFilters();
        });
    }
    
    const ratingFilter = document.getElementById('ratingFilter');
    if (ratingFilter) {
        ratingFilter.addEventListener('change', function() {
            currentFilters.minRating = this.value ? parseFloat(this.value) : 0;
            applyFilters();
        });
    }
    
    // Clear filters button
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
    
    console.log('✅ Filtres initialisés');
}

function initSorting() {
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            sortRides(this.value);
        });
    }
}

function initRideCards() {
    // Ajouter les event listeners pour tous les boutons "Détails"
    const detailButtons = document.querySelectorAll('.btn-detail');
    detailButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const rideCard = this.closest('.ride-card');
            const rideId = rideCard ? rideCard.dataset.rideId : Math.floor(Math.random() * 100);
            viewRideDetails(rideId);
        });
    });
    
    // Animation d'entrée des cartes
    animateRideCards();
}

function saveInitialRides() {
    allRides = Array.from(document.querySelectorAll('.ride-card')).map(card => ({
        element: card,
        price: parseInt(card.dataset.price) || 0,
        rating: parseFloat(card.dataset.rating) || 0,
        ecological: card.dataset.ecological === 'true',
        duration: parseInt(card.dataset.duration) || 0,
        rideId: card.dataset.rideId || Math.floor(Math.random() * 1000)
    }));
    
    console.log(`📊 ${allRides.length} trajets sauvegardés`);
}

// =====================================
// FONCTIONS DE RECHERCHE
// =====================================

function handleSearchSubmit(event) {
    event.preventDefault();
    
    const departure = document.getElementById('departure').value;
    const arrival = document.getElementById('arrival').value;
    const date = document.getElementById('date').value;
    
    if (!validateSearchInputs(departure, arrival, date)) {
        return;
    }
    
    // Animation du bouton de recherche
    const submitBtn = event.target.querySelector('button[type="submit"]');
    showLoadingButton(submitBtn);
    
    // Simuler la recherche
    performSearch(departure, arrival, date).then(() => {
        resetButton(submitBtn);
    });
}

function validateSearchInputs(departure, arrival, date) {
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

function performSearch(departure, arrival, date) {
    return new Promise((resolve) => {
        console.log(`🔍 Recherche: ${departure} → ${arrival} le ${date}`);
        
        // Afficher le spinner de chargement
        showLoadingSpinner();
        
        setTimeout(() => {
            // Masquer le spinner
            hideLoadingSpinner();
            
            // Réappliquer les filtres sur les résultats
            applyFilters();
            
            // Notification de succès
            showNotification(`Recherche effectuée pour ${departure} → ${arrival}`, 'success');
            
            resolve();
        }, 1500);
    });
}

function populateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const departure = urlParams.get('depart');
    const arrival = urlParams.get('arrivee');
    const date = urlParams.get('date');
    
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
    
    // Si tous les paramètres sont présents, lancer une recherche automatique
    if (departure && arrival && date) {
        setTimeout(() => {
            performSearch(departure, arrival, date);
        }, 500);
    }
}

// =====================================
// SYSTÈME DE FILTRES
// =====================================

function applyFilters() {
    console.log('🔧 Application des filtres...', currentFilters);
    
    const rides = document.querySelectorAll('.ride-card');
    if (rides.length === 0) {
        console.warn('⚠️ Aucune carte de trajet trouvée');
        return;
    }
    
    let visibleCount = 0;
    
    rides.forEach(ride => {
        const rideData = extractRideData(ride);
        const isVisible = matchesAllFilters(rideData, currentFilters);
        
        // Appliquer l'affichage avec animation
        if (isVisible) {
            showRideCard(ride);
            visibleCount++;
        } else {
            hideRideCard(ride);
        }
    });
    
    // Mettre à jour l'interface
    updateResultsCount(visibleCount);
    toggleNoResultsMessage(visibleCount === 0);
    
    // Réappliquer le tri sur les éléments visibles
    if (currentSort !== 'datetime') {
        sortRides(currentSort);
    }
    
    console.log(`✅ Filtrage terminé: ${visibleCount} trajets visibles`);
}

function extractRideData(rideElement) {
    return {
        price: parseInt(rideElement.dataset.price) || 0,
        rating: parseFloat(rideElement.dataset.rating) || 0,
        ecological: rideElement.dataset.ecological === 'true',
        duration: parseInt(rideElement.dataset.duration) || 0,
        allowsPets: rideElement.querySelector('.fa-paw') !== null,
        nonSmoking: rideElement.querySelector('.fa-smoking-ban') !== null
    };
}

function matchesAllFilters(rideData, filters) {
    return (
        (!filters.ecoOnly || rideData.ecological) &&
        (rideData.price <= filters.maxPrice) &&
        (rideData.duration <= filters.maxDuration) &&
        (rideData.rating >= filters.minRating) &&
        (!filters.petsAllowed || rideData.allowsPets) &&
        (!filters.nonSmoking || rideData.nonSmoking)
    );
}

function clearAllFilters() {
    console.log('🧹 Effacement de tous les filtres');
    
    // Reset des checkboxes
    const checkboxes = document.querySelectorAll('.filters-sidebar input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset des selects
    const selects = document.querySelectorAll('.filters-sidebar select');
    selects.forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Reset du price range
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange && priceValue) {
        priceRange.value = 100;
        priceValue.textContent = '100€';
    }
    
    // Reset de l'objet filters
    currentFilters = {
        ecoOnly: false,
        maxPrice: 100,
        maxDuration: 999999,
        minRating: 0,
        petsAllowed: false,
        nonSmoking: false
    };
    
    // Réappliquer les filtres
    applyFilters();
    
    showNotification('Filtres effacés', 'success');
}

// =====================================
// SYSTÈME DE TRI
// =====================================

function sortRides(criteria) {
    console.log(`🔄 Tri par: ${criteria}`);
    
    const ridesList = document.getElementById('ridesList');
    if (!ridesList) return;
    
    const rides = Array.from(ridesList.querySelectorAll('.ride-card:not([style*="display: none"])'));
    
    rides.sort((a, b) => {
        switch(criteria) {
            case 'price':
                return parseInt(a.dataset.price) - parseInt(b.dataset.price);
            
            case 'rating':
                return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
            
            case 'ecological':
                const aEco = a.dataset.ecological === 'true';
                const bEco = b.dataset.ecological === 'true';
                if (aEco === bEco) {
                    // Si même type, trier par prix
                    return parseInt(a.dataset.price) - parseInt(b.dataset.price);
                }
                return bEco - aEco;
            
            case 'duration':
                return parseInt(a.dataset.duration) - parseInt(b.dataset.duration);
            
            default: // datetime
                return 0; // Garder l'ordre original
        }
    });
    
    // Réorganiser les éléments dans le DOM
    rides.forEach(ride => ridesList.appendChild(ride));
    
    // Animer les cartes réorganisées
    animateRideCards();
}

// =====================================
// FONCTIONS D'ANIMATION ET UI
// =====================================

function showRideCard(card) {
    card.style.display = 'block';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    // Animation d'apparition
    setTimeout(() => {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, 50);
}

function hideRideCard(card) {
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        card.style.display = 'none';
    }, 300);
}

function animateRideCards() {
    const visibleCards = document.querySelectorAll('.ride-card:not([style*="display: none"])');
    
    visibleCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        const text = `${count} covoiturage${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}`;
        resultsCount.textContent = text;
    }
}

function toggleNoResultsMessage(show) {
    const noResults = document.getElementById('noResults');
    const ridesList = document.getElementById('ridesList');
    
    if (noResults) {
        noResults.style.display = show ? 'block' : 'none';
    }
    
    if (ridesList) {
        ridesList.style.display = show ? 'none' : 'block';
    }
}

function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    const ridesList = document.getElementById('ridesList');
    
    if (spinner) spinner.style.display = 'block';
    if (ridesList) ridesList.style.display = 'none';
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    const ridesList = document.getElementById('ridesList');
    
    if (spinner) spinner.style.display = 'none';
    if (ridesList) ridesList.style.display = 'block';
}

// =====================================
// FONCTIONS UTILITAIRES
// =====================================

function showLoadingButton(button) {
    if (!button) return;
    
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Recherche...';
    button.disabled = true;
}

function resetButton(button) {
    if (!button) return;
    
    const originalText = button.dataset.originalText;
    if (originalText) {
        button.innerHTML = originalText;
    }
    button.disabled = false;
}

function highlightError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        field.style.borderColor = '#dc3545';
        
        setTimeout(() => {
            field.classList.remove('is-invalid');
            field.style.borderColor = '';
        }, 3000);
    }
}

function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 1050;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="${icons[type]} me-2"></i>
        ${message.replace(/\n/g, '<br>')}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// =====================================
// FONCTIONS D'INTERACTION
// =====================================

function viewRideDetails(rideId) {
    console.log(`👁️ Affichage des détails du trajet ${rideId}`);
    
    // En production, rediriger vers une page de détails
    // window.location.href = `detail-trajet.html?id=${rideId}`;
    
    // Pour la démo, afficher une modal ou notification
    showNotification(`Redirection vers les détails du covoiturage #${rideId}`, 'info');
}

// =====================================
// FONCTIONS DE DÉBOGAGE
// =====================================

function debugFilters() {
    console.log('🐛 État actuel des filtres:', currentFilters);
    console.log('🐛 Nombre total de trajets:', allRides.length);
    
    const visibleRides = document.querySelectorAll('.ride-card:not([style*="display: none"])');
    console.log('🐛 Trajets visibles:', visibleRides.length);
    
    // Test de chaque filtre
    allRides.forEach((ride, index) => {
        const rideData = extractRideData(ride.element);
        const matches = matchesAllFilters(rideData, currentFilters);
        console.log(`🐛 Trajet ${index + 1}:`, rideData, '→', matches ? '✅' : '❌');
    });
}

function testAllFilters() {
    console.log('🧪 Test de tous les filtres...');
    
    // Test filtre écologique
    document.getElementById('ecoOnly').checked = true;
    currentFilters.ecoOnly = true;
    applyFilters();
    
    setTimeout(() => {
        // Reset et test prix
        clearAllFilters();
        setTimeout(() => {
            document.getElementById('priceRange').value = '30';
            document.getElementById('priceRange').dispatchEvent(new Event('input'));
        }, 500);
    }, 2000);
}

// =====================================
// EXPORT GLOBAL
// =====================================

// Rendre certaines fonctions accessibles globalement
window.EcoRideFilters = {
    applyFilters,
    clearAllFilters,
    sortRides,
    viewRideDetails,
    debugFilters,
    testAllFilters
};

// Pour compatibilité avec les anciens appels
window.viewRideDetails = viewRideDetails;
window.applyFilters = applyFilters;

console.log('🎯 Module de filtres EcoRide chargé et prêt !');

// teste filtre
<script>
// Initialisation des filtres
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation des filtres...');
    
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = this.value + '€';
            applyFilters();
        });
    }
    
    // Tous les autres filtres
    const filterInputs = document.querySelectorAll('#ecoOnly, #durationFilter, #ratingFilter, #petsAllowed, #smokingAllowed');
    filterInputs.forEach(input => {
        input.addEventListener('change', applyFilters);
    });
    
    // Bouton clear filters
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
    
    // Définir la date minimum
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    console.log('Filtres initialisés !');
});

// Fonction principale d'application des filtres
function applyFilters() {
    console.log('Application des filtres...');
    
    const rides = document.querySelectorAll('.ride-card');
    if (rides.length === 0) {
        console.log('Aucune carte trouvée');
        return;
    }
    
    // Récupérer les valeurs des filtres
    const ecoOnly = document.getElementById('ecoOnly')?.checked || false;
    const maxPrice = parseInt(document.getElementById('priceRange')?.value) || 100;
    const maxDuration = parseInt(document.getElementById('durationFilter')?.value) || 999999;
    const minRating = parseFloat(document.getElementById('ratingFilter')?.value) || 0;
    const petsAllowed = document.getElementById('petsAllowed')?.checked || false;
    const nonSmoking = document.getElementById('smokingAllowed')?.checked || false;
    
    console.log('Filtres appliqués:', { ecoOnly, maxPrice, maxDuration, minRating, petsAllowed, nonSmoking });
    
    let visibleCount = 0;

    rides.forEach(ride => {
        const price = parseInt(ride.dataset.price) || 0;
        const rating = parseFloat(ride.dataset.rating) || 0;
        const isEcological = ride.dataset.ecological === 'true';
        const duration = parseInt(ride.dataset.duration) || 0;
        
        // Check pets
        const rideAllowsPets = ride.querySelector('.fa-paw') !== null;
        const petsMatch = !petsAllowed || rideAllowsPets;
        
        // Check smoking
        const rideIsNonSmoking = ride.querySelector('.fa-smoking-ban') !== null;
        const smokingMatch = !nonSmoking || rideIsNonSmoking;

        const matches = 
            (!ecoOnly || isEcological) &&
            (price <= maxPrice) &&
            (duration <= maxDuration) &&
            (rating >= minRating) &&
            petsMatch &&
            smokingMatch;
        
        ride.style.display = matches ? 'block' : 'none';
        if (matches) visibleCount++;
    });

    // Mettre à jour le compteur
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        const text = visibleCount + ' covoiturage' + (visibleCount > 1 ? 's' : '') + ' trouvé' + (visibleCount > 1 ? 's' : '');
        resultsCount.textContent = text;
    }
    
    // Afficher/masquer le message "aucun résultat"
    const noResults = document.getElementById('noResults');
    const ridesList = document.getElementById('ridesList');
    
    if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    if (ridesList) ridesList.style.display = visibleCount === 0 ? 'none' : 'block';
    
    console.log(visibleCount + ' trajets visibles');
}

// Fonction pour effacer tous les filtres
function clearAllFilters() {
    console.log('Effacement des filtres...');
    
    // Reset checkboxes
    const checkboxes = document.querySelectorAll('.filters-sidebar input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Reset selects
    const selects = document.querySelectorAll('.filters-sidebar select');
    selects.forEach(select => select.selectedIndex = 0);
    
    // Reset price range
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange && priceValue) {
        priceRange.value = 50;
        priceValue.textContent = '50€';
    }
    
    // Réappliquer les filtres
    applyFilters();
}

// Fonction de tri
function sortRides(criteria) {
    console.log('Tri par:', criteria);
    
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
            default:
                return 0;
        }
    });

    rides.forEach(ride => ridesList.appendChild(ride));
}

// Fonction pour voir les détails (appelée par les boutons)
function viewRideDetails(rideId) {
    alert('Redirection vers les détails du covoiturage #' + rideId + '\n\nCette fonctionnalité sera implémentée dans une future version.');
}

// Test de fonctionnalité
function testFilters() {
    console.log('Test des filtres...');
    const ecoCheckbox = document.getElementById('ecoOnly');
    if (ecoCheckbox) {
        ecoCheckbox.checked = true;
        applyFilters();
        console.log('Filtre écologique activé pour test');
    }
}
// =====================================
// GESTION DES BOUTONS DÉTAILS ET RÉSERVER
// =====================================

// Données de test pour les trajets
const rideData = {
    1: {
        id: 1,
        driver: "MarieDriveGreen",
        driverRating: 4.8,
        driverReviews: 24,
        departure: "Paris",
        arrival: "Lyon",
        departureTime: "14:00",
        arrivalTime: "18:30",
        date: "15 septembre 2025",
        duration: "4h 30min",
        price: 35,
        seatsAvailable: 3,
        totalSeats: 4,
        vehicle: "Tesla Model 3 - Blanche",
        ecological: true,
        description: "Trajet écologique Paris-Lyon en Tesla. Musique d'ambiance et bonne humeur !",
        preferences: {
            pets: true,
            smoking: false,
            music: true,
            conversation: "Modérée"
        },
        driverPhone: "+33 6 12 34 56 78"
    },
    2: {
        id: 2,
        driver: "MarieDriveGreen",
        driverRating: 4.6,
        driverReviews: 18,
        departure: "Lyon",
        arrival: "Marseille",
        departureTime: "09:00",
        arrivalTime: "12:15",
        date: "16 septembre 2025",
        duration: "3h 15min",
        price: 28,
        seatsAvailable: 2,
        totalSeats: 3,
        vehicle: "Renault ZOE - Bleue",
        ecological: true,
        description: "Trajet matinal Lyon-Marseille. Véhicule 100% électrique !",
        preferences: {
            pets: false,
            smoking: false,
            music: true,
            conversation: "Peu"
        }
    },
    3: {
        id: 3,
        driver: "JeanEcoDriver",
        driverRating: 4.2,
        driverReviews: 31,
        departure: "Paris",
        arrival: "Bordeaux",
        departureTime: "08:00",
        arrivalTime: "13:45",
        date: "17 septembre 2025",
        duration: "5h 45min",
        price: 42,
        seatsAvailable: 3,
        totalSeats: 4,
        vehicle: "Toyota Prius - Grise",
        ecological: false,
        description: "Paris-Bordeaux en véhicule hybride. Arrêt possible aire de repos.",
        preferences: {
            pets: true,
            smoking: false,
            music: true,
            conversation: "Beaucoup"
        }
    }
};

// =====================================
// FONCTION POUR AFFICHER LES DÉTAILS
// =====================================

function viewRideDetails(rideId) {
    console.log(`Affichage des détails du trajet ${rideId}`);
    
    const ride = rideData[rideId];
    if (!ride) {
        showNotification('Trajet non trouvé', 'error');
        return;
    }
    
    // Créer et afficher la modal de détails
    const modalHtml = createDetailsModal(ride);
    
    // Supprimer une éventuelle modal existante
    const existingModal = document.getElementById('rideDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Ajouter la nouvelle modal au DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Afficher la modal
    const modal = new bootstrap.Modal(document.getElementById('rideDetailsModal'));
    modal.show();
    
    // Nettoyer la modal après fermeture
    document.getElementById('rideDetailsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function createDetailsModal(ride) {
    const starsHtml = generateStars(ride.driverRating);
    const ecoIcon = ride.ecological ? 
        '<i class="fas fa-leaf text-success me-1"></i>Véhicule électrique' : 
        '<i class="fas fa-gas-pump text-warning me-1"></i>Véhicule hybride/essence';
    
    return `
        <div class="modal fade" id="rideDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-route me-2"></i>
                            ${ride.departure} → ${ride.arrival}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <!-- Informations du trajet -->
                            <div class="col-md-8">
                                <h6 class="text-success mb-3">
                                    <i class="fas fa-info-circle me-2"></i>Détails du trajet
                                </h6>
                                
                                <div class="mb-3">
                                    <div class="d-flex align-items-center mb-2">
                                        <div class="me-4">
                                            <i class="fas fa-play-circle text-success"></i>
                                            <strong>${ride.departureTime}</strong> - ${ride.departure}
                                        </div>
                                        <div class="flex-fill">
                                            <hr style="border: 2px solid #28a745; margin: 0;">
                                        </div>
                                        <div class="ms-4">
                                            <i class="fas fa-stop-circle text-danger"></i>
                                            <strong>${ride.arrivalTime}</strong> - ${ride.arrival}
                                        </div>
                                    </div>
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>${ride.date}
                                        <i class="fas fa-clock ms-3 me-1"></i>${ride.duration}
                                    </small>
                                </div>
                                
                                <div class="mb-3">
                                    <strong>Véhicule :</strong> ${ride.vehicle}<br>
                                    ${ecoIcon}
                                </div>
                                
                                <div class="mb-3">
                                    <strong>Description :</strong><br>
                                    <p class="text-muted">${ride.description}</p>
                                </div>
                                
                                <h6 class="text-success mb-2">
                                    <i class="fas fa-cog me-2"></i>Préférences du conducteur
                                </h6>
                                <ul class="list-unstyled">
                                    <li><i class="fas ${ride.preferences.pets ? 'fa-check text-success' : 'fa-times text-danger'} me-2"></i>Animaux ${ride.preferences.pets ? 'acceptés' : 'non acceptés'}</li>
                                    <li><i class="fas ${ride.preferences.smoking ? 'fa-smoking' : 'fa-smoking-ban'} me-2"></i>${ride.preferences.smoking ? 'Fumeur' : 'Non-fumeur'}</li>
                                    <li><i class="fas fa-music me-2 text-info"></i>Musique : ${ride.preferences.music ? 'Autorisée' : 'Non souhaitée'}</li>
                                    <li><i class="fas fa-comments me-2 text-primary"></i>Conversation : ${ride.preferences.conversation}</li>
                                </ul>
                            </div>
                            
                            <!-- Informations du chauffeur -->
                            <div class="col-md-4">
                                <div class="card bg-light">
                                    <div class="card-body text-center">
                                        <h6 class="text-success mb-3">
                                            <i class="fas fa-user me-2"></i>Chauffeur
                                        </h6>
                                        
                                        <div class="driver-avatar mx-auto mb-3" style="width: 80px; height: 80px; font-size: 2rem;">
                                            ${ride.driver.charAt(0)}
                                        </div>
                                        
                                        <h6 class="mb-2">${ride.driver}</h6>
                                        
                                        <div class="rating mb-3">
                                            ${starsHtml}
                                            <div><small class="text-muted">${ride.driverReviews} avis</small></div>
                                        </div>
                                        
                                        <hr>
                                        
                                        <div class="text-center">
                                            <div class="mb-2">
                                                <i class="fas fa-users text-primary"></i>
                                                <strong>${ride.seatsAvailable}/${ride.totalSeats}</strong> places
                                            </div>
                                            <div class="h4 text-success mb-3">
                                                <strong>${ride.price}€</strong>
                                                <small class="text-muted d-block">par personne</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Fermer
                        </button>
                        <button type="button" class="btn btn-success btn-lg" onclick="showReservationModal(${ride.id})" data-bs-dismiss="modal">
                            <i class="fas fa-calendar-plus me-2"></i>Réserver ce trajet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =====================================
// FONCTION POUR RÉSERVER
// =====================================

function showReservationModal(rideId) {
    console.log(`Tentative de réservation pour le trajet ${rideId}`);
    
    const ride = rideData[rideId];
    if (!ride) {
        showNotification('Trajet non trouvé', 'error');
        return;
    }
    
    // Vérifier si l'utilisateur est connecté (simulation)
    const isLoggedIn = checkUserLogin();
    if (!isLoggedIn) {
        showLoginModal();
        return;
    }
    
    // Vérifier s'il reste des places
    if (ride.seatsAvailable <= 0) {
        showNotification('Désolé, ce trajet est complet', 'warning');
        return;
    }
    
    // Afficher la modal de réservation
    const modalHtml = createReservationModal(ride);
    
    // Supprimer une éventuelle modal existante
    const existingModal = document.getElementById('reservationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
    modal.show();
    
    // Nettoyer après fermeture
    document.getElementById('reservationModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function createReservationModal(ride) {
    const totalPrice = ride.price;
    const maxSeats = Math.min(ride.seatsAvailable, 4); // Maximum 4 places par réservation
    
    let seatsOptions = '';
    for (let i = 1; i <= maxSeats; i++) {
        seatsOptions += `<option value="${i}">${i} place${i > 1 ? 's' : ''} - ${i * totalPrice}€</option>`;
    }
    
    return `
        <div class="modal fade" id="reservationModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-calendar-plus me-2"></i>
                            Réserver votre trajet
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Trajet :</strong> ${ride.departure} → ${ride.arrival}<br>
                            <strong>Date :</strong> ${ride.date} à ${ride.departureTime}<br>
                            <strong>Chauffeur :</strong> ${ride.driver}
                        </div>
                        
                        <form id="reservationForm">
                            <div class="mb-3">
                                <label class="form-label">Nombre de places</label>
                                <select class="form-select" id="seatsCount" onchange="updateTotalPrice(${ride.price})">
                                    ${seatsOptions}
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Numéro de téléphone (optionnel)</label>
                                <input type="tel" class="form-control" id="passengerPhone" placeholder="06 12 34 56 78">
                                <small class="text-muted">Pour faciliter le contact le jour du trajet</small>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Message au chauffeur (optionnel)</label>
                                <textarea class="form-control" id="messageToDriver" rows="3" placeholder="Présentez-vous ou posez une question..."></textarea>
                            </div>
                            
                            <div class="alert alert-warning">
                                <i class="fas fa-credit-card me-2"></i>
                                <strong>Coût total :</strong> <span id="totalPrice">${totalPrice}€</span><br>
                                <small>Cette somme sera débitée de vos crédits EcoRide</small>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="acceptConditions" required>
                                <label class="form-check-label" for="acceptConditions">
                                    J'accepte les <a href="#" target="_blank">conditions de réservation</a>
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Annuler
                        </button>
                        <button type="button" class="btn btn-primary btn-lg" onclick="confirmReservation(${ride.id})">
                            <i class="fas fa-check me-2"></i>Confirmer la réservation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateTotalPrice(pricePerSeat) {
    const seatsCount = document.getElementById('seatsCount').value;
    const totalPrice = pricePerSeat * seatsCount;
    document.getElementById('totalPrice').textContent = totalPrice + '€';
}

// =====================================
// PROCESSUS DE RÉSERVATION
// =====================================

function confirmReservation(rideId) {
    const form = document.getElementById('reservationForm');
    const seatsCount = document.getElementById('seatsCount').value;
    const phone = document.getElementById('passengerPhone').value;
    const message = document.getElementById('messageToDriver').value;
    const acceptConditions = document.getElementById('acceptConditions').checked;
    
    // Validation
    if (!acceptConditions) {
        showNotification('Veuillez accepter les conditions de réservation', 'error');
        return;
    }
    
    // Simulation de la réservation
    const confirmBtn = document.querySelector('#reservationModal .btn-primary');
    const originalText = confirmBtn.innerHTML;
    
    // Animation de chargement
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Réservation...';
    confirmBtn.disabled = true;
    
    setTimeout(() => {
        // Fermer la modal
        bootstrap.Modal.getInstance(document.getElementById('reservationModal')).hide();
        
        // Mettre à jour l'affichage des places
        updateAvailableSeats(rideId, parseInt(seatsCount));
        
        // Afficher le succès
        showReservationSuccess(rideId, seatsCount);
        
    }, 2000);
}

function updateAvailableSeats(rideId, bookedSeats) {
    // Mettre à jour les données
    if (rideData[rideId]) {
        rideData[rideId].seatsAvailable -= bookedSeats;
    }
    
    // Mettre à jour l'affichage dans la carte
    const rideCard = document.querySelector(`[data-ride-id="${rideId}"]`);
    if (rideCard) {
        const seatsElement = rideCard.querySelector('.seats-available');
        if (seatsElement) {
            const newSeats = Math.max(0, parseInt(seatsElement.textContent) - bookedSeats);
            seatsElement.textContent = newSeats;
            
            // Mettre à jour le texte complet
            const seatsContainer = rideCard.querySelector('.fa-users').parentElement;
            if (seatsContainer) {
                seatsContainer.innerHTML = `<i class="fas fa-users me-1"></i>${newSeats} place${newSeats > 1 ? 's' : ''} restante${newSeats > 1 ? 's' : ''}`;
            }
            
            // Désactiver les boutons si plus de places
            if (newSeats === 0) {
                const reserveBtn = rideCard.querySelector('.btn-reserve');
                if (reserveBtn) {
                    reserveBtn.textContent = 'Complet';
                    reserveBtn.disabled = true;
                    reserveBtn.classList.remove('btn-success');
                    reserveBtn.classList.add('btn-secondary');
                }
            }
        }
    }
}

function showReservationSuccess(rideId, seatsCount) {
    const ride = rideData[rideId];
    const successHtml = `
        <div class="modal fade" id="successModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-check-circle me-2"></i>Réservation confirmée !
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-4">
                            <i class="fas fa-check-circle text-success" style="font-size: 4rem;"></i>
                        </div>
                        <h4>Félicitations !</h4>
                        <p class="mb-4">Votre réservation a été confirmée avec succès.</p>
                        
                        <div class="card bg-light">
                            <div class="card-body">
                                <h6 class="text-success">Détails de votre réservation</h6>
                                <p class="mb-1"><strong>Trajet :</strong> ${ride.departure} → ${ride.arrival}</p>
                                <p class="mb-1"><strong>Date :</strong> ${ride.date} à ${ride.departureTime}</p>
                                <p class="mb-1"><strong>Places :</strong> ${seatsCount}</p>
                                <p class="mb-0"><strong>Total :</strong> ${seatsCount * ride.price}€</p>
                            </div>
                        </div>
                        
                        <div class="alert alert-info mt-3">
                            <i class="fas fa-envelope me-2"></i>
                            Un email de confirmation va vous être envoyé avec les détails du contact du chauffeur.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        <button type="button" class="btn btn-success" onclick="goToMyReservations()">Mes réservations</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', successHtml);
    const modal = new bootstrap.Modal(document.getElementById('successModal'));
    modal.show();
    
    document.getElementById('successModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// =====================================
// FONCTIONS UTILITAIRES
// =====================================

function checkUserLogin() {
    // Simulation - en réalité, vérifier le token/session
    return localStorage.getItem('userToken') !== null || 
           sessionStorage.getItem('isLoggedIn') === 'true' ||
           confirm('Vous devez être connecté pour réserver. Simuler une connexion ?');
}

function showLoginModal() {
    const loginHtml = `
        <div class="modal fade" id="loginModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="fas fa-sign-in-alt me-2"></i>Connexion requise
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-4">
                            <i class="fas fa-user-circle text-muted" style="font-size: 4rem;"></i>
                        </div>
                        <p class="text-center">Vous devez vous connecter ou créer un compte pour réserver un covoiturage.</p>
                        <div class="d-grid gap-2">
                            <a href="connexion.html" class="btn btn-primary">
                                <i class="fas fa-sign-in-alt me-2"></i>Se connecter
                            </a>
                            <a href="connexion.html" class="btn btn-outline-secondary">
                                <i class="fas fa-user-plus me-2"></i>Créer un compte
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loginHtml);
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
    
    document.getElementById('loginModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function generateStars(rating) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    // Étoiles pleines
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star text-warning"></i>';
    }
    
    // Étoile à moitié
    if (hasHalfStar) {
        starsHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
    }
    
    // Étoiles vides
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star text-warning"></i>';
    }
    
    return starsHtml;
}

function goToMyReservations() {
    // En production, rediriger vers la page des réservations
    showNotification('Redirection vers vos réservations...', 'info');
    setTimeout(() => {
        // window.location.href = 'mes-reservations.html';
        bootstrap.Modal.getInstance(document.getElementById('successModal')).hide();
    }, 1000);
}

// =====================================
// INITIALISATION DES BOUTONS
// =====================================

document.addEventListener('DOMContentLoaded', function() {
    // Réattacher les événements aux boutons après chargement/filtrage
    initializeButtons();
});

function initializeButtons() {
    // Boutons détails
    document.querySelectorAll('.btn-detail').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const rideId = this.dataset.rideId || this.getAttribute('onclick').match(/\d+/)[0];
            viewRideDetails(parseInt(rideId));
        });
    });
    
    // Boutons réserver
    document.querySelectorAll('.btn-reserve').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const rideId = this.dataset.rideId;
            showReservationModal(parseInt(rideId));
        });
    });
}

// Réinitialiser les boutons après application des filtres
function reattachButtonEvents() {
    initializeButtons();
}

console.log('🔘 Système de boutons Détails/Réserver initialisé !');

// =====================================
// CSS ADDITIONNELS POUR LES BOUTONS
// =====================================

// Ajouter les styles CSS pour les nouveaux boutons
const additionalCSS = `
<style>
.btn-reserve {
    background: linear-gradient(135deg, #28a745, #20c997);
    border: none;
    color: white;
    padding: 10px 25px;
    border-radius: 25px;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

.btn-reserve:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
    color: white;
}

.btn-reserve:disabled {
    background: #6c757d;
    transform: none;
    box-shadow: none;
}

.modal-content {
    border-radius: 15px;
    border: none;
}

.modal-header {
    border-radius: 15px 15px 0 0;
}

.driver-avatar {
    background: linear-gradient(135deg, var(--eco-accent, #7fb069), var(--eco-secondary, #4a7c59));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    border-radius: 50%;
}

.alert {
    border-radius: 10px;
}

.card {
    border-radius: 12px;
}
</style>
`;

// Injecter le CSS dans la page
if (!document.getElementById('additional-buttons-css')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'additional-buttons-css';
    styleElement.innerHTML = additionalCSS;
    document.head.appendChild(styleElement);
}

// =====================================
// FONCTION DE NOTIFICATION AMÉLIORÉE
// =====================================

function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.ecoride-notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `ecoride-notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        z-index: 1060;
        max-width: 350px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        border-radius: 12px;
        animation: slideInRight 0.3s ease;
    `;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="${icons[type]} me-3" style="font-size: 1.5rem;"></i>
            <div class="flex-grow-1">${message.replace(/\n/g, '<br>')}</div>
            <button type="button" class="btn-close ms-2" aria-label="Close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation CSS
    if (!document.getElementById('notification-animations')) {
        const animationCSS = document.createElement('style');
        animationCSS.id = 'notification-animations';
        animationCSS.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(animationCSS);
    }
    
    // Auto-remove après 5 secondes
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// =====================================
// FONCTIONS D'INTÉGRATION
// =====================================

// S'assurer que les fonctions sont disponibles globalement
window.viewRideDetails = viewRideDetails;
window.showReservationModal = showReservationModal;
window.updateTotalPrice = updateTotalPrice;
window.confirmReservation = confirmReservation;
window.goToMyReservations = goToMyReservations;

// Intégration avec le système de filtres
if (typeof window.applyFilters === 'function') {
    const originalApplyFilters = window.applyFilters;
    window.applyFilters = function() {
        originalApplyFilters();
        // Réattacher les événements après filtrage
        setTimeout(reattachButtonEvents, 100);
    };
}

// =====================================
// MISE À JOUR HTML NÉCESSAIRE
// =====================================

// Cette fonction met à jour automatiquement les boutons existants
function upgradeExistingButtons() {
    console.log('🔄 Mise à jour des boutons existants...');
    
    // Trouver toutes les cartes de covoiturage
    const rideCards = document.querySelectorAll('.ride-card');
    
    rideCards.forEach((card, index) => {
        const rideId = card.dataset.rideId || (index + 1);
        card.dataset.rideId = rideId;
        
        // Trouver la section des boutons
        const buttonContainer = card.querySelector('.col-md-4 .text-end, .col-md-4.text-end');
        
        if (buttonContainer) {
            // Chercher le bouton détails existant
            let detailsBtn = buttonContainer.querySelector('.btn-detail');
            
            if (detailsBtn) {
                // Mettre à jour le bouton détails
                detailsBtn.setAttribute('data-ride-id', rideId);
                detailsBtn.setAttribute('onclick', `viewRideDetails(${rideId})`);
                
                // Vérifier s'il y a déjà un bouton réserver
                let reserveBtn = buttonContainer.querySelector('.btn-reserve');
                
                if (!reserveBtn) {
                    // Créer un bouton réserver
                    reserveBtn = document.createElement('button');
                    reserveBtn.className = 'btn btn-reserve btn-success mt-2';
                    reserveBtn.setAttribute('data-ride-id', rideId);
                    reserveBtn.setAttribute('onclick', `showReservationModal(${rideId})`);
                    reserveBtn.innerHTML = '<i class="fas fa-calendar-plus me-2"></i>Réserver';
                    
                    // Restructurer les boutons en colonne
                    const priceSection = buttonContainer.querySelector('.price-highlight').parentElement;
                    priceSection.style.display = 'block';
                    
                    // Créer un conteneur pour les boutons
                    const buttonsWrapper = document.createElement('div');
                    buttonsWrapper.className = 'd-grid gap-2 mt-3';
                    
                    // Déplacer le bouton détails dans le wrapper
                    detailsBtn.className = 'btn btn-detail';
                    buttonsWrapper.appendChild(detailsBtn);
                    buttonsWrapper.appendChild(reserveBtn);
                    
                    buttonContainer.appendChild(buttonsWrapper);
                }
            }
        }
    });
    
    // Réattacher les événements
    reattachButtonEvents();
    
    console.log(`✅ ${rideCards.length} cartes mises à jour`);
}

// =====================================
// AUTO-INITIALISATION
// =====================================

// Exécuter la mise à jour automatiquement
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(upgradeExistingButtons, 500);
});

// Si le DOM est déjà chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', upgradeExistingButtons);
} else {
    upgradeExistingButtons();
}

// =====================================
// FONCTION DE TEST
// =====================================

function testButtons() {
    console.log('🧪 Test des boutons...');
    
    // Test bouton détails
    console.log('Test 1: Bouton détails...');
    viewRideDetails(1);
    
    setTimeout(() => {
        // Fermer la modal et tester réservation
        const modal = document.querySelector('.modal.show');
        if (modal) {
            bootstrap.Modal.getInstance(modal).hide();
        }
        
        console.log('Test 2: Bouton réservation...');
        setTimeout(() => showReservationModal(1), 500);
    }, 2000);
}

// Exposer la fonction de test
window.testEcoRideButtons = testButtons;


