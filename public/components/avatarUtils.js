/**
 * GESTION CENTRALISÉE DES AVATARS
 * Module utilitaire pour gérer l'affichage et l'upload des avatars utilisateurs
 */

// Configuration
const AVATAR_CONFIG = {
    uploadPath: '/uploads/avatars/',
    defaultColors: [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#34495e', '#16a085', '#d35400'
    ],
    sizes: {
        small: '40px',
        medium: '60px',
        large: '100px',
        xlarge: '150px'
    }
};

/**
 * Obtenir l'URL complète de l'avatar ou générer un placeholder
 * @param {Object} user - Objet utilisateur avec profile_picture et pseudo
 * @param {string} size - Taille de l'avatar (small, medium, large, xlarge)
 * @returns {Object} {type: 'image'|'placeholder', src: string, initials: string, color: string}
 */
function getAvatarData(user, size = 'medium') {
    if (!user) {
        return {
            type: 'placeholder',
            src: '',
            initials: '?',
            color: AVATAR_CONFIG.defaultColors[0],
            size: AVATAR_CONFIG.sizes[size]
        };
    }

    const pseudo = user.pseudo || user.driver_name || user.passenger_name || 'User';
    const profilePicture = user.profile_picture || user.driver_avatar || user.passenger_avatar;

    // Si l'utilisateur a une photo de profil
    if (profilePicture && profilePicture.trim() !== '') {
        // Si c'est déjà une URL complète, la retourner telle quelle
        if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
            return {
                type: 'image',
                src: profilePicture,
                initials: getInitials(pseudo),
                color: getUserColor(pseudo),
                size: AVATAR_CONFIG.sizes[size]
            };
        }
        // Sinon, construire le chemin vers le dossier uploads
        return {
            type: 'image',
            src: AVATAR_CONFIG.uploadPath + profilePicture,
            initials: getInitials(pseudo),
            color: getUserColor(pseudo),
            size: AVATAR_CONFIG.sizes[size]
        };
    }

    // Sinon, retourner un placeholder avec initiales
    return {
        type: 'placeholder',
        src: '',
        initials: getInitials(pseudo),
        color: getUserColor(pseudo),
        size: AVATAR_CONFIG.sizes[size]
    };
}

/**
 * Obtenir les initiales d'un nom/pseudo
 * @param {string} name - Nom ou pseudo
 * @returns {string} Initiales (1 ou 2 lettres)
 */
function getInitials(name) {
    if (!name || name.trim() === '') return '?';

    const cleaned = name.trim().toUpperCase();
    const words = cleaned.split(/\s+/);

    if (words.length >= 2) {
        // Prendre la première lettre des deux premiers mots
        return words[0].charAt(0) + words[1].charAt(0);
    }

    // Sinon, prendre les deux premières lettres du mot
    return cleaned.charAt(0) + (cleaned.charAt(1) || '');
}

/**
 * Obtenir une couleur basée sur le pseudo (toujours la même pour un pseudo donné)
 * @param {string} name - Nom ou pseudo
 * @returns {string} Code couleur hexadécimal
 */
function getUserColor(name) {
    if (!name || name.trim() === '') return AVATAR_CONFIG.defaultColors[0];

    // Générer un index basé sur le hash du nom
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % AVATAR_CONFIG.defaultColors.length;
    return AVATAR_CONFIG.defaultColors[index];
}

/**
 * Générer le HTML d'un avatar
 * @param {Object} user - Objet utilisateur
 * @param {string} size - Taille (small, medium, large, xlarge)
 * @param {string} className - Classes CSS additionnelles
 * @returns {string} HTML de l'avatar
 */
function generateAvatarHTML(user, size = 'medium', className = '') {
    const avatarData = getAvatarData(user, size);
    const sizeValue = avatarData.size;

    if (avatarData.type === 'image') {
        return `
            <div class="avatar-container ${className}" style="width: ${sizeValue}; height: ${sizeValue};">
                <img src="${avatarData.src}"
                     alt="${user.pseudo || 'Avatar'}"
                     class="avatar-image"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                <div class="avatar-placeholder"
                     style="display: none; width: 100%; height: 100%; border-radius: 50%; background: ${avatarData.color}; color: white; align-items: center; justify-content: center; font-weight: bold; font-size: calc(${sizeValue} / 2.5);">
                    ${avatarData.initials}
                </div>
            </div>
        `;
    }

    return `
        <div class="avatar-container ${className}" style="width: ${sizeValue}; height: ${sizeValue};">
            <div class="avatar-placeholder"
                 style="display: flex; width: 100%; height: 100%; border-radius: 50%; background: ${avatarData.color}; color: white; align-items: center; justify-content: center; font-weight: bold; font-size: calc(${sizeValue} / 2.5);">
                ${avatarData.initials}
            </div>
        </div>
    `;
}

