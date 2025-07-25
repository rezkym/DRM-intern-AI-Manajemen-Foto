// JavaScript untuk AI Photo Manager

let statusCheckInterval = null;

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const searchQuery = document.getElementById('searchQuery');
    
    // Load konfigurasi dari server
    loadConfiguration();
    
    uploadForm.addEventListener('submit', handleUpload);
    
    // Enter key search
    searchQuery.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPhotos();
        }
    });
});

/**
 * Load konfigurasi dari server dan update UI
 */
async function loadConfiguration() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (response.ok) {
            // Update UI dengan konfigurasi yang didapat dari server
            document.getElementById('maxFileSize').textContent = config.max_file_size_mb;
            document.getElementById('maxFileSizeText').textContent = config.max_file_size_mb;
            document.getElementById('supportedFormats').textContent = config.supported_formats.join(', ').toUpperCase();
            
            // Update input accept attribute
            const photosInput = document.getElementById('photos');
            photosInput.accept = config.supported_formats.join(',');
        }
    } catch (error) {
        console.warn('Gagal memuat konfigurasi, menggunakan default');
    }
}

// Handle file upload
async function handleUpload(event) {
    event.preventDefault();
    
    const uploadBtn = document.getElementById('uploadBtn');
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    const photosInput = document.getElementById('photos');
    
    // Validate files selected
    if (!photosInput.files || photosInput.files.length === 0) {
        alert('Silakan pilih foto terlebih dahulu!');
        return;
    }
    
    // Disable upload button and show progress
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    try {
        const formData = new FormData();
        for (let file of photosInput.files) {
            formData.append('files', file);
        }
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Upload berhasil! Proses analisis dimulai...', 'success');
            
            // Start monitoring progress
            startStatusMonitoring();
            
            // Show invalid files if any
            if (result.invalid_files && result.invalid_files.length > 0) {
                let invalidMsg = 'File yang tidak bisa diproses:\n';
                result.invalid_files.forEach(file => {
                    invalidMsg += `- ${file.filename}: ${file.reason}\n`;
                });
                showToast(invalidMsg, 'warning');
            }
        } else {
            throw new Error(result.detail || 'Upload gagal');
        }
        
    } catch (error) {
        console.error('Error uploading files:', error);
        showToast('Error: ' + error.message, 'error');
        
        // Reset UI
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload dan Proses Foto';
        progressSection.style.display = 'none';
    }
}

// Start monitoring processing status
function startStatusMonitoring() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    statusCheckInterval = setInterval(checkProcessingStatus, 2000);
}

