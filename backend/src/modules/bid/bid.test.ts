import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../app";
import prisma from "../../lib/prisma";
import { stopTimer } from "../auction/auction.engine";

describe("Bid Module", () => {
  let adminToken: string;
  let teamAToken: string;
  let teamBToken: string;
  let itemId: string;
  let teamAId: string;
  let teamBId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();

    // Admin
    const adminHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "bid-admin@test.com",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });

    // Team A
    const teamA = await prisma.team.create({
      data: { name: "Bid Team A", money: 5000 },
    });
    teamAId = teamA.id;
    const teamAHash = await bcrypt.hash("team123", 10);
    await prisma.user.create({
      data: {
        email: "bid-teamA@test.com",
        passwordHash: teamAHash,
        role: "TEAM",
        teamId: teamA.id,
      },
    });

    // Team B
    const teamB = await prisma.team.create({
      data: { name: "Bid Team B", money: 3000 },
    });
    teamBId = teamB.id;
    const teamBHash = await bcrypt.hash("team123", 10);
    await prisma.user.create({
      data: {
        email: "bid-teamB@test.com",
        passwordHash: teamBHash,
        role: "TEAM",
        teamId: teamB.id,
      },
    });

    // Item
    const item = await prisma.item.create({
      data: { title: "Bid Test Item", basePrice: 100 },
    });
    itemId = item.id;

    // Login all
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "bid-admin@test.com", password: "admin123" });
    adminToken = adminLogin.body.accessToken;

    const teamALogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "bid-teamA@test.com", password: "team123" });
    teamAToken = teamALogin.body.accessToken;

    const teamBLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "bid-teamB@test.com", password: "team123" });
    teamBToken = teamBLogin.body.accessToken;
  });

  afterEach(async () => {
    stopTimer();
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    // Reset item
    await prisma.item.update({
      where: { id: itemId },
      data: { status: "PENDING" },
    });
  });

  afterAll(async () => {
    stopTimer();
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  async function startAuction() {
    const res = await request(app)
      .post("/api/auction/start")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ itemId });
    return res.body;
  }

  describe("POST /api/bid/place", () => {
    it("should place a bid successfully", async () => {
      await startAuction();

      const res = await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(500);
      expect(res.body.teamId).toBe(teamAId);
    });

    it("should reject bid below base price", async () => {
      await startAuction();

      const res = await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 50 }); // base price is 100

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("at least");
    });

    it("should reject bid exceeding team funds", async () => {
      await startAuction();

      const res = await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamBToken}`)
        .send({ amount: 5000 }); // Team B only has 3000

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Insufficient");
    });

    it("should reject duplicate bid", async () => {
      await startAuction();

      await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      const res = await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 600 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already have a bid");
    });

    it("should reject bid when no active auction", async () => {
      const res = await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("No active auction");
    });

    it("should reject eliminated team", async () => {
      await startAuction();

      // Eliminate team A
      await prisma.team.update({
        where: { id: teamAId },
        data: { isEliminated: true },
      });

      const res = await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("eliminated");

      // Restore
      await prisma.team.update({
        where: { id: teamAId },
        data: { isEliminated: false },
      });
    });
  });

  describe("PATCH /api/bid/update", () => {
    it("should update existing bid", async () => {
      await startAuction();

      await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      const res = await request(app)
        .patch("/api/bid/update")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 800 });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(800);
    });

    it("should reject update with no existing bid", async () => {
      await startAuction();

      const res = await request(app)
        .patch("/api/bid/update")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 800 });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/bid/current-highest", () => {
    it("should return highest bid", async () => {
      await startAuction();

      await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamBToken}`)
        .send({ amount: 800 });

      const res = await request(app)
        .get("/api/bid/current-highest")
        .set("Authorization", `Bearer ${teamAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.highest.amount).toBe(800);
      expect(res.body.highest.teamName).toBe("Bid Team B");
    });

    it("should return null when no bids", async () => {
      await startAuction();

      const res = await request(app)
        .get("/api/bid/current-highest")
        .set("Authorization", `Bearer ${teamAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.highest).toBeNull();
    });
  });

  describe("GET /api/bid/team", () => {
    it("should return team's bid for current auction", async () => {
      await startAuction();

      await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      const res = await request(app)
        .get("/api/bid/team")
        .set("Authorization", `Bearer ${teamAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(500);
    });
  });

  describe("GET /api/bid/history/:auctionId", () => {
    it("should return bid history for an auction", async () => {
      const auctionData = await startAuction();

      await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamAToken}`)
        .send({ amount: 500 });

      await request(app)
        .post("/api/bid/place")
        .set("Authorization", `Bearer ${teamBToken}`)
        .send({ amount: 700 });

      const res = await request(app)
        .get(`/api/bid/history/${auctionData.auctionId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      // Ordered by amount desc
      expect(res.body[0].amount).toBe(700);
      expect(res.body[1].amount).toBe(500);
    });
  });
});
