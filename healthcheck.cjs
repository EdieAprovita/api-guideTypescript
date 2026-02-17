const http = require('http');

const options = {
    hostname: 'localhost', // Use localhost for health check requests (0.0.0.0 is for binding, not connecting)
    port: process.env.PORT || 8080,
    path: '/health',
    method: 'GET',
    timeout: 8000, // Increased timeout for Cloud Run startup
};

const req = http.request(options, res => {
    let data = '';

    res.on('data', chunk => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ Health check passed');
            process.exit(0);
        } else {
            console.log(`❌ Health check failed with status: ${res.statusCode}`);
            console.log(`Response: ${data}`);
            process.exit(1);
        }
    });
});

req.on('error', err => {
    console.log(`❌ Health check error: ${err.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.log('⏱️ Health check timeout');
    req.destroy();
    process.exit(1);
});

req.end();
