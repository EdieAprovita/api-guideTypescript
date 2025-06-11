import { professionProfileService } from "../../services/ProfessionProfileService";

describe("ProfessionProfileService", () => {
  it("delegates getAll to the model", async () => {
    const mockModel = { find: jest.fn().mockResolvedValue([]) } as any;
    (professionProfileService as any).model = mockModel;
    await professionProfileService.getAll();
    expect(mockModel.find).toHaveBeenCalled();
  });
});
