import { Request, Response, NextFunction } from "express";
import * as bidService from "./bid.service";
import { BadRequestError } from "../../lib/errors";

export async function placeBid(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.teamId) throw new BadRequestError("No team associated");
    const { amount } = req.body;
    const result = await bidService.placeBid(req.user.teamId, amount);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateBid(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.teamId) throw new BadRequestError("No team associated");
    const { amount } = req.body;
    const result = await bidService.updateBid(req.user.teamId, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCurrentHighest(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await bidService.getCurrentHighest();
    res.json(result ?? { highest: null });
  } catch (err) {
    next(err);
  }
}

export async function getTeamBid(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.teamId) throw new BadRequestError("No team associated");
    const result = await bidService.getTeamBid(req.user.teamId);
    res.json(result ?? { bid: null });
  } catch (err) {
    next(err);
  }
}

export async function getBidHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const auctionId = req.params.auctionId as string;
    const result = await bidService.getBidHistory(auctionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
