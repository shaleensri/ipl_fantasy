import * as fs from "fs";
import * as path from "path";

export type PlayerRole = "BATTER" | "BOWLER" | "ALL_ROUNDER" | "KEEPER";

export interface CsvPlayer {
  id: string;
  externalId: string;
  name: string;
  franchise: string;
  roles: PlayerRole[];
  consensusRank: number;
  listPrice: number;
  seasonYear: number;
}

const TEAM_NAME_TO_FRANCHISE: Record<string, string> = {
  "Chennai Super Kings": "CSK",
  "Delhi Capitals": "DC",
  "Gujarat Titans": "GT",
  "Kolkata Knight Riders": "KKR",
  "Lucknow Super Giants": "LSG",
  "Mumbai Indians": "MI",
  "Punjab Kings": "PBKS",
  "Rajasthan Royals": "RR",
  "Royal Challengers Bengaluru": "RCB",
  "Sunrisers Hyderabad": "SRH",
};

const PLAYER_ROLES: Record<string, PlayerRole[]> = {
  "Kartik Sharma": ["BATTER"],
  "Prashant Veer": ["BOWLER"],
  "Rahul Chahar": ["BOWLER"],
  "Matt Henry": ["BOWLER"],
  "Akeal Hosein": ["BOWLER"],
  "Matthew Short": ["ALL_ROUNDER"],
  "Zak Foulkes": ["BOWLER"],
  "Sarfaraz Khan": ["BATTER"],
  "Aman Khan": ["BOWLER"],
  "Auqib Dar": ["BOWLER"],
  "Pathum Nissanka": ["BATTER"],
  "Kyle Jamieson": ["ALL_ROUNDER"],
  "Lungisani Ngidi": ["BOWLER"],
  "Ben Duckett": ["BATTER"],
  "David Miller": ["BATTER"],
  "Prithvi Shaw": ["BATTER"],
  "Sahil Parakh": ["BATTER"],
  "Jason Holder": ["ALL_ROUNDER"],
  "Tom Banton": ["BATTER", "KEEPER"],
  "Ashok Sharma": ["BOWLER"],
  "Luke Wood": ["BOWLER"],
  "Prithviraj Yarra": ["BOWLER"],
  "Cameron Green": ["ALL_ROUNDER"],
  "Matheesha Pathirana": ["BOWLER"],
  "Mustafizur Rahman": ["BOWLER"],
  "Tejasvi Singh": ["BATTER"],
  "Rachin Ravindra": ["ALL_ROUNDER"],
  "Finn Allen": ["BATTER"],
  "Tim Seifert": ["KEEPER"],
  "Akash Deep": ["BOWLER"],
  "Rahul Tripathi": ["BATTER"],
  "Daksh Kamra": ["BOWLER"],
  "Sarthak Ranjan": ["BATTER"],
  "Prashant Solanki": ["BOWLER"],
  "Kartik Tyagi": ["BOWLER"],
  "Josh Inglis": ["KEEPER", "BATTER"],
  "Mukul Choudhary": ["ALL_ROUNDER"],
  "Akshat Raghuwanshi": ["BATTER"],
  "Anrich Nortje": ["BOWLER"],
  "Wanindu Hasaranga": ["ALL_ROUNDER"],
  "Naman Tiwari": ["BOWLER"],
  "Quinton De Kock": ["KEEPER", "BATTER"],
  "Mayank Rawat": ["KEEPER"],
  "Atharva Ankolekar": ["ALL_ROUNDER"],
  "Mohammad Izhar": ["BOWLER"],
  "Danish Malewar": ["BATTER"],
  "Ben Dwarshuis": ["BOWLER"],
  "Cooper Connolly": ["ALL_ROUNDER"],
  "Vishal Nishad": ["BOWLER"],
  "Pravin Dubey": ["BOWLER"],
  "Ravi Bishnoi": ["BOWLER"],
  "Adam Milne": ["BOWLER"],
  "Ravi Singh": ["BOWLER"],
  "Sushant Mishra": ["BOWLER"],
  "Kuldeep Sen": ["BOWLER"],
  "Brijesh Sharma": ["BATTER"],
  "Aman Rao Perala": ["BATTER"],
  "Vignesh Puthur": ["BOWLER"],
  "Yash Raj Punja": ["BOWLER"],
  "Venkatesh Iyer": ["ALL_ROUNDER"],
  "Mangesh Yadav": ["BOWLER"],
  "Jacob Duffy": ["BOWLER"],
  "Jordan Cox": ["BATTER", "KEEPER"],
  "Kanishk Chouhan": ["BOWLER"],
  "Vihaan Malhotra": ["BATTER"],
  "Vicky Ostwal": ["BOWLER"],
  "Satvik Deswal": ["KEEPER"],
  "Liam Livingstone": ["ALL_ROUNDER"],
  "Jack Edwards": ["ALL_ROUNDER"],
  "Salil Arora": ["BOWLER"],
  "Shivam Mavi": ["BOWLER"],
  "Krains Fuletra": ["BATTER"],
  "Praful Hinge": ["BOWLER"],
  "Amit Kumar": ["BOWLER"],
  "Onkar Tarmale": ["BATTER"],
  "Sakib Hussain": ["BOWLER"],
  "Shivang Kumar": ["BATTER"],
};

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

function parseRupees(raw: string): number {
  return parseInt(raw.replace(/[,\s]/g, ""), 10) || 0;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function listPriceFromBid(bidRs: number, maxBidRs: number): number {
  return Math.max(5, Math.round((bidRs / maxBidRs) * 190));
}

let _cache: CsvPlayer[] | null = null;

export function loadPlayersFromCsv(): CsvPlayer[] {
  if (_cache) return _cache;

  const csvPath = path.resolve(process.cwd(), "IPL_Auction_2026_Sold_Player.csv");
  const lines = fs
    .readFileSync(csvPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim());

  const rows = lines.slice(1).flatMap((line) => {
    const cols = parseCsvLine(line);
    const name = cols[1]?.trim();
    const teamName = cols[5]?.trim();
    const bidRs = parseRupees(cols[4] ?? "");
    const franchise = TEAM_NAME_TO_FRANCHISE[teamName];
    if (!name || !franchise) return [];
    return [{ name, franchise, bidRs }];
  });

  const sorted = [...rows].sort(
    (a, b) => b.bidRs - a.bidRs || a.name.localeCompare(b.name),
  );
  const maxBid = sorted[0]?.bidRs ?? 1;
  const seasonYear = 2026;

  _cache = sorted.map((row, i) => ({
    id: `csv-${slugify(row.name)}`,
    externalId: `ipl-${seasonYear}-${slugify(row.name)}`,
    name: row.name,
    franchise: row.franchise,
    roles: PLAYER_ROLES[row.name] ?? ["BATTER"],
    consensusRank: i + 1,
    listPrice: listPriceFromBid(row.bidRs, maxBid),
    seasonYear,
  }));

  return _cache;
}
