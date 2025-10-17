async function loadRidesFromAPI(searchParams = {}, page = 1, filters = null) {
    try {
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
        const activeFilters = filters || window.currentFilters;

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
        if (activeFilters.maxDuration && activeFilters.maxDuration < 999999) {
            params.append('max_duration', activeFilters.maxDuration);
        }
        if (activeFilters.minRating && activeFilters.minRating > 0) {
            params.append('min_rating', activeFilters.minRating);
        }

        // Ajouter le paramètre de tri
        if (window.currentSort && window.currentSort !== 'datetime') {
            params.append('sort_by', window.currentSort);
        }

        if (searchParams.from || searchParams.to || searchParams.date) {
            url = `/api/rides/search?${params.toString()}`;
        } else {
            url = `/api/rides?${params.toString()}`;
        }

        const response = await fetch(url, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.rides) {
            allRides = data.rides;
            pagination = data.pagination || {};

            displayRidesFromAPI();
            updatePaginationUI();
        } else {
            showNoResults();
        }

    } catch (error) {
        console.error('❌ Erreur réseau:', error);
        showNoResults();
    } finally {
        showLoadingSpinner(false, true);
    }
}

// La fonction initDetailButtons() est maintenant dans utils.js pour éviter la duplication

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

// Générer le HTML d'une carte de trajet depuis les données API
function generateRideCardFromAPI(ride) {
    const departureDate = new Date(ride.departure_datetime);
    const departureTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const departureDay = departureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Calculer l'heure d'arrivée si disponible
    let arrivalTime = 'N/A';
    if (ride.estimated_arrival_datetime) {
        const arrivalDate = new Date(ride.estimated_arrival_datetime);
        arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Badge écologique
    const ecoBadge = ride.is_ecological || ride.fuel_type === 'electrique' ?
        '<span class="eco-badge ms-auto"><i class="fas fa-leaf"></i> Écologique</span>' : '';

    // Avatar du conducteur avec avatarUtils
    const driverAvatarHTML = window.AvatarUtils
        ? window.AvatarUtils.generateAvatarHTML(ride, 'small', 'driver-avatar')
        : `<div class="driver-avatar">${ride.driver_name ? ride.driver_name.charAt(0).toUpperCase() : 'U'}</div>`;

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

    // Ajouter classe eco-ride si écologique
    const ecoClass = (ride.is_ecological || ride.fuel_type === 'electrique') ? ' eco-ride' : '';

    return `
        <div class="ride-card${ecoClass}" data-price="${ride.price_per_seat}" data-rating="0" data-ecological="${ride.is_ecological}" data-duration="${ride.duration_minutes || 0}" data-ride-id="${ride.id}">
            <div class="row">
                <div class="col-md-8">
                    <div class="driver-info">
                        ${driverAvatarHTML}
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
                        <div class="mb-1">
                            <small class="text-muted"><i class="fas fa-calendar me-1"></i>${departureDay}</small>
                        </div>
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


// Export global
window.loadRidesFromAPI = loadRidesFromAPI;
window.initDetailButtons = initDetailButtons;