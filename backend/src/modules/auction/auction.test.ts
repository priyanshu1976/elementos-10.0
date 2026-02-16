import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../app";
import prisma from "../../lib/prisma";
import { resolveAuction, stopTimer } from "./auction.engine";

describe("Auction Module", () => {
  let adminToken: string;
  let teamToken: string;
  let itemId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();

    const adminHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "auc-admin@test.com",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });

    const team = await prisma.team.create({
      data: { name: "Auction Test Team", money: 10000 },
    });
    const teamHash = await bcrypt.hash("team123", 10);
    await prisma.user.create({
      data: {
        email: "auc-team@test.com",
        passwordHash: teamHash,
        role: "TEAM",
        teamId: team.id,
      },
    });

    const item = await prisma.item.create({
      data: { title: "Auction Test Item", basePrice: 100 },
    });
    itemId = item.id;

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "auc-admin@test.com", password: "admin123" });
    adminToken = adminLogin.body.accessToken;

    const teamLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "auc-team@test.com", password: "team123" });
    teamToken = teamLogin.body.accessToken;
  });

  afterEach(() => {
    stopTimer();
  });

  afterAll(async () => {
    stopTimer();
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  describe("POST /api/auction/start", () => {
    it("should start an auction", async () => {
      const res = await request(app)
        .post("/api/auction/start")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ itemId });

      expect(res.status).toBe(200);
      expect(res.body.phase).toBe("OPEN");
      expect(res.body.auctionId).toBeDefined();
      expect(res.body.timeRemaining).toBe(180);

      // Clean up - stop auction
      await request(app)
        .post("/api/auction/stop")
        .set("Authorization", `Bearer ${adminToken}`);
    });

    it("should reject team role", async () => {
      const res = await request(app)
        .post("/api/auction/start")
        .set("Authorization", `Bearer ${teamToken}`)
        .send({ itemId });

      expect(res.status).toBe(403);
    });

    it("should reject non-existent item", async () => {
      const res = await request(app)
        .post("/api/auction/start")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ itemId: "nonexistent" });

      expect(res.status).toBe(404);
    });

    it("should reject if auction already active", async () => {
      // Start one auction
      await request(app)
        .post("/api/auction/start")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ itemId });

      // Try starting another
      const item2 = await prisma.item.create({
        data: { title: "Another Item", basePrice: 50 },
      });

      const res = await request(app)
        .post("/api/auction/start")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ itemId: item2.id });

      expect(res.status).toBe(400);

      // Clean up
      await request(app)
        .post("/api/auction/stop")
        .set("Authorization", `Bearer ${adminToken}`);
      await prisma.item.delete({ where: { id: item2.id } });
    });
  });

  describe("POST /api/auction/stop", () => {
    it("should stop an active auction", async () => {
      // Reset item status for new auction
      await prisma.item.update({
        where: { id: itemId },
        data: { status: "PENDING" },
      });
      await prisma.auction.deleteMany();

      await request(app)
        .post("/api/auction/start")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ itemId });

      const res = await request(app)
        .post("/api/auction/stop")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Auction stopped");
    });

    it("should fail if no active auction", async () => {
      const res = await request(app)
        .post("/api/auction/stop")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auction/status", () => {
    it("should return no active auction", async () => {
      const res = await request(app)
        .get("/api/auction/status")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(false);
    });
  });

  describe("GET /api/auction/timer", () => {
    it("should return no active timer", async () => {
      const res = await request(app)
        .get("/api/auction/timer")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(false);
    });
  });

  describe("resolveAuction (engine)", () => {
    it("should calculate winner and deductions correctly", async () => {
      // Reset
      await prisma.bid.deleteMany();
      await prisma.auction.deleteMany();
      await prisma.user.deleteMany({ where: { email: { startsWith: "resolve-" } } });
      await prisma.team.deleteMany({
        where: { name: { startsWith: "Resolve" } },
      });

      // Create teams
      const teamA = await prisma.team.create({
        data: { name: "Resolve Team A", money: 5000 },
      });
      const teamB = await prisma.team.create({
        data: { name: "Resolve Team B", money: 8000 },
      });
      const teamC = await prisma.team.create({
        data: { name: "Resolve Team C", money: 6000 },
      });

      // Reset item
      await prisma.item.update({
        where: { id: itemId },
        data: { status: "ACTIVE" },
      });

      // Create auction
      const auction = await prisma.auction.create({
        data: {
          itemId,
          phase: "CLOSED",
          startTime: new Date(),
          endTime: new Date(),
        },
      });

      // Create bids: B has highest at 3000, A and C lower
      await prisma.bid.create({
        data: {
          teamId: teamA.id,
          auctionId: auction.id,
          amount: 2000,
          timestamp: new Date("2026-01-01T00:00:01Z"),
        },
      });
      await prisma.bid.create({
        data: {
          teamId: teamB.id,
          auctionId: auction.id,
          amount: 3000,
          timestamp: new Date("2026-01-01T00:00:02Z"),
        },
      });
      await prisma.bid.create({
        data: {
          teamId: teamC.id,
          auctionId: auction.id,
          amount: 1500,
          timestamp: new Date("2026-01-01T00:00:03Z"),
        },
      });

      const result = await resolveAuction(auction.id, itemId);

      // Winner should be Team B (highest bid 3000)
      expect(result.winner).not.toBeNull();
      expect(result.winner!.teamName).toBe("Resolve Team B");
      expect(result.winner!.amount).toBe(3000);

      // Verify Team B money deducted and eliminated
      const updatedB = await prisma.team.findUnique({
        where: { id: teamB.id },
      });
      expect(updatedB!.money).toBe(5000); // 8000 - 3000
      expect(updatedB!.isEliminated).toBe(true);

      // Verify losers lost 10%
      const updatedA = await prisma.team.findUnique({
        where: { id: teamA.id },
      });
      expect(updatedA!.money).toBe(4500); // 5000 - 500 (10%)

      const updatedC = await prisma.team.findUnique({
        where: { id: teamC.id },
      });
      expect(updatedC!.money).toBe(5400); // 6000 - 600 (10%)

      // Verify item marked as SOLD
      const updatedItem = await prisma.item.findUnique({
        where: { id: itemId },
      });
      expect(updatedItem!.status).toBe("SOLD");

      expect(result.losers).toHaveLength(2);
    });

    it("should handle tie-breaking by earliest timestamp", async () => {
      await prisma.bid.deleteMany();
      await prisma.auction.deleteMany();
      await prisma.team.deleteMany({
        where: { name: { startsWith: "Tie" } },
      });

      const tieTeamA = await prisma.team.create({
        data: { name: "Tie Team A", money: 5000 },
      });
      const tieTeamB = await prisma.team.create({
        data: { name: "Tie Team B", money: 5000 },
      });

      const tieItem = await prisma.item.create({
        data: { title: "Tie Item", basePrice: 100, status: "ACTIVE" },
      });

      const auction = await prisma.auction.create({
        data: {
          itemId: tieItem.id,
          phase: "CLOSED",
          startTime: new Date(),
          endTime: new Date(),
        },
      });

      // Same amount, Team A bid earlier
      await prisma.bid.create({
        data: {
          teamId: tieTeamA.id,
          auctionId: auction.id,
          amount: 2000,
          timestamp: new Date("2026-01-01T00:00:01Z"),
        },
      });
      await prisma.bid.create({
        data: {
          teamId: tieTeamB.id,
          auctionId: auction.id,
          amount: 2000,
          timestamp: new Date("2026-01-01T00:00:05Z"),
        },
      });

      const result = await resolveAuction(auction.id, tieItem.id);

      // Team A should win (earlier timestamp)
      expect(result.winner!.teamName).toBe("Tie Team A");
    });

    it("should handle no bids", async () => {
      await prisma.bid.deleteMany();
      await prisma.auction.deleteMany();

      const noBidItem = await prisma.item.create({
        data: { title: "No Bid Item", basePrice: 100, status: "ACTIVE" },
      });

      const auction = await prisma.auction.create({
        data: {
          itemId: noBidItem.id,
          phase: "CLOSED",
          startTime: new Date(),
          endTime: new Date(),
        },
      });

      const result = await resolveAuction(auction.id, noBidItem.id);
      expect(result.winner).toBeNull();
      expect(result.losers).toEqual([]);
    });
  });
});
