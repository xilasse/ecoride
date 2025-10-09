/**
 * GESTION DES FILTRES
 * Initialisation et gestion des filtres de recherche
 */

function initDateInputs() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        if (!dateInput.value) {
            dateInput.value = today;
        }
    }
}

function initFilters() {
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');

    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = this.value + '€';
            currentFilters.maxPrice = parseInt(this.value);
            reloadWithFilters();
        });
        priceValue.textContent = priceRange.value + '€';
        currentFilters.maxPrice = parseInt(priceRange.value);
    }

    // Checkbox filters
    const ecoOnly = document.getElementById('ecoOnly');
    if (ecoOnly) {
        ecoOnly.addEventListener('change', function() {
            currentFilters.ecoOnly = this.checked;
            reloadWithFilters();
        });
    }

    const petsAllowed = document.getElementById('petsAllowed');
    if (petsAllowed) {
        petsAllowed.addEventListener('change', function() {
            currentFilters.petsAllowed = this.checked;
            reloadWithFilters();
        });
    }

    const smokingAllowed = document.getElementById('smokingAllowed');
    if (smokingAllowed) {
        smokingAllowed.addEventListener('change', function() {
            currentFilters.nonSmoking = this.checked;
            reloadWithFilters();
        });
    }

    // Select filters
    const durationFilter = document.getElementById('durationFilter');
    if (durationFilter) {
        durationFilter.addEventListener('change', function() {
            currentFilters.maxDuration = this.value ? parseInt(this.value) : 999999;
            reloadWithFilters();
        });
    }

    const ratingFilter = document.getElementById('ratingFilter');
    if (ratingFilter) {
        ratingFilter.addEventListener('change', function() {
            currentFilters.minRating = this.value ? parseFloat(this.value) : 0;
            reloadWithFilters();
        });
    }

    // Clear filters button
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
}

function clearAllFilters() {
    console.log('Effacement de tous les filtres');

    // Reset checkboxes
    const checkboxes = document.querySelectorAll('.filters-sidebar input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Reset selects
    const selects = document.querySelectorAll('.filters-sidebar select');
    selects.forEach(select => {
        select.selectedIndex = 0;
    });

    // Reset price range
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange && priceValue) {
        priceRange.value = 50;
        priceValue.textContent = '50€';
    }

    // Reset filters object
    currentFilters = {
        ecoOnly: false,
        maxPrice: 50,
        maxDuration: 999999,
        minRating: 0,
        petsAllowed: false,
        nonSmoking: false
    };

    reloadWithFilters();
    showNotification('Filtres effacés', 'success');
}

// Nouvelle fonction pour recharger les données avec les filtres actuels
function reloadWithFilters() {
    console.log('🔄 Rechargement avec filtres:', currentFilters);
    loadRidesFromAPI(currentSearchParams, 1, currentFilters); // Retour à la page 1 quand on change les filtres
}

// Export global
window.initDateInputs = initDateInputs;
window.initFilters = initFilters;
window.clearAllFilters = clearAllFilters;
window.reloadWithFilters = reloadWithFilters;
