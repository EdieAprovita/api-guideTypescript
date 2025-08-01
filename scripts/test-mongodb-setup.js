#!/usr/bin/env node

/**
 * MongoDB Memory Server Test Script
 * Tests if MongoDB Memory Server can start successfully in the current environment
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function testMongoDBSetup() {
  console.log('🧪 Testing MongoDB Memory Server setup...\n');
  
  // Display environment info
  console.log('📋 Environment Information:');
  console.log(`   - Node.js version: ${process.version}`);
  console.log(`   - Platform: ${process.platform} ${process.arch}`);
  console.log(`   - CI environment: ${process.env.CI ? 'Yes' : 'No'}`);
  console.log(`   - MongoDB version: ${process.env.MONGODB_MEMORY_SERVER_VERSION || '6.0.4'}`);
  console.log('');

  let mongoServer = null;
  let testPassed = false;

  try {
    console.log('🚀 Creating MongoDB Memory Server instance...');
    
    // Configure for the current platform
    const config = {
      instance: {
        dbName: 'setup-test',
        port: undefined,
        storageEngine: 'wiredTiger',
      },
      binary: {
        version: process.env.MONGODB_MEMORY_SERVER_VERSION || '6.0.4',
        downloadDir: process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || '~/.cache/mongodb-binaries',
        checkMD5: false,
      },
      autoStart: true,
    };

    // Only specify Ubuntu 22.04 configuration in CI Linux environments
    if (process.env.CI && process.platform === 'linux') {
      config.binary.platform = 'linux';
      config.binary.arch = 'x64';
      config.binary.os = {
        os: 'linux',
        dist: 'ubuntu',
        release: '22.04'
      };
      console.log('🐧 Using Ubuntu 22.04 specific configuration for CI');
    } else {
      console.log(`🖥️  Using default configuration for ${process.platform} ${process.arch}`);
    }

    // CI-specific optimizations
    if (process.env.CI) {
      config.instance.args = ['--nojournal', '--noprealloc', '--smallfiles'];
    }

    // Create server with timeout
    const startTime = Date.now();
    mongoServer = await Promise.race([
      MongoMemoryServer.create(config),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB startup timeout (60s)')), 60000)
      )
    ]);
    
    const startupTime = Date.now() - startTime;
    console.log(`✅ MongoDB Memory Server started successfully in ${startupTime}ms`);

    // Get connection URI
    const uri = mongoServer.getUri();
    console.log(`📍 Connection URI: ${uri}`);

    // Test connection
    console.log('🔗 Testing database connection...');
    await mongoose.connect(uri, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Database connection successful');

    // Test basic operations
    console.log('🧪 Testing basic database operations...');
    const testSchema = new mongoose.Schema({ name: String, value: Number });
    const TestModel = mongoose.model('Test', testSchema);

    // Insert test document
    const testDoc = new TestModel({ name: 'test', value: 42 });
    await testDoc.save();

    // Query test document
    const found = await TestModel.findOne({ name: 'test' });
    if (!found || found.value !== 42) {
      throw new Error('Database operation test failed');
    }

    console.log('✅ Basic database operations successful');
    testPassed = true;

  } catch (error) {
    console.error('❌ MongoDB Memory Server test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.stack) {
      console.error('   Stack trace:');
      console.error(error.stack.split('\n').slice(0,5).map(line => `   ${line}`).join('\n'));
    }

    // Try fallback test with different version and configuration
    if (!testPassed && (error.message.includes('closed unexpectedly') || error.message.includes('libcrypto'))) {
      console.log('\n🔄 Trying fallback test with different configuration...');
      
      try {
        if (mongoServer) {
          await mongoServer.stop();
          mongoServer = null;
        }
        
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
        }

        // Try without specific OS configuration first
        mongoServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'fallback-test',
            args: ['--nojournal', '--noprealloc'],
          },
          binary: {
            version: '6.0.4',
            checkMD5: false,
          },
        });

        const fallbackUri = mongoServer.getUri();
        await mongoose.connect(fallbackUri, {
          maxPoolSize: 1,
          serverSelectionTimeoutMS: 10000,
        });

        console.log('✅ Fallback test with simplified configuration successful');
        testPassed = true;

      } catch (fallbackError) {
        console.log('\n🔄 Trying final fallback with MongoDB 5.0.19...');
        
        try {
          if (mongoServer) {
            await mongoServer.stop();
            mongoServer = null;
          }
          
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }

          mongoServer = await MongoMemoryServer.create({
            instance: {
              dbName: 'final-fallback-test',
              args: ['--nojournal'],
            },
            binary: {
              version: '5.0.19',
              checkMD5: false,
            },
          });

          const finalUri = mongoServer.getUri();
          await mongoose.connect(finalUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
          });

          console.log('✅ Final fallback test with MongoDB 5.0.19 successful');
          testPassed = true;

        } catch (finalError) {
          console.error('❌ All fallback tests failed:', finalError.message);
        }
      }
    }
  } finally {
    // Cleanup
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      
      if (mongoServer) {
        await mongoServer.stop();
      }
      
      console.log('\n🧹 Cleanup completed');
    } catch (cleanupError) {
      console.warn('⚠️  Cleanup warning:', cleanupError.message);
    }
  }

  // Final result
  console.log('\n' + '='.repeat(50));
  if (testPassed) {
    console.log('🎉 MongoDB Memory Server test PASSED');
    console.log('✅ Environment is ready for integration tests');
    process.exit(0);
  } else {
    console.log('💥 MongoDB Memory Server test FAILED');
    console.log('❌ Integration tests may fail in this environment');
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('   - Ubuntu 22.04: Install libssl1.1 package for libcrypto.so.1.1');
    console.log('   - Use MongoDB version 6.0.4+ for better Ubuntu 22.04 support');
    console.log('   - Check system dependencies (libssl, libc6)');
    console.log('   - Verify available disk space and memory');
    console.log('   - Try clearing MongoDB binary cache: rm -rf ~/.cache/mongodb-binaries');
    console.log('   - Check firewall/network restrictions');
    process.exit(1);
  }
}

// Run the test
testMongoDBSetup().catch((error) => {
  console.error('💥 Unexpected error during MongoDB setup test:', error);
  process.exit(1);
});