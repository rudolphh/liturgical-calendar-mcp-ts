#!/bin/bash
# Setup script for direct Claude Desktop integration (no Docker MCP Toolkit needed)

set -e

echo "🤖 Setting up Liturgical Calendar MCP Server for Claude Desktop..."
echo ""

# Get the absolute path to the project
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
INDEX_JS="$BUILD_DIR/index.js"

# Build the TypeScript project
echo "📦 Building TypeScript project..."
cd "$PROJECT_DIR"

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Compiling TypeScript..."
npm run build

# Check if build was successful
if [ ! -f "$INDEX_JS" ]; then
    echo "❌ Error: Build failed. $INDEX_JS not found."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Detect operating system and set Claude Desktop config path
detect_claude_config_path() {
    local os_type=$(uname -s)
    
    case "$os_type" in
        "Darwin")
            # macOS
            echo "🍎 Detected macOS"
            CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
            ;;
        "Linux")
            # Linux - follows XDG Base Directory specification
            echo "🐧 Detected Linux"
            if [ -n "$XDG_CONFIG_HOME" ]; then
                CLAUDE_CONFIG_DIR="$XDG_CONFIG_HOME/Claude"
            else
                CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
            fi
            ;;
        "CYGWIN"*|"MINGW"*|"MSYS"*)
            # Windows (Git Bash, Cygwin, etc.)
            echo "🪟 Detected Windows"
            if [ -n "$APPDATA" ]; then
                # Convert Windows path to Unix-style for shell compatibility
                CLAUDE_CONFIG_DIR="$(cygpath -u "$APPDATA")/Claude"
            else
                # Fallback for Windows
                CLAUDE_CONFIG_DIR="$HOME/AppData/Roaming/Claude"
            fi
            ;;
        *)
            echo "❓ Unknown operating system: $os_type"
            echo "   Trying Linux-style config path..."
            if [ -n "$XDG_CONFIG_HOME" ]; then
                CLAUDE_CONFIG_DIR="$XDG_CONFIG_HOME/Claude"
            else
                CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
            fi
            ;;
    esac
    
    CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
    echo "📁 Claude config directory: $CLAUDE_CONFIG_DIR"
    echo "📄 Claude config file: $CLAUDE_CONFIG_FILE"
}

# Detect the config path
detect_claude_config_path

