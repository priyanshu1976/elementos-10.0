import { Request, Response, NextFunction } from "express";
import * as teamService from "./team.service";
import { BadRequestError } from "../../lib/errors";

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.teamId) throw new BadRequestError("No team associated");
    const result = await teamService.getProfile(req.user.teamId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMoney(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.teamId) throw new BadRequestError("No team associated");
    const result = await teamService.getMoney(req.user.teamId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.teamId) throw new BadRequestError("No team associated");
    const result = await teamService.getStatus(req.user.teamId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.teamId) throw new BadRequestError("No team associated");
    const result = await teamService.getHistory(req.user.teamId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function eliminate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { teamId } = req.params;
    const result = await teamService.eliminate(teamId);
    res.json({ message: "Team eliminated", team: result });
  } catch (err) {
    next(err);
  }
}
