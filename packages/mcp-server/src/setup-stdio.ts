import {
  DEFAULT_MML_SERVER_URL,
  DEFAULT_WEB_WORLD_SERVER_URL,
} from "./constants.js"
import { updateMcpConfigs } from "./config.js"
import { TransportMode } from "./mcp/types.js"

console.log("🛠 Setting up stdio MCP server configs...")

updateMcpConfigs({
  type: TransportMode.stdio,
  mmlServerUrl: DEFAULT_MML_SERVER_URL,
  webWorldServerUrl: DEFAULT_WEB_WORLD_SERVER_URL,
})

console.log("✅ Successfully setup stdio MCP server configs")
