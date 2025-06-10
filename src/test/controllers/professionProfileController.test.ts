import request from "supertest";
import app from "../../app";
import { professionProfileService } from "../../services/ProfessionProfileService";

jest.mock("../../services/ProfessionProfileService", () => ({
  professionProfileService: {
    getAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

jest.mock("../../middleware/authMiddleware", () => ({
  protect: (_req: any, _res: any, next: any) => next(),
  professional: (_req: any, _res: any, next: any) => next(),
  admin: (_req: any, _res: any, next: any) => next(),
}));

describe("ProfessionProfile Controllers", () => {
  it("lists profession profiles", async () => {
    (professionProfileService.getAll as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get("/api/v1/professionalProfile");
    expect(res.status).toBe(200);
    expect(professionProfileService.getAll).toHaveBeenCalled();
  });

  it("deletes a profession profile", async () => {
    (professionProfileService.deleteById as jest.Mock).mockResolvedValue(undefined);
    const res = await request(app).delete("/api/v1/professionalProfile/1");
    expect(res.status).toBe(200);
    expect(professionProfileService.deleteById).toHaveBeenCalledWith("1");
  });
});
