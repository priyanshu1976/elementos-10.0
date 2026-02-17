import { Request, Response, NextFunction } from "express";
import * as adminService from "./admin.service";

export async function createTeam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await adminService.createTeam(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTeams(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await adminService.getTeams();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateTeamMoney(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const teamId = req.params.teamId as string;
    const { money } = req.body;
    const result = await adminService.updateTeamMoney(teamId, money);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteTeam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const teamId = req.params.teamId as string;
    await adminService.deleteTeam(teamId);
    res.json({ message: "Team deleted" });
  } catch (err) {
    next(err);
  }
}

export async function getLiveBids(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await adminService.getLiveBids();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function placeBidForTeam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { teamId, amount } = req.body;
    const result = await adminService.placeBidForTeam(teamId, amount);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
