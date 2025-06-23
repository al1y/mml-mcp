import { getTransportMode } from "./mcp/transports/index.js"
import { TransportMode } from "./mcp/types.js"

// Store original console.log
const originalConsoleLog = console.log

/**
 * Sets up logging configuration based on transport mode.
 * When transport mode is stdio, redirects console.log to console.error
 * This is because otherwise MCP client takes logs as actual messages
 * @param transportMode The current transport mode
 */
export function setupLogging() {
  const transportMode = getTransportMode()
  if (transportMode === TransportMode.stdio) {
    console.log = (...args: any[]) => {
      console.error(...args)
    }
    console.log("🔥 Redirecting console.log to console.error")
  } else {
    console.log = originalConsoleLog
  }
}
