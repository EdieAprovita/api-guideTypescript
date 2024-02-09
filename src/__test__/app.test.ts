import request from "supertest";
import server from "../server";

describe("App", () => {
	it("Should respond with 200", async () => {
		const res = await request(server).get("/api/v1");
		expect(res.status).toBe(200);
		expect(res.text).toBe("API is running");
	});
});
