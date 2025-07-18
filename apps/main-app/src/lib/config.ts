/**
 * Configuration utilities for MCP server integration
 */

import { TOOL_NAMES } from "@mml-mcp/mcp-server"

/**
 * Get the MCP server base URL
 * Uses environment variable MCP_SERVER_URL or falls back to request origin
 */
export function getMcpServerBaseUrl(): string {
  // Use environment variable if available
  if (process.env.MCP_SERVER_URL) {
    return process.env.MCP_SERVER_URL
  }

  // Fatal error if MCP_SERVER_URL is not configured
  throw new Error("MCP_SERVER_URL environment variable is required but not set")
}

/**
 * Get the full MCP server endpoint URL
 */
export function getMcpServerUrl(): string {
  const baseUrl = getMcpServerBaseUrl()
  return `${baseUrl}/api/mcp`
}

/**
 * Get MCP server configuration for OpenAI integration
 */
export function getMcpServerConfig() {
  return {
    type: "mcp" as const,
    server_label: "mml-mcp-server",
    server_url: getMcpServerUrl(),
    allowed_tools: Object.values(TOOL_NAMES),
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
