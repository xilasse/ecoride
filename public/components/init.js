/**
 * INITIALISATION GLOBALE
 * Point d'entrée pour l'initialisation de la page
 */

// =====================================
// INITIALISATION
// =====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation de la page Covoiturages...');

    initDateInputs();
    initFilters();
    initSorting();
    initDetailButtons();
    initSearchForm();
    initializeWithAPI();

    console.log('Page Covoiturages initialisée avec succès');
});

// Initialisation du formulaire de recherche
function initSearchForm() {
    const searchForm = document.getElementById('searchForm');
    console.log(searchForm)
    if (!searchForm) {
        console.warn('⚠️ Formulaire de recherche non trouvé');
        return;
    }

    const submitButton = searchForm.querySelector('button[type="submit"]');

    // Gestionnaire de soumission du formulaire
    // Mode CAPTURE pour garantir l'interception
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const searchParams = {
            from: document.getElementById('departure')?.value.trim() || '',
            to: document.getElementById('arrival')?.value.trim() || '',
            date: document.getElementById('date')?.value || ''
        };

        console.log('🔍 Recherche avec paramètres:', searchParams);

        // Mettre à jour les paramètres de recherche globaux
        window.currentSearchParams = searchParams;

        // Lancer la recherche
        if (typeof loadRidesFromAPI === 'function') {
            loadRidesFromAPI(searchParams, 1, currentFilters);

            // Notification
            if (typeof showNotification === 'function') {
                let message = 'Recherche lancée';
                if (searchParams.from) message += ` depuis ${searchParams.from}`;
                if (searchParams.to) message += ` vers ${searchParams.to}`;
                if (searchParams.date) message += ` le ${new Date(searchParams.date).toLocaleDateString('fr-FR')}`;
                showNotification(message, 'info');
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

// Initialisation avec chargement des données API
function initializeWithAPI() {
    // Vérifier s'il y a des paramètres de recherche dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    const to = urlParams.get('to');
    const date = urlParams.get('date');

    // S'il y a des paramètres URL, pré-remplir le formulaire et lancer la recherche
    if (from || to || date) {
        console.log('📍 Paramètres de recherche détectés dans l\'URL');

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

        if (typeof loadRidesFromAPI === 'function') {
            loadRidesFromAPI(searchParams, 1, currentFilters);
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
