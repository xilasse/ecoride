/**
 * EcoRide - JavaScript principal pour la page Covoiturages
 * Version nettoyée sans duplication
 */

// Variables globales
let currentFilters = {
    ecoOnly: false,
    maxPrice: 50,
    maxDuration: 999999,
    minRating: 0,
    petsAllowed: false,
    nonSmoking: false
};

let currentSort = 'datetime';

// Données simulées pour les détails des covoiturages
const ridesDetailsData = {
    1: {
        id: 1,
        driver: "MarieDriveGreen",
        avatar: "M",
        rating: 4.8,
        reviewCount: 24,
        departure: { city: "Paris", time: "14:00" },
        arrival: { city: "Lyon", time: "18:30" },
        duration: "4h 30min",
        car: { model: "Tesla Model 3", color: "Blanche", type: "electric" },
        price: 35,
        seatsAvailable: 3,
        ecological: true,
        preferences: { pets: true, smoking: false, music: true },
        description: "Trajet écologique Paris-Lyon en Tesla. Musique d'ambiance et bonne humeur !",
        driverBio: "Passionnée d'écologie et de conduite responsable. 5 ans d'expérience en covoiturage.",
        reviews: [
            { author: "Pierre", rating: 5, comment: "Excellent trajet, très ponctuelle !" },
            { author: "Sophie", rating: 5, comment: "Conductrice sympa, voyage agréable" },
            { author: "Marc", rating: 4, comment: "Très bien, je recommande" }
        ]
    },
    2: {
        id: 2,
        driver: "PaulEcoDriver",
        avatar: "P",
        rating: 4.6,
        reviewCount: 18,
        departure: { city: "Lyon", time: "09:00" },
        arrival: { city: "Marseille", time: "12:15" },
        duration: "3h 15min",
        car: { model: "Renault ZOE", color: "Bleue", type: "electric" },
        price: 28,
        seatsAvailable: 2,
        ecological: true,
        preferences: { pets: false, smoking: false, music: true },
        description: "Trajet matinal Lyon-Marseille. Véhicule 100% électrique !",
        driverBio: "Adepte des voyages matinaux et des véhicules électriques.",
        reviews: [
            { author: "Julie", rating: 5, comment: "Parfait pour un trajet matinal" },
            { author: "Thomas", rating: 4, comment: "Très professionnel" }
        ]
    },
    3: {
        id: 3,
        driver: "JeanEcoDriver",
        avatar: "J",
        rating: 4.2,
        reviewCount: 31,
        departure: { city: "Paris", time: "08:00" },
        arrival: { city: "Bordeaux", time: "13:45" },
        duration: "5h 45min",
        car: { model: "Toyota Prius", color: "Grise", type: "hybrid" },
        price: 42,
        seatsAvailable: 3,
        ecological: false,
        preferences: { pets: true, smoking: false, music: false },
        description: "Paris-Bordeaux en véhicule hybride. Arrêt possible aire de repos.",
        driverBio: "Conducteur expérimenté, voyages longue distance.",
        reviews: [
            { author: "Marie", rating: 4, comment: "Trajet agréable et sécurisé" },
            { author: "Luc", rating: 4, comment: "Ponctuel et sympathique" }
        ]
    },
    4: {
        id: 4,
        driver: "JeanEcoDriver",
        avatar: "J",
        rating: 4.5,
        reviewCount: 12,
        departure: { city: "Toulouse", time: "16:30" },
        arrival: { city: "Montpellier", time: "19:00" },
        duration: "2h 30min",
        car: { model: "Peugeot 308", color: "Noire", type: "essence" },
        price: 22,
        seatsAvailable: 4,
        ecological: false,
        preferences: { pets: false, smoking: false, music: false },
        description: "Trajet Toulouse-Montpellier en fin de journée.",
        driverBio: "Conducteur expérimenté, voyages longue distance.",
        reviews: [
            { author: "Claire", rating: 5, comment: "Très bien, ponctuel" },
            { author: "Marc", rating: 4, comment: "Trajet agréable" }
        ]
    },
    5: {
        id: 5,
        driver: "SophieVerte",
        avatar: "S",
        rating: 4.9,
        reviewCount: 15,
        departure: { city: "Lille", time: "10:15" },
        arrival: { city: "Bruxelles", time: "12:00" },
        duration: "1h 45min",
        car: { model: "Nissan Leaf", color: "Verte", type: "electric" },
        price: 18,
        seatsAvailable: 4,
        ecological: true,
        preferences: { pets: true, smoking: false, music: true },
        description: "Trajet international Lille-Bruxelles en Nissan Leaf électrique. Voyage écologique garanti !",
        driverBio: "Spécialiste des trajets internationaux écologiques.",
        reviews: [
            { author: "Pierre", rating: 5, comment: "Parfait, très écologique" },
            { author: "Anne", rating: 5, comment: "Conductrice excellente" }
        ]
    }
};

