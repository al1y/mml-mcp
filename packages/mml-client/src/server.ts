#!/usr/bin/env node

import { MMLObjectServer } from "./local-mml-server/index.js"

const port = parseInt(process.env.PORT || "8001", 10)

async function main() {
  try {
    const mmlServer = new MMLObjectServer()
    const server = await mmlServer.start(port)

    // Keep the process alive
    process.on("SIGINT", async () => {
      console.log("🛑 Shutting down MML server...")
      await server.stop()
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      console.log("🛑 Shutting down MML server...")
      await server.stop()
      process.exit(0)
    })
  } catch (error) {
    console.error("❌ Failed to start MML server:", error)
    process.exit(1)
  }
}

main()
