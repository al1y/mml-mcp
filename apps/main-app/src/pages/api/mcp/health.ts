import { NextApiRequest, NextApiResponse } from "next"
import { getActiveSessions } from "../../../lib/mcp-server"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Get active sessions count without initializing dependencies
    const activeSessions = getActiveSessions()

    res.status(200).json({
      status: "healthy",
      transport: "streamable-http",
      specification: "2025-03-26",
      timestamp: new Date().toISOString(),
      message: "MCP server is ready for connections",
      sessions: {
        active: activeSessions.length,
        ids: activeSessions,
      },
      endpoints: {
        health: "/api/mcp/health",
        main: "/api/mcp",
        test: "/api/mcp/test",
      },
    })
  } catch (error) {
    console.error("Health check failed:", error)
    res.status(500).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    })
  }
}
