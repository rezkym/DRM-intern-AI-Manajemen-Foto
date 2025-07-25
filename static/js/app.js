// JavaScript untuk AI Photo Manager

let statusCheckInterval = null;
let aiAnimationTimers = [];
let processingPhotoPreviews = [];
let confidenceInterval = null;

// Enhanced animations data
const detectionItems = [
    "Wajah manusia", "Pemandangan", "Objek", "Kendaraan", "Hewan", "Makanan", 
    "Bangunan", "Tanaman", "Aktivitas", "Tekstur"
];

const tagItems = [
    "outdoor", "portrait", "nature", "urban", "family", "travel", 
    "food", "sunset", "indoor", "group", "sport", "party"
];

const analysisSteps = [
    { name: "Memindai visual", duration: 1500 },
    { name: "Menganalisa komposisi", duration: 1800 },
    { name: "Mendeteksi objek utama", duration: 2200 },
    { name: "Menghasilkan metadata", duration: 1600 }
];

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

// Enhanced handleUpload function dengan animasi menarik
async function handleUpload(event) {
    event.preventDefault();
    
    const uploadBtn = document.getElementById('uploadBtn');
    const aiProcessingSection = document.getElementById('aiProcessingSection');
    const resultsSection = document.getElementById('resultsSection');
    const photosInput = document.getElementById('photos');
    
    // Validate files selected
    if (!photosInput.files || photosInput.files.length === 0) {
        showToast('Silakan pilih foto terlebih dahulu!', 'warning');
        return;
    }
    
    // Store photo previews for animation
    processingPhotoPreviews = Array.from(photosInput.files);
    
    // Disable upload button and show loading
    uploadBtn.disabled = true;
    uploadBtn.classList.add('loading');
    uploadBtn.innerHTML = '<span class="loading-spinner me-2"></span>Uploading...';
    
    // Hide other sections
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
            showToast('Upload berhasil! AI neural network sedang menganalisa...', 'success');
            
            // Start epic AI processing animation
            setTimeout(() => {
                startEpicAIProcessing();
            }, 800);
            
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
    }
}

// Epic AI Processing Animation
function startEpicAIProcessing() {
    const aiProcessingSection = document.getElementById('aiProcessingSection');
    
    // Show AI processing section dengan dramatic entrance
    aiProcessingSection.style.display = 'block';
    aiProcessingSection.style.transform = 'translateY(20px)';
    aiProcessingSection.style.opacity = '0';
    
    // Animate entrance
    setTimeout(() => {
        aiProcessingSection.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        aiProcessingSection.style.transform = 'translateY(0)';
        aiProcessingSection.style.opacity = '1';
    }, 100);
    
    // Start confidence score animation
    startConfidenceAnimation();
    
    // Create photo scanning grid
    setTimeout(() => createPhotoScanningGrid(), 500);
    
    // Start analysis panels animation
    setTimeout(() => startAnalysisPanels(), 1000);
    
    // Start progress bars animation
    setTimeout(() => startProgressBarsAnimation(), 1500);
    
    // Add floating particles
    setTimeout(() => createFloatingParticles(), 800);
    
    // Start floating tags
    setTimeout(() => startFloatingTags(), 2000);
}

// Confidence Score Animation
function startConfidenceAnimation() {
    const confidenceScore = document.getElementById('confidenceScore');
    let confidence = 0;
    
    confidenceInterval = setInterval(() => {
        confidence += Math.random() * 8 + 2; // Random increment 2-10
        if (confidence > 100) confidence = 100;
        
        confidenceScore.textContent = Math.round(confidence) + '%';
        
        if (confidence >= 100) {
            clearInterval(confidenceInterval);
            setTimeout(() => {
                confidenceScore.textContent = '✓ 100%';
                confidenceScore.style.color = '#00ff88';
            }, 500);
        }
    }, 200);
}

