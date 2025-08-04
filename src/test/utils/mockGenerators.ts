/**
 * Centralized mock generators to eliminate duplication
 * This file consolidates all mock generation patterns used across tests
 */

import { faker } from '@faker-js/faker';

// Base interfaces for common patterns
interface BaseAddress {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
}

interface BaseLocation {
    type: 'Point';
    coordinates: [number, number];
}

interface BaseContactInfo {
    phone: string;
    email: string;
    website?: string;
}

interface BaseEntity {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
}

// Common data generators
export const generateAddress = (overrides: Partial<BaseAddress> = {}): BaseAddress => ({
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    country: faker.location.country(),
    zipCode: faker.location.zipCode(),
    ...overrides,
});

export const generateLocation = (overrides: Partial<BaseLocation> = {}): BaseLocation => ({
    type: 'Point',
    coordinates: [faker.location.longitude(), faker.location.latitude()],
    ...overrides,
});

export const generateContactInfo = (overrides: Partial<BaseContactInfo> = {}): BaseContactInfo => ({
    phone: faker.string.numeric(10),
    email: faker.internet.email(),
    website: faker.internet.url(),
    ...overrides,
});

export const generateBaseEntity = (overrides: Partial<BaseEntity> = {}): BaseEntity => ({
    _id: faker.database.mongodbObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// Business-type entities generator
export const generateBusinessEntity = (
    name: string,
    nameField: string,
    typeField: string,
    overrides: Record<string, unknown> = {}
) => ({
    ...generateBaseEntity(),
    [nameField]: name,
    description: faker.lorem.sentence(),
    [typeField]: faker.helpers.arrayElement(['vegan', 'vegetarian', 'organic']),
    ...generateContactInfo(),
    address: generateAddress(),
    location: generateLocation(),
    ...overrides,
});

// Medical entity generator
export const generateMedicalEntity = (name: string, nameField: string, overrides: Record<string, unknown> = {}) => ({
    ...generateBaseEntity(),
    [nameField]: name,
    ...generateContactInfo(),
    address: generateAddress(),
    location: generateLocation(),
    ...overrides,
});

// Content-based entity generator
export const generateContentEntity = (title: string, overrides: Record<string, unknown> = {}) => ({
    ...generateBaseEntity(),
    title,
    description: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
    ...overrides,
});

// User entity generator
export const generateUserEntity = (overrides: Record<string, unknown> = {}) => ({
    ...generateBaseEntity(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    role: 'user',
    isActive: true,
    isDeleted: false,
    photo: 'default.png',
    ...overrides,
});

// Review entity generator
export const generateReviewEntity = (overrides: Record<string, unknown> = {}) => ({
    ...generateBaseEntity(),
    rating: faker.number.int({ min: 1, max: 5 }),
    comment: faker.lorem.sentence(),
    user: faker.database.mongodbObjectId(),
    refId: faker.database.mongodbObjectId(),
    refModel: faker.helpers.arrayElement(['Restaurant', 'Doctor', 'Market', 'Sanctuary']),
    ...overrides,
});

// Recipe entity generator
export const generateRecipeEntity = (overrides: Record<string, unknown> = {}) => ({
    ...generateBaseEntity(),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    ingredients: Array.from({ length: 3 }, () => faker.lorem.word()),
    instructions: Array.from({ length: 3 }, () => faker.lorem.sentence()),
    cookingTime: faker.number.int({ min: 10, max: 120 }),
    servings: faker.number.int({ min: 1, max: 8 }),
    difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
    ...overrides,
});

// Test data generators
export const generateMaliciousData = () => ({
    script: '<script>alert("xss")</script>',
    javascript: 'javascript%3Aalert("xss")',
    img: '<img src="x" onerror="alert(1)">',
    sql: "'; DROP TABLE users; --",
    union: "1' UNION SELECT * FROM passwords",
    pathTraversal: '../../../etc/passwd',
    pathTraversalWin: '..\\..\\windows\\system32',
    command: 'ls -la; rm -rf /',
    pipe: 'test | cat /etc/passwd',
});

export const generateValidData = () => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    description: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
});

export default {
    generateAddress,
    generateLocation,
    generateContactInfo,
    generateBaseEntity,
    generateBusinessEntity,
    generateMedicalEntity,
    generateContentEntity,
    generateUserEntity,
    generateReviewEntity,
    generateRecipeEntity,
    generateMaliciousData,
    generateValidData,
};