# Verify Claude Desktop installation
verify_claude_installation() {
    echo ""
    echo "🔍 Verifying Claude Desktop installation..."
    
    local os_type=$(uname -s)
    local claude_found=false
    
    case "$os_type" in
        "Darwin")
            # macOS - check for Claude.app
            if [ -d "/Applications/Claude.app" ]; then
                echo "✅ Found Claude Desktop at /Applications/Claude.app"
                claude_found=true
            fi
            ;;
        "Linux")
            # Linux - check common installation paths
            if command -v claude &> /dev/null; then
                echo "✅ Found Claude Desktop in PATH"
                claude_found=true
            elif [ -f "$HOME/.local/bin/claude" ]; then
                echo "✅ Found Claude Desktop at $HOME/.local/bin/claude"
                claude_found=true
            elif [ -f "/usr/local/bin/claude" ]; then
                echo "✅ Found Claude Desktop at /usr/local/bin/claude"
                claude_found=true
            elif [ -d "$HOME/.local/share/applications" ] && ls "$HOME/.local/share/applications"/*claude*.desktop &> /dev/null; then
                echo "✅ Found Claude Desktop desktop entry"
                claude_found=true
            fi
            ;;
        "CYGWIN"*|"MINGW"*|"MSYS"*)
            # Windows - check common installation paths
            local program_files="/c/Program Files"
            local program_files_x86="/c/Program Files (x86)"
            local local_appdata=""
            
            # Try to find Claude.exe
            if [ -n "$LOCALAPPDATA" ]; then
                local_appdata="$(cygpath -u "$LOCALAPPDATA")"
            fi
            
            if [ -f "$program_files/Claude/Claude.exe" ]; then
                echo "✅ Found Claude Desktop at $program_files/Claude/Claude.exe"
                claude_found=true
            elif [ -f "$program_files_x86/Claude/Claude.exe" ]; then
                echo "✅ Found Claude Desktop at $program_files_x86/Claude/Claude.exe"
                claude_found=true
            elif [ -n "$local_appdata" ] && [ -f "$local_appdata/Programs/Claude/Claude.exe" ]; then
                echo "✅ Found Claude Desktop at $local_appdata/Programs/Claude/Claude.exe"
                claude_found=true
            fi
            ;;
    esac
    
    if [ "$claude_found" = false ]; then
        echo "⚠️  Warning: Claude Desktop installation not detected"
        echo "   Please make sure Claude Desktop is installed:"
        echo "   - macOS: Download from https://claude.ai/download"
        echo "   - Linux: Check your package manager or download AppImage"
        echo "   - Windows: Download from https://claude.ai/download"
        echo ""
        echo "   Continuing anyway - config will be created for when you install Claude..."
    fi
}

# Verify installation
verify_claude_installation

# Create config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Backup existing config
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "💾 Backing up existing Claude config..."
    cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%Y%m%d-%H%M%S)"
fi

# Function to update Claude config
update_claude_config() {
    echo "📝 Updating Claude Desktop configuration..."
    
    if [ ! -f "$CLAUDE_CONFIG_FILE" ]; then
        # Create new config file
        echo "   Creating new config file..."
        cat > "$CLAUDE_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "liturgical-calendar": {
      "command": "node",
      "args": ["$INDEX_JS"]
    }
  }
}
EOF
    else
        # Update existing config file
        echo "   Updating existing config file..."
        
        # Check if the file has valid JSON
        if ! jq empty "$CLAUDE_CONFIG_FILE" 2>/dev/null; then
            echo "❌ Error: Existing config file has invalid JSON. Please check $CLAUDE_CONFIG_FILE"
            exit 1
        fi
        
        # Check if mcpServers section exists
        if jq -e '.mcpServers' "$CLAUDE_CONFIG_FILE" >/dev/null 2>&1; then
            # mcpServers exists, add or update our server
            if jq -e '.mcpServers."liturgical-calendar"' "$CLAUDE_CONFIG_FILE" >/dev/null 2>&1; then
                echo "   Updating existing liturgical-calendar entry..."
            else
                echo "   Adding liturgical-calendar to existing mcpServers..."
            fi
            
            # Update the file using jq
            jq --arg path "$INDEX_JS" '.mcpServers."liturgical-calendar" = {
                "command": "node",
                "args": [$path]
            }' "$CLAUDE_CONFIG_FILE" > "$CLAUDE_CONFIG_FILE.tmp" && mv "$CLAUDE_CONFIG_FILE.tmp" "$CLAUDE_CONFIG_FILE"
        else
            # No mcpServers section, add it
            echo "   Adding mcpServers section..."
            jq --arg path "$INDEX_JS" '. + {
                "mcpServers": {
                    "liturgical-calendar": {
                        "command": "node",
                        "args": [$path]
                    }
                }
            }' "$CLAUDE_CONFIG_FILE" > "$CLAUDE_CONFIG_FILE.tmp" && mv "$CLAUDE_CONFIG_FILE.tmp" "$CLAUDE_CONFIG_FILE"
        fi
    fi
}

# Check if jq is available for JSON manipulation
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq is not installed. Attempting to install..."
    
    local os_type=$(uname -s)
    case "$os_type" in
        "Darwin")
            # macOS
            if command -v brew &> /dev/null; then
                echo "   Installing jq via Homebrew..."
                brew install jq
            else
                echo "❌ Error: jq is required and Homebrew is not available."
                echo "   Please install jq manually:"
                echo "   - Install Homebrew: https://brew.sh/"
                echo "   - Then run: brew install jq"
                echo "   - Or download from: https://stedolan.github.io/jq/download/"
                exit 1
            fi
            ;;
        "Linux")
            # Linux - try common package managers
            if command -v apt &> /dev/null; then
                echo "   Installing jq via apt..."
                sudo apt update && sudo apt install -y jq
            elif command -v yum &> /dev/null; then
                echo "   Installing jq via yum..."
                sudo yum install -y jq
            elif command -v dnf &> /dev/null; then
                echo "   Installing jq via dnf..."
                sudo dnf install -y jq
            elif command -v pacman &> /dev/null; then
                echo "   Installing jq via pacman..."
                sudo pacman -S jq
            else
                echo "❌ Error: jq is required but no supported package manager found."
                echo "   Please install jq manually: https://stedolan.github.io/jq/download/"
                exit 1
            fi
            ;;
        "CYGWIN"*|"MINGW"*|"MSYS"*)
            # Windows
            echo "❌ Error: jq is required for JSON manipulation."
            echo "   Please install jq manually:"
            echo "   - Download from: https://stedolan.github.io/jq/download/"
            echo "   - Or use package manager like Chocolatey: choco install jq"
            echo "   - Or use winget: winget install stedolan.jq"
            exit 1
            ;;
        *)
            echo "❌ Error: jq is required but automatic installation not supported for $os_type."
            echo "   Please install jq manually: https://stedolan.github.io/jq/download/"
            exit 1
            ;;
    esac
fi

# Update the config
update_claude_config

echo ""
echo "📋 Setup Complete!"
echo ""
echo "✅ MCP Server built: $INDEX_JS"
echo "✅ Claude Desktop config updated: $CLAUDE_CONFIG_FILE"
echo ""
echo "🔄 Next Steps:"
echo ""
echo "1. Restart Claude Desktop completely"
echo "2. Open a new conversation"
echo "3. Look for liturgical calendar tools in the MCP section"
echo ""
echo "🗑️  To remove Docker MCP Toolkit integration:"
echo "   Edit $CLAUDE_CONFIG_FILE and remove the MCP_DOCKER entry"
echo ""
echo "📁 Your config now includes:"
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    cat "$CLAUDE_CONFIG_FILE" | jq '.'
else
    echo "   (Config file not found - this might indicate an issue)"
fi
echo ""
echo "✨ You should now see Liturgical Calendar tools directly in Claude!"