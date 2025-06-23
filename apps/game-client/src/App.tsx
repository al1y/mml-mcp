import React from "react"
import { GameClient } from "./components/GameClient"

const App: React.FC = () => {
  const id = new URLSearchParams(window.location.search).get("id")
  if (!id) {
    return (
      <div
        className="app"
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          color: "white",
        }}
      >
        <div className="error-modal">
          <h1>Provide an ID param to connect to a specific world</h1>
          <p>
            World IDs/URLs are printed in console where mcp server creates a
            world
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="app"
      style={{ position: "relative", width: "100%", height: "100vh" }}
    >
      <GameClient />
    </div>
  )
}

export default App
