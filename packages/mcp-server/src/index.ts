import { MMLClient } from "@mml-mcp/mml-client"
import { WebWorldClient } from "@mml-mcp/web-world-client"
import { getTransportMode } from "./mcp/transports/utils.js"
import {
  startStdioServer,
  startSSEServer,
  startStreamableHttpServer,
} from "./mcp/transports/index.js"
import { updateMcpConfigs } from "./config.js"
import { TransportMode } from "./mcp/types.js"
import { fileURLToPath } from "url"

import { setupLogging } from "./logging.js"
import {
  getMmlServerUrl,
  getWebWorldServerUrl,
  getViewerServerPort,
  getMcpServerPort,
} from "./utils.js"
import { ScreenshotService } from "@mml-mcp/viewer"

let mmlClient: MMLClient
let webWorldClient: WebWorldClient
let screenshotService: ScreenshotService

async function main() {
  setupLogging()

  mmlClient = new MMLClient(getMmlServerUrl())
  console.log(`🍱 MML Server URL: ${mmlClient.getUrl()}`)

  webWorldClient = new WebWorldClient(getWebWorldServerUrl())
  console.log(`🌍 Web World URL: ${webWorldClient.getUrl()}`)

  const viewerServerPort = await getViewerServerPort()
  screenshotService = new ScreenshotService(
    viewerServerPort,
    mmlClient.getUrl(),
  )
  await screenshotService.initialize()
  console.log(`📸 Screenshot URL: ${screenshotService.getUrl()}`)

  try {
    const transportMode = getTransportMode()
    console.log(`🚢 Transport mode: ${transportMode}`)

    const mcpServerPort = getMcpServerPort()
    if (
      transportMode === TransportMode.sse ||
      transportMode === TransportMode.streamableHttp
    ) {
      await updateMcpConfigs({
        type: transportMode,
        port: mcpServerPort,
      })
    }

    await startMcpServer(
      mcpServerPort,
      transportMode,
      webWorldClient,
      mmlClient,
      screenshotService,
    )
  } catch (error) {
    console.error("Error in main function:", error)
    process.exit(1)
  }
}

export async function startMcpServer(
  port: number,
  transport: TransportMode,
  webWorld: WebWorldClient,
  mmlStorage: MMLClient,
  screenshotService: ScreenshotService,
) {
  try {
    switch (transport) {
      case TransportMode.stdio:
        await startStdioServer(webWorld, mmlStorage, screenshotService)
        break
      case TransportMode.sse:
        await startSSEServer(port, webWorld, mmlStorage, screenshotService)
        break
      case TransportMode.streamableHttp:
        await startStreamableHttpServer(
          port,
          webWorld,
          mmlStorage,
          screenshotService,
        )
        break
      default:
        throw new Error(`Unknown transport mode: ${transport}`)
    }
  } catch (error) {
    console.error("Failed to start servers:", error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.error("Received SIGINT, shutting down gracefully...")

  try {
    // Only stop clients if we created them (not managed by dev.ts)
    if (!process.env.MML_SERVER_URL && !process.env.WEB_WORLD_SERVER_URL) {
      console.log("Stopping locally managed clients")
      await Promise.all([
        mmlClient
          ?.stop()
          .catch((err) => console.error("Error stopping MML client:", err)),
        webWorldClient
          ?.stop()
          .catch((err) =>
            console.error("Error stopping Web World client:", err),
          ),
      ])
    } else {
      console.error("Skipping client cleanup - managed by dev.ts")
    }

    process.exit(0)
  } catch (error) {
    console.error("Error during shutdown:", error)
    process.exit(1)
  }
})

process.on("SIGTERM", async () => {
  console.error("Received SIGTERM, shutting down gracefully...")

  try {
    // Only stop clients if we created them (not managed by dev.ts)
    if (!process.env.MML_SERVER_URL && !process.env.WEB_WORLD_SERVER_URL) {
      console.log("Stopping locally managed clients")
      await Promise.all([
        mmlClient
          ?.stop()
          .catch((err) => console.error("Error stopping MML client:", err)),
        webWorldClient
          ?.stop()
          .catch((err) =>
            console.error("Error stopping Web World client:", err),
          ),
      ])
    } else {
      console.error("Skipping client cleanup - managed by dev.ts")
    }

    process.exit(0)
  } catch (error) {
    console.error("Error during shutdown:", error)
    process.exit(1)
  }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Unhandled error:", error)
    process.exit(1)
  })
}
