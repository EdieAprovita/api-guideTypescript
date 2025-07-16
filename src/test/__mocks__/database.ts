// Mock para la conexión de base de datos
export const databaseMocks = {
    connectDB: jest.fn().mockResolvedValue(undefined),
    mongoose: {
        connect: jest.fn().mockResolvedValue(undefined),
        connection: {
            readyState: 1, // Connected
            on: jest.fn(),
            once: jest.fn(),
        },
        disconnect: jest.fn().mockResolvedValue(undefined),
    },
};

// Mock para configuración de base de datos
export const dbConfigMocks = {
    default: jest.fn().mockResolvedValue(undefined),
    __esModule: true,
};