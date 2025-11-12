/**
 * API client for Liturgical Calendar API
 * Handles all HTTP communication with the upstream API
 */

import { API_BASE_URL, API_TIMEOUT_MS } from '../constants.js';

/**
 * Fetches data from the Liturgical Calendar API
 * @param url - Full API URL to fetch
 * @param locale - Language code (default: "en")
 * @returns Parsed JSON response
 * @throws Error if request fails or times out
 */
export const fetchAPI = async (url: string, locale = "en"): Promise<any> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  
  try {
    const res = await fetch(url, {
      headers: { 
        Accept: "application/json", 
        "Accept-Language": locale 
      },
      signal: controller.signal,
    });
    
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${await res.text()}`);
    }
    
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Fetches the general Roman calendar for a specific year
 * @param year - Calendar year (1970-9999)
 * @param locale - Language code
 * @returns Calendar data
 */
export const fetchGeneralCalendar = async (year: number, locale = "en"): Promise<any> => {
  return fetchAPI(`${API_BASE_URL}/calendar/${year}`, locale);
};

/**
 * Fetches a national calendar for a specific country and year
 * @param nation - Nation code (e.g., "US", "IT", "VA")
 * @param year - Calendar year (1970-9999)
 * @param locale - Language code
 * @returns Calendar data
 */
export const fetchNationalCalendar = async (
  nation: string, 
  year: number, 
  locale = "en"
): Promise<any> => {
  return fetchAPI(`${API_BASE_URL}/calendar/nation/${nation}/${year}`, locale);
};

/**
 * Fetches a diocesan calendar for a specific diocese and year
 * @param diocese - Diocese code (e.g., "ROME-IT", "BOSTON-US")
 * @param year - Calendar year (1970-9999)
 * @param locale - Language code
 * @returns Calendar data
 */
export const fetchDiocesanCalendar = async (
  diocese: string, 
  year: number, 
  locale = "en"
): Promise<any> => {
  return fetchAPI(`${API_BASE_URL}/calendar/diocese/${diocese}/${year}`, locale);
};

/**
 * Fetches the list of all available calendars (national and diocesan)
 * @returns Calendar metadata
 */
export const fetchAvailableCalendars = async (): Promise<any> => {
  return fetchAPI(`${API_BASE_URL}/calendars`);
};

/**
 * Fetches all possible liturgical events for a calendar type
 * @param calendarType - "general", "national", or "diocesan"
 * @param nation - Nation code (required for national/diocesan)
 * @param diocese - Diocese code (required for diocesan)
 * @returns Events data
 */
export const fetchLiturgicalEvents = async (
  calendarType: string,
  nation?: string,
  diocese?: string
): Promise<any> => {
  let url = `${API_BASE_URL}/events`;
  
  if (calendarType === "national" && nation) {
    url += `/nation/${nation}`;
  } else if (calendarType === "diocesan" && diocese) {
    url += `/diocese/${diocese}`;
  }
  
  return fetchAPI(url);
};
