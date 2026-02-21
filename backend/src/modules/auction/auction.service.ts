import prisma from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import * as engine from "./auction.engine";

export async function start(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("Item not found");
  if (item.status === "SOLD") throw new BadRequestError("Item already sold");

  const active = await prisma.auction.findFirst({
    where: { phase: { in: ["OPEN", "REVEAL", "FINAL"] } },
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

export async function pause() {
  const result = engine.pause();
  if (!result) throw new BadRequestError("Cannot pause (no active timer or already paused)");
  return { message: "Auction paused" };
}

export async function resume() {
  const result = engine.resume();
  if (!result) throw new BadRequestError("Cannot resume (not paused)");
  return { message: "Auction resumed" };
}

export async function startFinal() {
  try {
    return await engine.startFinalPhase();
  } catch (err: any) {
    throw new BadRequestError(err.message);
  }
}

export async function status() {
  const auction = await engine.getAuctionStatus();
  if (!auction) return { active: false };

  const isPaused = engine.getIsPaused();
  const currentWinner = await engine.getCurrentWinner();

  return {
    active: true,
    id: auction.id,
    phase: auction.phase,
    itemTitle: auction.item.title,
    itemDescription: auction.item.description,
    itemImageUrl: auction.item.imageUrl,
    startTime: auction.startTime,
    endTime: auction.endTime,
    finalEndTime: auction.finalEndTime,
    paused: isPaused,
    currentWinner: currentWinner?.teamName || null,
  };
}

export async function timer() {
  const auctionId = engine.getCurrentAuctionId();
  if (!auctionId) return { active: false, timeRemaining: 0 };

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });
  if (!auction) return { active: false, timeRemaining: 0 };

  const isPaused = engine.getIsPaused();

  if (auction.phase === "REVEAL") {
    return { active: true, phase: "REVEAL", timeRemaining: 0, paused: false };
  }

  const now = Date.now();
  const endRef =
    auction.phase === "FINAL" && auction.finalEndTime
      ? auction.finalEndTime.getTime()
      : auction.endTime.getTime();

  const remaining = Math.max(0, Math.ceil((endRef - now) / 1000));

  return { active: true, phase: auction.phase, timeRemaining: remaining, paused: isPaused };
}

export async function result(auctionId: string) {
  const res = await engine.getAuctionResult(auctionId);
  if (!res) throw new NotFoundError("Auction not found");
  return res;
}

export async function restart(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("Item not found");

  await prisma.item.update({
    where: { id: itemId },
    data: { status: "PENDING" },
  });

  return engine.startAuction(itemId);
}
