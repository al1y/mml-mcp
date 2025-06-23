import express from "express"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { createMcpServer } from "../index.js"
import { WebWorldClient } from "@mml-mcp/web-world-client"
import { MMLClient } from "@mml-mcp/mml-client"
import { randomUUID } from "crypto"
import { TransportMode } from "../types.js"
import { ScreenshotService } from "@mml-mcp/viewer"

let expressApp: express.Application
let httpServer: any

// Store active server instances by session ID
const activeSessions = new Map<
  string,
  { server: Server; transport: StreamableHTTPServerTransport }
>()

export async function startStreamableHttpServer(
  port: number,
  webWorldClient: WebWorldClient,
  mmlClient: MMLClient,
  screenshotService: ScreenshotService,
) {
  expressApp = express()

  // CORS middleware
  expressApp.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept, Mcp-Session-Id, Last-Event-ID",
    )
    if (req.method === "OPTIONS") {
      res.sendStatus(200)
    } else {
      next()
    }
  })

  // Parse JSON bodies
  expressApp.use(express.json())

  // Handle MCP requests with per-session server instances
  expressApp.all("/mcp", async (req, res) => {
    try {
      const requestBody = req.body
      let sessionId = req.headers["mcp-session-id"] as string

      // Check if this is an initialization request
      if (requestBody && requestBody.method === "initialize") {
        // Create new session for initialization
        sessionId = randomUUID()
        console.log(`Creating new MCP session: ${sessionId}`)

        // Create new MCP server instance for this session
        const mcpServer = await createMcpServer(
          webWorldClient,
          mmlClient,
          screenshotService,
        )

        // Create StreamableHTTP transport for this session
        const mcpTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId, // Use the generated session ID
          enableJsonResponse: true,
        })

        // Connect server to transport
        await mcpServer.connect(mcpTransport)

        // Store the session
        activeSessions.set(sessionId, {
          server: mcpServer,
          transport: mcpTransport,
        })

        // Handle the initialization request
        await mcpTransport.handleRequest(req, res, requestBody)
      } else {
        // For non-initialization requests, find existing session
        if (!sessionId) {
          res.status(400).json({
            jsonrpc: "2.0",
            id: requestBody?.id || null,
            error: {
              code: -32600,
              message: "Bad Request: Missing Mcp-Session-Id header",
            },
          })
          return
        }

        const session = activeSessions.get(sessionId)
        if (!session) {
          res.status(404).json({
            jsonrpc: "2.0",
            id: requestBody?.id || null,
            error: { code: -32600, message: "Session not found" },
          })
          return
        }

        // Handle the request with the session's transport
        await session.transport.handleRequest(req, res, requestBody)
      }
    } catch (error) {
      console.error("Error handling MCP request:", error)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal Server Error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
        })
      }
    }
  })

  // Health check endpoint
  expressApp.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      transport: TransportMode.streamableHttp,
      specification: "2025-03-26",
      timestamp: new Date().toISOString(),
    })
  })

  // Start the HTTP server
  httpServer = expressApp.listen(port, "127.0.0.1", () => {
    console.log(`✅ MML MCP server running on http://127.0.0.1:${port}`)
  })
}

export async function stopStreamableHttpServer() {
  // Close all active sessions
  for (const [sessionId, session] of activeSessions) {
    try {
      await session.server.close()
      console.log(`Closed MCP session: ${sessionId}`)
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error)
    }
  }
  activeSessions.clear()

  // Properly close the HTTP server and wait for it to complete
  if (httpServer) {
    return new Promise<void>((resolve, reject) => {
      httpServer.close((err: any) => {
        if (err) {
          console.error("Error closing HTTP server:", err)
          reject(err)
        } else {
          console.log("HTTP server closed successfully")
          resolve()
        }
      })
    })
  }
}
