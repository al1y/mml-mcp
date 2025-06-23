import * as fs from "fs"
import * as path from "path"
// import { randomUUID } from "crypto"
import {
  MMLObjectInstance,
  CreateMMLObjectInstanceBody,
  UpdateMMLObjectInstanceBody,
  ListMMLObjectInstancesQuery,
  ListMMLObjectInstancesResponse,
  GetMMLObjectInstanceResponse,
} from "./types.js"

export class MMLObjectStorage {
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

  private getInstancePath(projectId: string, instanceId: string): string {
    return path.join(this.getProjectDir(projectId), `${instanceId}.json`)
  }

  async createInstance(
    projectId: string,
    id: string,
    data: CreateMMLObjectInstanceBody,
    websocketUrl: string,
  ): Promise<MMLObjectInstance> {
    const now = new Date().toISOString()

    const instance: MMLObjectInstance = {
      id,
      name: data.name,
      description: data.description,
      url: websocketUrl,
      enabled: data.enabled ?? true,
      source: data.source,
      parameters: {},
      createdAt: now,
      createdBy: { id: "system", type: "user" }, // Default user for local storage
    }

    const instancePath = this.getInstancePath(projectId, id)
    await fs.promises.writeFile(
      instancePath,
      JSON.stringify(instance, null, 2),
      "utf-8",
    )

    console.log("Created new MML Object", id)
    console.log(instancePath)

    return instance
  }

  async getInstance(
    projectId: string,
    instanceId: string,
  ): Promise<GetMMLObjectInstanceResponse | null> {
    const instancePath = this.getInstancePath(projectId, instanceId)

    try {
      const data = await fs.promises.readFile(instancePath, "utf-8")
      const instance = JSON.parse(data) as MMLObjectInstance

      // Return GetMMLObjectInstanceResponse with canWrite field
      return {
        ...instance,
        canWrite: true, // Default to true for local storage
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null
      }
      throw error
    }
  }

  async updateInstance(
    projectId: string,
    instanceId: string,
    updates: UpdateMMLObjectInstanceBody,
  ): Promise<MMLObjectInstance | null> {
    const instance = await this.getInstance(projectId, instanceId)
    if (!instance) {
      return null
    }

    const now = new Date().toISOString()
    const updatedInstance: MMLObjectInstance = {
      ...instance,
      ...updates,
      updatedAt: now,
    }

    const instancePath = this.getInstancePath(projectId, instanceId)
    await fs.promises.writeFile(
      instancePath,
      JSON.stringify(updatedInstance, null, 2),
      "utf-8",
    )

    return updatedInstance
  }

  async deleteInstance(
    projectId: string,
    instanceId: string,
  ): Promise<boolean> {
    const instancePath = this.getInstancePath(projectId, instanceId)

    try {
      await fs.promises.unlink(instancePath)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false
      }
      throw error
    }
  }

  async listInstances(
    projectId: string,
    query: ListMMLObjectInstancesQuery = {},
  ): Promise<ListMMLObjectInstancesResponse> {
    const projectDir = this.getProjectDir(projectId)

    try {
      const files = await fs.promises.readdir(projectDir)
      const jsonFiles = files.filter((file) => file.endsWith(".json"))

      const instances: MMLObjectInstance[] = []

      for (const file of jsonFiles) {
        try {
          const data = await fs.promises.readFile(
            path.join(projectDir, file),
            "utf-8",
          )
          const instance = JSON.parse(data) as MMLObjectInstance
          instances.push(instance)
        } catch (error) {
          console.warn(`Failed to read instance file ${file}:`, error)
        }
      }

      // Apply search filter if provided
      let filteredInstances = instances
      if (query.search) {
        const searchTerm = query.search.toLowerCase()
        filteredInstances = instances.filter(
          (instance) =>
            instance.name.toLowerCase().includes(searchTerm) ||
            instance.description?.toLowerCase().includes(searchTerm) ||
            instance.source.source.toLowerCase().includes(searchTerm),
        )
      }

      // Sort by creation date (newest first)
      filteredInstances.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      const totalResults = filteredInstances.length

      // Apply pagination
      const offset = query.offset || 0
      const limit = Math.min(query.limit || 100, 100) // Max 100 items
      const paginatedInstances = filteredInstances.slice(offset, offset + limit)

      return {
        objects: paginatedInstances, // Changed from 'instances' to 'objects'
        totalResults,
        offset,
        limit,
        canWrite: true, // Default to true for local storage
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          objects: [],
          totalResults: 0,
          offset: query.offset || 0,
          limit: Math.min(query.limit || 100, 100),
          canWrite: true,
        }
      }
      throw error
    }
  }

  getMmlSource(projectId: string, instanceId: string): string | null {
    const instance = this.getInstanceSync(projectId, instanceId)
    return instance?.source.source || null
  }

  private getInstanceSync(
    projectId: string,
    instanceId: string,
  ): MMLObjectInstance | null {
    try {
      const instancePath = this.getInstancePath(projectId, instanceId)
      if (!fs.existsSync(instancePath)) {
        return null
      }

      const content = fs.readFileSync(instancePath, "utf-8")
      return JSON.parse(content) as MMLObjectInstance
    } catch (error) {
      console.error(`Error reading instance ${instanceId}:`, error)
      return null
    }
  }

  async cleanup(): Promise<void> {
    if (fs.existsSync(this.tempDir)) {
      await fs.promises.rm(this.tempDir, { recursive: true, force: true })
    }
  }
}
