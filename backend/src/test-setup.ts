import { beforeAll, afterAll } from "vitest";
import prisma from "./lib/prisma";

beforeAll(async () => {
  // Clean up test data before running tests
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
