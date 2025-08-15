import { vi, describe, it, beforeEach, expect } from 'vitest';
import { reviewService } from "../../services/ReviewService";
import { Review } from "../../models/Review";
import { HttpError } from "../../types/Errors";

describe("ReviewService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a review", async () => {
    (Review as unknown as typeof Review & { [K in keyof typeof Review]: ReturnType<typeof vi.fn> }).create = vi.fn().mockResolvedValue({ id: "1" });
    const result = await reviewService.addReview({ rating: 5 });
    expect(Review.create).toHaveBeenCalledWith({ rating: 5 });
    expect(result).toEqual({ id: "1" });
  });

  it("throws when review not found", async () => {
    (Review as unknown as typeof Review & { [K in keyof typeof Review]: ReturnType<typeof vi.fn> }).findById = vi.fn().mockResolvedValue(null);
    await expect(reviewService.getReviewById("x"))
      .rejects.toThrow(HttpError);
  });

  it("aggregates top rated reviews", async () => {
    (Review as unknown as typeof Review & { [K in keyof typeof Review]: ReturnType<typeof vi.fn> }).aggregate = vi.fn().mockResolvedValue([ { _id: "a" } ]);
    const result = await reviewService.getTopRatedReviews("restaurant");
    expect(Review.aggregate).toHaveBeenCalled();
    expect(result).toEqual([{ _id: "a" }]);
  });
});
