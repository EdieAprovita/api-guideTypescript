import UserService from "../../services/UserService";
import { HttpError, HttpStatusCode } from "../../types/Errors";
import { IUser } from "../../models/User";

describe("UserService updateUserById", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should throw NotFound error when user does not exist", async () => {
        jest.spyOn(UserService, "findUserById").mockResolvedValue(null as any);

        await expect(UserService.updateUserById("1", {})).rejects.toThrow(
            new HttpError(HttpStatusCode.NOT_FOUND, "User not found")
        );
    });
});
