#!/bin/bash

# Update MCP_SERVER_URL with Pinggy URL
# Usage: ./update-pinggy-url.sh [PINGGY_URL]

# If URL is provided as argument, use it; otherwise try to find it from running processes
if [ ! -z "$1" ]; then
    PINGGY_URL="$1"
    echo "🔗 Using provided Pinggy URL: $PINGGY_URL"
else
    echo "🔍 Searching for active Pinggy tunnel..."

    # Try to find Pinggy URL from running SSH processes
    PINGGY_PROCESSES=$(ps aux | grep "ssh.*pinggy" | grep -v grep || true)

    if [ -z "$PINGGY_PROCESSES" ]; then
        echo "❌ No active Pinggy tunnel found and no URL provided"
        echo "💡 Usage: ./update-pinggy-url.sh <PINGGY_URL>"
        echo "💡 Or start a Pinggy tunnel first with: ssh -p 443 -R0:localhost:3000 a.pinggy.io"
        exit 1
    fi

    echo "⚠️  Found active Pinggy tunnel, but cannot automatically extract URL"
    echo "💡 Please provide the Pinggy URL as an argument:"
    echo "💡 ./update-pinggy-url.sh https://your-tunnel.pinggy.link"
    exit 1
fi

# Validate URL format
if [[ ! "$PINGGY_URL" =~ ^https?://.*\.pinggy\.link$ ]]; then
    echo "❌ Invalid Pinggy URL format: $PINGGY_URL"
    echo "💡 Expected format: https://something.pinggy.link"
    exit 1
fi

echo "🌐 Using Pinggy URL: $PINGGY_URL"

# Update or create .env.local file
ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
    # Check if MCP_SERVER_URL already exists in the file
    if grep -q "MCP_SERVER_URL=" "$ENV_FILE"; then
        # Update existing line
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|MCP_SERVER_URL=.*|MCP_SERVER_URL=${PINGGY_URL}|" "$ENV_FILE"
        else
            # Linux
            sed -i "s|MCP_SERVER_URL=.*|MCP_SERVER_URL=${PINGGY_URL}|" "$ENV_FILE"
        fi
        echo "✅ Updated MCP_SERVER_URL in $ENV_FILE"
    else
        # Add new line
        echo "MCP_SERVER_URL=${PINGGY_URL}" >>"$ENV_FILE"
        echo "✅ Added MCP_SERVER_URL to $ENV_FILE"
    fi
else
    # Create new file
    echo "MCP_SERVER_URL=${PINGGY_URL}" >"$ENV_FILE"
    echo "✅ Created $ENV_FILE with MCP_SERVER_URL"
fi

echo ""
echo "🚀 Your MCP server is now accessible at: ${PINGGY_URL}/api/mcp"
echo "💡 Restart your Next.js server to pick up the new environment variable"
echo ""
echo "🧪 Test with:"
echo "curl \"${PINGGY_URL}/api/mcp/health\""
