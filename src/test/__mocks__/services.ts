import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import testConfig from '../testConfig';

// Tipos estrictos para usuarios y entidades
interface MockUser {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    username?: string;
    role?: string;
    isAdmin?: boolean;
    isActive?: boolean;
    isDeleted?: boolean;
    photo?: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface LoginResult {
    token: string;
    refreshToken: string;
    user: MockUser;
}

interface RegisterResult extends MockUser {
    token: string;
    refreshToken: string;
}

// Almacenamiento en memoria para usuarios simulados
const mockUsers: MockUser[] = [];

// UserService mock - Mejorado para tests unitarios
const userService = {
    registerUser: vi.fn().mockImplementation((userData: Partial<MockUser>, res?: unknown): Promise<RegisterResult> => {
        const user: MockUser = {
            _id: faker.database.mongodbObjectId(),
            email: userData.email || faker.internet.email(),
            firstName: userData.firstName || 'Test',
            lastName: userData.lastName || 'User',
            password: userData.password || testConfig.generateTestPassword(),
            username: userData.username || faker.internet.userName(),
            role: userData.role || 'user',
            isAdmin: userData.isAdmin ?? false,
            isActive: userData.isActive ?? true,
            isDeleted: userData.isDeleted ?? false,
            photo: userData.photo || 'default.png',
        };
        mockUsers.push(user);

        const token = `mock-access-token-${user._id}`;
        const refreshToken = `mock-refresh-token-${user._id}`;

        return Promise.resolve({
            ...user,
            token,
            refreshToken,
        });
    }),

    loginUser: vi.fn().mockImplementation((email: string, password: string, res?: unknown): Promise<LoginResult> => {
        const user = mockUsers.find(u => u.email === email && u.password === password);
        if (!user) {
            return Promise.reject(new Error('Invalid credentials'));
        }

        const token = `mock-access-token-${user._id}`;
        const refreshToken = `mock-refresh-token-${user._id}`;

        return Promise.resolve({
            token,
            refreshToken,
            user,
        });
    }),

    findAllUsers: vi.fn().mockResolvedValue(mockUsers),

    findUserById: vi.fn().mockImplementation((id: string): Promise<MockUser | null> => {
        const user = mockUsers.find(u => u._id === id);
        return Promise.resolve(user || null);
    }),

    updateUserById: vi.fn().mockImplementation((id: string, update: Partial<MockUser>): Promise<MockUser | null> => {
        const user = mockUsers.find(u => u._id === id);
        if (user) {
            Object.assign(user, update);
            return Promise.resolve(user);
        }
        return Promise.resolve(null);
    }),

    deleteUserById: vi.fn().mockImplementation((id: string): Promise<string> => {
        const idx = mockUsers.findIndex(u => u._id === id);
        if (idx !== -1) {
            mockUsers.splice(idx, 1);
        }
        return Promise.resolve('User deleted successfully');
    }),

    forgotPassword: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    logoutUser: vi.fn().mockResolvedValue(undefined),

    getUsers: vi.fn().mockResolvedValue(mockUsers),

    getUserById: vi.fn().mockImplementation((id: string): Promise<MockUser | null> => {
        const user = mockUsers.find(u => u._id === id);
        return Promise.resolve(user || null);
    }),

    updateUserProfile: vi.fn().mockImplementation((id: string, update: Partial<MockUser>): Promise<MockUser | null> => {
        const user = mockUsers.find(u => u._id === id);
        if (user) {
            Object.assign(user, update);
            return Promise.resolve(user);
        }
        return Promise.resolve(null);
    }),
};

// TokenService mock - Mejorado para tests unitarios
const tokenService = {
    generateTokens: vi.fn().mockImplementation((userId: string, email?: string, role?: string): Promise<TokenPair> => {
        return Promise.resolve({
            accessToken: `mock-access-token-${userId}-${role || 'user'}`,
            refreshToken: `mock-refresh-token-${userId}-${role || 'user'}`,
        });
    }),

    generateTokenPair: vi
        .fn()
        .mockImplementation((payload: { userId: string; email: string; role?: string }): Promise<TokenPair> => {
            return Promise.resolve({
                accessToken: `mock-access-token-${payload.userId}-${payload.role || 'user'}`,
                refreshToken: `mock-refresh-token-${payload.userId}-${payload.role || 'user'}`,
            });
        }),

    verifyAccessToken: vi
        .fn()
        .mockImplementation((token: string): Promise<{ userId: string; email: string; role: string }> => {
            const parts = token.replace('mock-access-token-', '').split('-');
            const userId = parts[0];
            const role = parts[1] || 'user';
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role,
            });
        }),

    verifyRefreshToken: vi
        .fn()
        .mockImplementation((token: string): Promise<{ userId: string; email: string; role: string; type: string }> => {
            const parts = token.replace('mock-refresh-token-', '').split('-');
            const userId = parts[0];
            const role = parts[1] || 'user';
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role,
                type: 'refresh',
            });
        }),

    refreshTokens: vi.fn().mockImplementation((refreshToken: string): Promise<TokenPair> => {
        const userId = refreshToken.replace('mock-refresh-token-', '').split('-')[0];
        return Promise.resolve({
            accessToken: `mock-access-token-${userId}-new`,
            refreshToken: `mock-refresh-token-${userId}-new`,
        });
    }),

    blacklistToken: vi.fn().mockResolvedValue(undefined),
    revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
    isUserTokensRevoked: vi.fn().mockResolvedValue(false),
    clearAllForTesting: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
};

