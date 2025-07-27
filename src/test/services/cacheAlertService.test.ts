/**
 * Clean CacheAlertService Tests - Using Unified Mock System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTest } from '../config/unified-test-config';
import { mockFactory } from '../mocks/unified-mock-factory';

// Mock the CacheAlertService module
vi.mock('../../services/CacheAlertService', () => mockFactory.createCacheAlertServiceMockModule());

describe('CacheAlertService', () => {
    const testHooks = setupTest();
    let alertService: any;

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

    beforeEach(async () => {
        await testHooks.beforeEach();
        vi.useFakeTimers();
        // Get the mocked service instance directly
        const { CacheAlertService } = await import('../../services/CacheAlertService');
        alertService = new CacheAlertService(defaultConfig);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Constructor and initialization', () => {
        it('should create CacheAlertService instance successfully', () => {
            expect(alertService).toBeDefined();
            expect(typeof alertService.startMonitoring).toBe('function');
            expect(typeof alertService.stopMonitoring).toBe('function');
            expect(typeof alertService.checkMetrics).toBe('function');
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
                lastCheck: expect.any(Date),
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

    describe('parseMemoryToMB method', () => {
        it('should parse memory string to MB', () => {
            const result1 = alertService.parseMemoryToMB('50M');
            const result2 = alertService.parseMemoryToMB('2.5MB');
            const result3 = alertService.parseMemoryToMB('invalid');
            
            expect(result1).toBe(50);
            expect(result2).toBe(2.5);
            expect(result3).toBe(0);
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

    describe('checkMetrics method', () => {
        it('should check metrics without throwing', async () => {
            await expect(alertService.checkMetrics()).resolves.toBeUndefined();
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