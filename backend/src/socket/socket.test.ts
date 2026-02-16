import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import bcrypt from "bcrypt";
import app from "../app";
import { initSocket } from "./index";
import prisma from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";

describe("Socket.io Realtime", () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;
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
    const admin = await prisma.user.create({
      data: {
        email: "socket-admin@test.com",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });
    adminToken = signAccessToken({
      userId: admin.id,
      role: "ADMIN",
    });

    // Create team
    const team = await prisma.team.create({
      data: { name: "Socket Team", money: 10000 },
    });
    const teamHash = await bcrypt.hash("team123", 10);
    const teamUser = await prisma.user.create({
      data: {
        email: "socket-team@test.com",
        passwordHash: teamHash,
        role: "TEAM",
        teamId: team.id,
      },
    });
    teamToken = signAccessToken({
      userId: teamUser.id,
      role: "TEAM",
      teamId: team.id,
    });

    // Start HTTP server on random port
    httpServer = createServer(app);
    initSocket(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  function createClient(token: string): ClientSocket {
    return ioClient(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });
  }

  it("should connect with valid token", async () => {
    const client = createClient(teamToken);

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
      client.on("connect_error", (err) => {
        client.disconnect();
        reject(err);
      });
    });
  });

  it("should reject connection with invalid token", async () => {
    const client = createClient("invalid-token");

    await new Promise<void>((resolve) => {
      client.on("connect_error", (err) => {
        expect(err.message).toContain("Invalid token");
        client.disconnect();
        resolve();
      });
      client.on("connect", () => {
        client.disconnect();
        resolve();
      });
    });
  });

  it("should reject connection without token", async () => {
    const client = ioClient(`http://localhost:${port}`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      client.on("connect_error", (err) => {
        expect(err.message).toContain("Authentication required");
        client.disconnect();
        resolve();
      });
      client.on("connect", () => {
        client.disconnect();
        resolve();
      });
    });
  });

  it("should allow admin to connect", async () => {
    const client = createClient(adminToken);

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
      client.on("connect_error", (err) => {
        client.disconnect();
        reject(err);
      });
    });
  });
});
