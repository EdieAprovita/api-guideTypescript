/**
 * Unified Integration Test Setup Utility
 * 
 * This module provides standardized setup and teardown functionality
 * for integration tests, eliminating code duplication across test files.
 */

import mongoose from 'mongoose';
import { createTestUser, createAdminUser, createProfessionalUser, generateAuthTokens } from '../integration/helpers/testFixtures';
import { User } from '../../models/User';
import { Restaurant } from '../../models/Restaurant';
import { Business } from '../../models/Business';
import { Review } from '../../models/Review';

interface TestContext {
    testUser?: any;
    adminUser?: any;
    professionalUser?: any;
    testUserId?: string;
    adminUserId?: string;
    professionalUserId?: string;
    authToken?: string;
    adminToken?: string;
    professionalToken?: string;
}

interface TestSetupOptions {
    createUsers?: boolean;
    createAdmin?: boolean;
    createProfessional?: boolean;
    generateTokens?: boolean;
    cleanupModels?: string[];
}

class IntegrationTestSetup {
    private static context: TestContext = {};

    /**
     * Standard setup for integration tests
     */
    static async setupTestSuite(options: TestSetupOptions = {}): Promise<TestContext> {
        const {
            createUsers = true,
            createAdmin = false,
            createProfessional = false,
            generateTokens = true,
            cleanupModels = []
        } = options;

        await this.ensureDatabaseConnection();
        await this.cleanupCollections(cleanupModels);

        if (createUsers) {
            this.context.testUser = await createTestUser({
                email: 'testuser@integration.test',
                username: 'integration_test_user'
            });
            this.context.testUserId = this.context.testUser._id.toString();

            if (generateTokens) {
                const tokens = await generateAuthTokens(
                    this.context.testUserId,
                    this.context.testUser.email,
                    this.context.testUser.role
                );
                this.context.authToken = tokens.accessToken;
            }
        }

        if (createAdmin) {
            this.context.adminUser = await createAdminUser({
                email: 'admin@integration.test',
                username: 'integration_test_admin'
            });
            this.context.adminUserId = this.context.adminUser._id.toString();

            if (generateTokens) {
                const adminTokens = await generateAuthTokens(
                    this.context.adminUserId,
                    this.context.adminUser.email,
                    this.context.adminUser.role
                );
                this.context.adminToken = adminTokens.accessToken;
            }
        }

        if (createProfessional) {
            this.context.professionalUser = await createProfessionalUser({
                email: 'professional@integration.test',
                username: 'integration_test_professional'
            });
            this.context.professionalUserId = this.context.professionalUser._id.toString();

            if (generateTokens) {
                const professionalTokens = await generateAuthTokens(
                    this.context.professionalUserId,
                    this.context.professionalUser.email,
                    this.context.professionalUser.role
                );
                this.context.professionalToken = professionalTokens.accessToken;
            }
        }

        return this.context;
    }

    /**
     * Standard teardown for integration tests
     */
    static async teardownTestSuite(): Promise<void> {
        await this.cleanupTestData();
        this.context = {};
    }

    /**
     * Setup for individual test cases
     */
    static async setupTestCase(cleanupModels: string[] = []): Promise<void> {
        await this.cleanupCollections(cleanupModels);
    }

    /**
     * Get current test context
     */
    static getContext(): TestContext {
        return this.context;
    }

