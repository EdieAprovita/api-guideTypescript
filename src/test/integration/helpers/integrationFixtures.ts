import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose'; // Importación default según documentación oficial
import testConfig from '../../testConfig.js';

// CRITICAL: Configurar variables de entorno antes de importar TokenService
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
}
if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-integration-tests';
}

// CRITICAL: Deshabilitar mocks globales para pruebas de integración
vi.doUnmock('../../../models/User');
vi.doUnmock('../../../models/Business');
vi.doUnmock('../../../models/Restaurant');
vi.doUnmock('../../../services/TokenService');

// CRITICAL: Deshabilitar mocks de librerías usadas por TokenService
vi.doUnmock('jsonwebtoken');
vi.doUnmock('bcryptjs');

// Importaciones de tipos
import type { IUser } from '../../../models/User.js';
import type { IBusiness } from '../../../models/Business.js';
import type { IRestaurant } from '../../../models/Restaurant.js';

// Usar Types desde mongoose default import
const { Types } = mongoose;

// ============================================================================
// TIPOS ESPECÍFICOS PARA PRUEBAS DE INTEGRACIÓN
// ============================================================================

export interface TestUserData {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'professional' | 'admin';
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    photo: string;
    firstName?: string;
    lastName?: string;
}

export interface TestBusinessData {
    namePlace: string;
    address: string;
    image: string;
    contact: Array<{
        phone?: string;
        email?: string;
        facebook?: string;
        instagram?: string;
    }>;
    budget: number;
    typeBusiness: 'restaurant' | 'cafe' | 'store' | 'service' | 'retail';
    hours: Array<{
        dayOfWeek: string;
        openTime: string;
        closeTime: string;
    }>;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    author: mongoose.Types.ObjectId;
}

export interface TestRestaurantData {
    restaurantName: string;
    address: string;
    image: string;
    typePlace: 'restaurant' | 'cafe' | 'bar';
    budget: '$' | '$$' | '$$$' | '$$$$';
    contact: Array<{
        phone?: string;
        facebook?: string;
        instagram?: string;
    }>;
    cuisine: string[];
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    author: mongoose.Types.ObjectId;
}

export interface CreatedTestUser extends IUser {
    _id: string;
    plainPassword: string; // Para pruebas de login
}

// ============================================================================
// FACTORIES DE DATOS DE PRUEBA
// ============================================================================

export const createTestUserData = (overrides: Partial<TestUserData> = {}): TestUserData => ({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: testConfig.generateTestPassword(),
    role: 'user',
    isAdmin: false,
    isActive: true,
    isDeleted: false,
    photo: 'default.png',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    ...overrides,
});

export const createTestBusinessData = (
    authorId: mongoose.Types.ObjectId,
    overrides: Partial<TestBusinessData> = {}
): TestBusinessData => ({
    namePlace: faker.company.name(),
    address: faker.location.streetAddress(),
    image: faker.image.url(),
    contact: [
        {
            phone: faker.string.numeric(10),
            email: faker.internet.email(),
            facebook: faker.internet.url(),
            instagram: `@${faker.internet.userName()}`,
        },
    ],
    budget: faker.number.int({ min: 1, max: 5 }),
    typeBusiness: faker.helpers.arrayElement(['restaurant', 'cafe', 'store', 'service', 'retail']),
    hours: [
        {
            dayOfWeek: 'Monday',
            openTime: '09:00',
            closeTime: '18:00',
        },
    ],
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    author: authorId,
    ...overrides,
});

export const createTestRestaurantData = (
    authorId: mongoose.Types.ObjectId,
    overrides: Partial<TestRestaurantData> = {}
): TestRestaurantData => ({
    restaurantName: faker.company.name(),
    address: faker.location.streetAddress(),
    image: faker.image.url(),
    typePlace: faker.helpers.arrayElement(['restaurant', 'cafe', 'bar']),
    budget: faker.helpers.arrayElement(['$', '$$', '$$$', '$$$$']),
    contact: [
        {
            phone: faker.string.numeric(10),
            facebook: faker.internet.url(),
            instagram: `@${faker.internet.userName()}`,
        },
    ],
    cuisine: faker.helpers.arrayElements(['Italian', 'Mexican', 'Asian', 'Vegan'], 2),
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    author: authorId,
    ...overrides,
});

// ============================================================================
// FUNCIONES DE CREACIÓN EN BD
// ============================================================================

