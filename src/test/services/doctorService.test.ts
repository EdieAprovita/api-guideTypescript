import { doctorService } from "../../services/DoctorService";

describe("DoctorService", () => {
  it("delegates getAll to the model", async () => {
    const mockModel = { find: jest.fn().mockResolvedValue([]) } as any;
    (doctorService as any).model = mockModel;
    await doctorService.getAll();
    expect(mockModel.find).toHaveBeenCalled();
  });
});
