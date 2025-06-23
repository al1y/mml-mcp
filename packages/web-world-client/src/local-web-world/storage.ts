import * as fs from "fs"
import * as path from "path"
import {
  WebWorldInstance,
  CreateWorldBody,
  UpdateWorldBody,
  ListWorldsQuery,
} from "./types.js"

export class WebWorldStorage {
  private tempDir: string

  constructor(tempDir: string) {
    this.tempDir = tempDir
    this.ensureDirectoryExists()
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  private getProjectDir(projectId: string): string {
    const projectDir = path.join(this.tempDir, projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }
    return projectDir
  }

  private getWorldPath(projectId: string, worldId: string): string {
    const projectDir = this.getProjectDir(projectId)
    return path.join(projectDir, `${worldId}.json`)
  }

  async createWorld(
    projectId: string,
    id: string,
    data: CreateWorldBody,
  ): Promise<WebWorldInstance> {
    const now = new Date().toISOString()

    // Get the first MML document URL
    const mmlDocs = data.mmlDocumentsConfiguration?.mmlDocuments
    if (!mmlDocs || Object.keys(mmlDocs).length === 0) {
      throw new Error("At least one MML document is required")
    }

    const world: WebWorldInstance = {
      id,
      name: data.name,
      description: data.description,
      generalConfiguration: data.generalConfiguration,
      chatConfiguration: data.chatConfiguration || { enabled: true },
      authConfiguration: data.authConfiguration || { allowAnonymous: true },
      displayNameConfiguration: data.displayNameConfiguration,
      mmlDocumentsConfiguration: data.mmlDocumentsConfiguration!,
      environmentConfiguration: data.environmentConfiguration || {},
      avatarConfiguration: data.avatarConfiguration || {},
      loadingConfiguration: data.loadingConfiguration || {},
      createdAt: now,
      createdBy: {}, // TODO: Implement proper user tracking
      enableTweakPane: data.enableTweakPane,
      allowOrbitalCamera: data.allowOrbitalCamera,
    }

    const worldPath = this.getWorldPath(projectId, id)
    await fs.promises.writeFile(
      worldPath,
      JSON.stringify(world, null, 2),
      "utf-8",
    )

    return world
  }

  async getWorld(
    projectId: string,
    worldId: string,
  ): Promise<WebWorldInstance | null> {
    try {
      const worldPath = this.getWorldPath(projectId, worldId)
      if (!fs.existsSync(worldPath)) {
        return null
      }

      const content = await fs.promises.readFile(worldPath, "utf-8")
      return JSON.parse(content) as WebWorldInstance
    } catch (error) {
      console.error(`Error reading world ${worldId}:`, error)
      return null
    }
  }

  async updateWorld(
    projectId: string,
    worldId: string,
    updates: UpdateWorldBody,
  ): Promise<(WebWorldInstance & { updatedAt: string }) | null> {
    try {
      const existingWorld = await this.getWorld(projectId, worldId)
      if (!existingWorld) {
        return null
      }

      const now = new Date().toISOString()

      // Create updated world by merging changes
      const updatedWorld: WebWorldInstance & { updatedAt: string } = {
        ...existingWorld,
        name: updates.name !== undefined ? updates.name : existingWorld.name,
        description:
          updates.description !== undefined
            ? updates.description
            : existingWorld.description,
        generalConfiguration:
          updates.generalConfiguration !== undefined
            ? updates.generalConfiguration
            : existingWorld.generalConfiguration,
        chatConfiguration:
          updates.chatConfiguration !== undefined
            ? updates.chatConfiguration
            : existingWorld.chatConfiguration,
        authConfiguration:
          updates.authConfiguration !== undefined
            ? updates.authConfiguration
            : existingWorld.authConfiguration,
        displayNameConfiguration:
          updates.displayNameConfiguration !== undefined
            ? updates.displayNameConfiguration
            : existingWorld.displayNameConfiguration,
        mmlDocumentsConfiguration:
          updates.mmlDocumentsConfiguration !== undefined
            ? updates.mmlDocumentsConfiguration
            : existingWorld.mmlDocumentsConfiguration,
        environmentConfiguration:
          updates.environmentConfiguration !== undefined
            ? updates.environmentConfiguration
            : existingWorld.environmentConfiguration,
        avatarConfiguration:
          updates.avatarConfiguration !== undefined
            ? updates.avatarConfiguration
            : existingWorld.avatarConfiguration,
        loadingConfiguration:
          updates.loadingConfiguration !== undefined
            ? updates.loadingConfiguration
            : existingWorld.loadingConfiguration,
        enableTweakPane:
          updates.enableTweakPane !== undefined
            ? updates.enableTweakPane
            : existingWorld.enableTweakPane,
        allowOrbitalCamera:
          updates.allowOrbitalCamera !== undefined
            ? updates.allowOrbitalCamera
            : existingWorld.allowOrbitalCamera,
        updatedAt: now,
      }

      const worldPath = this.getWorldPath(projectId, worldId)
      await fs.promises.writeFile(
        worldPath,
        JSON.stringify(updatedWorld, null, 2),
        "utf-8",
      )

      return updatedWorld
    } catch (error) {
      console.error(`Error updating world ${worldId}:`, error)
      return null
    }
  }

  async deleteWorld(projectId: string, worldId: string): Promise<boolean> {
    try {
      const worldPath = this.getWorldPath(projectId, worldId)
      if (!fs.existsSync(worldPath)) {
        return false
      }

      await fs.promises.unlink(worldPath)
      return true
    } catch (error) {
      console.error(`Error deleting world ${worldId}:`, error)
      return false
    }
  }

  async listWorlds(
    projectId: string,
    query: ListWorldsQuery,
  ): Promise<{ worlds: WebWorldInstance[]; totalResults: number }> {
    try {
      const projectDir = this.getProjectDir(projectId)
      const files = await fs.promises.readdir(projectDir)
      const worldFiles = files.filter((file) => file.endsWith(".json"))

      let worlds: WebWorldInstance[] = []

      for (const file of worldFiles) {
        try {
          const filePath = path.join(projectDir, file)
          const content = await fs.promises.readFile(filePath, "utf-8")
          const world = JSON.parse(content) as WebWorldInstance
          worlds.push(world)
        } catch (error) {
          console.error(`Error reading world file ${file}:`, error)
        }
      }

      // Apply search filter if provided
      if (query.search) {
        const searchLower = query.search.toLowerCase()
        worlds = worlds.filter(
          (world) =>
            world.name.toLowerCase().includes(searchLower) ||
            (world.description &&
              world.description.toLowerCase().includes(searchLower)),
        )
      }

      // Sort by creation date (newest first)
      worlds.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      const totalResults = worlds.length
      const offset = query.offset || 0
      const limit = Math.min(query.limit || 100, 100)

      // Apply pagination
      const paginatedWorlds = worlds.slice(offset, offset + limit)

      return { worlds: paginatedWorlds, totalResults }
    } catch (error) {
      console.error(`Error listing worlds for project ${projectId}:`, error)
      return { worlds: [], totalResults: 0 }
    }
  }

  getMmlFilePath(projectId: string, worldId: string): string | null {
    const world = this.getWorldSync(projectId, worldId)
    if (!world) {
      return null
    }

    const mmlDocs = world.mmlDocumentsConfiguration?.mmlDocuments
    if (!mmlDocs || Object.keys(mmlDocs).length === 0) {
      return null
    }

    // Return the URL of the first MML document
    return Object.values(mmlDocs)[0].url
  }

  private getWorldSync(
    projectId: string,
    worldId: string,
  ): WebWorldInstance | null {
    try {
      const worldPath = this.getWorldPath(projectId, worldId)
      if (!fs.existsSync(worldPath)) {
        return null
      }

      const content = fs.readFileSync(worldPath, "utf-8")
      return JSON.parse(content) as WebWorldInstance
    } catch (error) {
      console.error(`Error reading world ${worldId}:`, error)
      return null
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        await fs.promises.rm(this.tempDir, { recursive: true, force: true })
      }
    } catch (error) {
      console.error("Error cleaning up web world storage:", error)
      throw error
    }
  }
}
