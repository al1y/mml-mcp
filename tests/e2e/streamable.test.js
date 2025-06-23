import * as jest from "@jest/globals"
const { describe, test, expect, beforeAll, afterAll } = jest
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { getRandomPort } from "@mml-mcp/shared"
import { createMMLClient } from "@mml-mcp/mml-client"
import { createWebWorldClient } from "@mml-mcp/web-world-client"
import { startMcpServer } from "../../packages/mcp-server/build/index.js"
import { TransportMode } from "../../packages/mcp-server/build/mcp/types.js"
import { stopStreamableHttpServer } from "../../packages/mcp-server/build/mcp/transports/streamable-http.js"
import { ScreenshotService } from "../../packages/viewer/build/index.js"
import { toMatchImageSnapshot } from "jest-image-snapshot"
import * as path from "path"
import * as fs from "fs"
import { JSDOM } from "jsdom"

// Function to convert MML to JSON elements format
function convertMMLToJSON(mmlContent) {
  // Wrap content in a root element to handle multiple top-level elements
  const wrappedContent = `<root>${mmlContent}</root>`
  const dom = new JSDOM(wrappedContent, { contentType: "text/xml" })
  const doc = dom.window.document

  function parseElement(element) {
    const attributes = {}

    // Extract all attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      let value = attr.value

      // Convert boolean attributes
      if (value === "true") {
        value = true
      } else if (value === "false") {
        value = false
      } else if (!isNaN(value) && value !== "") {
        // Convert numeric attributes to numbers
        value = parseFloat(value)
      }

      attributes[attr.name] = value
    }

    const result = {
      tag: element.tagName,
      attributes,
    }

    // Parse children if they exist
    const children = []
    for (const child of element.children) {
      if (child.tagName && child.tagName.startsWith("m-")) {
        children.push(parseElement(child))
      }
    }

    if (children.length > 0) {
      result.children = children
    }

    return result
  }

  const elements = []
  const mmlElements = doc.querySelectorAll(
    "m-group, m-cube, m-sphere, m-cylinder, m-light, m-model, m-character, m-video, m-audio, m-label",
  )

  for (const element of mmlElements) {
    // Only add top-level elements (not nested ones)
    if (
      !element.parentElement ||
      !element.parentElement.tagName.startsWith("m-")
    ) {
      elements.push(parseElement(element))
    }
  }

  return elements
}

// Extend expect to support image snapshot matching
expect.extend({ toMatchImageSnapshot })

