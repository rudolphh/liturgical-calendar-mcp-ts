# Liturgical Calendar MCP Server (TypeScript)

A **Model Context Protocol (MCP)** server written in TypeScript that provides access to the [Roman Catholic Liturgical Calendar API](https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI).

## Why TypeScript?

This is a TypeScript rewrite of the Python version with these advantages:

- **Native MCP SDK**: First-class TypeScript support from the official MCP SDK
- **Smaller container**: Node.js Alpine image is ~50MB vs Python ~100MB+
- **Native async/await**: Clean promise-based HTTP requests
- **Type safety**: Full TypeScript types for better IDE support and error catching
- **Simple dependencies**: Only needs `@modelcontextprotocol/sdk` (built-in `fetch`)

## Features

- **`get_general_calendar`** - General Roman Calendar for any year (1970-9999)
- **`get_national_calendar`** - National calendars (IT, US, NL, VA, CA, etc.)
- **`get_diocesan_calendar`** - Diocesan calendars with local celebrations
- **`list_available_calendars`** - Discover all available calendars
- **`get_liturgical_events`** - All possible liturgical events

## Prerequisites

- **Node.js 18+** (20+ recommended)
- **Docker Desktop** with MCP Toolkit (for Docker deployment)
- No authentication required

## Installation

### Option 1: Local Development

```bash
# Clone the repository
git clone https://github.com/CatholicOS/liturgical-calendar-mcp.git
cd liturgical-calendar-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run the server
npm start
```

### Option 2: Docker

```bash
# Build the Docker image
docker build -f Dockerfile.ts -t liturgical-calendar-mcp-ts:latest .

# Run with Docker
docker run -i liturgical-calendar-mcp-ts:latest
```

## Configuration for MCP Clients

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "liturgical-calendar": {
      "command": "node",
      "args": ["/absolute/path/to/liturgical-calendar-mcp/build/index.js"]
    }
  }
}
```

### Docker MCP Toolkit

Edit `~/.docker/mcp/catalogs/docker-mcp.yaml`:

```yaml
  litcal-ts:
    description: "Access Roman Catholic Liturgical Calendar data (TypeScript)"
    title: "Liturgical Calendar (TS)"
    type: server
    dateAdded: "2025-10-22T00:00:00Z"
    image: liturgical-calendar-mcp-ts:latest
    tools:
      - name: get_general_calendar
      - name: get_national_calendar
      - name: get_diocesan_calendar
      - name: list_available_calendars
      - name: get_liturgical_events
    metadata:
      category: integration
      tags:
        - catholic
        - liturgy
        - calendar
      license: MIT
```

## Development

```bash
# Watch mode for development
npm run watch

# Build for production
npm run build

# Run tests (if added)
npm test
```

## Project Structure

```txt
.
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── Dockerfile.ts         # Docker build file
└── README-typescript.md  # This file
```

## Comparison with Python Version

| Feature | Python | TypeScript |
|---------|--------|------------|
| Runtime size | ~100MB | ~50MB |
| Dependencies | 2 (mcp, httpx) | 1 (@modelcontextprotocol/sdk) |
| HTTP client | httpx (external) | fetch (built-in) |
| Type safety | Optional (mypy) | Built-in |
| Async model | asyncio | Promises/async-await |
| MCP SDK | FastMCP wrapper | Official SDK |

## API Reference

### get_general_calendar

```typescript
{
  year?: string,    // 1970-9999 (default: current year)
  locale?: string   // en, es, it, fr, etc. (default: en)
}
```

### get_national_calendar

```typescript
{
  nation: string,   // IT, US, NL, VA, CA (required)
  year?: string,    // 1970-9999 (default: current year)
  locale?: string   // en, es, it, fr, etc. (default: en)
}
```

### get_diocesan_calendar

```typescript
{
  diocese: string,  // ROME-IT, BOSTON-US (required)
  year?: string,    // 1970-9999 (default: current year)
  locale?: string   // en, es, it, fr, etc. (default: en)
}
```

### list_available_calendars

```typescript
{
  // No parameters required
}
```

Returns all available national and diocesan calendars with their locales.

### get_liturgical_events

```typescript
{
  calendarType?: string,  // "general", "national", or "diocesan" (default: general)
  nation?: string,        // Required if calendarType is "national"
  diocese?: string        // Required if calendarType is "diocesan"
}
```

Retrieves all possible liturgical events for a calendar type.

## License

MIT

## Credits

- Liturgical Calendar API by Rev. John R. D'Orazio
- MCP Protocol by Anthropic
