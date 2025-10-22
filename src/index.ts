#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";

const API_BASE_URL = "https://litcal.johnromanodorazio.com/api/dev";
const GRADE_MAP: Record<number, string> = {
  0: "Weekday", 1: "Commemoration", 2: "Optional Memorial", 3: "Memorial",
  4: "Feast", 5: "Feast of the Lord", 6: "Solemnity", 7: "Higher Solemnity",
};

// Utility Functions
const formatEvent = (e: any) => 
  `📅 ${e.name || "Unknown"}\n   Date: ${e.date}\n   Grade: ${GRADE_MAP[e.grade] || "Unknown"}\n   Color: ${e.color?.join(", ") || ""}`;

const formatCalendarSummary = (data: any) => {
  if (!data?.litcal) return "No calendar data available";
  
  const events = Object.values(data.litcal).sort((a: any, b: any) => 
    String(a.date || 0).localeCompare(String(b.date || 0))
  );
  
  const lines = [
    "=".repeat(60), "📖 LITURGICAL CALENDAR", "=".repeat(60),
    data.settings?.locale && `Locale: ${data.settings.locale}`,
    data.settings?.national_calendar && `National Calendar: ${data.settings.national_calendar}`,
    data.settings?.diocesan_calendar && `Diocesan Calendar: ${data.settings.diocesan_calendar}`,
    "",
    ...events.slice(0, 50).flatMap(e => [formatEvent(e), ""]),
    events.length > 50 && `... and ${events.length - 50} more events`,
    "=".repeat(60), `Total events: ${events.length}`
  ].filter(Boolean);
  
  return lines.join("\n");
};

const fetchAPI = async (url: string, locale = "en") => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": locale },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status} - ${await res.text()}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
};

const validateYear = (year?: string) => {
  const y = parseInt(year?.trim() || String(new Date().getFullYear()), 10);
  if (isNaN(y) || y < 1970 || y > 9999) throw new Error("Year must be between 1970 and 9999");
  return y;
};

// Tool Handlers
const handleError = (e: any) => `❌ Error: ${e instanceof Error ? e.message : String(e)}`;

const getGeneralCalendar = async (year?: string, locale = "en") => {
  try {
    const y = validateYear(year);
    const data = await fetchAPI(`${API_BASE_URL}/calendar/${y}`, locale);
    return `✅ General Roman Calendar for ${y}:\n\n${formatCalendarSummary(data)}`;
  } catch (e) {
    return handleError(e);
  }
};

const getNationalCalendar = async (nation?: string, year?: string, locale = "en") => {
  if (!nation?.trim()) return "❌ Error: Nation code is required (e.g., IT, US, NL, VA, CA)";
  try {
    const y = validateYear(year);
    const n = nation.trim().toUpperCase();
    const data = await fetchAPI(`${API_BASE_URL}/calendar/nation/${n}/${y}`, locale);
    return `✅ National Calendar for ${n} (${y}):\n\n${formatCalendarSummary(data)}`;
  } catch (e) {
    return handleError(e);
  }
};

const getDiocesanCalendar = async (diocese?: string, year?: string, locale = "en") => {
  if (!diocese?.trim()) return "❌ Error: Diocese code is required (e.g., ROME-IT, BOSTON-US)";
  try {
    const y = validateYear(year);
    const d = diocese.trim();
    const data = await fetchAPI(`${API_BASE_URL}/calendar/diocese/${d}/${y}`, locale);
    return `✅ Diocesan Calendar for ${d} (${y}):\n\n${formatCalendarSummary(data)}`;
  } catch (e) {
    return handleError(e);
  }
};

const listAvailableCalendars = async () => {
  try {
    const data = await fetchAPI(`${API_BASE_URL}/calendars`);
    if (!data?.litcal_metadata) return "❌ No calendar metadata available";
    
    const { national_calendars = [], diocesan_calendars = [] } = data.litcal_metadata;
    const lines = [
      "=".repeat(60), "📚 AVAILABLE LITURGICAL CALENDARS", "=".repeat(60), "",
      national_calendars.length && "🌍 NATIONAL CALENDARS:", "",
      ...national_calendars.flatMap((c: any) => [`  • ${c.calendar_id}`, `    Locales: ${c.locales.join(", ")}`, ""]),
      diocesan_calendars.length && "⛪ DIOCESAN CALENDARS:", "",
      ...diocesan_calendars.flatMap((c: any) => [`  • ${c.diocese} (ID: ${c.calendar_id})`, `    Nation: ${c.nation}`, `    Locales: ${c.locales.join(", ")}`, ""]),
      "=".repeat(60), `Total: ${national_calendars.length + diocesan_calendars.length} calendars available`
    ].filter(Boolean);
    
    return lines.join("\n");
  } catch (e) {
    return handleError(e);
  }
};

