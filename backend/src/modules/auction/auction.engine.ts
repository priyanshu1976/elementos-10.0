import prisma from "../../lib/prisma";

export interface AuctionState {
  auctionId: string;
  phase: "OPEN" | "REVEAL" | "FINAL" | "CLOSED";
  timeRemaining: number; // seconds
  itemId: string;
  paused?: boolean;
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
let currentPhase: "OPEN" | "REVEAL" | "FINAL" | "CLOSED" = "OPEN";
let currentItemId: string | null = null;
let isPaused = false;

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
  stopTimer();
  isPaused = false;

  const now = new Date();
  const endTime = new Date(now.getTime() + OPEN_DURATION * 1000);

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
  currentPhase = "OPEN";
  currentItemId = itemId;

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
    if (isPaused) return;

    remaining--;

    const tickState: AuctionState = {
      ...state,
      timeRemaining: remaining,
    };

    if (onTick) onTick(tickState);

    if (remaining <= 0) {
      stopTimer();

      if (state.phase === "OPEN") {
        await transitionToReveal(state.auctionId, state.itemId);
      } else if (state.phase === "FINAL") {
        await closeAuction(state.auctionId, state.itemId);
      }
    }
  }, 1000);
}

// After OPEN ends, go to REVEAL: shows winner name only, waits for admin to start FINAL
async function transitionToReveal(auctionId: string, itemId: string) {
  await prisma.auction.update({
    where: { id: auctionId },
    data: { phase: "REVEAL" },
  });

  currentPhase = "REVEAL";
  isPaused = false;

  const state: AuctionState = {
    auctionId,
    phase: "REVEAL",
    timeRemaining: 0,
    itemId,
  };

  if (onPhaseChange) onPhaseChange(state);
}

// Admin manually triggers FINAL phase from REVEAL
export async function startFinalPhase(): Promise<AuctionState> {
  if (!currentAuctionId || !currentItemId) {
    throw new Error("No active auction");
  }
  if (currentPhase !== "REVEAL") {
    throw new Error("Can only start final phase from REVEAL");
  }

  const now = new Date();
  const finalEnd = new Date(now.getTime() + FINAL_DURATION * 1000);

  await prisma.auction.update({
    where: { id: currentAuctionId },
    data: { phase: "FINAL", finalEndTime: finalEnd },
  });

  currentPhase = "FINAL";
  isPaused = false;

  const state: AuctionState = {
    auctionId: currentAuctionId,
    phase: "FINAL",
    timeRemaining: FINAL_DURATION,
    itemId: currentItemId,
  };

  if (onPhaseChange) onPhaseChange(state);

  startTimer(state);

  return state;
}

// Pause timer during OPEN or FINAL
export function pause(): AuctionState | null {
  if (!currentAuctionId || !currentItemId) return null;
  if (isPaused) return null;
  if (currentPhase !== "OPEN" && currentPhase !== "FINAL") return null;

  isPaused = true;

  const state: AuctionState = {
    auctionId: currentAuctionId,
    phase: currentPhase,
    timeRemaining: 0,
    itemId: currentItemId,
    paused: true,
  };

  if (onPhaseChange) onPhaseChange(state);

  return state;
}

// Resume timer
export function resume(): AuctionState | null {
  if (!currentAuctionId || !currentItemId) return null;
  if (!isPaused) return null;

  isPaused = false;

  const state: AuctionState = {
    auctionId: currentAuctionId,
    phase: currentPhase,
    timeRemaining: 0,
    itemId: currentItemId,
    paused: false,
  };

  if (onPhaseChange) onPhaseChange(state);

  return state;
}

export function getIsPaused(): boolean {
  return isPaused;
}

async function closeAuction(auctionId: string, itemId: string) {
  await prisma.auction.update({
    where: { id: auctionId },
    data: { phase: "CLOSED" },
  });

  currentPhase = "CLOSED";

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
  currentItemId = null;
}

export async function resolveAuction(
  auctionId: string,
  itemId: string
): Promise<AuctionResult> {
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

  const winnerBid = bids[0];

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
  isPaused = false;
  currentPhase = "CLOSED";
  if (currentAuctionId) {
    await prisma.auction.update({
      where: { id: currentAuctionId },
      data: { phase: "CLOSED" },
    });
    currentAuctionId = null;
    currentItemId = null;
  }
}

export function getCurrentAuctionId(): string | null {
  return currentAuctionId;
}

export function getCurrentPhase(): string {
  return currentPhase;
}

export async function getAuctionStatus() {
  if (!currentAuctionId) return null;

  const auction = await prisma.auction.findUnique({
    where: { id: currentAuctionId },
    include: { item: true },
  });

  return auction;
}

export async function getCurrentWinner(): Promise<{ teamName: string } | null> {
  if (!currentAuctionId) return null;

  const highest = await prisma.bid.findFirst({
    where: { auctionId: currentAuctionId },
    orderBy: [{ amount: "desc" }, { timestamp: "asc" }],
    include: { team: { select: { name: true } } },
  });

  if (!highest) return null;

  return { teamName: highest.team.name };
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
