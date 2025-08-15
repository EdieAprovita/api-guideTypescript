// Isolated test setup - Para pruebas que necesitan funcionalidad real
// Este setup NO mockea los middleware, permitiendo probar su funcionalidad real

import { jest } from '@jest/globals';

// Mock environment variables básicas
import { testConfig } from './config/testConfig';

process.env.NODE_ENV = 'development'; // Usar development para obtener mensajes de error reales
process.env.JWT_SECRET = testConfig.generateTestPassword();
process.env.BCRYPT_SALT_ROUNDS = '10';

// Solo mockear dependencias externas críticas que no podemos evitar
vi.mock('../config/db', () => ({
    connectDB: vi.fn().mockResolvedValue(undefined),
    disconnectDB: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
}));

// Mock solo servicios externos que causan problemas de conexión
vi.mock('mongoose', () => ({
    connect: vi.fn().mockResolvedValue({}),
    disconnect: vi.fn().mockResolvedValue({}),
    connection: {
        readyState: 1,
        on: vi.fn(),
        once: vi.fn(),
    },
    Schema: class MockSchema {
        constructor(definition: Record<string, unknown>) {
            Object.assign(this, definition);
        }
        pre = vi.fn().mockReturnThis();
        post = vi.fn().mockReturnThis();
        plugin = vi.fn().mockReturnThis();
    },
    model: vi.fn(),
    Types: {
        ObjectId: vi.fn().mockImplementation((id?: string) => id ?? 'mock-object-id'),
    },
}));

// Mock bcryptjs para evitar operaciones costosas
vi.mock('bcryptjs', () => ({
    hash: vi.fn().mockResolvedValue(testConfig.generateTestPassword()),
    compare: vi.fn().mockResolvedValue(true),
    genSalt: vi.fn().mockResolvedValue('salt'),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        sign: vi.fn().mockReturnValue(testConfig.generateTestPassword()),
        verify: vi.fn().mockReturnValue({ userId: 'mock-user-id' }),
    },
    sign: vi.fn().mockReturnValue(testConfig.generateTestPassword()),
    verify: vi.fn().mockReturnValue({ userId: 'mock-user-id' }),
}));

// No mockear HttpError - usar la implementación real
// vi.mock('../types/Errors') - REMOVIDO para usar funcionalidad real

console.log('🔧 Setup aislado cargado - Middleware real habilitado para pruebas');
