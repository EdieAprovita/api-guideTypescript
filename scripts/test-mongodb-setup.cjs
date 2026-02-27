const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('node:path');
const fs = require('node:fs');

async function testSetup() {
    console.log('🧪 Testing MongoDB Memory Server setup...');

    const version = process.env.MONGODB_MEMORY_SERVER_VERSION || '6.0.4';
    const downloadDir =
        process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || path.join(process.env.HOME, '.cache/mongodb-binaries');

    console.log(`📋 Configuration:`);
    console.log(`   - Version: ${version}`);
    console.log(`   - Download Dir: ${downloadDir}`);

    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
        console.log(`   - Creating download directory...`);
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    try {
        const config = {
            binary: {
                version: version,
                downloadDir: downloadDir,
                checkMD5: false,
            },
            instance: {
                dbName: 'test-setup-db',
            },
        };

        // Add Ubuntu-specific configuration for CI if on Linux
        if (process.env.CI && process.platform === 'linux') {
            config.binary.platform = 'linux';
            config.binary.arch = 'x64';
            config.binary.os = {
                os: 'linux',
                dist: 'ubuntu',
                release: '22.04',
            };
        }

        console.log('🚀 Starting MongoDB Memory Server...');
        const mongod = await MongoMemoryServer.create(config);

        const uri = mongod.getUri();
        console.log(`✅ MongoDB Memory Server started successfully at: ${uri}`);

        console.log('🛑 Stopping MongoDB Memory Server...');
        await mongod.stop();
        console.log('✅ Test completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB Memory Server setup failed:');
        console.error(error);
        process.exit(1);
    }
}

testSetup();
