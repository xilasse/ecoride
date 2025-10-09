/**
 * GESTION DU TRI
 * Fonctions pour trier les résultats
 */

function initSorting() {
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            reloadWithSort();
        });
    }
}

// Nouvelle fonction pour recharger les données avec le tri actuel
function reloadWithSort() {
    console.log('🔄 Rechargement avec tri:', currentSort);
    loadRidesFromAPI(currentSearchParams, 1, currentFilters); // Retour à la page 1 quand on change le tri
}

// Cette fonction est maintenant obsolète car le tri est fait côté serveur
// Gardée pour la compatibilité mais redirige vers reloadWithSort
function sortRides(criteria) {
    console.log('⚠️  sortRides() obsolète, redirection vers reloadWithSort()');
    currentSort = criteria;
    reloadWithSort();
}

// Export global
window.initSorting = initSorting;
window.reloadWithSort = reloadWithSort;
window.sortRides = sortRides;
