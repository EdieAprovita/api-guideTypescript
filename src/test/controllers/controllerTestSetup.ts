jest.mock("../../config/db");
import geoService from "../../services/GeoService";

jest.mock("../../services/GeoService", () => ({
  __esModule: true,
  default: { geocodeAddress: jest.fn() },
}));

jest.mock("../../services/ReviewService", () => ({
  reviewService: {
    addReview: jest.fn(),
    getTopRatedReviews: jest.fn(),
  },
}));

jest.mock("../../middleware/authMiddleware", () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: "user", _id: "user", role: "admin" };
    next();
  },
  admin: (_req: any, _res: any, next: any) => next(),
  professional: (_req: any, _res: any, next: any) => next(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

export { geoService };
