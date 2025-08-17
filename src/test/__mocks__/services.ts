import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
// Factory para crear mocks básicos de servicios
import testConfig from '../testConfig';

export const createBasicServiceMock = (serviceName: string) => ({
    getAll: vi.fn().mockResolvedValue([]),
    getAllCached: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Mock ${serviceName}` }),
    findByIdCached: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Mock ${serviceName}` }),
    create: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `New ${serviceName}` }),
    createCached: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `New ${serviceName}` }),
    updateById: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Updated ${serviceName}` }),
    updateByIdCached: vi
        .fn()
        .mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Updated ${serviceName}` }),
    deleteById: vi.fn().mockResolvedValue('Deleted successfully'),
});

// Mocks específicos por servicio con métodos personalizados
export const serviceMocks = {
    // User Service
    userService: {
        ...createBasicServiceMock('User'),
        registerUser: vi.fn().mockResolvedValue({
            _id: faker.database.mongodbObjectId(),
            email: 'faker.internet.email()',
            firstName: 'Test',
            lastName: 'User',
        }),
        loginUser: vi.fn().mockResolvedValue({
            token: testConfig.generateTestPassword(),
            user: { _id: faker.database.mongodbObjectId(), email: 'faker.internet.email()' },
        }),
        findAllUsers: vi.fn().mockResolvedValue([
            { _id: faker.database.mongodbObjectId(), email: 'faker.internet.email()' },
            { _id: faker.database.mongodbObjectId(), email: 'faker.internet.email()' },
        ]),
        findUserById: vi
            .fn()
            .mockResolvedValue({ _id: faker.database.mongodbObjectId(), email: 'faker.internet.email()' }),
        updateUserById: vi
            .fn()
            .mockResolvedValue({ _id: faker.database.mongodbObjectId(), email: 'faker.internet.email()' }),
        deleteUserById: vi.fn().mockResolvedValue('User deleted successfully'),
    },

    // Post Service
    postService: {
        ...createBasicServiceMock('Post'),
        likePost: vi.fn().mockResolvedValue([]),
        unlikePost: vi.fn().mockResolvedValue([]),
        addComment: vi.fn().mockResolvedValue([]),
    },

    // Business Service
    businessService: {
        ...createBasicServiceMock('Business'),
    },

    // Doctor Service
    doctorService: {
        ...createBasicServiceMock('Doctor'),
    },

    // Markets Service
    marketsService: {
        ...createBasicServiceMock('Market'),
    },

    // Restaurant Service
    restaurantService: {
        ...createBasicServiceMock('Restaurant'),
    },

    // Recipes Service
    recipesService: {
        ...createBasicServiceMock('Recipe'),
    },

    // Sanctuary Service
    sanctuaryService: {
        ...createBasicServiceMock('Sanctuary'),
    },

    // Profession Service
    professionService: {
        ...createBasicServiceMock('Profession'),
    },

    // Profession Profile Service
    professionProfileService: {
        ...createBasicServiceMock('ProfessionProfile'),
    },

    // Review Service
    reviewService: {
        addReview: vi.fn().mockResolvedValue({ _id: 'review-id', rating: 5, comment: 'Great!' }),
        getTopRatedReviews: vi.fn().mockResolvedValue([]),
        getAll: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue({ _id: 'review-id', rating: 5 }),
        create: vi.fn().mockResolvedValue({ _id: 'new-review-id', rating: 4 }),
        updateById: vi.fn().mockResolvedValue({ _id: 'updated-review-id', rating: 5 }),
        deleteById: vi.fn().mockResolvedValue('Review deleted successfully'),
    },

    // Geo Service
    geoService: {
        validateCoordinates: vi.fn().mockReturnValue(true),
        calculateDistance: vi.fn().mockReturnValue(10.5),
        findNearby: vi.fn().mockResolvedValue([]),
        geocodeAddress: vi.fn().mockResolvedValue({ lat: 40.7128, lng: -74.006 }),
    },

    // Token Service
    tokenService: {
        generateTokenPair: vi.fn().mockResolvedValue({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
        }),
        verifyAccessToken: vi.fn().mockResolvedValue({
            userId: faker.database.mongodbObjectId(),
            email: 'faker.internet.email()',
            role: 'user',
        }),
        verifyRefreshToken: vi.fn().mockResolvedValue({
            userId: faker.database.mongodbObjectId(),
            email: 'faker.internet.email()',
            role: 'user',
        }),
        refreshTokens: vi.fn().mockResolvedValue({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
        }),
        blacklistToken: vi.fn().mockResolvedValue(undefined),
        revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
        isTokenBlacklisted: vi.fn().mockResolvedValue(false),
        isUserTokensRevoked: vi.fn().mockResolvedValue(false),
    },

    // Cache Service
    cacheService: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(1),
        exists: vi.fn().mockResolvedValue(false),
        flush: vi.fn().mockResolvedValue(undefined),
        getStats: vi.fn().mockResolvedValue({
            hitRatio: 0.8,
            totalRequests: 1000,
            cacheSize: 50,
            memoryUsage: '10MB',
            uptime: 3600,
        }),
        isConnected: vi.fn().mockReturnValue(true),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
    },

    // Cache Warming Service
    cacheWarmingService: {
        startAutoWarming: vi.fn().mockResolvedValue(undefined),
        stopAutoWarming: vi.fn().mockReturnValue(undefined),
        warmUpCriticalData: vi.fn().mockResolvedValue({
            success: true,
            duration: 1000,
            itemsWarmed: 10,
            errors: [],
        }),
        warmSpecificData: vi.fn().mockResolvedValue(5),
        getWarmingStats: vi.fn().mockReturnValue({
            isWarming: false,
            lastWarmingTime: null,
            autoWarmingActive: false,
        }),
    },
};

// Mock para modelos
export const modelMocks = {
    User: {
        findById: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'mockUserId',
                username: 'mockUser',
                email: 'mock@example.com',
                isAdmin: true,
                isProfessional: true,
                isDeleted: false,
                isActive: true,
            }),
        }),
        findOne: vi.fn().mockResolvedValue({
            _id: 'mockUserId',
            email: 'mock@example.com',
        }),
        create: vi.fn().mockResolvedValue({
            _id: 'newUserId',
            email: 'new@example.com',
        }),
        find: vi.fn().mockResolvedValue([]),
        findByIdAndUpdate: vi.fn().mockResolvedValue({
            _id: 'updatedUserId',
            email: 'faker.internet.email()',
        }),
        findByIdAndDelete: vi.fn().mockResolvedValue({
            _id: 'deletedUserId',
        }),
    },
};

// Mock para librerías externas
export const externalMocks = {
    jsonwebtoken: {
        verify: vi.fn().mockReturnValue({ userId: 'someUserId' }),
        sign: vi.fn().mockReturnValue('mock-token'),
    },
    bcrypt: {
        hash: vi.fn().mockResolvedValue(testConfig.generateTestPassword()),
        compare: vi.fn().mockResolvedValue(true),
    },
};