const getLiturgicalEvents = async (calendarType = "general", nation?: string, diocese?: string) => {
  try {
    let url = `${API_BASE_URL}/events`;
    if (calendarType === "national" && nation) url += `/nation/${nation.trim().toUpperCase()}`;
    else if (calendarType === "diocesan" && diocese) url += `/diocese/${diocese.trim()}`;
    
    const data = await fetchAPI(url);
    if (!data?.litcal_events) return "❌ No events data available";
    
    const events = Object.entries(data.litcal_events);
    const lines = [
      "=".repeat(60), "📖 LITURGICAL EVENTS", "=".repeat(60), "",
      ...events.flatMap(([key, val]: any) => [
        `• ${key}`,
        val?.name && `  Name: ${val.name}`,
        val?.grade !== undefined && `  Grade: ${val.grade}`,
        ""
      ].filter(Boolean)),
      "=".repeat(60), `Total events: ${events.length}`
    ];
    
    return lines.join("\n");
  } catch (e) {
    return handleError(e);
  }
};

// Tool Definitions
const tools: Tool[] = [
  {
    name: "get_general_calendar",
    description: "Retrieve the General Roman Calendar for a specific year with optional locale.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "string", description: "Year (1970-9999). Defaults to current year." },
        locale: { type: "string", description: "Locale (e.g., en, es, it, fr). Default: en", default: "en" },
      },
    },
  },
  {
    name: "get_national_calendar",
    description: "Retrieve the liturgical calendar for a specific nation and year.",
    inputSchema: {
      type: "object",
      properties: {
        nation: { type: "string", description: "Nation code (e.g., IT, US, NL, VA, CA). Required." },
        year: { type: "string", description: "Year (1970-9999). Defaults to current year." },
        locale: { type: "string", description: "Locale (e.g., en, es, it, fr). Default: en", default: "en" },
      },
      required: ["nation"],
    },
  },
  {
    name: "get_diocesan_calendar",
    description: "Retrieve the liturgical calendar for a specific diocese and year.",
    inputSchema: {
      type: "object",
      properties: {
        diocese: { type: "string", description: "Diocese code (e.g., ROME-IT, BOSTON-US). Required." },
        year: { type: "string", description: "Year (1970-9999). Defaults to current year." },
        locale: { type: "string", description: "Locale (e.g., en, es, it, fr). Default: en", default: "en" },
      },
      required: ["diocese"],
    },
  },
  {
    name: "list_available_calendars",
    description: "List all available national and diocesan calendars with their locales.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_liturgical_events",
    description: "Retrieve all possible liturgical events for a calendar type (general, national, or diocesan).",
    inputSchema: {
      type: "object",
      properties: {
        calendarType: { type: "string", description: "Type: 'general', 'national', or 'diocesan'", enum: ["general", "national", "diocesan"], default: "general" },
        nation: { type: "string", description: "Nation code (required if calendarType is 'national')" },
        diocese: { type: "string", description: "Diocese code (required if calendarType is 'diocesan')" },
      },
    },
  },
];

// Server Setup
const server = new Server({ name: "liturgical-calendar-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const handlers: Record<string, () => Promise<string>> = {
    get_general_calendar: () => getGeneralCalendar(args?.year as string, args?.locale as string),
    get_national_calendar: () => getNationalCalendar(args?.nation as string, args?.year as string, args?.locale as string),
    get_diocesan_calendar: () => getDiocesanCalendar(args?.diocese as string, args?.year as string, args?.locale as string),
    list_available_calendars: () => listAvailableCalendars(),
    get_liturgical_events: () => getLiturgicalEvents(args?.calendarType as string, args?.nation as string, args?.diocese as string),
  };

  try {
    const text = handlers[name] ? await handlers[name]() : `❌ Unknown tool: ${name}`;
    return { content: [{ type: "text", text }], isError: !handlers[name] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `❌ Error executing ${name}: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// Start Server
(async () => {
  await server.connect(new StdioServerTransport());
  console.error("Liturgical Calendar MCP Server running on stdio");
})().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
