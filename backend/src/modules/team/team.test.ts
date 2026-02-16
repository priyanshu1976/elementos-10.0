import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../app";
import prisma from "../../lib/prisma";

describe("Team Module", () => {
  let teamToken: string;
  let adminToken: string;
  let teamId: string;

  beforeAll(async () => {
    // Clean
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();

    // Create team
    const team = await prisma.team.create({
      data: { name: "Alpha Team", money: 5000 },
    });
    teamId = team.id;

    // Create team user
    const teamHash = await bcrypt.hash("team123", 10);
    await prisma.user.create({
      data: {
        email: "team@test.com",
        passwordHash: teamHash,
        role: "TEAM",
        teamId: team.id,
      },
    });

    // Create admin user
    const adminHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: { email: "admin@test.com", passwordHash: adminHash, role: "ADMIN" },
    });

    // Login both
    const teamLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "team@test.com", password: "team123" });
    teamToken = teamLogin.body.accessToken;

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "admin123" });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  describe("GET /api/team/profile", () => {
    it("should return team profile", async () => {
      const res = await request(app)
        .get("/api/team/profile")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Alpha Team");
      expect(res.body.money).toBe(5000);
      expect(res.body.isEliminated).toBe(false);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/team/profile");
      expect(res.status).toBe(401);
    });

    it("should reject admin role", async () => {
      const res = await request(app)
        .get("/api/team/profile")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/team/money", () => {
    it("should return team money", async () => {
      const res = await request(app)
        .get("/api/team/money")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.money).toBe(5000);
    });
  });

  describe("GET /api/team/status", () => {
    it("should return team status", async () => {
      const res = await request(app)
        .get("/api/team/status")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isEliminated).toBe(false);
    });
  });

  describe("GET /api/team/history", () => {
    it("should return empty history for new team", async () => {
      const res = await request(app)
        .get("/api/team/history")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("PATCH /api/team/eliminate/:teamId", () => {
    it("should allow admin to eliminate a team", async () => {
      const res = await request(app)
        .patch(`/api/team/eliminate/${teamId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.team.isEliminated).toBe(true);
    });

    it("should reject team role", async () => {
      const res = await request(app)
        .patch(`/api/team/eliminate/${teamId}`)
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent team", async () => {
      const res = await request(app)
        .patch("/api/team/eliminate/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
