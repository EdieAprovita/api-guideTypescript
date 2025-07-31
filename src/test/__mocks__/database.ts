import { vi } from 'vitest';
// Mock para la conexión de base de datos
export const databaseMocks = {
    connectDB: vi.fn().mockResolvedValue(undefined),
    mongoose: {
        connect: vi.fn().mockResolvedValue(undefined),
        connection: {
            readyState: 1, // Connected
            on: vi.fn(),
            once: vi.fn(),
        },
        disconnect: vi.fn().mockResolvedValue(undefined),
    },
};

// Mock para configuración de base de datos
export const dbConfigMocks = {
    default: vi.fn().mockResolvedValue(undefined),
    __esModule: true,
};
