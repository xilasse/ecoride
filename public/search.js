/**
 * VARIABLES PARTIELLEMENT OBSOLÈTES :
 * - maxDuration et minRating dans currentFilters : Pas encore implémentés côté serveur
 */

// Variables globales
let currentFilters = {
    ecoOnly: false,
    maxPrice: 50,
    // NOTE: maxDuration et minRating ne sont pas encore implémentés côté serveur
    maxDuration: 999999,  // TODO: Implémenter le filtre durée dans l'API
    minRating: 0,         // TODO: Implémenter le filtre note dans l'API (nécessite table ratings)
    petsAllowed: false,
    nonSmoking: false
};

let currentSort = 'datetime';
let allRides = []; // Stockage des trajets récupérés de l'API
let currentPage = 1;
let currentSearchParams = {};
let pagination = {};

// Charger les trajets depuis l'API
async function loadRidesFromAPI(searchParams = {}, page = 1, filters = null) {
    try {
        console.log('🔄 Chargement des trajets depuis l\'API...');
        showLoadingSpinner(true, true);

        currentPage = page;
        currentSearchParams = searchParams;

        let url = '/api/rides';
        const params = new URLSearchParams();

        // Ajouter les paramètres de pagination
        params.append('page', page);
        params.append('limit', 10);

        // Ajouter les paramètres de recherche si fournis
        if (searchParams.from) params.append('from', searchParams.from);
        if (searchParams.to) params.append('to', searchParams.to);
        if (searchParams.date) params.append('date', searchParams.date);

        // Ajouter les paramètres de filtrage si fournis
        const activeFilters = filters || currentFilters;
        if (activeFilters.ecoOnly) {
            params.append('eco_only', 'true');
        }
        if (activeFilters.maxPrice && activeFilters.maxPrice < 50) {
            params.append('max_price', activeFilters.maxPrice);
        }
        if (activeFilters.petsAllowed) {
            params.append('pets_allowed', 'true');
        }
        if (activeFilters.nonSmoking) {
            params.append('non_smoking', 'true');
        }

        // Ajouter le paramètre de tri
        if (currentSort && currentSort !== 'datetime') {
            params.append('sort_by', currentSort);
        }

        if (searchParams.from || searchParams.to || searchParams.date) {
            url = `/api/rides/search?${params.toString()}`;
        } else {
            url = `/api/rides?${params.toString()}`;
        }

        console.log('🌐 URL de l\'API appelée:', url); // Debug URL
        const response = await fetch(url, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.rides) {
            allRides = data.rides;
            pagination = data.pagination || {};
            console.log(`✅ ${allRides.length} trajets chargés (page ${pagination.current_page || 1}/${pagination.total_pages || 1})`);

            // Afficher les trajets et la pagination (pas besoin d'appliquer les filtres côté client)
            displayRidesFromAPI();
            updatePaginationUI();
        } else {
            console.error('❌ Erreur lors du chargement:', data.error);
            showNoResults();
        }

    } catch (error) {
        console.error('❌ Erreur réseau:', error);
        showNoResults();
    } finally {
        showLoadingSpinner(false, true);
    }
}

