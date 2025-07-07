/**
 * Configuration utilities for MCP server integration
 */

/**
 * Get the MCP server base URL
 * Uses environment variable MCP_SERVER_URL or falls back to request origin
 */
export function getMcpServerBaseUrl(requestOrigin?: string): string {
  // Use environment variable if available
  if (process.env.MCP_SERVER_URL) {
    return process.env.MCP_SERVER_URL
  }

  // Fall back to request origin or localhost
  const fallback = requestOrigin || "http://localhost:3000"
  return fallback
}

/**
 * Get the full MCP server endpoint URL
 */
export function getMcpServerUrl(requestOrigin?: string): string {
  const baseUrl = getMcpServerBaseUrl(requestOrigin)
  return `${baseUrl}/api/mcp`
}

/**
 * Get MCP server configuration for OpenAI integration
 */
export function getMcpServerConfig(requestOrigin?: string) {
  const serverUrl = getMcpServerUrl(requestOrigin)

  return {
    type: "mcp" as const,
    server_label: "mml-mcp-server",
    server_url: serverUrl,
    allowed_tools: [
      "create-world",
      "update-elements",
      "update-script",
      "screenshot-world",
      "fetch-mml-info",
    ],
    require_approval: "never" as const,
  }
}

/**
 * Check if MCP server URL is configured
 */
export function hasMcpServerUrl(): boolean {
  return !!process.env.MCP_SERVER_URL
}

/**
 * Get all MCP-related configuration
 */
export function getMcpConfig() {
  return {
    serverUrl: process.env.MCP_SERVER_URL,
    mmlServerUrl: process.env.MML_SERVER_URL || "http://localhost:8001",
    webWorldServerUrl:
      process.env.WEB_WORLD_SERVER_URL || "http://localhost:8002",
    viewerServerPort: parseInt(process.env.VIEWER_SERVER_PORT || "8003"),
  }
}
