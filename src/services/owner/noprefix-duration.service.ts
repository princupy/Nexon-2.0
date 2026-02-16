import type { NoPrefixUserRow } from "../supabase/repositories/noprefix-user.repository";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type DurationMs = number | null;

export type NoPrefixDurationKey =
  | "min_30"
  | "day_1"
  | "week_1"
  | "month_1"
  | "month_6"
  | "year_1"
  | "permanent";

export interface NoPrefixDurationOption {
  key: NoPrefixDurationKey;
  label: string;
  description: string;
  durationMs: DurationMs;
}

const DURATION_OPTIONS: NoPrefixDurationOption[] = [
  {
    key: "min_30",
    label: "30 Minutes",
    description: "Temporary access for 30 minutes.",
    durationMs: 30 * MINUTE,
  },
  {
    key: "day_1",
    label: "1 Day",
    description: "Access valid for 1 day.",
    durationMs: DAY,
  },
  {
    key: "week_1",
    label: "1 Week",
    description: "Access valid for 7 days.",
    durationMs: 7 * DAY,
  },
  {
    key: "month_1",
    label: "1 Month",
    description: "Access valid for 30 days.",
    durationMs: 30 * DAY,
  },
  {
    key: "month_6",
    label: "6 Months",
    description: "Access valid for 180 days.",
    durationMs: 180 * DAY,
  },
  {
    key: "year_1",
    label: "1 Year",
    description: "Access valid for 365 days.",
    durationMs: 365 * DAY,
  },
  {
    key: "permanent",
    label: "Permanent",
    description: "No expiration (lifetime access).",
    durationMs: null,
  },
];

export function getNoPrefixDurationOptions(): NoPrefixDurationOption[] {
  return DURATION_OPTIONS;
}

export function getNoPrefixDurationByKey(
  key: string,
): NoPrefixDurationOption | null {
  return DURATION_OPTIONS.find((option) => option.key === key) ?? null;
}

export function parseNoPrefixExpiryTimestamp(
  expiresAt: string | null,
): number | null {
  if (!expiresAt) {
    return null;
  }

  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

export function isNoPrefixExpired(
  expiresAt: string | null,
  nowMs = Date.now(),
): boolean {
  const expiryMs = parseNoPrefixExpiryTimestamp(expiresAt);
  return expiryMs !== null && nowMs >= expiryMs;
}

export function resolveNoPrefixExpiryFromDuration(
  durationMs: DurationMs,
  nowMs = Date.now(),
): string | null {
  if (durationMs === null) {
    return null;
  }

  return new Date(nowMs + durationMs).toISOString();
}

export function mergeNoPrefixExpiry(
  currentExpiresAt: string | null,
  durationMs: DurationMs,
  nowMs = Date.now(),
): string | null {
  if (durationMs === null || currentExpiresAt === null) {
    return null;
  }

  const currentExpiryMs = parseNoPrefixExpiryTimestamp(currentExpiresAt);
  const baseMs =
    currentExpiryMs === null ? nowMs : Math.max(nowMs, currentExpiryMs);

  return new Date(baseMs + durationMs).toISOString();
}

export function formatNoPrefixExpiry(expiresAt: string | null): string {
  if (!expiresAt) {
    return "Lifetime";
  }

  const timestamp = parseNoPrefixExpiryTimestamp(expiresAt);
  if (timestamp === null) {
    return expiresAt;
  }

  const unix = Math.floor(timestamp / 1000);
  return `<t:${unix}:F> (<t:${unix}:R>)`;
}

export function formatNoPrefixRemaining(expiresAt: string | null): string {
  if (!expiresAt) {
    return "Permanent";
  }

  const timestamp = parseNoPrefixExpiryTimestamp(expiresAt);
  if (timestamp === null) {
    return "Unknown";
  }

  const unix = Math.floor(timestamp / 1000);
  return `<t:${unix}:R>`;
}

export function getNoPrefixTierLabel(row: NoPrefixUserRow | null): string {
  if (!row) {
    return "NONE";
  }

  return row.expires_at ? "TIMED" : "LIFETIME";
}
