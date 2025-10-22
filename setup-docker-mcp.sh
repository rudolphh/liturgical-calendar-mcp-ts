#!/bin/bash
# Setup script for Docker Desktop MCP Toolkit integration

set -e

echo "🐳 Setting up Liturgical Calendar MCP Server for Docker Desktop..."
echo ""

# Build the Docker image
echo "📦 Building Docker image..."
cd "$(dirname "$0")"
docker build -f Dockerfile.ts -t liturgical-calendar-mcp-ts:latest .

echo ""
echo "✅ Docker image built successfully!"
echo ""

# Check if MCP directories exist
MCP_DIR="$HOME/.docker/mcp"
CATALOG_FILE="$MCP_DIR/catalogs/docker-mcp.yaml"
REGISTRY_FILE="$MCP_DIR/registry.yaml"

if [ ! -d "$MCP_DIR" ]; then
    echo "⚠️  Warning: Docker MCP directory not found at $MCP_DIR"
    echo "   Make sure Docker Desktop MCP Toolkit is enabled in Settings > Beta Features"
    echo ""
fi

# Function to update YAML file
update_yaml() {
    local file=$1
    local entry_type=$2
    
    echo "📝 Updating $file..."
    
    if [ ! -f "$file" ]; then
        echo "   Creating new file..."
        if [ "$entry_type" == "catalog" ]; then
            cat > "$file" << 'EOF'
registry:
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
EOF
        else
            cat > "$file" << 'EOF'
registry:
  liturgical-calendar:
    ref: ""
EOF
        fi
    else
        # File exists, check if entry already there
        if grep -q "liturgical-calendar:" "$file"; then
            echo "   Entry already exists, skipping..."
        else
            echo "   File exists but is empty or needs the entry..."
            echo ""
            echo "⚠️  Please manually add the following to $file:"
            echo ""
            if [ "$entry_type" == "catalog" ]; then
                cat << 'EOF'
Under the 'registry:' section, add:

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
EOF
            else
                cat << 'EOF'
Under the 'registry:' section, add:

  liturgical-calendar:
    ref: ""
EOF
            fi
        fi
    fi
}

# Try to update files
if [ -d "$MCP_DIR" ]; then
    mkdir -p "$MCP_DIR/catalogs"
    update_yaml "$CATALOG_FILE" "catalog"
    echo ""
    update_yaml "$REGISTRY_FILE" "registry"
    echo ""
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. ✅ Docker image built: liturgical-calendar-mcp-ts:latest"
echo ""
echo "2. Check/edit these files:"
echo "   - $CATALOG_FILE"
echo "   - $REGISTRY_FILE"
echo ""
echo "3. Restart Docker Desktop completely"
echo ""
echo "4. In Docker Desktop, go to MCP Toolkit and enable 'Liturgical Calendar'"
echo ""
echo "5. Connect the MCP Toolkit to Claude Desktop (in MCP Toolkit settings)"
echo ""
echo "6. Restart Claude Desktop completely"
echo ""
echo "✨ You should then see Liturgical Calendar tools under MCP_DOCKER category!"
