// Simple test to debug auth flow
const request = require('supertest');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';

// Import the app after setting env vars
const app = require('./src/app.ts').default;

async function testAuth() {
    console.log('🔍 Starting auth debug test...');
    
    try {
        // Test a simple request without auth first
        console.log('1. Testing route without auth...');
        const response1 = await request(app)
            .get('/api/v1/users/profile')
            .set('User-Agent', 'test-agent');
        
        console.log('Response without auth:', response1.status, response1.body);
        
        // Now test with a fake token
        console.log('2. Testing route with fake token...');
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI507f1f77bcf86cd799439011","email":"test@email.com","role":"user"}.fake-signature';
        
        const response2 = await request(app)
            .get('/api/v1/users/profile')
            .set('Authorization', `Bearer ${fakeToken}`)
            .set('User-Agent', 'test-agent');
        
        console.log('Response with fake token:', response2.status, response2.body);
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testAuth();