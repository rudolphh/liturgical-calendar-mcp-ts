/**
 * Calendar response formatter
 * Transforms raw API data into structured, filtered responses
 */

import { formatDate } from '../rules/dates.js';
import { GRADE_MAP } from '../constants.js';

export interface CalendarEvent {
  name: string;
  date: string | null;
  grade: number;
  grade_name: string;
  color: string[];
  common: string[];
  liturgical_year: string | null;
}

export interface CalendarResponse {
  metadata: {
    locale: string | null;
    national_calendar: string | null;
    diocesan_calendar: string | null;
    year: number | null;
    total_events: number;
    filters_applied: {
      month: number | null;
      grades: number[] | null;
    };
  };
  events: CalendarEvent[];
}

/**
 * Formats raw calendar API data into structured JSON response with optional filtering
 * @param data - Raw API response data
 * @param monthFilter - Optional month filter (1-12)
 * @param gradeFilter - Optional grade filter array (0-7)
 * @returns Formatted JSON string
 */
export const formatCalendarResponse = (
  data: any,
  monthFilter?: number | null,
  gradeFilter?: number[] | null
): string => {
  if (!data?.litcal) {
    return JSON.stringify({ error: "No calendar data available" });
  }
  
  try {
    // Handle both array and object formats from API
    const litcalData = Array.isArray(data.litcal) 
      ? data.litcal 
      : Object.values(data.litcal);
    
    let events: CalendarEvent[] = litcalData.map((e: any) => {
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
      events = events.filter((e: CalendarEvent) => {
        if (!e.date) return false;
        const eventMonth = new Date(e.date).getMonth() + 1;
        return eventMonth === monthFilter;
      });
    }
    
    // Apply grade filter
    if (gradeFilter && gradeFilter.length > 0) {
      events = events.filter((e: CalendarEvent) => gradeFilter.includes(e.grade));
    }
    
    // Sort by date
    events.sort((a: CalendarEvent, b: CalendarEvent) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
    
    const response: CalendarResponse = {
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
    return JSON.stringify({ 
      error: `Error formatting calendar: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
};
