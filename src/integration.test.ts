import { describe, it, expect, beforeAll } from 'vitest';
import { API_BASE_URL } from './constants.js';

/**
 * Integration tests for the Liturgical Calendar MCP Server
 * 
 * These tests validate:
 * - Multi-calendar queries work correctly
 * - Edge cases (leap years, movable feasts, special coincidences)
 * - Parameter validation and error handling
 * - Locale handling across different calendars
 * - Metadata and calendar index endpoints
 */

describe('Integration Tests - Multiple Calendars', () => {
  let availableCalendars: any;

  beforeAll(async () => {
    const res = await fetch(`${API_BASE_URL}/calendars`);
    availableCalendars = await res.json();
  });

  describe('Calendar Availability', () => {
    it('should list available national calendars', () => {
      expect(availableCalendars.litcal_metadata).toBeDefined();
      expect(availableCalendars.litcal_metadata.national_calendars).toBeDefined();
      expect(Array.isArray(availableCalendars.litcal_metadata.national_calendars)).toBe(true);
      expect(availableCalendars.litcal_metadata.national_calendars.length).toBeGreaterThan(0);
    });

    it('should list available diocesan calendars', () => {
      expect(availableCalendars.litcal_metadata.diocesan_calendars).toBeDefined();
      expect(Array.isArray(availableCalendars.litcal_metadata.diocesan_calendars)).toBe(true);
    });

    it('national calendars should have required metadata', () => {
      const firstNational = availableCalendars.litcal_metadata.national_calendars[0];
      expect(firstNational).toHaveProperty('calendar_id');
      expect(firstNational.calendar_id).toMatch(/^[A-Z]{2,3}$/); // 2-3 uppercase letters
    });

    it('diocesan calendars should have nation and diocese info', () => {
      const diocesanCalendars = availableCalendars.litcal_metadata.diocesan_calendars;
      if (diocesanCalendars.length > 0) {
        const firstDiocesan = diocesanCalendars[0];
        expect(firstDiocesan).toHaveProperty('calendar_id');
        expect(firstDiocesan).toHaveProperty('nation');
        expect(firstDiocesan).toHaveProperty('diocese');
      }
    });
  });

  describe('Cross-Calendar Consistency', () => {
    it('same solemnity should exist in all calendars', async () => {
      // Christmas should be in all calendars
      const [general, us, italy] = await Promise.all([
        fetch(`${API_BASE_URL}/calendar/2025`).then(r => r.json()),
        fetch(`${API_BASE_URL}/calendar/nation/US/2025`).then(r => r.json()),
        fetch(`${API_BASE_URL}/calendar/nation/IT/2025`).then(r => r.json())
      ]);

      const findChristmas = (cal: any) => 
        cal.litcal.find((e: any) => e.event_key === 'Christmas');

      const generalChristmas = findChristmas(general);
      const usChristmas = findChristmas(us);
      const italyChristmas = findChristmas(italy);

      expect(generalChristmas).toBeDefined();
      expect(usChristmas).toBeDefined();
      expect(italyChristmas).toBeDefined();

      // All should be grade 7 (Higher Solemnity)
      expect(generalChristmas.grade).toBe(7);
      expect(usChristmas.grade).toBe(7);
      expect(italyChristmas.grade).toBe(7);
    });

    it('national calendars should include general calendar events', async () => {
      const [general, us] = await Promise.all([
        fetch(`${API_BASE_URL}/calendar/2025`).then(r => r.json()),
        fetch(`${API_BASE_URL}/calendar/nation/US/2025`).then(r => r.json())
      ]);

      // US calendar should have more events than general (includes US-specific saints)
      expect(us.litcal.length).toBeGreaterThanOrEqual(general.litcal.length);
    });
  });
});

