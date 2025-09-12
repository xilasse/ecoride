/**
 * EcoRide - JavaScript spécifique à la page de recherche de covoiturages
 * Gestion avancée des filtres et de la recherche
 */

// ========================================
// INITIALISATION SPÉCIFIQUE COVOITURAGES
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    if (!isSearchPage()) return;
    
    initAdvancedFilters();
    initSearchResults();
    initMapIntegration();
    initBookingActions();
    
    console.log('🚗 Search page features initialized');
});

function isSearchPage() {
    return window.location.pathname.includes('covoiturages') || 
           document.getElementById('ridesList') !== null;
}

// ========================================
// FILTRES AVANCÉS
// ========================================
function initAdvancedFilters() {
    // Filtres par préférences
    initPreferenceFilters();
    
    // Filtres par horaires
    initTimeFilters();
    
    // Filtres géographiques
    initLocationFilters();
    
    // Sauvegarde des préférences de filtres
    loadSavedFilters();
}

function initPreferenceFilters() {
    // Groupes de préférences
    const preferenceGroups = [
        { id: 'petsAllowed', label: 'Animaux acceptés', icon: 'fa-paw' },
        { id: 'smokingAllowed', label: 'Non-fumeur', icon: 'fa-smoking-ban' },
        { id: 'musicAllowed', label: 'Musique', icon: 'fa-music' },
        { id: 'conversationLevel', label: 'Discussion', icon: 'fa-comments' }
    ];
    
    preferenceGroups.forEach(pref => {
        const checkbox = document.getElementById(pref.id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                applyAdvancedFilters();
                saveFilterPreferences();
            });
        }
    });
}

function initTimeFilters() {
    // Ajouter des filtres par tranche horaire si pas présents
    const timeFilterContainer = document.querySelector('.time-filters');
    if (timeFilterContainer) {
        const timeRanges = [
            { value: 'morning', label: 'Matin (6h-12h)', hours: [6, 12] },
            { value: 'afternoon', label: 'Après-midi (12h-18h)', hours: [12, 18] },
            { value: 'evening', label: 'Soir (18h-22h)', hours: [18, 22] },
            { value: 'night', label: 'Nuit (22h-6h)', hours: [22, 6] }
        ];
        
        timeRanges.forEach(range => {
            const checkbox = createTimeFilterCheckbox(range);
            timeFilterContainer.appendChild(checkbox);
        });
    }
}

function createTimeFilterCheckbox(timeRange) {
    const div = document.createElement('div');
    div.className = 'form-check mb-2';
    
    div.innerHTML = `
        <input class="form-check-input" type="checkbox" id="time_${timeRange.value}" 
               data-hours="${timeRange.hours.join(',')}">
        <label class="form-check-label" for="time_${timeRange.value}">
            ${timeRange.label}
        </label>
    `;
    
    const checkbox = div.querySelector('input');
    checkbox.addEventListener('change', applyAdvancedFilters);
    
    return div;
}

// ========================================
// GESTION DES RÉSULTATS DE RECHERCHE
// ========================================
function initSearchResults() {
    // Animation d'apparition des résultats
    animateResultsAppearance();
    
    // Lazy loading des images de profil
    initLazyLoading();
    
    // Gestion du scroll infini (si beaucoup de résultats)
    initInfiniteScroll();
}

function animateResultsAppearance() {
    const rideCards = document.querySelectorAll('.ride-card');
    
    rideCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ========================================
// ACTIONS DE RÉSERVATION
// ========================================
function initBookingActions() {
    // Gestionnaires pour les boutons "Détails"
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', handleDetailsClick);
    });
    
    // Gestionnaires pour les boutons de réservation rapide
    document.querySelectorAll('.btn-quick-book').forEach(btn => {
        btn.addEventListener('click', handleQuickBooking);
    });
}

function handleDetailsClick(event) {
    const rideCard = event.target.closest('.ride-card');
    const rideId = rideCard?.dataset.rideId;
    
    if (rideId) {
        showRideDetailsModal(rideId);
    } else {
        // Fallback vers la fonction globale
        const rideNumber = Math.floor(Math.random() * 100) + 1;
        viewRideDetails(rideNumber);
    }
}

function showRideDetailsModal(rideId) {
    // Créer une modal Bootstrap dynamiquement
    const modalHtml = createRideDetailsModal(rideId);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('rideDetailsModal'));
    modal.show();
    
    // Supprimer la modal après fermeture
    document.getElementById('rideDetailsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function createRideDetailsModal(rideId) {
    return `
        <div class="modal fade" id="rideDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Détails du covoiturage #${rideId}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Informations du trajet</h6>
                                <p><i class="fas fa-map-marker-alt text-success"></i> <strong>Départ:</strong> Paris</p>
                                <p><i class="fas fa-map-marker-alt text-danger"></i> <strong>Arrivée:</strong> Lyon</p>
                                <p><i class="fas fa-clock"></i> <strong>Heure:</strong> 14:00</p>
                                <p><i class="fas fa-euro-sign"></i> <strong>Prix:</strong> 35€ par personne</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Chauffeur</h6>
                                <div class="d-flex align-items-center mb-3">
                                    <div class="driver-avatar me-3">M</div>
                                    <div>
                                        <strong>MarieDriveGreen</strong>
                                        <div class="rating">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <span class="text-muted">4.8 (24 avis)</span>
                                        </div>
                                    </div>
                                </div>
                                <p><i class="fas fa-car"></i> Tesla Model 3 - Blanche</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        <button type="button" class="btn btn-detail" onclick="initiateBooking('${rideId}')">Réserver</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ========================================
// SYSTÈME DE RÉSERVATION
// ========================================
function handleQuickBooking(event) {
    const rideCard = event.target.closest('.ride-card');
    const rideId = rideCard?.dataset.rideId || Math.floor(Math.random() * 100);
    
    initiateBooking(rideId);
}

function initiateBooking(rideId) {
    // Vérifier si l'utilisateur est connecté (simulation)
    if (!isUserLoggedIn()) {
        showLoginPrompt();
        return;
    }
    
    // Afficher la confirmation de réservation
    showBookingConfirmation(rideId);
}

function isUserLoggedIn() {
    // Simulation - en réalité, vérifier le token/session
    return localStorage.getItem('userToken') !== null;
}

function showLoginPrompt() {
    const loginModal = `
        <div class="modal fade" id="loginModal