#!/usr/bin/env node

import { WebWorldServer } from "./local-web-world/index.js"

const port = parseInt(process.env.PORT || "8002", 10)

async function main() {
  try {
    console.log("🟢 Starting Web World server...")

    const webWorldServer = new WebWorldServer()
    const server = await webWorldServer.start(port)

    // Keep the process alive
    process.on("SIGINT", async () => {
      console.log("🛑 Shutting down Web World server...")
      await server.stop()
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      console.log("🛑 Shutting down Web World server...")
      await server.stop()
      process.exit(0)
    })
  } catch (error) {
    console.error("❌ Failed to start Web World server:", error)
    process.exit(1)
  }
}

main()
