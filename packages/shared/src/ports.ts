// Shared port configuration for all services
export const SERVICE_PORTS = {
  MML_SERVER: 8001,
  WEB_WORLD_SERVER: 8002,
  MCP_SERVER_SSE: 8003,
  MCP_SERVER_HTTP: 8004,
  GAME_CLIENT_DEV: 8005,
  SCREENSHOT_SERVER: 8006,
} as const

export const SERVICE_URLS = {
  MML_SERVER: `http://localhost:${SERVICE_PORTS.MML_SERVER}`,
  WEB_WORLD_SERVER: `http://localhost:${SERVICE_PORTS.WEB_WORLD_SERVER}`,
  MCP_SERVER_SSE: `http://localhost:${SERVICE_PORTS.MCP_SERVER_SSE}/sse`,
  MCP_SERVER_HTTP: `http://localhost:${SERVICE_PORTS.MCP_SERVER_HTTP}/mcp`,
  GAME_CLIENT_DEV: `http://localhost:${SERVICE_PORTS.GAME_CLIENT_DEV}`,
  SCREENSHOT_SERVER: `http://localhost:${SERVICE_PORTS.SCREENSHOT_SERVER}`,
} as const

// Helper to wait for a service to be ready
export async function waitForService(
  url: string,
  maxAttempts = 30,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`).catch(() => ({ ok: false }))
      if (response.ok) {
        return true
      }
    } catch {
      // Service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}
