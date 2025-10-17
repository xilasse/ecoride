/**
 * GESTION DES CRÉDITS
 * Module pour afficher le solde et l'historique des transactions
 */

// Charger les données des crédits
function loadCreditsData() {
    console.log('💰 Chargement des données de crédits');

    fetch('/api/auth/profile', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.user) {
                const user = data.user;

                // Mettre à jour les cartes de résumé
                document.getElementById('creditsAvailable').textContent = user.credits || '0';
                document.getElementById('creditsBlocked').textContent = user.credits_blocked || '0';
                document.getElementById('creditsEarned').textContent = user.totalRidesAsDriver ? (user.totalRidesAsDriver * 25) : '0';

                console.log('✅ Données de crédits chargées');
            }
        })
        .catch(error => {
            console.error('❌ Erreur lors du chargement des crédits:', error);
        });
}

// Charger l'historique des transactions
function loadTransactions() {
    console.log('📜 Chargement de l\'historique des transactions');

    const container = document.getElementById('transactionsList');
    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div></div>';

    fetch('/api/auth/credits/transactions?limit=20', { credentials: 'include' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Réponse API transactions:', data);
            if (data.success && data.transactions) {
                if (data.transactions.length === 0) {
                    container.innerHTML = `
                        <div class="text-center p-4 text-muted">
                            <i class="fas fa-receipt fa-3x mb-3"></i>
                            <h5>Aucune transaction</h5>
                            <p>Vos transactions apparaîtront ici</p>
                        </div>
                    `;
                    return;
                }

                let html = '<div class="table-responsive"><table class="table table-hover">';
                html += '<thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="text-end">Montant</th><th class="text-end">Solde après</th></tr></thead><tbody>';

                data.transactions.forEach(transaction => {
                    const date = new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const typeLabels = {
                        'reservation': '🎫 Réservation',
                        'refund': '↩️ Remboursement',
                        'payout': '💸 Paiement reçu',
                        'compensation': '💰 Compensation',
                        'purchase': '🛒 Achat'
                    };

                    const typeLabel = typeLabels[transaction.type] || transaction.type;
                    const amount = parseFloat(transaction.amount);
                    const amountClass = amount >= 0 ? 'text-success' : 'text-danger';
                    const amountSign = amount >= 0 ? '+' : '';

                    html += `
                        <tr>
                            <td><small>${date}</small></td>
                            <td><span class="badge bg-secondary">${typeLabel}</span></td>
                            <td><small>${transaction.description || '-'}</small></td>
                            <td class="text-end ${amountClass}"><strong>${amountSign}${amount.toFixed(2)}€</strong></td>
                            <td class="text-end"><small>${parseFloat(transaction.balance_after).toFixed(2)}€</small></td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                container.innerHTML = html;

                console.log(`✅ ${data.transactions.length} transactions chargées`);
            } else {
                container.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des transactions</div>';
            }
        })
        .catch(error => {
            console.error('❌ Erreur lors du chargement des transactions:', error);
            container.innerHTML = '<div class="alert alert-danger">Erreur de connexion au serveur</div>';
        });
}

// Simuler un achat de crédits
function simulatePurchase() {
    const amount = prompt('Combien de crédits voulez-vous ajouter ? (max 500)', '50');

    if (!amount || isNaN(amount) || amount <= 0) {
        showNotification('Montant invalide', 'error');
        return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum > 500) {
        showNotification('Le montant maximum est de 500 crédits', 'error');
        return;
    }

    fetch('/api/auth/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: amountNum })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(`${amountNum} crédits ajoutés avec succès !`, 'success');

            // Recharger les données
            loadCreditsData();
            loadTransactions();

            // Mettre à jour le header du profil
            if (typeof loadProfileData === 'function') {
                loadProfileData();
            }
        } else {
            showNotification(data.error || 'Erreur lors de l\'achat', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    });
}

// Initialiser l'onglet Crédits
function initCreditsTab() {
    const creditsTab = document.getElementById('credits-tab');
    if (!creditsTab) return;

    creditsTab.addEventListener('shown.bs.tab', function () {
        console.log('📂 Onglet Crédits activé');
        loadCreditsData();
        loadTransactions();
    });
}

// Exporter les fonctions globalement
window.loadCreditsData = loadCreditsData;
window.loadTransactions = loadTransactions;
window.simulatePurchase = simulatePurchase;
window.initCreditsTab = initCreditsTab;
