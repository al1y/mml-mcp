// TypeScript interfaces for MML Object Server

export interface MMLObjectSource {
  type: "source"
  source: string
  parametersSchema?: Record<string, unknown>
}

export interface UserIdOrAPIKeyId {
  // This would need to be defined based on your user/API key structure
  // Placeholder for now
  id: string
  type: "user" | "apiKey"
}

export interface MMLObjectInstance {
  id: string
  name: string
  description?: string
  url: string
  enabled: boolean
  source: MMLObjectSource
  parameters?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
  createdBy: UserIdOrAPIKeyId
}

export interface CreateMMLObjectInstanceBody {
  id?: string
  name: string
  description?: string
  enabled?: boolean
  source: MMLObjectSource
}

export interface UpdateMMLObjectInstanceBody {
  name?: string
  description?: string
  enabled?: boolean
  parameters?: Record<string, unknown>
  source?: MMLObjectSource
}

export interface ListMMLObjectInstancesResponse {
  objects: MMLObjectInstance[]
  totalResults: number
  offset: number
  limit: number
  canWrite: boolean
}

export interface GetMMLObjectInstanceResponse extends MMLObjectInstance {
  canWrite: boolean
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface ListMMLObjectInstancesQuery {
  offset?: number
  limit?: number
  search?: string
}

export interface MMLObjectInstanceLogAccess {
  url: string
  token: string
}

export interface MMLObjectInstanceUsageInterval {
  startTime: string
  endTime: string
  connectedClients: number
  connectedClientMicroseconds: number
}

export interface MMLObjectInstanceQuota {
  limit: number
  current: number
}

export interface MMLObjectInstanceRun {
  id: string
  status: "running" | "ended" | "errored"
  startTime: string
  endTime?: string
  message?: string
  logFile?: string
}

export interface ServerInfo {
  url: string
  port: number
  tempDir: string
  stop: () => Promise<void>
}
