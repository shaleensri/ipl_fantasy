/**
 * Shape for League.settings (JSON). Expand as you implement phases.
 * Server should validate on write.
 */
export type LeagueSettings = {
  pickTimerSeconds?: number;
  autopickEnabled?: boolean;
  rosterSize?: number;
  /** Min starters per role — keys align with PlayerRole */
  minStartersByRole?: Partial<
    Record<"BATTER" | "BOWLER" | "ALL_ROUNDER" | "KEEPER", number>
  >;
  maxPerRole?: Partial<Record<"BATTER" | "BOWLER" | "ALL_ROUNDER" | "KEEPER", number>>;
  scoring?: Record<string, number>;
  tradeCommissionerVeto?: boolean;
  tradeReviewHours?: number;
  tradeDeadlineGameweekIndex?: number | null;
  /** BLOCK | NEXT_WEEK_EFFECTIVE — document in UI */
  tradeStarterRule?: "BLOCK" | "NEXT_WEEK_EFFECTIVE";
  waiverProcessingCronUtc?: string;
  rollingWaiverHours?: number;
  faabBudget?: number;
};
