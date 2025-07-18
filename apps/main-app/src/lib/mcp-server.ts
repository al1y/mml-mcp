import { randomUUID } from "crypto"
import http from "http"

import { MMLClient } from "@mml-mcp/mml-client"
import { WebWorldClient } from "@mml-mcp/web-world-client"
import { ScreenshotService } from "@mml-mcp/viewer"

import { createMcpServer } from "@mml-mcp/mcp-server/build/mcp/index.js"
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

// Direct serverless transport that processes MCP requests without sessions
class ServerlessTransport {
  private server: any

  constructor(server: any) {
    this.server = server
  }

  async handleRequest(req: any, res: any, requestBody: any) {
    try {
      console.log(`📨 Processing ${requestBody.method} request`)

      let response: any

      switch (requestBody.method) {
        case "initialize":
          response = await this.handleInitialize(requestBody)
          break
        case "tools/list":
          response = await this.handleToolsList(requestBody)
          break
        case "tools/call":
          response = await this.handleToolCall(requestBody)
          break
        case "resources/list":
          response = await this.handleResourcesList(requestBody)
          break
        case "resources/read":
          response = await this.handleResourceRead(requestBody)
          break
        default:
          response = {
            jsonrpc: "2.0",
            id: requestBody.id,
            error: {
              code: -32601,
              message: `Method '${requestBody.method}' not found`,
            },
          }
      }

      res.status(200).json(response)
    } catch (error) {
      console.error("ServerlessTransport error:", error)
      const errorResponse = {
        jsonrpc: "2.0",
        id: requestBody?.id || null,
        error: {
          code: -32603,
          message: "Internal Server Error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      }
      res.status(500).json(errorResponse)
    }
  }

  private async handleInitialize(request: any) {
    // Just return a successful initialize response
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: "mml-mcp-server",
          version: "1.2.3",
        },
      },
    }
  }

  private async handleToolsList(request: any) {
    try {
      // Call the server's registered handler directly
      const parsedRequest = ListToolsRequestSchema.parse(request)
      const result =
        await this.server.requestHandlers.get("tools/list")(parsedRequest)

      return {
        jsonrpc: "2.0",
        id: request.id,
        result,
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error processing tools/list",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  private async handleToolCall(request: any) {
    try {
      // Call the server's registered handler directly
      const parsedRequest = CallToolRequestSchema.parse(request)
      const result =
        await this.server.requestHandlers.get("tools/call")(parsedRequest)

      return {
        jsonrpc: "2.0",
        id: request.id,
        result,
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error processing tools/call",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  private async handleResourcesList(request: any) {
    try {
      // Call the server's registered handler directly
      const parsedRequest = ListResourcesRequestSchema.parse(request)
      const result =
        await this.server.requestHandlers.get("resources/list")(parsedRequest)

      return {
        jsonrpc: "2.0",
        id: request.id,
        result,
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error processing resources/list",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  private async handleResourceRead(request: any) {
    try {
      // Call the server's registered handler directly
      const parsedRequest = ReadResourceRequestSchema.parse(request)
      const result =
        await this.server.requestHandlers.get("resources/read")(parsedRequest)

      return {
        jsonrpc: "2.0",
        id: request.id,
        result,
      }
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error processing resources/read",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }
}

// Global clients - initialized once per function invocation
let mmlClient: any | null = null
let webWorldClient: any | null = null
let screenshotService: any | null = null

/**
 * Initialize the MCP server dependencies using dynamic imports
 */
export async function initializeMcpDependencies() {
  const mmlUrl = process.env.MML_SERVER_URL
  if (!mmlUrl) {
    throw new Error(
      "MML_SERVER_URL environment variable is required but not set",
    )
  }

  const webWorldUrl = process.env.WEB_WORLD_SERVER_URL
  if (!webWorldUrl) {
    throw new Error(
      "WEB_WORLD_SERVER_URL environment variable is required but not set",
    )
  }

  const viewerPort = await getRandomPort()
  if (isNaN(viewerPort)) {
    throw new Error(
      "VIEWER_SERVER_PORT environment variable is required but not set",
    )
  }

  try {
    // Initialize MML client
    mmlClient = new MMLClient(mmlUrl)

    // Initialize Web World client
    webWorldClient = new WebWorldClient(webWorldUrl)

    // Initialize screenshot service
    screenshotService = new ScreenshotService(viewerPort, mmlClient.getUrl())
    await screenshotService.initialize()

    return { mmlClient, webWorldClient, screenshotService }
  } catch (error) {
    console.error("Failed to initialize MCP dependencies:", error)
    throw error
  }
}

// Function to get a random available port
function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(0, () => {
      const address = server.address()
      if (address && typeof address === "object") {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        reject(new Error("Failed to get port"))
      }
    })
  })
}

/**
 * Create a new MCP server and transport for a single request
 * This is stateless and works perfectly in serverless environments
 */
export async function createMcpServerForRequest(): Promise<{
  server: any
  transport: any
}> {
  const { mmlClient, webWorldClient, screenshotService } =
    await initializeMcpDependencies()

  // console.log(`🍱 MML Client initialized: ${mmlClient.getUrl()}`)
  // console.log(`🌍 Web World Client initialized: ${webWorldClient.getUrl()}`)
  // console.log(
  //   `📸 Screenshot Service initialized: ${screenshotService.getUrl()}`,
  // )

  // Create new MCP server instance
  const mcpServer = await createMcpServer(
    webWorldClient,
    mmlClient,
    screenshotService,
  )

  // Create serverless transport directly
  const mcpTransport = new ServerlessTransport(mcpServer)

  return { server: mcpServer, transport: mcpTransport }
}
