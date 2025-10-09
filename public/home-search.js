/**
 * GESTION DU FORMULAIRE DE RECHERCHE PAGE D'ACCUEIL
 * Redirige vers covoiturages.html avec les paramètres de recherche
 */

document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');

    if (!searchForm) {
        console.warn('Formulaire de recherche non trouvé sur la page d\'accueil');
        return;
    }

    // Définir la date minimum à aujourd'hui
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Récupérer les valeurs du formulaire
        const from = document.getElementById('departure')?.value.trim();
        const to = document.getElementById('arrival')?.value.trim();
        const date = document.getElementById('date')?.value;

        // Validation basique
        if (!from && !to && !date) {
            alert('Veuillez renseigner au moins un critère de recherche');
            return;
        }

        // Construire l'URL avec les paramètres de recherche
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (date) params.append('date', date);

        // Rediriger vers la page de covoiturages avec les paramètres
        window.location.href = `covoiturages.html?${params.toString()}`;
    });

    console.log('✅ Formulaire de recherche page d\'accueil initialisé');
});
