import { marketsService } from "../../services/MarketsService";

describe("MarketsService", () => {
  it("delegates getAll to the model", async () => {
    const mockModel = { find: jest.fn().mockResolvedValue([]) } as any;
    (marketsService as any).model = mockModel;
    await marketsService.getAll();
    expect(mockModel.find).toHaveBeenCalled();
  });
});
