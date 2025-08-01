import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ============================================================================
// CONFIGURACIÓN MEJORADA DE BD PARA PRUEBAS DE INTEGRACIÓN
// ============================================================================

let mongoServer: MongoMemoryServer | null = null;
let isConnected = false;

/**
 * Conecta a una base de datos en memoria para pruebas
 * Maneja errores de forma robusta y proporciona fallbacks
 */
export const connectToMemoryDb = async (): Promise<void> => {
    try {
        // No reconectar si ya está conectado
        if (isConnected && mongoose.connection.readyState === 1) {
            return;
        }

        // Cerrar conexión existente si está en estado inválido
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }

        console.log('🔄 Iniciando MongoDB en memoria para pruebas...');

        // Configuración robusta para CI
        const mongoConfig: any = {
            instance: {
                dbName: 'test-vegan-guide',
                port: undefined, // Let the system choose a free port
            },
            binary: {
                version: process.env.MONGODB_MEMORY_SERVER_VERSION || '6.0.0',
                downloadDir: process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || undefined,
            },
            autoStart: true,
        };

        // Configuraciones específicas para CI
        if (process.env.CI) {
            mongoConfig.binary.downloadDir =
                process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || '~/.cache/mongodb-binaries';
            mongoConfig.instance.port = undefined; // Use random port in CI
            mongoConfig.autoStart = true;
        }

        // Crear servidor MongoDB en memoria con configuración robusta
        mongoServer = await MongoMemoryServer.create(mongoConfig);

        const uri = mongoServer.getUri();
        console.log(`📍 URI de BD de prueba: ${uri}`);

        // Conectar con configuración optimizada para pruebas
        await mongoose.connect(uri, {
            maxPoolSize: 1, // Una sola conexión para pruebas
            serverSelectionTimeoutMS: 15000, // Increased timeout for CI
            socketTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            // Optimizaciones para pruebas
            maxIdleTimeMS: 30000,
            waitQueueTimeoutMS: 10000, // Increased for CI
            retryWrites: false, // Deshabilitar para pruebas
            retryReads: false, // Disable for tests
        });

        isConnected = true;
        console.log('✅ Conectado a MongoDB en memoria');

        // Manejar eventos de conexión
        mongoose.connection.on('error', error => {
            console.error('❌ Error de conexión MongoDB:', error);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🔌 Desconectado de MongoDB');
            isConnected = false;
        });
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB en memoria:', error);

        // Fallback: intentar conexión local si está disponible
        if (process.env.MONGODB_TEST_URI) {
            try {
                console.log('🔄 Intentando fallback a BD local...');
                await mongoose.connect(process.env.MONGODB_TEST_URI, {
                    maxPoolSize: 1,
                    serverSelectionTimeoutMS: 10000,
                    socketTimeoutMS: 10000,
                });
                isConnected = true;
                console.log('✅ Conectado a BD local como fallback');
                return;
            } catch (fallbackError) {
                console.error('❌ Fallback a BD local falló:', fallbackError);
            }
        }

        // Fallback adicional: intentar con configuración mínima
        try {
            console.log('🔄 Intentando configuración mínima...');
            mongoServer = await MongoMemoryServer.create({
                instance: {
                    dbName: 'test-vegan-guide',
                },
                binary: {
                    version: '5.0.19', // Fallback to older version
                },
            });

            const uri = mongoServer.getUri();
            await mongoose.connect(uri, {
                maxPoolSize: 1,
                serverSelectionTimeoutMS: 20000,
                socketTimeoutMS: 20000,
                connectTimeoutMS: 20000,
            });

            isConnected = true;
            console.log('✅ Conectado con configuración mínima');
            return;
        } catch (minimalError) {
            console.error('❌ Configuración mínima falló:', minimalError);
        }

        throw new Error(
            `No se pudo establecer conexión a BD para pruebas: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
    }
};

/**
 * Limpia todas las colecciones de la base de datos
 * Conserva la conexión para evitar overhead de reconexión
 */
export const clearAllCollections = async (): Promise<void> => {
    try {
        if (!isConnected || mongoose.connection.readyState !== 1) {
            console.warn('⚠️ Intentando limpiar BD sin conexión activa');
            return;
        }

        const db = mongoose.connection.db;
        if (!db) {
            console.warn('⚠️ No hay referencia a la base de datos');
            return;
        }

        // Obtener todas las colecciones
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            return; // No hay colecciones que limpiar
        }

        // Limpiar cada colección de forma paralela
        const clearPromises = collections.map(async collection => {
            try {
                await db.collection(collection.name).deleteMany({});
            } catch (error) {
                console.warn(`⚠️ No se pudo limpiar colección ${collection.name}:`, error);
                // No fallar por errores individuales de colección
            }
        });

        await Promise.all(clearPromises);
        console.log(`🧹 Limpiadas ${collections.length} colecciones`);
    } catch (error) {
        console.error('❌ Error al limpiar colecciones:', error);
        throw new Error(
            `Error limpiando BD de pruebas: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
    }
};

/**
 * Cierra la conexión y detiene el servidor de BD en memoria
 * Debe llamarse al final de todas las pruebas
 */
export const disconnectAndCleanup = async (): Promise<void> => {
    try {
        // Limpiar antes de cerrar
        if (isConnected) {
            await clearAllCollections();
        }

        // Cerrar conexión de Mongoose
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }

        // Detener servidor en memoria
        if (mongoServer) {
            await mongoServer.stop();
            mongoServer = null;
        }

        isConnected = false;
        console.log('✅ BD de pruebas desconectada y limpiada');
    } catch (error) {
        console.error('❌ Error durante limpieza de BD:', error);
        // No fallar las pruebas por errores de limpieza
    }
};

/**
 * Verifica si la conexión está activa
 */
export const isDbConnected = (): boolean => {
    return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Función de emergencia para forzar reconexión
 */
export const forceReconnect = async (): Promise<void> => {
    console.log('🔄 Forzando reconexión a BD...');
    await disconnectAndCleanup();
    await connectToMemoryDb();
};

// ============================================================================
// HOOKS PARA VITEST/JEST
// ============================================================================

/**
 * Hook para configurar BD antes de todas las pruebas de una suite
 */
export const setupTestDb = () => {
    beforeAll(async () => {
        await connectToMemoryDb();
    }, 60000); // Increased timeout to 60s for CI

    afterAll(async () => {
        await disconnectAndCleanup();
    }, 30000); // Increased timeout to 30s for cleanup
};

/**
 * Hook para limpiar BD antes de cada prueba individual
 */
export const cleanDbBeforeEach = () => {
    beforeEach(async () => {
        if (!isDbConnected()) {
            await connectToMemoryDb();
        }
        await clearAllCollections();
    }, 20000); // Increased timeout to 20s for cleanup
};
