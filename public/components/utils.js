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

// Export global
window.transformRideDataForModal = transformRideDataForModal;
window.initDetailButtons = initDetailButtons;
