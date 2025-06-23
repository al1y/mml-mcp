// Web Worlds API Client
// Wrapper for hitting Web World API endpoints, supporting both localhost and M² cloud APIs

import {
  WebWorldInstance,
  CreateWorldBody,
  UpdateWorldBody,
  ListWorldsResponse,
  GetWorldResponse,
  ListWorldsQuery,
  ServerInfo,
} from "./local-web-world/types.js"
import { createWebWorldServer } from "./local-web-world/index.js"
import { LOCAL_PROJECT_ID } from "@mml-mcp/shared"

/**
 * API Client for Web Worlds
 *
 * Supports both localhost development server and M² cloud APIs.
 * Switch between modes using the USE_MSQUARED_APIS environment variable.
 *
 * In localhost mode, automatically creates and manages a local server with game client.
 * In M² mode, uses https://api.msquared.io and gets API key from MSQUARED_API_KEY env var.
 */
export class WebWorldClient {
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
   * Get the base URL for the Web World client
   */
  getUrl(): string {
    return this.baseUrl
  }

  /**
   * Initialize the local server (called automatically in localhost mode)
   */
  private async initializeLocalServer(): Promise<void> {
    try {
      console.log("🌍 Initializing local Web World server")
      this.localServer = await createWebWorldServer()
      this.baseUrl = this.localServer.url
    } catch (error) {
      throw new Error(
        `Failed to start local Web World server: ${(error as Error).message}`,
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
    return `${this.baseUrl}/v1/worlds/${this.projectId}/web-world-instances${path}`
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
   * Create a new web world instance
   */
  async createWebWorld(
    data: CreateWorldBody,
  ): Promise<WebWorldInstance & { url: string }> {
    const url = this.buildUrl("/")
    const webWorldInstance = await this.makeRequest<WebWorldInstance>(url, {
      method: "POST",
      body: JSON.stringify(data),
    })

    // Ensure server is ready and get game URL
    let gameUrl = ""
    if (this.isLocalhostMode) {
      await this.ensureServerReady()
      if (this.localServer && this.localServer.gameServerUrl) {
        gameUrl = `${this.localServer.gameServerUrl}/game?id=${webWorldInstance.id}`
      }
    }

    // Return the full world instance with the game URL added
    return {
      ...webWorldInstance,
      url: gameUrl,
    }
  }

  /**
   * Query/retrieve a web world by ID
   */
  async getWebWorld(worldId: string): Promise<GetWorldResponse> {
    const url = this.buildUrl(`/${worldId}`)
    return this.makeRequest<GetWorldResponse>(url, {
      method: "GET",
    })
  }

  /**
   * Update a web world by ID
   */
  async updateWebWorld(
    worldId: string,
    updates: UpdateWorldBody,
  ): Promise<WebWorldInstance & { updatedAt: string }> {
    const url = this.buildUrl(`/${worldId}`)
    return this.makeRequest<WebWorldInstance & { updatedAt: string }>(url, {
      method: "POST",
      body: JSON.stringify(updates),
    })
  }

  /**
   * Delete a web world by ID
   */
  async deleteWebWorld(worldId: string): Promise<void> {
    const url = this.buildUrl(`/${worldId}`)
    return this.makeRequest<void>(url, {
      method: "DELETE",
    })
  }

  /**
   * List web worlds with optional query parameters
   */
  async listWebWorlds(query?: ListWorldsQuery): Promise<ListWorldsResponse> {
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

    return this.makeRequest<ListWorldsResponse>(url, {
      method: "GET",
    })
  }
}

/**
 * Convenience function to create a Web World client
 *
 * Note: In localhost mode, this will automatically start a local server with game client.
 * Remember to call client.stop() when done to clean up resources.
 */
export async function createWebWorldClient(): Promise<WebWorldClient> {
  const client = new WebWorldClient()

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
  WebWorldInstance,
  CreateWorldBody,
  UpdateWorldBody,
  ListWorldsResponse,
  GetWorldResponse,
  ListWorldsQuery,
  ServerInfo,
} from "./local-web-world/types.js"
