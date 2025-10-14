// Mettre à jour l'interface de pagination
function updatePaginationUI() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || !pagination.total_pages || pagination.total_pages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const currentPage = pagination.current_page || 1;
    const totalPages = pagination.total_pages;
    const hasPrevious = pagination.has_previous;
    const hasNext = pagination.has_next;

    let paginationHTML = '<nav aria-label="Navigation des pages"><ul class="pagination justify-content-center">';

    // Bouton précédent
    if (hasPrevious) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Précédent
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-left"></i> Précédent</span>
            </li>
        `;
    }

    // Numéros de page
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHTML += '<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1)">1</a></li>';
        if (startPage > 2) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${i})">${i}</a></li>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Bouton suivant
    if (hasNext) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage + 1})">
                    Suivant <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link">Suivant <i class="fas fa-chevron-right"></i></span>
            </li>
        `;
    }

    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;
}

// Naviguer vers une page spécifique
function goToPage(page) {
    if (page < 1 || (pagination.total_pages && page > pagination.total_pages)) {
        return;
    }

    console.log(`📄 Navigation vers la page ${page}`);
    loadRidesFromAPI(currentSearchParams, page, currentFilters);
}