// Factory para mocks básicos de servicios CRUD
function createCrudMock<T extends { _id: string }>(entityName: string, entityFactory: () => T) {
    const storage: T[] = [];
    return {
        getAll: vi.fn().mockResolvedValue(storage),
        getAllCached: vi.fn().mockResolvedValue(storage),
        findById: vi.fn().mockImplementation((id: string): Promise<T | null> => {
            return Promise.resolve(storage.find(e => e._id === id) || null);
        }),
        findByIdCached: vi.fn().mockImplementation((id: string): Promise<T | null> => {
            return Promise.resolve(storage.find(e => e._id === id) || null);
        }),
        create: vi.fn().mockImplementation((data: Partial<T>): Promise<T> => {
            const entity = { ...entityFactory(), ...data } as T;
            storage.push(entity);
            return Promise.resolve(entity);
        }),
        createCached: vi.fn().mockImplementation((data: Partial<T>): Promise<T> => {
            const entity = { ...entityFactory(), ...data } as T;
            storage.push(entity);
            return Promise.resolve(entity);
        }),
        updateById: vi.fn().mockImplementation((id: string, update: Partial<T>): Promise<T | null> => {
            const entity = storage.find(e => e._id === id);
            if (entity) {
                Object.assign(entity, update);
                return Promise.resolve(entity);
            }
            return Promise.resolve(null);
        }),
        updateByIdCached: vi.fn().mockImplementation((id: string, update: Partial<T>): Promise<T | null> => {
            const entity = storage.find(e => e._id === id);
            if (entity) {
                Object.assign(entity, update);
                return Promise.resolve(entity);
            }
            return Promise.resolve(null);
        }),
        deleteById: vi.fn().mockImplementation((id: string): Promise<void> => {
            const idx = storage.findIndex(e => e._id === id);
            if (idx !== -1) {
                storage.splice(idx, 1);
            }
            return Promise.resolve();
        }),
    };
}

// Tipos para las entidades mock
interface MockBusiness {
    _id: string;
    namePlace: string;
    author: string;
    typeBusiness: string;
}

interface MockDoctor {
    _id: string;
    doctorName: string;
    author: string;
}

interface MockMarket {
    _id: string;
    marketName: string;
    author: string;
}

interface MockPost {
    _id: string;
    title: string;
    author: string;
}

interface MockProfession {
    _id: string;
    name: string;
}

interface MockProfessionProfile {
    _id: string;
    userId: string;
}

interface MockRecipe {
    _id: string;
    title: string;
    author: string;
}

interface MockRestaurant {
    _id: string;
    restaurantName: string;
    author: string;
    typePlace: string;
}

interface MockReview {
    _id: string;
    rating: number;
    author: string;
}

interface MockSanctuary {
    _id: string;
    sanctuaryName: string;
    author: string;
}

// Factories para entidades de ejemplo
const createBusiness = (): MockBusiness => ({
    _id: faker.database.mongodbObjectId(),
    namePlace: 'Mock Business',
    author: faker.database.mongodbObjectId(),
    typeBusiness: 'restaurant',
});