describe("Streamable HTTP E2E Tests", () => {
  let mmlClient = null
  let webWorldClient = null
  let screenshotService = null
  let mcpPort = null

  beforeAll(async () => {
    mcpPort = await getRandomPort()
  }, 10000)

  afterAll(async () => {
    try {
      await stopStreamableHttpServer()
    } catch (error) {
      console.warn("⚠️ Error cleaning up MCP server:", error.message)
    }

    if (screenshotService) {
      try {
        await screenshotService.cleanup()
      } catch (error) {
        console.warn("⚠️ Error cleaning up Screenshot service:", error.message)
      }
    }

    if (mmlClient) {
      try {
        await mmlClient.stop()
      } catch (error) {
        console.warn("⚠️ Error cleaning up MML client:", error.message)
      }
    }

    if (webWorldClient) {
      try {
        await webWorldClient.stop()
      } catch (error) {
        console.warn("⚠️ Error cleaning up Web World client:", error.message)
      }
    }
  }, 20000)

  test("should complete full streamable HTTP server and MCP client integration", async () => {
    try {
      await startRequiredServices()
      await runComprehensiveMcpTest()
    } catch (error) {
      console.error("❌ Complete Streamable HTTP E2E test failed:", error)
      throw error
    }
  }, 60000)

  async function startRequiredServices() {
    mmlClient = await createMMLClient()
    webWorldClient = await createWebWorldClient()

    const mmlUrl = mmlClient.getUrl()
    const webWorldUrl = webWorldClient.getUrl()
    if (!mmlUrl || !webWorldUrl) {
      throw new Error(
        `Services failed to initialize: MML URL: ${mmlUrl}, WebWorld URL: ${webWorldUrl}`,
      )
    }

    await waitForServiceHealth(`${mmlUrl}/health`, "MML Service")
    await waitForServiceHealth(`${webWorldUrl}/health`, "Web World Service")

    // Initialize screenshot service
    const screenshotPort = await getRandomPort()
    screenshotService = new ScreenshotService(screenshotPort, mmlUrl, false)
    await screenshotService.initialize()
    console.log(`📸 Screenshot service initialized on port ${screenshotPort}`)

    await startMcpServer(
      mcpPort,
      TransportMode.streamableHttp,
      webWorldClient,
      mmlClient,
      screenshotService,
    )

    const mcpHealthUrl = `http://localhost:${mcpPort}/health`
    await waitForServiceHealth(mcpHealthUrl, "MCP Server")
  }

  async function waitForServiceHealth(url, serviceName, timeoutMs = 30000) {
    const startTime = Date.now()
    const pollInterval = 500 // Poll every 500ms

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          return
        }
      } catch (error) {
        // Service not ready yet, continue polling
      }

      await sleep(pollInterval)
    }

    throw new Error(
      `❌ ${serviceName} at ${url} did not become healthy within ${timeoutMs}ms`,
    )
  }

  async function runComprehensiveMcpTest() {
    const client = new Client(
      {
        name: "test-streamable-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    )

    const serverUrl = new URL(`http://127.0.0.1:${mcpPort}/mcp`)
    const transport = new StreamableHTTPClientTransport(serverUrl)

    let isConnected = false

    try {
      await client.connect(transport)
      isConnected = true

      await testListTools(client)
      await testGetMMLInfo(client)
      const worldId = await testCreateWorld(client)
      await testUpdateWorld(client, worldId)
      await testScreenshotWorld(client, worldId)
    } finally {
      // Always clean up the connection
      if (isConnected) {
        try {
          await transport.close()
        } catch (error) {
          console.warn("⚠️ Error closing transport:", error.message)
        }
      }
    }
  }

  async function testListTools(client) {
    const tools = await client.listTools()

    const expectedTools = [
      "create-world",
      "update-world",
      "screenshot-world",
      "fetch-mml-info",
    ]

    expect(tools).toBeDefined()
    expect(Array.isArray(tools.tools)).toBe(true)
    expect(tools.tools.length).toBe(expectedTools.length)
    expectedTools.forEach((toolName) => {
      expect(tools.tools.find((t) => t.name === toolName)).toBeDefined()
    })
  }

  async function testGetMMLInfo(client) {
    const mmlInfoResult = await client.callTool({
      name: "fetch-mml-info",
      arguments: {},
    })

    expect(mmlInfoResult).toBeDefined()
    expect(mmlInfoResult.content).toBeDefined()
  }

  async function testCreateWorld(client) {
    // Read the duck MML file
    const duckMmlPath = path.join(process.cwd(), "tests", "shared", "duck.mml")
    const duckMmlContent = fs.readFileSync(duckMmlPath, "utf8")

    // Convert MML content to elements array
    const elements = convertMMLToJSON(duckMmlContent)

    const createWorldResult = await client.callTool({
      name: "create-world",
      arguments: {
        title: "Duck World",
        elements: elements,
      },
    })

    let worldId = null
    const createContent = createWorldResult.content.find(
      (c) => c.type === "text" && c.text.includes("Web world ID is:"),
    )

    const match =
      createContent.text.match(/Web world ID is: ([a-f0-9-]+)/) ||
      createContent.text.match(/Web world ID is: (.+?)[\s\n]/) ||
      createContent.text.match(/Web world ID is: (.+)$/)
    worldId = match?.[1]?.trim()

    expect(worldId).toBeTruthy()
    expect(worldId).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    )

    return worldId
  }

  async function testUpdateWorld(client, worldId) {
    // Read the farm MML file
    const farmMmlPath = path.join(process.cwd(), "tests", "shared", "farm.mml")
    const farmMmlContent = fs.readFileSync(farmMmlPath, "utf8")

    const updateWorldResult = await client.callTool({
      name: "update-world",
      arguments: {
        worldId: worldId,
        mmlContent: farmMmlContent,
      },
    })

    expect(updateWorldResult.content).toBeDefined()
  }

  async function testScreenshotWorld(client, worldId) {
    const screenshotResult = await client.callTool({
      name: "screenshot-world",
      arguments: {
        worldId: worldId,
      },
    })

    expect(screenshotResult.content).toBeDefined()

    const imageContent = screenshotResult.content.find(
      (c) => c.type === "image",
    )

    expect(imageContent).toBeDefined()
    expect(imageContent.data).toBeDefined()
    expect(imageContent.mimeType).toBe("image/png")

    // Convert base64 image data to buffer for comparison
    const imageBuffer = Buffer.from(imageContent.data, "base64")
    expect(imageBuffer).toBeInstanceOf(Buffer)
    expect(imageBuffer.length).toBeGreaterThan(0)

    // Compare screenshot against expected image
    console.log("🔍 Comparing screenshot against expected image...")
    expect(imageBuffer).toMatchImageSnapshot({
      customSnapshotIdentifier: "expected",
      customSnapshotsDir: path.join(process.cwd(), "tests", "e2e"),
      customDiffDir: path.join(process.cwd(), "tests", "e2e", "diffs"),
      failureThreshold: 0.1, // Allow 10% difference for dimensional changes
      failureThresholdType: "percent",
    })
    console.log("✅ Screenshot matches expected image!")
  }
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
