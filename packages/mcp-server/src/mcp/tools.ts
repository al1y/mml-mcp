import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import type { Server } from "@modelcontextprotocol/sdk/server/index.js"

import { MML_ELEMENTS } from "../data/elements.js"
import {
  CreateWorldSchema,
  UpdateWorldSchema,
  GetMMLDetailsSchema,
  CreateWorldJsonSchema,
  UpdateWorldJsonSchema,
  GetMMLDetailsJsonSchema,
  type CreateWorldInput,
  type UpdateWorldInput,
  type MMLElement,
  ScreenshotWorldSchema,
  ScreenshotWorldJsonSchema,
  type ScreenshotWorldInput,
} from "./schemas.js"
import {
  TOOL_NAMES,
  COLORS,
  LIGHT_TYPES,
  ERROR_MESSAGES,
  COMMENTS,
} from "../constants.js"
import { MMLClient } from "@mml-mcp/mml-client"
import { WebWorldClient } from "@mml-mcp/web-world-client"
import { ScreenshotService } from "@mml-mcp/viewer"

/**
 * Register all tool handlers for the MCP server
 */
export function registerToolHandlers(
  server: Server,
  webWorldClient: WebWorldClient,
  mmlClient: MMLClient,
  screenshotService: ScreenshotService,
) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [
      {
        name: TOOL_NAMES.CREATE_WORLD,
        description:
          "Create a new MML document with specified elements and interactivity. You should ALWAYS list all elements before creating the document. Once a document is ready, you should ALWAYS validate it before creating the document.",
        inputSchema: CreateWorldJsonSchema,
      },
      {
        name: TOOL_NAMES.UPDATE_WORLD,
        description:
          "Update an existing MML document with new elements or interactivity.",
        inputSchema: UpdateWorldJsonSchema,
      },
      {
        name: TOOL_NAMES.SCREENSHOT_WORLD,
        description: "Capture a screenshot of the current world",
        inputSchema: ScreenshotWorldJsonSchema,
      },
      {
        name: TOOL_NAMES.GET_MML_DETAILS,
        description:
          "Get detailed information about all available MML elements and their attributes",
        inputSchema: GetMMLDetailsJsonSchema,
      },
    ]

    return {
      tools: tools,
    }
  })

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    if (name === TOOL_NAMES.CREATE_WORLD) {
      const validatedArgs = CreateWorldSchema.parse(args)
      return handleCreateWorld(validatedArgs, webWorldClient, mmlClient)
    }

    if (name === TOOL_NAMES.UPDATE_WORLD) {
      const validatedArgs = UpdateWorldSchema.parse(args)
      return handleUpdateWorld(validatedArgs, webWorldClient, mmlClient)
    }

    if (name === TOOL_NAMES.GET_MML_DETAILS) {
      GetMMLDetailsSchema.parse(args) // Validate empty object
      return handleListAllMMLElements()
    }

    if (name === TOOL_NAMES.SCREENSHOT_WORLD) {
      const validatedArgs = ScreenshotWorldSchema.parse(args)
      return await handleScreenshotWorld(
        validatedArgs,
        webWorldClient,
        screenshotService,
      )
    }

    throw new Error(`${ERROR_MESSAGES.UNKNOWN_TOOL} ${name}`)
  })
}

// Recursive function to render MML elements with children
function renderMMLElement(element: MMLElement): string {
  const attributes = element.attributes || {}
  const attrString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ")

  const openTag = `<${element.tag}${attrString ? " " + attrString : ""}>`
  const closeTag = `</${element.tag}>`

  // Handle text content (only m-label has text content)
  let content = ""
  if (element.tag === "m-label" && attributes && (attributes as any).text) {
    content = String((attributes as any).text)
  }

  // Handle children recursively (only m-group and m-character support children)
  if (
    "children" in element &&
    element.children &&
    element.children.length > 0
  ) {
    const childrenContent = element.children
      .map((child: any) => renderMMLElement(child))
      .join("\n    ") // Indent children
    content += (content ? "\n    " : "") + childrenContent
  }

  // If there's content or children, format with proper indentation
  if (content) {
    return `${openTag}\n    ${content}\n  ${closeTag}`
  } else {
    return `${openTag}${closeTag}`
  }
}

// Check if lighting is already provided by the user (recursively)
function hasLightingRecursive(elements: MMLElement[]): boolean {
  return elements.some((element) => {
    if (element.tag === "m-light") return true
    if (
      "children" in element &&
      element.children &&
      element.children.length > 0
    ) {
      return hasLightingRecursive(element.children as MMLElement[])
    }
    return false
  })
}

