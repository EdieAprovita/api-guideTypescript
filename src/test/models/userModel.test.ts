import { User } from "../../models/User";

const DUMMY_PASSWORD = "testPass123!";

describe("User model email validation", () => {
    it("accepts a valid email", () => {
        const user = new User({
            username: "testuser",
            email: "valid.email@example.com",
            password: DUMMY_PASSWORD,
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
            password: DUMMY_PASSWORD,
            role: "user",
            isAdmin: false,
        });
        const err = user.validateSync();
        expect(err?.errors.email).toBeDefined();
    });
});
