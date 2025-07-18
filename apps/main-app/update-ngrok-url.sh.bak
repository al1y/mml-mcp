#!/bin/bash

# Update MCP_SERVER_URL with current ngrok URL
# Usage: ./update-ngrok-url.sh

echo "🔍 Getting current ngrok URL..."

# Get the ngrok URL from the local API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Could not get ngrok URL. Is ngrok running?"
    echo "💡 Make sure ngrok is running with: ngrok http 3000"
    exit 1
fi

echo "🌐 Found ngrok URL: $NGROK_URL"

# Update or create .env.local file
ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
    # Check if MCP_SERVER_URL already exists in the file
    if grep -q "MCP_SERVER_URL=" "$ENV_FILE"; then
        # Update existing line
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|MCP_SERVER_URL=.*|MCP_SERVER_URL=${NGROK_URL}|" "$ENV_FILE"
        else
            # Linux
            sed -i "s|MCP_SERVER_URL=.*|MCP_SERVER_URL=${NGROK_URL}|" "$ENV_FILE"
        fi
        echo "✅ Updated MCP_SERVER_URL in $ENV_FILE"
    else
        # Add new line
        echo "MCP_SERVER_URL=${NGROK_URL}" >>"$ENV_FILE"
        echo "✅ Added MCP_SERVER_URL to $ENV_FILE"
    fi
else
    # Create new file
    echo "MCP_SERVER_URL=${NGROK_URL}" >"$ENV_FILE"
    echo "✅ Created $ENV_FILE with MCP_SERVER_URL"
fi

echo ""
echo "🚀 Your MCP server is now accessible at: ${NGROK_URL}/api/mcp"
echo "💡 Restart your Next.js server to pick up the new environment variable"
echo ""
echo "🧪 Test with:"
echo "curl -H \"ngrok-skip-browser-warning: true\" \"${NGROK_URL}/api/mcp/health\""
