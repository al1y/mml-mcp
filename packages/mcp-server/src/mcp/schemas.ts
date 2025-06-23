import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

// Common attribute schemas for reuse
const PositionSchema = z.object({
  x: z.number().optional().describe("Position along X-axis in meters"),
  y: z.number().optional().describe("Position along Y-axis in meters"),
  z: z.number().optional().describe("Position along Z-axis in meters"),
})

const RotationSchema = z.object({
  rx: z.number().optional().describe("Rotation around X-axis in degrees"),
  ry: z.number().optional().describe("Rotation around Y-axis in degrees"),
  rz: z.number().optional().describe("Rotation around Z-axis in degrees"),
})

const ScaleSchema = z.object({
  sx: z.number().optional().describe("Scale along X-axis"),
  sy: z.number().optional().describe("Scale along Y-axis"),
  sz: z.number().optional().describe("Scale along Z-axis"),
})

const CommonAttributesSchema = z.object({
  id: z.string().optional().describe("Unique identifier for the element"),
  visible: z.boolean().optional().describe("Whether element is visible"),
  onclick: z
    .string()
    .optional()
    .describe("Script expression executed when clicked"),
})

// Individual MML Element Schemas
export const MCubeSchema = z.object({
  tag: z.literal("m-cube"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(ScaleSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        color: z
          .string()
          .optional()
          .describe("Color value (e.g., 'red', '#FF0000', 'rgb(255,0,0)')"),
        opacity: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Opacity from 0 (transparent) to 1 (opaque)"),
        collide: z
          .boolean()
          .optional()
          .describe("Whether object participates in collision detection"),
      }),
    )
    .optional(),
})

export const MSphereSchema = z.object({
  tag: z.literal("m-sphere"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        radius: z
          .number()
          .default(0.5)
          .describe("Radius of the sphere in meters"),
        color: z.string().optional().describe("Color value"),
        opacity: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Opacity from 0 to 1"),
        collide: z
          .boolean()
          .optional()
          .describe("Whether object participates in collision detection"),
      }),
    )
    .optional(),
})

export const MCylinderSchema = z.object({
  tag: z.literal("m-cylinder"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        radius: z
          .number()
          .optional()
          .describe("Radius of the cylinder base in meters"),
        height: z
          .number()
          .optional()
          .describe("Height of the cylinder in meters"),
        color: z.string().optional().describe("Color value"),
        opacity: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Opacity from 0 to 1"),
        collide: z
          .boolean()
          .optional()
          .describe("Whether object participates in collision detection"),
      }),
    )
    .optional(),
})

export const MModelSchema = z.object({
  tag: z.literal("m-model"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(ScaleSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        src: z.string().describe("URL or path to the 3D model file"),
        collide: z
          .boolean()
          .optional()
          .describe("Whether object participates in collision detection"),
      }),
    )
    .optional(),
})

export const MGroupSchema = z.object({
  tag: z.literal("m-group"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(ScaleSchema)
    .merge(CommonAttributesSchema)
    .optional(),
})

export const MLightSchema = z.object({
  tag: z.literal("m-light"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        type: z
          .enum(["point", "spotlight", "directional"])
          .describe("Light type"),
        color: z.string().optional().describe("Light color value"),
        intensity: z
          .number()
          .default(200)
          .describe("Light intensity value in candela (cd)"),
      }),
    )
    .optional(),
})

export const MVideoSchema = z.object({
  tag: z.literal("m-video"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        src: z.string().describe("URL or path to the video file"),
        width: z
          .number()
          .optional()
          .describe("Width of the video plane in meters"),
        height: z
          .number()
          .optional()
          .describe("Height of the video plane in meters"),
        loop: z.boolean().optional().describe("Whether video should loop"),
        autoplay: z
          .boolean()
          .optional()
          .describe("Whether video should autoplay"),
      }),
    )
    .optional(),
})

export const MAudioSchema = z.object({
  tag: z.literal("m-audio"),
  attributes: PositionSchema.merge(CommonAttributesSchema)
    .merge(
      z.object({
        src: z.string().describe("URL or path to the audio file"),
        loop: z.boolean().optional().describe("Whether audio should loop"),
        autoplay: z
          .boolean()
          .optional()
          .describe("Whether audio should autoplay"),
        volume: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Audio volume from 0 to 1"),
      }),
    )
    .optional(),
})

