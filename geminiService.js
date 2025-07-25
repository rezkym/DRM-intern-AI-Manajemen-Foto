const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Config = require('./config');

class GeminiService {
    constructor() {
        // Setup API keys dengan fallback
        this.apiKeys = [Config.GEMINI_API_KEY, Config.GEMINI_API_KEY_2].filter(Boolean);
        this.currentKeyIndex = 0;
        this._setupClient();
    }

    _setupClient() {
        if (this.apiKeys.length === 0) {
            throw new Error('No Gemini API keys found in environment variables');
        }
        
        const currentKey = this.apiKeys[this.currentKeyIndex];
        this.genAI = new GoogleGenerativeAI(currentKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.modelName = 'gemini-1.5-flash';
        
        console.log(`Initialized Gemini client with API key ${this.currentKeyIndex + 1}`);
    }

    _switchApiKey() {
        if (this.apiKeys.length <= 1) return false;
        
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`Switching to API key ${this.currentKeyIndex + 1}`);
        this._setupClient();
        return true;
    }

    async _optimizeImageForAnalysis(imagePath) {
        try {
            const image = sharp(imagePath);
            const metadata = await image.metadata();
            
            // Optimasi orientasi dan format
            let processedImage = image;
            
            // Auto-rotate berdasarkan EXIF
            processedImage = processedImage.rotate();
            
            // Convert ke RGB jika perlu
            if (metadata.channels === 4) {
                processedImage = processedImage.removeAlpha();
            }
            
            // Resize untuk optimasi token
            const maxSize = 1024;
            if (metadata.width > maxSize || metadata.height > maxSize) {
                processedImage = processedImage.resize(maxSize, maxSize, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }
            
            // Generate optimized filename
            const ext = path.extname(imagePath);
            const optimizedPath = imagePath.replace(ext, '_optimized.jpg');
            
            // Save as JPEG with high quality
            await processedImage
                .jpeg({ quality: 95, progressive: true })
                .toFile(optimizedPath);
            
            return optimizedPath;
        } catch (error) {
            console.warn(`Failed to optimize image ${imagePath}:`, error.message);
            return imagePath;
        }
    }

    async analyzeImage(imagePath) {
        try {
            // Optimasi gambar terlebih dahulu
            const optimizedPath = await this._optimizeImageForAnalysis(imagePath);
            
            // Baca gambar sebagai buffer
            const imageBuffer = await fs.readFile(optimizedPath);
            
            // Detect MIME type
            const ext = path.extname(optimizedPath).toLowerCase();
            let mimeType = 'image/jpeg';
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.webp') mimeType = 'image/webp';
            
            // Prepare image for Gemini
            const imageParts = [{
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: mimeType
                }
            }];

            // Prompt yang dioptimasi berdasarkan best practices Gemini
            const prompt = `Analisis foto ini secara detail dan berikan hasil dalam format JSON yang tepat. Gunakan kemampuan computer vision terbaru untuk deteksi objek dan segmentasi yang akurat.

TUGAS ANALISIS:
1. Identifikasi semua objek utama yang terlihat dengan akurasi tinggi
2. Deteksi aktivitas atau kegiatan yang sedang berlangsung  
3. Analisis konteks lokasi dan setting
4. Identifikasi orang (jumlah, karakteristik umum yang terlihat)
5. Evaluasi mood dan atmosfer foto
6. Generate keywords yang relevan untuk pencarian

FORMAT OUTPUT JSON:
{
    "description": "deskripsi detail dalam bahasa Indonesia (40-60 kata)",
    "main_objects": ["objek1", "objek2", "objek3", "objek4", "objek5"],
    "activity": "aktivitas spesifik yang terjadi",
    "location_type": "indoor/outdoor/vehicle/nature/etc",
    "location_specific": "tempat spesifik jika dapat diidentifikasi",
    "people_count": 0,
    "people_details": "deskripsi orang yang terlihat",
    "mood": "suasana dan atmosfer foto",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7"],
    "suggested_folder": "nama folder kategori yang tepat",
    "suggested_filename": "nama file deskriptif tanpa ekstensi",
    "confidence_score": 0.95,
    "technical_quality": "kualitas teknis foto (excellent/good/fair/poor)"
}

INSTRUKSI KHUSUS:
- Gunakan bahasa Indonesia untuk deskripsi
- Berikan keywords dalam bahasa Indonesia dan Inggris
- Analisis dengan detail dan akurasi tinggi
- Pastikan suggested_folder dan suggested_filename sesuai konten
- Berikan confidence_score berdasarkan kejelasan analisis
- Evaluasi technical_quality gambar

Berikan HANYA output JSON tanpa teks tambahan.`;

            // Generate content menggunakan model
            const result = await this.model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const resultText = response.text().trim();
            
            // Clean up response text untuk JSON parsing
            const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Extract JSON dari response
            const jsonStart = cleanedText.indexOf('{');
            const jsonEnd = cleanedText.lastIndexOf('}') + 1;
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonText = cleanedText.substring(jsonStart, jsonEnd);
                const parsedResult = JSON.parse(jsonText);
                
                // Validasi dan sanitize hasil
                const sanitizedResult = this._sanitizeResult(parsedResult, imagePath);
                
                // Cleanup optimized image jika berbeda dari original
                if (optimizedPath !== imagePath && await fs.pathExists(optimizedPath)) {
                    try {
                        await fs.remove(optimizedPath);
                    } catch (e) {
                        console.warn('Failed to remove optimized image:', e.message);
                    }
                }
                
                console.log(`Successfully analyzed image with confidence: ${sanitizedResult.confidence_score || 'N/A'}`);
                return sanitizedResult;
            } else {
                throw new Error('No valid JSON found in response');
            }
            
        } catch (error) {
            console.error(`Error analyzing image ${imagePath}:`, error.message);
            
            // Cleanup optimized image jika ada error
            const optimizedPath = imagePath.replace(path.extname(imagePath), '_optimized.jpg');
            if (optimizedPath !== imagePath && await fs.pathExists(optimizedPath)) {
                try {
                    await fs.remove(optimizedPath);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
            
            // Coba dengan API key yang lain jika error quota/rate limit
            const errorMessage = error.message.toLowerCase();
            if ((errorMessage.includes('quota') || errorMessage.includes('rate') || 
                 errorMessage.includes('limit') || errorMessage.includes('exceeded')) &&
                this._switchApiKey()) {
                // Retry sekali dengan API key baru
                try {
                    return await this.analyzeImage(imagePath);
                } catch (retryError) {
                    console.error('Retry with different API key also failed:', retryError.message);
                }
            }
            
            // Return default result jika gagal
            return this._getDefaultResult(imagePath);
        }
    }

    _sanitizeResult(result, imagePath) {
        // Sanitize suggested_folder (remove invalid characters)
        if (result.suggested_folder) {
            let folder = result.suggested_folder;
            folder = folder.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            result.suggested_folder = folder || "misc";
        } else {
            result.suggested_folder = "misc";
        }
        
        // Sanitize suggested_filename
        if (result.suggested_filename) {
            let filename = result.suggested_filename;
            filename = filename.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            result.suggested_filename = filename || path.parse(imagePath).name;
        } else {
            result.suggested_filename = path.parse(imagePath).name;
        }
        
        // Ensure all required fields exist dengan default yang lebih baik
        const defaults = {
            description: 'Foto tidak dapat dianalisis dengan detail',
            main_objects: [],
            activity: 'Tidak ada aktivitas spesifik teridentifikasi',
            location_type: 'unknown',
            location_specific: null,
            people_count: 0,
            people_details: null,
            mood: 'neutral',
            keywords: ['photo', 'image'],
            confidence_score: 0.5,
            technical_quality: 'fair'
        };
        
        Object.keys(defaults).forEach(key => {
            if (result[key] === undefined || result[key] === null) {
                result[key] = defaults[key];
            }
        });
        
        return result;
    }

    _getDefaultResult(imagePath) {
        const filename = path.parse(imagePath).name;
        
        return {
            description: 'Foto tidak dapat dianalisis oleh AI',
            main_objects: ['unknown_object'],
            activity: 'Tidak dapat diidentifikasi',
            location_type: 'unknown',
            location_specific: null,
            people_count: 0,
            people_details: null,
            mood: 'neutral',
            keywords: ['foto', 'unanalyzed', 'error'],
            suggested_folder: 'Unanalyzed',
            suggested_filename: filename,
            confidence_score: 0.1,
            technical_quality: 'poor'
        };
    }

    async analyzeBatch(imagePaths) {
        const results = [];
        
        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];
            console.log(`Analyzing image ${i + 1}/${imagePaths.length}: ${imagePath}`);
            
            const result = await this.analyzeImage(imagePath);
            result.original_path = imagePath;
            results.push(result);
            
            // Delay between requests to avoid rate limiting
            if (i < imagePaths.length - 1) {
                await new Promise(resolve => setTimeout(resolve, Config.BATCH_DELAY));
            }
        }
        
        return results;
    }
}

module.exports = GeminiService; 