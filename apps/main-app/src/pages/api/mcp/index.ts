import { NextApiRequest, NextApiResponse } from "next"
import { createMcpSession, getMcpSession } from "../../../lib/mcp-server"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, Mcp-Session-Id, Last-Event-ID",
  )

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32601, message: "Method not allowed" },
    })
  }

  try {
    const requestBody = req.body
    let sessionId = req.headers["mcp-session-id"] as string

    // Check if this is an initialization request
    if (requestBody && requestBody.method === "initialize") {
      // Create new session for initialization
      const { sessionId: newSessionId, transport } = await createMcpSession()
      sessionId = newSessionId

      console.log(`🔄 Processing initialize request for session: ${sessionId}`)

      // Set the session ID in response headers
      res.setHeader("Mcp-Session-Id", sessionId)

      // Handle the initialization request
      await transport.handleRequest(req, res, requestBody)
    } else {
      // For non-initialization requests, find existing session
      if (!sessionId) {
        return res.status(400).json({
          jsonrpc: "2.0",
          id: requestBody?.id || null,
          error: {
            code: -32600,
            message: "Bad Request: Missing Mcp-Session-Id header",
          },
        })
      }

      const session = getMcpSession(sessionId)
      if (!session) {
        return res.status(404).json({
          jsonrpc: "2.0",
          id: requestBody?.id || null,
          error: { code: -32600, message: "Session not found" },
        })
      }

      console.log(
        `🔄 Processing ${requestBody?.method || "unknown"} request for session: ${sessionId}`,
      )

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
}