// Create Photo Scanning Grid dengan laser effects
function createPhotoScanningGrid() {
    const processingPhotos = document.getElementById('processingPhotos');
    processingPhotos.innerHTML = '';
    
    processingPhotoPreviews.slice(0, 4).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            setTimeout(() => {
                const photoContainer = document.createElement('div');
                photoContainer.innerHTML = `
                    <div class="photo-scanner scanning" data-index="${index}">
                        <img src="${e.target.result}" alt="${file.name}">
                        <div class="scan-overlay">
                            <i class="fas fa-search-plus"></i>
                        </div>
                        <div class="laser-scanner"></div>
                        <div class="scan-line"></div>
                        <div class="detection-points"></div>
                        <div class="photo-label">
                            ${file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                        </div>
                    </div>
                `;
                processingPhotos.appendChild(photoContainer);
                
                // Add detection points after delay
                setTimeout(() => addDetectionPoints(photoContainer.querySelector('.detection-points')), 1000 + index * 500);
                
            }, index * 400);
        };
        reader.readAsDataURL(file);
    });
    
    if (processingPhotoPreviews.length > 4) {
        setTimeout(() => {
            const morePhotos = document.createElement('div');
            morePhotos.className = 'text-center mt-3';
            morePhotos.innerHTML = `
                <div class="alert alert-info py-2">
                    <i class="fas fa-plus-circle me-2"></i>
                    <small>Dan ${processingPhotoPreviews.length - 4} foto lainnya sedang diproses secara parallel...</small>
                </div>
            `;
            processingPhotos.appendChild(morePhotos);
        }, 2000);
    }
}

// Add Detection Points pada foto
function addDetectionPoints(container) {
    const pointCount = Math.floor(Math.random() * 6) + 3; // 3-8 points
    
    for (let i = 0; i < pointCount; i++) {
        setTimeout(() => {
            const point = document.createElement('div');
            point.className = 'detection-point';
            point.style.left = Math.random() * 80 + 10 + '%';
            point.style.top = Math.random() * 80 + 10 + '%';
            point.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(point);
        }, i * 300);
    }
}

// Start Analysis Panels dengan dynamic content
function startAnalysisPanels() {
    // Visual Detection Panel
    const visualDetection = document.getElementById('visualDetection');
    visualDetection.innerHTML = '';
    
    detectionItems.forEach((item, index) => {
        setTimeout(() => {
            const detectionItem = document.createElement('div');
            detectionItem.className = 'detection-item';
            detectionItem.textContent = item;
            visualDetection.appendChild(detectionItem);
            
            // Remove old items if too many
            if (visualDetection.children.length > 4) {
                visualDetection.removeChild(visualDetection.firstChild);
            }
        }, index * 600);
    });
    
    // Auto Tags Panel
    const autoTags = document.getElementById('autoTags');
    autoTags.innerHTML = '';
    
    tagItems.forEach((tag, index) => {
        setTimeout(() => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';
            tagItem.textContent = '#' + tag;
            autoTags.appendChild(tagItem);
            
            // Remove old items if too many
            if (autoTags.children.length > 3) {
                autoTags.removeChild(autoTags.firstChild);
            }
        }, (index * 800) + 1000);
    });
}

// Progress Bars Animation dengan realistic timing
function startProgressBarsAnimation() {
    const progressBars = [
        { id: 'objectProgress', duration: 2500, delay: 0 },
        { id: 'colorProgress', duration: 2000, delay: 800 },
        { id: 'categoryProgress', duration: 1800, delay: 1600 }
    ];
    
    progressBars.forEach(bar => {
        setTimeout(() => {
            const progressBar = document.getElementById(bar.id);
            let progress = 0;
            
            const interval = setInterval(() => {
                progress += Math.random() * 15 + 5; // Random increment
                if (progress > 100) progress = 100;
                
                progressBar.style.width = progress + '%';
                
                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, bar.duration / 20);
        }, bar.delay);
    });
}

// Create Floating Particles
function createFloatingParticles() {
    const container = document.getElementById('aiProcessingSection');
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 4 + 's';
            particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
            container.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 6000);
        }, i * 400);
    }
}

