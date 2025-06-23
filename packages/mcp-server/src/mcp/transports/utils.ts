import { TransportMode } from "../types.js"

export function getTransportMode(): TransportMode {
  const envTransport = process.env.MCP_TRANSPORT as TransportMode
  if (envTransport && Object.values(TransportMode).includes(envTransport)) {
    return envTransport
  }

  console.error(
    "No transport mode found. Please set the MCP_TRANSPORT environment variable.",
  )
  process.exit(1)
}
