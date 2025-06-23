import path from "path"
import fs from "fs"
import os from "os"
import {
  DEFAULT_MML_SERVER_URL,
  DEFAULT_WEB_WORLD_SERVER_URL,
} from "./constants.js"
import { TransportMode } from "./mcp/types.js"

export const CURSOR_CONFIG_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  ".cursor",
  "mcp.json",
)

export type McpServerParams =
  | {
      type: TransportMode.stdio
      mmlServerUrl: string
      webWorldServerUrl: string
    }
  | {
      type: TransportMode.sse | TransportMode.streamableHttp
      port: number
    }

export function updateMcpConfigs(mcpServerParams: McpServerParams): void {
  const mcpServerConfig = createMCPServerConfig(mcpServerParams)

  const mcpConfig = {
    mcpServers: {
      mml: mcpServerConfig,
    },
  }

  const cursorDir = path.dirname(CURSOR_CONFIG_PATH)
  if (!fs.existsSync(cursorDir)) {
    fs.mkdirSync(cursorDir, { recursive: true })
  }
  fs.writeFileSync(CURSOR_CONFIG_PATH, JSON.stringify(mcpConfig, null, 2))
  console.log(`📝 Cursor config: ${CURSOR_CONFIG_PATH}`)

  updateClaudeConfig(mcpServerConfig)
}

function createMCPServerConfig(mmlServerConfig: McpServerParams) {
  if (mmlServerConfig.type === TransportMode.stdio) {
    return {
      type: TransportMode.stdio,
      command: "node",
      args: [path.join(process.cwd(), "build", "index.js")],
      cwd: process.cwd(),
      env: {
        MCP_TRANSPORT: TransportMode.stdio,
        MML_SERVER_URL: DEFAULT_MML_SERVER_URL,
        WEB_WORLD_SERVER_URL: DEFAULT_WEB_WORLD_SERVER_URL,
      },
    }
  }

  const endpoint = mmlServerConfig.type === TransportMode.sse ? "/sse" : "/mcp"
  const url = `http://localhost:${mmlServerConfig.port}${endpoint}`

  return {
    type: TransportMode.stdio,
    command: "npx",
    args: ["-y", "mcp-remote", url],
  }
}

function getClaudeConfigPath(): string | null {
  const platform = os.platform()
  const homeDir = os.homedir()

  if (platform === "win32") {
    const appDataPath = process.env.APPDATA
    if (appDataPath) {
      return path.join(appDataPath, "Claude", "claude_desktop_config.json")
    }
    return path.join(
      homeDir,
      "AppData",
      "Roaming",
      "Claude",
      "claude_desktop_config.json",
    )
  } else if (platform === "darwin") {
    return path.join(
      homeDir,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json",
    )
  } else {
    // Linux
    return path.join(homeDir, ".config", "Claude", "claude_desktop_config.json")
  }
}

function updateClaudeConfig(mmlServerConfig: any): void {
  const claudeConfigPath = getClaudeConfigPath()
  if (!claudeConfigPath) {
    console.log("⚠️ Could not determine Claude config path for this platform")
    return
  }

  try {
    let claudeConfig: any = {}

    if (fs.existsSync(claudeConfigPath)) {
      const configContent = fs.readFileSync(claudeConfigPath, "utf8")
      claudeConfig = JSON.parse(configContent)
    } else {
      console.log(
        `📝 Claude config doesn't exist, will create: ${claudeConfigPath}`,
      )
    }

    if (!claudeConfig.mcpServers) {
      claudeConfig.mcpServers = {}
    }

    claudeConfig.mcpServers.mml = mmlServerConfig

    const configDir = path.dirname(claudeConfigPath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2))
    console.log(`📝 Claude config: ${claudeConfigPath}`)
  } catch (error) {
    console.error("❌ Error updating Claude config:", error)
  }
}
