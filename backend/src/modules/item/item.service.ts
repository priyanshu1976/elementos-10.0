import prisma from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { ItemStatus } from "@prisma/client";

export async function createItem(data: {
  title: string;
  description?: string;
  basePrice: number;
}) {
  return prisma.item.create({ data });
}

export async function getCurrentItem() {
  return prisma.item.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAllItems() {
  return prisma.item.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateItem(
  itemId: string,
  data: { title?: string; description?: string; basePrice?: number; status?: ItemStatus }
) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("Item not found");

  return prisma.item.update({ where: { id: itemId }, data });
}

export async function deleteItem(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("Item not found");

  return prisma.item.delete({ where: { id: itemId } });
}