export const createUserInDb = async (overrides: Partial<TestUserData> = {}): Promise<CreatedTestUser> => {
    const userData = createTestUserData(overrides);
    const plainPassword = userData.password;

    try {
        // Importación correcta usando default import
        const UserModule = await import('../../../models/User');
            // Debug logging for UserModule - only visible with DEBUG_TESTS
    if (process.env.DEBUG_TESTS) {
        console.log('UserModule keys:', Object.keys(UserModule));
        console.log('UserModule.User type:', typeof UserModule.User);
        console.log('UserModule.User:', UserModule.User);
    }

        const User = UserModule.User; // Acceder al modelo exportado

        if (typeof User !== 'function') {
            throw new Error(`User is not a constructor. Type: ${typeof User}, Value: ${User}`);
        }

        // Crear el usuario directamente sin hash porque el pre-hook se encarga de eso
        const user = new User({
            username: userData.username,
            email: userData.email,
            password: userData.password, // Sin hash, el pre-hook lo maneja
            role: userData.role,
            isAdmin: userData.isAdmin,
            isActive: userData.isActive,
            isDeleted: userData.isDeleted,
            photo: userData.photo,
            firstName: userData.firstName,
            lastName: userData.lastName,
        });

        const savedUser = await user.save();

        if (!savedUser) {
            throw new Error('User.save() returned null or undefined');
        }

        // Verificar que es un documento válido de Mongoose
        if (!savedUser._id || typeof savedUser.toObject !== 'function') {
            throw new Error('Created user is not a valid Mongoose document');
        }

        return {
            ...savedUser.toObject(),
            plainPassword, // Incluir password sin hash para pruebas de login
        } as CreatedTestUser;
    } catch (error) {
        console.error('Error creating user in DB:', error);

        // Información más detallada del error
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        }

        throw new Error(`Failed to create test user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const createAdminUserInDb = async (overrides: Partial<TestUserData> = {}): Promise<CreatedTestUser> => {
    return createUserInDb({
        role: 'admin',
        isAdmin: true,
        ...overrides,
    });
};

export const createBusinessInDb = async (
    authorId: mongoose.Types.ObjectId,
    overrides: Partial<TestBusinessData> = {}
): Promise<IBusiness> => {
    const businessData = createTestBusinessData(authorId, overrides);

    try {
        // Importación correcta usando default import
        const BusinessModule = await import('../../../models/Business');
        const Business = BusinessModule.Business;

        const business = await Business.create({
            ...businessData,
            rating: 0,
            numReviews: 0,
            reviews: [],
            timestamps: {
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        if (!business) {
            throw new Error('Business.create() returned null or undefined');
        }

        return business;
    } catch (error) {
        console.error('Error creating business in DB:', error);
        throw new Error(`Failed to create test business: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const createRestaurantInDb = async (
    authorId: mongoose.Types.ObjectId,
    overrides: Partial<TestRestaurantData> = {}
): Promise<IRestaurant> => {
    const restaurantData = createTestRestaurantData(authorId, overrides);

    try {
        // Importación correcta usando default import
        const RestaurantModule = await import('../../../models/Restaurant');
        const Restaurant = RestaurantModule.Restaurant;

        const restaurant = await Restaurant.create({
            ...restaurantData,
            rating: 0,
            numReviews: 0,
            reviews: [],
            timestamps: {
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        if (!restaurant) {
            throw new Error('Restaurant.create() returned null or undefined');
        }

        return restaurant;
    } catch (error) {
        console.error('Error creating restaurant in DB:', error);
        throw new Error(
            `Failed to create test restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
};

// ============================================================================
// HELPERS DE AUTENTICACIÓN
// ============================================================================

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export const generateAuthTokens = async (userId: string, email: string, role: string): Promise<AuthTokens> => {
    try {
        // Import the TokenService instance
        const TokenServiceModule = await import('../../../services/TokenService');
        const tokenService = TokenServiceModule.default;

        // Check if generateTokens method exists
        if (typeof tokenService.generateTokens !== 'function') {
            throw new Error(
                `generateTokens method not found on TokenService. Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(tokenService)).join(', ')}`
            );
        }

        let tokens: { accessToken: string; refreshToken: string };
        try {
            const payload = { userId, email: email || '', ...(role && { role }) };
            tokens = await tokenService.generateTokenPair(payload);
        } catch (error) {
            throw error;
        }

        if (!tokens) {
            throw new Error('TokenService.generateTokens returned null/undefined');
        }

        if (!tokens.accessToken || !tokens.refreshToken) {
            throw new Error(`Invalid tokens structure: ${JSON.stringify(tokens)}`);
        }

        // Verificar que el token es un JWT válido (tiene 3 partes separadas por puntos)
        if (!tokens.accessToken.includes('.') || tokens.accessToken.split('.').length !== 3) {
            throw new Error(`Invalid JWT format for access token: ${tokens.accessToken.substring(0, 50)}...`);
        }

        if (!tokens.refreshToken.includes('.') || tokens.refreshToken.split('.').length !== 3) {
            throw new Error(`Invalid JWT format for refresh token: ${tokens.refreshToken.substring(0, 50)}...`);
        }

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    } catch (error) {
        console.error('Error generating auth tokens:', error);
        throw new Error(`Failed to generate auth tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// ============================================================================
// INTERFACE PARA SETUP DE PRUEBAS
// ============================================================================

export interface TestSetupData {
    admin: CreatedTestUser;
    adminTokens: AuthTokens;
    regularUser: CreatedTestUser;
    userTokens: AuthTokens;
}

export const createCompleteTestSetup = async (): Promise<TestSetupData> => {
    try {
        // Crear usuarios
        const admin = await createAdminUserInDb();
        const regularUser = await createUserInDb();

        // Generar tokens
        const adminTokens = await generateAuthTokens(admin._id.toString(), admin.email, admin.role);
        const userTokens = await generateAuthTokens(regularUser._id.toString(), regularUser.email, regularUser.role);

        return {
            admin,
            adminTokens,
            regularUser,
            userTokens,
        };
    } catch (error) {
        console.error('Error in complete test setup:', error);
        throw new Error(
            `Failed to create complete test setup: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
};
