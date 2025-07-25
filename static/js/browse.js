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
 * Render daftar folder
 */
function renderFoldersList(folders) {
    const container = document.getElementById('foldersContainer');
    const foldersView = document.getElementById('foldersView');
    
    let html = '';
    folders.forEach(folder => {
        const displayName = folder.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `
            <div class="col-lg-4 col-md-6 mb-4">
                <a href="/browse.html?folder=${encodeURIComponent(folder.name)}" class="text-decoration-none">
                    <div class="card h-100 hover-card">
                        <div class="card-body text-center">
                            <div class="mb-4">
                                <div class="p-4 rounded-circle d-inline-flex align-items-center justify-content-center" style="background: linear-gradient(135deg, var(--primary-blue), var(--primary-blue-light)); width: 80px; height: 80px;">
                                    <i class="fas fa-folder-open fa-2x text-white"></i>
                                </div>
                            </div>
                            <h5 class="card-title fw-bold mb-2">${displayName}</h5>
                            <p class="card-text text-muted mb-3">
                                Koleksi foto yang terorganisir berdasarkan konten
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
 * Render foto dalam folder
 */
function renderFolderPhotos(folderName, photos) {
    const container = document.getElementById('photosContainer');
    const folderView = document.getElementById('folderView');
    const folderNameElement = document.getElementById('folderName');
    
    folderNameElement.textContent = folderName;
    
    let html = '';
    photos.forEach(photo => {
        const description = photo.metadata.description || '';
        const truncatedDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
        
        let keywordsHtml = '';
        if (photo.metadata.keywords && photo.metadata.keywords.length > 0) {
            const visibleKeywords = photo.metadata.keywords.slice(0, 3);
            keywordsHtml = visibleKeywords.map(keyword => 
                `<span class="badge bg-secondary me-1 mb-1">${keyword}</span>`
            ).join('');
            
            if (photo.metadata.keywords.length > 3) {
                keywordsHtml += `<span class="badge bg-info">+${photo.metadata.keywords.length - 3}</span>`;
            }
        }
        
        html += `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card hover-card h-100">
                    <div class="position-relative overflow-hidden" style="border-radius: 20px 20px 0 0;">
                        <img src="/${photo.path}" class="card-img-top" alt="${photo.filename}" 
                             style="height: 220px; object-fit: cover; transition: transform 0.3s ease; cursor: pointer;" 
                             onclick="showPhotoModal('${photo.path}', '${photo.filename}', ${JSON.stringify(photo.metadata).replace(/"/g, '&quot;')})"
                             onmouseover="this.style.transform='scale(1.05)'"
                             onmouseout="this.style.transform='scale(1)'">
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-primary"><i class="fas fa-eye"></i></span>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title fw-bold mb-2">${photo.filename}</h6>
                        ${description ? `<p class="card-text small text-muted flex-grow-1">${truncatedDesc}</p>` : ''}
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
    document.getElementById('folderName').textContent = folderName;
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

// Generate metadata HTML
function generateMetadataHTML(metadata) {
    let content = '';
    
    if (!metadata || Object.keys(metadata).length === 0) {
        return '<div class="text-muted">Tidak ada metadata tersedia</div>';
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
    
    return content || '<div class="text-muted">Tidak ada informasi detail tersedia</div>';
}

// Add hover effects and interactions
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to folder cards
    const folderCards = document.querySelectorAll('.hover-card');
    folderCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add click to enlarge for photo cards
    const photoImages = document.querySelectorAll('.card-img-top');
    photoImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
            // Photo modal will be triggered by onclick in template
        });
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        // ESC to close modal
        if (e.key === 'Escape') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('photoModal'));
            if (modal) {
                modal.hide();
            }
        }
    });
});

// Add loading state for navigation
function showLoadingState() {
    const body = document.body;
    const loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.innerHTML = `
        <div class="d-flex justify-content-center align-items-center position-fixed top-0 start-0 w-100 h-100" 
             style="background: rgba(255,255,255,0.8); z-index: 9999;">
            <div class="text-center">
                <div class="loading-spinner" style="width: 40px; height: 40px; border-width: 4px;"></div>
                <div class="mt-2">Loading...</div>
            </div>
        </div>
    `;
    body.appendChild(loader);
}

function hideLoadingState() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.remove();
    }
}

// Add image lazy loading for better performance
function addLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading when page loads
document.addEventListener('DOMContentLoaded', addLazyLoading);

// Add error handling for images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
            this.alt = 'Image not found';
        });
    });
}); 