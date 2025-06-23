import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createMcpServer } from "../index.js"
import { WebWorldClient } from "@mml-mcp/web-world-client"
import { MMLClient } from "@mml-mcp/mml-client"
import { ScreenshotService } from "@mml-mcp/viewer"

// Start the server with stdio transport
export async function startStdioServer(
  webWorldClient: WebWorldClient,
  mmlClient: MMLClient,
  screenshotService: ScreenshotService,
) {
  console.log("Starting MCP server with stdio transport...")

  // Create MCP server instance
  const mcpServer = await createMcpServer(
    webWorldClient,
    mmlClient,
    screenshotService,
  )

  // Create stdio transport
  const transport = new StdioServerTransport()

  // Connect the MCP server to the transport
  await mcpServer.connect(transport)

  console.log("MCP server started and connected to stdio transport")

  return mcpServer
}
