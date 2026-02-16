import { Request, Response, NextFunction } from "express";
import * as itemService from "./item.service";

export async function createItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await itemService.createItem(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCurrentItem(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await itemService.getCurrentItem();
    res.json(result ?? { message: "No active item" });
  } catch (err) {
    next(err);
  }
}

export async function getAllItems(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await itemService.getAllItems();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { itemId } = req.params;
    const result = await itemService.updateItem(itemId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { itemId } = req.params;
    await itemService.deleteItem(itemId);
    res.json({ message: "Item deleted" });
  } catch (err) {
    next(err);
  }
}
