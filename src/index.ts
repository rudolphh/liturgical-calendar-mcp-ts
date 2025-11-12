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
const formatDate = (dateValue: any) => {
  if (!dateValue) return null;
  try {
    // Handle both Unix timestamp and ISO string formats
    const date = typeof dateValue === 'number' 
      ? new Date(dateValue * 1000) 
      : new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

const parseMonthFilter = (monthFilter?: string): number | null | undefined => {
  if (!monthFilter) return undefined;
  const month = parseInt(monthFilter, 10);
  if (isNaN(month) || month < 1 || month > 12) return undefined;
  return month;
};

const parseGradeFilter = (gradeFilter?: string | number): number[] | null | undefined => {
  if (!gradeFilter) return undefined;
  const filterStr = typeof gradeFilter === 'number' ? String(gradeFilter) : gradeFilter;
  const grades = filterStr.split(',').map(g => parseInt(g.trim(), 10)).filter(g => !isNaN(g) && g >= 0 && g <= 7);
  return grades.length > 0 ? grades : undefined;
};

const formatCalendarResponse = (data: any, monthFilter?: number | null, gradeFilter?: number[] | null) => {
  if (!data?.litcal) return JSON.stringify({ error: "No calendar data available" });
  
  try {
    // Handle both array and object formats from API
    const litcalData = Array.isArray(data.litcal) ? data.litcal : Object.values(data.litcal);
    
    let events = litcalData.map((e: any) => {
      try {
        return {
          name: e.name || "Unknown",
          date: formatDate(e.date),
          grade: e.grade,
          grade_name: GRADE_MAP[e.grade] || "Unknown",
          color: e.color || [],
          common: e.common || [],
          liturgical_year: e.liturgical_year || null,
        };
      } catch (err) {
        console.error(`Error formatting event ${e.event_key}:`, err);
        throw err;
      }
    });
  
  // Apply month filter
  if (monthFilter !== null && monthFilter !== undefined) {
    events = events.filter((e: any) => {
      if (!e.date) return false;
      const eventMonth = new Date(e.date).getMonth() + 1;
      return eventMonth === monthFilter;
    });
  }
  
  // Apply grade filter
  if (gradeFilter && gradeFilter.length > 0) {
    events = events.filter((e: any) => gradeFilter.includes(e.grade));
  }
  
  // Sort by date
  events.sort((a: any, b: any) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
  
  const response = {
    metadata: {
      locale: data.settings?.locale || null,
      national_calendar: data.settings?.national_calendar || null,
      diocesan_calendar: data.settings?.diocesan_calendar || null,
      year: data.settings?.year || null,
      total_events: events.length,
      filters_applied: {
        month: monthFilter || null,
        grades: gradeFilter || null,
      }
    },
    events
  };
  
  return JSON.stringify(response, null, 2);
  } catch (error) {
    return JSON.stringify({ error: `Error formatting calendar: ${error instanceof Error ? error.message : String(error)}` });
  }
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
const handleError = (e: any) => JSON.stringify({ error: e instanceof Error ? e.message : String(e) });

const getGeneralCalendar = async (year?: string, locale = "en", month?: string | number, grade?: string | number) => {
  try {
    const y = validateYear(year);
    const data = await fetchAPI(`${API_BASE_URL}/calendar/${y}`, locale);
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
    const data = await fetchAPI(`${API_BASE_URL}/calendar/nation/${n}/${y}`, locale);
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
    const data = await fetchAPI(`${API_BASE_URL}/calendar/diocese/${d}/${y}`, locale);
    const monthFilter = parseMonthFilter(month ? String(month) : undefined);
    const gradeFilter = parseGradeFilter(grade ? String(grade) : undefined);
    return formatCalendarResponse(data, monthFilter, gradeFilter);
  } catch (e) {
    return handleError(e);
  }
};

const listAvailableCalendars = async () => {
  try {
    const data = await fetchAPI(`${API_BASE_URL}/calendars`);
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
    let url = `${API_BASE_URL}/events`;
    if (calendarType === "national" && nation) url += `/nation/${nation.trim().toUpperCase()}`;
    else if (calendarType === "diocesan" && diocese) url += `/diocese/${diocese.trim()}`;
    
    const data = await fetchAPI(url);
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
