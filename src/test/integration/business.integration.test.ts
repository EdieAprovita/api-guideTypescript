import { vi } from 'vitest';

// CRITICAL: Deshabilitar mocks globales para pruebas de integración
vi.doUnmock('../../models/User');
vi.doUnmock('../../models/Business');
vi.doUnmock('../../models/Restaurant');
vi.doUnmock('../../services/TokenService');

// CRITICAL: También deshabilitar middleware que usa TokenService
vi.doUnmock('../../middleware/authMiddleware');

// CRITICAL: Deshabilitar controladores para usar implementaciones reales
vi.doUnmock('../../controllers/userControllers');
vi.doUnmock('../../controllers/businessControllers');

// CRITICAL: Deshabilitar mocks de librerías
vi.doUnmock('jsonwebtoken');
vi.doUnmock('bcryptjs');

import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// Importar app dinámicamente después de desmockear dependencias 
const appPromise = import('../../app');
import { setupTestDb, cleanDbBeforeEach } from './helpers/integrationDb';
import { 
    createCompleteTestSetup, 
    createTestBusinessData,
    TestSetupData 
} from './helpers/integrationFixtures';

describe('Business API Integration Tests', () => {
    setupTestDb();
    cleanDbBeforeEach();
    
    let testSetup: TestSetupData;
    let app: any;

    beforeEach(async () => {
        // Importar app dinámicamente después de que los mocks estén desmockeados
        const appModule = await appPromise;
        app = appModule.default;
        
        testSetup = await createCompleteTestSetup();
    });

    it('should create a business', async () => {
        const businessData = createTestBusinessData(new mongoose.Types.ObjectId(testSetup.admin._id));

        const response = await request(app)
            .post('/api/v1/businesses')
            .set('Authorization', `Bearer ${testSetup.adminTokens.accessToken}`)
            .send(businessData);

        console.log('🔍 CREATE BUSINESS DEBUG:');
        console.log('  Status:', response.status);
        console.log('  Body:', JSON.stringify(response.body, null, 2));
        console.log('  Expected namePlace:', businessData.namePlace);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.namePlace).toBe(businessData.namePlace);

        // Importación correcta del modelo
        const BusinessModule = await import('../../models/Business');
        const Business = BusinessModule.Business;
        const created = await Business.findOne({ namePlace: businessData.namePlace });
        expect(created).not.toBeNull();
        expect(created?.namePlace).toBe(businessData.namePlace);
    });

    it('should get all businesses', async () => {
        // Importación correcta del modelo
        const BusinessModule = await import('../../models/Business');
        const Business = BusinessModule.Business;
        
        // Crear negocios de prueba en BD
        const business1 = createTestBusinessData(new mongoose.Types.ObjectId(testSetup.admin._id), { namePlace: 'Test Business 1' });
        const business2 = createTestBusinessData(new mongoose.Types.ObjectId(testSetup.admin._id), { namePlace: 'Test Business 2' });
        
        await Business.create(business1);
        await Business.create(business2);

        const response = await request(app)
            .get('/api/v1/businesses')
            .set('Authorization', `Bearer ${testSetup.adminTokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(2);
    });

    it('should get a business by id', async () => {
        // Importación correcta del modelo
        const BusinessModule = await import('../../models/Business');
        const Business = BusinessModule.Business;
        
        const businessData = createTestBusinessData(new mongoose.Types.ObjectId(testSetup.admin._id));
        const business = await Business.create(businessData);

        const response = await request(app)
            .get(`/api/v1/businesses/${business._id}`)
            .set('Authorization', `Bearer ${testSetup.adminTokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data._id).toBe(business._id.toString());
        expect(response.body.data.namePlace).toBe(businessData.namePlace);
    });

    it('should update a business', async () => {
        // Importación correcta del modelo
        const BusinessModule = await import('../../models/Business');
        const Business = BusinessModule.Business;
        
        const businessData = createTestBusinessData(new mongoose.Types.ObjectId(testSetup.admin._id));
        const business = await Business.create(businessData);
        const updateData = { namePlace: 'Updated Business Name' };

        const response = await request(app)
            .put(`/api/v1/businesses/${business._id}`)
            .set('Authorization', `Bearer ${testSetup.adminTokens.accessToken}`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.namePlace).toBe(updateData.namePlace);
    });

    it('should delete a business', async () => {
        // Importación correcta del modelo
        const BusinessModule = await import('../../models/Business');
        const Business = BusinessModule.Business;
        
        const businessData = createTestBusinessData(new mongoose.Types.ObjectId(testSetup.admin._id));
        const business = await Business.create(businessData);

        const response = await request(app)
            .delete(`/api/v1/businesses/${business._id}`)
            .set('Authorization', `Bearer ${testSetup.adminTokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const deleted = await Business.findById(business._id);
        expect(deleted).toBeNull();
    });

    it('should reject unauthorized requests', async () => {
        const businessData = createTestBusinessData(new mongoose.Types.ObjectId(testSetup.admin._id));

        const response = await request(app)
            .post('/api/v1/businesses')
            .send(businessData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('should reject invalid business data', async () => {
        const invalidData = {
            // Faltan campos requeridos
            namePlace: '',
            address: '',
        };

        const response = await request(app)
            .post('/api/v1/businesses')
            .set('Authorization', `Bearer ${testSetup.adminTokens.accessToken}`)
            .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });
});