/**
 * Type definitions for MML elements and server components
 */

export interface MMLElementAttribute {
  [key: string]: string
}

export interface MMLElementDefinition {
  description: string
  attributes: MMLElementAttribute
}

export interface MMLElements {
  [elementName: string]: MMLElementDefinition
}

export interface MMLTemplates {
  [templateName: string]: string
}

export interface MMLExamples {
  [exampleName: string]: string
}

// Enhanced element structure for hierarchical support
export interface MMLElement {
  tag: string
  attributes?: Record<string, any>
  children?: MMLElement[]
  content?: string // For elements that contain text content
}

export interface CreateDocumentArgs {
  title: string
  elements: Array<MMLElement>
  script?: string
}

export interface UpdateWorldArgs {
  worldId: string
  mmlContent: string
}

export interface ValidateMMLArgs {
  mml: string
}
