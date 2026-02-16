import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../app";
import prisma from "../../lib/prisma";

describe("Item Module", () => {
  let adminToken: string;
  let teamToken: string;
  let createdItemId: string;

  beforeAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();

    const adminHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "item-admin@test.com",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });

    const team = await prisma.team.create({
      data: { name: "Item Test Team", money: 10000 },
    });
    const teamHash = await bcrypt.hash("team123", 10);
    await prisma.user.create({
      data: {
        email: "item-team@test.com",
        passwordHash: teamHash,
        role: "TEAM",
        teamId: team.id,
      },
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "item-admin@test.com", password: "admin123" });
    adminToken = adminLogin.body.accessToken;

    const teamLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "item-team@test.com", password: "team123" });
    teamToken = teamLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
  });

  describe("POST /api/item/create", () => {
    it("should create an item", async () => {
      const res = await request(app)
        .post("/api/item/create")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Gold Watch",
          description: "A luxury gold watch",
          basePrice: 500,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Gold Watch");
      expect(res.body.basePrice).toBe(500);
      expect(res.body.status).toBe("PENDING");
      createdItemId = res.body.id;
    });

    it("should reject team role", async () => {
      const res = await request(app)
        .post("/api/item/create")
        .set("Authorization", `Bearer ${teamToken}`)
        .send({
          title: "Silver Ring",
          basePrice: 200,
        });

      expect(res.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const res = await request(app)
        .post("/api/item/create")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "No Price" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/item/all", () => {
    it("should list all items", async () => {
      const res = await request(app)
        .get("/api/item/all")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("should be accessible by team", async () => {
      const res = await request(app)
        .get("/api/item/all")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/item/current", () => {
    it("should return no active item initially", async () => {
      const res = await request(app)
        .get("/api/item/current")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("No active item");
    });
  });

  describe("PATCH /api/item/update/:itemId", () => {
    it("should update item details", async () => {
      const res = await request(app)
        .patch(`/api/item/update/${createdItemId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Platinum Watch", status: "ACTIVE" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Platinum Watch");
      expect(res.body.status).toBe("ACTIVE");
    });

    it("should now return active item", async () => {
      const res = await request(app)
        .get("/api/item/current")
        .set("Authorization", `Bearer ${teamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Platinum Watch");
    });

    it("should return 404 for non-existent item", async () => {
      const res = await request(app)
        .patch("/api/item/update/nonexistent")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Ghost" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/item/delete/:itemId", () => {
    it("should delete an item", async () => {
      // Create item to delete
      const create = await request(app)
        .post("/api/item/create")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Deletable", basePrice: 100 });

      const res = await request(app)
        .delete(`/api/item/delete/${create.body.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Item deleted");
    });

    it("should return 404 for non-existent item", async () => {
      const res = await request(app)
        .delete("/api/item/delete/nonexistent")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
