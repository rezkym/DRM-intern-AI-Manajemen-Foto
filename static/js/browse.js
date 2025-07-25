// JavaScript untuk Browse Foto

/**
 * Load daftar folder dari API
 */
async function loadFoldersList() {
    try {
        showLoading();
        
        const response = await fetch('/api/browse');
        const data = await response.json();
        
        if (response.ok) {
            if (data.folders && data.folders.length > 0) {
                renderFoldersList(data.folders);
            } else {
                showNoFoldersMessage();
            }
        } else {
            throw new Error(data.error || 'Gagal memuat daftar folder');
        }
        
    } catch (error) {
        console.error('Error loading folders:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Load foto dalam folder tertentu
 */
async function loadFolderPhotos(folderName) {
    try {
        showLoading();
        
        const response = await fetch(`/api/browse?folder=${encodeURIComponent(folderName)}`);
        const data = await response.json();
        
        if (response.ok) {
            if (data.photos && data.photos.length > 0) {
                renderFolderPhotos(data.folder, data.photos);
            } else {
                showEmptyFolderMessage(data.folder);
            }
        } else {
            throw new Error(data.error || 'Gagal memuat foto dalam folder');
        }
        
    } catch (error) {
        console.error('Error loading folder photos:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Render daftar folder dengan design compact
 */
function renderFoldersList(folders) {
    const container = document.getElementById('foldersContainer');
    const foldersView = document.getElementById('foldersView');
    
    let html = '';
    folders.forEach(folder => {
        const displayName = folder.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `
            <div class="col-lg-4 col-md-6 mb-3">
                <a href="/browse.html?folder=${encodeURIComponent(folder.name)}" class="folder-card text-decoration-none">
                    <div class="card h-100 hover-card">
                        <div class="card-body text-center">
                            <div class="folder-icon mx-auto mb-3">
                                <i class="fas fa-folder-open fa-lg text-white"></i>
                            </div>
                            <h6 class="card-title fw-bold mb-2">${displayName}</h6>
                            <p class="card-text text-muted mb-3 small">
                                Koleksi foto terorganisir
                            </p>
                            <div class="d-flex justify-content-center align-items-center">
                                <span class="badge bg-info me-2">
                                    <i class="fas fa-images me-1"></i>${folder.photo_count}
                                </span>
                                <small class="text-muted">foto</small>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `;
    });
    
    container.innerHTML = html;
    foldersView.style.display = 'block';
}

/**
 * Render foto dalam folder dengan design compact
 */
function renderFolderPhotos(folderName, photos) {
    const container = document.getElementById('photosContainer');
    const folderView = document.getElementById('folderView');
    const folderNameElement = document.getElementById('folderName');
    
    folderNameElement.textContent = folderName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    let html = '';
    photos.forEach(photo => {
        const description = photo.metadata.description || '';
        const truncatedDesc = description.length > 80 ? description.substring(0, 80) + '...' : description;
        
        let keywordsHtml = '';
        if (photo.metadata.keywords && photo.metadata.keywords.length > 0) {
            const visibleKeywords = photo.metadata.keywords.slice(0, 2);
            keywordsHtml = visibleKeywords.map(keyword => 
                `<span class="badge bg-secondary me-1 mb-1">${keyword}</span>`
            ).join('');
            
            if (photo.metadata.keywords.length > 2) {
                keywordsHtml += `<span class="badge bg-info">+${photo.metadata.keywords.length - 2}</span>`;
            }
        }
        
        html += `
            <div class="col-lg-4 col-md-6 mb-3">
                <div class="card photo-card hover-card h-100">
                    <div class="position-relative overflow-hidden" style="border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;">
                        <img src="/${photo.path}" class="card-img-top" alt="${photo.filename}" 
                             onclick="showPhotoModal('${photo.path}', '${photo.filename}', ${JSON.stringify(photo.metadata).replace(/"/g, '&quot;')})">
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-primary">
                                <i class="fas fa-eye"></i>
                            </span>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title fw-bold mb-2 text-truncate">${photo.filename}</h6>
                        ${description ? `<p class="card-text small text-muted flex-grow-1 text-truncate-2">${truncatedDesc}</p>` : ''}
                        ${keywordsHtml ? `<div class="mt-auto">${keywordsHtml}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    folderView.style.display = 'block';
}

/**
 * Show loading indicator
 */
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('foldersView').style.display = 'none';
    document.getElementById('folderView').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
}

/**
 * Show no folders message
 */
function showNoFoldersMessage() {
    document.getElementById('noFoldersMessage').style.display = 'block';
    document.getElementById('foldersView').style.display = 'block';
}

/**
 * Show empty folder message
 */
function showEmptyFolderMessage(folderName) {
    document.getElementById('folderName').textContent = folderName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    document.getElementById('emptyFolderMessage').style.display = 'block';
    document.getElementById('folderView').style.display = 'block';
}

// Show photo modal dengan metadata
function showPhotoModal(path, filename, metadata) {
    const modal = new bootstrap.Modal(document.getElementById('photoModal'));
    const modalTitle = document.getElementById('photoModalTitle');
    const modalImage = document.getElementById('photoModalImage');
    const modalMetadata = document.getElementById('photoModalMetadata');
    
    modalTitle.textContent = filename;
    modalImage.src = '/' + path;
    modalImage.alt = filename;
    
    // Generate metadata content
    let metadataContent = generateMetadataHTML(metadata);
    modalMetadata.innerHTML = metadataContent;
    
    modal.show();
}

// Generate metadata HTML - compact version
function generateMetadataHTML(metadata) {
    let content = '';
    
    if (!metadata || Object.keys(metadata).length === 0) {
        return '<div class="text-muted small">Tidak ada metadata tersedia</div>';
    }
    
    const fields = [
        { key: 'description', label: 'Deskripsi' },
        { key: 'activity', label: 'Aktivitas' },
        { key: 'location_type', label: 'Tipe Lokasi' },
        { key: 'location_specific', label: 'Lokasi Spesifik' },
        { key: 'mood', label: 'Suasana' },
        { key: 'people_details', label: 'Detail Orang' }
    ];
    
    fields.forEach(field => {
        if (metadata[field.key] && metadata[field.key] !== 'null' && metadata[field.key] !== null) {
            content += `
                <div class="metadata-item">
                    <div class="metadata-label">${field.label}:</div>
                    <div class="metadata-value">${metadata[field.key]}</div>
                </div>
            `;
        }
    });
    
    // People count
    if (metadata.people_count && metadata.people_count > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Jumlah Orang:</div>
                <div class="metadata-value">${metadata.people_count} orang</div>
            </div>
        `;
    }
    
    // Main objects
    if (metadata.main_objects && metadata.main_objects.length > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Objek Utama:</div>
                <div class="metadata-value">${metadata.main_objects.join(', ')}</div>
            </div>
        `;
    }
    
    // Keywords
    if (metadata.keywords && metadata.keywords.length > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Keywords:</div>
                <div class="metadata-value">
                    ${metadata.keywords.map(keyword => 
                        `<span class="badge bg-info me-1 mb-1">${keyword}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    return content || '<div class="text-muted small">Tidak ada informasi detail tersedia</div>';
}

// Enhanced interactions and animations
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth hover effects
    document.addEventListener('mouseenter', function(e) {
        if (e.target.closest('.hover-card')) {
            e.target.closest('.hover-card').style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
    }, true);
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        // ESC to close modal
        if (e.key === 'Escape') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('photoModal'));
            if (modal) {
                modal.hide();
            }
        }
        
        // Arrow keys for navigation
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // TODO: Implement photo navigation
        }
    });
    
    // Add intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe cards for animation
    function observeCards() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(card);
        });
    }
    
    // Call observe when cards are rendered
    const originalRenderFoldersList = window.renderFoldersList;
    const originalRenderFolderPhotos = window.renderFolderPhotos;
    
    if (originalRenderFoldersList) {
        window.renderFoldersList = function(...args) {
            originalRenderFoldersList.apply(this, args);
            setTimeout(observeCards, 100);
        };
    }
    
    if (originalRenderFolderPhotos) {
        window.renderFolderPhotos = function(...args) {
            originalRenderFolderPhotos.apply(this, args);
            setTimeout(observeCards, 100);
        };
    }
});

// Add image error handling
document.addEventListener('DOMContentLoaded', function() {
    // Delegate event for dynamically added images
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
            e.target.alt = 'Image not found';
            e.target.classList.add('opacity-50');
        }
    }, true);
});

// Add touch support for mobile
document.addEventListener('DOMContentLoaded', function() {
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartY = e.changedTouches[0].screenY;
    });
    
    document.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartY - touchEndY;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe up - could be used for future features
            } else {
                // Swipe down - could be used for future features
            }
        }
    }
});

// Performance optimization: Lazy loading for images
function initLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    // Apply to dynamically loaded images
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => imageObserver.observe(img));
} 