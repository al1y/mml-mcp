import { NextApiRequest, NextApiResponse } from "next"
import {
  getMcpServerConfig,
  getMcpServerUrl,
  getMcpServerBaseUrl,
} from "../../../lib/config"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Get MCP server configuration
    const requestOrigin =
      req.headers.origin ||
      `http://localhost:${req.headers.host?.split(":")[1] || "3000"}`
    const baseUrl = getMcpServerBaseUrl(requestOrigin)
    const mcpServerUrl = getMcpServerUrl(requestOrigin)
    const mcpConfig = getMcpServerConfig(requestOrigin)

    // Test if we can make a basic MCP request (initialize)
    const testRequest = {
      jsonrpc: "2.0",
      id: "test-1",
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {
          roots: {
            listChanged: true,
          },
        },
        clientInfo: {
          name: "MCP Test Client",
          version: "1.0.0",
        },
      },
    }

    // Test the MCP server endpoint
    const mcpResponse = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testRequest),
    })

    const mcpData = await mcpResponse.json()
    const sessionId = mcpResponse.headers.get("Mcp-Session-Id")

    // Test the health endpoint
    const healthResponse = await fetch(`${baseUrl}/api/mcp/health`)
    const healthData = await healthResponse.json()

    res.status(200).json({
      status: "MCP server is accessible for OpenAI integration",
      mcp_server_url: mcpServerUrl,
      environment: {
        mcp_server_url_configured: !!process.env.MCP_SERVER_URL,
        using_env_var: !!process.env.MCP_SERVER_URL,
        base_url: baseUrl,
      },
      test_results: {
        mcp_endpoint: {
          status: mcpResponse.ok ? "✅ Working" : "❌ Failed",
          response_status: mcpResponse.status,
          session_id: sessionId,
          has_result: !!mcpData.result,
        },
        health_endpoint: {
          status: healthResponse.ok ? "✅ Working" : "❌ Failed",
          response_status: healthResponse.status,
          server_health: healthData.status,
        },
      },
      openai_integration: {
        ready: mcpResponse.ok && healthResponse.ok,
        tools_config: mcpConfig,
      },
      instructions: {
        for_openai: `Use this MCP server URL in your OpenAI API calls: ${mcpServerUrl}`,
        environment_variables: [
          "Set OPENAI_API_KEY to your OpenAI API key",
          "Set MCP_SERVER_URL to your ngrok URL (e.g., https://abc123.ngrok-free.app)",
          "Ensure the server is publicly accessible if using with OpenAI",
        ],
        setup_commands: [
          "# Set your ngrok URL as environment variable:",
          'echo "MCP_SERVER_URL=${NGROK_URL}" >> .env.local',
          "# Or export for current session:",
          `export MCP_SERVER_URL="${baseUrl}"`,
        ],
      },
    })
  } catch (error) {
    console.error("MCP test failed:", error)
    res.status(500).json({
      status: "❌ MCP server test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      instructions: [
        "Make sure the main-app is running",
        "Check that the MCP server dependencies are properly initialized",
        "Verify network connectivity",
        "Set MCP_SERVER_URL environment variable to your ngrok URL",
      ],
    })
  }
}