// =====================================
// INITIALISATION
// =====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation de la page Covoiturages...');
    
    initDateInputs();
    initFilters();
    initSorting();
    initDetailButtons();
    
    console.log('Page Covoiturages initialisée avec succès');
});

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

function initFilters() {
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = this.value + '€';
            currentFilters.maxPrice = parseInt(this.value);
            applyFilters();
        });
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

function initDetailButtons() {
    // Utiliser la délégation d'événements pour éviter les duplications
    document.addEventListener('click', function(e) {
        // Gérer uniquement les boutons "Détails" qui ne sont pas des boutons de réservation
        if (e.target.closest('.btn-detail') && !e.target.closest('.reservation-btn')) {
            e.preventDefault();
            const button = e.target.closest('.btn-detail');
            const rideCard = button.closest('.ride-card');
            let rideId = button.dataset.rideId || (rideCard ? rideCard.dataset.rideId : null);
            
            if (rideId) {
                console.log(`Clic sur bouton détail - ID: ${rideId}`);
                viewRideDetails(rideId);
            }
        }
    });
}

// =====================================
// FONCTIONS DE FILTRAGE
// =====================================

function applyFilters() {
    console.log('Application des filtres...', currentFilters);
    
    const rides = document.querySelectorAll('.ride-card');
    if (rides.length === 0) {
        console.warn('Aucune carte de trajet trouvée');
        return;
    }
    
    let visibleCount = 0;
    
    rides.forEach(ride => {
        const rideData = extractRideData(ride);
        const isVisible = matchesAllFilters(rideData, currentFilters);
        
        ride.style.display = isVisible ? 'block' : 'none';
        if (isVisible) visibleCount++;
    });
    
    updateResultsCount(visibleCount);
    toggleNoResultsMessage(visibleCount === 0);
    
    console.log(`Filtrage terminé: ${visibleCount} trajets visibles`);
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
    console.log('Effacement de tous les filtres');
    
    // Reset checkboxes
    const checkboxes = document.querySelectorAll('.filters-sidebar input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset selects
    const selects = document.querySelectorAll('.filters-sidebar select');
    selects.forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Reset price range
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange && priceValue) {
        priceRange.value = 50;
        priceValue.textContent = '50€';
    }
    
    // Reset filters object
    currentFilters = {
        ecoOnly: false,
        maxPrice: 50,
        maxDuration: 999999,
        minRating: 0,
        petsAllowed: false,
        nonSmoking: false
    };
    
    applyFilters();
    showNotification('Filtres effacés', 'success');
}

// =====================================
// FONCTIONS DE TRI
// =====================================

function sortRides(criteria) {
    console.log(`Tri par: ${criteria}`);
    
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
                    return parseInt(a.dataset.price) - parseInt(b.dataset.price);
                }
                return bEco - aEco;
            default:
                return 0;
        }
    });
    
    rides.forEach(ride => ridesList.appendChild(ride));
}

// =====================================
// FONCTIONS D'INTERFACE
// =====================================

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

function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
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
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// =====================================
// FONCTION PRINCIPALE - DÉTAILS COVOITURAGE
// =====================================

function viewRideDetails(rideId) {
    console.log(`Affichage des détails du trajet ${rideId}`);
    
    const rideData = ridesDetailsData[rideId];
    
    if (!rideData) {
        console.warn(`Aucune donnée trouvée pour le trajet ${rideId}`);
        showNotification(`Détails du covoiturage #${rideId} non disponibles`, 'warning');
        return;
    }
    
    showRideModal(rideData);
}

