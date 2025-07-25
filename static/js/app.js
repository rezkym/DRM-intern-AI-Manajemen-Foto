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
    
    // Add fade-in animation to page
    document.querySelector('.container').classList.add('fade-in');
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
        showToast('Silakan pilih foto terlebih dahulu!', 'warning');
        return;
    }
    
    // Disable upload button and show progress
    uploadBtn.disabled = true;
    uploadBtn.classList.add('loading');
    uploadBtn.innerHTML = '<span class="loading-spinner me-2"></span>Uploading...';
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
        resetUploadButton();
        progressSection.style.display = 'none';
    }
}

// Reset upload button to original state
function resetUploadButton() {
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = false;
    uploadBtn.classList.remove('loading');
    uploadBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Upload dan Proses dengan AI';
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

// Update progress UI with compact design
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
            <div class="status-processing d-flex align-items-center">
                <i class="fas fa-cog fa-spin me-2"></i> 
                Memproses batch ${status.current_batch}/${status.total_batches}
            </div>
        `;
        
        if (status.current_files && status.current_files.length > 0) {
            currentFiles.innerHTML = `
                <strong>File saat ini:</strong><br>
                ${status.current_files.map(file => `<small class="text-muted">• ${file}</small>`).join('<br>')}
            `;
        }
    }
}

// Show final results with compact design
function showFinalResults(status) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const progressSection = document.getElementById('progressSection');
    
    // Reset upload button
    resetUploadButton();
    
    // Hide progress, show results
    progressSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Generate results content
    let content = '';
    
    if (status.completed_files && status.completed_files.length > 0) {
        content += `
            <div class="alert alert-success">
                <h6 class="mb-2"><i class="fas fa-check-circle me-2"></i>Berhasil diproses: ${status.completed_files.length} foto</h6>
                <div class="small">
                    ${status.completed_files.slice(0, 3).map(file => 
                        `<div class="mb-1">• ${file.filename} → <strong>${file.folder}</strong></div>`
                    ).join('')}
                    ${status.completed_files.length > 3 ? 
                        `<div class="text-muted">... dan ${status.completed_files.length - 3} foto lainnya</div>` : ''}
                </div>
            </div>
        `;
    }
    
    if (status.failed_files && status.failed_files.length > 0) {
        content += `
            <div class="alert alert-warning">
                <h6 class="mb-2"><i class="fas fa-exclamation-triangle me-2"></i>Gagal diproses: ${status.failed_files.length} file</h6>
                <div class="small">
                    ${status.failed_files.slice(0, 2).map(file => 
                        `<div class="mb-1">• ${file.original_path || 'Unknown'}: ${file.error || 'Unknown error'}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    content += `
        <div class="d-flex gap-2 flex-wrap">
            <a href="/browse" class="btn btn-primary btn-sm">
                <i class="fas fa-folder me-1"></i>Browse Foto
            </a>
            <button class="btn btn-outline-primary btn-sm" onclick="refreshStats()">
                <i class="fas fa-chart-bar me-1"></i>Lihat Statistik
            </button>
        </div>
    `;
    
    resultsContent.innerHTML = content;
    
    // Reset form
    document.getElementById('uploadForm').reset();
}

// Search photos with compact design
async function searchPhotos() {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query) {
        showToast('Masukkan kata kunci pencarian!', 'warning');
        return;
    }
    
    // Show loading
    resultsDiv.innerHTML = `
        <div class="text-center py-3">
            <div class="loading-spinner mx-auto mb-2"></div>
            <div class="small text-muted">Mencari foto...</div>
        </div>
    `;
    
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
                <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
            </div>
        `;
    }
}

// Display search results with compact design
function displaySearchResults(results, query) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-search me-2"></i>Tidak ada foto yang ditemukan untuk "${query}"
            </div>
        `;
        return;
    }
    
    let content = `
        <div class="alert alert-success py-2">
            <small><i class="fas fa-search me-1"></i>Ditemukan ${results.length} foto untuk "${query}"</small>
        </div>
    `;
    
    results.slice(0, 3).forEach(photo => {
        content += `
            <div class="search-result-item">
                <div class="row align-items-center">
                    <div class="col-4">
                        <img src="/${photo.path}" class="search-result-image w-100" alt="${photo.filename}"
                             onclick="showPhotoModal('${photo.path}', '${photo.filename}', ${JSON.stringify(photo.analysis).replace(/"/g, '&quot;')})">
                    </div>
                    <div class="col-8">
                        <h6 class="mb-1 text-truncate">${photo.filename}</h6>
                        <p class="small text-muted mb-2">
                            <strong>Folder:</strong> ${photo.folder}<br>
                            ${photo.analysis.description ? `<strong>Deskripsi:</strong> ${photo.analysis.description.substring(0, 60)}${photo.analysis.description.length > 60 ? '...' : ''}` : ''}
                        </p>
                        <div>
                            ${(photo.analysis.keywords || []).slice(0, 3).map(keyword => 
                                `<span class="badge bg-secondary me-1">${keyword}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (results.length > 3) {
        content += `
            <div class="text-center mt-2">
                <small class="text-muted">Dan ${results.length - 3} foto lainnya...</small>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = content;
}

// Show photo modal with compact metadata
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

// Generate compact metadata HTML
function generateMetadataHTML(metadata) {
    let content = '';
    
    if (!metadata || Object.keys(metadata).length === 0) {
        return '<div class="text-muted small">Tidak ada metadata tersedia</div>';
    }
    
    if (metadata.description) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Deskripsi:</div>
                <div class="metadata-value">${metadata.description}</div>
            </div>
        `;
    }
    
    if (metadata.activity) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Aktivitas:</div>
                <div class="metadata-value">${metadata.activity}</div>
            </div>
        `;
    }
    
    if (metadata.location_type || metadata.location_specific) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Lokasi:</div>
                <div class="metadata-value">${metadata.location_type || 'Unknown'}${metadata.location_specific ? ` - ${metadata.location_specific}` : ''}</div>
            </div>
        `;
    }
    
    if (metadata.people_count > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Orang:</div>
                <div class="metadata-value">${metadata.people_count} orang${metadata.people_details ? ` - ${metadata.people_details}` : ''}</div>
            </div>
        `;
    }
    
    if (metadata.mood) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Suasana:</div>
                <div class="metadata-value">${metadata.mood}</div>
            </div>
        `;
    }
    
    if (metadata.main_objects && metadata.main_objects.length > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Objek Utama:</div>
                <div class="metadata-value">${metadata.main_objects.join(', ')}</div>
            </div>
        `;
    }
    
    if (metadata.keywords && metadata.keywords.length > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">Keywords:</div>
                <div class="metadata-value">
                    ${metadata.keywords.map(keyword => `<span class="badge bg-info me-1 mb-1">${keyword}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    return content || '<div class="text-muted small">Tidak ada metadata tersedia</div>';
}

// Show statistics with compact design
async function showStats() {
    const modal = new bootstrap.Modal(document.getElementById('statsModal'));
    const statsContent = document.getElementById('statsContent');
    
    try {
        const response = await fetch('/stats');
        const result = await response.json();
        
        if (response.ok) {
            const stats = result.stats;
            let content = `
                <div class="row text-center mb-3">
                    <div class="col-6">
                        <h4 class="text-primary">${stats.total_photos}</h4>
                        <small class="text-muted">Total Foto</small>
                    </div>
                    <div class="col-6">
                        <h4 class="text-success">${stats.total_folders}</h4>
                        <small class="text-muted">Total Folder</small>
                    </div>
                </div>
            `;
            
            if (stats.folders && Object.keys(stats.folders).length > 0) {
                content += '<h6 class="mb-3">Distribusi per Folder:</h6><div class="list-group">';
                Object.entries(stats.folders)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .forEach(([folder, count]) => {
                        content += `
                            <div class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <span class="small">${folder}</span>
                                <span class="badge bg-primary">${count}</span>
                            </div>
                        `;
                    });
                content += '</div>';
            }
            
            statsContent.innerHTML = content;
        } else {
            throw new Error(result.detail || 'Gagal mengambil statistik');
        }
        
    } catch (error) {
        statsContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
            </div>
        `;
    }
    
    modal.show();
}

// Refresh stats (for use after processing)
async function refreshStats() {
    showStats();
}

// Enhanced toast utility function
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = createToastContainer();
    }
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: type === 'error' ? 5000 : 3000
    });
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

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + U for upload focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        document.getElementById('photos').focus();
    }
    
    // Ctrl/Cmd + F for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchQuery').focus();
    }
    
    // ESC to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }
});

// Add drag and drop functionality
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadForm');
    const photosInput = document.getElementById('photos');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadArea.classList.add('border-primary', 'bg-light');
    }
    
    function unhighlight(e) {
        uploadArea.classList.remove('border-primary', 'bg-light');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        photosInput.files = files;
        
        // Show file names
        const fileList = Array.from(files).map(file => file.name).join(', ');
        showToast(`Files selected: ${fileList.substring(0, 100)}${fileList.length > 100 ? '...' : ''}`, 'info');
    }
}); 