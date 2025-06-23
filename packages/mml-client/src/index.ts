// MML Objects API Client
// Wrapper for hitting MML Object API endpoints, supporting both localhost and M² cloud APIs

import {
  MMLObjectInstance,
  CreateMMLObjectInstanceBody,
  UpdateMMLObjectInstanceBody,
  ListMMLObjectInstancesResponse,
  GetMMLObjectInstanceResponse,
  ListMMLObjectInstancesQuery,
  ServerInfo,
} from "./local-mml-server/types.js"
import { createMMLObjectServer } from "./local-mml-server/index.js"
import { LOCAL_PROJECT_ID } from "@mml-mcp/shared"

/**
 * API Client for MML Objects
 *
 * Supports both localhost development server and M² cloud APIs.
 * Switch between modes using the USE_MSQUARED_APIS environment variable.
 *
 * In localhost mode, automatically creates and manages a local server.
 * In M² mode, uses https://api.msquared.io and gets API key from MSQUARED_API_KEY env var.
 */
export class MMLClient {
  private baseUrl: string
  private projectId: string
  private headers: Record<string, string>
  private localServer: ServerInfo | null = null
  private isLocalhostMode: boolean
  private externalServerUrl: string | null = null

  constructor(externalServerUrl?: string) {
    this.projectId = process.env.MSQUARED_PROJECT_ID || LOCAL_PROJECT_ID
    this.isLocalhostMode = !process.env.USE_MSQUARED_APIS
    this.externalServerUrl = externalServerUrl || null

    // Determine base URL based on environment
    if (process.env.USE_MSQUARED_APIS) {
      this.baseUrl = "https://api.msquared.io"
    } else if (this.externalServerUrl) {
      // Use provided external server URL
      this.baseUrl = this.externalServerUrl
    } else {
      // Will be set when local server starts
      this.baseUrl = ""
    }

    // Set up headers
    this.headers = {
      "Content-Type": "application/json",
    }

    // Add API key for M² APIs from environment variable
    if (process.env.USE_MSQUARED_APIS) {
      const apiKey = process.env.MSQUARED_API_KEY
      if (apiKey) {
        this.headers["Authorization"] = `Bearer ${apiKey}`
      } else {
        console.warn(
          "Warning: USE_MSQUARED_APIS is set but MSQUARED_API_KEY environment variable not found",
        )
      }
    }

    // Start local server if in localhost mode and no external server provided
    if (this.isLocalhostMode && !this.externalServerUrl) {
      this.initializeLocalServer()
    }
  }

  /**
   * Initialize the local server (called automatically in localhost mode)
   */
  private async initializeLocalServer(): Promise<void> {
    try {
      this.localServer = await createMMLObjectServer()
      this.baseUrl = this.localServer.url
    } catch (error) {
      throw new Error(
        `Failed to start local MML server: ${(error as Error).message}`,
      )
    }
  }

  /**
   * Ensure local server is ready (lazy initialization for async constructor alternative)
   */
  private async ensureServerReady(): Promise<void> {
    if (this.isLocalhostMode && !this.localServer && !this.externalServerUrl) {
      await this.initializeLocalServer()
    }
  }

  /**
   * Get the base URL for the MML client
   */
  getUrl(): string {
    return this.baseUrl
  }

  /**
   * Get information about the local server (if running in localhost mode)
   */
  getLocalServerInfo(): ServerInfo | null {
    return this.localServer
  }

  /**
   * Stop and cleanup the local server (if running in localhost mode)
   */
  async stop(): Promise<void> {
    if (this.localServer) {
      await this.localServer.stop()
      this.localServer = null
    }
  }

  /**
   * Build full URL for API endpoints
   */
  private buildUrl(path: string): string {
    return `${this.baseUrl}/v1/mml-objects/${this.projectId}/object-instances${path}`
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Ensure server is ready for localhost mode
    await this.ensureServerReady()

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorBody = await response.json()
        if (errorBody.message) {
          errorMessage = errorBody.message
        }
      } catch {
        // Use default error message if response is not JSON
      }
      throw new Error(errorMessage)
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null as T
    }

    return response.json()
  }

  /**
   * Create a new MML object instance
   */
  async createMMLObject(
    data: CreateMMLObjectInstanceBody,
  ): Promise<MMLObjectInstance> {
    const url = this.buildUrl("/")
    return this.makeRequest<MMLObjectInstance>(url, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  /**
   * Query/retrieve an MML object by ID
   */
  async getMMLObject(
    instanceId: string,
  ): Promise<GetMMLObjectInstanceResponse> {
    const url = this.buildUrl(`/${instanceId}`)
    return this.makeRequest<GetMMLObjectInstanceResponse>(url, {
      method: "GET",
    })
  }

  /**
   * Update an MML object by ID
   */
  async updateMMLObject(
    instanceId: string,
    updates: UpdateMMLObjectInstanceBody,
  ): Promise<MMLObjectInstance> {
    const url = this.buildUrl(`/${instanceId}`)
    return this.makeRequest<MMLObjectInstance>(url, {
      method: "POST",
      body: JSON.stringify(updates),
    })
  }

  /**
   * Delete an MML object by ID
   */
  async deleteMMLObject(instanceId: string): Promise<void> {
    const url = this.buildUrl(`/${instanceId}`)
    return this.makeRequest<void>(url, {
      method: "DELETE",
    })
  }

  /**
   * List MML objects with optional query parameters
   */
  async listMMLObjects(
    query?: ListMMLObjectInstancesQuery,
  ): Promise<ListMMLObjectInstancesResponse> {
    let url = this.buildUrl("/")

    // Add query parameters if provided
    if (query) {
      const params = new URLSearchParams()
      if (query.offset !== undefined)
        params.set("offset", query.offset.toString())
      if (query.limit !== undefined) params.set("limit", query.limit.toString())
      if (query.search) params.set("search", query.search)

      if (params.toString()) {
        url += `?${params.toString()}`
      }
    }

    return this.makeRequest<ListMMLObjectInstancesResponse>(url, {
      method: "GET",
    })
  }
}

/**
 * Convenience function to create an MML client
 *
 * Note: In localhost mode, this will automatically start a local server.
 * Remember to call client.stop() when done to clean up resources.
 */
export async function createMMLClient(): Promise<MMLClient> {
  const client = new MMLClient()

  // If in localhost mode, ensure server is initialized
  if (!process.env.USE_MSQUARED_APIS) {
    await client["ensureServerReady"]() // Access private method for initialization
  }

  return client
}

/**
 * Export all types for convenience
 */
export type {
  MMLObjectInstance,
  CreateMMLObjectInstanceBody,
  UpdateMMLObjectInstanceBody,
  ListMMLObjectInstancesResponse,
  GetMMLObjectInstanceResponse,
  ListMMLObjectInstancesQuery,
  ServerInfo,
} from "./local-mml-server/types.js"