// Check processing status
async function checkProcessingStatus() {
    try {
        const response = await fetch('/status');
        const status = await response.json();
        
        updateProgressUI(status);
        
        // Stop monitoring if processing is complete
        if (!status.is_processing) {
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
            showFinalResults(status);
        }
        
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

// Update progress UI
function updateProgressUI(status) {
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');
    const currentFiles = document.getElementById('currentFiles');
    
    if (status.is_processing) {
        const progress = status.total_batches > 0 ? 
            (status.current_batch / status.total_batches) * 100 : 0;
        
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${Math.round(progress)}%`;
        
        statusText.innerHTML = `
            <div class="status-processing">
                <i class="fas fa-cog fa-spin"></i> 
                Memproses batch ${status.current_batch}/${status.total_batches}
            </div>
        `;
        
        if (status.current_files && status.current_files.length > 0) {
            currentFiles.innerHTML = `
                <strong>File saat ini:</strong><br>
                ${status.current_files.map(file => `<small>• ${file}</small>`).join('<br>')}
            `;
        }
    }
}

// Show final results
function showFinalResults(status) {
    const uploadBtn = document.getElementById('uploadBtn');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const progressSection = document.getElementById('progressSection');
    
    // Reset upload button
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload dan Proses Foto';
    
    // Hide progress, show results
    progressSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Generate results content
    let content = '';
    
    if (status.completed_files && status.completed_files.length > 0) {
        content += `
            <div class="alert alert-success">
                <h6><i class="fas fa-check-circle"></i> Berhasil diproses: ${status.completed_files.length} foto</h6>
                <ul class="mb-0">
                    ${status.completed_files.slice(0, 5).map(file => 
                        `<li>${file.filename} → <strong>${file.folder}</strong></li>`
                    ).join('')}
                    ${status.completed_files.length > 5 ? 
                        `<li><em>... dan ${status.completed_files.length - 5} foto lainnya</em></li>` : ''}
                </ul>
            </div>
        `;
    }
    
    if (status.failed_files && status.failed_files.length > 0) {
        content += `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Gagal diproses: ${status.failed_files.length} file</h6>
                <ul class="mb-0">
                    ${status.failed_files.slice(0, 3).map(file => 
                        `<li>${file.original_path || 'Unknown'}: ${file.error || 'Unknown error'}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    content += `
        <div class="mt-3">
            <a href="/browse" class="btn btn-primary me-2">
                <i class="fas fa-folder"></i> Browse Foto
            </a>
            <button class="btn btn-outline-primary" onclick="refreshStats()">
                <i class="fas fa-chart-bar"></i> Lihat Statistik
            </button>
        </div>
    `;
    
    resultsContent.innerHTML = content;
    
    // Reset form
    document.getElementById('uploadForm').reset();
}

// Search photos
async function searchPhotos() {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query) {
        showToast('Masukkan kata kunci pencarian!', 'warning');
        return;
    }
    
    // Show loading
    resultsDiv.innerHTML = '<div class="text-center"><div class="loading-spinner"></div> Mencari foto...</div>';
    
    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (response.ok) {
            displaySearchResults(result.results, query);
        } else {
            throw new Error(result.detail || 'Pencarian gagal');
        }
        
    } catch (error) {
        console.error('Error searching:', error);
        resultsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Error: ${error.message}
            </div>
        `;
    }
}

// Display search results
function displaySearchResults(results, query) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-search"></i> Tidak ada foto yang ditemukan untuk "${query}"
            </div>
        `;
        return;
    }
    
    let content = `
        <div class="alert alert-success">
            <i class="fas fa-search"></i> Ditemukan ${results.length} foto untuk "${query}"
        </div>
    `;
    
    results.forEach(photo => {
        content += `
            <div class="search-result-item">
                <div class="row">
                    <div class="col-md-3">
                        <img src="/${photo.path}" class="search-result-image" alt="${photo.filename}"
                             onclick="showPhotoModal('${photo.path}', '${photo.filename}', ${JSON.stringify(photo.analysis).replace(/"/g, '&quot;')})">
                    </div>
                    <div class="col-md-9">
                        <h6>${photo.filename}</h6>
                        <p class="search-result-meta">
                            <strong>Folder:</strong> ${photo.folder}<br>
                            <strong>Deskripsi:</strong> ${photo.analysis.description || 'Tidak ada deskripsi'}<br>
                            <strong>Aktivitas:</strong> ${photo.analysis.activity || 'Tidak diketahui'}
                        </p>
                        <div>
                            ${(photo.analysis.keywords || []).slice(0, 5).map(keyword => 
                                `<span class="badge bg-secondary me-1">${keyword}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = content;
}

// Show photo modal
function showPhotoModal(path, filename, metadata) {
    const modal = new bootstrap.Modal(document.getElementById('photoModal'));
    const modalTitle = document.getElementById('photoModalTitle');
    const modalImage = document.getElementById('photoModalImage');
    const modalMetadata = document.getElementById('photoModalMetadata');
    
    modalTitle.textContent = filename;
    modalImage.src = '/' + path;
    modalImage.alt = filename;
    
    // Generate metadata content
    let metadataContent = '';
    
    if (metadata.description) {
        metadataContent += `
            <div class="metadata-item">
                <div class="metadata-label">Deskripsi:</div>
                <div class="metadata-value">${metadata.description}</div>
            </div>
        `;
    }
    
    if (metadata.activity) {
        metadataContent += `
            <div class="metadata-item">
                <div class="metadata-label">Aktivitas:</div>
                <div class="metadata-value">${metadata.activity}</div>
            </div>
        `;
    }
    
    if (metadata.location_type || metadata.location_specific) {
        metadataContent += `
            <div class="metadata-item">
                <div class="metadata-label">Lokasi:</div>
                <div class="metadata-value">${metadata.location_type || 'Unknown'}${metadata.location_specific ? ` - ${metadata.location_specific}` : ''}</div>
            </div>
        `;
    }
    
    if (metadata.people_count > 0) {
        metadataContent += `
            <div class="metadata-item">
                <div class="metadata-label">Orang:</div>
                <div class="metadata-value">${metadata.people_count} orang${metadata.people_details ? ` - ${metadata.people_details}` : ''}</div>
            </div>
        `;
    }
    
    if (metadata.mood) {
        metadataContent += `
            <div class="metadata-item">
                <div class="metadata-label">Suasana:</div>
                <div class="metadata-value">${metadata.mood}</div>
            </div>
        `;
    }
    
    if (metadata.main_objects && metadata.main_objects.length > 0) {
        metadataContent += `
            <div class="metadata-item">
                <div class="metadata-label">Objek Utama:</div>
                <div class="metadata-value">${metadata.main_objects.join(', ')}</div>
            </div>
        `;
    }
    
    if (metadata.keywords && metadata.keywords.length > 0) {
        metadataContent += `
            <div class="metadata-item">
                <div class="metadata-label">Keywords:</div>
                <div class="metadata-value">
                    ${metadata.keywords.map(keyword => `<span class="badge bg-info me-1">${keyword}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    modalMetadata.innerHTML = metadataContent || '<div class="text-muted">Tidak ada metadata tersedia</div>';
    
    modal.show();
}

// Show statistics
async function showStats() {
    const modal = new bootstrap.Modal(document.getElementById('statsModal'));
    const statsContent = document.getElementById('statsContent');
    
    try {
        const response = await fetch('/stats');
        const result = await response.json();
        
        if (response.ok) {
            const stats = result.stats;
            let content = `
                <div class="row text-center mb-4">
                    <div class="col">
                        <h4 class="text-primary">${stats.total_photos}</h4>
                        <small class="text-muted">Total Foto</small>
                    </div>
                    <div class="col">
                        <h4 class="text-success">${stats.total_folders}</h4>
                        <small class="text-muted">Total Folder</small>
                    </div>
                </div>
            `;
            
            if (stats.folders && Object.keys(stats.folders).length > 0) {
                content += '<h6>Distribusi per Folder:</h6><ul class="list-group">';
                Object.entries(stats.folders)
                    .sort((a, b) => b[1] - a[1])
                    .forEach(([folder, count]) => {
                        content += `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                ${folder}
                                <span class="badge bg-primary">${count}</span>
                            </li>
                        `;
                    });
                content += '</ul>';
            }
            
            statsContent.innerHTML = content;
        } else {
            throw new Error(result.detail || 'Gagal mengambil statistik');
        }
        
    } catch (error) {
        statsContent.innerHTML = `
            <div class="alert alert-danger">
                Error: ${error.message}
            </div>
        `;
    }
    
    modal.show();
}

// Refresh stats (for use after processing)
async function refreshStats() {
    showStats();
}

// Utility function for showing toasts
function showToast(message, type = 'info') {
    // Create toast element
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
} 