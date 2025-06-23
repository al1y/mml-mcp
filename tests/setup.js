// Global test setup for MML MCP project
import { jest } from "@jest/globals"

// Extend expect with custom matchers if needed
global.jest = jest

// Set longer timeout for integration tests
jest.setTimeout(30000)

// Mock console methods if needed during tests
const originalConsoleLog = console.log
global.mockConsole = () => {
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
}

global.restoreConsole = () => {
  console.log = originalConsoleLog
}

// Add common test utilities
global.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Setup DOM environment for tests that need it (using jsdom)
import { JSDOM } from "jsdom"

global.setupDOM = () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
    resources: "usable",
  })

  global.window = dom.window
  global.document = dom.window.document
  global.HTMLElement = dom.window.HTMLElement
  global.Element = dom.window.Element
  global.Node = dom.window.Node
  global.CustomEvent = dom.window.CustomEvent
  global.Event = dom.window.Event
}

global.cleanupDOM = () => {
  delete global.window
  delete global.document
  delete global.HTMLElement
  delete global.Element
  delete global.Node
  delete global.CustomEvent
  delete global.Event
}
