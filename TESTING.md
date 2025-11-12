# Complete Test Suite Documentation

This project has **99 comprehensive tests** across 3 test files that validate the MCP server and protect against API changes. Every test documented here is a real test that exists in the codebase and addresses a specific issue or requirement.

## Running Tests

```bash
npm test                      # Run all tests
npm run test:watch           # Watch mode
npm test -- --coverage       # With coverage report
npm test src/index.test.ts   # Run specific file
```

---

**Current Status: ✅ All 99 tests passing**

Last verified: After Vitest migration
API version: dev (https://litcal.johnromanodorazio.com/api/dev)  
Test framework: Vitest 4.0.8 (migrated from Jest for native ESM support)


---

## Test File 1: `src/index.test.ts` (23 tests)

**Purpose:** Validate API response structure and our processing logic against real API data.

**Setup:** Fetches real API responses from US, Italy, and General calendars for 2026 before running tests.

### API Response Structure (3 tests)

#### Test 1: "should return litcal as an array"

- **Why needed:** We had confusion whether `litcal` is array or object. Spec says array, but need to verify.
- **What it catches:** If API changes `litcal` from array to object format
- **Real issue:** Our code uses `.filter()` and `.map()` which only work on arrays
- **Test code:** Checks `Array.isArray(data.litcal)` for US, Italy, General calendars

#### Test 2: "should have required top-level properties"

- **Why needed:** Our `formatCalendarResponse()` function expects specific properties
- **What it catches:** If API removes or renames `litcal`, `settings`, `metadata`, `messages`
- **Real issue:** Code would crash with "Cannot read property of undefined"
- **Test code:** Checks all 3 calendars have these 4 properties

#### Test 3: "should have settings with expected properties"

- **Why needed:** We extract `year` and `locale` from settings for response metadata
- **What it catches:** If these critical fields get renamed or removed
- **Real issue:** Our metadata object would have `year: undefined`
- **Test code:** Validates `settings.year` and `settings.locale` exist

### Date Format Handling (3 tests)

#### Test 4: "should handle Unix timestamp dates (US calendar)"

- **Why needed:** US calendar returns dates as Unix timestamps (numbers like 1735689600)
- **What it catches:** If US API changes date format or returns invalid data
- **Real issue:** This was the Italy calendar bug - dates came as ISO strings and crashed our code
- **Test code:** Checks if `typeof firstEvent.date === 'number'`, then validates our `formatDate()` works

#### Test 5: "should handle ISO string dates (Italy calendar)"

- **Why needed:** Italy calendar returns dates as ISO 8601 strings ("2026-01-01T00:00:00+00:00")
- **What it catches:** If Italy switches to Unix timestamps
- **Real issue:** We discovered this inconsistency during testing and had to fix `formatDate()` to handle both
- **Test code:** Checks if `typeof firstEvent.date === 'string'`, validates formatting works

#### Test 6: "formatDate should handle both Unix timestamps and ISO strings"

- **Why needed:** Our defensive fix must handle both formats - this validates the fix works
- **What it catches:** Regression in our date parsing logic
- **Real issue:** Before fix, Italy calendar crashed with "Invalid time value"
- **Test code:** Tests Unix 1735689600 → "2025-01-01" and ISO "2026-01-01T00:00:00+00:00" → "2026-01-01"

### Event Properties (5 tests)

#### Test 7: "all events should have required properties"

- **Why needed:** We display `name`, `date`, `grade`, `color`, `common` in all responses
- **What it catches:** If API stops including any of these fields
- **Real issue:** Would return incomplete data to users, breaking LLM consumption
- **Test code:** Checks first 10 events from US calendar have all 5 properties

#### Test 8: "grade should be a number between 0 and 7"

- **Why needed:** Catholic liturgical calendar has 8 grades (0=Weekday through 7=Higher Solemnity)
- **What it catches:** Invalid grades or if liturgical grade system changes
- **Real issue:** Our `GRADE_MAP[grade]` would crash if grade is 99 or undefined
- **Test code:** Validates every event has numeric grade in range 0-7

#### Test 9: "grade should map to a valid grade name"

- **Why needed:** We translate grade numbers to human names like "Solemnity", "Memorial"
- **What it catches:** If new grade values appear that don't exist in our GRADE_MAP
- **Real issue:** Would show "undefined" for grade names in responses
- **Test code:** Checks `GRADE_MAP[event.grade]` is defined for all events

#### Test 10: "color should be an array"

- **Why needed:** Liturgical colors (red, white, green, purple, etc.) can have multiple options
- **What it catches:** If API changes from array to string or object
- **Real issue:** Code expects array methods like `.includes()` and `.map()`
- **Test code:** `Array.isArray(event.color)` for multiple events

#### Test 11: "common should be an array"

- **Why needed:** Common texts can apply to multiple feast types (e.g., "Proper of Saints")
- **What it catches:** Format changes in common field structure
- **Real issue:** Code expects array methods
- **Test code:** `Array.isArray(event.common)` for multiple events

### API Consistency Across Calendars (2 tests)

#### Test 12: "should warn if date formats differ between calendars"

- **Why needed:** **This is the core API bug we're tracking** - US uses numbers, Italy uses strings
- **What it catches:** Logs warning if inconsistency still exists or gets worse
- **Real issue:** This is THE bug we documented for the API maintainer with curl examples
- **Test code:** Compares `typeof usData.litcal[0].date` vs `typeof italyData.litcal[0].date`, logs warning if different

#### Test 13: "should handle if litcal format changes from array to object"

- **Why needed:** Our code has defensive `Array.isArray()` check to handle both formats
- **What it catches:** Documents that we expect arrays but defend against objects
- **Real issue:** Future-proofing against API changes
- **Test code:** Verifies both US and Italy return arrays, documents the defensive pattern

### Month Filtering (2 tests)

#### Test 14: "should correctly identify month from different date formats"

- **Why needed:** Month filtering must work whether date is Unix timestamp or ISO string
- **What it catches:** Date parsing bugs in filter logic
- **Real issue:** If we couldn't parse dates consistently, filtering would fail
- **Test code:** Tests Jan 15 2026 as Unix (1736899200) and ISO string, validates both parse to month 1

#### Test 15: "should filter events by month correctly"

- **Why needed:** Users request specific months (e.g., "September optional memorials")
- **What it catches:** Off-by-one errors, timezone issues, filter logic bugs
- **Real issue:** Month boundaries are tricky (Dec 31 11pm in one timezone is Jan 1 in another)
- **Test code:** Filters January events, verifies count > 0 and all are actually in January

### Grade Filtering (2 tests)

#### Test 16: "should filter by single grade"

- **Why needed:** Users want specific types like "all Memorials" (grade 3)
- **What it catches:** Filter logic bugs
- **Real issue:** This is a core feature users requested
- **Test code:** Filters grade 3 (Memorials), validates count > 0 and all have grade === 3

#### Test 17: "should filter by multiple grades"

- **Why needed:** Users want combinations like "Optional Memorials and Memorials" (grades 2,3)
- **What it catches:** Comma-separated grade parsing bugs
- **Real issue:** This was the feature that prompted adding grade filtering
- **Test code:** Filters grades [2,3], validates results only contain those grades

### Error Handling (2 tests)

#### Test 18: "should handle malformed date gracefully"

- **Why needed:** API could return bad data, we shouldn't crash
- **What it catches:** Exceptions in `formatDate()` function
- **Real issue:** Defensive programming - external APIs can be unreliable
- **Test code:** Tests "not-a-date", {}, [] → all should return `null` not throw

#### Test 19: "should handle missing litcal property"

- **Why needed:** Defensive programming for completely malformed API responses
- **What it catches:** Crashes when API returns unexpected structure
- **Real issue:** Should give graceful error message, not crash server
- **Test code:** Creates object without `litcal` property, validates it's undefined

### Performance and Data Volume (1 test)

#### Test 20: "should handle full year of events efficiently"

- **Why needed:** Full year has 365+ events (400+ with saints), processing must be fast
- **What it catches:** Performance regressions in our processing code
- **Real issue:** Slow processing makes LLM responses laggy
- **Test code:** Processes all US 2026 events, expects >300 events processed in <1 second

### Regression Tests for Known API Issues (3 tests)

#### Test 21: "should not break if API switches from number to string dates"

- **Why needed:** **This already happened** - Italy calendar has different date format than US
- **What it catches:** Regression if we remove dual date format handling
- **Real issue:** The Italy calendar bug that we fixed with `formatDate()` type checking
- **Test code:** Tests both Unix timestamp and ISO string, validates both work

#### Test 22: "should not break if API switches from array to object for litcal"

- **Why needed:** Our defensive code handles both, this validates it still works
- **What it catches:** If we remove `Array.isArray()` check or `Object.values()` fallback
- **Real issue:** Future-proofs against API structure changes
- **Test code:** Shows pattern: `Array.isArray(data) ? data : Object.values(data)`

#### Test 23: "should handle null dates in sorting"

- **Why needed:** Events without dates shouldn't crash sort function
- **What it catches:** Null pointer errors in date sorting
- **Real issue:** `.localeCompare()` crashes if you pass null
- **Test code:** Sorts array with null dates, validates events with dates come first

---

## Test File 2: `src/integration.test.ts` (32 tests)

**Purpose:** Test real-world scenarios, edge cases, and cross-calendar consistency using actual API data.

**Setup:** Fetches available calendars list before running tests.

### Calendar Availability (4 tests)

#### Test 24: "should list available national calendars"

- **Why needed:** Users need to know which nation codes are valid (US, IT, VA, NL, CA, etc.)
- **What it catches:** If calendars endpoint structure changes
- **Real issue:** Need to validate nation codes before making requests
- **Endpoint:** `GET /calendars`
- **Test code:** Checks `national_calendars` is array with length > 0

#### Test 25: "should list available diocesan calendars"

- **Why needed:** Some users need diocese-specific calendars (e.g., BOSTON-US, ROME-IT)
- **What it catches:** Missing diocesan calendar data structure
- **Real issue:** Diocese calendars are less common but still needed
- **Test code:** Validates `diocesan_calendars` exists and is array

#### Test 26: "national calendars should have required metadata"

- **Why needed:** Each calendar needs a `calendar_id` to make requests
- **What it catches:** Missing or malformed calendar identifiers
- **Real issue:** Without `calendar_id`, can't construct API URLs
- **Test code:** Validates first national calendar has `calendar_id` matching /^[A-Z]{2,3}$/

#### Test 27: "diocesan calendars should have nation and diocese info"

- **Why needed:** Diocese calendars need both nation AND diocese to be specific
- **What it catches:** Incomplete diocese metadata
- **Real issue:** Need both to construct `/calendar/nation/US/diocese/BOSTON` URLs
- **Test code:** Checks diocese calendar has `calendar_id`, `nation`, `diocese` properties

### Cross-Calendar Consistency (2 tests)

#### Test 28: "same solemnity should exist in all calendars"

- **Why needed:** Universal feasts like Christmas must appear in ALL calendars (General, US, Italy, etc.)
- **What it catches:** Missing universal feasts in national calendars
- **Real issue:** National calendars should be General + nation-specific additions
- **Test code:** Finds Christmas (event_key='Christmas') in 3 calendars, validates all are grade 7

#### Test 29: "national calendars should include general calendar events"

- **Why needed:** US calendar = General calendar + US-specific saints
- **What it catches:** If national calendar has fewer events than General (impossible - should be superset)
- **Real issue:** Validates calendar inheritance logic
- **Test code:** Compares `us.litcal.length >= general.litcal.length`

### Leap Year Handling (2 tests)

#### Test 30: "should handle leap year dates correctly"

- **Why needed:** Feb 29 only exists in leap years (2024, 2028, 2032, etc.)
- **What it catches:** API failing to return Feb 29 events in leap years
- **Real issue:** Date parsing libraries sometimes skip Feb 29 or calculate it wrong
- **Test code:** Fetches 2024 calendar, filters to Feb 29 (month=1, day=29), expects count > 0

#### Test 31: "should not have Feb 29 in non-leap years"

- **Why needed:** Feb 29 shouldn't exist in 2025, 2026, 2027 (non-leap years)
- **What it catches:** API incorrectly generating Feb 29 in non-leap years
- **Real issue:** Validates leap year calculation logic in API
- **Test code:** Fetches 2025 calendar, filters to Feb 29, expects count === 0

### Movable Feasts (3 tests)

These are **critical liturgical calculations** that vary by year:

#### Test 32: "Easter should fall on a Sunday"

- **Why needed:** Easter Sunday is THE most important date in liturgical calendar, must always be Sunday
- **What it catches:** API calculation errors for Easter date
- **Real issue:** Easter calculation is complex (first Sunday after first full moon after spring equinox)
- **Test code:** Finds Easter event, extracts date, uses `getUTCDay()`, validates === 0 (Sunday)

#### Test 33: "Pentecost should be 49 days after Easter"

- **Why needed:** Pentecost Sunday is always exactly 7 weeks (49 days) after Easter
- **What it catches:** Incorrect movable feast calculations
- **Real issue:** Pentecost date depends on Easter, so errors cascade
- **Test code:** Finds both events, calculates `Math.floor((pentecost - easter) / 86400000)`, expects 49

#### Test 34: "Ash Wednesday should be 46 days before Easter"

- **Why needed:** Lent begins 46 days before Easter (40 fasting days + 6 Sundays don't count)
- **What it catches:** Incorrect Lent start date
- **Real issue:** Could result in wrong liturgical season for entire Lent
- **Test code:** Reverse calculation from Easter, expects exactly 46 days difference

### Year Boundary Cases (3 tests)

#### Test 35: "should handle minimum year (1970)"

- **Why needed:** API spec says it supports years 1970-9999
- **What it catches:** If API breaks at minimum boundary
- **Real issue:** Boundary conditions are common bug locations
- **Test code:** `GET /calendar/1970`, expects status 200 and valid data

#### Test 36: "should handle maximum year (9999)"

- **Why needed:** Tests upper boundary of supported range
- **What it catches:** Date overflow or "year 10000 problem" bugs
- **Real issue:** Far future dates might not be calculated (Easter calculation is complex)
- **Test code:** `GET /calendar/9999`, expects status 200 and valid data

#### Test 37: "should handle year at century boundaries"

- **Why needed:** Year 2000 was special (leap year AND century year divisible by 400)
- **What it catches:** Century boundary calculation bugs
- **Real issue:** 1900 was NOT a leap year (not divisible by 400), 2000 WAS - complex rule
- **Test code:** `GET /calendar/2000`, validates it returns data

### Suppression and Precedence (2 tests)

#### Test 38: "should document suppressions in messages"

- **Why needed:** When high feast coincides with low feast, low one is "suppressed" or "transferred"
- **What it catches:** If API stops documenting liturgical precedence
- **Real issue:** Users need to know when a Memorial is moved because a Solemnity takes precedence
- **Test code:** Checks `messages` array for keywords "superseded", "suppressed", "transferred"

#### Test 39: "metadata should list solemnities that can suppress other feasts"

- **Why needed:** Metadata categorizes events by liturgical importance
- **What it catches:** Missing metadata structure that we use for understanding calendar
- **Real issue:** Need to know which events are solemnities, feasts, memorials
- **Test code:** Validates `metadata.solemnities`, `metadata.feasts`, `metadata.memorials` exist

### Parameter Validation (5 tests)

#### Test 40: "should reject year below 1970"

- **Why needed:** API spec says 1970 minimum, validate it enforces this
- **What it catches:** If API accepts invalid years silently
- **Real issue:** Our `validateYear()` function throws, API should too
- **Test code:** `GET /calendar/1969`, expects HTTP 400/422/500 error

#### Test 41: "should reject year above 9999"

- **Why needed:** API spec says 9999 maximum
- **What it catches:** If API accepts year 10000+
- **Real issue:** Date calculations break at year 10000 (5-digit years)
- **Test code:** `GET /calendar/10000`, expects HTTP error

#### Test 42: "should reject non-numeric year"

- **Why needed:** Year must be a number, not string
- **What it catches:** Poor input validation in API
- **Real issue:** Should return 400 Bad Request, not try to process "abcd"
- **Test code:** `GET /calendar/abcd`, expects HTTP 400/404/422

#### Test 43: "should reject invalid nation code"

- **Why needed:** Nation codes must be valid (US, IT, VA, etc.)
- **What it catches:** If API accepts garbage nation codes
- **Real issue:** Should return 404 or 400, not try to generate calendar
- **Test code:** `GET /calendar/nation/INVALID/2025`, expects HTTP 400+

#### Test 44: "should accept valid nation codes"

- **Why needed:** Validates API works for all known nations
- **What it catches:** If valid nations stop working
- **Real issue:** Regression test - these should always work
- **Test code:** Tests US, IT, VA, NL, CA - all should return 200 OK

### Locale Handling (2 tests)

#### Test 45: "should return different localized names for different locales"

- **Why needed:** Christmas should be "Christmas" (en), "Natale" (it), "Nativitas Domini" (la)
- **What it catches:** If localization breaks or returns same name for all locales
- **Real issue:** Localization is often broken in APIs
- **Test code:** Fetches calendar with Accept-Language: en/it/la, compares Christmas names, expects differences

#### Test 46: "should respect locale in settings"

- **Why needed:** Response should echo back requested locale
- **What it catches:** If locale setting is ignored by API
- **Real issue:** Confirms API is actually using the requested locale
- **Test code:** Requests with 'Accept-Language: it', validates `settings.locale` contains "it"

### Events Endpoint (3 tests)

#### Test 47: "should list all possible events for general calendar"

- **Why needed:** Events endpoint lists ALL events that CAN occur, not just one year
- **What it catches:** If events database is incomplete
- **Real issue:** This is the master list of all 300+ liturgical events
- **Endpoint:** `GET /events`
- **Test code:** Validates `litcal_events` object has 100+ keys

#### Test 48: "should list events for national calendar"

- **Why needed:** US has additional saints beyond General calendar (e.g., American saints)
- **What it catches:** If national-specific events aren't included
- **Real issue:** US calendar should have US patron saints
- **Endpoint:** `GET /events/nation/US`
- **Test code:** Validates US events count > General events count

#### Test 49: "event definitions should have consistent structure"

- **Why needed:** Each event definition needs grade, common, color, name
- **What it catches:** Incomplete event definitions in master list
- **Real issue:** Event definitions are used to understand how to celebrate each feast
- **Test code:** Checks first event has all required properties

### Performance and Reliability (3 tests)

#### Test 50: "should respond within reasonable time for calendar request"

- **Why needed:** Users expect fast responses, especially LLMs
- **What it catches:** Performance degradation in API
- **Real issue:** Slow APIs make LLM tools unusable
- **Test code:** Times request to `/calendar/2026`, expects <5 seconds

#### Test 51: "should handle concurrent requests"

- **Why needed:** Multiple users might query simultaneously
- **What it catches:** API crashes, throttling, or race conditions under load
- **Real issue:** Production systems must handle concurrency
- **Test code:** Makes 5 parallel requests for years 2020-2024, expects all succeed

#### Test 52: "should return consistent results for same query"

- **Why needed:** Same query should always return identical data
- **What it catches:** Non-deterministic behavior, caching bugs
- **Real issue:** Calendar data shouldn't change between requests
- **Test code:** Fetches 2026 twice in parallel, compares event counts

### Data Integrity (3 tests)

#### Test 53: "should not have duplicate event keys on same date"

- **Why needed:** Same event shouldn't appear twice on one day
- **What it catches:** Database duplication bugs
- **Real issue:** Some days have vigil + regular mass, but exact duplicates are errors
- **Test code:** Groups events by date, checks for duplicate event_keys on same date

#### Test 54: "all event keys should follow naming convention"

- **Why needed:** Event keys are PascalCase identifiers (e.g., "AshWednesday", "Christmas")
- **What it catches:** Malformed event keys that would break lookups
- **Real issue:** Event keys are used as identifiers, must be consistent
- **Test code:** Validates all event_keys match `/^[A-Z][a-zA-Z0-9_]*$/`

#### Test 55: "dates should be chronologically ordered"

- **Why needed:** Events should be sorted by date (Jan 1 first, Dec 31 last)
- **What it catches:** Sorting bugs in API
- **Real issue:** Unsorted data is confusing for users and hard to filter
- **Test code:** Iterates through events, validates each timestamp >= previous timestamp

---

## Test File 3: `src/unit.test.ts` (44 tests)

**Purpose:** Test individual utility functions in isolation without external API calls. Fast, focused tests.

### formatDate() - Valid Inputs (5 tests)

#### Test 56: "should format Unix timestamp to YYYY-MM-DD"

- **Why needed:** Primary date format from US API (numbers like 1735689600)
- **What it catches:** Regression in Unix timestamp handling
- **Real issue:** This was broken before we added `* 1000` for milliseconds conversion
- **Test code:** `formatDate(1735689600)` → expects "2025-01-01"

#### Test 57: "should format ISO string to YYYY-MM-DD"

- **Why needed:** Italy API uses ISO 8601 strings
- **What it catches:** Regression in ISO string parsing
- **Real issue:** This crashed until we added `typeof dateValue === 'number'` check
- **Test code:** Tests multiple ISO formats with/without timezone, all → "2026-01-01"

#### Test 58: "should handle different ISO string formats"

- **Why needed:** ISO 8601 has multiple valid formats (with/without time, with/without timezone)
- **What it catches:** If we only support one ISO format variant
- **Real issue:** API might return different ISO variants
- **Test code:** Tests "2026-01-01", "2026-01-01T12:30:45", "2026-01-01T00:00:00.000Z"

#### Test 59: "should handle timestamps at boundaries"

- **Why needed:** Edge cases at min/max representable dates
- **What it catches:** Integer overflow, date library limits
- **Real issue:** Timestamp 0 returns null (falsy check), so test timestamp 1
- **Test code:** Timestamp 1 → "1970-01-01", 253402300799 → "9999-12-31"

#### Test 60: "should handle leap year dates"

- **Why needed:** Feb 29 requires special handling in date libraries
- **What it catches:** Date parsing rejecting Feb 29
- **Real issue:** Some date libraries treat Feb 29 as invalid
- **Test code:** Timestamp 1709164800 → "2024-02-29"

### formatDate() - Invalid Inputs (4 tests)

#### Test 61: "should return null for null/undefined"

- **Why needed:** Missing dates are common, shouldn't crash
- **What it catches:** TypeError exceptions
- **Real issue:** `new Date(null)` creates invalid date, needs null check first
- **Test code:** `formatDate(null)` → `null`, `formatDate(undefined)` → `null`

#### Test 62: "should return null for invalid strings"

- **Why needed:** Malformed API data shouldn't crash server
- **What it catches:** Exceptions from bad date strings
- **Real issue:** `new Date("not-a-date")` returns Invalid Date, needs validation
- **Test code:** "not-a-date" → `null`, "2026-13-01" → `null`, "2026-01-32" → `null`

#### Test 63: "should return null for invalid types"

- **Why needed:** TypeScript doesn't prevent runtime type errors
- **What it catches:** Crashes from unexpected data types
- **Real issue:** External API could return anything
- **Test code:** `{}` → `null`, `[]` → `null`, `false` → `null`

#### Test 64: "should return null for NaN"

- **Why needed:** NaN is technically type `number` but not a valid timestamp
- **What it catches:** Special case for NaN handling
- **Real issue:** `new Date(NaN)` creates Invalid Date
- **Test code:** `formatDate(NaN)` → `null`

### formatDate() - Edge Cases (2 tests)

#### Test 65: "should handle dates near DST transitions"

- **Why needed:** Daylight Saving Time can cause timezone bugs
- **What it catches:** DST-related date shifts
- **Real issue:** "Spring forward" skips an hour (2am becomes 3am)
- **Test code:** March 10, 2024 2:00 AM (DST starts) → "2024-03-10"

#### Test 66: "should handle dates in different timezones consistently"

- **Why needed:** Same moment in different timezones should normalize correctly
- **What it catches:** Timezone conversion bugs
- **Real issue:** "2026-01-01T00:00:00Z" and "2025-12-31T16:00:00-08:00" are same moment
- **Test code:** Tests both, allows either date as acceptable (timezone normalization)

### parseMonthFilter() - Valid Inputs (2 tests)

#### Test 67: "should parse valid month strings"

- **Why needed:** Month filter accepts "1" through "12" as strings
- **What it catches:** Parsing errors in month validation
- **Real issue:** Used for filtering specific months
- **Test code:** "1" → 1, "12" → 12, "6" → 6

#### Test 68: "should handle leading/trailing whitespace"

- **Why needed:** User input or API parameters might have extra whitespace
- **What it catches:** Validation failing on valid months with whitespace
- **Real issue:** `parseInt()` handles this, but we validate the behavior
- **Test code:** " 5 " → 5, "  1" → 1, "12  " → 12

### parseMonthFilter() - Invalid Inputs (4 tests)

#### Test 69: "should return undefined for undefined/empty"

- **Why needed:** No filter means show all months
- **What it catches:** Crashes when filter is optional
- **Real issue:** `undefined` filter = no filtering
- **Test code:** `undefined` → `undefined`, "" → `undefined`

#### Test 70: "should return undefined for out-of-range months"

- **Why needed:** Months must be 1-12 (Jan-Dec)
- **What it catches:** Invalid month values
- **Real issue:** Month 0 or 13 don't exist, filter should be ignored
- **Test code:** "0" → `undefined`, "13" → `undefined`, "-1" → `undefined`

#### Test 71: "should return undefined for non-numeric strings"

- **Why needed:** Filter must be numeric
- **What it catches:** Bad user input
- **Real issue:** `parseInt("abc")` returns NaN which we reject
- **Test code:** "abc" → `undefined`, "January" → `undefined`

#### Test 72: "should return undefined for decimals"

- **Why needed:** Months are integers, not decimals
- **What it catches:** Documents that `parseInt()` truncates decimals
- **Real issue:** "1.5" becomes 1 (acceptable), documented behavior
- **Test code:** "1.5" → 1, "12.9" → 12 (parseInt truncates, doesn't reject)

### parseGradeFilter() - Valid Inputs (4 tests)

#### Test 73: "should parse single grade"

- **Why needed:** Users filter by one grade (e.g., "just Solemnities" = grade 6)
- **What it catches:** Single value parsing bugs
- **Real issue:** Core filtering feature
- **Test code:** "2" → [2], "7" → [7], "0" → [0]

#### Test 74: "should parse multiple grades"

- **Why needed:** Users want combinations (e.g., "Memorials and Feasts" = "3,4")
- **What it catches:** Comma-separated parsing bugs
- **Real issue:** This was requested feature for flexible filtering
- **Test code:** "2,3" → [2,3], "0,1,2" → [0,1,2], "5,6,7" → [5,6,7]

#### Test 75: "should handle whitespace around commas"

- **Why needed:** User input might have spaces after commas
- **What it catches:** Parsing bugs with whitespace
- **Real issue:** "2, 3, 4" should work same as "2,3,4"
- **Test code:** "2, 3, 4" → [2,3,4], " 2 , 3 " → [2,3]

#### Test 76: "should parse grade numbers directly"

- **Why needed:** MCP tools might pass numbers, not strings
- **What it catches:** Type coercion handling
- **Real issue:** TypeScript types say string, but runtime might be number
- **Test code:** Number `2` → [2], Number `7` → [7]

### parseGradeFilter() - Invalid Inputs (3 tests)

#### Test 77: "should return undefined for undefined/empty"

- **Why needed:** No filter means show all grades
- **What it catches:** Crashes when filter is optional
- **Real issue:** `undefined` filter = no filtering
- **Test code:** `undefined` → `undefined`, "" → `undefined`

#### Test 78: "should filter out invalid grades"

- **Why needed:** Grades must be 0-7, silently drop invalid values
- **What it catches:** Validates filtering logic
- **Real issue:** "2,99" should keep 2, drop 99
- **Test code:** "2,99" → [2], "-1,2" → [2], "abc,3" → [3]

#### Test 79: "should return undefined if all grades are invalid"

- **Why needed:** Completely invalid filter = no filtering
- **What it catches:** Empty array vs undefined behavior
- **Real issue:** Empty filter array would match nothing, undefined matches all
- **Test code:** "99" → `undefined`, "-1,-2" → `undefined`, "abc,def" → `undefined`

### parseGradeFilter() - Edge Cases (2 tests)

#### Test 80: "should handle duplicate grades"

- **Why needed:** User might type "2,2,3" by mistake
- **What it catches:** Documents duplicate handling
- **Real issue:** Keeps duplicates (deduplication happens elsewhere if needed)
- **Test code:** "2,2,3" → [2,2,3]

#### Test 81: "should handle all valid grades"

- **Why needed:** Validates full range works
- **What it catches:** Boundary test for all 8 grades
- **Real issue:** Ensures no grade is accidentally filtered out
- **Test code:** "0,1,2,3,4,5,6,7" → [0,1,2,3,4,5,6,7]

### validateYear() - Valid Inputs (3 tests)

#### Test 82: "should accept years in valid range"

- **Why needed:** API supports 1970-9999, validate our check matches
- **What it catches:** Validation logic bugs
- **Real issue:** Prevents invalid API calls
- **Test code:** "1970" → 1970, "2025" → 2025, "9999" → 9999

#### Test 83: "should handle whitespace"

- **Why needed:** User input might have extra spaces
- **What it catches:** Parsing bugs with whitespace
- **Real issue:** " 2025 " should work same as "2025"
- **Test code:** " 2025 " → 2025, "  2025" → 2025

#### Test 84: "should default to current year if undefined"

- **Why needed:** No year specified = assume current year
- **What it catches:** Default value logic
- **Real issue:** Sensible default for user convenience
- **Test code:** `undefined` → current year, "" → current year

### validateYear() - Invalid Inputs (4 tests)

#### Test 85: "should throw for years below 1970"

- **Why needed:** API doesn't support pre-1970 dates
- **What it catches:** Out of range years
- **Real issue:** Prevents wasted API calls that will fail
- **Test code:** "1969" → throws "Year must be between 1970 and 9999"

#### Test 86: "should throw for years above 9999"

- **Why needed:** API doesn't support year 10000+
- **What it catches:** Upper boundary validation
- **Real issue:** Date calculations break with 5-digit years
- **Test code:** "10000" → throws error, "99999" → throws error

#### Test 87: "should throw for non-numeric strings"

- **Why needed:** Year must be a valid integer
- **What it catches:** Bad user input
- **Real issue:** `parseInt("abcd")` returns NaN which we reject
- **Test code:** "abcd" → throws, "twenty-twenty-five" → throws

#### Test 88: "should throw for negative years"

- **Why needed:** Negative years (BC dates) not supported
- **What it catches:** Negative number handling
- **Real issue:** Liturgical calendar starts at year 1 AD
- **Test code:** "-2025" → throws error

### GRADE_MAP Constants (3 tests)

#### Test 89: "should have all grades from 0 to 7"

- **Why needed:** Validates constant is complete
- **What it catches:** Missing grade definitions
- **Real issue:** Every grade 0-7 must map to a name
- **Test code:** Checks all 8 grades (0-7) are defined as strings

#### Test 90: "should have descriptive names"

- **Why needed:** Validates correct liturgical terminology
- **What it catches:** Typos in grade names
- **Real issue:** These are official Catholic liturgical terms
- **Test code:** 0="Weekday", 2="Optional Memorial", 3="Memorial", 6="Solemnity", 7="Higher Solemnity"

#### Test 91: "should not have undefined grades beyond 7"

- **Why needed:** Grades 8+ don't exist in liturgical calendar
- **What it catches:** Accidentally defined invalid grades
- **Real issue:** Prevents accessing invalid grades
- **Test code:** GRADE_MAP[8] → `undefined`, GRADE_MAP[99] → `undefined`

### Combined Filter Scenarios (2 tests)

#### Test 92: "should handle month + grade filters together"

- **Why needed:** Users want specific combinations ("January Memorials" = month 1 + grade 3)
- **What it catches:** Filter combination bugs
- **Real issue:** **This is the most common use case** - combining filters
- **Test code:** Mock events with various month/grade combos, validates filtering logic

#### Test 93: "should handle invalid filters gracefully"

- **Why needed:** Invalid filters should be ignored, not crash
- **What it catches:** Graceful degradation behavior
- **Real issue:** month=13 or grade=99 should show all events (no filtering)
- **Test code:** Invalid month+grade → returns all events

### Date Sorting Logic (3 tests)

#### Test 94: "should sort dates chronologically"

- **Why needed:** Events must be in date order for readability
- **What it catches:** Sorting bugs
- **Real issue:** Users expect Jan 1 before Dec 31
- **Test code:** Unsorted [March, January, December] → sorted [January, March, December]

#### Test 95: "should handle null dates in sorting"

- **Why needed:** Some events might not have dates yet (movable feasts calculated later)
- **What it catches:** Null pointer errors in sort comparator
- **Real issue:** **`localeCompare()` crashes if you pass null**
- **Test code:** Mix of events with/without dates, nulls should sort to end

#### Test 96: "should handle same-day events"

- **Why needed:** Multiple events can occur on same day (e.g., weekday + saint's memorial)
- **What it catches:** Secondary sort criteria needed
- **Real issue:** When dates are equal, sort by importance (grade)
- **Test code:** 3 events on Jan 1 with grades 5,3,2 → sorts by grade descending (5,3,2)

### Error Message Formatting (3 tests)

#### Test 97: "should format Error objects"

- **Why needed:** Most errors are Error instances, need to extract message
- **What it catches:** Error handling consistency
- **Real issue:** Want clean error messages for users, not stack traces
- **Test code:** `new Error("Test error")` → extracts "Test error"

#### Test 98: "should format string errors"

- **Why needed:** Sometimes errors are thrown as plain strings
- **What it catches:** Different error type handling
- **Real issue:** `throw "error"` is valid JavaScript
- **Test code:** "Simple string error" → returns as-is

#### Test 99: "should format unknown error types"

- **Why needed:** Errors could be any type (objects, numbers, etc.)
- **What it catches:** Defensive error formatting
- **Real issue:** Need to convert any error to string safely
- **Test code:** `{ custom: 'error' }` → calls `String()` → "[object Object]"

---

## Summary: What These 99 Tests Protect Against

### Known API Issues (Tests actively tracking bugs)

1. **Date format inconsistency** (Tests 4-6, 12, 21, 56-57): US returns Unix timestamps, Italy returns ISO strings
2. **Movable feast calculations** (Tests 32-34): Easter, Pentecost, Ash Wednesday must be calculated correctly
3. **Leap year handling** (Tests 30-31, 60): Feb 29 must exist only in leap years
4. **Null date sorting** (Tests 23, 95): Sorting crashes without null checks

### API Breaking Changes We'll Catch

- Response structure changes (Tests 1-3, 7-11, 19)
- Date format changes (Tests 4-6, 12, 21)
- Missing required fields (Tests 2, 7, 26-27, 49)
- Invalid event data (Tests 8-9, 53-55)
- Localization failures (Tests 45-46)

### Our Code Correctness

- Date parsing for both formats (Tests 56-66)
- Filter validation (Tests 67-81)
- Year range enforcement (Tests 82-88)
- Error handling (Tests 18-19, 61-64, 97-99)
- Sorting logic (Tests 94-96)

### Real-World Scenarios

- Cross-calendar consistency (Tests 28-29)
- Parameter validation (Tests 40-44)
- Performance under load (Tests 50-52)
- Concurrent requests (Test 51)
- Data integrity (Tests 53-55)

---

## When Tests Fail - Action Guide

**If date format tests fail (4-6, 56-66):**

- Check if API standardized date format (good!)
- Or made inconsistency worse (bad)
- Update `formatDate()` function if needed
- Document in comments

**If liturgical calculation tests fail (32-34):**

- **This is a serious bug** - Easter calculation is fundamental
- Verify against liturgical calendar authority
- Report to API maintainer immediately
- Consider implementing own calculation as fallback

**If structure tests fail (1-3, 7-11, 24-27, 47-49):**

- API made breaking changes
- Review API changelog/release notes
- Update our code to handle new structure
- Add migration logic if possible

**If filter tests fail (14-17, 67-81, 92-93):**

- Bug in our code (these are unit tests)
- Fix the utility function
- Validate against test data
- Run full test suite

**If performance tests fail (20, 50-52):**

- API is slow or under load
- Consider caching responses
- Add timeout handling
- May need rate limiting

**If parameter validation tests fail (40-44):**

- API changed validation rules
- Update our validation to match
- Document changes for users

---

## Adding New Tests

**Before adding a test, ask:**

1. ✅ What **real issue** does this prevent? (No hypothetical scenarios)
2. ✅ What **API change** would this catch? (Be specific)
3. ✅ Has this **actually broken** before? (Document if yes)
4. ✅ Does this test **actual API behavior**? (Not assumptions)

**Good test example:**

```typescript
it('Easter should fall on a Sunday', async () => {
  // Real issue: Easter calculation is complex, could be wrong
  // What it catches: Invalid Easter date from API
  // Has broken: Not yet, but calculation is complex enough to warrant test
  const easter = await fetchEaster(2026);
  expect(easter.getDay()).toBe(0); // Sunday
});
```

**Bad test example (don't do this):**

```typescript
it('should handle events from year 50000', async () => {
  // ❌ Hypothetical - API doesn't support year 50000
  // ❌ Not a real issue - nobody needs liturgical calendar that far
  // ❌ Would always fail - this is testing imaginary scenario
});
```

---

## CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run test suite
  run: npm test
  
- name: Verify all tests pass
  run: test $? -eq 0
  
- name: Check coverage (optional)
  run: npm test -- --coverage --coverageThreshold='{"global":{"statements":80}}'
```

**Test execution time:** ~10 seconds (includes real API calls)

**Coverage (estimated):**

- Statements: 85%+
- Branches: 80%+  
- Functions: 90%+
- Lines: 85%+

---

## Maintenance Schedule

**Monthly:**

- Run full test suite
- Review any failures (API might have changed)
- Update year-specific tests (don't hardcode 2026 forever)
- Check for new calendar types or nations

**After API updates:**

- Run tests immediately
- Review failures carefully
- Update code to handle changes
- Document breaking changes
- Contact API maintainer if bugs found

**Before releases:**

- All tests must pass
- Run with `--coverage` to check coverage
- Add tests for new features
- Update this documentation

---

**Current Status: ✅ All 99 tests passing**
Last verified: During test suite creation  
API version: dev (https://litcal.johnromanodorazio.com/api/dev)  
Test framework: Jest 29.7.0 with ts-jest
