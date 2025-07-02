import * as url from "url"
import { createViewerServer } from "./server.js"
import puppeteer, { Browser, Page } from "puppeteer"
import { Server } from "http"

export class ScreenshotService {
  private browser: Browser | null = null
  private page: Page | null = null
  private server: Server | null = null
  private port: number
  private mmlObjectServerUrl: string
  private debug: boolean

  constructor(
    port: number = 8003,
    mmlObjectServerUrl: string,
    debug: boolean = false,
  ) {
    this.port = port
    this.mmlObjectServerUrl = mmlObjectServerUrl
    this.debug = debug
  }

  getUrl(): string {
    return `http://localhost:${this.port}`
  }

  async initialize(): Promise<void> {
    console.log(`Starting server on port ${this.port}...`)
    const app = createViewerServer(this.port, this.mmlObjectServerUrl)

    // Start the server
    this.server = app.listen(this.port, () => {
      console.log(`Server running at http://localhost:${this.port}`)
    })

    // Wait a moment for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log(
      `Launching browser in ${this.debug ? "non-headless" : "headless"} mode...`,
    )
    // Configure browser args - different for CI vs local
    const isCI =
      process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true"

    const baseBrowserArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--no-first-run",
      "--no-default-browser-check",
    ]

    const ciBrowserArgs = [
      ...baseBrowserArgs,
      "--disable-gpu",
      "--use-gl=swiftshader",
      "--enable-webgl",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ]

    const localBrowserArgs = [
      ...baseBrowserArgs,
      // Keep GPU enabled for local development
    ]

    this.browser = await puppeteer.launch({
      headless: !this.debug,
      devtools: this.debug,
      args: isCI ? ciBrowserArgs : localBrowserArgs,
    })

    this.page = await this.browser.newPage()

    // Always enable error logging for debugging
    this.page.on("console", (msg) => {
      if (this.debug) {
        console.log(`PAGE LOG: ${msg.text()}`)
      }
    })

    this.page.on("pageerror", (error) => {
      console.error(`PAGE ERROR: ${error.message}`)
    })

    this.page.on("requestfailed", (request) => {
      console.error(
        `REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`,
      )
    })

    if (this.debug) {
      // Enable request/response logging
      this.page.on("response", (response) => {
        console.log(`RESPONSE: ${response.status()} ${response.url()}`)
      })
    }
  }

  async takeScreenshot(mmlObjectId: string): Promise<Buffer> {
    if (!this.page || !this.browser) {
      throw new Error(
        "ScreenshotService not initialized. Call initialize() first.",
      )
    }

    const url = `http://localhost:${this.port}/screenshot/${mmlObjectId}`
    console.log(`Loading MML object: ${mmlObjectId}`)

    try {
      // Navigate to the MML object with increased timeout for CI
      const isCI =
        process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true"
      const timeout = isCI ? 45000 : 15000 // 45s for CI, 15s for local

      console.log(`Navigating to: ${url} (timeout: ${timeout}ms)`)

      // For CI, use a simpler approach - just wait for DOM to load
      if (isCI) {
        await this.page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: timeout,
        })
        console.log("Page DOM loaded, waiting for content to render...")

        // Wait longer for MML content to load and render
        await new Promise((resolve) => setTimeout(resolve, 10000))
        console.log("Content render wait completed")
      } else {
        // For local development, use the original approach
        await this.page.goto(url, {
          waitUntil: "networkidle0",
          timeout: timeout,
        })
        console.log("Page loaded, waiting for content to render...")
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      // Take screenshot
      console.log("Taking screenshot...")
      const screenshot = await this.page.screenshot({
        type: "png",
        fullPage: false,
      })

      // Clear the scene by navigating to about:blank
      await this.page.goto("about:blank")
      console.log("Scene cleared")

      return screenshot as Buffer
    } catch (error) {
      console.error(`Error taking screenshot for ${mmlObjectId}:`, error)

      // For CI, try one more time with an even simpler approach
      if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
        console.log("Attempting CI fallback approach...")
        try {
          await this.page.goto(url, { waitUntil: "load", timeout: 60000 })
          console.log("CI fallback: Page loaded, waiting...")
          await new Promise((resolve) => setTimeout(resolve, 15000))

          const screenshot = await this.page.screenshot({
            type: "png",
            fullPage: false,
          })

          await this.page.goto("about:blank")
          console.log("CI fallback: Screenshot taken successfully")
          return screenshot as Buffer
        } catch (fallbackError) {
          console.error("CI fallback also failed:", fallbackError)
        }
      }

      // Try to clear the scene even if screenshot failed
      try {
        await this.page.goto("about:blank")
      } catch (clearError) {
        console.error("Error clearing scene:", clearError)
      }
      throw error
    }
  }

  async cleanup(): Promise<void> {
    console.log("Cleaning up ScreenshotService...")

    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }

    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  isInitialized(): boolean {
    return this.browser !== null && this.page !== null && this.server !== null
  }
}

// Only run the server if this file is executed directly
if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 8003
  const mmlObjectServerUrl =
    process.env.MML_OBJECT_SERVER_URL || "http://localhost:8001"
  const app = createViewerServer(port as number, mmlObjectServerUrl)

  console.log("Serving on port:", port)
  console.log("MML Object Server URL:", mmlObjectServerUrl)
  console.log(`http://localhost:${port}`)
  app.listen(port)
}
