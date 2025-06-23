import * as http from "http"

// Function to get a random available port
export function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(0, () => {
      const address = server.address()
      if (address && typeof address === "object") {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        reject(new Error("Failed to get port"))
      }
    })
  })
}

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer()

    server.listen(port, () => {
      server.close(() => resolve(true))
    })

    server.on("error", () => {
      resolve(false)
    })
  })
}
