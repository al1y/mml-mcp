import {
  DEFAULT_MML_SERVER_URL,
  DEFAULT_WEB_WORLD_SERVER_URL,
  DEFAULT_LOCAL_VIEWER_SERVER_PORT,
  DEFAULT_MCP_SERVER_PORT,
} from "./constants.js"

export function getMmlServerUrl() {
  return process.env.MML_SERVER_URL || DEFAULT_MML_SERVER_URL
}

export function getWebWorldServerUrl() {
  return process.env.WEB_WORLD_SERVER_URL || DEFAULT_WEB_WORLD_SERVER_URL
}

export function getViewerServerPort() {
  return process.env.VIEWER_SERVER_PORT
    ? parseInt(process.env.VIEWER_SERVER_PORT)
    : DEFAULT_LOCAL_VIEWER_SERVER_PORT
}

export function getMcpServerPort() {
  return process.env.MCP_SERVER_PORT
    ? parseInt(process.env.MCP_SERVER_PORT)
    : DEFAULT_MCP_SERVER_PORT
}
