import prisma from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { emitBidUpdate } from "../../socket";

export async function placeBid(teamId: string, amount: number) {
  // Find active auction
  const auction = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "FINAL"] } },
    include: { item: true },
  });
  if (!auction) throw new BadRequestError("No active auction");

  // Check team exists and is not eliminated
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");
  if (team.isEliminated) throw new BadRequestError("Team is eliminated");

  // Validate bid amount
  if (amount < auction.item.basePrice) {
    throw new BadRequestError(
      `Bid must be at least ${auction.item.basePrice}`
    );
  }
  if (amount > team.money) {
    throw new BadRequestError("Insufficient funds");
  }

  // Check if team already has a bid for this auction
  const existingBid = await prisma.bid.findUnique({
    where: { teamId_auctionId: { teamId, auctionId: auction.id } },
  });

  if (existingBid) {
    throw new BadRequestError(
      "You already have a bid. Use update to change it."
    );
  }

  const bid = await prisma.bid.create({
    data: {
      teamId,
      auctionId: auction.id,
      amount,
    },
  });

  emitBidUpdate({ teamName: team.name, amount, auctionId: auction.id });

  return bid;
}

export async function updateBid(teamId: string, amount: number) {
  const auction = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "FINAL"] } },
    include: { item: true },
  });
  if (!auction) throw new BadRequestError("No active auction");

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");
  if (team.isEliminated) throw new BadRequestError("Team is eliminated");

  if (amount < auction.item.basePrice) {
    throw new BadRequestError(
      `Bid must be at least ${auction.item.basePrice}`
    );
  }
  if (amount > team.money) {
    throw new BadRequestError("Insufficient funds");
  }

  const existingBid = await prisma.bid.findUnique({
    where: { teamId_auctionId: { teamId, auctionId: auction.id } },
  });

  if (!existingBid) {
    throw new NotFoundError("No existing bid to update");
  }

  const bid = await prisma.bid.update({
    where: { id: existingBid.id },
    data: { amount, timestamp: new Date() },
  });

  emitBidUpdate({ teamName: team.name, amount, auctionId: auction.id });

  return bid;
}

export async function getCurrentHighest() {
  const auction = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "FINAL"] } },
  });
  if (!auction) return null;

  const highest = await prisma.bid.findFirst({
    where: { auctionId: auction.id },
    orderBy: [{ amount: "desc" }, { timestamp: "asc" }],
    include: { team: { select: { name: true } } },
  });

  if (!highest) return { auctionId: auction.id, highest: null };

  return {
    auctionId: auction.id,
    highest: {
      amount: highest.amount,
      teamName: highest.team.name,
      timestamp: highest.timestamp,
    },
  };
}

export async function getTeamBid(teamId: string) {
  const auction = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "FINAL"] } },
  });
  if (!auction) return null;

  return prisma.bid.findUnique({
    where: { teamId_auctionId: { teamId, auctionId: auction.id } },
  });
}

export async function getBidHistory(auctionId: string) {
  return prisma.bid.findMany({
    where: { auctionId },
    include: { team: { select: { name: true } } },
    orderBy: [{ amount: "desc" }, { timestamp: "asc" }],
  });
}