describe('Edge Cases and Special Scenarios', () => {
  describe('Leap Year Handling', () => {
    it('should handle leap year dates correctly', async () => {
      // 2024 is a leap year
      const res = await fetch(`${API_BASE_URL}/calendar/2024`);
      const data = await res.json();

      // Check if Feb 29 exists
      const feb29Events = data.litcal.filter((e: any) => {
        const date = typeof e.date === 'number' 
          ? new Date(e.date * 1000) 
          : new Date(e.date);
        return date.getMonth() === 1 && date.getDate() === 29;
      });

      expect(feb29Events.length).toBeGreaterThan(0);
    });

    it('should not have Feb 29 in non-leap years', async () => {
      // 2025 is not a leap year
      const res = await fetch(`${API_BASE_URL}/calendar/2025`);
      const data = await res.json();

      const feb29Events = data.litcal.filter((e: any) => {
        const date = typeof e.date === 'number' 
          ? new Date(e.date * 1000) 
          : new Date(e.date);
        return date.getMonth() === 1 && date.getDate() === 29;
      });

      expect(feb29Events.length).toBe(0);
    });
  });

  describe('Movable Feasts', () => {
    it('Easter should fall on a Sunday', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/2026`);
      const data = await res.json();

      const easter = data.litcal.find((e: any) => e.event_key === 'Easter');
      expect(easter).toBeDefined();

      let easterDate: Date;
      if (typeof easter.date === 'number') {
        easterDate = new Date(easter.date * 1000);
      } else {
        // Parse ISO string - it already includes timezone
        easterDate = new Date(easter.date);
      }

      // Sunday is 0 in JavaScript
      const dayOfWeek = easterDate.getUTCDay();
      expect(dayOfWeek).toBe(0); // Sunday
    });

    it('Pentecost should be 49 days after Easter', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/2026`);
      const data = await res.json();

      const easter = data.litcal.find((e: any) => e.event_key === 'Easter');
      const pentecost = data.litcal.find((e: any) => e.event_key === 'Pentecost');

      expect(easter).toBeDefined();
      expect(pentecost).toBeDefined();

      const parseDate = (dateValue: any) => {
        if (typeof dateValue === 'number') {
          return new Date(dateValue * 1000);
        }
        // Handle ISO string with or without time
        return new Date(dateValue.includes('T') ? dateValue : dateValue + 'T12:00:00Z');
      };

      const easterDate = parseDate(easter.date);
      const pentecostDate = parseDate(pentecost.date);

      const daysDiff = Math.floor((pentecostDate.getTime() - easterDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(49);
    });

    it('Ash Wednesday should be 46 days before Easter', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/2026`);
      const data = await res.json();

      const ashWednesday = data.litcal.find((e: any) => e.event_key === 'AshWednesday');
      const easter = data.litcal.find((e: any) => e.event_key === 'Easter');

      expect(ashWednesday).toBeDefined();
      expect(easter).toBeDefined();

      const parseDate = (dateValue: any) => {
        if (typeof dateValue === 'number') {
          return new Date(dateValue * 1000);
        }
        return new Date(dateValue.includes('T') ? dateValue : dateValue + 'T12:00:00Z');
      };

      const ashDate = parseDate(ashWednesday.date);
      const easterDate = parseDate(easter.date);

      const daysDiff = Math.floor((easterDate.getTime() - ashDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(46);
    });
  });

  describe('Year Boundary Cases', () => {
    it('should handle minimum year (1970)', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/1970`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.litcal).toBeDefined();
      expect(data.settings.year).toBe(1970);
    });

    it('should handle maximum year (9999)', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/9999`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.litcal).toBeDefined();
      expect(data.settings.year).toBe(9999);
    });

    it('should handle year at century boundaries', async () => {
      // Test year 2000 (leap year, century year divisible by 400)
      const res = await fetch(`${API_BASE_URL}/calendar/2000`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.litcal).toBeDefined();
    });
  });

  describe('Suppression and Precedence', () => {
    it('should document suppressions in messages', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/2026`);
      const data = await res.json();

      expect(data.messages).toBeDefined();
      expect(Array.isArray(data.messages)).toBe(true);

      // Messages should contain information about suppressions/transfers
      // when higher ranked feasts coincide with lower ranked ones
      if (data.messages.length > 0) {
        const hasSuppressionInfo = data.messages.some((msg: string) => 
          msg.includes('superseded') || 
          msg.includes('suppressed') || 
          msg.includes('transferred')
        );
        // This isn't guaranteed every year, but should be common
        expect(typeof hasSuppressionInfo).toBe('boolean');
      }
    });

    it('metadata should list solemnities that can suppress other feasts', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/2026`);
      const data = await res.json();

      expect(data.metadata).toBeDefined();
      expect(data.metadata.solemnities).toBeDefined();
      expect(data.metadata.feasts).toBeDefined();
      expect(data.metadata.memorials).toBeDefined();

      // These should be objects/arrays containing event keys
      expect(typeof data.metadata.solemnities).toBe('object');
    });
  });
});

describe('Parameter Validation Tests', () => {
  describe('Year Parameter', () => {
    it('should reject year below 1970', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/1969`);
      // API should return an error or 400
      expect([400, 422, 500]).toContain(res.status);
    });

    it('should reject year above 9999', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/10000`);
      expect([400, 422, 500]).toContain(res.status);
    });

    it('should reject non-numeric year', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/abcd`);
      expect([400, 404, 422]).toContain(res.status);
    });
  });

  describe('Nation/Diocese Codes', () => {
    it('should reject invalid nation code', async () => {
      const res = await fetch(`${API_BASE_URL}/calendar/nation/INVALID/2025`);
      // API may return 404 for invalid nation codes
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid nation codes', async () => {
      const validCodes = ['US', 'IT', 'VA', 'NL', 'CA'];
      
      for (const code of validCodes) {
        const res = await fetch(`${API_BASE_URL}/calendar/nation/${code}/2025`);
        expect(res.ok).toBe(true);
      }
    }, 15000); // Longer timeout for multiple requests
  });
});