// =====================================
// INITIALISATION
// =====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation de la page Covoiturages...');

    initDateInputs();
    initFilters();
    initSorting();
    initDetailButtons();
    initializeWithAPI(); // Initialize API functionality and search form handler

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
            reloadWithFilters();
        });
        priceValue.textContent = priceRange.value + '€';
        currentFilters.maxPrice = parseInt(priceRange.value);
    }
    
    // Checkbox filters
    const ecoOnly = document.getElementById('ecoOnly');
    if (ecoOnly) {
        ecoOnly.addEventListener('change', function() {
            currentFilters.ecoOnly = this.checked;
            reloadWithFilters();
        });
    }

    const petsAllowed = document.getElementById('petsAllowed');
    if (petsAllowed) {
        petsAllowed.addEventListener('change', function() {
            currentFilters.petsAllowed = this.checked;
            reloadWithFilters();
        });
    }

    const smokingAllowed = document.getElementById('smokingAllowed');
    if (smokingAllowed) {
        smokingAllowed.addEventListener('change', function() {
            currentFilters.nonSmoking = this.checked;
            reloadWithFilters();
        });
    }
    
    // Select filters
    const durationFilter = document.getElementById('durationFilter');
    if (durationFilter) {
        durationFilter.addEventListener('change', function() {
            currentFilters.maxDuration = this.value ? parseInt(this.value) : 999999;
            reloadWithFilters();
        });
    }

    const ratingFilter = document.getElementById('ratingFilter');
    if (ratingFilter) {
        ratingFilter.addEventListener('change', function() {
            currentFilters.minRating = this.value ? parseFloat(this.value) : 0;
            reloadWithFilters();
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
            reloadWithSort();
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

    reloadWithFilters();
    showNotification('Filtres effacés', 'success');
}

// Nouvelle fonction pour recharger les données avec les filtres actuels
function reloadWithFilters() {
    console.log('🔄 Rechargement avec filtres:', currentFilters);
    loadRidesFromAPI(currentSearchParams, 1, currentFilters); // Retour à la page 1 quand on change les filtres
}

// Nouvelle fonction pour recharger les données avec le tri actuel
function reloadWithSort() {
    console.log('🔄 Rechargement avec tri:', currentSort);
    loadRidesFromAPI(currentSearchParams, 1, currentFilters); // Retour à la page 1 quand on change le tri
}

// =====================================
// FONCTIONS DE TRI
// =====================================

// Cette fonction est maintenant obsolète car le tri est fait côté serveur
// Gardée pour la compatibilité mais redirige vers reloadWithSort
function sortRides(criteria) {
    console.log('⚠️  sortRides() obsolète, redirection vers reloadWithSort()');
    currentSort = criteria;
    reloadWithSort();
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

async function viewRideDetails(rideId) {
    console.log(`🔍 Chargement des détails du trajet ${rideId} depuis l'API...`);

    try {
        // Afficher le spinner SANS vider la liste des rides (clearRidesList = false)
        showLoadingSpinner(true, false);

        const response = await fetch(`/api/rides/${rideId}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error(`❌ Erreur API: ${data.error}`);
            showNotification(data.error || 'Impossible de charger les détails', 'error');
            return;
        }

        console.log('✅ Détails du trajet chargés:', data.ride);

        // Transformer les données de l'API vers le format attendu par showRideModal
        const rideData = transformRideDataForModal(data.ride);
        showRideModal(rideData);

    } catch (error) {
        console.error('❌ Erreur réseau:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    } finally {
        // Masquer le spinner après le chargement
        showLoadingSpinner(false, false);
    }
}

// Transformer les données de l'API vers le format attendu par la modale
function transformRideDataForModal(apiRide) {
    const departureDate = new Date(apiRide.departure_datetime);
    const departureTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let arrivalTime = 'N/A';
    if (apiRide.estimated_arrival_datetime) {
        const arrivalDate = new Date(apiRide.estimated_arrival_datetime);
        arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Calcul de la durée
    let duration = 'N/A';
    if (apiRide.duration_minutes) {
        const hours = Math.floor(apiRide.duration_minutes / 60);
        const minutes = apiRide.duration_minutes % 60;
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }

    // Avatar du conducteur
    const driverAvatar = apiRide.driver_name ? apiRide.driver_name.charAt(0).toUpperCase() : 'U';

    return {
        id: apiRide.id,
        driver: apiRide.driver_name || 'Conducteur',
        avatar: driverAvatar,
        rating: 4.0, // TODO: Calculer depuis une table de ratings
        reviewCount: 0, // TODO: Compter depuis une table de reviews
        driverBio: apiRide.driver_bio || 'Conducteur expérimenté',
        departure: {
            city: apiRide.departure_city,
            time: departureTime
        },
        arrival: {
            city: apiRide.arrival_city,
            time: arrivalTime
        },
        duration: duration,
        car: {
            model: `${apiRide.brand || ''} ${apiRide.model || ''}`.trim() || 'Véhicule',
            color: apiRide.color || 'Inconnu'
        },
        ecological: apiRide.is_ecological || apiRide.fuel_type === 'electrique',
        preferences: {
            pets: apiRide.pets_allowed || false,
            music: false // Pas dans la DB pour l'instant
        },
        description: apiRide.description || 'Trajet convivial et écologique !',
        reviews: [], // TODO: Charger depuis une table de reviews
        price: apiRide.price_per_seat,
        seatsAvailable: apiRide.available_seats
    };
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

// =====================================
// NOUVELLES FONCTIONS POUR API RÉELLE
// =====================================

// Générer le HTML d'une carte de trajet depuis les données API
function generateRideCardFromAPI(ride) {
    const departureDate = new Date(ride.departure_datetime);
    const departureTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Calculer l'heure d'arrivée si disponible
    let arrivalTime = 'N/A';
    if (ride.estimated_arrival_datetime) {
        const arrivalDate = new Date(ride.estimated_arrival_datetime);
        arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Badge écologique
    const ecoBadge = ride.is_ecological || ride.fuel_type === 'electrique' ?
        '<span class="eco-badge ms-auto"><i class="fas fa-leaf"></i> Écologique</span>' : '';

    // Avatar du conducteur (première lettre du pseudo)
    const driverAvatar = ride.driver_name ? ride.driver_name.charAt(0).toUpperCase() : 'U';

    // Calcul de la durée
    let duration = 'N/A';
    if (ride.duration_minutes) {
        const hours = Math.floor(ride.duration_minutes / 60);
        const minutes = ride.duration_minutes % 60;
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }

    // Véhicule
    const vehicleInfo = `${ride.brand || 'Véhicule'} ${ride.model || ''} - ${ride.color || 'Couleur inconnue'}`;

    // Préférences
    const petsInfo = ride.pets_allowed ? 'Animaux OK' : 'Pas d\'animaux';
    const smokingInfo = ride.smoking_allowed ? 'Fumeur OK' : 'Non-fumeur';

    return `
        <div class="ride-card" data-price="${ride.price_per_seat}" data-rating="0" data-ecological="${ride.is_ecological}" data-duration="${ride.duration_minutes || 0}" data-ride-id="${ride.id}">
            <div class="row">
                <div class="col-md-8">
                    <div class="driver-info">
                        <div class="driver-avatar">${driverAvatar}</div>
                        <div>
                            <h6 class="mb-1">${ride.driver_name || 'Conducteur'}</h6>
                            <div class="rating">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="far fa-star"></i>
                                <span class="text-muted ms-1">4.0 (nouveau)</span>
                            </div>
                        </div>
                        ${ecoBadge}
                    </div>

                    <div class="route-info mb-2">
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <i class="fas fa-circle text-success"></i>
                                <strong class="departure-time">${departureTime}</strong> <span class="departure-city">${ride.departure_city}</span>
                            </div>
                            <div class="flex-fill">
                                <hr class="my-0">
                            </div>
                            <div class="ms-3">
                                <i class="fas fa-map-marker-alt text-danger"></i>
                                <strong>${arrivalTime}</strong> <span class="arrival-city">${ride.arrival_city}</span>
                            </div>
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>${duration}
                            <i class="fas fa-car ms-3 me-1"></i>${vehicleInfo}
                        </small>
                    </div>

                    <div class="ride-details">
                        <p class="mb-2 small">${ride.description || 'Trajet convivial et écologique !'}</p>
                        <div class="d-flex gap-3 small text-muted">
                            <span><i class="fas fa-users me-1"></i><span class="seats-available">${ride.available_seats}</span> places restantes</span>
                            <span><i class="fas fa-paw me-1"></i>${petsInfo}</span>
                            <span><i class="fas fa-smoking-ban me-1"></i>${smokingInfo}</span>
                        </div>
                    </div>
                </div>

                <div class="col-md-4 text-end">
                    <div class="price-highlight mb-2">${ride.price_per_seat}€</div>
                    <small class="text-muted d-block mb-3">par personne</small>
                    <button class="btn btn-detail" data-ride-id="${ride.id}">
                        <i class="fas fa-eye me-2"></i>Détails
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Afficher les trajets depuis l'API
function displayRidesFromAPI() {
    const ridesList = document.getElementById('ridesList');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');

    if (!ridesList) return;

    if (allRides.length === 0) {
        ridesList.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        if (resultsCount) resultsCount.textContent = '0 covoiturage trouvé';
        return;
    }

    // Générer le HTML pour tous les trajets
    const ridesHTML = allRides.map(ride => generateRideCardFromAPI(ride)).join('');
    ridesList.innerHTML = ridesHTML;

    if (noResults) noResults.style.display = 'none';

    // Afficher le compte avec les informations de pagination
    const totalCount = pagination.total_count || allRides.length;
    const currentPage = pagination.current_page || 1;
    const totalPages = pagination.total_pages || 1;

    if (resultsCount) {
        resultsCount.textContent = `${totalCount} covoiturage${totalCount > 1 ? 's' : ''} trouvé${totalCount > 1 ? 's' : ''} (Page ${currentPage}/${totalPages})`;
    }

    console.log(`✅ ${allRides.length} trajets affichés (page ${currentPage}/${totalPages})`);
}

// Cette fonction est maintenant obsolète car le filtrage est fait côté serveur
// Gardée pour la compatibilité mais redirige vers reloadWithFilters
function applyFiltersAndDisplay() {
    console.log('⚠️  applyFiltersAndDisplay() obsolète, redirection vers reloadWithFilters()');
    reloadWithFilters();
}

// Afficher/masquer le spinner de chargement
function showLoadingSpinner(show, clearRidesList = true) {
    const spinner = document.getElementById('loadingSpinner');
    const ridesList = document.getElementById('ridesList');

    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
    // Ne vider la liste que si clearRidesList est true (par défaut)
    // Utile pour ne pas vider lors de l'ouverture des détails
    if (ridesList && show && clearRidesList) {
        ridesList.innerHTML = '';
    }
}

// Afficher l'état "aucun résultat"
function showNoResults() {
    const ridesList = document.getElementById('ridesList');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');
    const paginationContainer = document.getElementById('pagination');

    if (ridesList) ridesList.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    if (resultsCount) resultsCount.textContent = '0 covoiturage trouvé';
    if (paginationContainer) paginationContainer.innerHTML = '';
}

// Mettre à jour l'interface de pagination
function updatePaginationUI() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || !pagination.total_pages || pagination.total_pages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const currentPage = pagination.current_page || 1;
    const totalPages = pagination.total_pages;
    const hasPrevious = pagination.has_previous;
    const hasNext = pagination.has_next;

    let paginationHTML = '<nav aria-label="Navigation des pages"><ul class="pagination justify-content-center">';

    // Bouton précédent
    if (hasPrevious) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Précédent
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-left"></i> Précédent</span>
            </li>
        `;
    }

    // Numéros de page
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHTML += '<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1)">1</a></li>';
        if (startPage > 2) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${i})">${i}</a></li>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Bouton suivant
    if (hasNext) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage + 1})">
                    Suivant <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link">Suivant <i class="fas fa-chevron-right"></i></span>
            </li>
        `;
    }

    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;
}

// Naviguer vers une page spécifique
function goToPage(page) {
    if (page < 1 || (pagination.total_pages && page > pagination.total_pages)) {
        return;
    }

    console.log(`📄 Navigation vers la page ${page}`);
    loadRidesFromAPI(currentSearchParams, page, currentFilters);
}

// Initialisation avec chargement des données API
function initializeWithAPI() {
    console.log('🚀 Initialisation avec API réelle');

    // Charger les trajets par défaut
    loadRidesFromAPI();

    // Gestionnaire de recherche
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const searchParams = {
                from: document.getElementById('departure')?.value || '',
                to: document.getElementById('arrival')?.value || '',
                date: document.getElementById('date')?.value || ''
            };

            console.log('🔍 Recherche avec paramètres:', searchParams);
            console.log('🔍 Bouton rechercher cliqué!'); // Debug log
            alert('Recherche lancée avec: ' + JSON.stringify(searchParams)); // Debug alert
            loadRidesFromAPI(searchParams, 1, currentFilters); // Retour à la page 1 pour une nouvelle recherche
        });
    }
}

// Export global pour compatibilité
window.viewRideDetails = viewRideDetails;
window.participateRide = participateRide;
window.goToPage = goToPage;
window.applyFilters = applyFiltersAndDisplay;
window.loadRidesFromAPI = loadRidesFromAPI;
window.initializeWithAPI = initializeWithAPI;

console.log('Module EcoRide avec API réelle chargé et prêt !');