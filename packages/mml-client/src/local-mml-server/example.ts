#!/usr/bin/env node

// Example usage of the MML Object Server

import { createMMLObjectServer } from "./index.js"

async function main() {
  console.log("Starting MML Object Server example...")

  try {
    // Create and start the server on a random port
    const serverInfo = await createMMLObjectServer()

    console.log(`Server is running at: ${serverInfo.url}`)
    console.log(`Temp directory: ${serverInfo.tempDir}`)

    // Example: Create a test MML object
    const testProject = "example-project"
    const createResponse = await fetch(
      `${serverInfo.url}/v1/mml-objects/${testProject}/object-instances/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Cube",
          description: "A simple red cube for testing",
          mmlContent: '<m-cube color="red" x="0" y="1" z="0"></m-cube>',
          metadata: {
            tags: ["test", "example"],
            category: "primitives",
          },
        }),
      },
    )

    if (createResponse.ok) {
      const instance = await createResponse.json()
      console.log("Created MML Object Instance:", instance)

      // List all instances
      const listResponse = await fetch(
        `${serverInfo.url}/v1/mml-objects/${testProject}/object-instances/`,
      )
      if (listResponse.ok) {
        const list = await listResponse.json()
        console.log("All instances:", list)
      }

      // Get the specific instance
      const getResponse = await fetch(
        `${serverInfo.url}/v1/mml-objects/${testProject}/object-instances/${instance.id}`,
      )
      if (getResponse.ok) {
        const retrieved = await getResponse.json()
        console.log("Retrieved instance:", retrieved)
      }
    } else {
      console.error("Failed to create instance:", await createResponse.text())
    }

    // Keep the server running for 30 seconds for testing
    console.log("Server will stop automatically in 30 seconds...")
    setTimeout(async () => {
      console.log("Stopping server...")
      await serverInfo.stop()
      console.log("Server stopped and cleaned up.")
    }, 30000)
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}

// Run the example if this file is executed directly
if (
  process.argv[1]?.endsWith("example.js") ||
  process.argv[1]?.endsWith("example.ts")
) {
  main().catch(console.error)
}
