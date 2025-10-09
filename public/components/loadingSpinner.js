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