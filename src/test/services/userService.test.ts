import UserService from "../../services/UserService";
import { HttpError } from "../../types/Errors";
import { getErrorMessage } from "../../types/modalTypes";

// Ensure `getErrorMessage` returns the raw text
// instead of "Internal Server Error" during this suite
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
        jest.spyOn(UserService, "findUserById").mockResolvedValue(null);

        const resultPromise = UserService.updateUserById("1", {});
        await expect(resultPromise).rejects.toBeInstanceOf(HttpError);
        await expect(resultPromise).rejects.toMatchObject({
            message: getErrorMessage("User not found"),
        });
    });
});
