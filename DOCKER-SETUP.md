# Docker Desktop MCP Toolkit Setup Guide

## Quick Setup

Run the setup script:

```bash
cd typescript
./setup-docker-mcp.sh
```

Then follow the instructions printed by the script.

## Manual Setup

### Step 1: Build the Docker Image

```bash
cd typescript
docker build -f Dockerfile.ts -t liturgical-calendar-mcp-ts:latest .
```

### Step 2: Register with Docker Desktop MCP Toolkit

On **macOS/Linux**, edit `~/.docker/mcp/catalogs/docker-mcp.yaml`

On **Windows**, edit `%USERPROFILE%\.docker\mcp\catalogs\docker-mcp.yaml`

Add this under the `registry:` section:

```yaml
  liturgical-calendar:
    description: "Access Roman Catholic Liturgical Calendar data for any year, nation, or diocese from 1970-9999"
    title: "Liturgical Calendar"
    type: server
    dateAdded: "2025-10-22T00:00:00Z"
    image: liturgical-calendar-mcp-ts:latest
    ref: ""
    readme: ""
    toolsUrl: ""
    source: ""
    upstream: ""
    icon: ""
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
        - religious
      license: MIT
      owner: local
```

### Step 3: Update Registry

On **macOS/Linux**, edit `~/.docker/mcp/registry.yaml`

On **Windows**, edit `%USERPROFILE%\.docker\mcp\registry.yaml`

Add this under the `registry:` section:

```yaml
  liturgical-calendar:
    ref: ""
```

### Step 4: Enable in Docker Desktop

1. **Restart Docker Desktop** (completely quit and reopen)
2. Open Docker Desktop
3. Click on **MCP Toolkit** in the left sidebar
4. Find **"Liturgical Calendar"** in the catalog
5. Click **Enable** or toggle it on
6. **Connect MCP Toolkit to Claude Desktop** (or your MCP client)
   - Click the connection settings in MCP Toolkit
   - Select your MCP client (e.g., Claude Desktop)

### Step 5: Restart Your MCP Client

- If using **Claude Desktop**: Completely quit Claude Desktop (check it's not in the tray/dock) and restart it
- If using another client: Restart that client

### Step 6: Verify

1. Open Claude Desktop
2. Start a new chat
3. Click the **"Tools"** icon (🔧) below the chat input
4. Expand the **"MCP_DOCKER"** category
5. You should see the Liturgical Calendar tools:
   - get_general_calendar
   - get_national_calendar
   - get_diocesan_calendar
   - list_available_calendars
   - get_liturgical_events

## Testing

Try asking Claude:

- "What are the liturgical celebrations for Easter 2025?"
- "Show me the liturgical calendar for the United States in 2024"
- "What is the calendar for the Diocese of Rome for this year?"
- "List all available national liturgical calendars"

## Troubleshooting

### Tools don't appear in Claude Desktop

1. Make sure Docker Desktop is running
2. Verify the image exists: `docker images | grep liturgical-calendar-mcp-ts`
3. Check MCP Toolkit shows the server as enabled
4. Completely quit and restart Claude Desktop (check system tray)
5. Check Claude Desktop logs for errors

### Docker image not found

- Rebuild: `docker build -f Dockerfile.ts -t liturgical-calendar-mcp-ts:latest .`
- Verify: `docker images | grep liturgical-calendar-mcp-ts`

### YAML file not found

- Make sure Docker Desktop MCP Toolkit is enabled in Settings > Beta Features
- The files are created when you first enable MCP Toolkit
- Check the correct path for your OS (macOS uses `~/.docker/mcp/`)

### Connection errors

- The server uses the public Liturgical Calendar API (no auth needed)
- Check your internet connection
- Try testing the API directly: `curl https://litcal.johnromanodorazio.com/api/dev/calendar/2025`

## How It Works

1. Docker Desktop MCP Toolkit manages MCP server containers
2. When Claude (or another client) needs a tool, Docker Desktop starts the container
3. The container runs on-demand and shuts down when not needed
4. Communication happens via stdio (standard input/output)
5. No port exposure or network configuration needed

## Advantages of Docker MCP Toolkit

- ✅ No manual container management
- ✅ Automatic startup/shutdown
- ✅ Isolated environments
- ✅ Easy to enable/disable tools
- ✅ Works with multiple MCP clients
- ✅ Centralized catalog management
