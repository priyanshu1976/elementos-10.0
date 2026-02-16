import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../app";
import prisma from "../../lib/prisma";

describe("Admin Module", () => {
  let adminToken: string;
  let teamToken: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();

    // Create admin
    const adminHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "adm-admin@test.com",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });

    // Create a team user for permission tests
    const team = await prisma.team.create({
      data: { name: "Adm Perm Team", money: 10000 },
    });
    const teamHash = await bcrypt.hash("team123", 10);
    await prisma.user.create({
      data: {
        email: "adm-team@test.com",
        passwordHash: teamHash,
        role: "TEAM",
        teamId: team.id,
      },
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "adm-admin@test.com", password: "admin123" });
    adminToken = adminLogin.body.accessToken;

    const teamLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "adm-team@test.com", password: "team123" });
    teamToken = teamLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  describe("POST /api/admin/create-team", () => {
    it("should create a new team", async () => {
      const res = await request(app)
        .post("/api/admin/create-team")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Team",
          leaderEmail: "leader@test.com",
          password: "password123",
          money: 8000,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("New Team");
      expect(res.body.money).toBe(8000);
    });

    it("should reject duplicate team name", async () => {
      const res = await request(app)
        .post("/api/admin/create-team")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Team",
          leaderEmail: "leader2@test.com",
          password: "password123",
        });

      expect(res.status).toBe(409);
    });

    it("should reject duplicate email", async () => {
      const res = await request(app)
        .post("/api/admin/create-team")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Another Team",
          leaderEmail: "leader@test.com",
          password: "password123",
        });

      expect(res.status).toBe(409);
    });

    it("should reject team role", async () => {
      const res = await request(app)
        .post("/api/admin/create-team")
        .set("Authorization", `Bearer ${teamToken}`)
        .send({
          name: "Forbidden Team",
          leaderEmail: "forbidden@test.com",
          password: "password123",
        });

      expect(res.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const res = await request(app)
        .post("/api/admin/create-team")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "No Email" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/admin/teams", () => {
    it("should list all teams", async () => {
      const res = await request(app)
        .get("/api/admin/teams")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("PATCH /api/admin/team-money/:teamId", () => {
    it("should update team money", async () => {
      const teams = await request(app)
        .get("/api/admin/teams")
        .set("Authorization", `Bearer ${adminToken}`);

      const teamId = teams.body[0].id;

      const res = await request(app)
        .patch(`/api/admin/team-money/${teamId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ money: 15000 });

      expect(res.status).toBe(200);
      expect(res.body.money).toBe(15000);
    });

    it("should return 404 for non-existent team", async () => {
      const res = await request(app)
        .patch("/api/admin/team-money/nonexistent")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ money: 5000 });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/team/:teamId", () => {
    it("should delete a team", async () => {
      // Create a team to delete
      const createRes = await request(app)
        .post("/api/admin/create-team")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Deletable Team",
          leaderEmail: "deletable@test.com",
          password: "password123",
        });

      const res = await request(app)
        .delete(`/api/admin/team/${createRes.body.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Team deleted");
    });

    it("should return 404 for non-existent team", async () => {
      const res = await request(app)
        .delete("/api/admin/team/nonexistent")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/admin/bids/live", () => {
    it("should return empty when no active auction", async () => {
      const res = await request(app)
        .get("/api/admin/bids/live")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.auction).toBeNull();
      expect(res.body.bids).toEqual([]);
    });
  });
});
