#!/usr/bin/env tsx

import { spawn, ChildProcess } from "child_process"
import { promises as fs } from "fs"
import { tmpdir } from "os"
import { join } from "path"

// Colors for output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
}

// Track processes
let pinggyProcess: ChildProcess | null = null
let nextProcess: ChildProcess | null = null
let pinggyStartedByUs = false
let pinggyUrl = ""
let cleaningUp = false

const MSQUARED_URL_BASE = "https://api.msquared.io"

// Cleanup function
async function cleanup() {
  if (cleaningUp) return
  cleaningUp = true

  console.log(`\n${colors.yellow}🧹 Cleaning up...${colors.reset}`)

  // Kill Next.js dev server if running
  if (nextProcess && !nextProcess.killed) {
    console.log(
      `${colors.blue}🛑 Stopping Next.js dev server...${colors.reset}`,
    )
    try {
      // Kill the process and its children
      nextProcess.kill("SIGTERM")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      // Force kill if still running
      if (!nextProcess.killed) {
        nextProcess.kill("SIGKILL")
      }
    } catch (error) {
      // Process might already be dead
    }
  }

  // Only kill Pinggy if we started it
  if (pinggyStartedByUs && pinggyProcess && !pinggyProcess.killed) {
    console.log(`${colors.blue}🛑 Stopping Pinggy tunnel...${colors.reset}`)
    try {
      pinggyProcess.kill("SIGTERM")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (!pinggyProcess.killed) {
        pinggyProcess.kill("SIGKILL")
      }
    } catch (error) {
      // Process might already be dead
    }
  }

  console.log(`${colors.green}✅ Cleanup complete${colors.reset}`)
  process.exit(0)
}

// Set up signal handlers
process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...")
  await cleanup()
})

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...")
  await cleanup()
})

