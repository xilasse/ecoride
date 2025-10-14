/**
 * VARIABLES GLOBALES - GESTION D'ÉTAT
 * Centralisation de toutes les variables d'état de l'application
 */

// Variables globales
let currentFilters = {
    ecoOnly: false,
    maxPrice: 50,
    // NOTE: Tous les filtres sont maintenant implémentés côté serveur
    maxDuration: 999999,  // ✅ Implémenté côté serveur
    minRating: 0,         // ✅ Implémenté côté serveur
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
