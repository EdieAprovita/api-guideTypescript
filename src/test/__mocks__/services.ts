import { faker } from '@faker-js/faker';
// Factory para crear mocks básicos de servicios
import testConfig from '../testConfig';

// Storage for token data to maintain consistency between generation and verification
const tokenDataStorage = new Map<string, { userId: string; email: string; role: string }>();

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
        generateTokenPair: jest.fn().mockImplementation(payload => {
            // Ensure userId is a valid ObjectId
            const validUserId = payload.userId.length === 24 ? payload.userId : faker.database.mongodbObjectId();
            const tokenId = Math.random().toString(36).substring(2, 11);
            const accessToken = `mock-access-token-${tokenId}`;
            const refreshToken = `mock-refresh-token-${tokenId}`;
            
            // Store token data for later verification
            tokenDataStorage.set(accessToken, {
                userId: validUserId,
                email: payload.email,
                role: payload.role || 'user'
            });
            tokenDataStorage.set(refreshToken, {
                userId: validUserId,
                email: payload.email,
                role: payload.role || 'user'
            });
            
            return Promise.resolve({
                accessToken,
                refreshToken,
            });
        }),
        generateTokens: jest.fn().mockImplementation((userId, email, role) => {
            // Ensure userId is a valid ObjectId
            const validUserId = userId.length === 24 ? userId : faker.database.mongodbObjectId();
            const tokenId = Math.random().toString(36).substring(2, 11);
            const accessToken = `mock-access-token-${tokenId}`;
            const refreshToken = `mock-refresh-token-${tokenId}`;
            
            // Store token data for later verification
            tokenDataStorage.set(accessToken, {
                userId: validUserId,
                email: email || 'test@example.com',
                role: role || 'user'
            });
            tokenDataStorage.set(refreshToken, {
                userId: validUserId,
                email: email || 'test@example.com',
                role: role || 'user'
            });
            
            return Promise.resolve({
                accessToken,
                refreshToken,
            });
        }),
        verifyAccessToken: jest.fn().mockImplementation(token => {
            // Check if token data is stored
            const storedData = tokenDataStorage.get(token);
            if (storedData) {
                return Promise.resolve(storedData);
            }
            
            // Fallback for old format tokens or unknown tokens
            const parts = token.replace('mock-access-token-', '').split('-');
            let userId = parts[0];
            const role = parts[1] || 'user';
            
            // Ensure userId is a valid ObjectId
            if (userId.length !== 24) {
                userId = faker.database.mongodbObjectId();
            }
            
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role,
            });
        }),
        verifyRefreshToken: jest.fn().mockImplementation(token => {
            // Check if token data is stored
            const storedData = tokenDataStorage.get(token);
            if (storedData) {
                return Promise.resolve(storedData);
            }
            
            // If token is not found in storage and follows our new format, it should be invalid
            if (token.startsWith('mock-refresh-token-') && token.includes('-new')) {
                return Promise.reject(new Error('Invalid or expired refresh token: Token not found or invalid'));
            }
            
            // Fallback for old format tokens (backwards compatibility)
            const parts = token.replace('mock-refresh-token-', '').split('-');
            let userId = parts[0];
            const role = parts[1] || 'user';
            
            // For new format tokens without stored data, reject
            if (parts.length === 1 && userId.length === 9) { // New format without stored data
                return Promise.reject(new Error('Invalid or expired refresh token: Token not found or invalid'));
            }
            
            // Ensure userId is a valid ObjectId for old format
            if (userId.length !== 24) {
                userId = faker.database.mongodbObjectId();
            }
            
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role,
            });
        }),
        refreshTokens: jest.fn().mockImplementation(refreshToken => {
            // Get original token data
            const originalData = tokenDataStorage.get(refreshToken);
            if (originalData) {
                // Generate new tokens with same data
                const tokenId = Math.random().toString(36).substring(2, 11);
                const newAccessToken = `mock-access-token-${tokenId}-new`;
                const newRefreshToken = `mock-refresh-token-${tokenId}-new`;
                
                // Store new token data
                tokenDataStorage.set(newAccessToken, originalData);
                tokenDataStorage.set(newRefreshToken, originalData);
                
                // Remove old refresh token
                tokenDataStorage.delete(refreshToken);
                
                return Promise.resolve({
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                });
            }
            
            // Fallback for old format tokens
            const parts = refreshToken.replace('mock-refresh-token-', '').split('-');
            let userId = parts[0];
            const role = parts[1] || 'user';
            
            // Ensure userId is a valid ObjectId
            if (userId.length !== 24) {
                userId = faker.database.mongodbObjectId();
            }
            
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}-${role}-new`,
                refreshToken: `mock-refresh-token-${userId}-${role}-new`,
            });
        }),
        blacklistToken: jest.fn().mockResolvedValue(undefined),
        revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
        isTokenBlacklisted: jest.fn().mockResolvedValue(false),
        isUserTokensRevoked: jest.fn().mockResolvedValue(false),
        clearAllForTesting: jest.fn().mockImplementation(() => {
            tokenDataStorage.clear();
            return Promise.resolve(undefined);
        }),
        disconnect: jest.fn().mockResolvedValue(undefined),
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
            _id: faker.database.mongodbObjectId(),
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
        verify: jest.fn().mockImplementation((token) => {
            // Try to decode the mock token format to extract the actual user data
            const tokenStr = token as string;
            try {
                if (tokenStr.includes('mock-signature')) {
                    const payloadPart = tokenStr.split('.')[1];
                    // Mock payload extraction since it's base64-like but not real base64
                    const match = payloadPart.match(/"userId":"([^"]+)"/); 
                    const emailMatch = payloadPart.match(/"email":"([^"]+)"/); 
                    const roleMatch = payloadPart.match(/"role":"([^"]+)"/); 
                    
                    return {
                        userId: match ? match[1] : faker.database.mongodbObjectId(),
                        email: emailMatch ? emailMatch[1] : 'test@email.com',
                        role: roleMatch ? roleMatch[1] : 'user',
                        exp: Math.floor(Date.now() / 1000) + 3600
                    };
                }
                // Handle mock-access-token format for backwards compatibility
                if (token.includes('mock-access-token-')) {
                    const parts = token.replace('mock-access-token-', '').split('-');
                    const userId = parts[0];
                    const role = parts[1] || 'user';
                    return {
                        userId,
                        email: 'test@email.com',
                        role,
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    };
                }
            } catch (e) {
                // Fallback
            }
            
            // Fallback for other token formats
            return {
                userId: faker.database.mongodbObjectId(),
                email: 'test@email.com',
                role: 'user',
                exp: Math.floor(Date.now() / 1000) + 3600,
            };
        }),
        sign: jest.fn().mockImplementation((payload) => {
            // Preserve the actual userId from the payload or generate a valid one if missing
            const actualUserId = payload && payload.userId ? payload.userId : faker.database.mongodbObjectId();
            const actualEmail = payload && payload.email ? payload.email : 'test@email.com';
            const actualRole = payload && payload.role ? payload.role : 'user';
            return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI${actualUserId}\",\"email\":\"${actualEmail}\",\"role\":\"${actualRole}\"}.mock-signature`;
        }),
        decode: jest.fn().mockImplementation((token: string) => {
            // Try to decode the mock token format to extract the actual user data
            try {
                if (token.includes('mock-signature')) {
                    const payloadPart = token.split('.')[1];
                    // Mock payload extraction since it's base64-like but not real base64
                    const match = payloadPart.match(/"userId":"([^"]+)"/); 
                    const emailMatch = payloadPart.match(/"email":"([^"]+)"/); 
                    const roleMatch = payloadPart.match(/"role":"([^"]+)"/); 
                    
                    return {
                        userId: match ? match[1] : faker.database.mongodbObjectId(),
                        email: emailMatch ? emailMatch[1] : 'test@email.com',
                        role: roleMatch ? roleMatch[1] : 'user',
                        exp: Math.floor(Date.now() / 1000) + 3600
                    };
                }
            } catch (e) {
                // Fallback
            }
            
            // Fallback for other token formats
            return {
                userId: faker.database.mongodbObjectId(),
                email: 'test@email.com',
                role: 'user',
                exp: Math.floor(Date.now() / 1000) + 3600,
            };
        }),
    },
    bcrypt: {
        hash: jest.fn().mockResolvedValue(testConfig.generateTestPassword()),
        compare: jest.fn().mockResolvedValue(true),
    },
};
