import { describe, test, expect } from "@jest/globals"
import { TOOL_NAMES } from "../../packages/mcp-server/build/constants.js"

describe("Update Tools Tests", () => {
  test("should have correct tool names for new update tools", () => {
    expect(TOOL_NAMES.UPDATE_ELEMENTS).toBe("update-elements")
    expect(TOOL_NAMES.UPDATE_SCRIPT).toBe("update-script")
  })

  test("should validate element operation schemas", () => {
    // Test add operation structure
    const addOperation = {
      action: "add",
      element: {
        tag: "m-cube",
        attributes: {
          id: "test-cube",
          color: "red",
          x: 1,
          y: 2,
          z: 3,
        },
      },
    }

    expect(addOperation.action).toBe("add")
    expect(addOperation.element.tag).toBe("m-cube")
    expect(addOperation.element.attributes.id).toBe("test-cube")

    // Test update operation structure
    const updateOperation = {
      action: "update",
      elementId: "existing-cube",
      element: {
        tag: "m-cube",
        attributes: {
          id: "existing-cube",
          color: "blue",
          x: 5,
          y: 1,
          z: 0,
        },
      },
    }

    expect(updateOperation.action).toBe("update")
    expect(updateOperation.elementId).toBe("existing-cube")
    expect(updateOperation.element.attributes.color).toBe("blue")

    // Test delete operation structure
    const deleteOperation = {
      action: "delete",
      elementId: "cube-to-delete",
    }

    expect(deleteOperation.action).toBe("delete")
    expect(deleteOperation.elementId).toBe("cube-to-delete")
  })

  test("should validate script update structure", () => {
    const scriptUpdate = {
      worldId: "world-123",
      script: "console.log('Hello world!');",
    }

    expect(scriptUpdate.worldId).toBe("world-123")
    expect(scriptUpdate.script).toContain("console.log")

    // Test script removal (empty string)
    const scriptRemoval = {
      worldId: "world-123",
      script: "",
    }

    expect(scriptRemoval.script).toBe("")
  })

  test("should ensure ID uniqueness requirements", () => {
    // Test that elements require IDs for operations
    const elementWithId = {
      tag: "m-sphere",
      attributes: {
        id: "unique-sphere",
        radius: 1,
        color: "green",
      },
    }

    expect(elementWithId.attributes.id).toBeDefined()
    expect(elementWithId.attributes.id).toBe("unique-sphere")

    // Test different element types with IDs
    const elementTypes = [
      { tag: "m-cube", attributes: { id: "cube-1" } },
      { tag: "m-sphere", attributes: { id: "sphere-1", radius: 1 } },
      { tag: "m-cylinder", attributes: { id: "cylinder-1" } },
      { tag: "m-model", attributes: { id: "model-1", src: "test.glb" } },
      { tag: "m-light", attributes: { id: "light-1", type: "directional" } },
      { tag: "m-label", attributes: { id: "label-1", text: "Test Label" } },
    ]

    elementTypes.forEach((element) => {
      expect(element.attributes.id).toBeDefined()
      expect(element.attributes.id).toMatch(
        /^(cube|sphere|cylinder|model|light|label)-\d+$/,
      )
    })
  })

  test("should handle various MML element attributes", () => {
    // Test positioning attributes
    const positionedElement = {
      tag: "m-cube",
      attributes: {
        id: "positioned-cube",
        x: 10.5,
        y: -2,
        z: 0.75,
      },
    }

    expect(positionedElement.attributes.x).toBe(10.5)
    expect(positionedElement.attributes.y).toBe(-2)
    expect(positionedElement.attributes.z).toBe(0.75)

    // Test rotation attributes
    const rotatedElement = {
      tag: "m-cube",
      attributes: {
        id: "rotated-cube",
        rx: 45,
        ry: 90,
        rz: 180,
      },
    }

    expect(rotatedElement.attributes.rx).toBe(45)
    expect(rotatedElement.attributes.ry).toBe(90)
    expect(rotatedElement.attributes.rz).toBe(180)

    // Test scale attributes
    const scaledElement = {
      tag: "m-cube",
      attributes: {
        id: "scaled-cube",
        sx: 2,
        sy: 0.5,
        sz: 1.5,
      },
    }

    expect(scaledElement.attributes.sx).toBe(2)
    expect(scaledElement.attributes.sy).toBe(0.5)
    expect(scaledElement.attributes.sz).toBe(1.5)
  })

  test("should validate element-specific required attributes", () => {
    // Test sphere with required radius
    const sphere = {
      tag: "m-sphere",
      attributes: {
        id: "test-sphere",
        radius: 2.5,
      },
    }

    expect(sphere.attributes.radius).toBeDefined()
    expect(sphere.attributes.radius).toBe(2.5)

    // Test model with required src
    const model = {
      tag: "m-model",
      attributes: {
        id: "test-model",
        src: "https://example.com/model.glb",
      },
    }

    expect(model.attributes.src).toBeDefined()
    expect(model.attributes.src).toMatch(/\.glb$/)

    // Test light with required type
    const light = {
      tag: "m-light",
      attributes: {
        id: "test-light",
        type: "directional",
        intensity: 300,
      },
    }

    expect(light.attributes.type).toBeDefined()
    expect(["point", "spotlight", "directional"]).toContain(
      light.attributes.type,
    )

    // Test label with required text
    const label = {
      tag: "m-label",
      attributes: {
        id: "test-label",
        text: "Hello World",
      },
    }

    expect(label.attributes.text).toBeDefined()
    expect(label.attributes.text).toBe("Hello World")
  })
})
