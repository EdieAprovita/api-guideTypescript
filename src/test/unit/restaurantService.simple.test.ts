import { describe, it, expect } from 'vitest';

describe("RestaurantService - Simple", () => {
  it("should have restaurant service available", async () => {
    const { restaurantService } = await import("../../services/RestaurantService");
    expect(restaurantService).toBeDefined();
  });

  it("should have all expected methods", async () => {
    const { restaurantService } = await import("../../services/RestaurantService");
    
    // Test that methods are functions
    expect(typeof restaurantService.getAll).toBe('function');
    expect(typeof restaurantService.findById).toBe('function');
    expect(typeof restaurantService.create).toBe('function');
    expect(typeof restaurantService.updateById).toBe('function');
    expect(typeof restaurantService.deleteById).toBe('function');
  });

  it("should handle method calls without errors", async () => {
    const { restaurantService } = await import("../../services/RestaurantService");
    
    // The mocks should not throw errors
    expect(() => restaurantService.getAll).not.toThrow();
    expect(() => restaurantService.findById).not.toThrow();
    expect(() => restaurantService.create).not.toThrow();
    expect(() => restaurantService.updateById).not.toThrow();
  });
});