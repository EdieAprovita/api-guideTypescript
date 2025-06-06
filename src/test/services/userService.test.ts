import UserService from "../../services/UserService";
import { HttpError } from "../../types/Errors";
import { getErrorMessage } from "../../types/modalTypes";

// Ensure predictable error messages in tests
const originalEnv = process.env.NODE_ENV;

beforeAll(() => {
    process.env.NODE_ENV = "development";
});

afterAll(() => {
    process.env.NODE_ENV = originalEnv;
});

describe("UserService updateUserById", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should throw NotFound error when user does not exist", async () => {
        jest.spyOn(UserService, "findUserById").mockResolvedValue(null as any);

        const resultPromise = UserService.updateUserById("1", {});
        await expect(resultPromise).rejects.toThrowError(HttpError);
        await expect(resultPromise).rejects.toThrowError(
            getErrorMessage("User not found")
        );
    });
});
