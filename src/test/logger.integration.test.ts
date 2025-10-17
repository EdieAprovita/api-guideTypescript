import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server';
import logger from '../utils/logger';

describe('Logger Integration Tests', () => {
    beforeAll(() => {
        logger.info('Starting logger integration tests');
    });

    afterAll(() => {
        logger.info('Completing logger integration tests');
        if (server) {
            server.close();
        }
    });

    describe('Logger Module', () => {
        it('should initialize logger without errors', () => {
            expect(logger).toBeDefined();
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.debug).toBe('function');
        });

        it('should log info level', () => {
            expect(() => {
                logger.info('Test info message');
            }).not.toThrow();
        });

        it('should log error level', () => {
            expect(() => {
                logger.error('Test error message');
            }).not.toThrow();
        });

        it('should log warn level', () => {
            expect(() => {
                logger.warn('Test warn message');
            }).not.toThrow();
        });

        it('should log debug level', () => {
            expect(() => {
                logger.debug('Test debug message');
            }).not.toThrow();
        });

        it('should log with metadata', () => {
            expect(() => {
                logger.info('Test with metadata', {
                    userId: 123,
                    action: 'test',
                    timestamp: new Date().toISOString(),
                });
            }).not.toThrow();
        });

        it('should handle errors properly', () => {
            const testError = new Error('Test error');
            expect(() => {
                logger.error('Error occurred', testError);
            }).not.toThrow();
        });

        it('should handle Error instances', () => {
            const error = new Error('Test error message');
            expect(() => {
                logger.error('Caught error', error, { context: 'test' });
            }).not.toThrow();
        });
    });

    describe('Health Check Endpoints', () => {
        it('should respond to GET /health with 200', async () => {
            const response = await request(app).get('/health').expect(200);
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('alive');
        });

        it('should include correlation ID in /health response', async () => {
            const response = await request(app).get('/health').expect(200);
            expect(response.headers['x-correlation-id']).toBeDefined();
            expect(response.headers['x-correlation-id']).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            );
        });

        it('should preserve X-Correlation-ID from request headers', async () => {
            const customId = 'test-correlation-123';
            const response = await request(app).get('/health').set('X-Correlation-ID', customId).expect(200);

            expect(response.headers['x-correlation-id']).toBe(customId);
        });

        it('should include timestamp in health response', async () => {
            const response = await request(app).get('/health').expect(200);
            expect(response.body).toHaveProperty('timestamp');
            expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
        });

        it('should include uptime in health response', async () => {
            const response = await request(app).get('/health').expect(200);
            expect(response.body).toHaveProperty('uptime');
            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThan(0);
        });

        it('should include environment in health response', async () => {
            const response = await request(app).get('/health').expect(200);
            expect(response.body).toHaveProperty('environment');
        });
    });

    describe('Readiness Check Endpoint', () => {
        it('should respond to GET /health/ready', async () => {
            const response = await request(app).get('/health/ready');
            expect([200, 503]).toContain(response.status);
        });

        it('should include ready status in response', async () => {
            const response = await request(app).get('/health/ready');
            expect(response.body).toHaveProperty('ready');
            expect(typeof response.body.ready).toBe('boolean');
        });

        it('should include mongodb status in response', async () => {
            const response = await request(app).get('/health/ready');
            expect(response.body).toHaveProperty('mongodb');
            expect(typeof response.body.mongodb).toBe('boolean');
        });

        it('should include timestamp in readiness response', async () => {
            const response = await request(app).get('/health/ready');
            expect(response.body).toHaveProperty('timestamp');
            expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
        });
    });

    describe('Deep Health Check Endpoint', () => {
        it('should respond to GET /health/deep', async () => {
            const response = await request(app).get('/health/deep');
            expect([200, 503]).toContain(response.status);
        });

        it('should include health status in deep check', async () => {
            const response = await request(app).get('/health/deep');
            expect(response.body).toHaveProperty('status');
            expect(['healthy', 'degraded']).toContain(response.body.status);
        });

        it('should include services info in deep check', async () => {
            const response = await request(app).get('/health/deep');
            expect(response.body).toHaveProperty('services');
            expect(response.body.services).toHaveProperty('mongodb');
        });

        it('should include memory info in deep check', async () => {
            const response = await request(app).get('/health/deep');
            expect(response.body).toHaveProperty('memory');
            expect(response.body.memory).toHaveProperty('rss');
            expect(response.body.memory).toHaveProperty('heapUsed');
            expect(response.body.memory).toHaveProperty('heapTotal');
        });

        it('should include uptime info in deep check', async () => {
            const response = await request(app).get('/health/deep');
            expect(response.body).toHaveProperty('uptime');
            expect(typeof response.body.uptime).toBe('string');
        });
    });

    describe('Request Logger Middleware', () => {
        it('should add correlation ID to all requests', async () => {
            const response = await request(app).get('/health');
            expect(response.headers['x-correlation-id']).toBeDefined();
        });

        it('should generate unique correlation IDs', async () => {
            const response1 = await request(app).get('/health');
            const response2 = await request(app).get('/health');
            expect(response1.headers['x-correlation-id']).not.toBe(response2.headers['x-correlation-id']);
        });

        it('should handle multiple requests', async () => {
            const responses = await Promise.all([
                request(app).get('/health'),
                request(app).get('/health/ready'),
                request(app).get('/health/deep'),
            ]);

            for (const response of responses) {
                expect(response.headers['x-correlation-id']).toBeDefined();
                expect(response.status).toBeGreaterThanOrEqual(200);
            }
        });
    });

    describe('API Endpoints Still Working', () => {
        it('should respond to GET /api/v1', async () => {
            const response = await request(app).get('/api/v1').expect(200);
            expect(response.text).toBe('API is running');
        });

        it('should respond to GET / (root)', async () => {
            const response = await request(app).get('/').expect(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Vegan Guide API');
        });
    });
});
