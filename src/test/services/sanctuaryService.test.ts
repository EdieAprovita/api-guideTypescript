import { sanctuaryService } from "../../services/SanctuaryService";

describe("SanctuaryService", () => {
  it("delegates getAll to the model", async () => {
    const mockModel = { find: jest.fn().mockResolvedValue([]) } as any;
    (sanctuaryService as any).model = mockModel;
    await sanctuaryService.getAll();
    expect(mockModel.find).toHaveBeenCalled();
  });
});
