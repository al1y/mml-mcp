import { useState, useEffect } from "react"

export default function Game() {
  const [isLoading, setIsLoading] = useState(true)
  const [gameUrl, setGameUrl] = useState<string>("")

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
    const worldId = process.env.NEXT_PUBLIC_WORLD_ID

    if (projectId && worldId) {
      setGameUrl(`https://${projectId}_${worldId}.mml.world/`)
    } else {
      console.error(
        "Missing environment variables: NEXT_PUBLIC_PROJECT_ID or NEXT_PUBLIC_WORLD_ID",
      )
    }
  }, [])

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  if (!gameUrl) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          color: "#666",
        }}
      >
        Error: Missing project ID or world ID configuration
      </div>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "18px",
            color: "#666",
          }}
        >
          Loading game...
        </div>
      )}
      <iframe
        src={gameUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: isLoading ? "none" : "block",
        }}
        title="MML Game"
        onLoad={handleIframeLoad}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
      />
    </div>
  )
}
