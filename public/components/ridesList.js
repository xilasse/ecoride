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

// NOTE: L'initialisation (DOMContentLoaded) est maintenant dans init.js
// Ne pas dupliquer ici pour éviter les conflits

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


// Cette fonction est maintenant obsolète car le filtrage est fait côté serveur
// Gardée pour la compatibilité mais redirige vers reloadWithFilters
function applyFiltersAndDisplay() {
    console.log('⚠️  applyFiltersAndDisplay() obsolète, redirection vers reloadWithFilters()');
    reloadWithFilters();
}

// Export global pour compatibilité
window.applyFilters = applyFiltersAndDisplay;
window.loadRidesFromAPI = loadRidesFromAPI;
window.initDateInputs = initDateInputs;
window.initFilters = initFilters;
window.initSorting = initSorting;
window.initDetailButtons = initDetailButtons;