export const MLabelSchema = z.object({
  tag: z.literal("m-label"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        text: z.string().describe("Text content to display"),
        color: z.string().optional().describe("Text color value"),
        "font-size": z.number().optional().describe("Font size in pixels"),
        width: z
          .number()
          .optional()
          .describe("Width of the text plane in meters"),
        height: z
          .number()
          .optional()
          .describe("Height of the text plane in meters"),
      }),
    )
    .optional(),
})

// Schemas with children support (only for elements that actually support them per MML spec)
export const MGroupWithChildren = MGroupSchema.extend({
  children: z.array(z.any()).optional().describe("Array of child MML elements"),
})

// m-character only supports m-model children specifically
export const MCharacterSchema = z.object({
  tag: z.literal("m-character"),
  attributes: PositionSchema.merge(RotationSchema)
    .merge(ScaleSchema)
    .merge(CommonAttributesSchema)
    .merge(
      z.object({
        src: z
          .string()
          .optional()
          .describe("URL or path to the character model file"),
      }),
    )
    .optional(),
  children: z
    .array(
      z.object({
        tag: z.literal("m-model"),
        attributes: z.any().optional(),
      }),
    )
    .optional()
    .describe("Array of m-model elements for character composition"),
})

// Final union type for all MML elements
export const MMLElementSchema = z.discriminatedUnion("tag", [
  MCubeSchema,
  MSphereSchema,
  MCylinderSchema,
  MModelSchema,
  MGroupWithChildren,
  MLightSchema,
  MCharacterSchema,
  MVideoSchema,
  MAudioSchema,
  MLabelSchema,
])

// Create World schema
export const CreateWorldSchema = z.object({
  title: z.string().describe("Title/name for the MML document"),
  elements: z
    .array(MMLElementSchema)
    .describe("Array of MML elements to include"),
  script: z
    .string()
    .optional()
    .describe("Optional JavaScript code for interactivity"),
})

// Update World schema
export const UpdateWorldSchema = z.object({
  worldId: z.string().describe("ID of the web world to update"),
  mmlContent: z
    .string()
    .describe("MML document content to update the web world with"),
})

// Get MML Details schema (no parameters needed)
export const GetMMLDetailsSchema = z.object({})

// Screenshot schema
export const ScreenshotWorldSchema = z.object({
  worldId: z
    .string()
    .describe("ID of the web world to capture a screenshot of"),
})

// Helper function to extract direct JSON schema from zodToJsonSchema output
function extractDirectSchema(zodSchema: z.ZodType<any>, name: string) {
  const fullSchema = zodToJsonSchema(zodSchema, name) as any

  // If the schema uses $ref, extract the actual definition
  if (fullSchema.$ref && fullSchema.definitions) {
    const definitionKey = fullSchema.$ref.replace("#/definitions/", "")
    return fullSchema.definitions[definitionKey]
  }

  // Otherwise return the schema as-is
  return fullSchema
}

// Auto-generated JSON Schema versions for MCP tool definitions
export const CreateWorldJsonSchema = extractDirectSchema(
  CreateWorldSchema,
  "CreateWorldSchema",
)
export const UpdateWorldJsonSchema = extractDirectSchema(
  UpdateWorldSchema,
  "UpdateWorldSchema",
)
export const GetMMLDetailsJsonSchema = extractDirectSchema(
  GetMMLDetailsSchema,
  "GetMMLDetailsSchema",
)
export const ScreenshotWorldJsonSchema = extractDirectSchema(
  ScreenshotWorldSchema,
  "ScreenshotWorldSchema",
)

// Type inference for TypeScript
export type CreateWorldInput = z.infer<typeof CreateWorldSchema>
export type UpdateWorldInput = z.infer<typeof UpdateWorldSchema>
export type GetMMLDetailsInput = z.infer<typeof GetMMLDetailsSchema>
export type ScreenshotWorldInput = z.infer<typeof ScreenshotWorldJsonSchema>
export type MMLElement = z.infer<typeof MMLElementSchema>

// Individual element types
export type MCube = z.infer<typeof MCubeSchema>
export type MSphere = z.infer<typeof MSphereSchema>
export type MCylinder = z.infer<typeof MCylinderSchema>
export type MModel = z.infer<typeof MModelSchema>
export type MGroup = z.infer<typeof MGroupSchema>
export type MLight = z.infer<typeof MLightSchema>
export type MCharacter = z.infer<typeof MCharacterSchema>
export type MVideo = z.infer<typeof MVideoSchema>
export type MAudio = z.infer<typeof MAudioSchema>
export type MLabel = z.infer<typeof MLabelSchema>
