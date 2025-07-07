import React, { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { Badge } from "./ui/badge"
import { RefreshCw, Server, Users, Eye, Settings } from "lucide-react"

interface McpHealthStatus {
  status: string
  transport: string
  specification: string
  timestamp: string
  message: string
  sessions: {
    active: number
    ids: string[]
  }
  endpoints: {
    health: string
    main: string
    test: string
  }
}

interface McpRequest {
  id: string
  method: string
  params: any
  timestamp: Date
}

interface McpResponse {
  id: string
  result?: any
  error?: any
  timestamp: Date
}

export default function McpClient() {
  const [health, setHealth] = useState<McpHealthStatus | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [requests, setRequests] = useState<McpRequest[]>([])
  const [responses, setResponses] = useState<McpResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  // Check health status
  const checkHealth = async () => {
    try {
      setLastError(null)
      const response = await fetch("/api/mcp/health")
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      console.error("Failed to check health:", error)
      setLastError(
        error instanceof Error ? error.message : "Health check failed",
      )
    }
  }

  // Initialize MCP session
  const initializeSession = async () => {
    setIsLoading(true)
    setLastError(null)
    try {
      const requestId = Date.now().toString()
      const initRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {
            roots: {
              listChanged: true,
            },
          },
          clientInfo: {
            name: "MML MCP Web Client",
            version: "1.0.0",
          },
        },
      }

      const request: McpRequest = {
        id: requestId,
        method: "initialize",
        params: initRequest.params,
        timestamp: new Date(),
      }
      setRequests((prev) => [...prev, request])

      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initRequest),
      })

      if (!response.ok) {
        throw new Error(`Initialize failed: ${response.status}`)
      }

      const responseData = await response.json()
      const newSessionId = response.headers.get("Mcp-Session-Id")

      if (newSessionId) {
        setSessionId(newSessionId)
      }

      const mcpResponse: McpResponse = {
        id: requestId,
        result: responseData.result,
        error: responseData.error,
        timestamp: new Date(),
      }
      setResponses((prev) => [...prev, mcpResponse])

      await checkHealth()
    } catch (error) {
      console.error("Failed to initialize session:", error)
      setLastError(error instanceof Error ? error.message : "Initialize failed")
    } finally {
      setIsLoading(false)
    }
  }

  // List available tools
  const listTools = async () => {
    if (!sessionId) {
      setLastError("No active session")
      return
    }

    setIsLoading(true)
    setLastError(null)
    try {
      const requestId = Date.now().toString()
      const toolsRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/list",
        params: {},
      }

      const request: McpRequest = {
        id: requestId,
        method: "tools/list",
        params: {},
        timestamp: new Date(),
      }
      setRequests((prev) => [...prev, request])

      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify(toolsRequest),
      })

      if (!response.ok) {
        throw new Error(`List tools failed: ${response.status}`)
      }

      const responseData = await response.json()

      const mcpResponse: McpResponse = {
        id: requestId,
        result: responseData.result,
        error: responseData.error,
        timestamp: new Date(),
      }
      setResponses((prev) => [...prev, mcpResponse])
    } catch (error) {
      console.error("Failed to list tools:", error)
      setLastError(error instanceof Error ? error.message : "List tools failed")
    } finally {
      setIsLoading(false)
    }
  }

  // Create a demo world
  const createDemoWorld = async () => {
    if (!sessionId) {
      setLastError("No active session")
      return
    }

    setIsLoading(true)
    setLastError(null)
    try {
      const requestId = Date.now().toString()
      const createWorldRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: "create-world",
          arguments: {
            title: "Demo World from Next.js",
          },
        },
      }

      const request: McpRequest = {
        id: requestId,
        method: "tools/call",
        params: createWorldRequest.params,
        timestamp: new Date(),
      }
      setRequests((prev) => [...prev, request])

      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify(createWorldRequest),
      })

      if (!response.ok) {
        throw new Error(`Create world failed: ${response.status}`)
      }

      const responseData = await response.json()

      const mcpResponse: McpResponse = {
        id: requestId,
        result: responseData.result,
        error: responseData.error,
        timestamp: new Date(),
      }
      setResponses((prev) => [...prev, mcpResponse])
    } catch (error) {
      console.error("Failed to create demo world:", error)
      setLastError(
        error instanceof Error ? error.message : "Create world failed",
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Test MCP info endpoint
  const testMcpInfo = async () => {
    if (!sessionId) {
      setLastError("No active session")
      return
    }

    setIsLoading(true)
    setLastError(null)
    try {
      const requestId = Date.now().toString()
      const infoRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: "fetch-mml-info",
          arguments: {
            random_string: "test",
          },
        },
      }

      const request: McpRequest = {
        id: requestId,
        method: "tools/call",
        params: infoRequest.params,
        timestamp: new Date(),
      }
      setRequests((prev) => [...prev, request])

      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Mcp-Session-Id": sessionId,
        },
        body: JSON.stringify(infoRequest),
      })

      if (!response.ok) {
        throw new Error(`MCP info failed: ${response.status}`)
      }

      const responseData = await response.json()

      const mcpResponse: McpResponse = {
        id: requestId,
        result: responseData.result,
        error: responseData.error,
        timestamp: new Date(),
      }
      setResponses((prev) => [...prev, mcpResponse])
    } catch (error) {
      console.error("Failed to fetch MCP info:", error)
      setLastError(error instanceof Error ? error.message : "MCP info failed")
    } finally {
      setIsLoading(false)
    }
  }

  // Load health on component mount
  useEffect(() => {
    checkHealth()
  }, [])

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "healthy":
        return "default"
      case "error":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          MCP Server Monitor
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {lastError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{lastError}</p>
          </div>
        )}

        {/* Server Health */}
        <div className="space-y-3">
          <h3 className="font-semibold">Server Health</h3>
          {health ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Badge variant={getStatusVariant(health.status)}>
                  {health.status}
                </Badge>
                <p className="text-sm text-gray-600">
                  Transport: {health.transport}
                </p>
                <p className="text-sm text-gray-600">
                  Protocol: {health.specification}
                </p>
                <p className="text-sm text-gray-600">
                  Updated: {new Date(health.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">
                    Sessions: {health.sessions.active}
                  </span>
                </div>
                {health.sessions.active > 0 && (
                  <p className="text-xs text-gray-500">
                    IDs: {health.sessions.ids.join(", ").substring(0, 50)}...
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Message: {health.message}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Loading health status...</p>
          )}
        </div>

        {/* Endpoints */}
        {health && (
          <div className="space-y-3">
            <h3 className="font-semibold">Available Endpoints</h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(health.endpoints).map(([name, path]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="text-sm font-medium capitalize">{name}</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {path}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          <h3 className="font-semibold">Controls</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={initializeSession}
              disabled={isLoading}
              variant={sessionId ? "secondary" : "default"}
            >
              {sessionId ? "Reconnect" : "Initialize"} Session
            </Button>
            <Button
              onClick={listTools}
              disabled={isLoading || !sessionId}
              variant="outline"
            >
              List Tools
            </Button>
            <Button
              onClick={createDemoWorld}
              disabled={isLoading || !sessionId}
              variant="outline"
            >
              Create Demo World
            </Button>
            <Button
              onClick={testMcpInfo}
              disabled={isLoading || !sessionId}
              variant="outline"
            >
              Test MCP Info
            </Button>
          </div>
          {sessionId && (
            <p className="text-xs text-gray-500">
              Session ID: {sessionId.substring(0, 16)}...
            </p>
          )}
        </div>

        {/* Request/Response Log */}
        <div className="space-y-3">
          <h3 className="font-semibold">Request/Response Log</h3>
          <ScrollArea className="h-64 border rounded p-4">
            <div className="space-y-2">
              {requests.length === 0 && responses.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity yet</p>
              ) : (
                [...requests, ...responses]
                  .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                  .map((item, index) => {
                    const isRequest = "method" in item
                    return (
                      <div
                        key={index}
                        className={`p-2 rounded text-xs ${
                          isRequest ? "bg-blue-50" : "bg-green-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium">
                            {isRequest ? "→ Request" : "← Response"} #{item.id}
                          </span>
                          <span className="text-gray-500">
                            {item.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {isRequest ? (
                          <p className="mt-1">
                            Method: {(item as McpRequest).method}
                          </p>
                        ) : (
                          <p className="mt-1">
                            {(item as McpResponse).error
                              ? `Error: ${(item as McpResponse).error.message}`
                              : "Success"}
                          </p>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
