import { professionService } from "../../services/ProfessionService";

describe("ProfessionService", () => {
  it("delegates getAll to the model", async () => {
    const mockModel = { find: jest.fn().mockResolvedValue([]) } as any;
    (professionService as any).model = mockModel;
    await professionService.getAll();
    expect(mockModel.find).toHaveBeenCalled();
  });
});
