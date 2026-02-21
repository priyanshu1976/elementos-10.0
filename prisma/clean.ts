import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...\n");

  const bid = await prisma.bid.deleteMany();
  console.log(`  Deleted ${bid.count} bids`);

  const auction = await prisma.auction.deleteMany();
  console.log(`  Deleted ${auction.count} auctions`);

  const user = await prisma.user.deleteMany();
  console.log(`  Deleted ${user.count} users`);

  const team = await prisma.team.deleteMany();
  console.log(`  Deleted ${team.count} teams`);

  const item = await prisma.item.deleteMany();
  console.log(`  Deleted ${item.count} items`);

  console.log("\nDatabase cleaned!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
