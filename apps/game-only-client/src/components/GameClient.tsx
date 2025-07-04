import React, { useEffect, useRef, useState } from "react"
import { IframeWrapper, registerCustomElementsToWindow } from "@mml-io/mml-web"
import {
  EditableNetworkedDOM,
  IframeObservableDOMFactory,
} from "@mml-io/mml-web-runner"
import { LocalAvatarClient } from "../LocalAvatarClient"
import { LocalAvatarServer } from "../LocalAvatarServer"

// Define SpawnConfigurationState interface locally since it's not exported
interface SpawnConfigurationState {
  spawnPosition?: {
    x?: number
    y?: number
    z?: number
  }
  spawnPositionVariance?: {
    x?: number
    y?: number
    z?: number
  }
  spawnYRotation?: number
  respawnTrigger?: {
    minX?: number
    maxX?: number
    minY?: number
    maxY?: number
    minZ?: number
    maxZ?: number
  }
  enableRespawnButton?: boolean
}

export const GameClient: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInitializedRef = useRef(false)
  const [mmlWebSocketUrl, setMmlWebSocketUrl] = useState<string | null>(null)
  const networkedDOMDocumentRef = useRef<EditableNetworkedDOM | null>(null)
  const id = new URLSearchParams(window.location.search).get("id")

  useEffect(() => {
    if (!mmlWebSocketUrl || !networkedDOMDocumentRef.current) return

    const ws = new WebSocket(mmlWebSocketUrl)

    ws.onopen = () => {
      console.log("Connected to MML WebSocket")
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type !== "mml_source" && message.type !== "mml_updated") {
          console.error(`Invalid MML message type: ${message.type}`)
          return
        }

        console.log(`Updated MML content. Length: ${message.source.length}`)
        networkedDOMDocumentRef.current?.load(message.source)
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }

    ws.onclose = (event) => {
      console.log(`MML WebSocket closed: ${event.code} - ${event.reason}`)
    }

    ws.onerror = (error) => {
      console.error("MML WebSocket error:", error)
    }

    return () => {
      ws.close()
    }
  }, [mmlWebSocketUrl])

  useEffect(() => {
    if (gameInitializedRef.current || !gameContainerRef.current) {
      return
    }

    gameInitializedRef.current = true

    const initializeGame = async () => {
      try {
        // Create an iframe that the clients can use to synchronize their view of the MML document to
        const { iframeWindow, iframeBody } = await IframeWrapper.create()

        // Register the MML (custom) elements to the iframe so that elements (e.g. m-cube) run the HTMLCustomElement logic when appended
        registerCustomElementsToWindow(iframeWindow)

        // Create a NetworkedDOM/MML document that the clients will connect to and interact with
        const networkedDOMDocument = new EditableNetworkedDOM(
          "http://google.com/",
          IframeObservableDOMFactory,
          true,
        )
        networkedDOMDocumentRef.current = networkedDOMDocument

        // Function to fetch MML content from the server
        async function fetchMmlWeboscketUrl(): Promise<string> {
          try {
            // Get the current origin (where the game is being served from)
            const response = await fetch(`/mml-websocket-url?id=${id}`)
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            return await response.text()
          } catch (error) {
            throw new Error(`Failed to fetch MML WebSocket URL: ${error}`)
          }
        }

        // Create the game container
        const gameContainer = gameContainerRef.current
        if (!gameContainer) return

        // Clear any existing content
        gameContainer.innerHTML = ""

        // Create the main game area
        const gameArea = document.createElement("div")
        gameArea.style.position = "absolute"
        gameArea.style.width = "100%"
        gameArea.style.height = "100%"
        gameArea.style.top = "0"
        gameArea.style.left = "0"
        gameContainer.appendChild(gameArea)

        // Create a "local" server that the avatar clients can connect to to see each other
        const localAvatarServer = new LocalAvatarServer()

        const client2SpawnConfig: SpawnConfigurationState = {
          spawnPosition: {
            x: 0.5,
            y: 0.5,
            z: 5,
          },
          spawnPositionVariance: {
            x: 0,
            y: 0,
            z: 0,
          },
          spawnYRotation: 180,
          respawnTrigger: {
            minX: Number.NEGATIVE_INFINITY,
            maxX: Number.POSITIVE_INFINITY,
            minY: -100,
            maxY: Number.POSITIVE_INFINITY,
            minZ: Number.NEGATIVE_INFINITY,
            maxZ: Number.POSITIVE_INFINITY,
          },
          enableRespawnButton: false,
        }

        // Create the avatar client and append it to the game area
        const client2 = new LocalAvatarClient(
          localAvatarServer,
          2,
          client2SpawnConfig,
        )
        client2.addDocument(networkedDOMDocument, iframeWindow, iframeBody)
        gameArea.appendChild(client2.element)
        client2.update()

        // Load MML content from the server
        try {
          const mmlWeboscketUrl = await fetchMmlWeboscketUrl()
          console.log("Got MML WebSocket URL:", mmlWeboscketUrl)
          setMmlWebSocketUrl(mmlWeboscketUrl)
        } catch (error) {
          console.error("Failed to load MML content:", error)
        }
      } catch (error) {
        console.error("Failed to initialize game:", error)
        gameInitializedRef.current = false // Allow retry
      }
    }

    initializeGame().catch(console.error)
  }, [])

  return (
    <div
      ref={gameContainerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        backgroundColor: "#000",
      }}
    />
  )
}
