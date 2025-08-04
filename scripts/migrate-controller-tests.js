#!/usr/bin/env node

/**
 * Script de Migración Automática - Jest → Vitest
 *
 * Este script ayuda a migrar tests de controladores al nuevo patrón:
 * 1. Actualiza imports de Vitest
 * 2. Corrige configuración de mocks
 * 3. Aplica estructura de test estandarizada
 * 4. Añade headers necesarios (User-Agent, API-Version)
 *
 * Uso: node scripts/migrate-controller-tests.js [archivo]
 */

const fs = require('fs');
const path = require('path');

const controllerMigrations = {
    // Mapeo de entidades a sus configuraciones específicas
    business: {
        serviceName: 'businessService',
        entityName: 'Business',
        routePath: '/businesses',
        mockMethods: ['getAllCached', 'findByIdCached', 'create', 'updateById', 'deleteById'],
    },
    doctor: {
        serviceName: 'doctorService',
        entityName: 'Doctor',
        routePath: '/doctors',
        mockMethods: ['getAll', 'findById', 'create', 'updateById', 'deleteById'],
    },
    market: {
        serviceName: 'marketsService',
        entityName: 'Market',
        routePath: '/markets',
        mockMethods: ['getAll', 'findById', 'create', 'updateById', 'deleteById'],
    },
    restaurant: {
        serviceName: 'restaurantService',
        entityName: 'Restaurant',
        routePath: '/restaurants',
        mockMethods: ['getAllCached', 'findByIdCached', 'createCached', 'updateByIdCached', 'deleteById'],
    },
    user: {
        serviceName: 'userService',
        entityName: 'User',
        routePath: '/users',
        mockMethods: ['findAllUsers', 'findUserById', 'registerUser', 'loginUser', 'updateUserById', 'deleteUserById'],
    },
};

function detectEntityType(filePath) {
    const fileName = path.basename(filePath, '.test.ts');
    const entityName = fileName.replace('Controllers', '').toLowerCase();

    return controllerMigrations[entityName] || null;
}

function generateUpdatedImports() {
    return `import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { faker } from '@faker-js/faker';`;
}

function generateServiceMock(config) {
    const methods = config.mockMethods.map(method => `        ${method}: vi.fn(),`).join('\n');

    return `// Mock services - these will be auto-mocked by the global setup
vi.mock('../../services/${config.entityName}Service', () => ({
    ${config.serviceName}: {
${methods}
    },
}));

vi.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: vi.fn(),
        getTopRatedReviews: vi.fn(),
    },
}));

// Import after mocks are defined
import { ${config.serviceName} } from '../../services/${config.entityName}Service';
import { reviewService } from '../../services/ReviewService';`;
}

function generateTestDataHelpers(config) {
    const entityNameLower = config.entityName.toLowerCase();

    return `// Test data helpers
const createMock${config.entityName} = (overrides = {}) => ({
    _id: faker.database.mongodbObjectId(),
    ${entityNameLower}Name: faker.company.name(),
    author: faker.database.mongodbObjectId(),
    address: faker.location.streetAddress(),
    email: faker.internet.email(),
    rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    numReviews: faker.number.int({ min: 0, max: 100 }),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const createValid${config.entityName}Data = () => ({
    ${entityNameLower}Name: faker.company.name(),
    address: faker.location.streetAddress(),
    email: faker.internet.email(),
    // Add required fields for your entity
});`;
}

