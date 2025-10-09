/**
 * VARIABLES GLOBALES - GESTION D'ÉTAT
 * Centralisation de toutes les variables d'état de l'application
 */

// Variables globales
let currentFilters = {
    ecoOnly: false,
    maxPrice: 50,
    // NOTE: maxDuration et minRating ne sont pas encore implémentés côté serveur
    maxDuration: 999999,  // TODO: Implémenter le filtre durée dans l'API
    minRating: 0,         // TODO: Implémenter le filtre note dans l'API (nécessite table ratings)
    petsAllowed: false,
    nonSmoking: false
};

let currentSort = 'datetime';
let allRides = []; // Stockage des trajets récupérés de l'API
let currentPage = 1;
let currentSearchParams = {};
let pagination = {};

// Export pour utilisation globale
window.currentFilters = currentFilters;
window.currentSort = currentSort;
window.allRides = allRides;
window.currentPage = currentPage;
window.currentSearchParams = currentSearchParams;
window.pagination = pagination;
