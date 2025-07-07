import { randomUUID } from "crypto"
import { getMcpConfig } from "./config"

// Types for our dependencies (will be loaded dynamically)
type MMLClient = any
type WebWorldClient = any
type ScreenshotService = any
type Server = any
type StreamableHTTPServerTransport = any

// MCP server configuration
const DEFAULT_MML_SERVER_URL = "http://localhost:8001"
const DEFAULT_WEB_WORLD_SERVER_URL = "http://localhost:8002"

// Store active server instances by session ID
const activeSessions = new Map<string, { server: any; transport: any }>()

// Global clients - initialized once
let mmlClient: any | null = null
let webWorldClient: any | null = null
let screenshotService: any | null = null

/**
 * Initialize the MCP server dependencies using dynamic imports
 */
export async function initializeMcpDependencies() {
  if (mmlClient && webWorldClient && screenshotService) {
    return { mmlClient, webWorldClient, screenshotService }
  }

  try {
    // Get configuration
    const config = getMcpConfig()

    // Dynamic imports for ES modules
    const { MMLClient } = await import("@mml-mcp/mml-client")
    const { WebWorldClient } = await import("@mml-mcp/web-world-client")
    const { ScreenshotService } = await import("@mml-mcp/viewer")

    // Initialize MML client
    mmlClient = new MMLClient(config.mmlServerUrl)

    // Initialize Web World client
    webWorldClient = new WebWorldClient(config.webWorldServerUrl)

    // Initialize screenshot service
    screenshotService = new ScreenshotService(
      config.viewerServerPort,
      mmlClient.getUrl(),
    )
    await screenshotService.initialize()

    console.log(`🍱 MML Client initialized: ${mmlClient.getUrl()}`)
    console.log(`🌍 Web World Client initialized: ${webWorldClient.getUrl()}`)
    console.log(
      `📸 Screenshot Service initialized: ${screenshotService.getUrl()}`,
    )

    return { mmlClient, webWorldClient, screenshotService }
  } catch (error) {
    console.error("Failed to initialize MCP dependencies:", error)
    throw error
  }
}

/**
 * Create a new MCP session
 */
export async function createMcpSession(): Promise<{
  sessionId: string
  server: any
  transport: any
}> {
  const { mmlClient, webWorldClient, screenshotService } =
    await initializeMcpDependencies()

  // Dynamic imports for MCP server
  const { createMcpServer } = await import(
    "@mml-mcp/mcp-server/build/mcp/index.js"
  )
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  )

  // Create new session ID
  const sessionId = randomUUID()
  console.log(`Creating new MCP session: ${sessionId}`)

  // Create new MCP server instance for this session
  const mcpServer = await createMcpServer(
    webWorldClient,
    mmlClient,
    screenshotService,
  )

  // Create StreamableHTTP transport for this session
  const mcpTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    enableJsonResponse: true,
  })

  // Connect server to transport
  await mcpServer.connect(mcpTransport)

  // Store the session
  activeSessions.set(sessionId, {
    server: mcpServer,
    transport: mcpTransport,
  })

  return { sessionId, server: mcpServer, transport: mcpTransport }
}

/**
 * Get an existing MCP session
 */
export function getMcpSession(sessionId: string) {
  return activeSessions.get(sessionId)
}

/**
 * Remove an MCP session
 */
export async function removeMcpSession(sessionId: string) {
  const session = activeSessions.get(sessionId)
  if (session) {
    try {
      await session.server.close()
      activeSessions.delete(sessionId)
      console.log(`Closed MCP session: ${sessionId}`)
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error)
    }
  }
}

/**
 * Get all active sessions
 */
export function getActiveSessions() {
  return Array.from(activeSessions.keys())
}

/**
 * Clean up all sessions
 */
export async function cleanupAllSessions() {
  const sessionIds = Array.from(activeSessions.keys())
  await Promise.all(sessionIds.map(removeMcpSession))
}
