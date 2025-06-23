import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { registerResourceHandlers } from "./resources.js"
import { registerToolHandlers } from "./tools.js"
import { MMLClient } from "@mml-mcp/mml-client"
import { WebWorldClient } from "@mml-mcp/web-world-client"
import { ScreenshotService } from "@mml-mcp/viewer"

/**
 * MCP Server for Metaverse Markup Language (MML)
 *
 * This server provides:
 * - Resources: MML document templates, examples, and element documentation
 * - Tools: MML DOM manipulation, validation, and interaction capabilities
 * - Screenshot server: Local HTTP server for screenshot generation
 * - Game server: 3D Web Experience server for interactive MML experiences
 */

export async function createMcpServer(
  webWorldClient: WebWorldClient,
  mmlClient: MMLClient,
  screenshotService: ScreenshotService,
) {
  const server = new Server(
    {
      name: "mml-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        logging: {},
      },
    },
  )

  server.onerror = (error) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, error)
  }

  const originalSetRequestHandler = server.setRequestHandler.bind(server)
  server.setRequestHandler = function (schema: any, handler: any) {
    const wrappedHandler = async (request: any) => {
      const timestamp = new Date().toISOString()
      const requestType = schema.shape?.method?._def?.value || "unknown"

      let logMessage = `${timestamp} - ${requestType}`
      if (request.params?.name) {
        logMessage += `:  ${request.params?.name}`
      }

      console.log(logMessage)

      try {
        return await handler(request)
      } catch (error) {
        console.error(`${timestamp} - ${requestType}: ERROR -`, error)
        throw error
      }
    }

    return originalSetRequestHandler(schema, wrappedHandler)
  }

  registerResourceHandlers(server)
  registerToolHandlers(server, webWorldClient, mmlClient, screenshotService)

  return server
}
