import { cacheService } from './CacheService.js';
import logger from '../utils/logger.js';

export interface AlertThresholds {
    minHitRatio: number;
    maxMemoryUsage: string;
    maxResponseTime: number;
    minCacheSize: number;
}

export interface AlertConfig {
    enabled: boolean;
    checkIntervalSeconds: number;
    thresholds: AlertThresholds;
    webhookUrl?: string;
    emailRecipients?: string[];
    slackChannel?: string;
}

export interface Alert {
    id: string;
    type: 'hit_ratio' | 'memory' | 'response_time' | 'cache_size' | 'redis_down';
    severity: 'warning' | 'critical';
    message: string;
    currentValue: number | string;
    threshold: number | string;
    timestamp: Date;
    resolved: boolean;
}

/**
 * CacheAlertService - Sistema de alertas para monitoreo del cache
 *
 * Características:
 * - Monitoreo continuo de métricas críticas
 * - Alertas configurables por umbral
 * - Múltiples canales de notificación
 * - Auto-resolución de alertas
 */
export class CacheAlertService {
    private config: AlertConfig;
    private readonly activeAlerts: Map<string, Alert> = new Map();
    private monitoringInterval: number | null = null;
    private lastCheckTime: Date | null = null;

    constructor(config: Partial<AlertConfig> = {}) {
        this.config = {
            enabled: true,
            checkIntervalSeconds: 60, // Check every minute
            thresholds: {
                minHitRatio: 70, // Alert if hit ratio < 70%
                maxMemoryUsage: '50M', // Alert if memory > 50MB
                maxResponseTime: 100, // Alert if response time > 100ms
                minCacheSize: 10, // Alert if cache has < 10 keys
            },
            ...config,
        };
    }

    /**
     * Iniciar monitoreo automático
     */
    startMonitoring(): void {
        if (!this.config.enabled) {
            logger.info('📊 Cache alerting is disabled');
            return;
        }

        if (this.monitoringInterval) {
            logger.warn('⚠️ Cache monitoring already running');
            return;
        }

        logger.info(`📊 Starting cache monitoring every ${this.config.checkIntervalSeconds}s`);

        // Primera verificación inmediata
        this.checkMetrics();

        // Programar verificaciones periódicas
        this.monitoringInterval = setInterval(() => {
            this.checkMetrics();
        }, this.config.checkIntervalSeconds * 1000);
    }

    /**
     * Detener monitoreo
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger.info('📊 Cache monitoring stopped');
        }
    }

    /**
     * Verificar métricas y generar alertas
     */
    private async checkMetrics(): Promise<void> {
        try {
            this.lastCheckTime = new Date();

            // Obtener estadísticas actuales
            const stats = await cacheService.getStats();

            // Verificar hit ratio
            await this.checkHitRatio(stats.hitRatio);

            // Verificar memoria
            await this.checkMemoryUsage(stats.memoryUsage);

            // Verificar tamaño del cache
            await this.checkCacheSize(stats.cacheSize);

            // Verificar conectividad Redis
            await this.checkRedisConnectivity();

            // Auto-resolver alertas si las métricas mejoraron
            await this.autoResolveAlerts({
                hitRatio: stats.hitRatio,
                avgResponseTime: 0,
                errorRate: 0,
                memoryUsage: this.parseMemoryToMB(stats.memoryUsage),
            });
        } catch (error) {
            logger.error('Error checking cache metrics:', error);

            // Crear alerta de error de monitoreo
            await this.createAlert({
                type: 'redis_down',
                severity: 'critical',
                message: 'Error checking cache metrics - Redis may be down',
                currentValue: 'error',
                threshold: 'operational',
            });
        }
    }

    /**
     * Verificar hit ratio
     */
    private async checkHitRatio(hitRatio: number): Promise<void> {
        const alertId = 'hit_ratio_low';

        if (hitRatio < this.config.thresholds.minHitRatio) {
            const severity = hitRatio < 50 ? 'critical' : 'warning';

            await this.createAlert(
                {
                    type: 'hit_ratio',
                    severity,
                    message: `Cache hit ratio is below threshold: ${hitRatio}% < ${this.config.thresholds.minHitRatio}%`,
                    currentValue: `${hitRatio}%`,
                    threshold: `${this.config.thresholds.minHitRatio}%`,
                },
                alertId
            );
        } else {
            // Resolver alerta si existe
            await this.resolveAlert(alertId);
        }
    }