// Start Floating Tags Animation
function startFloatingTags() {
    const container = document.getElementById('floatingTags');
    const tags = ['AI Processing', 'Neural Analysis', 'Deep Learning', 'Computer Vision', 'Smart Detection'];
    
    tags.forEach((tag, index) => {
        setTimeout(() => {
            const floatingTag = document.createElement('div');
            floatingTag.className = 'floating-tag';
            floatingTag.textContent = tag;
            floatingTag.style.left = Math.random() * 80 + 10 + '%';
            floatingTag.style.bottom = '0px';
            container.appendChild(floatingTag);
            
            // Remove after animation
            setTimeout(() => {
                if (floatingTag.parentNode) {
                    floatingTag.parentNode.removeChild(floatingTag);
                }
            }, 3000);
        }, index * 1200);
    });
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
        
        // Stop monitoring if processing is complete
        if (!status.is_processing) {
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
            showEpicFinalResults(status);
        }
        
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

// Epic Final Results dengan dramatic reveal
function showEpicFinalResults(status) {
    const aiProcessingSection = document.getElementById('aiProcessingSection');
    const resultsSection = document.getElementById('resultsSection');
    const aiProcessingTitle = document.getElementById('aiProcessingTitle');
    
    // Clear all animation timers
    aiAnimationTimers.forEach(timer => clearTimeout(timer));
    if (confidenceInterval) clearInterval(confidenceInterval);
    
    // Show completion message
    aiProcessingTitle.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i>Analisis Neural Network Selesai!';
    
    // Stop all animations
    document.querySelectorAll('.photo-scanner').forEach(scanner => {
        scanner.classList.remove('scanning');
    });
    
    // Dramatic pause before revealing results
    setTimeout(() => {
        // Fade out AI processing
        aiProcessingSection.style.transition = 'all 0.8s ease-out';
        aiProcessingSection.style.transform = 'translateY(-20px)';
        aiProcessingSection.style.opacity = '0';
        
        setTimeout(() => {
            aiProcessingSection.style.display = 'none';
            
            // Show results dengan epic entrance
            resultsSection.style.display = 'block';
            resultsSection.style.transform = 'translateY(30px)';
            resultsSection.style.opacity = '0';
            
            setTimeout(() => {
                resultsSection.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                resultsSection.style.transform = 'translateY(0)';
                resultsSection.style.opacity = '1';
                
                // Show results content with staggered animation
                showResultsWithStaggeredAnimation(status);
            }, 100);
        }, 800);
    }, 1500); // 1.5 second dramatic pause
    
    // Reset upload button
    resetUploadButton();
}

// Show results dengan staggered animation
function showResultsWithStaggeredAnimation(status) {
    const resultsContent = document.getElementById('resultsContent');
    resultsContent.innerHTML = '';
    
    let content = '';
    
    if (status.completed_files && status.completed_files.length > 0) {
        content += `
            <div class="alert alert-success mb-3 animate-result" style="opacity: 0; transform: translateX(-30px);">
                <h6 class="mb-2"><i class="fas fa-check-circle me-2"></i>✨ AI berhasil memproses ${status.completed_files.length} foto</h6>
                <div class="small">
                    ${status.completed_files.slice(0, 3).map(file => 
                        `<div class="mb-1">🎯 ${file.filename} → <strong>${file.folder}</strong></div>`
                    ).join('')}
                    ${status.completed_files.length > 3 ? 
                        `<div class="text-muted">... dan ${status.completed_files.length - 3} foto lainnya telah dikategorikan dengan cerdas!</div>` : ''}
                </div>
            </div>
        `;
    }
    
    if (status.failed_files && status.failed_files.length > 0) {
        content += `
            <div class="alert alert-warning mb-3 animate-result" style="opacity: 0; transform: translateX(-30px);">
                <h6 class="mb-2"><i class="fas fa-exclamation-triangle me-2"></i>⚠️ ${status.failed_files.length} file perlu perhatian</h6>
                <div class="small">
                    ${status.failed_files.slice(0, 2).map(file => 
                        `<div class="mb-1">• ${file.original_path || 'Unknown'}: ${file.error || 'Unknown error'}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    content += `
        <div class="d-flex gap-2 flex-wrap animate-result" style="opacity: 0; transform: translateY(20px);">
            <a href="/browse" class="btn btn-primary btn-sm">
                <i class="fas fa-folder me-1"></i>🗂️ Jelajahi Koleksi
            </a>
            <button class="btn btn-outline-primary btn-sm" onclick="refreshStats()">
                <i class="fas fa-chart-bar me-1"></i>📊 Lihat Statistik AI
            </button>
        </div>
    `;
    
    resultsContent.innerHTML = content;
    
    // Animate results appearance dengan staggered timing
    const animateElements = resultsContent.querySelectorAll('.animate-result');
    animateElements.forEach((element, index) => {
        setTimeout(() => {
            element.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            element.style.opacity = '1';
            element.style.transform = 'translateX(0) translateY(0)';
        }, index * 400);
    });
    
    // Reset form
    document.getElementById('uploadForm').reset();
    processingPhotoPreviews = [];
}

// Search photos with enhanced UX
async function searchPhotos() {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query) {
        showToast('Masukkan kata kunci pencarian!', 'warning');
        return;
    }
    
    // Show loading with enhanced animation
    resultsDiv.innerHTML = `
        <div class="text-center py-4">
            <div class="search-loading">
                <div class="loading-spinner mx-auto mb-3"></div>
                <div class="text-primary fw-bold mb-2">🔍 AI sedang mencari...</div>
                <div class="small text-muted">Memproses query: "${query}"</div>
            </div>
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

// Display search results with enhanced design
function displaySearchResults(results, query) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="alert alert-info">
                <div class="text-center py-2">
                    <i class="fas fa-search text-primary mb-2" style="font-size: 2rem;"></i>
                    <div class="fw-bold">Tidak ada foto ditemukan</div>
                    <div class="small text-muted">untuk query: "${query}"</div>
                </div>
            </div>
        `;
        return;
    }
    
    let content = `
        <div class="alert alert-success py-2 mb-3">
            <div class="d-flex align-items-center">
                <i class="fas fa-search-plus me-2"></i>
                <small><strong>AI menemukan ${results.length} foto</strong> untuk "${query}"</small>
            </div>
        </div>
    `;
    
    results.slice(0, 4).forEach((photo, index) => {
        content += `
            <div class="search-result-item animate-search-result" style="animation-delay: ${index * 0.1}s;">
                <div class="row align-items-center">
                    <div class="col-4">
                        <div class="search-image-container">
                            <img src="/${photo.path}" class="search-result-image w-100" alt="${photo.filename}"
                                 onclick="showPhotoModal('${photo.path}', '${photo.filename}', ${JSON.stringify(photo.analysis).replace(/"/g, '&quot;')})">
                            <div class="search-image-overlay">
                                <i class="fas fa-expand-alt"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-8">
                        <h6 class="mb-1 text-truncate fw-bold">${photo.filename}</h6>
                        <p class="small text-muted mb-2">
                            <i class="fas fa-folder me-1"></i><strong>Folder:</strong> ${photo.folder}<br>
                            ${photo.analysis.description ? 
                                `<i class="fas fa-eye me-1"></i><strong>Deskripsi:</strong> ${photo.analysis.description.substring(0, 80)}${photo.analysis.description.length > 80 ? '...' : ''}` : ''}
                        </p>
                        <div class="search-tags">
                            ${(photo.analysis.keywords || []).slice(0, 4).map(keyword => 
                                `<span class="badge bg-primary me-1 mb-1">#${keyword}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (results.length > 4) {
        content += `
            <div class="text-center mt-3">
                <div class="alert alert-light py-2">
                    <small class="text-muted">
                        <i class="fas fa-plus-circle me-1"></i>
                        Dan ${results.length - 4} foto lainnya cocok dengan pencarian Anda
                    </small>
                </div>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = content;
}

// Show photo modal with enhanced metadata
function showPhotoModal(path, filename, metadata) {
    const modal = new bootstrap.Modal(document.getElementById('photoModal'));
    const modalTitle = document.getElementById('photoModalTitle');
    const modalImage = document.getElementById('photoModalImage');
    const modalMetadata = document.getElementById('photoModalMetadata');
    
    modalTitle.textContent = filename;
    modalImage.src = '/' + path;
    modalImage.alt = filename;
    
    // Generate enhanced metadata content
    let metadataContent = generateEnhancedMetadataHTML(metadata);
    modalMetadata.innerHTML = metadataContent;
    
    modal.show();
}

// Generate enhanced metadata HTML
function generateEnhancedMetadataHTML(metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return `
            <div class="text-center text-muted py-4">
                <i class="fas fa-robot mb-2" style="font-size: 2rem;"></i>
                <div>Metadata AI belum tersedia</div>
            </div>
        `;
    }
    
    let content = '';
    
    if (metadata.description) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">
                    <i class="fas fa-eye text-primary"></i> Deskripsi AI
                </div>
                <div class="metadata-value">${metadata.description}</div>
            </div>
        `;
    }
    
    if (metadata.activity) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">
                    <i class="fas fa-running text-success"></i> Aktivitas
                </div>
                <div class="metadata-value">${metadata.activity}</div>
            </div>
        `;
    }
    
    if (metadata.location_type || metadata.location_specific) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">
                    <i class="fas fa-map-marker-alt text-danger"></i> Lokasi
                </div>
                <div class="metadata-value">
                    ${metadata.location_type || 'Unknown'}
                    ${metadata.location_specific ? ` - ${metadata.location_specific}` : ''}
                </div>
            </div>
        `;
    }
    
    if (metadata.people_count > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">
                    <i class="fas fa-users text-info"></i> Orang
                </div>
                <div class="metadata-value">
                    ${metadata.people_count} orang
                    ${metadata.people_details ? ` - ${metadata.people_details}` : ''}
                </div>
            </div>
        `;
    }
    
    if (metadata.mood) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">
                    <i class="fas fa-heart text-warning"></i> Suasana
                </div>
                <div class="metadata-value">${metadata.mood}</div>
            </div>
        `;
    }
    
    if (metadata.main_objects && metadata.main_objects.length > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">
                    <i class="fas fa-cube text-secondary"></i> Objek Utama
                </div>
                <div class="metadata-value">${metadata.main_objects.join(', ')}</div>
            </div>
        `;
    }
    
    if (metadata.keywords && metadata.keywords.length > 0) {
        content += `
            <div class="metadata-item">
                <div class="metadata-label">
                    <i class="fas fa-tags text-primary"></i> Keywords AI
                </div>
                <div class="metadata-value">
                    ${metadata.keywords.map(keyword => 
                        `<span class="badge bg-primary me-1 mb-1">#${keyword}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    return content || `
        <div class="text-center text-muted py-4">
            <i class="fas fa-robot mb-2" style="font-size: 2rem;"></i>
            <div>Metadata AI belum tersedia</div>
        </div>
    `;
}

// Show statistics with enhanced design
async function showStats() {
    const modal = new bootstrap.Modal(document.getElementById('statsModal'));
    const statsContent = document.getElementById('statsContent');
    
    // Show loading state
    statsContent.innerHTML = `
        <div class="text-center py-4">
            <div class="loading-spinner mx-auto mb-3"></div>
            <div class="text-primary fw-bold">📊 Mengambil statistik AI...</div>
        </div>
    `;
    
    try {
        const response = await fetch('/stats');
        const result = await response.json();
        
        if (response.ok) {
            const stats = result.stats;
            let content = `
                <div class="row text-center mb-4">
                    <div class="col-6">
                        <div class="stat-card">
                            <h3 class="text-primary mb-1">${stats.total_photos}</h3>
                            <small class="text-muted">📸 Total Foto</small>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="stat-card">
                            <h3 class="text-success mb-1">${stats.total_folders}</h3>
                            <small class="text-muted">📁 Folder AI</small>
                        </div>
                    </div>
                </div>
            `;
            
            if (stats.folders && Object.keys(stats.folders).length > 0) {
                content += '<h6 class="mb-3">🤖 Kategorisasi AI:</h6><div class="list-group">';
                Object.entries(stats.folders)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .forEach(([folder, count]) => {
                        const percentage = Math.round((count / stats.total_photos) * 100);
                        content += `
                            <div class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <div>
                                    <span class="fw-bold">${folder}</span>
                                    <small class="text-muted d-block">${percentage}% dari koleksi</small>
                                </div>
                                <span class="badge bg-primary rounded-pill">${count}</span>
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
    const icons = {
        error: 'exclamation-circle',
        warning: 'exclamation-triangle', 
        success: 'check-circle',
        info: 'info-circle'
    };
    
    const colors = {
        error: 'danger',
        warning: 'warning',
        success: 'success', 
        info: 'primary'
    };
    
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${colors[type]} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${icons[type]} me-2"></i>
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
    const uploadForm = document.getElementById('uploadForm');
    const photosInput = document.getElementById('photos');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadForm.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadForm.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadForm.addEventListener(eventName, unhighlight, false);
    });
    
    uploadForm.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadForm.classList.add('border-primary', 'bg-light');
    }
    
    function unhighlight(e) {
        uploadForm.classList.remove('border-primary', 'bg-light');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        photosInput.files = files;
        
        // Show file names
        const fileList = Array.from(files).map(file => file.name).join(', ');
        showToast(`🎯 Files dipilih: ${fileList.substring(0, 100)}${fileList.length > 100 ? '...' : ''}`, 'info');
    }
}); 