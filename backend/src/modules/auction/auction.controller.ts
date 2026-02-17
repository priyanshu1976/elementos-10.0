import { Request, Response, NextFunction } from "express";
import * as auctionService from "./auction.service";

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const { itemId } = req.body;
    const result = await auctionService.start(itemId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function stop(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auctionService.stop();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function pause(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auctionService.pause();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resume(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auctionService.resume();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function startFinal(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auctionService.startFinal();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function status(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await auctionService.status();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function timer(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await auctionService.timer();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function result(req: Request, res: Response, next: NextFunction) {
  try {
    const auctionId = req.params.auctionId as string;
    const data = await auctionService.result(auctionId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function restart(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { itemId } = req.body;
    const result = await auctionService.restart(itemId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