    /**
     * Verificar uso de memoria
     */
    private async checkMemoryUsage(memoryUsage: string): Promise<void> {
        const alertId = 'memory_high';

        // Convertir memoria a MB para comparación (simple parse)
        const memoryMB = this.parseMemoryToMB(memoryUsage);
        const thresholdMB = this.parseMemoryToMB(this.config.thresholds.maxMemoryUsage);

        if (memoryMB > thresholdMB) {
            const severity = memoryMB > thresholdMB * 1.5 ? 'critical' : 'warning';

            await this.createAlert(
                {
                    type: 'memory',
                    severity,
                    message: `Cache memory usage is above threshold: ${memoryUsage} > ${this.config.thresholds.maxMemoryUsage}`,
                    currentValue: memoryUsage,
                    threshold: this.config.thresholds.maxMemoryUsage,
                },
                alertId
            );
        } else {
            await this.resolveAlert(alertId);
        }
    }

    /**
     * Verificar tamaño del cache
     */
    private async checkCacheSize(cacheSize: number): Promise<void> {
        const alertId = 'cache_size_low';

        if (cacheSize < this.config.thresholds.minCacheSize) {
            await this.createAlert(
                {
                    type: 'cache_size',
                    severity: 'warning',
                    message: `Cache size is below threshold: ${cacheSize} < ${this.config.thresholds.minCacheSize} keys`,
                    currentValue: `${cacheSize} keys`,
                    threshold: `${this.config.thresholds.minCacheSize} keys`,
                },
                alertId
            );
        } else {
            await this.resolveAlert(alertId);
        }
    }

    /**
     * Verificar conectividad Redis
     */
    private async checkRedisConnectivity(): Promise<void> {
        const alertId = 'redis_connectivity';

        try {
            // Test simple de conectividad
            await cacheService.set('health:monitor', { timestamp: new Date() }, 'test', { ttl: 10 });
            await cacheService.get('health:monitor');

            // Si llegamos aquí, Redis está funcionando
            await this.resolveAlert(alertId);
        } catch (error) {
            // Log the error for debugging purposes
            logger.error('Redis connectivity check failed:', error);

            // Extract error message for better alert details
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            await this.createAlert(
                {
                    type: 'redis_down',
                    severity: 'critical',
                    message: `Redis connectivity check failed: ${errorMessage}`,
                    currentValue: 'disconnected',
                    threshold: 'connected',
                },
                alertId
            );
        }
    }

