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

    it("should throw NotFound error when user does not exist", () => {
        jest.spyOn(UserService, "findUserById").mockResolvedValue(null);

        return UserService.updateUserById("1", {}).catch(error => {
            expect(error).toBeInstanceOf(HttpError);
            expect(error.message).toBe(getErrorMessage("User not found"));
        });
    });
});
