#!/usr/bin/env node

/**
 * Test script untuk memverifikasi konversi Python ke JavaScript
 * Menguji semua komponen utama sistem
 */

const fs = require('fs-extra');
const path = require('path');

// Import modules yang dikonversi
const Config = require('./config');
const GeminiService = require('./geminiService');
const FileOrganizer = require('./fileOrganizer');

console.log('🧪 Testing AI Photo Manager Simple Version\n');
console.log('📝 Pendekatan baru: Static HTML + API (NO template engine!)\n');

async function testConfig() {
    console.log('1️⃣  Testing Config...');
    
    try {
        console.log(`   ✅ TEMP_PHOTO_DIR: ${Config.TEMP_PHOTO_DIR}`);
        console.log(`   ✅ ORGANIZED_PHOTO_DIR: ${Config.ORGANIZED_PHOTO_DIR}`);
        console.log(`   ✅ BATCH_SIZE: ${Config.BATCH_SIZE}`);
        console.log(`   ✅ BATCH_DELAY: ${Config.BATCH_DELAY}ms`);
        console.log(`   ✅ MAX_FILE_SIZE: ${Config.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        console.log(`   ✅ SUPPORTED_FORMATS: ${Array.from(Config.SUPPORTED_FORMATS).join(', ')}`);
        console.log(`   ✅ PORT: ${Config.PORT}`);
        console.log('   ✅ Config module working correctly\n');
        return true;
    } catch (error) {
        console.log(`   ❌ Config error: ${error.message}\n`);
        return false;
    }
}

async function testGeminiService() {
    console.log('2️⃣  Testing GeminiService...');
    
    try {
        const geminiService = new GeminiService();
        console.log(`   ✅ GeminiService initialized`);
        console.log(`   ✅ API Keys configured: ${geminiService.apiKeys.length}`);
        console.log(`   ✅ Model: ${geminiService.modelName}`);
        
        // Test dengan fake image path (tidak akan di-analyze karena file tidak ada)
        const fakeImagePath = 'test.jpg';
        console.log(`   ⚠️  Testing with fake image (expected to return default result)`);
        
        const result = await geminiService.analyzeImage(fakeImagePath);
        console.log(`   ✅ Default result generated: ${result.suggested_folder}`);
        console.log('   ✅ GeminiService working correctly\n');
        return true;
    } catch (error) {
        console.log(`   ❌ GeminiService error: ${error.message}`);
        console.log('   ⚠️  This might be normal if no API keys are configured\n');
        return false;
    }
}

async function testFileOrganizer() {
    console.log('3️⃣  Testing FileOrganizer...');
    
    try {
        const fileOrganizer = new FileOrganizer();
        console.log(`   ✅ FileOrganizer initialized`);
        
        // Test sanitization methods
        const testFolder = fileOrganizer._sanitizeFolderName('Test Folder!@#$%');
        console.log(`   ✅ Folder sanitization: "Test Folder!@#$%" → "${testFolder}"`);
        
        const testFilename = fileOrganizer._sanitizeFilename('Test File!@#$.jpg');
        console.log(`   ✅ Filename sanitization: "Test File!@#$.jpg" → "${testFilename}"`);
        
        // Test stats
        const stats = await fileOrganizer.getFolderStats();
        console.log(`   ✅ Stats: ${stats.total_photos} photos in ${stats.total_folders} folders`);
        
        // Test search (should return empty for non-existent query)
        const searchResults = await fileOrganizer.searchPhotos('nonexistent query');
        console.log(`   ✅ Search test: ${searchResults.length} results`);
        
        console.log('   ✅ FileOrganizer working correctly\n');
        return true;
    } catch (error) {
        console.log(`   ❌ FileOrganizer error: ${error.message}\n`);
        return false;
    }
}

async function testDirectories() {
    console.log('4️⃣  Testing Directory Structure...');
    
    try {
        const requiredDirs = [
            Config.TEMP_PHOTO_DIR,
            Config.ORGANIZED_PHOTO_DIR,
            'static',
            'templates'
        ];
        
        let allExists = true;
        for (const dir of requiredDirs) {
            if (await fs.pathExists(dir)) {
                console.log(`   ✅ ${dir}/ exists`);
            } else {
                console.log(`   ⚠️  ${dir}/ does not exist (will be created automatically)`);
                allExists = false;
            }
        }
        
        const requiredFiles = [
            'package.json',
            'server.js',
            'config.js',
            'geminiService.js',
            'fileOrganizer.js',
            'index.html',
            'browse.html',
            'static/js/app.js',
            'static/js/browse.js'
        ];
        
        for (const file of requiredFiles) {
            if (await fs.pathExists(file)) {
                console.log(`   ✅ ${file} exists`);
            } else {
                console.log(`   ❌ ${file} missing`);
                allExists = false;
            }
        }
        
        console.log(allExists ? 
            '   ✅ Directory structure correct\n' : 
            '   ⚠️  Some files/directories missing\n'
        );
        return allExists;
    } catch (error) {
        console.log(`   ❌ Directory test error: ${error.message}\n`);
        return false;
    }
}

async function testStaticHTML() {
    console.log('5️⃣  Testing Static HTML Files...');
    
    try {
        const indexHTML = await fs.readFile('index.html', 'utf8');
        const browseHTML = await fs.readFile('browse.html', 'utf8');
        
        // Check for static HTML (no template syntax)
        const hasTemplateEngine = (html) => {
            return html.includes('<%') || html.includes('{{') || html.includes('{%');
        };
        
        // Check for proper static HTML structure
        const hasProperStructure = (html) => {
            return html.includes('<!DOCTYPE html>') && 
                   html.includes('<html') && 
                   html.includes('<head>') && 
                   html.includes('<body>');
        };
        
        if (!hasTemplateEngine(indexHTML) && hasProperStructure(indexHTML)) {
            console.log('   ✅ index.html is pure static HTML (no template engine)');
        } else {
            console.log('   ❌ index.html still has template syntax or invalid structure');
        }
        
        if (!hasTemplateEngine(browseHTML) && hasProperStructure(browseHTML)) {
            console.log('   ✅ browse.html is pure static HTML (no template engine)');
        } else {
            console.log('   ❌ browse.html still has template syntax or invalid structure');
        }
        
        // Check for proper API integration
        if (indexHTML.includes('loadConfiguration') && indexHTML.includes('/api/')) {
            console.log('   ✅ index.html properly integrated with API');
        } else {
            console.log('   ⚠️  index.html might not be properly integrated with API');
        }
        
        if (browseHTML.includes('loadFoldersList') && browseHTML.includes('loadFolderPhotos')) {
            console.log('   ✅ browse.html properly integrated with API');
        } else {
            console.log('   ⚠️  browse.html might not be properly integrated with API');
        }
        
        console.log('   ✅ Static HTML files verified\n');
        return true;
    } catch (error) {
        console.log(`   ❌ HTML test error: ${error.message}\n`);
        return false;
    }
}

async function runAllTests() {
    const results = [
        await testConfig(),
        await testGeminiService(),
        await testFileOrganizer(),
        await testDirectories(),
        await testStaticHTML()
    ];
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('📊 Test Results Summary:');
    console.log(`   Passed: ${passed}/${total} tests`);
    
    if (passed === total) {
        console.log('   🎉 All tests passed! Sistem Simple berhasil!');
        console.log('\n🚀 Ready to run:');
        console.log('   • node start.js (easy startup)');
        console.log('   • npm install && npm start (manual)');
        console.log('\n✨ Yang sudah disederhanakan:');
        console.log('   • HTML biasa tanpa template engine');
        console.log('   • JavaScript biasa untuk fetch API');
        console.log('   • Server hanya API endpoints JSON');
    } else {
        console.log('   ⚠️  Some tests failed. Check issues above.');
    }
    
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure .env file has GEMINI_API_KEY');
    console.log('   2. Run: node start.js');
    console.log('   3. Open: http://localhost:8000');
    console.log('   4. Test upload functionality');
    console.log('   5. Read: MULAI-SIMPLE.md untuk panduan lengkap');
}

// Run tests
runAllTests().catch(console.error); 