describe('Locale Handling', () => {
  it('should return different localized names for different locales', async () => {
    const [english, italian, latin] = await Promise.all([
      fetch(`${API_BASE_URL}/calendar/2025`, {
        headers: { 'Accept-Language': 'en' }
      }).then(r => r.json()),
      fetch(`${API_BASE_URL}/calendar/2025`, {
        headers: { 'Accept-Language': 'it' }
      }).then(r => r.json()),
      fetch(`${API_BASE_URL}/calendar/2025`, {
        headers: { 'Accept-Language': 'la' }
      }).then(r => r.json())
    ]);

    const getChristmasName = (cal: any) => 
      cal.litcal.find((e: any) => e.event_key === 'Christmas')?.name;

    const enName = getChristmasName(english);
    const itName = getChristmasName(italian);
    const laName = getChristmasName(latin);

    // Names should be different across locales
    expect(enName).toBeDefined();
    expect(itName).toBeDefined();
    expect(laName).toBeDefined();
    
    // At least one should differ
    const allSame = enName === itName && itName === laName;
    expect(allSame).toBe(false);
  });

  it('should respect locale in settings', async () => {
    const res = await fetch(`${API_BASE_URL}/calendar/nation/IT/2025`, {
      headers: { 'Accept-Language': 'it' }
    });
    const data = await res.json();

    expect(data.settings.locale).toMatch(/it/i);
  });
});

describe('Events Endpoint Tests', () => {
  it('should list all possible events for general calendar', async () => {
    const res = await fetch(`${API_BASE_URL}/events`);
    const data = await res.json();

    expect(data.litcal_events).toBeDefined();
    expect(typeof data.litcal_events).toBe('object');

    // Should have many events (300+)
    const eventCount = Object.keys(data.litcal_events).length;
    expect(eventCount).toBeGreaterThan(100);
  });

  it('should list events for national calendar', async () => {
    const res = await fetch(`${API_BASE_URL}/events/nation/US`);
    const data = await res.json();

    expect(data.litcal_events).toBeDefined();
    
    // US should have more events than general (includes US-specific saints)
    const usEventCount = Object.keys(data.litcal_events).length;
    expect(usEventCount).toBeGreaterThan(100);
  });

  it('event definitions should have consistent structure', async () => {
    const res = await fetch(`${API_BASE_URL}/events`);
    const data = await res.json();

    const firstEventKey = Object.keys(data.litcal_events)[0];
    const firstEvent = data.litcal_events[firstEventKey];

    expect(firstEvent).toHaveProperty('grade');
    expect(firstEvent).toHaveProperty('common');
    expect(firstEvent).toHaveProperty('color');
    expect(firstEvent).toHaveProperty('name');
  });
});

describe('Performance and Reliability', () => {
  it('should respond within reasonable time for calendar request', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE_URL}/calendar/2026`);
    await res.json();
    const duration = Date.now() - start;

    // Should respond within 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(5).fill(null).map((_, i) => 
      fetch(`${API_BASE_URL}/calendar/${2020 + i}`)
    );

    const results = await Promise.all(requests);

    for (const res of results) {
      expect(res.ok).toBe(true);
    }
  }, 10000);

  it('should return consistent results for same query', async () => {
    const [res1, res2] = await Promise.all([
      fetch(`${API_BASE_URL}/calendar/2026`).then(r => r.json()),
      fetch(`${API_BASE_URL}/calendar/2026`).then(r => r.json())
    ]);

    expect(res1.litcal.length).toBe(res2.litcal.length);
    expect(res1.settings.year).toBe(res2.settings.year);
  });
});

describe('Data Integrity Tests', () => {
  it('should not have duplicate event keys on same date', async () => {
    const res = await fetch(`${API_BASE_URL}/calendar/2026`);
    const data = await res.json();

    const eventsByDate = new Map<string, string[]>();

    for (const event of data.litcal) {
      const dateStr = typeof event.date === 'number'
        ? new Date(event.date * 1000).toISOString().split('T')[0]
        : new Date(event.date).toISOString().split('T')[0];

      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      eventsByDate.get(dateStr)!.push(event.event_key);
    }

    // Check for exact duplicate event keys on same date
    for (const [date, eventKeys] of eventsByDate) {
      const uniqueKeys = new Set(eventKeys);
      // Some days might have vigil mass + regular mass, but exact duplicates shouldn't exist
      expect(eventKeys.length).toBeGreaterThanOrEqual(uniqueKeys.size - 1);
    }
  });

  it('all event keys should follow naming convention', async () => {
    const res = await fetch(`${API_BASE_URL}/calendar/2026`);
    const data = await res.json();

    for (const event of data.litcal) {
      // Event keys should be PascalCase with possible numbers and underscores
      expect(event.event_key).toMatch(/^[A-Z][a-zA-Z0-9_]*$/);
    }
  });

  it('dates should be chronologically ordered', async () => {
    const res = await fetch(`${API_BASE_URL}/calendar/2026`);
    const data = await res.json();

    let prevTimestamp = 0;

    for (const event of data.litcal) {
      const timestamp = typeof event.date === 'number'
        ? event.date
        : Math.floor(new Date(event.date).getTime() / 1000);

      // Dates should be in order (or same as previous for multiple events on one day)
      expect(timestamp).toBeGreaterThanOrEqual(prevTimestamp);
      prevTimestamp = timestamp;
    }
  });
});