async function handleCreateWorld(
  args: CreateWorldInput,
  webWorldClient: WebWorldClient,
  mmlClient: MMLClient,
) {
  const { title, elements, script } = args

  try {
    const mmlElements = elements
      .map((element) => renderMMLElement(element))
      .join("\n  ")

    // Always add lighting if not explicitly provided to prevent black scenes
    const hasLighting = hasLightingRecursive(elements)
    const defaultLighting = hasLighting
      ? ""
      : `\n  ${COMMENTS.DEFAULT_LIGHTING}\n  <m-light type="${LIGHT_TYPES.DIRECTIONAL}" intensity="500" color="${COLORS.WHITE}" x="2" y="5" z="2"></m-light>`

    const mmlContent = `<!-- ${title} -->
<m-group id="scene">
  ${mmlElements}${defaultLighting}
</m-group>

${script ? `<script>\n${script}\n</script>` : ""}`

    const mmlObject = await mmlClient.createMMLObject({
      name: title,
      source: {
        type: "source",
        source: mmlContent,
      },
    })

    const webWorldInstance = await webWorldClient.createWebWorld({
      name: title,
      description: mmlObject.id,
      mmlDocumentsConfiguration: {
        mmlDocuments: {
          [mmlObject.id]: {
            url: mmlObject.url,
          },
        },
      },
    })

    return {
      content: [
        {
          type: "text",
          text: `Web world ID is: ${webWorldInstance.id}`,
        },
        {
          type: "text",
          text: `Web world URL is: ${webWorldInstance.url}`,
        },
        {
          type: "text",
          text: `MML document content: ${mmlContent}`,
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `${ERROR_MESSAGES.ERROR_CREATING_DOCUMENT} ${error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR}`,
        },
      ],
      isError: true,
    }
  }
}

async function handleUpdateWorld(
  args: UpdateWorldInput,
  webWorldClient: WebWorldClient,
  mmlClient: MMLClient,
) {
  const { worldId, mmlContent } = args

  let mmlObjectId: string

  try {
    const webWorldInstance = await webWorldClient.getWebWorld(worldId)
    if (!webWorldInstance) {
      return {
        content: [
          {
            type: "text",
            text: `${ERROR_MESSAGES.ERROR_UPDATING_WORLD} Can't find web world with ID ${worldId}`,
          },
        ],
        isError: true,
      }
    }

    const docs = webWorldInstance.mmlDocumentsConfiguration.mmlDocuments
    if (Object.keys(docs).length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `${ERROR_MESSAGES.ERROR_UPDATING_WORLD} Can't find MML object ID for web world with ID ${worldId}`,
          },
        ],
      }
    }

    mmlObjectId = Object.keys(docs)[0]
    if (!mmlObjectId) {
      return {
        content: [
          {
            type: "text",
            text: `${ERROR_MESSAGES.ERROR_UPDATING_WORLD} Can't find MML object ID for web world with ID ${worldId}`,
          },
        ],
        isError: true,
      }
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `${ERROR_MESSAGES.ERROR_UPDATING_WORLD} ${error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR}`,
        },
      ],
      isError: true,
    }
  }

  try {
    await mmlClient.updateMMLObject(mmlObjectId, {
      source: {
        type: "source",
        source: mmlContent,
      },
    })
  } catch (error) {
    console.error(`[UPDATE_WORLD] Error updating MML object:`, error)
    return {
      content: [
        {
          type: "text",
          text: `${ERROR_MESSAGES.ERROR_UPDATING_WORLD} ${error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR}`,
        },
      ],
      isError: true,
    }
  }

  return {
    content: [
      {
        type: "text",
        text: `Updated world with new MML object ID: ${mmlObjectId}`,
      },
    ],
  }
}

async function handleScreenshotWorld(
  args: ScreenshotWorldInput,
  webWorldClient: WebWorldClient,
  screenshotService: ScreenshotService,
) {
  const { worldId } = args

  const webWorld = await webWorldClient.getWebWorld(worldId)
  if (!webWorld) {
    return {
      content: [
        {
          type: "text",
          text: `${ERROR_MESSAGES.ERROR_UPDATING_WORLD} Can't find web world with ID ${worldId}`,
        },
      ],
    }
  }

  // We'll set the web world description to the MML object ID
  const mmlObjectId = webWorld.description!

  const screenshot = await screenshotService.takeScreenshot(mmlObjectId)

  // Convert buffer to base64 string for MCP response
  const screenshotBase64 = screenshot.toString("base64")

  return {
    content: [
      {
        type: "text",
        text: `Screenshot captured successfully!`,
      },
      {
        type: "image",
        data: screenshotBase64,
        mimeType: "image/png",
      },
    ],
  }
}

