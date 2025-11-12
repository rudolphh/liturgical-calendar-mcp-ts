/**
 * Constants for the Liturgical Calendar MCP Server
 */

export const API_BASE_URL = "https://litcal.johnromanodorazio.com/api/dev";

export const GRADE_MAP: Record<number, string> = {
  0: "Weekday",
  1: "Commemoration",
  2: "Optional Memorial",
  3: "Memorial",
  4: "Feast",
  5: "Feast of the Lord",
  6: "Solemnity",
  7: "Higher Solemnity",
};

export const API_TIMEOUT_MS = 30000; // 30 seconds
