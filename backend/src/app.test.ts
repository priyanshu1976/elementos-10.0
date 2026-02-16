import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app";
import prisma from "./lib/prisma";

describe("App scaffolding", () => {
  it("should respond to health check", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("should connect to database", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    expect(result).toBeTruthy();
  });

  it("should have all models accessible", async () => {
    // Verify Prisma models are generated and accessible
    const teams = await prisma.team.findMany();
    expect(Array.isArray(teams)).toBe(true);

    const items = await prisma.item.findMany();
    expect(Array.isArray(items)).toBe(true);

    const auctions = await prisma.auction.findMany();
    expect(Array.isArray(auctions)).toBe(true);

    const bids = await prisma.bid.findMany();
    expect(Array.isArray(bids)).toBe(true);

    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);
  });
});
