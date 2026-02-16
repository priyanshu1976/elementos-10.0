import prisma from "../../lib/prisma";

export interface AuctionState {
  auctionId: string;
  phase: "OPEN" | "FINAL" | "CLOSED";
  timeRemaining: number; // seconds
  itemId: string;
}

type PhaseCallback = (state: AuctionState) => void;
type ResultCallback = (result: AuctionResult) => void;

export interface AuctionResult {
  auctionId: string;
  itemId: string;
  winner: { teamId: string; teamName: string; amount: number } | null;
  losers: Array<{ teamId: string; teamName: string; penalty: number }>;
}

const OPEN_DURATION = 180; // 3 minutes
const FINAL_DURATION = 60; // 1 minute

let currentTimer: ReturnType<typeof setInterval> | null = null;
let currentAuctionId: string | null = null;
let onTick: PhaseCallback | null = null;
let onPhaseChange: PhaseCallback | null = null;
let onResult: ResultCallback | null = null;

export function setCallbacks(callbacks: {
  onTick?: PhaseCallback;
  onPhaseChange?: PhaseCallback;
  onResult?: ResultCallback;
}) {
  if (callbacks.onTick) onTick = callbacks.onTick;
  if (callbacks.onPhaseChange) onPhaseChange = callbacks.onPhaseChange;
  if (callbacks.onResult) onResult = callbacks.onResult;
}

export async function startAuction(itemId: string): Promise<AuctionState> {
  // Stop existing auction if any
  stopTimer();

  const now = new Date();
  const endTime = new Date(now.getTime() + OPEN_DURATION * 1000);

  // Mark item as ACTIVE
  await prisma.item.update({
    where: { id: itemId },
    data: { status: "ACTIVE" },
  });

  const auction = await prisma.auction.create({
    data: {
      itemId,
      phase: "OPEN",
      startTime: now,
      endTime,
    },
  });

  currentAuctionId = auction.id;

  const state: AuctionState = {
    auctionId: auction.id,
    phase: "OPEN",
    timeRemaining: OPEN_DURATION,
    itemId,
  };

  startTimer(state);

  if (onPhaseChange) onPhaseChange(state);

  return state;
}

function startTimer(state: AuctionState) {
  stopTimer();

  let remaining = state.timeRemaining;

  currentTimer = setInterval(async () => {
    remaining--;

    const tickState: AuctionState = {
      ...state,
      timeRemaining: remaining,
    };

    if (onTick) onTick(tickState);

    if (remaining <= 0) {
      stopTimer();

      if (state.phase === "OPEN") {
        await transitionToFinal(state.auctionId, state.itemId);
      } else if (state.phase === "FINAL") {
        await closeAuction(state.auctionId, state.itemId);
      }
    }
  }, 1000);
}

async function transitionToFinal(auctionId: string, itemId: string) {
  const now = new Date();
  const finalEnd = new Date(now.getTime() + FINAL_DURATION * 1000);

  await prisma.auction.update({
    where: { id: auctionId },
    data: { phase: "FINAL", finalEndTime: finalEnd },
  });

  const state: AuctionState = {
    auctionId,
    phase: "FINAL",
    timeRemaining: FINAL_DURATION,
    itemId,
  };

  if (onPhaseChange) onPhaseChange(state);

  startTimer(state);
}

async function closeAuction(auctionId: string, itemId: string) {
  await prisma.auction.update({
    where: { id: auctionId },
    data: { phase: "CLOSED" },
  });

  const result = await resolveAuction(auctionId, itemId);

  const state: AuctionState = {
    auctionId,
    phase: "CLOSED",
    timeRemaining: 0,
    itemId,
  };

  if (onPhaseChange) onPhaseChange(state);
  if (onResult && result) onResult(result);

  currentAuctionId = null;
}

export async function resolveAuction(
  auctionId: string,
  itemId: string
): Promise<AuctionResult> {
  // Get all bids for this auction, ordered by amount desc then timestamp asc
  const bids = await prisma.bid.findMany({
    where: { auctionId },
    include: { team: true },
    orderBy: [{ amount: "desc" }, { timestamp: "asc" }],
  });

  const result: AuctionResult = {
    auctionId,
    itemId,
    winner: null,
    losers: [],
  };

  if (bids.length === 0) {
    return result;
  }

  // Winner is highest bid; ties broken by earliest timestamp
  const winnerBid = bids[0];

  // Deduct winner's bid amount
  await prisma.team.update({
    where: { id: winnerBid.teamId },
    data: {
      money: { decrement: winnerBid.amount },
      isEliminated: true,
    },
  });

  result.winner = {
    teamId: winnerBid.teamId,
    teamName: winnerBid.team.name,
    amount: winnerBid.amount,
  };

  // Deduct 10% from losers
  const loserBids = bids.slice(1);
  for (const bid of loserBids) {
    const penalty = bid.team.money * 0.1;
    await prisma.team.update({
      where: { id: bid.teamId },
      data: { money: { decrement: penalty } },
    });
    result.losers.push({
      teamId: bid.teamId,
      teamName: bid.team.name,
      penalty,
    });
  }

  // Mark item as SOLD
  await prisma.item.update({
    where: { id: itemId },
    data: { status: "SOLD" },
  });

  return result;
}

export function stopTimer() {
  if (currentTimer) {
    clearInterval(currentTimer);
    currentTimer = null;
  }
}

export async function forceStop(): Promise<void> {
  stopTimer();
  if (currentAuctionId) {
    await prisma.auction.update({
      where: { id: currentAuctionId },
      data: { phase: "CLOSED" },
    });
    currentAuctionId = null;
  }
}

export function getCurrentAuctionId(): string | null {
  return currentAuctionId;
}

export async function getAuctionStatus() {
  if (!currentAuctionId) {
    return null;
  }

  const auction = await prisma.auction.findUnique({
    where: { id: currentAuctionId },
    include: { item: true },
  });

  return auction;
}

export async function getAuctionResult(auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      item: true,
      bids: {
        include: { team: true },
        orderBy: [{ amount: "desc" }, { timestamp: "asc" }],
      },
    },
  });

  if (!auction) return null;

  const winner = auction.bids[0] ?? null;

  return {
    auction: {
      id: auction.id,
      phase: auction.phase,
      itemTitle: auction.item.title,
    },
    winner: winner
      ? {
          teamName: winner.team.name,
          amount: winner.amount,
        }
      : null,
    bids: auction.bids.map((b) => ({
      teamName: b.team.name,
      amount: b.amount,
      timestamp: b.timestamp,
    })),
  };
}
