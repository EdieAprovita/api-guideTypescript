import { faker } from '@faker-js/faker';
// Factory para crear mocks básicos de servicios
import testConfig from '../testConfig';

export const createBasicServiceMock = (serviceName: string) => ({
    getAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Mock ${serviceName}` }),
    create: jest.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `New ${serviceName}` }),
    updateById: jest.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Updated ${serviceName}` }),
    deleteById: jest.fn().mockResolvedValue('Deleted successfully'),
});

// Mocks específicos por servicio con métodos personalizados
export const serviceMocks = {
    // User Service
    userService: {
        ...createBasicServiceMock('User'),
        registerUser: jest.fn().mockResolvedValue({
            _id: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            firstName: 'Test',
            lastName: 'User',
        }),
        loginUser: jest.fn().mockResolvedValue({
            token: testConfig.generateTestPassword(),
            user: { _id: faker.database.mongodbObjectId(), email: faker.internet.email() },
        }),
        findAllUsers: jest.fn().mockResolvedValue([
            { _id: faker.database.mongodbObjectId(), email: faker.internet.email() },
            { _id: faker.database.mongodbObjectId(), email: faker.internet.email() },
        ]),
        findUserById: jest
            .fn()
            .mockResolvedValue({ _id: faker.database.mongodbObjectId(), email: faker.internet.email() }),
        updateUserById: jest
            .fn()
            .mockResolvedValue({ _id: faker.database.mongodbObjectId(), email: faker.internet.email() }),
        deleteUserById: jest.fn().mockResolvedValue('User deleted successfully'),
    },

    // Post Service
    postService: {
        ...createBasicServiceMock('Post'),
        likePost: jest.fn().mockResolvedValue([]),
        unlikePost: jest.fn().mockResolvedValue([]),
        addComment: jest.fn().mockResolvedValue([]),
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
        addReview: jest.fn().mockResolvedValue({ _id: 'review-id', rating: 5, comment: 'Great!' }),
        getTopRatedReviews: jest.fn().mockResolvedValue([]),
        getAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue({ _id: 'review-id', rating: 5 }),
        create: jest.fn().mockResolvedValue({ _id: 'new-review-id', rating: 4 }),
        updateById: jest.fn().mockResolvedValue({ _id: 'updated-review-id', rating: 5 }),
        deleteById: jest.fn().mockResolvedValue('Review deleted successfully'),
    },

    // Geo Service
    geoService: {
        validateCoordinates: jest.fn().mockReturnValue(true),
        calculateDistance: jest.fn().mockReturnValue(10.5),
        findNearby: jest.fn().mockResolvedValue([]),
        geocodeAddress: jest.fn().mockResolvedValue({ lat: 40.7128, lng: -74.006 }),
    },

    // Token Service
    tokenService: {
        generateTokenPair: jest.fn().mockResolvedValue({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
        }),
        verifyAccessToken: jest.fn().mockResolvedValue({
            userId: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            role: 'user',
        }),
        verifyRefreshToken: jest.fn().mockResolvedValue({
            userId: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            role: 'user',
        }),
        refreshTokens: jest.fn().mockResolvedValue({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
        }),
        blacklistToken: jest.fn().mockResolvedValue(undefined),
        revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
        isTokenBlacklisted: jest.fn().mockResolvedValue(false),
        isUserTokensRevoked: jest.fn().mockResolvedValue(false),
    },
};

// Mock para modelos
export const modelMocks = {
    User: {
        findById: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: 'mockUserId',
                username: 'mockUser',
                email: 'mock@example.com',
                isAdmin: true,
                isProfessional: true,
                isDeleted: false,
                isActive: true,
            }),
        }),
        findOne: jest.fn().mockResolvedValue({
            _id: 'mockUserId',
            email: 'mock@example.com',
        }),
        create: jest.fn().mockResolvedValue({
            _id: 'newUserId',
            email: 'new@example.com',
        }),
        find: jest.fn().mockResolvedValue([]),
        findByIdAndUpdate: jest.fn().mockResolvedValue({
            _id: 'updatedUserId',
            email: faker.internet.email(),
        }),
        findByIdAndDelete: jest.fn().mockResolvedValue({
            _id: 'deletedUserId',
        }),
    },
};

// Mock para librerías externas
export const externalMocks = {
    jsonwebtoken: {
        verify: jest.fn().mockReturnValue({ userId: 'someUserId' }),
        sign: jest.fn().mockReturnValue('mock-token'),
    },
    bcrypt: {
        hash: jest.fn().mockResolvedValue(testConfig.generateTestPassword()),
        compare: jest.fn().mockResolvedValue(true),
    },
};
