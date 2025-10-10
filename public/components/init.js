/**
 * INITIALISATION GLOBALE
 * Point d'entrée pour l'initialisation de la page
 */

// =====================================
// INITIALISATION
// =====================================
document.addEventListener('DOMContentLoaded', function() {
    // Appeler les fonctions uniquement si elles existent
    if (typeof initDateInputs === 'function') initDateInputs();
    if (typeof initFilters === 'function') initFilters();
    if (typeof initSorting === 'function') initSorting();
    if (typeof initDetailButtons === 'function') initDetailButtons();
    if (typeof initSearchButtons === 'function') initSearchButtons();
    if (typeof initCreateRide === 'function') initCreateRide();
    if (typeof initReservation === 'function') initReservation();
    if (typeof initializeWithAPI === 'function') initializeWithAPI();
});

// Initialisation avec chargement des données API
function initializeWithAPI() {
    // Vérifier s'il y a des paramètres de recherche dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    const to = urlParams.get('to');
    const date = urlParams.get('date');

    // S'il y a des paramètres URL, pré-remplir le formulaire et lancer la recherche
    if (from || to || date) {
        // Pré-remplir le formulaire
        if (from) {
            const departureInput = document.getElementById('departure');
            if (departureInput) departureInput.value = from;
        }
        if (to) {
            const arrivalInput = document.getElementById('arrival');
            if (arrivalInput) arrivalInput.value = to;
        }
        if (date) {
            const dateInput = document.getElementById('date');
            if (dateInput) dateInput.value = date;
        }

        // Lancer la recherche avec ces paramètres
        const searchParams = {
            from: from || '',
            to: to || '',
            date: date || ''
        };

        // Mettre à jour les paramètres de recherche globaux
        window.currentSearchParams = searchParams;

        if (typeof loadRidesFromAPI === 'function') {
            loadRidesFromAPI(searchParams, 1, window.currentFilters);
        }
    } else {
        // Charger les trajets par défaut au démarrage
        if (typeof loadRidesFromAPI === 'function') {
            loadRidesFromAPI();
        }
    }
}

// Export global
window.initializeWithAPI = initializeWithAPI;
