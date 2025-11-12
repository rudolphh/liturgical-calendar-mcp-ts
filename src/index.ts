#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";

// Import modules (MCP Pattern: Model Control Plane)
import { GRADE_MAP } from './constants.js';
import { validateYear } from './rules/dates.js';
import { parseMonthFilter, parseGradeFilter } from './rules/filters.js';
import { formatCalendarResponse } from './formatters/calendar.js';
import {
  fetchGeneralCalendar,
  fetchNationalCalendar,
  fetchDiocesanCalendar,
  fetchAvailableCalendars,
  fetchLiturgicalEvents,
} from './api/client.js';
import { cache } from './cache/memory.js';

// Tool Handlers
const handleError = (e: any) => JSON.stringify({ error: e instanceof Error ? e.message : String(e) });

const getGeneralCalendar = async (year?: string, locale = "en", month?: string | number, grade?: string | number) => {
  try {
    const y = validateYear(year);
    const cacheKey = cache.calendarKey('general', y, locale);
    const data = await cache.getOrFetch(cacheKey, () => fetchGeneralCalendar(y, locale));
    const monthFilter = parseMonthFilter(month ? String(month) : undefined);
    const gradeFilter = parseGradeFilter(grade ? String(grade) : undefined);
    return formatCalendarResponse(data, monthFilter, gradeFilter);
  } catch (e) {
    return handleError(e);
  }
};

const getNationalCalendar = async (nation?: string, year?: string, locale = "en", month?: string | number, grade?: string | number) => {
  if (!nation?.trim()) return JSON.stringify({ error: "Nation code is required (e.g., IT, US, NL, VA, CA)" });
  try {
    const y = validateYear(year);
    const n = nation.trim().toUpperCase();
    const cacheKey = cache.calendarKey('national', y, locale, n);
    const data = await cache.getOrFetch(cacheKey, () => fetchNationalCalendar(n, y, locale));
    const monthFilter = parseMonthFilter(month ? String(month) : undefined);
    const gradeFilter = parseGradeFilter(grade ? String(grade) : undefined);
    return formatCalendarResponse(data, monthFilter, gradeFilter);
  } catch (e) {
    return handleError(e);
  }
};

const getDiocesanCalendar = async (diocese?: string, year?: string, locale = "en", month?: string | number, grade?: string | number) => {
  if (!diocese?.trim()) return JSON.stringify({ error: "Diocese code is required (e.g., ROME-IT, BOSTON-US)" });
  try {
    const y = validateYear(year);
    const d = diocese.trim();
    const cacheKey = cache.calendarKey('diocesan', y, locale, undefined, d);
    const data = await cache.getOrFetch(cacheKey, () => fetchDiocesanCalendar(d, y, locale));
    const monthFilter = parseMonthFilter(month ? String(month) : undefined);
    const gradeFilter = parseGradeFilter(grade ? String(grade) : undefined);
    return formatCalendarResponse(data, monthFilter, gradeFilter);
  } catch (e) {
    return handleError(e);
  }
};

const listAvailableCalendars = async () => {
  try {
    const data = await cache.getOrFetch('calendars:list', () => fetchAvailableCalendars());
    if (!data?.litcal_metadata) return JSON.stringify({ error: "No calendar metadata available" });
    
    const { national_calendars = [], diocesan_calendars = [] } = data.litcal_metadata;
    
    const response = {
      national_calendars: national_calendars.map((c: any) => ({
        calendar_id: c.calendar_id,
        locales: c.locales
      })),
      diocesan_calendars: diocesan_calendars.map((c: any) => ({
        calendar_id: c.calendar_id,
        diocese: c.diocese,
        nation: c.nation,
        locales: c.locales
      })),
      total: national_calendars.length + diocesan_calendars.length
    };
    
    return JSON.stringify(response, null, 2);
  } catch (e) {
    return handleError(e);
  }
};

const getLiturgicalEvents = async (calendarType = "general", nation?: string, diocese?: string, gradeFilter?: string) => {
  try {
    const cacheKey = `events:${calendarType}:${nation || 'none'}:${diocese || 'none'}`;
    const data = await cache.getOrFetch(cacheKey, () => fetchLiturgicalEvents(calendarType, nation, diocese));
    if (!data?.litcal_events) return JSON.stringify({ error: "No events data available" });
    
    const grades = parseGradeFilter(gradeFilter);
    
    let events = Object.entries(data.litcal_events).map(([key, val]: any) => ({
      event_key: key,
      name: val?.name || null,
      grade: val?.grade ?? null,
      grade_name: val?.grade !== undefined ? GRADE_MAP[val.grade] : null,
      color: val?.color || null,
      common: val?.common || null,
      date: val?.date || null,
      liturgical_year: val?.liturgical_year || null
    }));
    
    // Apply grade filter if provided
    if (grades && grades.length > 0) {
      events = events.filter((e: any) => e.grade !== null && grades.includes(e.grade));
    }
    
    const response = {
      calendar_type: calendarType,
      nation: nation || null,
      diocese: diocese || null,
      filters_applied: {
        grades: grades || null
      },
      total_events: events.length,
      events
    };
    
    return JSON.stringify(response, null, 2);
  } catch (e) {
    return handleError(e);
  }
};

