import { restaurantService } from "../../services/RestaurantService";

describe("RestaurantService", () => {
  it("uses model for update", async () => {
    const mockModel = { findByIdAndUpdate: jest.fn().mockResolvedValue({}) } as any;
    (restaurantService as any).model = mockModel;
    await restaurantService.updateById("1", {});
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith("1", {}, { new: true });
  });
});
