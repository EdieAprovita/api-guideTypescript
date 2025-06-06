import { recipeService } from "../../services/RecipesService";

describe("RecipesService", () => {
  it("calls model on create", async () => {
    const mockModel = { create: jest.fn().mockResolvedValue({}) } as any;
    (recipeService as any).model = mockModel;
    await recipeService.create({});
    expect(mockModel.create).toHaveBeenCalled();
  });
});