// Tool Definitions
const tools: Tool[] = [
  {
    name: "get_general_calendar",
    description: "Retrieve the General Roman Calendar for a specific year. Returns structured JSON with all events. Filter by month (1-12) or grade (0=Weekday, 1=Commemoration, 2=Optional Memorial, 3=Memorial, 4=Feast, 5=Feast of the Lord, 6=Solemnity, 7=Higher Solemnity). Multiple grades can be comma-separated.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "string", description: "Year (1970-9999). Defaults to current year." },
        locale: { type: "string", description: "Locale (e.g., en, es, it, fr). Default: en", default: "en" },
        month: { type: "string", description: "Filter by month (1-12). Optional." },
        grade: { type: "string", description: "Filter by grade(s). Single value or comma-separated (e.g., '2' for Optional Memorials, '2,3' for Optional Memorials and Memorials). Optional." },
      },
    },
  },
  {
    name: "get_national_calendar",
    description: "Retrieve the liturgical calendar for a specific nation and year. Returns structured JSON with all events. Filter by month (1-12) or grade (0-7). Multiple grades can be comma-separated.",
    inputSchema: {
      type: "object",
      properties: {
        nation: { type: "string", description: "Nation code (e.g., IT, US, NL, VA, CA). Required." },
        year: { type: "string", description: "Year (1970-9999). Defaults to current year." },
        locale: { type: "string", description: "Locale (e.g., en, es, it, fr). Default: en", default: "en" },
        month: { type: "string", description: "Filter by month (1-12). Optional." },
        grade: { type: "string", description: "Filter by grade(s). Single value or comma-separated (e.g., '2' for Optional Memorials, '2,3' for Optional Memorials and Memorials). Optional." },
      },
      required: ["nation"],
    },
  },
  {
    name: "get_diocesan_calendar",
    description: "Retrieve the liturgical calendar for a specific diocese and year. Returns structured JSON with all events. Filter by month (1-12) or grade (0-7). Multiple grades can be comma-separated.",
    inputSchema: {
      type: "object",
      properties: {
        diocese: { type: "string", description: "Diocese code (e.g., ROME-IT, BOSTON-US). Required." },
        year: { type: "string", description: "Year (1970-9999). Defaults to current year." },
        locale: { type: "string", description: "Locale (e.g., en, es, it, fr). Default: en", default: "en" },
        month: { type: "string", description: "Filter by month (1-12). Optional." },
        grade: { type: "string", description: "Filter by grade(s). Single value or comma-separated (e.g., '2' for Optional Memorials, '2,3' for Optional Memorials and Memorials). Optional." },
      },
      required: ["diocese"],
    },
  },
  {
    name: "list_available_calendars",
    description: "List all available national and diocesan calendars with their locales. Returns structured JSON.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_liturgical_events",
    description: "Retrieve all possible liturgical events for a calendar type (general, national, or diocesan). Returns structured JSON with event definitions. Filter by grade (0-7, comma-separated).",
    inputSchema: {
      type: "object",
      properties: {
        calendarType: { type: "string", description: "Type: 'general', 'national', or 'diocesan'", enum: ["general", "national", "diocesan"], default: "general" },
        nation: { type: "string", description: "Nation code (required if calendarType is 'national')" },
        diocese: { type: "string", description: "Diocese code (required if calendarType is 'diocesan')" },
        grade: { type: "string", description: "Filter by grade(s). Single value or comma-separated (e.g., '2' for Optional Memorials). Optional." },
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
    get_general_calendar: () => getGeneralCalendar(args?.year as string, args?.locale as string, args?.month as string, args?.grade as string),
    get_national_calendar: () => getNationalCalendar(args?.nation as string, args?.year as string, args?.locale as string, args?.month as string, args?.grade as string),
    get_diocesan_calendar: () => getDiocesanCalendar(args?.diocese as string, args?.year as string, args?.locale as string, args?.month as string, args?.grade as string),
    list_available_calendars: () => listAvailableCalendars(),
    get_liturgical_events: () => getLiturgicalEvents(args?.calendarType as string, args?.nation as string, args?.diocese as string, args?.grade as string),
  };

  try {
    const text = handlers[name] ? await handlers[name]() : JSON.stringify({ error: `Unknown tool: ${name}` });
    return { content: [{ type: "text", text }], isError: !handlers[name] };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}` }) }],
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
