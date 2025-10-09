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