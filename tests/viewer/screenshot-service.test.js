import { describe, test, expect, beforeAll, afterAll } from "@jest/globals"
import { ScreenshotService } from "../../packages/viewer/build/index.js"
import { toMatchImageSnapshot } from "jest-image-snapshot"
import express from "express"
import * as fs from "fs"
import * as net from "net"
import * as path from "path"

// Extend expect to support image snapshot matching
expect.extend({ toMatchImageSnapshot })

// Helper function to get a random available port
async function getRandomPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
    server.on("error", reject)
  })
}

describe("ScreenshotService Integration Tests", () => {
  let mockMMLServer = null
  let mockServerPort = null
  let screenshotService = null

  // Mock MML objects for testing - will be populated with dynamic port
  let mockMMLObjects = {}

  beforeAll(async () => {
    console.log("🚀 Setting up ScreenshotService Integration Tests")

    // Get random port for mock server
    mockServerPort = await getRandomPort()
    console.log(
      `📡 Using random port ${mockServerPort} for mock MML object server`,
    )

    // Load MML content from farm.mml and duck.mml files
    const farmMmlPath = path.join(process.cwd(), "tests", "shared", "farm.mml")
    const duckMmlPath = path.join(process.cwd(), "tests", "shared", "duck.mml")

    // Populate mock MML objects with dynamic port
    mockMMLObjects = {
      farm: {
        id: "farm",
        name: "Farm",
        url: "unused-url",
        enabled: true,
        source: {
          type: "source",
          source: fs.readFileSync(farmMmlPath, "utf8"),
        },
      },
      duck: {
        id: "duck",
        name: "Duck",
        url: "unused-url",
        enabled: true,
        source: {
          type: "source",
          source: fs.readFileSync(duckMmlPath, "utf8"),
        },
      },
    }

    // Create mock MML object server
    console.log("📡 Starting mock MML object server...")
    const app = express()

    // Enable CORS for cross-origin requests
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*")
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
      res.header("Access-Control-Allow-Headers", "Content-Type")
      next()
    })

    // Mock the MML object fetch endpoint
    app.get(
      "/v1/mml-objects/local-project/object-instances/:id",
      (req, res) => {
        const { id } = req.params
        const mockObject = mockMMLObjects[id]

        if (!mockObject) {
          console.log(`❌ Mock server: Object not found: ${id}`)
          return res.status(404).json({ error: "MML Object not found" })
        }

        console.log(`✅ Mock server: Serving object ${id}`)
        res.json(mockObject)
      },
    )

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() })
    })

    // Start the mock server
    mockMMLServer = app.listen(mockServerPort, () => {
      console.log(`✅ Mock MML server running on port ${mockServerPort}`)
    })

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Test mock server is responding
    try {
      const response = await fetch(`http://localhost:${mockServerPort}/health`)
      const health = await response.json()
      console.log(`✅ Mock server health check: ${health.status}`)
    } catch (error) {
      console.error("❌ Mock server health check failed:", error)
      throw error
    }
  }, 30000)

  afterAll(async () => {
    console.log("🧹 Starting ScreenshotService test cleanup...")

    // Cleanup screenshot service
    if (screenshotService && screenshotService.isInitialized()) {
      try {
        await screenshotService.cleanup()
        console.log("✅ ScreenshotService cleaned up")
      } catch (error) {
        console.warn("⚠️ Error cleaning up ScreenshotService:", error.message)
      }
    }

    // Cleanup mock server
    if (mockMMLServer) {
      try {
        mockMMLServer.close()
        console.log("✅ Mock MML server stopped")
      } catch (error) {
        console.warn("⚠️ Error stopping mock server:", error.message)
      }
    }

    // Give time for handles to close
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("✅ ScreenshotService test cleanup complete")
  }, 30000)

  test("should initialize, take farm and duck mml screenshots, compare against expected images, and cleanup successfully", async () => {
    console.log(
      "🚀 Testing complete ScreenshotService workflow with farm and duck mml and image comparison...",
    )

    const viewerPort = await getRandomPort()
    const mockServerUrl = `http://localhost:${mockServerPort}`

    // Test initialization
    console.log("🔧 Testing ScreenshotService initialization...")
    screenshotService = new ScreenshotService(viewerPort, mockServerUrl, false)
    expect(screenshotService.isInitialized()).toBe(false)

    await screenshotService.initialize()
    expect(screenshotService.isInitialized()).toBe(true)
    console.log(
      `✅ ScreenshotService initialized successfully on port ${viewerPort}`,
    )

    // Test taking screenshots of farm and duck mml
    console.log("📸 Testing farm and duck mml screenshot capture...")

    // Take farm screenshot
    console.log("📸 Taking screenshot for: farm")
    const farmScreenshot = await screenshotService.takeScreenshot("farm")
    expect(farmScreenshot).toBeInstanceOf(Buffer)
    expect(farmScreenshot.length).toBeGreaterThan(0)

    // Compare farm screenshot against expected.png
    console.log("🔍 Comparing farm screenshot against expected.png...")
    expect(farmScreenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: "farm-expected",
      customSnapshotsDir: path.join(process.cwd(), "tests", "viewer"),
      customDiffDir: path.join(process.cwd(), "tests", "viewer", "diffs"),
      failureThreshold: 0.1, // Allow 10% difference for dimensional changes
      failureThresholdType: "percent",
    })
    console.log("✅ Farm screenshot matches expected image!")

    // Take duck screenshot
    console.log("📸 Taking screenshot for: duck")
    const duckScreenshot = await screenshotService.takeScreenshot("duck")
    expect(duckScreenshot).toBeInstanceOf(Buffer)
    expect(duckScreenshot.length).toBeGreaterThan(0)

    // Compare duck screenshot against expected.png
    console.log("🔍 Comparing duck screenshot against expected.png...")
    expect(duckScreenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: "duck-expected",
      customSnapshotsDir: path.join(process.cwd(), "tests", "viewer"),
      customDiffDir: path.join(process.cwd(), "tests", "viewer", "diffs"),
      failureThreshold: 0.1, // Allow 10% difference for dimensional changes
      failureThresholdType: "percent",
    })
    console.log("✅ Duck screenshot matches expected image!")

    // Test cleanup
    console.log("🧹 Testing resource cleanup...")
    expect(screenshotService.isInitialized()).toBe(true)

    await screenshotService.cleanup()
    expect(screenshotService.isInitialized()).toBe(false)

    // Should not be able to take screenshots after cleanup
    await expect(screenshotService.takeScreenshot("farm")).rejects.toThrow(
      "ScreenshotService not initialized",
    )

    console.log("✅ Resource cleanup works correctly")
    console.log(
      "🎉 Complete ScreenshotService workflow test with farm and duck mml and image comparison passed!",
    )
  }, 60000)
})
