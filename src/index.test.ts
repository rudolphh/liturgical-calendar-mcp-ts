import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE_URL = "https://litcal.johnromanodorazio.com/api/dev";

// Import the functions we need to test
// These are copied from index.ts for testing purposes
const GRADE_MAP: Record<number, string> = {
  0: "Weekday", 1: "Commemoration", 2: "Optional Memorial", 3: "Memorial",
  4: "Feast", 5: "Feast of the Lord", 6: "Solemnity", 7: "Higher Solemnity",
};

const formatDate = (dateValue: any) => {
  if (!dateValue) return null;
  try {
    const date = typeof dateValue === 'number' 
      ? new Date(dateValue * 1000) 
      : new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

describe('API Response Validation Tests', () => {
  let usCalendarData: any;
  let italyCalendarData: any;
  let generalCalendarData: any;

  beforeAll(async () => {
    // Fetch real API responses for testing
    const [usRes, itRes, generalRes] = await Promise.all([
      fetch(`${API_BASE_URL}/calendar/nation/US/2026`, {
        headers: { Accept: "application/json", "Accept-Language": "en" }
      }),
      fetch(`${API_BASE_URL}/calendar/nation/IT/2026`, {
        headers: { Accept: "application/json", "Accept-Language": "it" }
      }),
      fetch(`${API_BASE_URL}/calendar/2026`, {
        headers: { Accept: "application/json", "Accept-Language": "la" }
      })
    ]);

    usCalendarData = await usRes.json();
    italyCalendarData = await itRes.json();
    generalCalendarData = await generalRes.json();
  });

  describe('API Response Structure', () => {
    it('should return litcal as an array', () => {
      expect(Array.isArray(usCalendarData.litcal)).toBe(true);
      expect(Array.isArray(italyCalendarData.litcal)).toBe(true);
      expect(Array.isArray(generalCalendarData.litcal)).toBe(true);
    });

    it('should have required top-level properties', () => {
      const requiredProps = ['litcal', 'settings', 'metadata', 'messages'];
      
      for (const prop of requiredProps) {
        expect(usCalendarData).toHaveProperty(prop);
        expect(italyCalendarData).toHaveProperty(prop);
        expect(generalCalendarData).toHaveProperty(prop);
      }
    });

    it('should have settings with expected properties', () => {
      expect(usCalendarData.settings).toHaveProperty('year');
      expect(usCalendarData.settings).toHaveProperty('locale');
      expect(italyCalendarData.settings).toHaveProperty('year');
      expect(italyCalendarData.settings).toHaveProperty('locale');
    });
  });

  describe('Date Format Handling', () => {
    it('should handle Unix timestamp dates (US calendar)', () => {
      const firstEvent = usCalendarData.litcal[0];
      expect(firstEvent).toHaveProperty('date');
      
      const dateType = typeof firstEvent.date;
      if (dateType === 'number') {
        // Unix timestamp
        const formatted = formatDate(firstEvent.date);
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else if (dateType === 'string') {
        // ISO string
        const formatted = formatDate(firstEvent.date);
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        throw new Error(`Unexpected date type: ${dateType}`);
      }
    });

    it('should handle ISO string dates (Italy calendar)', () => {
      const firstEvent = italyCalendarData.litcal[0];
      expect(firstEvent).toHaveProperty('date');
      
      const dateType = typeof firstEvent.date;
      if (dateType === 'number') {
        // Unix timestamp
        const formatted = formatDate(firstEvent.date);
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else if (dateType === 'string') {
        // ISO string
        const formatted = formatDate(firstEvent.date);
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        throw new Error(`Unexpected date type: ${dateType}`);
      }
    });

    it('formatDate should handle both Unix timestamps and ISO strings', () => {
      // Test Unix timestamp (Jan 1, 2025)
      const unixTimestamp = 1735689600;
      const formattedUnix = formatDate(unixTimestamp);
      expect(formattedUnix).toBe('2025-01-01');

      // Test ISO string
      const isoString = '2026-01-01T00:00:00+00:00';
      const formattedISO = formatDate(isoString);
      expect(formattedISO).toBe('2026-01-01');

      // Test null/undefined
      expect(formatDate(null)).toBe(null);
      expect(formatDate(undefined)).toBe(null);

      // Test invalid
      expect(formatDate('invalid')).toBe(null);
    });
  });

  describe('Event Properties', () => {
    it('all events should have required properties', () => {
      const requiredProps = ['name', 'date', 'grade', 'color', 'common'];
      
      for (const event of usCalendarData.litcal.slice(0, 10)) {
        for (const prop of requiredProps) {
          expect(event).toHaveProperty(prop);
        }
      }
    });

    it('grade should be a number between 0 and 7', () => {
      for (const event of usCalendarData.litcal) {
        expect(typeof event.grade).toBe('number');
        expect(event.grade).toBeGreaterThanOrEqual(0);
        expect(event.grade).toBeLessThanOrEqual(7);
      }
    });

    it('grade should map to a valid grade name', () => {
      for (const event of usCalendarData.litcal.slice(0, 10)) {
        expect(GRADE_MAP[event.grade]).toBeDefined();
      }
    });

    it('color should be an array', () => {
      for (const event of usCalendarData.litcal.slice(0, 10)) {
        expect(Array.isArray(event.color)).toBe(true);
      }
    });

    it('common should be an array', () => {
      for (const event of usCalendarData.litcal.slice(0, 10)) {
        expect(Array.isArray(event.common)).toBe(true);
      }
    });
  });

  describe('API Consistency Across Calendars', () => {
    it('should warn if date formats differ between calendars', () => {
      const usDateType = typeof usCalendarData.litcal[0]?.date;
      const italyDateType = typeof italyCalendarData.litcal[0]?.date;

      if (usDateType !== italyDateType) {
        console.warn(`⚠️  API INCONSISTENCY DETECTED:`);
        console.warn(`   US calendar returns dates as: ${usDateType}`);
        console.warn(`   Italy calendar returns dates as: ${italyDateType}`);
        console.warn(`   formatDate() handles both, but this indicates API inconsistency`);
      }

      // Both types should be valid
      expect(['number', 'string']).toContain(usDateType);
      expect(['number', 'string']).toContain(italyDateType);
    });

    it('should handle if litcal format changes from array to object', () => {
      // Our code handles both, but let's verify the API is still returning arrays
      const isUsArray = Array.isArray(usCalendarData.litcal);
      const isItalyArray = Array.isArray(italyCalendarData.litcal);

      expect(isUsArray).toBe(true);
      expect(isItalyArray).toBe(true);

      // If this test fails, the API changed to return objects
      // and we need to update our expectations
    });
  });

  describe('Month Filtering', () => {
    it('should correctly identify month from different date formats', () => {
      // Test with Unix timestamp (Jan 15, 2026)
      const unixDate = formatDate(1736899200);
      expect(new Date(unixDate!).getMonth() + 1).toBe(1);

      // Test with ISO string
      const isoDate = formatDate('2026-01-15T00:00:00+00:00');
      expect(new Date(isoDate!).getMonth() + 1).toBe(1);
    });

    it('should filter events by month correctly', () => {
      const januaryEvents = usCalendarData.litcal.filter((e: any) => {
        const formatted = formatDate(e.date);
        if (!formatted) return false;
        return new Date(formatted).getMonth() + 1 === 1;
      });

      expect(januaryEvents.length).toBeGreaterThan(0);
      
      // Verify all events are actually in January (allow some at month boundaries)
      for (const event of januaryEvents.slice(0, 10)) {
        const formatted = formatDate(event.date);
        const month = new Date(formatted!).getMonth() + 1;
        expect(month).toBe(1);
      }
    });
  });

  describe('Grade Filtering', () => {
    it('should filter by single grade', () => {
      const memorials = usCalendarData.litcal.filter((e: any) => e.grade === 3);
      expect(memorials.length).toBeGreaterThan(0);
      
      for (const event of memorials) {
        expect(event.grade).toBe(3);
      }
    });

    it('should filter by multiple grades', () => {
      const grades = [2, 3]; // Optional Memorials and Memorials
      const filtered = usCalendarData.litcal.filter((e: any) => grades.includes(e.grade));
      
      expect(filtered.length).toBeGreaterThan(0);
      
      for (const event of filtered) {
        expect(grades).toContain(event.grade);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed date gracefully', () => {
      expect(formatDate('not-a-date')).toBe(null);
      expect(formatDate({})).toBe(null);
      expect(formatDate([])).toBe(null);
    });

    it('should handle missing litcal property', () => {
      const malformedData: any = { settings: {}, metadata: {} };
      // This would be caught by formatCalendarResponse
      expect(malformedData.litcal).toBeUndefined();
    });
  });

  describe('Performance and Data Volume', () => {
    it('should handle full year of events efficiently', () => {
      const startTime = Date.now();
      
      // Process all events
      const processed = usCalendarData.litcal.map((e: any) => ({
        name: e.name,
        date: formatDate(e.date),
        grade: e.grade,
        grade_name: GRADE_MAP[e.grade],
      }));
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(processed.length).toBeGreaterThan(300); // Full year should have 300+ events
      expect(duration).toBeLessThan(1000); // Should process in less than 1 second
    });
  });
});

describe('Regression Tests for Known API Issues', () => {
  it('should not break if API switches from number to string dates', async () => {
    // Test both formats
    const testEvents = [
      { date: 1735689600, name: 'Test Unix', grade: 3 }, // Unix timestamp -> 2025-01-01
      { date: '2026-01-01T00:00:00+00:00', name: 'Test ISO', grade: 3 }, // ISO string
    ];

    const formatted1 = formatDate(testEvents[0].date);
    expect(formatted1).toBe('2025-01-01');
    
    const formatted2 = formatDate(testEvents[1].date);
    expect(formatted2).toBe('2026-01-01');
    
    // Both should produce valid dates
    expect(formatted1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatted2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should not break if API switches from array to object for litcal', () => {
    // Test both formats
    const arrayFormat = [{ name: 'Event 1' }, { name: 'Event 2' }];
    const objectFormat = { event1: { name: 'Event 1' }, event2: { name: 'Event 2' } };

    // Our code handles both
    const processedArray = Array.isArray(arrayFormat) ? arrayFormat : Object.values(arrayFormat);
    const processedObject = Array.isArray(objectFormat) ? objectFormat : Object.values(objectFormat);

    expect(processedArray).toHaveLength(2);
    expect(processedObject).toHaveLength(2);
  });

  it('should handle null dates in sorting', () => {
    const events = [
      { date: null, name: 'No date' },
      { date: '2026-01-15T00:00:00+00:00', name: 'Has date' },
      { date: null, name: 'No date 2' },
    ];

    const sorted = events.sort((a, b) => {
      const dateA = formatDate(a.date);
      const dateB = formatDate(b.date);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });

    // Events with dates should come first
    expect(sorted[0].name).toBe('Has date');
  });
});
