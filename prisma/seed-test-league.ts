import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create two users
  const [alice, bob] = await Promise.all([
    prisma.user.upsert({
      where: { email: "alice@test.com" },
      create: {
        email: "alice@test.com",
        name: "Alice",
        passwordHash: await hash("password", 12),
      },
      update: {},
    }),
    prisma.user.upsert({
      where: { email: "bob@test.com" },
      create: {
        email: "bob@test.com",
        name: "Bob",
        passwordHash: await hash("password", 12),
      },
      update: {},
    }),
  ]);

  // Create league (Alice is commissioner)
  const league = await prisma.league.create({
    data: {
      name: "Test League 2026",
      inviteCode: "TESTCODE",
      seasonYear: 2026,
      commissionerId: alice.id,
    },
  });

  // Create draft shell
  await prisma.draft.create({
    data: { leagueId: league.id },
  });

  // Create teams
  await Promise.all([
    prisma.team.create({
      data: { leagueId: league.id, userId: alice.id, teamName: "Alice's XI" },
    }),
    prisma.team.create({
      data: { leagueId: league.id, userId: bob.id, teamName: "Bob's XI" },
    }),
  ]);

  console.log(`
League:  "${league.name}"  (id: ${league.id})
Invite:  TESTCODE

Users (password: "password"):
  alice@test.com  → Alice's XI  (commissioner)
  bob@test.com    → Bob's XI

Login at http://localhost:3001/login and go to /draft/${league.id} to start.
  `);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
