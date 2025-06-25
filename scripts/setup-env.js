#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Generate secure random secrets
const generateSecret = (length = 64) => {
    return crypto.randomBytes(length).toString('hex');
};

// Environment variables for development
const envContent = `# Database Configuration
MONGODB_URI=mongodb://localhost:27017/vegan-guide
MONGODB_URI_TEST=mongodb://localhost:27017/vegan-guide-test

# JWT Configuration
JWT_SECRET=${generateSecret(32)}
JWT_REFRESH_SECRET=${generateSecret(32)}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Configuration
PORT=5001
NODE_ENV=development

# Google Maps API (for geocoding)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# Email Configuration (if using nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=${generateSecret(32)}

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/

# API Configuration
API_VERSION=v1
API_PREFIX=/api
`;

const envPath = path.join(__dirname, '..', '.env');

try {
    // Check if .env already exists
    if (fs.existsSync(envPath)) {
        console.log('⚠️  .env file already exists. Skipping creation.');
        console.log('If you need to regenerate it, delete the existing .env file first.');
        return;
    }

    // Create .env file
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('🔐 Secure JWT secrets have been generated automatically.');
    console.log('📝 Please review and update the configuration as needed.');
    console.log('🚀 You can now start the development server with: npm run dev');
} catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    console.log('📋 Please create a .env file manually using the env.example as a template.');
}
