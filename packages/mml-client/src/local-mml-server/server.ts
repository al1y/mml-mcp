import express from "express"
import * as http from "http"
import * as os from "os"
import * as path from "path"
import { randomUUID } from "crypto"
import WebSocket, { WebSocketServer } from "ws"
import { MMLObjectStorage } from "./storage.js"
import {
  ServerInfo,
  ErrorResponse,
  CreateMMLObjectInstanceBody,
  UpdateMMLObjectInstanceBody,
} from "./types.js"

export class MMLObjectServer {
  private app: express.Application
  private server: http.Server | null = null
  private wss: WebSocketServer | null = null
  private instanceConnections: Map<string, Set<WebSocket>> = new Map()
  private storage: MMLObjectStorage
  private tempDir: string

  constructor() {
    this.app = express()
    this.tempDir = path.join(os.tmpdir(), `mml-objects-${randomUUID()}`)
    this.storage = new MMLObjectStorage(this.tempDir)
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(express.json())

    // CORS headers
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*")
      res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
      if (req.method === "OPTIONS") {
        res.sendStatus(200)
      } else {
        next()
      }
    })

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`)
      next()
    })
  }

  private setupRoutes(): void {
    // Create MML Object Instance
    this.app.post(
      "/v1/mml-objects/:projectId/object-instances/",
      async (req, res) => {
        try {
          const { projectId } = req.params

          const body: CreateMMLObjectInstanceBody = req.body
          if (!body.name || !body.source) {
            return this.sendError(
              res,
              400,
              "VALIDATION_ERROR",
              "Name and source are required",
            )
          }

          const id = body.id || randomUUID()

          const address = this.server!.address()
          const port =
            address && typeof address !== "string" ? address.port : undefined
          if (!port) {
            return this.sendError(
              res,
              500,
              "INTERNAL_ERROR",
              "Failed to get server port",
            )
          }

          const websocketUrl = `ws://localhost:${port}/ws/${projectId}/${id}`

          const instance = await this.storage.createInstance(
            projectId,
            id,
            body,
            websocketUrl,
          )

          res.json(instance)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    // Get MML Object Instance
    this.app.get(
      "/v1/mml-objects/:projectId/object-instances/:instanceId",
      async (req, res) => {
        try {
          const { projectId, instanceId } = req.params

          const instance = await this.storage.getInstance(projectId, instanceId)
          if (!instance) {
            return this.sendError(
              res,
              404,
              "NOT_FOUND",
              "MML Object Instance not found",
            )
          }

          res.json(instance)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    // Update MML Object Instance
    this.app.post(
      "/v1/mml-objects/:projectId/object-instances/:instanceId",
      async (req, res) => {
        try {
          const { projectId, instanceId } = req.params
          const updates: UpdateMMLObjectInstanceBody = req.body

          const instance = await this.storage.updateInstance(
            projectId,
            instanceId,
            updates,
          )
          if (!instance) {
            return this.sendError(
              res,
              404,
              "NOT_FOUND",
              "MML Object Instance not found",
            )
          }

          // Broadcast MML update to connected WebSocket clients if source was updated
          if (updates.source) {
            this.broadcastMmlUpdate(
              projectId,
              instanceId,
              updates.source.source,
            )
          }

          res.json(instance)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    // List MML Object Instances
    this.app.get(
      "/v1/mml-objects/:projectId/object-instances/",
      async (req, res) => {
        try {
          const { projectId } = req.params
          const query = req.query as Record<string, unknown> // Type assertion for query parameters

          const result = await this.storage.listInstances(projectId, query)
          res.json(result)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    // Delete MML Object Instance
    this.app.delete(
      "/v1/mml-objects/:projectId/object-instances/:instanceId",
      async (req, res) => {
        try {
          const { projectId, instanceId } = req.params
          const deleted = await this.storage.deleteInstance(
            projectId,
            instanceId,
          )

          if (!deleted) {
            return this.sendError(
              res,
              404,
              "NOT_FOUND",
              "MML Object Instance not found",
            )
          }

          // Close and cleanup WebSocket connections for this instance
          const connectionKey = `${projectId}/${instanceId}`
          const connections = this.instanceConnections.get(connectionKey)
          if (connections) {
            connections.forEach((wsConnection) => {
              if (wsConnection.readyState === WebSocket.OPEN) {
                wsConnection.close(1000, "Instance deleted")
              }
            })
            this.instanceConnections.delete(connectionKey)
            console.log(
              `Closed ${connections.size} WebSocket connections for deleted instance ${connectionKey}`,
            )
          }

          res.status(204).send()
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", tempDir: this.tempDir })
    })

    // 404 handler
    this.app.use("*", (req, res) => {
      this.sendError(
        res,
        404,
        "NOT_FOUND",
        `Endpoint not found: ${req.method} ${req.originalUrl}`,
      )
    })
  }

  private sendError(
    res: express.Response,
    statusCode: number,
    code: string,
    message: string,
  ): void {
    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
      },
    }
    res.status(statusCode).json(errorResponse)
  }

  private handleError(res: express.Response, error: unknown): void {
    console.error("Server error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    this.sendError(res, 500, "INTERNAL_ERROR", message)
  }

  private setupWebSocketServer(): void {
    if (!this.server) return

    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on(
      "connection",
      (wsConnection: WebSocket, request: http.IncomingMessage) => {
        const url = new URL(request.url!, `http://${request.headers.host}`)
        const pathParts = url.pathname.split("/")

        // Only handle WebSocket connections to /ws/* paths
        if (pathParts[1] !== "ws") {
          wsConnection.close(
            1008,
            "Invalid WebSocket path. Only /ws/* paths are supported",
          )
          return
        }

        // Expect path like /ws/{projectId}/{instanceId}
        if (pathParts.length < 4) {
          wsConnection.close(
            1008,
            "Invalid WebSocket path. Expected /ws/{projectId}/{instanceId}",
          )
          return
        }

        const projectId = pathParts[2]
        const instanceId = pathParts[3]

        // Get MML source content for the instance
        const mmlSource = this.storage.getMmlSource(projectId, instanceId)
        if (!mmlSource) {
          wsConnection.close(1008, "MML Object Instance not found")
          return
        }

        // Add connection to instance connections map
        const connectionKey = `${projectId}/${instanceId}`
        if (!this.instanceConnections.has(connectionKey)) {
          this.instanceConnections.set(connectionKey, new Set())
        }
        this.instanceConnections.get(connectionKey)!.add(wsConnection)

        // Send initial MML source content
        wsConnection.send(
          JSON.stringify({
            type: "mml_source",
            source: mmlSource,
          }),
        )

        console.log(`Received connection. Length: ${mmlSource.length}`)

        // Handle disconnection
        wsConnection.on("close", () => {
          const connections = this.instanceConnections.get(connectionKey)
          if (connections) {
            connections.delete(wsConnection)
            if (connections.size === 0) {
              this.instanceConnections.delete(connectionKey)
            }
          }
          console.log(`WS closed - ${connectionKey}`)
        })

        wsConnection.on("error", (error: Error) => {
          console.error(`WebSocket error for instance ${connectionKey}:`, error)
        })
      },
    )
  }

  private broadcastMmlUpdate(
    projectId: string,
    instanceId: string,
    mmlSource: string,
  ): void {
    const connectionKey = `${projectId}/${instanceId}`
    const connections = this.instanceConnections.get(connectionKey)
    if (!connections || connections.size === 0) {
      return
    }

    const message = JSON.stringify({
      type: "mml_updated",
      source: mmlSource,
    })

    connections.forEach((wsConnection) => {
      if (wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(message)
      }
    })

    console.log(`Sent MML update (${connectionKey})`)
  }

  async start(port: number = 0): Promise<ServerInfo> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        const address = this.server!.address()
        if (!address || typeof address === "string") {
          reject(new Error("Failed to get server address"))
          return
        }

        const actualPort = address.port
        const url = `http://localhost:${actualPort}`

        // Setup WebSocket server after HTTP server is running
        this.setupWebSocketServer()

        resolve({
          url,
          port: actualPort,
          tempDir: this.tempDir,
          stop: this.stop.bind(this),
        })
      })

      this.server.on("error", reject)
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      const closeWebSocketServer = () => {
        return new Promise<void>((wsResolve) => {
          // Close all WebSocket connections first
          this.instanceConnections.forEach((connections) => {
            connections.forEach((wsConnection) => {
              if (wsConnection.readyState === WebSocket.OPEN) {
                wsConnection.close()
              }
            })
          })
          this.instanceConnections.clear()

          if (this.wss) {
            this.wss.close(() => {
              console.log("WebSocket server closed")
              this.wss = null
              wsResolve()
            })
          } else {
            wsResolve()
          }
        })
      }

      const closeHttpServer = () => {
        return new Promise<void>((httpResolve, httpReject) => {
          if (!this.server) {
            httpResolve()
            return
          }

          this.server.close(async (err) => {
            if (err) {
              httpReject(err)
              return
            }

            try {
              await this.storage.cleanup()
              console.log(`Cleaned up: ${this.tempDir}`)
              httpResolve()
            } catch (cleanupError) {
              console.warn("Failed to cleanup temp directory:", cleanupError)
              httpResolve() // Don't fail the stop operation due to cleanup issues
            }
          })
        })
      }

      // First close WebSocket server, then HTTP server
      closeWebSocketServer()
        .then(() => closeHttpServer())
        .then(() => resolve())
        .catch(reject)
    })
  }
}

// Factory function to create and start a server
export async function createMMLObjectServer(): Promise<ServerInfo> {
  const server = new MMLObjectServer()
  return await server.start()
}
