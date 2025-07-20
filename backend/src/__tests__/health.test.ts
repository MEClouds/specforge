import request from "supertest";
import express from "express";

// Create a simple test app for testing
const app = express();
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

describe("Health Check", () => {
  it("should return OK status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("OK");
    expect(response.body.timestamp).toBeDefined();
  });
});
