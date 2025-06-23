import { describe, test, expect } from "@jest/globals"
import * as fs from "fs"
import * as path from "path"
import { JSDOM } from "jsdom"
import { createWebWorldClient } from "../../packages/web-world-client/build/index.js"
import { createMMLClient } from "../../packages/mml-client/build/index.js"
import { TOOL_NAMES } from "../../packages/mcp-server/build/constants.js"

// Function to convert MML to JSON elements format
function convertMMLToJSON(mmlContent) {
  const dom = new JSDOM(mmlContent, { contentType: "text/xml" })
  const doc = dom.window.document

  function parseElement(element) {
    const attributes = {}

    // Extract all attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      attributes[attr.name] = attr.value
    }

    const result = {
      tag: element.tagName,
      attributes,
    }

    // Parse children if they exist
    const children = []
    for (const child of element.children) {
      if (child.tagName && child.tagName.startsWith("m-")) {
        children.push(parseElement(child))
      }
    }

    if (children.length > 0) {
      result.children = children
    }

    return result
  }

  const elements = []
  const mmlElements = doc.querySelectorAll(
    "m-group, m-cube, m-sphere, m-cylinder, m-light, m-model, m-character, m-video, m-audio, m-label",
  )

  for (const element of mmlElements) {
    // Only add top-level elements (not nested ones)
    if (
      !element.parentElement ||
      !element.parentElement.tagName.startsWith("m-")
    ) {
      elements.push(parseElement(element))
    }
  }

  return elements
}

describe("MCP Generate Tests", () => {
  test("should parse MML content and provide MCP tools for world creation", () => {
    // Test MML parsing with realistic 3D scene
    const testMML = `
      <m-group id="virtual-office">
        <m-cube color="red" x="1" y="2" z="3" scale="2"></m-cube>
        <m-sphere color="blue" radius="1.5" x="5" y="1"></m-sphere>
        <m-group id="furniture">
          <m-cube color="brown" x="0" y="0" z="0" width="3" height="0.1" depth="1.5"></m-cube>
          <m-label text="Conference Table" y="2" x="0" color="white"></m-label>
        </m-group>
        <m-light type="directional" intensity="0.8" x="10" y="10" z="10"></m-light>
      </m-group>
    `

    // Parse and validate structure
    const elements = convertMMLToJSON(testMML)
    expect(elements.length).toBe(1)

    const office = elements[0]
    expect(office.tag).toBe("m-group")
    expect(office.attributes.id).toBe("virtual-office")
    expect(office.children).toBeDefined()
    expect(office.children.length).toBe(4) // cube, sphere, furniture group, light

    // Validate nested structure
    const furnitureGroup = office.children.find(
      (child) => child.attributes.id === "furniture",
    )
    expect(furnitureGroup).toBeDefined()
    expect(furnitureGroup.children.length).toBe(2) // table and label

    const table = furnitureGroup.children[0]
    expect(table.tag).toBe("m-cube")
    expect(table.attributes.color).toBe("brown")
    expect(table.attributes.width).toBe("3")

    // Test that MCP tools are available
    expect(TOOL_NAMES.CREATE_WORLD).toBe("create-world")
    expect(TOOL_NAMES.UPDATE_WORLD).toBe("update-world")

    // Test that client creation functions are available
    expect(typeof createWebWorldClient).toBe("function")
    expect(typeof createMMLClient).toBe("function")

    // Test file reading if test.mml exists
    const testMMLPath = path.join(process.cwd(), "tests", "shared", "test.mml")
    if (fs.existsSync(testMMLPath)) {
      const fileContent = fs.readFileSync(testMMLPath, "utf-8")
      const fileElements = convertMMLToJSON(fileContent)
      expect(Array.isArray(fileElements)).toBe(true)
    }
  })
})
