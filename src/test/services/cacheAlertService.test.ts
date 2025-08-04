/**
 * Simplified CacheAlertService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheAlertService } from '../../services/CacheAlertService';

// Mock the dependencies
vi.mock('../../services/CacheService', () => ({
    cacheService: {
        getStats: vi.fn().mockResolvedValue({
            hitRatio: 85,
            memoryUsage: '25M',
            cacheSize: 50,
        }),
        set: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue({ timestamp: new Date() }),
    },
}));

vi.mock('../../utils/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('CacheAlertService', () => {
    let alertService: CacheAlertService;

    const defaultConfig = {
        enabled: true,
        checkIntervalSeconds: 60,
        thresholds: {
            minHitRatio: 70,
            maxMemoryUsage: '50M',
            maxResponseTime: 100,
            minCacheSize: 10,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        alertService = new CacheAlertService(defaultConfig);
    });

    describe('Constructor and initialization', () => {
        it('should create CacheAlertService instance successfully', () => {
            expect(alertService).toBeDefined();
            expect(typeof alertService.startMonitoring).toBe('function');
            expect(typeof alertService.stopMonitoring).toBe('function');
            expect(typeof alertService.getConfig).toBe('function');
        });
    });

    describe('getConfig method', () => {
        it('should return current configuration', () => {
            const config = alertService.getConfig();

            expect(config).toEqual({
                enabled: true,
                checkIntervalSeconds: 60,
                thresholds: {
                    minHitRatio: 70,
                    maxMemoryUsage: '50M',
                    maxResponseTime: 100,
                    minCacheSize: 10,
                },
            });
        });
    });

    describe('getMonitoringStatus method', () => {
        it('should return monitoring status', () => {
            const status = alertService.getMonitoringStatus();

            expect(status).toEqual({
                enabled: true,
                running: false,
                lastCheck: null,
                activeAlerts: 0,
                checkInterval: 60,
            });
        });
    });

    describe('getActiveAlerts method', () => {
        it('should return empty array of active alerts', () => {
            const alerts = alertService.getActiveAlerts();
            expect(alerts).toEqual([]);
        });
    });

    describe('getAllAlerts method', () => {
        it('should return empty array of all alerts', () => {
            const alerts = alertService.getAllAlerts();
            expect(alerts).toEqual([]);
        });
    });

    describe('startMonitoring method', () => {
        it('should start monitoring without throwing', () => {
            expect(() => alertService.startMonitoring()).not.toThrow();
        });
    });

    describe('stopMonitoring method', () => {
        it('should stop monitoring without throwing', () => {
            expect(() => alertService.stopMonitoring()).not.toThrow();
        });
    });

    describe('updateConfig method', () => {
        it('should update configuration without throwing', () => {
            const newConfig = {
                enabled: false,
                checkIntervalSeconds: 120,
                thresholds: {
                    minHitRatio: 80,
                    maxMemoryUsage: '100M',
                    maxResponseTime: 200,
                    minCacheSize: 20,
                },
            };

            expect(() => alertService.updateConfig(newConfig)).not.toThrow();
        });
    });
});
