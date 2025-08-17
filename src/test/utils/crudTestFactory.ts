import { vi, type MockedFunction } from 'vitest';
/**
 * CRUD Test Factory
 *
 * This module provides standardized CRUD operation test patterns
 * to eliminate repetitive test code across integration tests.
 */

import request from 'supertest';
import { Application } from 'express';

interface CrudTestConfig {
    app: Application;
    baseUrl: string;
    resourceName: string;
    authHeaders: Record<string, string>;
    validData: any;
    updateData: any;
    invalidData?: any;
    unauthorizedTests?: boolean;
    forbiddenTests?: boolean;
    validationTests?: boolean;
}

interface TestAssertions {
    expectSuccessfulCreate?: (response: any) => void;
    expectSuccessfulGet?: (response: any) => void;
    expectSuccessfulUpdate?: (response: any) => void;
    expectSuccessfulDelete?: (response: any) => void;
    expectValidationError?: (response: any) => void;
}

class CrudTestFactory {
    /**
     * Generate complete CRUD test suite for a resource
     */
    static generateCrudTests(config: CrudTestConfig, assertions?: TestAssertions) {
        const {
            app,
            baseUrl,
            resourceName,
            authHeaders,
            validData,
            updateData,
            invalidData,
            unauthorizedTests = true,
            forbiddenTests = false,
            validationTests = true,
        } = config;

        describe(`CRUD operations for ${resourceName}`, () => {
            // CREATE tests
            describe(`POST ${baseUrl}`, () => {
                it(`should create a new ${resourceName} with valid data`, async () => {
                    const response = await request(app).post(baseUrl).set(authHeaders).send(validData).expect(201);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data).toHaveProperty('_id');

                    if (assertions?.expectSuccessfulCreate) {
                        assertions.expectSuccessfulCreate(response);
                    }
                });

                if (unauthorizedTests) {
                    it('should return 401 without authentication', async () => {
                        await request(app).post(baseUrl).send(validData).expect(401);
                    });
                }

                if (validationTests && invalidData) {
                    it('should return 400 with invalid data', async () => {
                        const response = await request(app)
                            .post(baseUrl)
                            .set(authHeaders)
                            .send(invalidData)
                            .expect(400);

                        expect(response.body.success).toBe(false);

                        if (assertions?.expectValidationError) {
                            assertions.expectValidationError(response);
                        }
                    });
                }
            });

            // READ tests
            describe(`GET ${baseUrl}`, () => {
                it(`should get all ${resourceName}s`, async () => {
                    const response = await request(app).get(baseUrl).set(authHeaders).expect(200);

                    expect(response.body.success).toBe(true);
                    expect(Array.isArray(response.body.data)).toBe(true);

                    if (assertions?.expectSuccessfulGet) {
                        assertions.expectSuccessfulGet(response);
                    }
                });

                if (unauthorizedTests) {
                    it('should return 401 without authentication', async () => {
                        await request(app).get(baseUrl).expect(401);
                    });
                }
            });

            describe(`GET ${baseUrl}/:id`, () => {
                it(`should get a specific ${resourceName} by ID`, async () => {
                    const resourceId = await CrudTestFactory.createTestResource(app, baseUrl, authHeaders, validData);

                    const response = await request(app).get(`${baseUrl}/${resourceId}`).set(authHeaders).expect(200);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data._id).toBe(resourceId);

                    if (assertions?.expectSuccessfulGet) {
                        assertions.expectSuccessfulGet(response);
                    }
                });

                it('should return 404 for non-existent ID', async () => {
                    const nonExistentId = '507f1f77bcf86cd799439011';
                    await request(app).get(`${baseUrl}/${nonExistentId}`).set(authHeaders).expect(404);
                });

                it('should return 400 for invalid ID format', async () => {
                    await request(app).get(`${baseUrl}/invalid-id`).set(authHeaders).expect(400);
                });

                if (unauthorizedTests) {
                    it('should return 401 without authentication', async () => {
                        const resourceId = await CrudTestFactory.createTestResource(
                            app,
                            baseUrl,
                            authHeaders,
                            validData
                        );

                        await request(app).get(`${baseUrl}/${resourceId}`).expect(401);
                    });
                }
            });

            // UPDATE tests
            describe(`PUT ${baseUrl}/:id`, () => {
                it(`should update a ${resourceName} with valid data`, async () => {
                    const resourceId = await CrudTestFactory.createTestResource(app, baseUrl, authHeaders, validData);

                    const response = await request(app)
                        .put(`${baseUrl}/${resourceId}`)
                        .set(authHeaders)
                        .send(updateData)
                        .expect(200);

                    expect(response.body.success).toBe(true);
                    expect(response.body.data._id).toBe(resourceId);

                    if (assertions?.expectSuccessfulUpdate) {
                        assertions.expectSuccessfulUpdate(response);
                    }
                });

                it('should return 404 for non-existent ID', async () => {
                    const nonExistentId = '507f1f77bcf86cd799439011';
                    await request(app).put(`${baseUrl}/${nonExistentId}`).set(authHeaders).send(updateData).expect(404);
                });

                it('should return 400 for invalid ID format', async () => {
                    await request(app).put(`${baseUrl}/invalid-id`).set(authHeaders).send(updateData).expect(400);
                });

                if (unauthorizedTests) {
                    it('should return 401 without authentication', async () => {
                        const resourceId = await CrudTestFactory.createTestResource(
                            app,
                            baseUrl,
                            authHeaders,
                            validData
                        );

                        await request(app).put(`${baseUrl}/${resourceId}`).send(updateData).expect(401);
                    });
                }

                if (validationTests && invalidData) {
                    it('should return 400 with invalid update data', async () => {
                        const resourceId = await CrudTestFactory.createTestResource(
                            app,
                            baseUrl,
                            authHeaders,
                            validData
                        );

                        const response = await request(app)
                            .put(`${baseUrl}/${resourceId}`)
                            .set(authHeaders)
                            .send(invalidData)
                            .expect(400);

                        expect(response.body.success).toBe(false);

                        if (assertions?.expectValidationError) {
                            assertions.expectValidationError(response);
                        }
                    });
                }
            });

            // DELETE tests
            describe(`DELETE ${baseUrl}/:id`, () => {
                it(`should delete a ${resourceName}`, async () => {
                    const resourceId = await CrudTestFactory.createTestResource(app, baseUrl, authHeaders, validData);

                    const response = await request(app).delete(`${baseUrl}/${resourceId}`).set(authHeaders).expect(200);

                    expect(response.body.success).toBe(true);

                    if (assertions?.expectSuccessfulDelete) {
                        assertions.expectSuccessfulDelete(response);
                    }

                    // Verify the resource is actually deleted
                    await request(app).get(`${baseUrl}/${resourceId}`).set(authHeaders).expect(404);
                });

                it('should return 404 for non-existent ID', async () => {
                    const nonExistentId = '507f1f77bcf86cd799439011';
                    await request(app).delete(`${baseUrl}/${nonExistentId}`).set(authHeaders).expect(404);
                });

                it('should return 400 for invalid ID format', async () => {
                    await request(app).delete(`${baseUrl}/invalid-id`).set(authHeaders).expect(400);
                });

                if (unauthorizedTests) {
                    it('should return 401 without authentication', async () => {
                        const resourceId = await CrudTestFactory.createTestResource(
                            app,
                            baseUrl,
                            authHeaders,
                            validData
                        );

                        await request(app).delete(`${baseUrl}/${resourceId}`).expect(401);
                    });
                }
            });
        });
    }

    /**
     * Generate read-only resource tests (for resources that don't support full CRUD)
     */
    static generateReadOnlyTests(
        config: Omit<CrudTestConfig, 'updateData' | 'invalidData'>,
        assertions?: Pick<TestAssertions, 'expectSuccessfulGet'>
    ) {
        const { app, baseUrl, resourceName, authHeaders, unauthorizedTests = true } = config;

        describe(`Read operations for ${resourceName}`, () => {
            describe(`GET ${baseUrl}`, () => {
                it(`should get all ${resourceName}s`, async () => {
                    const response = await request(app).get(baseUrl).set(authHeaders).expect(200);

                    expect(response.body.success).toBe(true);
                    expect(Array.isArray(response.body.data)).toBe(true);

                    if (assertions?.expectSuccessfulGet) {
                        assertions.expectSuccessfulGet(response);
                    }
                });

                if (unauthorizedTests) {
                    it('should return 401 without authentication', async () => {
                        await request(app).get(baseUrl).expect(401);
                    });
                }
            });
        });
    }

    /**
     * Generate pagination tests
     */
    static generatePaginationTests(config: Pick<CrudTestConfig, 'app' | 'baseUrl' | 'authHeaders'>) {
        const { app, baseUrl, authHeaders } = config;

        describe('Pagination', () => {
            it('should support page and limit parameters', async () => {
                const response = await request(app).get(`${baseUrl}?page=1&limit=5`).set(authHeaders).expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('docs');
                expect(response.body.data).toHaveProperty('totalDocs');
                expect(response.body.data).toHaveProperty('limit');
                expect(response.body.data).toHaveProperty('page');
            });

            it('should handle invalid pagination parameters', async () => {
                await request(app).get(`${baseUrl}?page=-1&limit=0`).set(authHeaders).expect(400);
            });
        });
    }

    /**
     * Generate search and filter tests
     */
    static generateSearchTests(
        config: Pick<CrudTestConfig, 'app' | 'baseUrl' | 'authHeaders'>,
        searchParams: Record<string, any>
    ) {
        const { app, baseUrl, authHeaders } = config;

        describe('Search and Filtering', () => {
            Object.entries(searchParams).forEach(([paramName, paramValue]) => {
                it(`should support filtering by ${paramName}`, async () => {
                    const response = await request(app)
                        .get(`${baseUrl}?${paramName}=${encodeURIComponent(paramValue)}`)
                        .set(authHeaders)
                        .expect(200);

                    expect(response.body.success).toBe(true);
                    expect(Array.isArray(response.body.data)).toBe(true);
                });
            });
        });
    }

    private static async createTestResource(
        app: Application,
        baseUrl: string,
        authHeaders: Record<string, string>,
        data: any
    ): Promise<string> {
        const response = await request(app).post(baseUrl).set(authHeaders).send(data);
        return response.body.data._id;
    }
}

/**
 * Convenience functions for common test patterns
 */

export const generateBasicCrudTests = (config: CrudTestConfig, assertions?: TestAssertions) => {
    return () => CrudTestFactory.generateCrudTests(config, assertions);
};

export const generateReadOnlyTests = (
    config: Omit<CrudTestConfig, 'updateData' | 'invalidData'>,
    assertions?: Pick<TestAssertions, 'expectSuccessfulGet'>
) => {
    return () => CrudTestFactory.generateReadOnlyTests(config, assertions);
};

export const generatePaginationTests = (config: Pick<CrudTestConfig, 'app' | 'baseUrl' | 'authHeaders'>) => {
    return () => CrudTestFactory.generatePaginationTests(config);
};

export const generateSearchTests = (
    config: Pick<CrudTestConfig, 'app' | 'baseUrl' | 'authHeaders'>,
    searchParams: Record<string, any>
) => {
    return () => CrudTestFactory.generateSearchTests(config, searchParams);
};

export default CrudTestFactory;
