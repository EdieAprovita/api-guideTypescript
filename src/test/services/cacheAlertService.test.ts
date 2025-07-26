import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { CacheAlertService, AlertConfig } from '../../services/CacheAlertService';
import { cacheService } from '../../services/CacheService';
import logger from '../../utils/logger';

// Mock dependencies
vi.mock('../../services/CacheService');
vi.mock('../../utils/logger');

const mockedCacheService = cacheService as ReturnType<typeof vi.mocked<typeof cacheService>>;
const mockedLogger = logger as ReturnType<typeof vi.mocked<typeof logger>>;

describe('CacheAlertService', () => {
    let alertService: CacheAlertService;

    const defaultConfig: AlertConfig = {
        enabled: true,
        checkIntervalSeconds: 1, // 1 second for tests
        thresholds: {
            minHitRatio: 70,
            maxMemoryUsage: '50M',
            maxResponseTime: 100,
            minCacheSize: 10,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        alertService = new CacheAlertService(defaultConfig);
    });

    afterEach(() => {
        alertService?.stopMonitoring();
        vi.useRealTimers();
    });

    describe('Constructor', () => {
        it('should initialize with default configuration', () => {
            const service = new CacheAlertService();
            const config = service.getConfig();

            expect(config.enabled).toBe(true);
            expect(config.checkIntervalSeconds).toBe(60);
            expect(config.thresholds.minHitRatio).toBe(70);
            expect(config.thresholds.maxMemoryUsage).toBe('50M');
            expect(config.thresholds.maxResponseTime).toBe(100);
            expect(config.thresholds.minCacheSize).toBe(10);
        });

        it('should merge custom configuration with defaults', () => {
            const customConfig: Partial<AlertConfig> = {
                checkIntervalSeconds: 30,
                thresholds: {
                    minHitRatio: 80,
                    maxMemoryUsage: '100M',
                    maxResponseTime: 50,
                    minCacheSize: 5,
                },
            };

            const service = new CacheAlertService(customConfig);
            const config = service.getConfig();

            expect(config.enabled).toBe(true); // default
            expect(config.checkIntervalSeconds).toBe(30); // custom
            expect(config.thresholds.minHitRatio).toBe(80); // custom
        });
    });

    describe('startMonitoring', () => {
        it('should start monitoring when enabled', () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });

            alertService.startMonitoring();

            expect(mockedLogger.info).toHaveBeenCalledWith('📊 Starting cache monitoring every 1s');
        });

        it('should not start monitoring when disabled', () => {
            const disabledService = new CacheAlertService({ enabled: false });

            disabledService.startMonitoring();

            expect(mockedLogger.info).toHaveBeenCalledWith('📊 Cache alerting is disabled');
        });

        it('should not start monitoring if already running', () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });

            alertService.startMonitoring();
            alertService.startMonitoring(); // Try to start again

            expect(mockedLogger.warn).toHaveBeenCalledWith('⚠️ Cache monitoring already running');
        });

        it('should perform immediate check and schedule periodic checks', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();

            // Wait for immediate check
            await vi.runOnlyPendingTimersAsync();

            expect(mockedCacheService.getStats).toHaveBeenCalled();
        });
    });

    describe('stopMonitoring', () => {
        it('should stop monitoring', () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });

            alertService.startMonitoring();
            alertService.stopMonitoring();

            expect(mockedLogger.info).toHaveBeenCalledWith('📊 Cache monitoring stopped');
        });

        it('should handle stopping when not running', () => {
            alertService.stopMonitoring();
            // Should not throw error or log anything
        });
    });

    describe('checkMetrics - Hit Ratio', () => {
        it('should create warning alert for low hit ratio', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 60, // Below threshold of 70
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('🚨 CACHE ALERT [WARNING]: Cache hit ratio is below threshold: 60% < 70%')
            );
        });

        it('should create critical alert for very low hit ratio', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 40, // Below 50% = critical
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('🚨 CACHE ALERT [CRITICAL]: Cache hit ratio is below threshold: 40% < 70%')
            );
        });

        it('should not create alert for good hit ratio', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 85, // Above threshold
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            // Should not have any alert logs
            expect(mockedLogger.warn).not.toHaveBeenCalledWith(expect.stringContaining('🚨 CACHE ALERT'));
            expect(mockedLogger.error).not.toHaveBeenCalledWith(expect.stringContaining('🚨 CACHE ALERT'));
        });
    });

    describe('checkMetrics - Memory Usage', () => {
        it('should create warning alert for high memory usage', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '60M', // Above 50M threshold
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('🚨 CACHE ALERT [WARNING]: Cache memory usage is above threshold: 60M > 50M')
            );
        });

        it('should create critical alert for very high memory usage', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '80M', // Above 75M (50M * 1.5) = critical
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('🚨 CACHE ALERT [CRITICAL]: Cache memory usage is above threshold: 80M > 50M')
            );
        });
    });

    describe('checkMetrics - Cache Size', () => {
        it('should create warning alert for low cache size', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 5, // Below threshold of 10
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('🚨 CACHE ALERT [WARNING]: Cache size is below threshold: 5 < 10 keys')
            );
        });
    });

    describe('checkMetrics - Redis Connectivity', () => {
        it('should create critical alert when Redis is down', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockRejectedValue(new Error('Redis connection failed'));

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('🚨 CACHE ALERT [CRITICAL]: Redis connectivity check failed')
            );
        });

        it('should not create alert when Redis is working', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            // Should not create connectivity alert
            expect(mockedLogger.error).not.toHaveBeenCalledWith(
                expect.stringContaining('Redis connectivity check failed')
            );
        });
    });

    describe('Alert Resolution', () => {
        it('should auto-resolve hit ratio alert when metrics improve', async () => {
            // Setup persistent bad stats for first check
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 60,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            // Verify alert was created
            const alertsAfterFirstCheck = alertService.getActiveAlerts();
            expect(alertsAfterFirstCheck.length).toBeGreaterThan(0);

            // Now mock improved stats for second check
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 85, // Above threshold
                totalRequests: 200,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });

            // Trigger next check cycle
            vi.advanceTimersByTime(1000); // Advance 1 second
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('✅ CACHE ALERT RESOLVED'));
        });
    });

    describe('Error Handling', () => {
        it('should handle errors during metrics check', async () => {
            mockedCacheService.getStats.mockRejectedValue(new Error('Redis error'));

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.error).toHaveBeenCalledWith('Error checking cache metrics:', expect.any(Error));

            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('🚨 CACHE ALERT [CRITICAL]: Error checking cache metrics - Redis may be down')
            );
        });
    });

    describe('parseMemoryToMB', () => {
        it('should parse different memory units correctly', () => {
            const service = new CacheAlertService();

            // Test private method through reflection
            const parseMemory = (
                service as unknown as { parseMemoryToMB: (mem: string) => number }
            ).parseMemoryToMB.bind(service);

            expect(parseMemory('1024KB')).toBeCloseTo(1, 2);
            expect(parseMemory('50M')).toBe(50);
            expect(parseMemory('2.5MB')).toBe(2.5);
            expect(parseMemory('1G')).toBe(1024);
            expect(parseMemory('1073741824')).toBeCloseTo(1024, 0); // 1GB in bytes
            expect(parseMemory('invalid')).toBe(0);
        });
    });

    describe('getActiveAlerts', () => {
        it('should return only unresolved alerts', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 60, // Below threshold
                totalRequests: 100,
                cacheSize: 5, // Below threshold
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            const activeAlerts = alertService.getActiveAlerts();
            expect(activeAlerts.length).toBeGreaterThan(0);
            expect(activeAlerts.every(alert => !alert.resolved)).toBe(true);
        });
    });

    describe('getAllAlerts', () => {
        it('should return all alerts including resolved ones', async () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 60, // Below threshold
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            alertService.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            const allAlerts = alertService.getAllAlerts();
            expect(allAlerts.length).toBeGreaterThan(0);
        });
    });

    describe('updateConfig', () => {
        it('should update configuration and restart monitoring', () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });

            alertService.startMonitoring();

            const newConfig: Partial<AlertConfig> = {
                checkIntervalSeconds: 30,
                thresholds: {
                    minHitRatio: 80,
                    maxMemoryUsage: '100M',
                    maxResponseTime: 200,
                    minCacheSize: 20,
                },
            };

            alertService.updateConfig(newConfig);

            const config = alertService.getConfig();
            expect(config.checkIntervalSeconds).toBe(30);
            expect(config.thresholds.minHitRatio).toBe(80);
        });
    });

    describe('getMonitoringStatus', () => {
        it('should return correct monitoring status', () => {
            const status = alertService.getMonitoringStatus();

            expect(status.enabled).toBe(true);
            expect(status.running).toBe(false);
            expect(status.lastCheck).toBeNull();
            expect(status.activeAlerts).toBe(0);
            expect(status.checkInterval).toBe(1);
        });

        it('should show running status when monitoring is active', () => {
            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 80,
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });

            alertService.startMonitoring();

            const status = alertService.getMonitoringStatus();
            expect(status.running).toBe(true);
        });
    });

    describe('Notification Methods', () => {
        it('should call notification methods when alert is created', async () => {
            const testEmail = faker.internet.email();
            const webhookConfig = {
                ...defaultConfig,
                webhookUrl: 'https://example.com/webhook',
                emailRecipients: [testEmail],
                slackChannel: '#alerts',
            };

            const serviceWithNotifications = new CacheAlertService(webhookConfig);

            mockedCacheService.getStats.mockResolvedValue({
                hitRatio: 60, // Below threshold
                totalRequests: 100,
                cacheSize: 50,
                memoryUsage: '30M',
                uptime: 3600,
            });
            mockedCacheService.set.mockResolvedValue();
            mockedCacheService.get.mockResolvedValue({ timestamp: new Date() });

            serviceWithNotifications.startMonitoring();
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.info).toHaveBeenCalledWith('🔗 Webhook notification sent');
            expect(mockedLogger.info).toHaveBeenCalledWith(`📧 Email notification sent to ${testEmail}`);
            expect(mockedLogger.info).toHaveBeenCalledWith('💬 Slack notification sent to #alerts');
        });
    });

    describe('Singleton Instance', () => {
        it('should have singleton configured for production', () => {
            // Test the exported singleton - we need to import it separately since it's not in the main import
            const { cacheAlertService } = require('../../../src/services/CacheAlertService');
            const config = cacheAlertService.getConfig();

            expect(config.checkIntervalSeconds).toBe(60);
            expect(config.thresholds.minHitRatio).toBe(70);
            expect(config.thresholds.maxMemoryUsage).toBe('50M');
            expect(config.thresholds.maxResponseTime).toBe(100);
            expect(config.thresholds.minCacheSize).toBe(10);
        });
    });
});