function updateTestStructure(content, config) {
    // Actualizar headers en requests
    content = content.replace(
        /await request\(app\)\.(\w+)\('([^']+)'\)/g,
        `await request(app).$1('$2')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')`
    );

    // Actualizar expects para usar toMatchObject en lugar de toEqual
    content = content.replace(/expect\(response\.body\)\.toEqual\(/g, 'expect(response.body).toMatchObject(');

    // Agregar beforeEach con configuración de mocks
    if (!content.includes('beforeEach')) {
        const beforeEachBlock = `
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset validation mocks to default (passing) state
        const { validationResult } = require('express-validator');
        if (validationResult && typeof validationResult.mockReturnValue === 'function') {
            validationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
        }
    });`;

        content = content.replace(/describe\('[^']+', \(\) => \{/, `$&${beforeEachBlock}`);
    }

    return content;
}

function migrateControllerTest(filePath) {
    console.log(`🔄 Migrando: ${filePath}`);

    const config = detectEntityType(filePath);
    if (!config) {
        console.log(`❌ No se pudo detectar el tipo de entidad para: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Actualizar imports
    const oldImports = /import.*from ['"]vitest['"];?\s*/g;
    if (oldImports.test(content)) {
        content = content.replace(oldImports, generateUpdatedImports() + '\n\n');
    } else {
        content = generateUpdatedImports() + '\n\n' + content;
    }

    // 2. Actualizar mocks de servicios
    const serviceMockRegex = /vi\.mock\(['"][^'"]*Service['"], \(\) => \(\{[\s\S]*?\}\)\);/g;
    const newServiceMock = generateServiceMock(config);

    if (serviceMockRegex.test(content)) {
        content = content.replace(serviceMockRegex, newServiceMock);
    } else {
        // Insertar después de los imports
        const importEndIndex = content.lastIndexOf('import');
        const nextLineIndex = content.indexOf('\n', importEndIndex);
        content =
            content.slice(0, nextLineIndex + 1) + '\n' + newServiceMock + '\n\n' + content.slice(nextLineIndex + 1);
    }

    // 3. Agregar helpers de test data
    const helpersRegex = /const createMock\w+ = /g;
    if (!helpersRegex.test(content)) {
        const testDataHelpers = generateTestDataHelpers(config);
        const describeIndex = content.indexOf('describe(');
        content = content.slice(0, describeIndex) + testDataHelpers + '\n\n' + content.slice(describeIndex);
    }

    // 4. Actualizar estructura de tests
    content = updateTestStructure(content, config);

    // 5. Crear backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, fs.readFileSync(filePath));

    // 6. Escribir archivo actualizado
    fs.writeFileSync(filePath, content);

    console.log(`✅ Migrado exitosamente: ${filePath}`);
    console.log(`📁 Backup creado: ${backupPath}`);

    return true;
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('📋 Uso: node scripts/migrate-controller-tests.js [archivo]');
        console.log('\n📂 Archivos disponibles:');

        const testDir = path.join(__dirname, '../src/test/controllers');
        if (fs.existsSync(testDir)) {
            fs.readdirSync(testDir)
                .filter(file => file.endsWith('.test.ts'))
                .filter(file => !file.includes('business')) // Ya migrado
                .forEach(file => {
                    const entityType = detectEntityType(file);
                    const status = entityType ? '✅' : '❓';
                    console.log(`   ${status} ${file}`);
                });
        }

        console.log('\n🎯 Ejemplo:');
        console.log('   node scripts/migrate-controller-tests.js src/test/controllers/doctorsControllers.test.ts');

        return;
    }

    const filePath = args[0];

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo no encontrado: ${filePath}`);
        process.exit(1);
    }

    if (!filePath.endsWith('.test.ts')) {
        console.error(`❌ El archivo debe ser un test TypeScript (.test.ts)`);
        process.exit(1);
    }

    try {
        const success = migrateControllerTest(filePath);

        if (success) {
            console.log('\n🎉 ¡Migración completada!');
            console.log('\n📝 Próximos pasos:');
            console.log('1. Revisar el archivo migrado');
            console.log('2. Personalizar campos específicos de la entidad');
            console.log('3. Ejecutar los tests: npm run test ' + filePath);
            console.log('4. Si hay errores, revisar el backup y ajustar manualmente');
        }
    } catch (error) {
        console.error(`❌ Error durante la migración:`, error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    migrateControllerTest,
    detectEntityType,
    controllerMigrations,
};
