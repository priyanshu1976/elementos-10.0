import bcrypt from "bcrypt";
import prisma from "../../lib/prisma";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../../lib/errors";

export async function createTeam(data: {
  name: string;
  leaderEmail: string;
  password: string;
  money?: number;
}) {
  const existingTeam = await prisma.team.findUnique({
    where: { name: data.name },
  });
  if (existingTeam) throw new ConflictError("Team name already exists");

  const existingUser = await prisma.user.findUnique({
    where: { email: data.leaderEmail },
  });
  if (existingUser) throw new ConflictError("Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 10);

  const team = await prisma.team.create({
    data: { name: data.name, money: data.money ?? 10000 },
  });

  await prisma.user.create({
    data: {
      email: data.leaderEmail,
      passwordHash,
      role: "TEAM",
      teamId: team.id,
    },
  });

  return team;
}

export async function getTeams() {
  return prisma.team.findMany({
    include: {
      user: { select: { email: true } },
      _count: { select: { bids: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateTeamMoney(teamId: string, money: number) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");

  return prisma.team.update({
    where: { id: teamId },
    data: { money },
  });
}

export async function deleteTeam(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");

  // Delete user first (cascade will handle it but being explicit)
  await prisma.user.deleteMany({ where: { teamId } });
  return prisma.team.delete({ where: { id: teamId } });
}

export async function placeBidForTeam(teamId: string, amount: number) {
  const bidService = await import("../bid/bid.service");

  // Check if team already has a bid - update instead of create
  const auction = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "REVEAL", "FINAL"] } },
  });
  if (!auction) throw new BadRequestError("No active auction");

  const existingBid = await prisma.bid.findUnique({
    where: { teamId_auctionId: { teamId, auctionId: auction.id } },
  });

  if (existingBid) {
    return bidService.updateBid(teamId, amount);
  }
  return bidService.placeBid(teamId, amount);
}

export async function getLiveBids() {
  const auction = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "REVEAL", "FINAL"] } },
    include: {
      item: true,
      bids: {
        include: { team: true },
        orderBy: { amount: "desc" },
      },
    },
    orderBy: { startTime: "desc" },
  });

  if (!auction) return { auction: null, bids: [] };

  return {
    auction: {
      id: auction.id,
      phase: auction.phase,
      itemTitle: auction.item.title,
      startTime: auction.startTime,
      endTime: auction.endTime,
    },
    bids: auction.bids.map((bid) => ({
      id: bid.id,
      teamName: bid.team.name,
      amount: bid.amount,
      timestamp: bid.timestamp,
    })),
  };
}
