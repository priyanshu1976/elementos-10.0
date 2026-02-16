import prisma from "../../lib/prisma";
import { NotFoundError, ForbiddenError } from "../../lib/errors";

export async function getProfile(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");

  return {
    id: team.id,
    name: team.name,
    money: team.money,
    isEliminated: team.isEliminated,
    createdAt: team.createdAt,
  };
}

export async function getMoney(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");

  return { money: team.money };
}

export async function getStatus(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");

  return { isEliminated: team.isEliminated };
}

export async function getHistory(teamId: string) {
  const bids = await prisma.bid.findMany({
    where: { teamId },
    include: {
      auction: {
        include: { item: true },
      },
    },
    orderBy: { timestamp: "desc" },
  });

  return bids.map((bid) => ({
    id: bid.id,
    amount: bid.amount,
    timestamp: bid.timestamp,
    itemTitle: bid.auction.item.title,
    auctionPhase: bid.auction.phase,
  }));
}

export async function eliminate(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError("Team not found");

  return prisma.team.update({
    where: { id: teamId },
    data: { isEliminated: true },
  });
}
