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
        // La fonction transformRideDataForModal est maintenant dans utils.js
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
                                ${ride.avatarImage ?
                                    `<div class="driver-avatar me-3" style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden;">
                                        <img src="${ride.avatarImage}" alt="${ride.driver}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<div style=\\'width: 50px; height: 50px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;\\'>${ride.avatar}</div>'">
                                    </div>` :
                                    `<div class="driver-avatar me-3" style="width: 50px; height: 50px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${ride.avatar}</div>`
                                }
                                <div>
                                    <h6 class="mb-1">${ride.driver}</h6>
                                    ${ride.driverEmail ? `<p class="small text-muted mb-1"><i class="fas fa-envelope me-1"></i>${ride.driverEmail}</p>` : ''}
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
                                <span class="badge ${ride.preferences.smoking ? 'bg-warning' : 'bg-success'}">
                                    <i class="fas fa-smoking${ride.preferences.smoking ? '' : '-ban'} me-1"></i>
                                    ${ride.preferences.smoking ? 'Fumeur autorisé' : 'Non-fumeur'}
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
                        <button type="button" class="btn btn-success" onclick="participateRide(${ride.id}, ${ride.price}, ${ride.seatsAvailable})">
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

// Export global
window.viewRideDetails = viewRideDetails;
window.showRideModal = showRideModal;
window.generateStars = generateStars;