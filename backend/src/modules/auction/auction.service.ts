import prisma from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import * as engine from "./auction.engine";

export async function start(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("Item not found");
  if (item.status === "SOLD") throw new BadRequestError("Item already sold");

  // Check no active auction
  const active = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "FINAL"] } },
  });
  if (active) throw new BadRequestError("An auction is already active");

  return engine.startAuction(itemId);
}

export async function stop() {
  const auctionId = engine.getCurrentAuctionId();
  if (!auctionId) throw new BadRequestError("No active auction");

  await engine.forceStop();
  return { message: "Auction stopped" };
}

export async function status() {
  const auction = await engine.getAuctionStatus();
  if (!auction) return { active: false };

  return {
    active: true,
    id: auction.id,
    phase: auction.phase,
    itemTitle: auction.item.title,
    startTime: auction.startTime,
    endTime: auction.endTime,
    finalEndTime: auction.finalEndTime,
  };
}

export async function timer() {
  const auctionId = engine.getCurrentAuctionId();
  if (!auctionId) return { active: false, timeRemaining: 0 };

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });
  if (!auction) return { active: false, timeRemaining: 0 };

  const now = Date.now();
  const endRef =
    auction.phase === "FINAL" && auction.finalEndTime
      ? auction.finalEndTime.getTime()
      : auction.endTime.getTime();

  const remaining = Math.max(0, Math.ceil((endRef - now) / 1000));

  return { active: true, phase: auction.phase, timeRemaining: remaining };
}

export async function result(auctionId: string) {
  const res = await engine.getAuctionResult(auctionId);
  if (!res) throw new NotFoundError("Auction not found");
  return res;
}

export async function restart(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("Item not found");

  // Reset item status
  await prisma.item.update({
    where: { id: itemId },
    data: { status: "PENDING" },
  });

  return engine.startAuction(itemId);
}
