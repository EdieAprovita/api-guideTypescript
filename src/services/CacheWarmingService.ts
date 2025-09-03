import { cacheService } from './CacheService';
import { restaurantService } from './RestaurantService';
import { businessService } from './BusinessService';
import logger from '../utils/logger';

/**
 * CacheWarmingService - Servicio para precalentar cache con datos críticos
 *
 * Este servicio se encarga de:
 * - Cargar datos más consultados al inicio
 * - Refrescar cache periódicamente
 * - Optimizar rendimiento en horarios pico
 */
export class CacheWarmingService {
    private warmingInProgress = false;
    private lastWarmingTime: Date | null = null;
    private warmingInterval: number | null = null;

    /**
     * Iniciar precalentamiento automático
     * @param intervalMinutes Intervalo en minutos para precalentamiento automático
     */
    async startAutoWarming(intervalMinutes: number = 30): Promise<void> {
        logger.info(`🔥 Starting automatic cache warming every ${intervalMinutes} minutes`);

        // Warming inicial
        await this.warmUpCriticalData();

        // Programar warming periódico
        this.warmingInterval = setInterval(
            async () => {
                await this.warmUpCriticalData();
            },
            intervalMinutes * 60 * 1000
        );
    }

    /**
     * Detener precalentamiento automático
     */
    stopAutoWarming(): void {
        if (this.warmingInterval) {
            clearInterval(this.warmingInterval);
            this.warmingInterval = null;
            logger.info('🛑 Automatic cache warming stopped');
        }
    }

