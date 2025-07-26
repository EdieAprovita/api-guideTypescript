import { faker } from '@faker-js/faker';

// ============================================================================
// TEST UTILITIES
// ============================================================================

export const generateValidObjectId = () => faker.database.mongodbObjectId();

export const createTestUser = (overrides = {}) => ({
    _id: generateValidObjectId(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: 'Test123!@#',
    role: 'user',
    isActive: true,
    isDeleted: false,
    photo: 'https://res.cloudinary.com/dzqbzqgjm/image/upload/v1599098981/default-user_qjqjqz.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createAdminUser = (overrides = {}) => createTestUser({ role: 'admin', ...overrides });

export const createProfessionalUser = (overrides = {}) => createTestUser({ role: 'professional', ...overrides });

// ============================================================================
// TEST CONFIGURATION TYPES
// ============================================================================

export type TestType = 'unit' | 'integration' | 'e2e';

export interface TestConfig {
    type: TestType;
    useRealDatabase?: boolean;
    useMocks?: boolean;
    setupHooks?: boolean;
}
