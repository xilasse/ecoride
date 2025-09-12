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
</script>
