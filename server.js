const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const Config = require('./config');
const GeminiService = require('./geminiService');
const FileOrganizer = require('./fileOrganizer');

// Initialize Express app
const app = express();

// Setup middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup static files
app.use('/static', express.static('static'));
app.use('/organized_photos', express.static('organized_photos'));

// Tidak perlu template engine lagi - gunakan static HTML

// Initialize services
const geminiService = new GeminiService();
const fileOrganizer = new FileOrganizer();

// Global variables untuk tracking batch processing
const processingStatus = {
    is_processing: false,
    current_batch: 0,
    total_batches: 0,
    current_files: [],
    completed_files: [],
    failed_files: [],
    start_time: null
};

// Configure multer untuk file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await fs.ensureDir(Config.TEMP_PHOTO_DIR);
        cb(null, Config.TEMP_PHOTO_DIR);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Remove special characters from filename
        const cleanFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const safeFilename = `${timestamp}_${cleanFilename}`;
        cb(null, safeFilename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: Config.MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (Config.SUPPORTED_FORMATS.has(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Format tidak didukung: ${ext}`), false);
        }
    }
});

// Routes

// Homepage - serve static HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint untuk konfigurasi (digunakan oleh frontend)
app.get('/api/config', (req, res) => {
    res.json({
        supported_formats: Array.from(Config.SUPPORTED_FORMATS),
        max_file_size_mb: Config.MAX_FILE_SIZE / (1024 * 1024)
    });
});

// Upload multiple photos ke temp folder
app.post('/upload', upload.array('files'), async (req, res) => {
    try {
        if (processingStatus.is_processing) {
            return res.status(409).json({
                detail: 'Sedang memproses batch lain. Silakan tunggu.'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                detail: 'Tidak ada file yang diupload'
            });
        }

        const uploadedFiles = req.files.map(file => file.path);
        const invalidFiles = []; // Multer sudah handle validation

        if (uploadedFiles.length === 0) {
            return res.status(400).json({
                detail: 'Tidak ada file valid yang diupload'
            });
        }

        // Start background processing
        processPhotosBatch(uploadedFiles);

        res.json({
            status: 'success',
            message: `Berhasil upload ${uploadedFiles.length} foto. Proses analisis dimulai.`,
            uploaded_count: uploadedFiles.length,
            invalid_files: invalidFiles,
            processing_started: true
        });

    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({
            detail: `Error upload: ${error.message}`
        });
    }
});

// Background task untuk memproses batch foto
async function processPhotosBatch(filePaths) {
    try {
        processingStatus.is_processing = true;
        processingStatus.current_batch = 0;
        processingStatus.total_batches = Math.ceil(filePaths.length / Config.BATCH_SIZE);
        processingStatus.current_files = [];
        processingStatus.completed_files = [];
        processingStatus.failed_files = [];
        processingStatus.start_time = new Date();

        // Process in batches
        for (let i = 0; i < filePaths.length; i += Config.BATCH_SIZE) {
            const batchFiles = filePaths.slice(i, i + Config.BATCH_SIZE);
            processingStatus.current_batch++;
            processingStatus.current_files = batchFiles.map(f => path.basename(f));

            console.log(`Processing batch ${processingStatus.current_batch}/${processingStatus.total_batches}`);

            // Analyze with Gemini
            const analysisResults = await geminiService.analyzeBatch(batchFiles);

            // Organize files
            const organizeResults = await fileOrganizer.organizeBatch(analysisResults);

            // Update status
            organizeResults.forEach(result => {
                if (result.status === 'success') {
                    processingStatus.completed_files.push(result);
                } else {
                    processingStatus.failed_files.push(result);
                }
            });

            // Clear temp files that were successfully processed
            for (const batchFile of batchFiles) {
                try {
                    if (await fs.pathExists(batchFile)) {
                        await fs.remove(batchFile);
                    }
                } catch (e) {
                    console.warn(`Failed to delete temp file ${batchFile}:`, e.message);
                }
            }
        }

        processingStatus.is_processing = false;
        console.log(`Batch processing completed. Processed ${processingStatus.completed_files.length} files.`);

    } catch (error) {
        console.error('Error in batch processing:', error);
        processingStatus.is_processing = false;
        processingStatus.failed_files.push({
            error: `Batch processing error: ${error.message}`
        });
    }
}

// Get current processing status
app.get('/status', (req, res) => {
    const statusCopy = { ...processingStatus };
    if (statusCopy.start_time) {
        statusCopy.start_time = statusCopy.start_time.toISOString();
    }
    res.json(statusCopy);
});

// Search photos berdasarkan query
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query || !query.trim()) {
            return res.status(400).json({
                detail: 'Query pencarian tidak boleh kosong'
            });
        }

        const results = await fileOrganizer.searchPhotos(query.trim());

        res.json({
            status: 'success',
            query: query,
            results: results,
            total_found: results.length
        });

    } catch (error) {
        console.error('Error searching photos:', error);
        res.status(500).json({
            detail: `Error pencarian: ${error.message}`
        });
    }
});

// Get statistics tentang foto yang sudah diorganisir
app.get('/stats', async (req, res) => {
    try {
        const stats = await fileOrganizer.getFolderStats();
        res.json({
            status: 'success',
            stats: stats
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            detail: `Error getting stats: ${error.message}`
        });
    }
});

// Serve browse page as static HTML
app.get('/browse.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'browse.html'));
});

// API endpoint untuk browse data
app.get('/api/browse', async (req, res) => {
    try {
        const folder = req.query.folder || '';
        const organizedDir = path.resolve(Config.ORGANIZED_PHOTO_DIR);

        if (folder) {
            // Browse specific folder
            const folderPath = path.join(organizedDir, folder);
            
            if (!await fs.pathExists(folderPath) || !(await fs.stat(folderPath)).isDirectory()) {
                return res.status(404).json({
                    error: 'Folder tidak ditemukan'
                });
            }

            const files = await fs.readdir(folderPath);
            const photos = [];

            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const fileExt = path.extname(file).toLowerCase();
                
                if (Config.SUPPORTED_FORMATS.has(fileExt)) {
                    // Try to load metadata
                    const metadataPath = filePath.replace(fileExt, '.json');
                    let metadata = {};
                    
                    if (await fs.pathExists(metadataPath)) {
                        try {
                            metadata = await fs.readJson(metadataPath);
                        } catch (e) {
                            // Ignore metadata read errors
                        }
                    }

                    photos.push({
                        filename: file,
                        path: path.relative(process.cwd(), filePath),
                        metadata: metadata.analysis_result || {}
                    });
                }
            }

            res.json({
                folder: folder,
                photos: photos,
                is_folder_view: true
            });

        } else {
            // List all folders
            const folders = [];
            
            if (await fs.pathExists(organizedDir)) {
                const items = await fs.readdir(organizedDir);
                
                for (const item of items) {
                    const itemPath = path.join(organizedDir, item);
                    const itemStat = await fs.stat(itemPath);
                    
                    if (itemStat.isDirectory()) {
                        const files = await fs.readdir(itemPath);
                        const photoCount = files.filter(file => 
                            Config.SUPPORTED_FORMATS.has(path.extname(file).toLowerCase())
                        ).length;
                        
                        if (photoCount > 0) {
                            folders.push({
                                name: item,
                                photo_count: photoCount
                            });
                        }
                    }
                }
            }

            res.json({
                folders: folders,
                is_folder_view: false
            });
        }

    } catch (error) {
        console.error('Error browsing photos:', error);
        res.status(500).json({
            error: `Error browsing: ${error.message}`
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'AI Photo Manager',
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                detail: `File terlalu besar. Maksimal ${Config.MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
        }
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({
        detail: 'Internal server error'
    });
});

// Initialize and start server
async function startServer() {
    try {
        // Create necessary directories
        await fs.ensureDir(Config.TEMP_PHOTO_DIR);
        await fs.ensureDir(Config.ORGANIZED_PHOTO_DIR);
        await fs.ensureDir('static');
        await fs.ensureDir('templates');

        // Start the server
        const server = app.listen(Config.PORT, Config.HOST, () => {
            console.log(`✅ AI Photo Manager Server berhasil dijalankan!`);
            console.log(`🌐 URL: http://${Config.HOST}:${Config.PORT}`);
            console.log(`📁 Temp folder: ${Config.TEMP_PHOTO_DIR}`);
            console.log(`📂 Organized folder: ${Config.ORGANIZED_PHOTO_DIR}`);
            console.log(`🔑 Gemini API keys: ${geminiService.apiKeys.length} configured`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('Process terminated');
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    startServer();
}

module.exports = app; 