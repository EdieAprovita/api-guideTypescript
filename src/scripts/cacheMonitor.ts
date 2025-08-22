import { cacheService } from '../services/CacheService';
import logger from '../utils/logger';

interface CacheStats {
    hitRatio: number;
    totalRequests: number;
    cacheSize: number;
    memoryUsage: string;
    uptime: number;
}

interface CachePerformance {
    averageResponseTime: number;
    hitRate: number;
    missRate: number;
    efficiency: number;
}

class CacheMonitor {
    private stats: CacheStats | null = null;
    private performance: CachePerformance | null = null;
    private monitoringInterval: number | null = null;

    async startMonitoring(intervalMinutes: number = 5): Promise<void> {
        logger.info('🚀 Starting cache monitoring...');

        this.monitoringInterval = setInterval(
            async () => {
                await this.collectStats();
                await this.analyzePerformance();
                this.logReport();
            },
            intervalMinutes * 60 * 1000
        );

        // Collect initial stats
        await this.collectStats();
        await this.analyzePerformance();
        this.logReport();
    }

    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger.info('⏹️ Cache monitoring stopped');
        }
    }

    private async collectStats(): Promise<void> {
        try {
            this.stats = await cacheService.getStats();
        } catch (error) {
            logger.error('Error collecting cache stats:', error);
        }
    }

    private async analyzePerformance(): Promise<void> {
        if (!this.stats) return;

        const hitRate = this.stats.hitRatio;
        const missRate = 1 - hitRate;
        const efficiency = hitRate * 100;

        this.performance = {
            averageResponseTime: this.stats.uptime,
            hitRate,
            missRate,
            efficiency,
        };
    }

    private logReport(): void {
        if (!this.stats || !this.performance) return;

        logger.info('📊 Cache Performance Report', {
            hitRatio: `${(this.performance.hitRate * 100).toFixed(2)}%`,
            missRatio: `${(this.performance.missRate * 100).toFixed(2)}%`,
            efficiency: `${this.performance.efficiency.toFixed(2)}%`,
            totalRequests: this.stats.totalRequests,
            cacheSize: this.stats.cacheSize,
            memoryUsage: this.stats.memoryUsage,
            uptime: `${(this.stats.uptime / 1000).toFixed(2)}s`,
        });

        // Performance recommendations
        if (this.performance.hitRate < 0.5) {
            logger.warn('⚠️ Low cache hit rate detected. Consider:');
            logger.warn('   - Increasing TTL values');
            logger.warn('   - Adding more cache keys');
            logger.warn('   - Reviewing cache invalidation strategy');
        }

        if (this.performance.hitRate > 0.9) {
            logger.info('✅ Excellent cache performance!');
        }
    }

    async getCurrentStats(): Promise<CacheStats | null> {
        await this.collectStats();
        return this.stats;
    }

    async getCurrentPerformance(): Promise<CachePerformance | null> {
        await this.analyzePerformance();
        return this.performance;
    }
}

// Export singleton instance
export const cacheMonitor = new CacheMonitor();

// Auto-start monitoring if this file is imported
if (require.main === module) {
    cacheMonitor.startMonitoring(2); // Monitor every 2 minutes
}