    /**
     * Ensure database connection is established
     */
    private static async ensureDatabaseConnection(): Promise<void> {
        if (!mongoose.connection.readyState) {
            // Connection should already be established by test config
            // This is just a safety check
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Clean up specific collections
     */
    private static async cleanupCollections(models: string[]): Promise<void> {
        const modelMap: Record<string, any> = {
            'users': User,
            'restaurants': Restaurant,
            'businesses': Business,
            'reviews': Review
        };

        for (const modelName of models) {
            const Model = modelMap[modelName.toLowerCase()];
            if (Model) {
                await Model.deleteMany({});
            }
        }
    }

    /**
     * Clean up all test data
     */
    private static async cleanupTestData(): Promise<void> {
        try {
            // Clean up test users and related data
            await User.deleteMany({ 
                email: { $regex: /@(integration\.test|example\.(com|net|org))$/ } 
            });
            await Restaurant.deleteMany({ 
                restaurantName: { $regex: /^(Test |integration_test_)/ } 
            });
            await Business.deleteMany({ 
                namePlace: { $regex: /^(Test |integration_test_)/ } 
            });
            await Review.deleteMany({
                $or: [
                    { title: { $regex: /^Test / } },
                    { content: { $regex: /integration.*test/i } }
                ]
            });
        } catch (error) {
            console.warn('Warning: Error during test data cleanup:', error);
        }
    }

    /**
     * Create authenticated request headers
     */
    static createAuthHeaders(token?: string): Record<string, string> {
        const actualToken = token || this.context.authToken;
        if (!actualToken) {
            throw new Error('No authentication token available. Did you call setupTestSuite with generateTokens: true?');
        }
        return {
            'Authorization': `Bearer ${actualToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Create admin authenticated request headers
     */
    static createAdminAuthHeaders(): Record<string, string> {
        if (!this.context.adminToken) {
            throw new Error('No admin token available. Did you call setupTestSuite with createAdmin: true?');
        }
        return this.createAuthHeaders(this.context.adminToken);
    }

    /**
     * Create professional authenticated request headers
     */
    static createProfessionalAuthHeaders(): Record<string, string> {
        if (!this.context.professionalToken) {
            throw new Error('No professional token available. Did you call setupTestSuite with createProfessional: true?');
        }
        return this.createAuthHeaders(this.context.professionalToken);
    }

    /**
     * Quick setup for most common test scenarios
     */
    static async setupBasicIntegrationTest(): Promise<TestContext> {
        return await this.setupTestSuite({
            createUsers: true,
            createAdmin: false,
            createProfessional: false,
            generateTokens: true,
            cleanupModels: []
        });
    }

    /**
     * Setup for admin-required tests
     */
    static async setupAdminIntegrationTest(): Promise<TestContext> {
        return await this.setupTestSuite({
            createUsers: true,
            createAdmin: true,
            createProfessional: false,
            generateTokens: true,
            cleanupModels: []
        });
    }

    /**
     * Setup for professional user tests
     */
    static async setupProfessionalIntegrationTest(): Promise<TestContext> {
        return await this.setupTestSuite({
            createUsers: true,
            createAdmin: false,
            createProfessional: true,
            generateTokens: true,
            cleanupModels: []
        });
    }

    /**
     * Setup for comprehensive role-based tests
     */
    static async setupComprehensiveIntegrationTest(): Promise<TestContext> {
        return await this.setupTestSuite({
            createUsers: true,
            createAdmin: true,
            createProfessional: true,
            generateTokens: true,
            cleanupModels: []
        });
    }
}

/**
 * Convenience functions for Jest beforeAll/afterAll hooks
 */

export const setupIntegrationTest = (options?: TestSetupOptions) => {
    return () => IntegrationTestSetup.setupTestSuite(options);
};

export const teardownIntegrationTest = () => {
    return () => IntegrationTestSetup.teardownTestSuite();
};

export const setupBasicTest = () => {
    return () => IntegrationTestSetup.setupBasicIntegrationTest();
};

export const setupAdminTest = () => {
    return () => IntegrationTestSetup.setupAdminIntegrationTest();
};

export const setupProfessionalTest = () => {
    return () => IntegrationTestSetup.setupProfessionalIntegrationTest();
};

export const setupComprehensiveTest = () => {
    return () => IntegrationTestSetup.setupComprehensiveIntegrationTest();
};

export const cleanupTestCase = (models: string[] = []) => {
    return () => IntegrationTestSetup.setupTestCase(models);
};

export const getTestContext = () => IntegrationTestSetup.getContext();
export const createAuthHeaders = (token?: string) => IntegrationTestSetup.createAuthHeaders(token);
export const createAdminAuthHeaders = () => IntegrationTestSetup.createAdminAuthHeaders();
export const createProfessionalAuthHeaders = () => IntegrationTestSetup.createProfessionalAuthHeaders();

export default IntegrationTestSetup;