const createDoctor = (): MockDoctor => ({
    _id: faker.database.mongodbObjectId(),
    doctorName: 'Mock Doctor',
    author: faker.database.mongodbObjectId(),
});

const createMarket = (): MockMarket => ({
    _id: faker.database.mongodbObjectId(),
    marketName: 'Mock Market',
    author: faker.database.mongodbObjectId(),
});

const createPost = (): MockPost => ({
    _id: faker.database.mongodbObjectId(),
    title: 'Mock Post',
    author: faker.database.mongodbObjectId(),
});

const createProfession = (): MockProfession => ({
    _id: faker.database.mongodbObjectId(),
    name: 'Mock Profession',
});

const createProfessionProfile = (): MockProfessionProfile => ({
    _id: faker.database.mongodbObjectId(),
    userId: faker.database.mongodbObjectId(),
});

const createRecipe = (): MockRecipe => ({
    _id: faker.database.mongodbObjectId(),
    title: 'Mock Recipe',
    author: faker.database.mongodbObjectId(),
});

const createRestaurant = (): MockRestaurant => ({
    _id: faker.database.mongodbObjectId(),
    restaurantName: 'Mock Restaurant',
    author: faker.database.mongodbObjectId(),
    typePlace: 'restaurant',
});

const createReview = (): MockReview => ({
    _id: faker.database.mongodbObjectId(),
    rating: 5,
    author: faker.database.mongodbObjectId(),
});

const createSanctuary = (): MockSanctuary => ({
    _id: faker.database.mongodbObjectId(),
    sanctuaryName: 'Mock Sanctuary',
    author: faker.database.mongodbObjectId(),
});

// Mocks de servicios CRUD
const businessService = createCrudMock<MockBusiness>('Business', createBusiness);
const doctorService = createCrudMock<MockDoctor>('Doctor', createDoctor);
const marketsService = createCrudMock<MockMarket>('Market', createMarket);
const postService = createCrudMock<MockPost>('Post', createPost);
const professionService = createCrudMock<MockProfession>('Profession', createProfession);
const professionProfileService = createCrudMock<MockProfessionProfile>('ProfessionProfile', createProfessionProfile);
const recipesService = createCrudMock<MockRecipe>('Recipe', createRecipe);
const restaurantService = createCrudMock<MockRestaurant>('Restaurant', createRestaurant);
const reviewService = createCrudMock<MockReview>('Review', createReview);
const sanctuaryService = createCrudMock<MockSanctuary>('Sanctuary', createSanctuary);

// GeoService mock
const geoService = {
    geocodeAddress: vi.fn().mockResolvedValue({ lat: 1, lng: 2 }),
    reverseGeocode: vi.fn().mockResolvedValue({ address: 'Mock Address' }),
    calculateDistance: vi.fn().mockReturnValue(1000),
};

// Exportar todos los mocks en un objeto tipado
export const serviceMocks = {
    userService,
    tokenService,
    businessService,
    doctorService,
    marketsService,
    postService,
    professionService,
    professionProfileService,
    recipesService,
    restaurantService,
    reviewService,
    sanctuaryService,
    geoService,
};

/**
 * USO PARA TESTS UNITARIOS:
 *
 * 1. Importar los mocks:
 * import { serviceMocks } from '../__mocks__/services';
 *
 * 2. Configurar mocks en el test:
 * vi.mock('../../services/UserService', () => ({
 *     userService: serviceMocks.userService
 * }));
 *
 * 3. Sobrescribir métodos localmente en el test:
 * serviceMocks.userService.registerUser.mockImplementationOnce((userData) => {
 *     return Promise.resolve({
 *         _id: 'custom-id',
 *         email: userData.email,
 *         // ... otros campos
 *     });
 * });
 *
 * 4. Verificar llamadas:
 * expect(serviceMocks.userService.registerUser).toHaveBeenCalledWith(expectedData);
 *
 * 5. Limpiar mocks entre tests:
 * beforeEach(() => {
 *     vi.clearAllMocks();
 *     // Limpiar datos de prueba si es necesario
 *     mockUsers.length = 0;
 * });
 */
