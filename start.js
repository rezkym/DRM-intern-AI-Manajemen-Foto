#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting AI Photo Manager JavaScript...\n');

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    
    const npmInstall = spawn('npm', ['install'], {
        stdio: 'inherit',
        shell: true
    });
    
    npmInstall.on('close', (code) => {
        if (code !== 0) {
            console.error('❌ Failed to install dependencies');
            process.exit(1);
        }
        
        console.log('✅ Dependencies installed successfully!\n');
        startServer();
    });
} else {
    startServer();
}

function startServer() {
    console.log('🌟 Starting server...\n');
    
    const server = spawn('node', ['server.js'], {
        stdio: 'inherit',
        shell: true
    });
    
    server.on('close', (code) => {
        console.log(`\n📝 Server exited with code ${code}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n⏹️  Shutting down server...');
        server.kill('SIGTERM');
    });
} 