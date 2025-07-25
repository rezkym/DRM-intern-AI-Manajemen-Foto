const fs = require('fs-extra');
const path = require('path');
const Config = require('./config');

class FileOrganizer {
    constructor() {
        this.organizedDir = path.resolve(Config.ORGANIZED_PHOTO_DIR);
        this._ensureDirectoryExists(this.organizedDir);
    }

    async _ensureDirectoryExists(dirPath) {
        try {
            await fs.ensureDir(dirPath);
        } catch (error) {
            console.error(`Failed to create directory ${dirPath}:`, error.message);
        }
    }

    async organizePhoto(analysisResult) {
        try {
            const originalPath = path.resolve(analysisResult.original_path);
            
            // Check if file exists
            if (!await fs.pathExists(originalPath)) {
                throw new Error(`File tidak ditemukan: ${originalPath}`);
            }
            
            // Tentukan folder tujuan
            const folderName = this._sanitizeFolderName(analysisResult.suggested_folder);
            const targetFolder = path.join(this.organizedDir, folderName);
            await this._ensureDirectoryExists(targetFolder);
            
            // Tentukan nama file baru
            const fileExtension = path.extname(originalPath).toLowerCase();
            const newFilename = this._sanitizeFilename(analysisResult.suggested_filename);
            
            // Pastikan nama file unik
            const uniqueFilename = await this._ensureUniqueFilename(targetFolder, newFilename, fileExtension);
            const targetPath = path.join(targetFolder, `${uniqueFilename}${fileExtension}`);
            
            // Pindahkan file
            await fs.move(originalPath, targetPath);
            
            // Simpan metadata
            await this._saveMetadata(targetPath, analysisResult);
            
            console.log(`File berhasil dipindahkan: ${originalPath} -> ${targetPath}`);
            
            return {
                status: 'success',
                original_path: originalPath,
                new_path: targetPath,
                folder: folderName,
                filename: `${uniqueFilename}${fileExtension}`
            };
            
        } catch (error) {
            console.error(`Error organizing file ${analysisResult.original_path || 'unknown'}:`, error.message);
            return {
                status: 'error',
                original_path: analysisResult.original_path || 'unknown',
                error: error.message
            };
        }
    }

    async organizeBatch(analysisResults) {
        const results = [];
        
        for (const result of analysisResults) {
            const organizeResult = await this.organizePhoto(result);
            results.push(organizeResult);
        }
        
        return results;
    }

    _sanitizeFolderName(folderName) {
        if (!folderName) {
            return "misc";
        }
        
        // Remove/replace invalid characters
        let sanitized = folderName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
        sanitized = sanitized.replace(/\s+/g, '_');
        
        // Limit length
        if (sanitized.length > 50) {
            sanitized = sanitized.substring(0, 50);
        }
        
        return sanitized || "misc";
    }

    _sanitizeFilename(filename) {
        if (!filename) {
            return "photo";
        }
        
        // Remove/replace invalid characters
        let sanitized = filename.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
        sanitized = sanitized.replace(/\s+/g, '_');
        
        // Limit length
        if (sanitized.length > 100) {
            sanitized = sanitized.substring(0, 100);
        }
        
        return sanitized || "photo";
    }

    async _ensureUniqueFilename(folder, baseName, extension) {
        let counter = 1;
        const originalName = baseName;
        let currentName = baseName;
        
        while (await fs.pathExists(path.join(folder, `${currentName}${extension}`))) {
            currentName = `${originalName}_${counter}`;
            counter++;
        }
        
        return currentName;
    }

    async _saveMetadata(photoPath, analysisResult) {
        const metadataPath = photoPath.replace(path.extname(photoPath), '.json');
        
        // Prepare metadata
        const metadata = {
            analysis_result: { ...analysisResult },
            organized_at: new Date().toISOString(),
            original_filename: path.basename(analysisResult.original_path || '')
        };
        
        // Remove original_path from saved metadata to avoid confusion
        if (metadata.analysis_result.original_path) {
            delete metadata.analysis_result.original_path;
        }
        
        try {
            await fs.writeJson(metadataPath, metadata, { spaces: 2 });
        } catch (error) {
            console.warn(`Gagal menyimpan metadata untuk ${photoPath}:`, error.message);
        }
    }

    async searchPhotos(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        // Scan all organized photos
        try {
            const folders = await fs.readdir(this.organizedDir);
            
            for (const folder of folders) {
                const folderPath = path.join(this.organizedDir, folder);
                const folderStat = await fs.stat(folderPath);
                
                if (!folderStat.isDirectory()) continue;
                
                const files = await fs.readdir(folderPath);
                
                for (const file of files) {
                    const filePath = path.join(folderPath, file);
                    const fileExt = path.extname(file).toLowerCase();
                    
                    if (!Config.SUPPORTED_FORMATS.has(fileExt)) continue;
                    
                    // Check if metadata exists
                    const metadataPath = filePath.replace(fileExt, '.json');
                    
                    if (!await fs.pathExists(metadataPath)) continue;
                    
                    try {
                        const metadata = await fs.readJson(metadataPath);
                        const analysis = metadata.analysis_result || {};
                        
                        // Search in various fields
                        const searchableText = [
                            analysis.description || '',
                            analysis.activity || '',
                            analysis.location_specific || '',
                            analysis.people_details || '',
                            analysis.mood || '',
                            (analysis.keywords || []).join(' '),
                            (analysis.main_objects || []).join(' ')
                        ].filter(Boolean).join(' ').toLowerCase();
                        
                        if (searchableText.includes(queryLower)) {
                            results.push({
                                path: path.relative(process.cwd(), filePath),
                                folder: folder,
                                filename: file,
                                analysis: analysis,
                                relevance_score: (searchableText.match(new RegExp(queryLower, 'g')) || []).length
                            });
                        }
                        
                    } catch (error) {
                        console.warn(`Error reading metadata for ${filePath}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error searching photos:', error.message);
        }
        
        // Sort by relevance
        results.sort((a, b) => b.relevance_score - a.relevance_score);
        return results;
    }

    async getFolderStats() {
        const stats = {};
        let totalPhotos = 0;
        
        try {
            const folders = await fs.readdir(this.organizedDir);
            
            for (const folder of folders) {
                const folderPath = path.join(this.organizedDir, folder);
                const folderStat = await fs.stat(folderPath);
                
                if (!folderStat.isDirectory()) continue;
                
                const files = await fs.readdir(folderPath);
                const photoCount = files.filter(file => 
                    Config.SUPPORTED_FORMATS.has(path.extname(file).toLowerCase())
                ).length;
                
                if (photoCount > 0) {
                    stats[folder] = photoCount;
                    totalPhotos += photoCount;
                }
            }
        } catch (error) {
            console.error('Error getting folder stats:', error.message);
        }
        
        return {
            folders: stats,
            total_photos: totalPhotos,
            total_folders: Object.keys(stats).length
        };
    }
}

module.exports = FileOrganizer; 