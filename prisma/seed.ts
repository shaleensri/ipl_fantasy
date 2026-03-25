import { PrismaClient, PlayerRole } from "@prisma/client";

const prisma = new PrismaClient();

/** Default mock pool size — enough for small leagues at default roster (15). */
const MOCK_PLAYER_COUNT = 80;
const SEASON_YEAR = new Date().getUTCFullYear();

const FRANCHISES = [
  "CSK",
  "MI",
  "RCB",
  "KKR",
  "SRH",
  "DC",
  "RR",
  "PBKS",
  "LSG",
  "GT",
] as const;

const ROLE_CYCLE: PlayerRole[] = [
  "BATTER",
  "BOWLER",
  "ALL_ROUNDER",
  "KEEPER",
];

function mockName(index: number): string {
  return `Mock Player ${String(index).padStart(3, "0")}`;
}

async function main() {
  for (let i = 1; i <= MOCK_PLAYER_COUNT; i++) {
    const externalId = `mock-${SEASON_YEAR}-${String(i).padStart(3, "0")}`;
    const roles = [ROLE_CYCLE[(i - 1) % ROLE_CYCLE.length]];
    const franchise = FRANCHISES[(i - 1) % FRANCHISES.length];
    await prisma.player.upsert({
      where: { externalId },
      create: {
        externalId,
        name: mockName(i),
        franchise,
        roles,
        consensusRank: i,
        active: true,
        seasonYear: SEASON_YEAR,
      },
      update: {
        name: mockName(i),
        franchise,
        roles,
        consensusRank: i,
        active: true,
        seasonYear: SEASON_YEAR,
      },
    });
  }

  console.log(
    `Seeded ${MOCK_PLAYER_COUNT} mock players for season ${SEASON_YEAR} (externalId mock-${SEASON_YEAR}-001 …).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
