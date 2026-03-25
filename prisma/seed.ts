import { PrismaClient, PlayerRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Picks required = teams × rosterSize (default roster 15). Six teams need 90 players;
 * the old pool of 80 was too small. We seed two UTC years so leagues created with a
 * different `seasonYear` still find a pool after `db:seed`.
 */
const PLAYERS_PER_SEASON = 200;
const SEASON_YEARS = [
  new Date().getUTCFullYear(),
  new Date().getUTCFullYear() - 1,
] as const;

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

/** Higher consensus rank (lower index) → higher mock salary (auction-style). */
function mockListPrice(rankIndex: number): number {
  return Math.max(5, 180 - rankIndex);
}

async function main() {
  let total = 0;
  for (const seasonYear of SEASON_YEARS) {
    for (let i = 1; i <= PLAYERS_PER_SEASON; i++) {
      const externalId = `mock-${seasonYear}-${String(i).padStart(3, "0")}`;
      const roles = [ROLE_CYCLE[(i - 1) % ROLE_CYCLE.length]];
      const franchise = FRANCHISES[(i - 1) % FRANCHISES.length];
      const listPrice = mockListPrice(i);
      await prisma.player.upsert({
        where: { externalId },
        create: {
          externalId,
          name: mockName(i),
          franchise,
          roles,
          consensusRank: i,
          listPrice,
          active: true,
          seasonYear,
        },
        update: {
          name: mockName(i),
          franchise,
          roles,
          consensusRank: i,
          listPrice,
          active: true,
          seasonYear,
        },
      });
      total += 1;
    }
    console.log(
      `Seeded ${PLAYERS_PER_SEASON} mock players for season ${seasonYear} (e.g. ${externalIdSample(seasonYear)}).`,
    );
  }

  console.log(`Total mock player rows upserted: ${total}.`);
}

function externalIdSample(year: number): string {
  return `mock-${year}-001 … mock-${year}-${String(PLAYERS_PER_SEASON).padStart(3, "0")}`;
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
