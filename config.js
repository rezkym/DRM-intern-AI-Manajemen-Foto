require('dotenv').config();

class Config {
    static GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    static GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2;
    
    // Folder paths
    static TEMP_PHOTO_DIR = "temp_photos";
    static ORGANIZED_PHOTO_DIR = "organized_photos";
    
    // Batch processing settings
    static BATCH_SIZE = 5;  // Process 5 photos at a time
    static BATCH_DELAY = 2000;  // Wait 2 seconds between batches (in milliseconds)
    
    // Supported image formats
    static SUPPORTED_FORMATS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"]);
    
    // Maximum file size (10MB)
    static MAX_FILE_SIZE = 10 * 1024 * 1024;
    
    // Server configuration
    static PORT = process.env.PORT || 8000;
    static HOST = process.env.HOST || '0.0.0.0';
}

module.exports = Config; 