import { reviewService } from "../../services/ReviewService";
import { Review } from "../../models/Review";
import { HttpError } from "../../types/Errors";

describe("ReviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a review", async () => {
    (Review as jest.Mocked<typeof Review>).create = jest.fn().mockResolvedValue({ id: "1" });
    const result = await reviewService.addReview({ rating: 5 });
    expect(Review.create).toHaveBeenCalledWith({ rating: 5 });
    expect(result).toEqual({ id: "1" });
  });

  it("throws when review not found", async () => {
    (Review as jest.Mocked<typeof Review>).findById = jest.fn().mockResolvedValue(null);
    await expect(reviewService.getReviewById("x"))
      .rejects.toThrow(HttpError);
  });

  it("aggregates top rated reviews", async () => {
    (Review as jest.Mocked<typeof Review>).aggregate = jest.fn().mockResolvedValue([ { _id: "a" } ]);
    const result = await reviewService.getTopRatedReviews("Doctor");
    expect(Review.aggregate).toHaveBeenCalled();
    expect(result).toEqual([{ _id: "a" }]);
  });
});
