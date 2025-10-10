/**
 * GESTION DE LA CRÉATION DE TRAJETS
 * Formulaire de création de nouveau trajet
 */

function initCreateRide() {
    const createRideForm = document.getElementById('createRideForm');
    const createRideModal = document.getElementById('createRideModal');

    if (!createRideForm || !createRideModal) return;

    // Définir la date minimum à aujourd'hui
    const rideDateInput = document.getElementById('rideDate');
    if (rideDateInput) {
        const today = new Date().toISOString().split('T')[0];
        rideDateInput.min = today;
    }

    // Gestion de la soumission du formulaire
    createRideForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateCreateRideForm()) {
            const rideData = collectRideFormData();
            createNewRide(rideData);
        }
    });
}

// Validation du formulaire
function validateCreateRideForm() {
    const requiredFields = ['rideFrom', 'rideTo', 'rideDate', 'rideTime', 'rideSeats', 'ridePrice'];
    let isValid = true;

    // Vérifier les champs obligatoires
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            showFieldError(field, 'Ce champ est obligatoire');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });

    // Vérifier qu'un type de véhicule est sélectionné
    const vehicleTypeSelected = document.querySelector('input[name="vehicleType"]:checked');
    if (!vehicleTypeSelected) {
        if (typeof showNotification === 'function') {
            showNotification('Veuillez sélectionner un type de véhicule', 'warning');
        }
        isValid = false;
    }

    // Vérifier que la date n'est pas dans le passé
    const rideDateInput = document.getElementById('rideDate');
    if (rideDateInput && rideDateInput.value) {
        const selectedDate = new Date(rideDateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showFieldError(rideDateInput, 'La date ne peut pas être dans le passé');
            isValid = false;
        }
    }

    // Vérifier le prix
    const priceInput = document.getElementById('ridePrice');
    if (priceInput) {
        const price = parseInt(priceInput.value);
        if (price < 1 || price > 200) {
            showFieldError(priceInput, 'Le prix doit être entre 1€ et 200€');
            isValid = false;
        }
    }

    return isValid;
}

// Collecter les données du formulaire
function collectRideFormData() {
    const vehicleType = document.querySelector('input[name="vehicleType"]:checked')?.value;
    const preferences = Array.from(document.querySelectorAll('input[name="preferences"]:checked'))
                            .map(cb => cb.value);

    const rideData = {
        from: document.getElementById('rideFrom')?.value.trim(),
        to: document.getElementById('rideTo')?.value.trim(),
        date: document.getElementById('rideDate')?.value,
        time: document.getElementById('rideTime')?.value,
        arrivalTime: document.getElementById('arrivalTime')?.value || null,
        seats: parseInt(document.getElementById('rideSeats')?.value || 0),
        price: parseInt(document.getElementById('ridePrice')?.value || 0),
        vehicleType: vehicleType,
        vehicleBrand: document.getElementById('vehicleBrand')?.value.trim(),
        vehicleModel: document.getElementById('vehicleModel')?.value.trim(),
        preferences: preferences,
        description: document.getElementById('rideDescription')?.value.trim(),
        meetingPoint: document.getElementById('meetingPoint')?.value.trim()
    };

    return rideData;
}

// Créer un nouveau trajet
function createNewRide(rideData) {
    if (typeof showLoadingSpinner === 'function') {
        showLoadingSpinner(true);
    }

    // Afficher un message si pas d'heure d'arrivée (calcul en cours)
    if (!rideData.arrivalTime && typeof showNotification === 'function') {
        showNotification('Calcul de l\'itinéraire en cours...', 'info');
    }

    // Appel API pour créer le trajet
    fetch('/api/rides/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(rideData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Fermer le modal et réinitialiser le formulaire
            const createRideModal = bootstrap.Modal.getInstance(document.getElementById('createRideModal'));
            if (createRideModal) createRideModal.hide();

            const createRideForm = document.getElementById('createRideForm');
            if (createRideForm) createRideForm.reset();

            // Afficher un message de succès
            if (typeof showNotification === 'function') {
                showNotification('Votre trajet a été publié avec succès !', 'success');
            }

            // Recharger la liste des trajets
            if (typeof loadRidesFromAPI === 'function') {
                loadRidesFromAPI(window.currentSearchParams, 1, window.currentFilters);
            }
        } else {
            if (typeof showNotification === 'function') {
                showNotification('Erreur lors de la création du trajet: ' + (data.error || 'Erreur inconnue'), 'danger');
            }
        }
    })
    .catch(error => {
        console.error('❌ Erreur création trajet:', error);
        if (typeof showNotification === 'function') {
            showNotification('Erreur de connexion. Veuillez réessayer.', 'danger');
        }
    })
    .finally(() => {
        if (typeof showLoadingSpinner === 'function') {
            showLoadingSpinner(false);
        }
    });
}

// Afficher une erreur de champ
function showFieldError(field, message) {
    if (!field) return;

    clearFieldError(field);
    field.classList.add('is-invalid');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

// Effacer une erreur de champ
function clearFieldError(field) {
    if (!field) return;

    field.classList.remove('is-invalid');
    const errorDiv = field.parentNode.querySelector('.invalid-feedback');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Export global
window.initCreateRide = initCreateRide;