/**
 * Mettre à jour un élément DOM avec un avatar
 * @param {string|HTMLElement} element - ID de l'élément ou élément DOM
 * @param {Object} user - Objet utilisateur
 * @param {string} size - Taille
 */
function updateAvatarElement(element, user, size = 'medium') {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return;

    const avatarData = getAvatarData(user, size);

    if (avatarData.type === 'image') {
        el.innerHTML = `
            <img src="${avatarData.src}"
                 alt="${user.pseudo || 'Avatar'}"
                 style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=&quot;display: flex; width: 100%; height: 100%; border-radius: 50%; background: ${avatarData.color}; color: white; align-items: center; justify-content: center; font-weight: bold; font-size: calc(${avatarData.size} / 2.5);&quot;>${avatarData.initials}</div>';">
        `;
    } else {
        el.innerHTML = `
            <div style="display: flex; width: 100%; height: 100%; border-radius: 50%; background: ${avatarData.color}; color: white; align-items: center; justify-content: center; font-weight: bold; font-size: calc(${avatarData.size} / 2.5);">
                ${avatarData.initials}
            </div>
        `;
    }
}

/**
 * Créer un input file pour l'upload d'avatar
 * @param {Function} onUpload - Callback appelé après l'upload réussi
 * @returns {HTMLInputElement}
 */
function createAvatarUploadInput(onUpload) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/jpg,image/gif,image/webp';
    input.style.display = 'none';

    input.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Vérifier la taille (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            showNotification('L\'image ne doit pas dépasser 2MB', 'error');
            return;
        }

        // Vérifier le type MIME
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showNotification('Format non supporté. Utilisez JPG, PNG, GIF ou WebP', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch('/api/auth/upload-avatar', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Photo de profil mise à jour !', 'success');
                if (typeof onUpload === 'function') {
                    onUpload(data.avatarUrl);
                }
                // Recharger les données du profil
                if (typeof loadProfileData === 'function') {
                    loadProfileData();
                }
            } else {
                showNotification('Erreur: ' + (data.error || 'Erreur lors de l\'upload'), 'error');
            }
        } catch (error) {
            console.error('❌ Erreur upload:', error);
            showNotification('Erreur lors de l\'upload de l\'image', 'error');
        }
    });

    return input;
}

/**
 * Ajouter un bouton de changement d'avatar à un élément
 * @param {string|HTMLElement} containerElement - ID ou élément conteneur
 * @param {Function} onUpload - Callback après upload
 */
function addAvatarUploadButton(containerElement, onUpload) {
    const container = typeof containerElement === 'string'
        ? document.getElementById(containerElement)
        : containerElement;

    if (!container) return;

    // Vérifier si le bouton est déjà initialisé
    if (container.dataset.uploadInitialized === 'true') {
        return;
    }

    // Marquer comme initialisé
    container.dataset.uploadInitialized = 'true';

    // Créer l'input file caché
    const input = createAvatarUploadInput(onUpload);
    document.body.appendChild(input);

    // Ajouter un bouton ou rendre le conteneur cliquable
    container.style.cursor = 'pointer';
    container.title = 'Cliquer pour changer la photo';

    // Ajouter un badge "modifier" en survol
    const editBadge = document.createElement('div');
    editBadge.className = 'avatar-edit-badge';
    editBadge.innerHTML = '<i class="fas fa-camera"></i>';
    editBadge.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        background: #3498db;
        color: white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.3s;
    `;

    container.style.position = 'relative';
    container.appendChild(editBadge);

    container.addEventListener('mouseenter', () => {
        editBadge.style.opacity = '1';
    });

    container.addEventListener('mouseleave', () => {
        editBadge.style.opacity = '0';
    });

    container.addEventListener('click', () => {
        input.click();
    });
}

// Exports globaux
window.AvatarUtils = {
    getAvatarData,
    getInitials,
    getUserColor,
    generateAvatarHTML,
    updateAvatarElement,
    createAvatarUploadInput,
    addAvatarUploadButton,
    AVATAR_CONFIG
};