function showRideModal(ride) {
    const modalHTML = `
        <div class="modal fade" id="rideModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-route me-2"></i>
                            ${ride.departure.city} → ${ride.arrival.city}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Informations du chauffeur -->
                        <div class="mb-4">
                            <h6><i class="fas fa-user me-2"></i>Chauffeur</h6>
                            <div class="d-flex align-items-center mb-3">
                                <div class="driver-avatar me-3" style="width: 50px; height: 50px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${ride.avatar}</div>
                                <div>
                                    <h6 class="mb-1">${ride.driver}</h6>
                                    <div class="rating mb-1">
                                        ${generateStars(ride.rating)}
                                        <span class="text-muted ms-1">${ride.rating} (${ride.reviewCount} avis)</span>
                                    </div>
                                    <p class="small text-muted mb-0">${ride.driverBio}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Détails du trajet -->
                        <div class="mb-4">
                            <h6><i class="fas fa-route me-2"></i>Détails du trajet</h6>
                            <div class="route-details">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="me-4">
                                        <i class="fas fa-circle text-success"></i>
                                        <strong>${ride.departure.time}</strong>
                                        <div class="small text-muted">${ride.departure.city}</div>
                                    </div>
                                    <div class="flex-fill text-center">
                                        <hr class="my-0">
                                        <small class="text-muted">${ride.duration}</small>
                                    </div>
                                    <div class="ms-4">
                                        <i class="fas fa-map-marker-alt text-danger"></i>
                                        <strong>${ride.arrival.time}</strong>
                                        <div class="small text-muted">${ride.arrival.city}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Véhicule -->
                        <div class="mb-4">
                            <h6><i class="fas fa-car me-2"></i>Véhicule</h6>
                            <div class="d-flex align-items-center">
                                <div class="me-3">
                                    <i class="fas fa-car fa-2x text-primary"></i>
                                </div>
                                <div>
                                    <div><strong>${ride.car.model}</strong></div>
                                    <div class="small text-muted">Couleur: ${ride.car.color}</div>
                                    <div class="small">
                                        ${ride.ecological ? 
                                            '<span class="badge bg-success"><i class="fas fa-leaf me-1"></i>Écologique</span>' :
                                            '<span class="badge bg-secondary">Véhicule classique</span>'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Préférences -->
                        <div class="mb-4">
                            <h6><i class="fas fa-cog me-2"></i>Préférences du conducteur</h6>
                            <div class="d-flex gap-3 flex-wrap">
                                <span class="badge ${ride.preferences.pets ? 'bg-success' : 'bg-danger'}">
                                    <i class="fas fa-paw me-1"></i>
                                    ${ride.preferences.pets ? 'Animaux OK' : 'Pas d\'animaux'}
                                </span>
                                <span class="badge bg-success">
                                    <i class="fas fa-smoking-ban me-1"></i>Non-fumeur
                                </span>
                                ${ride.preferences.music ? 
                                    '<span class="badge bg-info"><i class="fas fa-music me-1"></i>Musique</span>' : ''
                                }
                            </div>
                        </div>

                        <!-- Description -->
                        <div class="mb-4">
                            <h6><i class="fas fa-comment me-2"></i>Description</h6>
                            <p class="text-muted">${ride.description}</p>
                        </div>

                        <!-- Avis récents -->
                        <div class="mb-4">
                            <h6><i class="fas fa-star me-2"></i>Avis récents</h6>
                            ${ride.reviews.map(review => `
                                <div class="border rounded p-2 mb-2">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <strong class="small">${review.author}</strong>
                                        <div class="rating-small">
                                            ${generateStars(review.rating, true)}
                                        </div>
                                    </div>
                                    <p class="small mb-0 text-muted">${review.comment}</p>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Prix et places -->
                        <div class="bg-light rounded p-3 mb-3">
                            <div class="row align-items-center">
                                <div class="col">
                                    <div class="h4 mb-0 text-success">${ride.price}€</div>
                                    <small class="text-muted">par personne</small>
                                </div>
                                <div class="col-auto">
                                    <div class="text-end">
                                        <div><i class="fas fa-users me-1"></i>${ride.seatsAvailable} places restantes</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Fermer
                        </button>
                        <button type="button" class="btn btn-success" onclick="participateRide(${ride.id})">
                            <i class="fas fa-check me-2"></i>Participer au covoiturage
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Supprimer l'ancienne modale si elle existe
    const existingModal = document.getElementById('rideModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Ajouter la modale au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Afficher la modale
    const modal = new bootstrap.Modal(document.getElementById('rideModal'));
    modal.show();
}

function generateStars(rating, small = false) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += `<i class="fas fa-star${small ? ' small' : ''}"></i>`;
    }
    
    if (hasHalfStar) {
        stars += `<i class="fas fa-star-half-alt${small ? ' small' : ''}"></i>`;
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += `<i class="far fa-star${small ? ' small' : ''}"></i>`;
    }
    
    return stars;
}

function participateRide(rideId) {
    console.log(`🚀 Participation au trajet ${rideId} (depuis search.js)`);

    // Vérification via l'API session
    fetch('/api/auth/session', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        console.log('🔍 Vérification session dans search.js:', data);

        if (data.isLoggedIn && data.user) {
            console.log('✅ Session valide, procédure de réservation');

            // Utilisateur connecté, procéder à la réservation
            if (confirm(`Voulez-vous vraiment participer à ce covoiturage ?\n\nUtilisateur: ${data.user.pseudo}\nTrajet: #${rideId}`)) {
                showNotification(`Demande de participation envoyée ! Le conducteur vous contactera bientôt.`, 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('rideModal'));
                if (modal) {
                    modal.hide();
                }

                // Log de confirmation
                console.log(`✅ Réservation confirmée pour ${data.user.pseudo} - Trajet ${rideId}`);
            }
        } else {
            console.log('❌ Session invalide dans search.js');
            showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'warning');
            setTimeout(() => {
                window.location.href = 'connexion.html';
            }, 2000);
        }
    })
    .catch(error => {
        console.error('❌ Erreur session dans search.js:', error);
        showNotification('Erreur de connexion. Veuillez réessayer.', 'danger');
    });
}

// Export global pour compatibilité
window.viewRideDetails = viewRideDetails;
window.participateRide = participateRide;
window.applyFilters = applyFilters;

console.log('Module EcoRide chargé et prêt !');