    /**
     * Precalentar todos los datos críticos
     */
    async warmUpCriticalData(): Promise<{
        success: boolean;
        duration: number;
        itemsWarmed: number;
        errors: string[];
    }> {
        if (this.warmingInProgress) {
            logger.warn('⚠️ Cache warming already in progress, skipping...');
            return {
                success: false,
                duration: 0,
                itemsWarmed: 0,
                errors: ['Warming already in progress'],
            };
        }

        this.warmingInProgress = true;
        const startTime = Date.now();
        let itemsWarmed = 0;
        const errors: string[] = [];

        try {
            logger.info('🔥 Starting comprehensive cache warming...');

            // 1. Warm up restaurants (más crítico)
            try {
                const restaurantsWarmed = await this.warmRestaurants();
                itemsWarmed += restaurantsWarmed;
                logger.info(`✅ Restaurants warmed: ${restaurantsWarmed} items`);
            } catch (error) {
                const errorMsg = `Error warming restaurants: ${error}`;
                errors.push(errorMsg);
                logger.error(errorMsg);
            }

            // 2. Warm up businesses
            try {
                const businessesWarmed = await this.warmBusinesses();
                itemsWarmed += businessesWarmed;
                logger.info(`✅ Businesses warmed: ${businessesWarmed} items`);
            } catch (error) {
                const errorMsg = `Error warming businesses: ${error}`;
                errors.push(errorMsg);
                logger.error(errorMsg);
            }

            // 3. Warm up popular users
            try {
                const usersWarmed = await this.warmPopularUsers();
                itemsWarmed += usersWarmed;
                logger.info(`✅ Users warmed: ${usersWarmed} items`);
            } catch (error) {
                const errorMsg = `Error warming users: ${error}`;
                errors.push(errorMsg);
                logger.error(errorMsg);
            }

            // 4. Warm up categories and static data
            try {
                const categoriesWarmed = await this.warmCategories();
                itemsWarmed += categoriesWarmed;
                logger.info(`✅ Categories warmed: ${categoriesWarmed} items`);
            } catch (error) {
                const errorMsg = `Error warming categories: ${error}`;
                errors.push(errorMsg);
                logger.error(errorMsg);
            }

            // 5. Warm up geographical data
            try {
                const geoWarmed = await this.warmGeographicalData();
                itemsWarmed += geoWarmed;
                logger.info(`✅ Geographical data warmed: ${geoWarmed} items`);
            } catch (error) {
                const errorMsg = `Error warming geographical data: ${error}`;
                errors.push(errorMsg);
                logger.error(errorMsg);
            }

            const duration = Date.now() - startTime;
            this.lastWarmingTime = new Date();

            logger.info(`🔥 Cache warming completed! ${itemsWarmed} items in ${duration}ms`);

            return {
                success: errors.length === 0,
                duration,
                itemsWarmed,
                errors,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = `Critical error in cache warming: ${error}`;
            logger.error(errorMsg);
            errors.push(errorMsg);

            return {
                success: false,
                duration,
                itemsWarmed,
                errors,
            };
        } finally {
            this.warmingInProgress = false;
        }
    }

    /**
     * Precalentar restaurantes más populares
     */
    private async warmRestaurants(): Promise<number> {
        let warmed = 0;

        try {
            // 1. Todos los restaurantes (listado principal)
            const allRestaurants = await restaurantService.getAllCached();
            if (allRestaurants && allRestaurants.length > 0) {
                await cacheService.set('restaurants:all', allRestaurants, 'restaurants', {
                    ttl: 300,
                    tags: ['restaurants', 'listings'],
                });
                warmed++;
            }

            // 2. Top 20 restaurantes individuales (más consultados)
            const topRestaurants = allRestaurants.slice(0, 20);
            await Promise.all(
                topRestaurants.map(async restaurant => {
                    await cacheService.set(`restaurant:${restaurant._id}`, restaurant, 'restaurants', {
                        ttl: 600,
                        tags: ['restaurants'],
                    });
                    warmed++;
                })
            );

            // 3. Búsquedas populares simuladas
            const popularFilters = [
                { category: 'vegan', city: 'madrid' },
                { category: 'vegetarian', city: 'barcelona' },
                { rating: '4' },
                { price: 'medium' },
            ];

            for (const filter of popularFilters) {
                const cacheKey = `restaurants:search:${JSON.stringify(filter)}`;
                // Simular resultados filtrados (en producción sería una query real)
                const filteredResults = allRestaurants.slice(0, 10);
                await cacheService.set(cacheKey, filteredResults, 'restaurants', {
                    ttl: 600,
                    tags: ['restaurants', 'search'],
                });
                warmed++;
            }
        } catch (error) {
            logger.error('Error warming restaurants:', error);
            throw error;
        }

        return warmed;
    }

    /**
     * Precalentar businesses populares
     */
    private async warmBusinesses(): Promise<number> {
        let warmed = 0;

        try {
            // 1. Todos los businesses
            const allBusinesses = await businessService.getAllCached();
            if (allBusinesses && allBusinesses.length > 0) {
                await cacheService.set('businesses:all', allBusinesses, 'businesses', {
                    ttl: 600,
                    tags: ['businesses', 'listings'],
                });
                warmed++;
            }

            // 2. Top 15 businesses individuales
            const topBusinesses = allBusinesses.slice(0, 15);
            for (const business of topBusinesses) {
                await cacheService.set(`business:${business._id}`, business, 'businesses', {
                    ttl: 900,
                    tags: ['businesses'],
                });
                warmed++;
            }

            // 3. Businesses por categorías populares
            const popularCategories = ['market', 'shop', 'service', 'organic'];
            for (const category of popularCategories) {
                const cacheKey = `businesses:category:${category}`;
                // Filtrar negocios por categoría
                const categoryResults = allBusinesses
                    .filter(b => b.typeBusiness?.toLowerCase().includes(category))
                    .slice(0, 10);

                await cacheService.set(cacheKey, categoryResults, 'businesses', {
                    ttl: 900,
                    tags: ['businesses', 'categories'],
                });
                warmed++;
            }
        } catch (error) {
            logger.error('Error warming businesses:', error);
            throw error;
        }

        return warmed;
    }

    /**
     * Precalentar usuarios populares/activos
     */
    private async warmPopularUsers(): Promise<number> {
        let warmed = 0;

        try {
            // Nota: Por privacidad, no precargamos todos los usuarios
            // Solo datos agregados y perfiles públicos destacados

            // 1. Estadísticas de usuarios (agregadas)
            const userStats = {
                totalUsers: 0,
                activeUsers: 0,
                professionalUsers: 0,
                recentSignups: 0,
                usersByRole: {
                    user: 0,
                    professional: 0,
                    admin: 0,
                },
                lastUpdated: new Date(),
                cacheGenerated: true,
            };

            await cacheService.set('users:stats', userStats, 'users', {
                ttl: 3600, // 1 hora
                tags: ['users', 'stats'],
            });
            warmed++;

            // 2. Perfiles de usuarios admin/destacados (sin datos sensibles)
            // Simular usuarios admin para warming
            const adminUsers = [
                { _id: '1', username: 'admin1', role: 'admin' },
                { _id: '2', username: 'admin2', role: 'admin' },
            ];

            if (adminUsers.length > 0) {
                for (const user of adminUsers.slice(0, 5)) {
                    const publicProfile = {
                        _id: user._id,
                        username: user.username,
                        role: user.role,
                        // No incluir email, password, etc.
                    };

                    await cacheService.set(`user:profile:${user._id}`, publicProfile, 'users', {
                        ttl: 1800,
                        tags: ['users', 'profiles'],
                    });
                    warmed++;
                }
            }

            // Generar perfiles de usuario específicos
            logger.info(`Warmed ${adminUsers.length} admin users`);
        } catch (error) {
            logger.error('Error warming users:', error);
            throw error;
        }

        return warmed;
    }

    /**
     * Precalentar categorías y datos estáticos
     */
    private async warmCategories(): Promise<number> {
        let warmed = 0;

        try {
            // 1. Categorías de restaurantes
            const restaurantCategories = [
                'vegan',
                'vegetarian',
                'organic',
                'raw',
                'gluten-free',
                'mediterranean',
                'asian',
                'italian',
                'mexican',
                'indian',
            ];

            await cacheService.set('categories:restaurants', restaurantCategories, 'categories', {
                ttl: 3600,
                tags: ['categories', 'static'],
            });
            warmed++;

            // 2. Categorías de businesses
            const businessCategories = [
                'market',
                'shop',
                'service',
                'organic',
                'eco-friendly',
                'health',
                'beauty',
                'clothing',
                'supplements',
            ];

            await cacheService.set('categories:businesses', businessCategories, 'categories', {
                ttl: 3600,
                tags: ['categories', 'static'],
            });
            warmed++;

            // 3. Ciudades populares
            const popularCities = [
                'madrid',
                'barcelona',
                'valencia',
                'sevilla',
                'bilbao',
                'malaga',
                'zaragoza',
                'palma',
                'murcia',
                'alicante',
            ];

            await cacheService.set('cities:popular', popularCities, 'geographical', {
                ttl: 7200, // 2 horas
                tags: ['geographical', 'cities'],
            });
            warmed++;

            // 4. Configuración de la aplicación
            const appConfig = {
                version: '1.0.0',
                features: ['cache', 'geolocation', 'reviews', 'search'],
                supportedLanguages: ['es', 'en'],
                maxResults: 50,
                defaultRadius: 5000,
            };

            await cacheService.set('app:config', appConfig, 'config', {
                ttl: 7200,
                tags: ['config', 'static'],
            });
            warmed++;
        } catch (error) {
            logger.error('Error warming categories:', error);
            throw error;
        }

        return warmed;
    }

    /**
     * Precalentar datos geográficos críticos
     */
    private async warmGeographicalData(): Promise<number> {
        let warmed = 0;

        try {
            // 1. Coordenadas de ciudades principales
            const cityCoordinates = {
                madrid: { lat: 40.4168, lng: -3.7038 },
                barcelona: { lat: 41.3851, lng: 2.1734 },
                valencia: { lat: 39.4699, lng: -0.3763 },
                sevilla: { lat: 37.3891, lng: -5.9845 },
                bilbao: { lat: 43.2627, lng: -2.9253 },
            };

            await cacheService.set('geo:cities:coordinates', cityCoordinates, 'geolocation', {
                ttl: 7200,
                tags: ['geolocation', 'coordinates'],
            });
            warmed++;

            // 2. Búsquedas geográficas populares simuladas
            const popularGeoSearches = [
                { lat: 40.4168, lng: -3.7038, radius: 5000 }, // Madrid centro
                { lat: 41.3851, lng: 2.1734, radius: 5000 }, // Barcelona centro
                { lat: 39.4699, lng: -0.3763, radius: 3000 }, // Valencia centro
            ];

            for (const search of popularGeoSearches) {
                const cacheKey = `geo:${search.lat}:${search.lng}:${search.radius}`;

                // Simular resultados geográficos (en producción sería query real)
                const geoResults = {
                    restaurants: 15,
                    businesses: 8,
                    total: 23,
                    center: { lat: search.lat, lng: search.lng },
                    radius: search.radius,
                };

                await cacheService.set(cacheKey, geoResults, 'geolocation', {
                    ttl: 1800, // 30 minutos
                    tags: ['geolocation', 'search'],
                });
                warmed++;
            }
        } catch (error) {
            logger.error('Error warming geographical data:', error);
            throw error;
        }

        return warmed;
    }

    /**
     * Obtener estadísticas del warming
     */
    getWarmingStats(): {
        isWarming: boolean;
        lastWarmingTime: Date | null;
        autoWarmingActive: boolean;
    } {
        return {
            isWarming: this.warmingInProgress,
            lastWarmingTime: this.lastWarmingTime,
            autoWarmingActive: this.warmingInterval !== null,
        };
    }

    /**
     * Warming selectivo por tipo de datos
     */
    async warmSpecificData(dataType: 'restaurants' | 'businesses' | 'users' | 'categories' | 'geo'): Promise<number> {
        logger.info(`🔥 Warming specific data type: ${dataType}`);

        switch (dataType) {
            case 'restaurants':
                return await this.warmRestaurants();
            case 'businesses':
                return await this.warmBusinesses();
            case 'users':
                return await this.warmPopularUsers();
            case 'categories':
                return await this.warmCategories();
            case 'geo':
                return await this.warmGeographicalData();
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    }
}

// Singleton instance
export const cacheWarmingService = new CacheWarmingService();
