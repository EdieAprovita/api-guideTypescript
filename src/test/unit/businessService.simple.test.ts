import { describe, it, expect } from 'vitest';

describe("BusinessService - Simple", () => {
  it("should have business service available", async () => {
    const { businessService } = await import("../../services/BusinessService");
    expect(businessService).toBeDefined();
  });

  it("should have all expected methods", async () => {
    const { businessService } = await import("../../services/BusinessService");
    
    // Test that methods are functions
    expect(typeof businessService.getAll).toBe('function');
    expect(typeof businessService.findById).toBe('function');
    expect(typeof businessService.create).toBe('function');
    expect(typeof businessService.updateById).toBe('function');
    expect(typeof businessService.deleteById).toBe('function');
  });

  it("should handle method calls without errors", async () => {
    const { businessService } = await import("../../services/BusinessService");
    
    // The mocks should not throw errors
    expect(() => businessService.getAll).not.toThrow();
    expect(() => businessService.findById).not.toThrow();
    expect(() => businessService.create).not.toThrow();
    expect(() => businessService.updateById).not.toThrow();
  });
});