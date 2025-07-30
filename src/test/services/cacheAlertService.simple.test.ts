/**
 * CacheAlertService Tests - Using Simple Mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetAllMocks } from '../__mocks__/simple-mocks';

// Mock dependencies BEFORE importing the service
vi.mock('../../services/CacheService', () => ({
  cacheService: {
    getStats: vi.fn().mockResolvedValue({
      hitRatio: 85,
      memoryUsage: '25M',
      cacheSize: 50
    }),
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ timestamp: new Date() })
  }
}));

vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Import AFTER mocking
import { CacheAlertService } from '../../services/CacheAlertService';

describe('CacheAlertService - Simple Tests', () => {
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
    resetAllMocks();
    alertService = new CacheAlertService(defaultConfig);
  });

  describe('Basic Operations', () => {
    it('should create instance successfully', () => {
      expect(alertService).toBeDefined();
      expect(typeof alertService.startMonitoring).toBe('function');
      expect(typeof alertService.stopMonitoring).toBe('function');
    });

    it('should return configuration', () => {
      const config = alertService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.checkIntervalSeconds).toBe(60);
      expect(config.thresholds.minHitRatio).toBe(70);
    });

    it('should return monitoring status', () => {
      const status = alertService.getMonitoringStatus();
      expect(status.enabled).toBe(true);
      expect(status.running).toBe(false);
      expect(typeof status.checkInterval).toBe('number');
    });

    it('should start monitoring without errors', () => {
      expect(() => alertService.startMonitoring()).not.toThrow();
    });

    it('should stop monitoring without errors', () => {
      expect(() => alertService.stopMonitoring()).not.toThrow();
    });

    it('should update configuration without errors', () => {
      const newConfig = { enabled: false, checkIntervalSeconds: 120 };
      expect(() => alertService.updateConfig(newConfig)).not.toThrow();
    });

    it('should return empty alerts initially', () => {
      expect(alertService.getActiveAlerts()).toEqual([]);
      expect(alertService.getAllAlerts()).toEqual([]);
    });
  });
});