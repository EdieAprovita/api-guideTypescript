// Isolated test setup - Para pruebas que necesitan funcionalidad real
// Este setup NO mockea los middleware, permitiendo probar su funcionalidad real

import { jest } from '@jest/globals';

// Mock environment variables básicas
process.env.NODE_ENV = 'development'; // Usar development para obtener mensajes de error reales
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Solo mockear dependencias externas críticas que no podemos evitar
jest.mock('../config/db', () => ({
    connectDB: jest.fn().mockResolvedValue(undefined),
    disconnectDB: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
}));

// Mock solo servicios externos que causan problemas de conexión
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue({}),
    connection: {
        readyState: 1,
        on: jest.fn(),
        once: jest.fn(),
    },
    Schema: class MockSchema {
        constructor(definition: Record<string, unknown>) {
            Object.assign(this, definition);
        }
        pre = jest.fn().mockReturnThis();
        post = jest.fn().mockReturnThis();
        plugin = jest.fn().mockReturnThis();
    },
    model: jest.fn(),
    Types: {
        ObjectId: jest.fn().mockImplementation((id?: string) => id ?? 'mock-object-id'),
    },
}));

// Mock bcryptjs para evitar operaciones costosas
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true),
    genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        sign: jest.fn().mockReturnValue('mock-token'),
        verify: jest.fn().mockReturnValue({ userId: 'mock-user-id' }),
    },
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn().mockReturnValue({ userId: 'mock-user-id' }),
}));

// No mockear HttpError - usar la implementación real
// jest.mock('../types/Errors') - REMOVIDO para usar funcionalidad real

console.log('🔧 Setup aislado cargado - Middleware real habilitado para pruebas');