// Helper function to run shell commands
function runCommand(
  command: string,
  args: string[] = [],
  options: any = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "pipe" })
    let stdout = ""
    let stderr = ""

    child.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    child.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`))
      }
    })
  })
}

// Check if command exists
async function commandExists(command: string): Promise<boolean> {
  try {
    // Use 'where' on Windows, 'which' on Unix
    const whichCmd = process.platform === "win32" ? "where" : "which"
    await runCommand(whichCmd, [command])
    return true
  } catch {
    return false
  }
}

// Start Pinggy tunnel
async function startPinggy(): Promise<string> {
  console.log(`${colors.yellow}🌐 Starting Pinggy tunnel...${colors.reset}`)

  // Create a temporary file to capture Pinggy output
  const tempFile = join(tmpdir(), `pinggy-${Date.now()}.log`)

  pinggyProcess = spawn(
    "ssh",
    ["-p", "443", "-R0:localhost:3000", "a.pinggy.io"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    },
  )

  pinggyStartedByUs = true

  // Capture output to find URL
  let output = ""
  pinggyProcess.stdout?.on("data", (data) => {
    output += data.toString()
  })

  pinggyProcess.stderr?.on("data", (data) => {
    output += data.toString()
  })

  // Wait for Pinggy to start and capture URL
  console.log(
    `${colors.yellow}⏳ Waiting for Pinggy to initialize...${colors.reset}`,
  )

  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const match = output.match(/https:\/\/[^\s]*\.pinggy\.link/)
    if (match) {
      const url = match[0]
      console.log(
        `${colors.green}✅ Pinggy tunnel started successfully${colors.reset}`,
      )
      console.log(`${colors.blue}🌐 Tunnel URL: ${url}${colors.reset}`)
      return url
    }
  }

  throw new Error("Pinggy tunnel failed to start within 30 seconds")
}

// Update Pinggy URL in environment
async function updatePinggyUrl(url: string) {
  console.log(
    `${colors.yellow}🔗 Updating Pinggy URL in environment...${colors.reset}`,
  )

  try {
    // Validate URL format
    if (!url.match(/^https?:\/\/.*\.pinggy\.link$/)) {
      throw new Error(`Invalid Pinggy URL format: ${url}`)
    }

    console.log(
      `${colors.yellow}🔗 Using provided Pinggy URL: ${url}${colors.reset}`,
    )
    console.log(`${colors.yellow}🌐 Using Pinggy URL: ${url}${colors.reset}`)

    // Update or create .env.local file
    const envFile = ".env.local"

    const envVars = {
      MCP_SERVER_URL: url,
      MML_SERVER_URL: MSQUARED_URL_BASE,
      WEB_WORLD_SERVER_URL: MSQUARED_URL_BASE,
      MSQUARED_API_KEY: process.env.MSQUARED_API_KEY || "",
    }

    try {
      // Check if file exists
      let existingContent = ""
      try {
        existingContent = await fs.readFile(envFile, "utf8")
      } catch (error) {
        // File doesn't exist, will be created
      }

      let updatedContent = existingContent
      let hasUpdates = false

      // Update or add each environment variable
      for (const [key, value] of Object.entries(envVars)) {
        const regex = new RegExp(`^${key}=.*$`, "m")
        if (updatedContent.match(regex)) {
          // Update existing line
          updatedContent = updatedContent.replace(regex, `${key}=${value}`)
          console.log(
            `${colors.green}✅ Updated ${key} in ${envFile}${colors.reset}`,
          )
        } else {
          // Add new line
          updatedContent += `${updatedContent && !updatedContent.endsWith("\n") ? "\n" : ""}${key}=${value}\n`
          console.log(
            `${colors.green}✅ Added ${key} to ${envFile}${colors.reset}`,
          )
        }
        hasUpdates = true
      }

      if (hasUpdates) {
        await fs.writeFile(envFile, updatedContent)
      }
    } catch (error) {
      console.log(
        `${colors.red}❌ Error writing to ${envFile}: ${error}${colors.reset}`,
      )
      throw error
    }

    console.log("")
    console.log(
      `${colors.green}🚀 Your MCP server is now accessible at: ${url}/api/mcp${colors.reset}`,
    )
    console.log(
      `${colors.blue}💡 Restart your Next.js server to pick up the new environment variable${colors.reset}`,
    )
    console.log("")
    console.log(`${colors.blue}🧪 Test with:${colors.reset}`)
    console.log(`curl "${url}/api/mcp/health"`)
  } catch (error) {
    console.log(
      `${colors.yellow}⚠️  Could not update Pinggy URL: ${error}${colors.reset}`,
    )
  }
}

// Start Next.js dev server
async function startNextJs(): Promise<void> {
  console.log(
    `${colors.yellow}🚀 Starting Next.js dev server...${colors.reset}`,
  )

  // Use npm.cmd on Windows, npm on Unix
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"

  nextProcess = spawn(npmCmd, ["run", "dev:next"], {
    stdio: "inherit",
    shell: true,
  })

  // Wait for Next.js to start
  console.log(
    `${colors.yellow}⏳ Waiting for Next.js to initialize...${colors.reset}`,
  )

  for (let i = 0; i < 30; i++) {
    try {
      // Try to make a simple HTTP request to check if server is running
      const response = await fetch("http://localhost:3000")
      if (response.ok || response.status === 404) {
        // Server is running (200 or 404 both mean server is responding)
        console.log(
          `${colors.green}✅ Next.js dev server started successfully${colors.reset}`,
        )
        return
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log(
    `${colors.yellow}⚠️  Next.js dev server taking longer than expected to start${colors.reset}`,
  )
}

// Main function
async function main() {
  try {
    console.log(
      `${colors.blue}🚀 Starting development environment with Pinggy...${colors.reset}`,
    )

    // Check if SSH is available
    if (!(await commandExists("ssh"))) {
      console.log(
        `${colors.red}❌ SSH is not installed or not in PATH${colors.reset}`,
      )
      console.log(`${colors.yellow}💡 Please install SSH client${colors.reset}`)
      process.exit(1)
    }

    // Always start fresh Pinggy tunnel
    pinggyUrl = await startPinggy()

    // Update Pinggy URL in environment
    await updatePinggyUrl(pinggyUrl)

    // Start Next.js dev server
    await startNextJs()

    // Display connection info
    console.log(
      `\n${colors.green}🎉 Development environment is ready!${colors.reset}`,
    )
    console.log(`${colors.blue}📱 Local:  http://localhost:3000${colors.reset}`)
    console.log(`${colors.blue}🌐 Public: ${pinggyUrl}${colors.reset}`)
    console.log(`${colors.blue}🔧 MCP API: ${pinggyUrl}/api/mcp${colors.reset}`)
    console.log(
      `\n${colors.yellow}Press Ctrl+C to stop all services${colors.reset}\n`,
    )

    // Wait for Next.js process to finish
    if (nextProcess) {
      nextProcess.on("exit", (code) => {
        console.log(
          `${colors.red}💀 Next.js dev server stopped with code ${code}${colors.reset}`,
        )
        process.exit(code || 0)
      })
    }

    // Keep the process alive
    await new Promise(() => {}) // Wait forever until interrupted
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error)
    await cleanup()
    process.exit(1)
  }
}

// Run main function
main().catch(async (error) => {
  console.error("Unhandled error:", error)
  await cleanup()
  process.exit(1)
})