function handleListAllMMLElements() {
  try {
    const elementsList = Object.entries(MML_ELEMENTS)
      .map(([elementName, elementInfo]) => {
        const attributeList = Object.entries(elementInfo.attributes)
          .map(([attr, desc]) => `  • **${attr}**: ${desc}`)
          .join("\n")

        const example = Object.keys(elementInfo.attributes)
          .slice(0, 2)
          .map((attr) => ` ${attr}="value"`)
          .join("")

        return `## ${elementName}

**Description**: ${elementInfo.description}

**Attributes**:
${attributeList}

**Example**:
\`\`\`html
<${elementName} id="example"${example}></${elementName}>
\`\`\``
      })
      .join("\n\n---\n\n")

    return {
      content: [
        {
          type: "text",
          text: `# Complete MML Elements Reference

This is a comprehensive list of all available MML elements and their attributes:

${elementsList}

## Usage Notes:
- All elements support positioning with **x**, **y**, **z** attributes (in meters)
- Most elements support rotation with **rx**, **ry**, **rz** attributes (in degrees)  
- Many elements support scaling with **sx**, **sy**, **sz** attributes
- Use **id** attribute to reference elements in scripts
- Colors can be specified as names ('red'), hex codes ('#FF0000'), or RGB values ('rgb(255,0,0)')
- Interactive elements support **onclick** attribute for click handlers`,
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error retrieving MML elements information: ${error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR}`,
        },
      ],
      isError: true,
    }
  }
}

// async function handleScreenshot(args: CaptureWorldScreenshotInput) {
//   const {
//     mml_document: mmlDocument,
//     camera_position: inCameraPosition,
//     camera_target: inCameraTarget,
//     width = DEFAULTS.SCREENSHOT_WIDTH,
//     height = DEFAULTS.SCREENSHOT_HEIGHT,
//   } = args

//   try {
//     console.log(
//       `[SCREENSHOT] Starting screenshot capture with camera at (${inCameraPosition?.x || DEFAULTS.CAMERA_POSITION.x}, ${inCameraPosition?.y || DEFAULTS.CAMERA_POSITION.y}, ${inCameraPosition?.z || DEFAULTS.CAMERA_POSITION.z})`,
//     )

//     // Create camera position and target vectors
//     const cameraPosition = inCameraPosition
//       ? new THREE.Vector3(
//         inCameraPosition.x,
//         inCameraPosition.y,
//         inCameraPosition.z,
//       )
//       : new THREE.Vector3(
//         DEFAULTS.CAMERA_POSITION.x,
//         DEFAULTS.CAMERA_POSITION.y,
//         DEFAULTS.CAMERA_POSITION.z,
//       )

//     const cameraTarget = inCameraTarget
//       ? new THREE.Vector3(inCameraTarget.x, inCameraTarget.y, inCameraTarget.z)
//       : new THREE.Vector3(
//         DEFAULTS.CAMERA_TARGET.x,
//         DEFAULTS.CAMERA_TARGET.y,
//         DEFAULTS.CAMERA_TARGET.z,
//       )

//     // Generate temporary output path for initial screenshot
//     const { fullPath } = generateTempScreenshotPath()

//     // Generate screenshot to temporary location
//     await screenshotProcessManager.generateScreenshot(mmlDocument, fullPath, {
//       width,
//       height,
//       cameraPosition: cameraPosition,
//       cameraTarget: cameraTarget,
//       backgroundColor: new THREE.Color(0x87ceeb),
//     })

//     const screenshotBase64 = fs.readFileSync(fullPath, "base64")

//     // fs.unlinkSync(fullPath); // Keep screenshot files instead of cleaning up

//     return {
//       content: [
//         {
//           type: "text",
//           text: `Screenshot captured successfully!`,
//         },
//         {
//           type: "image",
//           data: screenshotBase64,
//           mimeType: "image/png",
//         },
//       ],
//     }
//   } catch (error) {
//     console.error(`[SCREENSHOT] Error capturing screenshot:`, error)
//     return {
//       content: [
//         {
//           type: "text",
//           text: `${ERROR_MESSAGES.ERROR_CAPTURING_SCREENSHOT} ${error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR}`,
//         },
//       ],
//       isError: true,
//     }
//   }
// }
