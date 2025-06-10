#!/usr/bin/env node

const postmanToOpenApi = require('postman-to-openapi');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
    console.log('Usage: node convert-postman.js <postman-collection.json> [output-file.yaml]');
    console.log('Example: node convert-postman.js postman_collection.json swagger.yaml');
    process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || 'openapi.yaml';

// Convert Postman collection to OpenAPI
postmanToOpenApi(inputFile, outputFile, {
    defaultTag: 'General',
    pathDepth: 0,
    auth: {
        apikey: {
            name: 'X-API-Key',
            in: 'header'
        }
    }
})
.then(result => {
    console.log(`✅ Successfully converted Postman collection to OpenAPI spec: ${outputFile}`);
})
.catch(err => {
    console.error('❌ Error converting collection:', err.message);
    process.exit(1);
});

