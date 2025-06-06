import { businessService } from "../../services/BusinessService";

describe("BusinessService", () => {
  it("delegates getAll to the model", async () => {
    const mockModel = { find: jest.fn().mockResolvedValue([]) } as any;
    (businessService as any).model = mockModel;
    await businessService.getAll();
    expect(mockModel.find).toHaveBeenCalled();
  });
});