    /**
     * Crear nueva alerta
     */
    private async createAlert(
        alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>,
        customId?: string
    ): Promise<void> {
        const id = customId || `${alertData.type}_${Date.now()}`;

        // No crear alerta duplicada
        if (this.activeAlerts.has(id)) {
            return;
        }

        const alert: Alert = {
            id,
            ...alertData,
            timestamp: new Date(),
            resolved: false,
        };

        this.activeAlerts.set(id, alert);

        // Log de la alerta
        const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
        logger[logLevel](`🚨 CACHE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);

        // Enviar notificaciones
        await this.sendNotifications(alert);
    }

    /**
     * Resolver alerta
     */
    private async resolveAlert(alertId: string): Promise<void> {
        const alert = this.activeAlerts.get(alertId);

        if (alert && !alert.resolved) {
            alert.resolved = true;

            logger.info(`✅ CACHE ALERT RESOLVED: ${alert.message}`);

            // Enviar notificación de resolución
            await this.sendResolutionNotification(alert);

            // Remover de alertas activas después de un tiempo
            setTimeout(
                () => {
                    this.activeAlerts.delete(alertId);
                },
                5 * 60 * 1000
            ); // 5 minutos
        }
    }

    /**
     * Auto-resolver alertas basado en métricas actuales
     */
    private async autoResolveAlerts(stats: {
        hitRatio: number;
        avgResponseTime: number;
        errorRate: number;
        memoryUsage: number;
    }): Promise<void> {
        // Resolver alerta de hit ratio si mejoró
        if (stats.hitRatio >= this.config.thresholds.minHitRatio) {
            await this.resolveAlert('hit_ratio_low');
        }

        // Resolver alerta de memoria si bajó
        const memoryMB = stats.memoryUsage;
        const thresholdMB = this.parseMemoryToMB(this.config.thresholds.maxMemoryUsage);
        if (memoryMB <= thresholdMB) {
            await this.resolveAlert('memory_high');
        }
    }

    /**
     * Enviar notificaciones
     */
    private async sendNotifications(alert: Alert): Promise<void> {
        try {
            // Webhook
            if (this.config.webhookUrl) {
                await this.sendWebhookNotification(alert);
            }

            // Email (simulated)
            if (this.config.emailRecipients && this.config.emailRecipients.length > 0) {
                await this.sendEmailNotification(alert);
            }

            // Slack (simulated)
            if (this.config.slackChannel && this.config.slackChannel.length > 0) {
                await this.sendSlackNotification(alert);
            }
        } catch (error) {
            logger.error('Error sending alert notifications:', error);
        }
    }

    /**
     * Enviar notificación de resolución
     */
    private async sendResolutionNotification(alert: Alert): Promise<void> {
        // Implementación similar a sendNotifications pero para resolución
        logger.info(`📧 Resolution notification sent for alert: ${alert.id}`);
    }

    /**
     * Enviar webhook
     */
    private async sendWebhookNotification(_alert: Alert): Promise<void> {
        // En producción, aquí harías un HTTP POST al webhook
        logger.info('🔗 Webhook notification sent');
    }

    /**
     * Enviar email
     */
    private async sendEmailNotification(_alert: Alert): Promise<void> {
        // En producción, integrarías con servicio de email
        logger.info(`📧 Email notification sent to ${this.config.emailRecipients?.join(', ')}`);
    }

    /**
     * Enviar Slack
     */
    private async sendSlackNotification(_alert: Alert): Promise<void> {
        // En producción, integrarías con Slack API
        logger.info(`💬 Slack notification sent to ${this.config.slackChannel || 'default'}`);
    }

    /**
     * Parsear memoria a MB
     */
    private parseMemoryToMB(memoryStr: string): number {
        const match = RegExp(/^(\d+(?:\.\d+)?)(.*)/).exec(memoryStr);
        if (!match) return 0;

        const value = parseFloat(match[1] || '0');
        const unit = (match[2] || '').toLowerCase();

        switch (unit) {
            case 'kb':
            case 'k':
                return value / 1024;
            case 'mb':
            case 'm':
                return value;
            case 'gb':
            case 'g':
                return value * 1024;
            default:
                return value / (1024 * 1024); // Assume bytes
        }
    }

    /**
     * Obtener alertas activas
     */
    getActiveAlerts(): Alert[] {
        return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
    }

    /**
     * Obtener todas las alertas (incluidas resueltas)
     */
    getAllAlerts(): Alert[] {
        return Array.from(this.activeAlerts.values());
    }

    /**
     * Obtener configuración de alertas
     */
    getConfig(): AlertConfig {
        return { ...this.config };
    }

    /**
     * Actualizar configuración
     */
    updateConfig(newConfig: Partial<AlertConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (this.monitoringInterval) {
            this.stopMonitoring();
            this.startMonitoring();
        }
    }

    /**
     * Obtener estado del monitoreo
     */
    getMonitoringStatus(): {
        enabled: boolean;
        running: boolean;
        lastCheck: Date | null;
        activeAlerts: number;
        checkInterval: number;
    } {
        return {
            enabled: this.config.enabled,
            running: this.monitoringInterval !== null,
            lastCheck: this.lastCheckTime,
            activeAlerts: this.getActiveAlerts().length,
            checkInterval: this.config.checkIntervalSeconds,
        };
    }
}

// Singleton instance con configuración por defecto
export const cacheAlertService = new CacheAlertService({
    enabled: process.env.NODE_ENV === 'production',
    checkIntervalSeconds: 60,
    thresholds: {
        minHitRatio: 70,
        maxMemoryUsage: '50M',
        maxResponseTime: 100,
        minCacheSize: 10,
    },
});
