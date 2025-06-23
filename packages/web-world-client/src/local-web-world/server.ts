import express from "express"
import * as http from "http"
import * as path from "path"
import * as os from "os"
import * as fs from "fs"
import { fileURLToPath } from "url"
import WebSocket from "ws"
import { WebWorldStorage } from "./storage.js"
import {
  ServerInfo,
  CreateWorldBody,
  UpdateWorldBody,
  ErrorResponse,
  WebWorldsTier,
  GetWorldResponse,
  WorldMMLDocumentsConfiguration,
} from "./types.js"
import { getRandomPort, LOCAL_PROJECT_ID } from "@mml-mcp/shared"
import { randomUUID } from "crypto"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class WebWorldServer {
  private app: express.Application
  private server: http.Server | null = null
  private mmlWebSocketConnections: Map<string, WebSocket> = new Map()
  private storage: WebWorldStorage
  private tempDir: string
  private buildDir: string
  private mmlContent: string
  private gameServerUrl?: string

  constructor() {
    this.mmlContent = ""

    this.app = express()
    this.tempDir = path.join(os.tmpdir(), `web-world-server-${Date.now()}`)
    this.storage = new WebWorldStorage(this.tempDir)

    // Set up game client build directory
    // Find the monorepo root by looking for package.json with workspaces
    let monorepoRoot = process.cwd()
    while (monorepoRoot !== path.dirname(monorepoRoot)) {
      const packageJsonPath = path.join(monorepoRoot, "package.json")
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
        if (packageJson.workspaces) {
          break // Found the monorepo root
        }
      }
      monorepoRoot = path.dirname(monorepoRoot)
    }

    const gameClientBuildPath = path.resolve(
      monorepoRoot,
      "apps/game-client/build",
    )
    const isDevelopment =
      process.env.NODE_ENV !== "production" &&
      fs.existsSync(gameClientBuildPath)

    if (isDevelopment) {
      // Development: use the game client build from the monorepo root
      this.buildDir = gameClientBuildPath
    } else {
      // Production: the game build should be bundled with the package
      this.buildDir = path.resolve(__dirname, "../../game-client")

      // Fallback to apps/game-client/build if the above doesn't exist
      if (!fs.existsSync(this.buildDir)) {
        this.buildDir = gameClientBuildPath
      }
    }

    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(express.json())

    // CORS headers
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*")
      res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Origin, X-Requested-With, Accept",
      )
      if (req.method === "OPTIONS") {
        res.sendStatus(200)
      } else {
        next()
      }
    })

    // Request logging
    this.app.use((req, res, next) => {
      if (!req.path.startsWith("/game")) {
        console.log(`${req.method} ${req.path}`)
      }
      next()
    })
  }

  private getDefaultTier(): WebWorldsTier {
    return {
      name: "web-worlds-free-tier",
      maxWorlds: 100,
      features: ["Unlimited MML", "Local Testing", "Fast Iteration"],
    }
  }

  private setupRoutes(): void {
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "Local Web World Server",
        tempDir: this.tempDir,
      })
    })

    this.app.get("/mml-websocket-url", async (req, res) => {
      try {
        const worldId = req.query.id as string
        if (!worldId) {
          res.status(400).send("World ID is required")
          return
        }

        const world = await this.storage.getWorld(LOCAL_PROJECT_ID, worldId)
        if (!world) {
          res.status(404).send("World not found")
          return
        }

        const websocketUrl = this.extractWebSocketUrlFromMMLDocs(
          world.mmlDocumentsConfiguration,
        )
        if (!websocketUrl) {
          res.status(404).send("MML document URL is not a WebSocket URL")
          return
        }

        res.setHeader("Content-Type", "text/plain")
        res.send(websocketUrl)
      } catch (error) {
        console.error("Error serving MML file:", error)
        res.status(500).send("Error loading MML file")
      }
    })

    this.app.get("/game/apps/game-client/assets/*", (req, res) => {
      const assetPath = req.path.replace("/game/", "")
      const fullAssetPath = path.join(this.buildDir, assetPath)

      if (fs.existsSync(fullAssetPath)) {
        res.sendFile(fullAssetPath)
      } else {
        console.error(`Asset not found: ${fullAssetPath}`)
        res.status(404).send("Asset not found")
      }
    })

    this.app.use(
      "/game",
      express.static(this.buildDir, {
        index: "index.html",
        fallthrough: true,
      }),
    )

    this.app.get("/game/*", (req, res) => {
      const indexPath = path.join(this.buildDir, "index.html")
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
      } else {
        res.status(404).send("Game not found")
      }
    })

    this.app.get(
      "/v1/worlds/:projectId/web-world-instances/",
      async (req, res) => {
        try {
          const query = {
            search: req.query.search as string,
            offset: req.query.offset
              ? parseInt(req.query.offset as string)
              : undefined,
            limit: req.query.limit
              ? parseInt(req.query.limit as string)
              : undefined,
          }

          const result = await this.storage.listWorlds(LOCAL_PROJECT_ID, query)

          const response = {
            ...result,
            offset: query.offset || 0,
            limit: query.limit || 100,
            canWrite: true,
            tier: this.getDefaultTier(),
          }

          res.json(response)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    this.app.post(
      "/v1/worlds/:projectId/web-world-instances/",
      async (req, res) => {
        try {
          const body: CreateWorldBody = req.body
          if (!body.name || !body.mmlDocumentsConfiguration?.mmlDocuments) {
            return this.sendError(
              res,
              400,
              "VALIDATION_ERROR",
              "Name and MML Documents are required",
            )
          }

          const id = randomUUID()

          console.log("Created new web world instance")
          console.log(`${this.getGameUrl()}?id=${id}`)

          const websocketUrl = this.extractWebSocketUrlFromMMLDocs(
            body.mmlDocumentsConfiguration,
          )
          if (!websocketUrl) {
            return this.sendError(
              res,
              400,
              "VALIDATION_ERROR",
              "MML document URL is not a WebSocket URL",
            )
          }

          const world = await this.storage.createWorld(
            LOCAL_PROJECT_ID,
            id,
            body,
          )

          res.json(world)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    this.app.get(
      "/v1/worlds/:projectId/web-world-instances/:worldId",
      async (req, res) => {
        try {
          const { worldId } = req.params

          const world = await this.storage.getWorld(LOCAL_PROJECT_ID, worldId)
          if (!world) {
            return this.sendError(
              res,
              404,
              "NOT_FOUND",
              "Web World Instance not found",
            )
          }

          const response: GetWorldResponse = {
            ...world,
            canWrite: true,
            tier: this.getDefaultTier(),
          }

          res.json(response)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    this.app.post(
      "/v1/worlds/:projectId/web-world-instances/:worldId",
      async (req, res) => {
        try {
          const { worldId } = req.params
          const body: UpdateWorldBody = req.body

          const updatedWorld = await this.storage.updateWorld(
            LOCAL_PROJECT_ID,
            worldId,
            body,
          )
          if (!updatedWorld) {
            return this.sendError(
              res,
              404,
              "NOT_FOUND",
              "Web World Instance not found",
            )
          }

          res.json(updatedWorld)
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    // Delete Web World Instance
    this.app.delete(
      "/v1/worlds/:projectId/web-world-instances/:worldId",
      async (req, res) => {
        try {
          const { worldId } = req.params
          const deleted = await this.storage.deleteWorld(
            LOCAL_PROJECT_ID,
            worldId,
          )

          if (!deleted) {
            return this.sendError(
              res,
              404,
              "NOT_FOUND",
              "Web World Instance not found",
            )
          }

          res.status(204).send()
        } catch (error) {
          this.handleError(res, error)
        }
      },
    )

    // Redirect root to /game
    this.app.get("/", (req, res) => {
      res.redirect("/game")
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

  private async updateGameServerWorld(
    worldId: string,
    mmlContent: string,
  ): Promise<void> {
    try {
      const worldMmlPath = path.join(this.tempDir, `world-${worldId}.mml`)
      await fs.promises.writeFile(worldMmlPath, mmlContent, "utf-8")

      // Set the current MML file to this world's file
      this.mmlContent = worldMmlPath
    } catch (error) {
      console.error("Error updating game server world:", error)
    }
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

  private extractWebSocketUrlFromMMLDocs(
    mmlDocumentsConfiguration: WorldMMLDocumentsConfiguration,
  ): string | null {
    if (!mmlDocumentsConfiguration?.mmlDocuments) {
      return null
    }

    const mmlDocs = Object.values(
      mmlDocumentsConfiguration.mmlDocuments as Record<string, unknown>,
    )
    if (mmlDocs.length === 0) {
      return null
    }

    // Look for a WebSocket URL in the first MML document
    const firstDoc = mmlDocs[0] as Record<string, unknown>
    if (firstDoc.websocketUrl && typeof firstDoc.websocketUrl === "string") {
      return firstDoc.websocketUrl
    }

    // If no explicit websocketUrl, try to derive it from the URL
    if (firstDoc.url && typeof firstDoc.url === "string") {
      if (!firstDoc.url.startsWith("ws")) {
        console.error(
          `MML document URL is not a WebSocket URL: ${firstDoc.url}`,
        )
        return null
      }
      return firstDoc.url
    }

    return null
  }

  async start(port: number): Promise<ServerInfo> {
    return new Promise((resolve, reject) => {
      const startServer = async () => {
        try {
          // Ensure build directory exists for the game client
          if (!fs.existsSync(this.buildDir)) {
            reject(
              new Error(
                `Build directory not found: ${this.buildDir}. Please build the app first.`,
              ),
            )
            return
          }

          // Check if index.html exists
          const indexPath = path.join(this.buildDir, "index.html")
          if (!fs.existsSync(indexPath)) {
            reject(
              new Error(
                `index.html not found in build directory: ${this.buildDir}`,
              ),
            )
            return
          }

          // Start the server
          this.server = this.app.listen(port, () => {
            const address = this.server!.address()
            if (!address || typeof address === "string") {
              reject(new Error("Failed to get server address"))
              return
            }

            const actualPort = address.port
            const url = `http://localhost:${actualPort}`
            this.gameServerUrl = url

            // Web world server is now ready - WebSocket connections will be established when worlds are created

            resolve({
              url,
              port: actualPort,
              tempDir: this.tempDir,
              gameServerUrl: this.gameServerUrl,
              stop: this.stop.bind(this),
            })
          })

          this.server.on("error", (error: unknown) => {
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "EADDRINUSE"
            ) {
              console.error(
                `Port ${port} is already in use. Please try a different port.`,
              )
            }
            reject(error)
          })
        } catch (error) {
          reject(error)
        }
      }

      startServer()
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      const stopServer = async () => {
        try {
          // Close all MML WebSocket connections
          this.mmlWebSocketConnections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close()
            }
          })
          this.mmlWebSocketConnections.clear()

          if (!this.server) {
            resolve()
            return
          }

          this.server.close(async (err) => {
            if (err) {
              reject(err)
              return
            }

            try {
              await this.storage.cleanup()
              console.log(
                `Web World Server stopped and temp directory cleaned up: ${this.tempDir}`,
              )
              resolve()
            } catch (cleanupError) {
              console.warn("Failed to cleanup temp directory:", cleanupError)
              resolve() // Don't fail the stop operation due to cleanup issues
            }
          })
        } catch (error) {
          reject(error)
        }
      }

      stopServer()
    })
  }

  public getPort(): number {
    const address = this.server?.address()
    if (address && typeof address !== "string") {
      return address.port
    }
    return 0
  }

  public getBaseUrl(): string {
    return this.gameServerUrl || ""
  }

  public getGameUrl(): string {
    return `${this.getBaseUrl()}/game`
  }
}

// Factory function to create and start a server
export async function createWebWorldServer(): Promise<ServerInfo> {
  const server = new WebWorldServer()
  const port = await getRandomPort()
  return await server.start(port)
}
