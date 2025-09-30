// Gestion de la création de trajets covoiturage
document.addEventListener('DOMContentLoaded', function() {
    const createRideForm = document.getElementById('createRideForm');
    const createRideModal = new bootstrap.Modal(document.getElementById('createRideModal'));

    // Définir la date minimum à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('rideDate').min = today;

    // Gestion de la soumission du formulaire
    createRideForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateForm()) {
            const rideData = collectFormData();
            createNewRide(rideData);
        }
    });

    // Validation du formulaire
    function validateForm() {
        const requiredFields = ['rideFrom', 'rideTo', 'rideDate', 'rideTime', 'rideSeats', 'ridePrice'];
        let isValid = true;

        // Vérifier les champs obligatoires
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                showFieldError(field, 'Ce champ est obligatoire');
                isValid = false;
            } else {
                clearFieldError(field);
            }
        });

        // Vérifier qu'un type de véhicule est sélectionné
        const vehicleTypeSelected = document.querySelector('input[name="vehicleType"]:checked');
        if (!vehicleTypeSelected) {
            showAlert('Veuillez sélectionner un type de véhicule', 'warning');
            isValid = false;
        }

        // Vérifier que la date n'est pas dans le passé
        const selectedDate = new Date(document.getElementById('rideDate').value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showFieldError(document.getElementById('rideDate'), 'La date ne peut pas être dans le passé');
            isValid = false;
        }

        // Vérifier le prix
        const price = parseInt(document.getElementById('ridePrice').value);
        if (price < 1 || price > 200) {
            showFieldError(document.getElementById('ridePrice'), 'Le prix doit être entre 1€ et 200€');
            isValid = false;
        }

        return isValid;
    }

    // Collecter les données du formulaire
    function collectFormData() {
        const formData = new FormData(createRideForm);
        const vehicleType = document.querySelector('input[name="vehicleType"]:checked')?.value;
        const preferences = Array.from(document.querySelectorAll('input[name="preferences"]:checked'))
                                .map(cb => cb.value);

        const rideData = {
            from: document.getElementById('rideFrom').value.trim(),
            to: document.getElementById('rideTo').value.trim(),
            date: document.getElementById('rideDate').value,
            time: document.getElementById('rideTime').value,
            seats: parseInt(document.getElementById('rideSeats').value),
            price: parseInt(document.getElementById('ridePrice').value),
            vehicleType: vehicleType,
            vehicleBrand: document.getElementById('vehicleBrand').value.trim(),
            vehicleModel: document.getElementById('vehicleModel').value.trim(),
            preferences: preferences,
            description: document.getElementById('rideDescription').value.trim(),
            meetingPoint: document.getElementById('meetingPoint').value.trim(),
            createdAt: new Date().toISOString(),
            driver: getCurrentUser() // Pour l'instant, utilisateur fictif
        };

        return rideData;
    }

    // Créer un nouveau trajet
    function createNewRide(rideData) {
        showLoadingSpinner(true);

        // Appel API pour créer le trajet
        fetch('/api/rides/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rideData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Ajouter la carte à la liste
                rideData.id = data.rideId;
                addRideCard(rideData);

                // Fermer le modal et réinitialiser le formulaire
                createRideModal.hide();
                createRideForm.reset();

                // Afficher un message de succès
                showAlert('Votre trajet a été publié avec succès !', 'success');
            } else {
                showAlert('Erreur lors de la création du trajet: ' + (data.error || 'Erreur inconnue'), 'danger');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion. Veuillez réessayer.', 'danger');
        })
        .finally(() => {
            showLoadingSpinner(false);
        });
    }

    // Sauvegarder dans le localStorage
    function saveRideToStorage(rideData) {
        let rides = JSON.parse(localStorage.getItem('ecoride_rides')) || [];
        rideData.id = Date.now(); // ID simple basé sur le timestamp
        rides.unshift(rideData); // Ajouter en première position
        localStorage.setItem('ecoride_rides', JSON.stringify(rides));
    }

    // Ajouter une carte de trajet à la liste
    function addRideCard(rideData) {
        const ridesList = document.getElementById('ridesList');
        const rideCard = createRideCardHTML(rideData);

        // Insérer en première position
        ridesList.insertAdjacentHTML('afterbegin', rideCard);

        // Mettre à jour le compteur de résultats
        updateResultsCount();

        // Ajouter une animation
        const newCard = ridesList.firstElementChild;
        newCard.style.opacity = '0';
        newCard.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            newCard.style.transition = 'all 0.3s ease';
            newCard.style.opacity = '1';
            newCard.style.transform = 'translateY(0)';
        }, 100);
    }

    // Créer le HTML d'une carte de trajet
    function createRideCardHTML(ride) {
        const isEcological = ride.vehicleType === 'electric';
        const vehicleIcon = getVehicleIcon(ride.vehicleType);
        const vehicleBadge = getVehicleBadge(ride.vehicleType);
        const duration = calculateDuration(ride.from, ride.to); // Simulation
        const driverInitial = ride.driver.name.charAt(0).toUpperCase();

        return `
        <div class="ride-card" data-price="${ride.price}" data-rating="${ride.driver.rating}" data-ecological="${isEcological}" data-duration="${duration}" data-ride-id="${ride.id}">
            <div class="row">
                <div class="col-md-8">
                    <div class="driver-info">
                        <div class="driver-avatar">${driverInitial}</div>
                        <div>
                            <h6 class="mb-1">${ride.driver.name}</h6>
                            <div class="rating">
                                ${generateStars(ride.driver.rating)}
                                <span class="text-muted ms-1">${ride.driver.rating} (${ride.driver.reviewCount} avis)</span>
                            </div>
                        </div>
                        ${vehicleBadge}
                    </div>

                    <div class="route-info mb-2">
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <i class="fas fa-circle text-success"></i>
                                <strong class="departure-time">${ride.time}</strong> <span class="departure-city">${ride.from}</span>
                            </div>
                            <div class="flex-fill">
                                <hr class="my-0">
                            </div>
                            <div class="ms-3">
                                <i class="fas fa-map-marker-alt text-danger"></i>
                                <strong>--:--</strong> <span class="arrival-city">${ride.to}</span>
                            </div>
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>Durée estimée
                            <i class="fas fa-car ms-3 me-1"></i>${ride.vehicleBrand} ${ride.vehicleModel}
                        </small>
                    </div>

                    <div class="ride-details">
                        <p class="mb-2 small">${ride.description || 'Trajet ' + ride.from + '-' + ride.to}</p>
                        <div class="d-flex gap-3 small text-muted">
                            <span><i class="fas fa-users me-1"></i><span class="seats-available">${ride.seats}</span> places restantes</span>
                            ${ride.preferences.includes('pets') ? '<span><i class="fas fa-paw me-1"></i>Animaux OK</span>' : '<span><i class="fas fa-ban me-1"></i>Pas d\'animaux</span>'}
                            ${ride.preferences.includes('nosmoking') ? '<span><i class="fas fa-smoking-ban me-1"></i>Non-fumeur</span>' : ''}
                        </div>
                    </div>
                </div>

                <div class="col-md-4 text-end">
                    <div class="price-highlight mb-2">${ride.price}€</div>
                    <small class="text-muted d-block mb-3">par personne</small>
                    <button class="btn btn-detail">
                        <i class="fas fa-eye me-2"></i>Détails
                    </button>
                </div>
            </div>
        </div>
        `;
    }

    // Fonctions utilitaires
    function getVehicleIcon(type) {
        switch(type) {
            case 'electric': return '<i class="fas fa-leaf text-success"></i>';
            case 'hybrid': return '<i class="fas fa-leaf text-warning"></i>';
            case 'gasoline': return '<i class="fas fa-gas-pump text-secondary"></i>';
            default: return '<i class="fas fa-car"></i>';
        }
    }

    function getVehicleBadge(type) {
        switch(type) {
            case 'electric': return '<span class="eco-badge ms-auto"><i class="fas fa-leaf"></i> Écologique</span>';
            case 'hybrid': return '<span class="badge bg-warning text-dark ms-auto"><i class="fas fa-leaf"></i> Hybride</span>';
            case 'gasoline': return '<span class="badge bg-secondary ms-auto"><i class="fas fa-gas-pump"></i> Essence</span>';
            default: return '';
        }
    }

    function generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let starsHTML = '';

        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }

        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }

        return starsHTML;
    }

    function calculateDuration(from, to) {
        // Simulation simple de calcul de durée
        return Math.floor(Math.random() * 300) + 60; // Entre 1h et 6h
    }

    function getCurrentUser() {
        // Pour cette démo, retourner un utilisateur fictif
        return {
            name: 'VousDriver',
            rating: 4.8,
            reviewCount: 15
        };
    }

    function updateResultsCount() {
        const ridesCount = document.querySelectorAll('.ride-card').length;
        const resultsCountElement = document.getElementById('resultsCount');
        if (resultsCountElement) {
            resultsCountElement.textContent = `${ridesCount} covoiturage${ridesCount > 1 ? 's' : ''} trouvé${ridesCount > 1 ? 's' : ''}`;
        }
    }

    function showFieldError(field, message) {
        clearFieldError(field);
        field.classList.add('is-invalid');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    function clearFieldError(field) {
        field.classList.remove('is-invalid');
        const errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto-dismiss après 5 secondes
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    function showLoadingSpinner(show) {
        const submitBtn = document.querySelector('#createRideModal .btn-success');
        if (show) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Publication...';
            submitBtn.disabled = true;
        } else {
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Publier le trajet';
            submitBtn.disabled = false;
        }
    }

    // Charger les trajets existants au démarrage (si nécessaire)
    loadExistingRides();

    function loadExistingRides() {
        const existingRides = JSON.parse(localStorage.getItem('ecoride_rides')) || [];
        existingRides.forEach(ride => {
            // On pourrait ajouter les trajets sauvegardés ici si nécessaire
        });
    }
});