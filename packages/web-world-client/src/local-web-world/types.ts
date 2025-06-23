// TypeScript interfaces for Local Web World Server - Following API Specification

export interface Position {
  x: number
  y: number
  z: number
}

export interface Rotation {
  x: number
  y: number
  z: number
}

export interface Scale {
  x: number
  y: number
  z: number
}

export interface MMLDocument {
  url: string
  position?: Position
  rotation?: Rotation
  scale?: Scale
}

export interface WorldGeneralConfiguration {
  maxUserConnections?: number
}

export interface WorldAuthConfiguration {
  allowAnonymous: boolean
  password?: string
  authProviders?: {
    webhook?: {
      webhookUrl: string
    }
    google?: {
      allowedOrganizations?: string[]
      allowedUsers?: string[]
    }
    discord?: {
      allowedUsers?: string[]
    }
  }
}

export interface WorldDisplayNameConfiguration {
  allowCustomDisplayNames?: boolean
}

export interface WorldMMLDocumentsConfiguration {
  mmlDocuments: Record<string, MMLDocument>
}

export interface WorldChatConfiguration {
  enabled: boolean
}

export interface Skybox {
  intensity?: number
  blurriness?: number
  azimuthalAngle?: number
  polarAngle?: number
  hdrJpgUrl?: string
  hdrUrl?: string
}

export interface EnvMap {
  intensity?: number
}

export interface Sun {
  intensity?: number
  polarAngle?: number
  azimuthalAngle?: number
}

export interface Fog {
  fogNear?: number
  fogFar?: number
}

export interface PostProcessing {
  bloomIntensity?: number
}

export interface AmbientLight {
  intensity?: number
}

export interface WorldEnvironmentConfiguration {
  groundPlane?: boolean
  skybox?: Skybox
  envMap?: EnvMap
  sun?: Sun
  fog?: Fog
  postProcessing?: PostProcessing
  ambientLight?: AmbientLight
}

export interface CharacterDescription {
  meshFileUrl?: string | null
  mmlCharacterString?: string | null
  mmlCharacterUrl?: string | null
}

export interface WorldAvatar {
  isDefaultAvatar?: boolean
  meshFileUrl?: string | null
  mmlCharacterString?: string | null
  mmlCharacterUrl?: string | null
  thumbnailUrl?: string
  name?: string
}

export interface WorldAvatarConfiguration {
  availableAvatars?: WorldAvatar[]
  allowCustomAvatars?: boolean
  customAvatarWebhookUrl?: string
}

export interface WorldLoadingConfiguration {
  overlayLayers?: Array<{
    overlayImageUrl?: string
    overlayAnchor?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
    name?: string
    overlayOffset?: {
      x?: number
      y?: number
    }
  }>
  background?: string
  color?: string
  backgroundImageUrl?: string
  backgroundBlurAmount?: number
  title?: string
  subtitle?: string
  enableCustomLoadingScreen?: boolean
}

export interface CreateWorldBody {
  id?: string // Pattern: ^[a-z0-9-]{1,32}$
  name: string // minLength: 1, maxLength: 32
  description?: string
  generalConfiguration?: WorldGeneralConfiguration
  chatConfiguration?: WorldChatConfiguration
  authConfiguration?: WorldAuthConfiguration
  displayNameConfiguration?: WorldDisplayNameConfiguration
  mmlDocumentsConfiguration?: WorldMMLDocumentsConfiguration
  environmentConfiguration?: WorldEnvironmentConfiguration
  avatarConfiguration?: WorldAvatarConfiguration
  loadingConfiguration?: WorldLoadingConfiguration
  enableTweakPane?: boolean
  allowOrbitalCamera?: boolean
}

export interface UpdateWorldBody {
  name?: string // minLength: 1, maxLength: 32
  description?: string
  generalConfiguration?: WorldGeneralConfiguration
  chatConfiguration?: WorldChatConfiguration
  authConfiguration?: WorldAuthConfiguration
  displayNameConfiguration?: WorldDisplayNameConfiguration
  mmlDocumentsConfiguration?: WorldMMLDocumentsConfiguration
  environmentConfiguration?: WorldEnvironmentConfiguration
  avatarConfiguration?: WorldAvatarConfiguration
  loadingConfiguration?: WorldLoadingConfiguration
  enableTweakPane?: boolean
  allowOrbitalCamera?: boolean
}

export interface UserIdOrAPIKeyId {
  // This would be defined based on the actual user/API key structure
  [key: string]: unknown
}

export interface WebWorldInstance {
  id: string
  name: string
  description?: string
  generalConfiguration?: WorldGeneralConfiguration
  chatConfiguration: WorldChatConfiguration
  authConfiguration: WorldAuthConfiguration
  displayNameConfiguration?: WorldDisplayNameConfiguration
  mmlDocumentsConfiguration: WorldMMLDocumentsConfiguration
  environmentConfiguration: WorldEnvironmentConfiguration
  avatarConfiguration: WorldAvatarConfiguration
  loadingConfiguration: WorldLoadingConfiguration
  createdAt: string
  createdBy: UserIdOrAPIKeyId
  enableTweakPane?: boolean
  allowOrbitalCamera?: boolean
}

export interface WebWorldsTier {
  name:
    | "web-worlds-free-tier"
    | "web-worlds-standard-tier"
    | "web-worlds-premium-tier"
  maxWorlds: number
  features: string[]
}

export interface GetWorldResponse extends WebWorldInstance {
  canWrite: boolean
  tier: WebWorldsTier
}

export interface ListWorldsQuery {
  search?: string
  offset?: number
  limit?: number
}

export interface ListWorldsResponse {
  worlds: WebWorldInstance[]
  totalResults: number
  offset?: number
  limit?: number
}

export interface ServerInfo {
  url: string
  port: number
  tempDir: string
  gameServerUrl?: string // URL of the game client server
  stop: () => Promise<void>
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}
