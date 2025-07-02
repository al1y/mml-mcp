/**
 * Constants used throughout the MML MCP application
 */

export const DEFAULT_MCP_SERVER_PORT = 8000
const DEFAULT_LOCAL_MML_SERVER_PORT = 8001
const DEFAULT_LOCAL_WEB_WORLD_SERVER_PORT = 8002
export const DEFAULT_LOCAL_VIEWER_SERVER_PORT = 8003

export const DEFAULT_MML_SERVER_URL = `http://localhost:${DEFAULT_LOCAL_MML_SERVER_PORT}`
export const DEFAULT_WEB_WORLD_SERVER_URL = `http://localhost:${DEFAULT_LOCAL_WEB_WORLD_SERVER_PORT}`

export const MML_DOCUMENT_DEFAULT_ID = "default-mml-document-id"

// Tool names
export const TOOL_NAMES = {
  CREATE_WORLD: "create-world",
  UPDATE_ELEMENTS: "update-elements",
  UPDATE_SCRIPT: "update-script",
  SCREENSHOT_WORLD: "screenshot-world",
  GET_MML_DETAILS: "fetch-mml-info",
} as const

// File paths and directories
export const PATHS = {
  SCREENSHOTS_DIR: "screenshots",
  MMLS_DIR: "mmls",
  LATEST_MML_FILE: "latest.mml",
  LATEST_SCREENSHOT_FILE: "latest.png",
} as const

// Default values
export const DEFAULTS = {
  SCREENSHOT_FILENAME: "latest",
  SCREENSHOT_WIDTH: 1024,
  SCREENSHOT_HEIGHT: 768,
  CAMERA_POSITION: { x: 5, y: 5, z: 5 },
  CAMERA_TARGET: { x: 0, y: 0, z: 0 },
} as const

// Validation messages
export const VALIDATION_MESSAGES = {
  VALID: "✅ MML document is valid!",
  FAILED: "❌ MML validation failed:",
  EMPTY_DOCUMENT: "MML document is empty",
  UNBALANCED_TAGS: "Unbalanced MML tags detected",
} as const

// Common element attributes and values
export const ELEMENT_ATTRIBUTES = {
  ID: "id",
  COLOR: "color",
  X: "x",
  Y: "y",
  Z: "z",
  WIDTH: "width",
  HEIGHT: "height",
  RADIUS: "radius",
  SX: "sx",
  SY: "sy",
  SZ: "sz",
  TYPE: "type",
  INTENSITY: "intensity",
  SRC: "src",
  TEXT: "text",
  FONT_SIZE: "font-size",
  LOOP: "loop",
} as const

// Common colors
export const COLORS = {
  BLUE: "blue",
  RED: "red",
  GREEN: "green",
  YELLOW: "yellow",
  ORANGE: "orange",
  WHITE: "white",
  GRAY: "gray",
} as const

// Light types
export const LIGHT_TYPES = {
  DIRECTIONAL: "directional",
  POINT: "point",
} as const

// Common URLs and resources
export const RESOURCES = {
  AVATAR_BASE_URL: "https://public.mml.io/avatar-base.glb",
  SAMPLE_VIDEO_URL:
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
} as const

// Error messages
export const ERROR_MESSAGES = {
  UNKNOWN_TOOL: "Unknown tool:",
  UNKNOWN_ELEMENT: "Unknown MML element:",
  ERROR_CREATING_DOCUMENT: "Error creating MML document:",
  ERROR_VALIDATING_MML: "Error validating MML:",
  ERROR_CAPTURING_SCREENSHOT: "Error capturing screenshot:",
  ERROR_UPDATING_WORLD: "Error updating world:",
  UNKNOWN_ERROR: "Unknown error",
} as const

// Comments and templates
export const COMMENTS = {
  DEFAULT_LIGHTING: "<!-- Default lighting to prevent black scenes -->",
} as const
