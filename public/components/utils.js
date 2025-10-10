/**
 * FONCTIONS UTILITAIRES
 * Fonctions de transformation et d'initialisation
 */

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

    // Avatar du conducteur - depuis la table users
    const driverAvatar = apiRide.driver_name ? apiRide.driver_name.charAt(0).toUpperCase() : 'U';
    const hasAvatarImage = apiRide.driver_avatar && apiRide.driver_avatar.trim() !== '';

    return {
        id: apiRide.id,
        driver: apiRide.driver_name || 'Conducteur',
        avatar: driverAvatar, // Initiale pour fallback
        avatarImage: hasAvatarImage ? apiRide.driver_avatar : null, // URL de l'image depuis users.profile_picture
        rating: 4.0, // TODO: Calculer depuis une table de ratings
        reviewCount: 0, // TODO: Compter depuis une table de reviews
        driverBio: apiRide.driver_bio || 'Conducteur expérimenté', // Depuis users.bio
        driverEmail: apiRide.driver_email || '', // Depuis users.email
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

// Initialisation du formulaire de recherche
function initSearchButtons() {
    const searchForm = document.getElementById('searchForm');
    if (!searchForm) {
        console.warn('⚠️ Formulaire de recherche non trouvé');
        return;
    }

    // Détecter la page actuelle
    const pathname = window.location.pathname;
    const isIndexPage = pathname.endsWith('index.html') ||
                        pathname === '/' ||
                        pathname.endsWith('/') ||
                        !pathname.includes('covoiturages.html');

    const submitButton = searchForm.querySelector('button[type="submit"]');

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const from = document.getElementById('departure')?.value.trim() || '';
        const to = document.getElementById('arrival')?.value.trim() || '';
        const date = document.getElementById('date')?.value || '';

        // Si on est sur index.html, rediriger vers covoiturages.html
        if (isIndexPage) {
            // Validation basique
            if (!from && !to && !date) {
                alert('Veuillez renseigner au moins un critère de recherche');
                return;
            }

            // Construire l'URL avec les paramètres de recherche
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            if (date) params.append('date', date);

            // Rediriger vers la page de covoiturages avec les paramètres
            window.location.href = `covoiturages.html?${params.toString()}`;
        }
        // Sinon, on est sur covoiturages.html, lancer la recherche directement
        else {
            const searchParams = { from, to, date };

            // Mettre à jour les paramètres de recherche globaux
            window.currentSearchParams = searchParams;

            // Lancer la recherche avec les filtres actuels
            if (typeof loadRidesFromAPI === 'function') {
                const filters = window.currentFilters || {
                    ecoOnly: false,
                    maxPrice: 50,
                    maxDuration: 999999,
                    minRating: 0,
                    petsAllowed: false,
                    nonSmoking: false
                };

                loadRidesFromAPI(searchParams, 1, filters);

                // Notification
                if (typeof showNotification === 'function') {
                    let message = 'Recherche lancée';
                    if (searchParams.from) message += ` depuis ${searchParams.from}`;
                    if (searchParams.to) message += ` vers ${searchParams.to}`;
                    if (searchParams.date) message += ` le ${new Date(searchParams.date).toLocaleDateString('fr-FR')}`;
                    showNotification(message, 'info');
                }
            }
        }
    }, true);

    // Gestionnaire du bouton pour forcer le submit
    if (submitButton) {
        submitButton.addEventListener('click', function(e) {
            e.preventDefault();
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            searchForm.dispatchEvent(submitEvent);
        });
    }

    console.log('✅ Formulaire de recherche initialisé');
}

// Export global
window.transformRideDataForModal = transformRideDataForModal;
window.initDetailButtons = initDetailButtons;
window.initSearchButtons = initSearchButtons;
