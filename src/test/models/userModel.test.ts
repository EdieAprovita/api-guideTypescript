import { User } from "../../models/User";

describe("User model email validation", () => {
    it("accepts a valid email", () => {
        const user = new User({
            username: "testuser",
            email: "valid.email@example.com",
            password: "password",
            role: "user",
            isAdmin: false,
        });
        const err = user.validateSync();
        expect(err).toBeUndefined();
    });

    it("rejects an invalid email", () => {
        const user = new User({
            username: "testuser",
            email: "invalid-email",
            password: "password",
            role: "user",
            isAdmin: false,
        });
        const err = user.validateSync();
        expect(err?.errors.email).toBeDefined();
    });
});
