const request = require("supertest");
const app = require("../api/index");

describe("Page Routes", () => {
  test("GET / should return 200", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
  });

  test("GET /room without token should redirect to /login", async () => {
    const res = await request(app).get("/room");

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});