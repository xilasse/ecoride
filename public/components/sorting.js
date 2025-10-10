/**
 * GESTION DU TRI
 * Fonctions pour trier les résultats
 */

function initSorting() {
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            window.currentSort = this.value;
            reloadWithSort();
        });
    }
}

// Nouvelle fonction pour recharger les données avec le tri actuel
function reloadWithSort() {
    loadRidesFromAPI(window.currentSearchParams, 1, window.currentFilters);
}

// Cette fonction est maintenant obsolète car le tri est fait côté serveur
// Gardée pour la compatibilité mais redirige vers reloadWithSort
function sortRides(criteria) {
    window.currentSort = criteria;
    reloadWithSort();
}

// Export global
window.initSorting = initSorting;
window.reloadWithSort = reloadWithSort;
window.sortRides = sortRides;
