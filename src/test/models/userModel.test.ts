import { User } from "../../models/User";
import { faker } from "@faker-js/faker";

// Generate a throwaway password for testing instead of using a hard-coded one
const DUMMY_PASSWORD = faker.internet.password(12);

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
