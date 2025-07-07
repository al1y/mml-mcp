# MML MCP Main App

A Next.js application that exposes the MML MCP server via streamable HTTP transport for OpenAI API integration.

## 🚀 Quick Setup

### 1. Install ngrok
```bash
brew install ngrok
```

### 2. Setup Environment Variables
```bash
cd apps/main-app
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY
```

### 3. Start Next.js App
```bash
npm run dev
```

### 4. Start ngrok Tunnel (in new terminal)
```bash
ngrok http 3000 --log stdout --log-level info
```

### 5. Set Environment Variable
```bash
# Use the provided script to automatically update MCP_SERVER_URL
./update-ngrok-url.sh

# Or manually set it:
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | cut -d'"' -f4)
echo "MCP_SERVER_URL=${NGROK_URL}" >> .env.local
```

### 6. Test Health Check
```bash
curl -H "ngrok-skip-browser-warning: true" "${NGROK_URL}/api/mcp/health"
```

### 7. Test MCP Endpoint
```bash
curl -X POST -H "Content-Type: application/json" -H "ngrok-skip-browser-warning: true" -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"capabilities": {}}}' "${NGROK_URL}/api/mcp"
```

## 🔧 Environment Variables

Copy the example file and configure your variables:
```bash
cp .env.example .env.local
```

Then edit `.env.local` with your values:

```env
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-your-openai-key-here

# Required: Set your ngrok URL for MCP server access
MCP_SERVER_URL=https://your-ngrok-url.ngrok-free.app

# Optional: Custom ports for MCP dependencies (these are defaults)
MML_SERVER_URL=http://localhost:8001
WEB_WORLD_SERVER_URL=http://localhost:8002
VIEWER_SERVER_PORT=8003
```

**Quick setup:**
1. Copy the example: `cp .env.example .env.local`
2. Get your OpenAI API key from [OpenAI API Keys](https://platform.openai.com/api-keys)
3. Add your `OPENAI_API_KEY` to `.env.local`
4. Run `./update-ngrok-url.sh` to automatically set `MCP_SERVER_URL`
5. Restart your Next.js server to load the new environment variables

## 📡 OpenAI Integration

The MCP server URL is automatically configured from the `MCP_SERVER_URL` environment variable:

```typescript
const response = await openai.responses.create({
  model: "gpt-4o-mini",
  input: messages,
  tools: [
    {
      type: "mcp",
      server_label: "mml-mcp-server",
      server_url: process.env.MCP_SERVER_URL + "/api/mcp",
      allowed_tools: ["create-world", "update-elements", "update-script", "screenshot-world", "fetch-mml-info"],
      require_approval: "never"
    }
  ]
});
```

## 🔧 Available Endpoints

- **Health Check**: `/api/mcp/health`
- **MCP Protocol**: `/api/mcp`
- **Test Endpoint**: `/api/mcp/test`
- **Chat Interface**: `/api/chat`
- **Web Interface**: `/`

## 🎯 MCP Tools Available

1. `create-world` - Create new MML worlds
2. `update-elements` - Add/update/delete MML elements
3. `update-script` - Add interactivity with JavaScript
4. `screenshot-world` - Capture screenshots of worlds
5. `fetch-mml-info` - Get MML element documentation

## 🛠️ Development

The app runs on `http://localhost:3000` by default. If port 3000 is busy, Next.js will automatically try port 3001.

### Auto-Update ngrok URL
When ngrok restarts and gives you a new URL, simply run:
```bash
./update-ngrok-url.sh
```

This script will:
- Get the current ngrok URL
- Update your `.env.local` file with the new `MCP_SERVER_URL`
- Show you the test commands to verify it's working

Make sure to update your ngrok tunnel to match the actual port Next.js is using. 