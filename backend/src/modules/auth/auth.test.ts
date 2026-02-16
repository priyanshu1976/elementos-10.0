import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../app";
import prisma from "../../lib/prisma";

describe("Auth Module", () => {
  const adminEmail = "admin@test.com";
  const adminPassword = "admin123";
  const teamEmail = "team@test.com";
  const teamPassword = "team123";

  beforeAll(async () => {
    // Clean up
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  afterAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();

    // Create admin user
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash: adminHash, role: "ADMIN" },
    });

    // Create team + team user
    const team = await prisma.team.create({
      data: { name: "Test Team", money: 10000 },
    });

    const teamHash = await bcrypt.hash(teamPassword, 10);
    await prisma.user.create({
      data: {
        email: teamEmail,
        passwordHash: teamHash,
        role: "TEAM",
        teamId: team.id,
      },
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login admin successfully", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: adminEmail,
        password: adminPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.role).toBe("ADMIN");
      expect(res.body.user.email).toBe(adminEmail);
    });

    it("should login team successfully", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: teamEmail,
        password: teamPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe("TEAM");
      expect(res.body.user.teamName).toBe("Test Team");
    });

    it("should reject wrong password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: adminEmail,
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });

    it("should reject non-existent user", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@test.com",
        password: "password",
      });

      expect(res.status).toBe(401);
    });

    it("should reject invalid email format", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "not-an-email",
        password: "password",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh token successfully", async () => {
      // Login first
      const loginRes = await request(app).post("/api/auth/login").send({
        email: adminEmail,
        password: adminPassword,
      });

      const res = await request(app).post("/api/auth/refresh").send({
        refreshToken: loginRes.body.refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it("should reject invalid refresh token", async () => {
      const res = await request(app).post("/api/auth/refresh").send({
        refreshToken: "invalid-token",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user info", async () => {
      const loginRes = await request(app).post("/api/auth/login").send({
        email: teamEmail,
        password: teamPassword,
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(teamEmail);
      expect(res.body.role).toBe("TEAM");
      expect(res.body.teamName).toBe("Test Team");
      expect(res.body.money).toBe(10000);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const loginRes = await request(app).post("/api/auth/login").send({
        email: adminEmail,
        password: adminPassword,
      });

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out");

      // Refresh token should be invalidated
      const refreshRes = await request(app).post("/api/auth/refresh").send({
        refreshToken: loginRes.body.refreshToken,
      });

      expect(refreshRes.status).toBe(401);
    });
  });
});
