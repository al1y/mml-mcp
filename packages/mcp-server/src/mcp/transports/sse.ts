import express from "express"
import { createMcpServer } from "../index.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { WebWorldClient } from "@mml-mcp/web-world-client"
import { MMLClient } from "@mml-mcp/mml-client"
import { TransportMode } from "../types.js"
import { ScreenshotService } from "@mml-mcp/viewer"

let expressApp: express.Application
// let _httpServer: any

// Start the server with SSE transport
export async function startSSEServer(
  port: number,
  webWorldClient: WebWorldClient,
  mmlClient: MMLClient,
  screenshotService: ScreenshotService,
) {
  console.log("Starting MCP server with SSE transport...")

  expressApp = express()

  expressApp.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    if (req.method === "OPTIONS") {
      res.sendStatus(200)
    } else {
      next()
    }
  })

  expressApp.use(express.json())

  // Store active transports by session ID
  const activeTransports = new Map<string, SSEServerTransport>()

  // SSE endpoint for establishing the connection
  expressApp.get("/sse", async (req, res) => {
    try {
      // Validate Origin header to prevent DNS rebinding attacks
      const origin = req.headers.origin
      const allowedOrigins = ["http://localhost", "https://localhost"]
      if (
        origin &&
        !allowedOrigins.some((allowed) => origin.startsWith(allowed))
      ) {
        console.error(`Rejected connection from origin: ${origin}`)
        res.status(403).send("Forbidden: Invalid origin")
        return
      }

      console.log(
        `${new Date().toISOString()} - New SSE connection established`,
      )

      // Create new MCP server instance for this connection
      const sessionMcpServer = await createMcpServer(
        webWorldClient,
        mmlClient,
        screenshotService,
      )

      // Create SSE transport
      const transport = new SSEServerTransport("/message", res)
      activeTransports.set(transport.sessionId, transport)

      // Connect the MCP server to the transport
      await sessionMcpServer.connect(transport)

      // Clean up when connection closes
      transport.onclose = () => {
        console.log(`${new Date().toISOString()} - SSE connection closed`)
        activeTransports.delete(transport.sessionId)
      }

      transport.onerror = (error: Error) => {
        console.error(
          `${new Date().toISOString()} - SSE transport error:`,
          error,
        )
        activeTransports.delete(transport.sessionId)
      }

      console.log(`Transport session ID: ${transport.sessionId}`)
    } catch (error) {
      console.error(`Failed to establish SSE connection:`, error)
      res.status(500).send("Internal Server Error")
    }
  })

  // POST endpoint for receiving messages
  expressApp.post("/message", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string
      console.log(
        `${new Date().toISOString()} - Received POST message for session: ${sessionId}`,
      )

      if (!sessionId) {
        res.status(400).send("Missing session ID in query parameters")
        return
      }

      const transport = activeTransports.get(sessionId)
      if (!transport) {
        res.status(404).send("Session not found")
        return
      }

      // Handle the message through the transport
      await transport.handlePostMessage(req, res, req.body)
    } catch (error) {
      console.error(`Failed to handle POST message:`, error)
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error")
      }
    }
  })

  // Health check endpoint
  expressApp.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      transport: TransportMode.sse,
      timestamp: new Date().toISOString(),
      activeConnections: activeTransports.size,
    })
  })

  expressApp.listen(port, "127.0.0.1", () => {
    console.log(`[SSE] SSE server running on http://127.0.0.1:${port}`)
  })
}
